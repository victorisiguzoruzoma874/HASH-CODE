import axios from 'axios'
import crypto from 'crypto'
import { logger } from '../../../utils/logger'

const BASE = 'https://api.flipeet.com/v1'

export interface FlipeetPayoutRequest {
  orderId:       string
  amount:        number   // local currency amount
  currency:      string   // 'NGN' | 'GHS' | 'XOF' | 'XAF'
  accountNumber: string
  bankCode:      string
  accountName:   string
  country:       string   // 'NG' | 'GH' | 'SN' | 'CI' | 'CM'
  callbackUrl:   string
}

export interface FlipeetPayoutResult {
  reference:   string
  status:      string
  provider:    string
  localAmount: number
}

/**
 * FlipeetService
 * ──────────────
 * Handles multi-currency West/Central Africa payouts.
 * Best for: XOF (Senegal, Côte d'Ivoire), XAF (Cameroon, Chad),
 *           GHS (Ghana), NGN (Nigeria) — especially MoMo.
 *
 * Docs: https://docs.flipeet.com
 */
export class FlipeetService {
  private readonly apiKey = process.env.FLIPEET_API_KEY ?? ''
  private readonly secret = process.env.FLIPEET_WEBHOOK_SECRET ?? ''

  async createPayout(req: FlipeetPayoutRequest): Promise<FlipeetPayoutResult> {
    logger.info(`[Flipeet] Creating payout — order=${req.orderId} currency=${req.currency} country=${req.country}`)

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`flipeet-${req.orderId}`)
      .digest('hex')

    const response = await axios.post(
      `${BASE}/payouts`,
      {
        external_id:  req.orderId,
        amount:       req.amount,
        currency:     req.currency,
        country:      req.country,
        beneficiary: {
          account_number: req.accountNumber,
          bank_code:      req.bankCode,
          name:           req.accountName,
        },
        callback_url: req.callbackUrl,
        description:  `HashPay Global — ${req.orderId}`,
      },
      {
        headers: {
          'X-API-Key':       this.apiKey,
          'Idempotency-Key': idempotencyKey,
          'Content-Type':    'application/json',
        },
        timeout: 30_000,
      },
    )

    if (!['success', 'pending', 'processing'].includes(response.data.status)) {
      throw new Error(`Flipeet error: ${response.data.message ?? JSON.stringify(response.data)}`)
    }

    return {
      reference:   response.data.data?.id ?? idempotencyKey,
      status:      response.data.status,
      provider:    'flipeet',
      localAmount: req.amount,
    }
  }

  verifyWebhookSignature(rawBody: string, receivedSig: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex')
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(receivedSig),
    )
  }

  async getPayoutStatus(reference: string): Promise<string> {
    const res = await axios.get(`${BASE}/payouts/${reference}`, {
      headers: { 'X-API-Key': this.apiKey },
    })
    return res.data.data?.status ?? 'unknown'
  }
}
