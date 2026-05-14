import Bull from 'bull'
import { logger } from '../../utils/logger'
import { prisma } from '../../config/database'
import { PriceOracleService } from '../oracle/PriceOracleService'
import { AfrexService }   from './providers/AfrexService'
import { OpayService }    from './providers/OpayService'
import { FlipeetService } from './providers/FlipeetService'

// ── Provider priority map ─────────────────────────────────────
// First provider is tried first. On failure, falls back to next.
const PROVIDER_MAP: Record<string, string[]> = {
  NGN: ['opay', 'afriex'],          // Opay fastest for Nigerian banks
  GHS: ['afriex', 'flipeet'],       // Afriex primary, Flipeet fallback
  KES: ['afriex'],                  // Afriex only for Kenya
  XOF: ['flipeet'],                 // Flipeet for West Africa CFA
  XAF: ['flipeet'],                 // Flipeet for Central Africa CFA
}

// Country codes per currency (needed by Flipeet)
const CURRENCY_COUNTRY: Record<string, string> = {
  NGN: 'NG', GHS: 'GH', KES: 'KE', XOF: 'SN', XAF: 'CM',
}

export interface RouterPayoutRequest {
  orderId:       string
  amountRaw:     string   // on-chain u64 string (6 decimals)
  asset:         string   // 'USDC' | 'USDT' | 'ETH'
  currencyOut:   string   // 'NGN' | 'GHS' | 'KES' | 'XOF' | 'XAF'
  bankCode:      string
  accountNumber: string
  accountName:   string
  reference:     string
}

export interface RouterPayoutResult {
  reference:   string
  provider:    string
  localAmount: number
  status:      string
}

const CALLBACK_BASE = process.env.API_BASE_URL ?? 'https://api.hashpay.io'
const FEE_BPS       = 50   // 0.5%

/**
 * CurrencyRouter
 * ──────────────
 * Routes fiat payouts to the correct provider based on currency.
 * Handles amount conversion, provider fallback, and retry queuing.
 */
export class CurrencyRouter {
  private readonly oracle  = new PriceOracleService()
  private readonly afriex  = new AfrexService()
  private readonly opay    = new OpayService()
  private readonly flipeet = new FlipeetService()

  // Bull queue for retry logic
  private readonly retryQueue = new Bull('payout-retry', {
    redis: process.env.REDIS_URL ?? 'redis://localhost:6379',
    defaultJobOptions: {
      attempts:    4,
      backoff:     { type: 'exponential', delay: 60_000 },  // 1m → 2m → 4m → 8m
      removeOnComplete: true,
      removeOnFail:     false,
    },
  })

  constructor() {
    this.setupRetryProcessor()
  }

  // ── Main payout entry point ───────────────────────────────

  async payout(req: RouterPayoutRequest): Promise<RouterPayoutResult> {
    const localAmount = await this.convertToLocal(req.amountRaw, req.asset, req.currencyOut)
    const providers   = PROVIDER_MAP[req.currencyOut] ?? ['afriex']

    logger.info(`[CurrencyRouter] ${req.asset} → ${req.currencyOut} | amount=${localAmount} | providers=${providers.join(',')}`)

    let lastError: Error | null = null

    for (const provider of providers) {
      try {
        const result = await this.callProvider(provider, req, localAmount)
        logger.info(`[CurrencyRouter] ✓ ${provider} accepted — ref=${result.reference}`)
        return result
      } catch (err) {
        lastError = err as Error
        logger.warn(`[CurrencyRouter] ${provider} failed: ${lastError.message} — trying next`)
      }
    }

    throw lastError ?? new Error(`All providers failed for ${req.currencyOut}`)
  }

  // ── Retry queue ───────────────────────────────────────────

  async enqueueRetry(orderId: string, recordId: string): Promise<void> {
    await this.retryQueue.add(
      { orderId, recordId },
      { jobId: orderId },   // deduplicate by orderId
    )
    logger.info(`[CurrencyRouter] Enqueued retry for order ${orderId}`)
  }

