import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { SuiTransactionService } from '../services/sui/SuiTransactionService'

export const webhookRouter = Router()
const txSvc = new SuiTransactionService()

// ── Shared helper ─────────────────────────────────────────────

async function handlePayoutSuccess(payoutRef: string, provider: string): Promise<void> {
  const order = await prisma.escrowOrder.findFirst({
    where: { payoutRef },
  })
  if (!order) {
    logger.warn(`[Webhook/${provider}] No order found for ref=${payoutRef}`)
    return
  }
  if (order.status === 'COMPLETED') return  // idempotent

  // Confirm on-chain
  if (order.recordId) {
    await txSvc.markPaid(order.recordId, provider, payoutRef)
  }

  await prisma.escrowOrder.update({
    where: { id: order.id },
    data:  { status: 'COMPLETED', completedAt: new Date() },
  })
  logger.info(`[Webhook/${provider}] ✓ Order ${order.id} marked COMPLETED`)
}

async function handlePayoutFailed(payoutRef: string, provider: string, reason: string): Promise<void> {
  await prisma.escrowOrder.updateMany({
    where: { payoutRef },
    data:  { status: 'PAYOUT_FAILED', failureReason: `${provider}: ${reason}` },
  })
  logger.warn(`[Webhook/${provider}] Payout failed — ref=${payoutRef} reason=${reason}`)
}

// ── POST /webhook/flutterwave ─────────────────────────────────

webhookRouter.post('/flutterwave', async (req: Request, res: Response) => {
  try {
    const hash = crypto
      .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_KEY ?? '')
      .update(req.body)
      .digest('hex')

    if (hash !== req.headers['verif-hash']) {
      logger.warn('[Webhook/FLW] Invalid signature')
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    const event = JSON.parse(req.body.toString())
    logger.info(`[Webhook/FLW] ${event.event} — ref=${event.data?.reference}`)

    if (event.event === 'transfer.completed') {
      await handlePayoutSuccess(event.data.reference, 'flutterwave')
    }
    if (event.event === 'transfer.failed') {
      await handlePayoutFailed(event.data.reference, 'flutterwave', event.data.complete_message ?? '')
    }

    res.json({ status: 'ok' })
  } catch (err) {
    logger.error('[Webhook/FLW] Error', err)
    res.status(500).json({ error: 'Processing failed' })
  }
})

// ── POST /webhook/paystack ────────────────────────────────────

webhookRouter.post('/paystack', async (req: Request, res: Response) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY ?? '')
      .update(req.body)
      .digest('hex')

    if (hash !== req.headers['x-paystack-signature']) {
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    const event = JSON.parse(req.body.toString())
    logger.info(`[Webhook/Paystack] ${event.event}`)

    if (event.event === 'transfer.success') {
      await handlePayoutSuccess(event.data.reference, 'paystack')
    }
    if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      await handlePayoutFailed(event.data.reference, 'paystack', event.data.reason ?? '')
    }

    res.json({ status: 'ok' })
  } catch (err) {
    logger.error('[Webhook/Paystack] Error', err)
    res.status(500).json({ error: 'Processing failed' })
  }
})

// ── POST /webhook/afriex ──────────────────────────────────────

webhookRouter.post('/afriex', async (req: Request, res: Response) => {
  try {
    const rawBody = req.body.toString()
    const sig     = req.headers['x-afriex-signature'] as string ?? ''

    const expected = crypto
      .createHmac('sha256', process.env.AFRIEX_WEBHOOK_SECRET ?? '')
      .update(rawBody)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      logger.warn('[Webhook/Afriex] Invalid signature')
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    const event = JSON.parse(rawBody)
    const ref   = event.data?.reference ?? event.data?.id ?? ''
    logger.info(`[Webhook/Afriex] ${event.event} — ref=${ref}`)

    if (event.event === 'payout.success' || event.event === 'transfer.success') {
      await handlePayoutSuccess(ref, 'afriex')
    }
    if (event.event === 'payout.failed' || event.event === 'transfer.failed') {
      await handlePayoutFailed(ref, 'afriex', event.data?.failure_reason ?? '')
    }

    res.json({ received: true })
  } catch (err) {
    logger.error('[Webhook/Afriex] Error', err)
    res.status(500).json({ error: 'Processing failed' })
  }
})

// ── POST /webhook/opay ────────────────────────────────────────

webhookRouter.post('/opay', async (req: Request, res: Response) => {
  try {
    const rawBody = req.body.toString()

    // Opay uses RSA-SHA256 signature verification
    const sig = req.headers['x-opay-signature'] as string ?? ''
    let valid = false
    try {
      valid = crypto.verify(
        'sha256',
        Buffer.from(rawBody),
        { key: process.env.OPAY_PUBLIC_KEY ?? '', padding: crypto.constants.RSA_PKCS1_PSS_PADDING },
        Buffer.from(sig, 'base64'),
      )
    } catch {
      // Fallback: HMAC if RSA key not configured
      const hmac = crypto
        .createHmac('sha512', process.env.OPAY_PRIVATE_KEY ?? '')
        .update(rawBody)
        .digest('hex')
      valid = hmac === sig
    }

    if (!valid) {
      logger.warn('[Webhook/Opay] Invalid signature')
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    const event = JSON.parse(rawBody)
    const ref   = event.data?.reference ?? event.reference ?? ''
    logger.info(`[Webhook/Opay] ${event.type ?? event.event} — ref=${ref}`)

    // Opay status codes: SUCCESS, FAIL, PENDING
    const status = (event.data?.status ?? event.status ?? '').toUpperCase()

    if (status === 'SUCCESS') {
      await handlePayoutSuccess(ref, 'opay')
    }
    if (status === 'FAIL' || status === 'FAILED') {
      await handlePayoutFailed(ref, 'opay', event.data?.reason ?? '')
    }

    res.json({ code: '00000', message: 'success' })
  } catch (err) {
    logger.error('[Webhook/Opay] Error', err)
    res.status(500).json({ error: 'Processing failed' })
  }
})

// ── POST /webhook/flipeet ─────────────────────────────────────

webhookRouter.post('/flipeet', async (req: Request, res: Response) => {
  try {
    const rawBody = req.body.toString()
    const sig     = req.headers['x-flipeet-signature'] as string ?? ''

    const expected = crypto
      .createHmac('sha256', process.env.FLIPEET_WEBHOOK_SECRET ?? '')
      .update(rawBody)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      logger.warn('[Webhook/Flipeet] Invalid signature')
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    const event = JSON.parse(rawBody)
    const ref   = event.data?.id ?? event.data?.external_id ?? ''
    logger.info(`[Webhook/Flipeet] ${event.event} — ref=${ref}`)

    if (event.event === 'payout.completed' || event.event === 'transfer.success') {
      await handlePayoutSuccess(ref, 'flipeet')
    }
    if (event.event === 'payout.failed' || event.event === 'transfer.failed') {
      await handlePayoutFailed(ref, 'flipeet', event.data?.error ?? '')
    }

    res.json({ received: true })
  } catch (err) {
    logger.error('[Webhook/Flipeet] Error', err)
    res.status(500).json({ error: 'Processing failed' })
  }
})
