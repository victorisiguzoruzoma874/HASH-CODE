import { aptosClient, EVENT_TYPES, MODULE_ADDRESS } from '../../config/aptos'
import { prisma } from '../../config/database'
import { logger } from '../../utils/logger'
import { PayoutService } from '../payout/PayoutService'
import { KycService } from '../kyc/KycService'
import { RefundService } from './RefundService'

interface DepositReceivedEvent {
  user:     string
  amount:   string   // u64 as string
  asset:    string   // hex-encoded asset name
  tx_hash:  string
  sequence_number: string
}

/**
 * EscrowListener
 * ──────────────
 * Polls the Aptos Indexer for DepositReceived events emitted by
 * hashpay::escrow::deposit(). On each new event:
 *   1. Idempotency check — skip if already processed
 *   2. KYC verification
 *   3. Calculate NGN payout amount via oracle rate
 *   4. Trigger fiat payout via Flutterwave / Paystack
 *   5. Persist order with payout reference
 *   6. On failure → trigger on-chain refund
 */
export class EscrowListener {
  private running   = false
  private intervalId: ReturnType<typeof setInterval> | null = null
  private readonly POLL_INTERVAL_MS = 15_000  // 15 seconds
  private readonly payout  = new PayoutService()
  private readonly kyc     = new KycService()
  private readonly refund  = new RefundService()

  async start(): Promise<void> {
    this.running = true
    logger.info('[EscrowListener] Starting — polling every 15s')
    await this.poll()  // immediate first run
    this.intervalId = setInterval(() => this.poll(), this.POLL_INTERVAL_MS)
  }

  async stop(): Promise<void> {
    this.running = false
    if (this.intervalId) clearInterval(this.intervalId)
    logger.info('[EscrowListener] Stopped')
  }

  private async poll(): Promise<void> {
    if (!this.running) return
    try {
      const events = await aptosClient.getModuleEventsByEventType({
        eventType: EVENT_TYPES.depositReceived,
        options:   { limit: 25 },
      })

      for (const event of events) {
        await this.processEvent(event.data as DepositReceivedEvent, event.sequence_number.toString())
      }
    } catch (err) {
      logger.error('[EscrowListener] Poll error', err)
    }
  }

  private async processEvent(data: DepositReceivedEvent, seqNum: string): Promise<void> {
    // ── 1. Idempotency ──────────────────────────────────────
    const existing = await prisma.escrowOrder.findUnique({
      where: { aptosEventSeq: seqNum },
    })
    if (existing) return  // already processed

    logger.info(`[EscrowListener] New deposit — user=${data.user} amount=${data.amount}`)

    // ── 2. KYC check ────────────────────────────────────────
    const kycResult = await this.kyc.verify(data.user)
    if (!kycResult.passed) {
      logger.warn(`[EscrowListener] KYC failed for ${data.user} — triggering refund`)
      await this.refund.execute(data.user, data.amount, data.asset)
      await prisma.escrowOrder.create({
        data: {
          aptosEventSeq: seqNum,
          userAddress:   data.user,
          amountRaw:     data.amount,
          asset:         data.asset,
          txHash:        data.tx_hash,
          status:        'REFUNDED',
          failureReason: 'KYC_FAILED',
        },
      })
      return
    }

    // ── 3. Look up user bank details ─────────────────────────
    const user = await prisma.user.findUnique({ where: { aptosAddress: data.user } })
    if (!user?.bankAccountNumber || !user?.bankCode) {
      logger.error(`[EscrowListener] No bank details for ${data.user}`)
      await this.refund.execute(data.user, data.amount, data.asset)
      return
    }

    // ── 4. Create pending order ──────────────────────────────
    const order = await prisma.escrowOrder.create({
      data: {
        aptosEventSeq: seqNum,
        userAddress:   data.user,
        amountRaw:     data.amount,
        asset:         data.asset,
        txHash:        data.tx_hash,
        status:        'PENDING_PAYOUT',
        userId:        user.id,
      },
    })

    // ── 5. Fiat payout ───────────────────────────────────────
    try {
      const payoutResult = await this.payout.sendNGN({
        orderId:       order.id,
        amountRaw:     data.amount,
        asset:         data.asset,
        bankCode:      user.bankCode,
        accountNumber: user.bankAccountNumber,
        accountName:   user.bankAccountName ?? '',
        reference:     `HP-${seqNum}`,
      })

      await prisma.escrowOrder.update({
        where: { id: order.id },
        data: {
          status:        'COMPLETED',
          payoutRef:     payoutResult.reference,
          ngnAmount:     payoutResult.ngnAmount,
          completedAt:   new Date(),
        },
      })

      logger.info(`[EscrowListener] Payout complete — ref=${payoutResult.reference}`)

    } catch (payoutErr) {
      logger.error(`[EscrowListener] Payout failed for order ${order.id}`, payoutErr)

      await prisma.escrowOrder.update({
        where: { id: order.id },
        data: { status: 'PAYOUT_FAILED', failureReason: String(payoutErr) },
      })

      // ── 6. Refund on payout failure ──────────────────────
      await this.refund.execute(data.user, data.amount, data.asset)
      await prisma.escrowOrder.update({
        where: { id: order.id },
        data: { status: 'REFUNDED' },
      })
    }
  }
}