  private setupRetryProcessor(): void {
    this.retryQueue.process(async (job) => {
      const { orderId, recordId } = job.data as { orderId: string; recordId: string }
      logger.info(`[CurrencyRouter] Retry attempt ${job.attemptsMade + 1} for order ${orderId}`)

      const order = await prisma.escrowOrder.findUnique({ where: { id: orderId } })
      if (!order || order.status === 'COMPLETED' || order.status === 'REFUNDED') return

      const user = await prisma.user.findUnique({ where: { id: order.userId ?? '' } })
      if (!user?.bankAccountNumber) {
        throw new Error('No bank details — cannot retry')
      }

      const result = await this.payout({
        orderId:       order.id,
        amountRaw:     order.amountRaw,
        asset:         order.asset,
        currencyOut:   order.currencyOut ?? 'NGN',
        bankCode:      user.bankCode ?? '',
        accountNumber: user.bankAccountNumber,
        accountName:   user.bankAccountName ?? '',
        reference:     `HP-RETRY-${orderId.slice(0, 8)}-${job.attemptsMade}`,
      })

      // Import SuiTransactionService lazily to avoid circular deps
      const { SuiTransactionService } = await import('../sui/SuiTransactionService')
      const txSvc = new SuiTransactionService()
      await txSvc.markPaid(recordId, result.provider, result.reference)

      await prisma.escrowOrder.update({
        where: { id: orderId },
        data: {
          status:      'COMPLETED',
          payoutRef:   result.reference,
          ngnAmount:   result.localAmount,
          completedAt: new Date(),
        },
      })

      logger.info(`[CurrencyRouter] ✓ Retry succeeded for order ${orderId}`)
    })

    // Dead-letter: after all retries exhausted, trigger admin refund
    this.retryQueue.on('failed', async (job, err) => {
      if (job.attemptsMade >= (job.opts.attempts ?? 4)) {
        logger.error(`[CurrencyRouter] All retries exhausted for order ${job.data.orderId} — triggering refund`)
        await this.triggerDeadLetterRefund(job.data.orderId, job.data.recordId, err.message)
      }
    })
  }

  private async triggerDeadLetterRefund(
    orderId:  string,
    recordId: string,
    reason:   string,
  ): Promise<void> {
    try {
      await prisma.escrowOrder.update({
        where: { id: orderId },
        data:  { status: 'PAYOUT_FAILED', failureReason: `DEAD_LETTER: ${reason}` },
      })
      // Admin must manually call admin_refund on-chain with the coin object
      // Log it prominently for ops team
      logger.error(`🚨 DEAD LETTER — order=${orderId} record=${recordId} reason=${reason}`)
      logger.error(`   Action required: call admin_refund on Sui for record ${recordId}`)
    } catch (err) {
      logger.error('[CurrencyRouter] Failed to update dead-letter order', err)
    }
  }

  // ── Provider dispatch ─────────────────────────────────────

  private async callProvider(
    provider:    string,
    req:         RouterPayoutRequest,
    localAmount: number,
  ): Promise<RouterPayoutResult> {
    const callbackUrl = `${CALLBACK_BASE}/api/v1/webhook/${provider}`
    const country     = CURRENCY_COUNTRY[req.currencyOut] ?? 'NG'

    switch (provider) {
      case 'afriex':
        return this.afriex.createPayout({
          orderId:       req.orderId,
          amount:        localAmount,
          currency:      req.currencyOut,
          accountNumber: req.accountNumber,
          bankCode:      req.bankCode,
          accountName:   req.accountName,
          callbackUrl,
        })

      case 'opay':
        return this.opay.createPayout({
          orderId:       req.orderId,
          amount:        localAmount,
          accountNumber: req.accountNumber,
          bankCode:      req.bankCode,
          accountName:   req.accountName,
          callbackUrl,
        })

      case 'flipeet':
        return this.flipeet.createPayout({
          orderId:       req.orderId,
          amount:        localAmount,
          currency:      req.currencyOut,
          accountNumber: req.accountNumber,
          bankCode:      req.bankCode,
          accountName:   req.accountName,
          country,
          callbackUrl,
        })

      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  // ── Amount conversion ─────────────────────────────────────

  private async convertToLocal(
    amountRaw:   string,
    asset:       string,
    currencyOut: string,
  ): Promise<number> {
    const decimals  = this.getDecimals(asset)
    const cryptoAmt = parseInt(amountRaw, 10) / Math.pow(10, decimals)
    const rate      = await this.oracle.getRate(asset, currencyOut)
    const gross     = cryptoAmt * rate
    const fee       = gross * (FEE_BPS / 10_000)
    return Math.floor(gross - fee)
  }

  private getDecimals(asset: string): number {
    const map: Record<string, number> = {
      USDC: 6, USDT: 6, ETH: 18, SUI: 9, APT: 8, BTC: 8,
    }
    return map[asset.toUpperCase()] ?? 6
  }
}
