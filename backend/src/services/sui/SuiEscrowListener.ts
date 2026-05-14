import { suiClient, SUI_EVENTS } from '../../config/sui'
import { prisma } from '../../config/database'
import { logger } from '../../utils/logger'
import { CurrencyRouter } from '../payout/CurrencyRouter'
import { KycService } from '../kyc/KycService'
import { SuiTransactionService } from './SuiTransactionService'

interface DepositEventData {
  order_id:     number[]   // vector<u8> comes as number array from JSON
  user:         string
  amount_in:    string     // u64 as string
  amount_out:   string     // u64 as string
  currency_out: string     // "NGN" | "GHS" | "KES" | "XOF" | "XAF"
  coin_type:    string     // "USDC" | "USDT" | "ETH"
  record_id:    string     // Sui object ID of EscrowRecord
}

/**
 * SuiEscrowListener
 * ─────────────────
 * Subscribes to Sui DepositEvent via WebSocket.
 * On each event:
 *   1. Idempotency check (Postgres)
 *   2. KYC verification
 *   3. Route to correct fiat provider (Afriex / Opay / Flipeet)
 *   4. On success → call mark_paid on-chain
 *   5. On failure → enqueue retry, then admin_refund after max retries
 */
export class SuiEscrowListener {
  private unsubscribeFn: (() => void) | null = null
  private readonly router = new CurrencyRouter()
  private readonly kyc    = new KycService()
  private readonly txSvc  = new SuiTransactionService()

  async start(): Promise<void> {
    if (!SUI_EVENTS.depositEvent.startsWith('0x')) {
      logger.warn('[SuiEscrowListener] SUI_PACKAGE_ID not set — skipping subscription (dev mode)')
      return
    }

    logger.info('[SuiEscrowListener] Subscribing to DepositEvent...')

    try {
      this.unsubscribeFn = await suiClient.subscribeEvent({
        filter:    { MoveEventType: SUI_EVENTS.depositEvent },
        onMessage: (event: unknown) => {
          this.handleEvent(event as Record<string, unknown>).catch(err =>
            logger.error('[SuiEscrowListener] Unhandled error in handleEvent', err)
          )
        },
      })
      logger.info('[SuiEscrowListener] ✓ Subscribed — listening for deposits')
    } catch (err) {
      logger.error('[SuiEscrowListener] Failed to subscribe', err)
    }
  }

  async stop(): Promise<void> {
    if (this.unsubscribeFn) {
      this.unsubscribeFn()
      this.unsubscribeFn = null
    }
    logger.info('[SuiEscrowListener] Stopped')
  }

  private async handleEvent(event: Record<string, unknown>): Promise<void> {
    const data = event['parsedJson'] as DepositEventData
    if (!data?.order_id) return

    const orderId = Buffer.from(data.order_id).toString('hex')

    // ── 1. Idempotency ──────────────────────────────────────
    const existing = await prisma.escrowOrder.findFirst({
      where: {
        OR: [
          { aptosEventSeq: orderId },
          { suiOrderId:    orderId },
        ],
      },
    })
    if (existing) {
      logger.debug(`[SuiEscrowListener] Skipping duplicate order ${orderId}`)
      return
    }

    logger.info(`[SuiEscrowListener] New deposit — user=${data.user} currency=${data.currency_out} amount_in=${data.amount_in}`)

    // ── 2. KYC check ────────────────────────────────────────
    const kycResult = await this.kyc.verify(data.user)
    if (!kycResult.passed) {
      logger.warn(`[SuiEscrowListener] KYC failed for ${data.user}`)
      await this.createOrderRecord(orderId, data, 'REFUNDED', 'KYC_FAILED', event)
      return
    }

    // ── 3. Look up user bank details ─────────────────────────
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { aptosAddress: data.user },
          { evmAddress:   data.user },
          { suiAddress:   data.user },
        ],
      },
    })

    if (!user?.bankAccountNumber || !user?.bankCode) {
      logger.error(`[SuiEscrowListener] No bank details for ${data.user}`)
      await this.createOrderRecord(orderId, data, 'REFUNDED', 'NO_BANK_DETAILS', event)
      return
    }

    // ── 4. Create pending order ──────────────────────────────
    const order = await prisma.escrowOrder.create({
      data: {
        suiOrderId:    orderId,
        aptosEventSeq: null,
        userAddress:   data.user,
        amountRaw:     data.amount_in,
        asset:         data.coin_type,
        txHash:        (event['id'] as any)?.txDigest ?? '',
        status:        'PENDING_PAYOUT',
        userId:        user.id,
        currencyOut:   data.currency_out,
        recordId:      data.record_id,
        chain:         'sui',
      },
    })

    // ── 5. Route to fiat provider ────────────────────────────
    try {
      const result = await this.router.payout({
        orderId:       order.id,
        amountRaw:     data.amount_in,
        asset:         data.coin_type,
        currencyOut:   data.currency_out,
        bankCode:      user.bankCode,
        accountNumber: user.bankAccountNumber,
        accountName:   user.bankAccountName ?? '',
        reference:     `HP-SUI-${orderId.slice(0, 12)}`,
      })

      // ── 6. Mark paid on-chain ────────────────────────────
      await this.txSvc.markPaid(data.record_id, result.provider, result.reference)

      await prisma.escrowOrder.update({
        where: { id: order.id },
        data: {
          status:      'COMPLETED',
          payoutRef:   result.reference,
          ngnAmount:   result.localAmount,
          completedAt: new Date(),
        },
      })

      logger.info(`[SuiEscrowListener] ✓ Payout complete — ref=${result.reference} provider=${result.provider}`)

    } catch (err) {
      logger.error(`[SuiEscrowListener] Payout failed for order ${order.id}`, err)

      await prisma.escrowOrder.update({
        where: { id: order.id },
        data:  { status: 'PAYOUT_FAILED', failureReason: String(err) },
      })

      // Enqueue for retry — do NOT immediately refund
      await this.router.enqueueRetry(order.id, data.record_id)
    }
  }

  private async createOrderRecord(
    orderId: string,
    data:    DepositEventData,
    status:  string,
    reason:  string,
    event:   Record<string, unknown>,
  ): Promise<void> {
    await prisma.escrowOrder.create({
      data: {
        suiOrderId:    orderId,
        aptosEventSeq: null,
        userAddress:   data.user,
        amountRaw:     data.amount_in,
        asset:         data.coin_type,
        txHash:        (event['id'] as any)?.txDigest ?? '',
        status:        status as any,
        failureReason: reason,
        currencyOut:   data.currency_out,
        recordId:      data.record_id,
        chain:         'sui',
      },
    })
    logger.warn(`[SuiEscrowListener] Order ${orderId} → ${status}: ${reason}`)
  }
}
