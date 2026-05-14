import axios, { AxiosError } from 'axios'
import crypto from 'crypto'
import { logger } from '../../../utils/logger'

const BASE = 'https://api.afriex.io/v1'

export interface AfrexPayoutRequest {
  orderId:       string
  amount:        number        // local currency amount (e.g. 78500 for ₦78,500)
  currency:      string        // 'NGN' | 'GHS' | 'KES'
  accountNumber: string
  bankCode:      string
  accountName:   string
  callbackUrl:   string
}

export interface AfrexPayoutResult {
  reference:   string
  status:      string
  provider:    string
  localAmount: number
}

/**
 * AfrexService
 * ────────────
 * Handles NGN, GHS, KES payouts via Afriex API.
 * Best for multi-country African payouts in one integration.
 *
 * Docs: https://docs.afriex.io
 */
export class AfrexService {
  private readonly apiKey = process.env.AFRIEX_API_KEY ?? ''
  private readonly secret = process.env.AFRIEX_WEBHOOK_SECRET ?? ''

  async createPayout(req: AfrexPayoutRequest): Promise<AfrexPayoutResult> {
    logger.info(`[Afriex] Creating payout — order=${req.orderId} currency=${req.currency} amount=${req.amount}`)

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(req.orderId)
      .digest('hex')

    const response = await axios.post(
      `${BASE}/payouts`,
      {
        order_id:  req.orderId,
        amount:    req.amount,
        currency:  req.currency,
        account_details: {
          account_number: req.accountNumber,
          bank_code:      req.bankCode,
          account_name:   req.accountName,
        },
        callback_url: req.callbackUrl,
        narration:    `HashPay Global — ${req.orderId}`,
      },
      {
        headers: {
          Authorization:    `Bearer ${this.apiKey}`,
          'Idempotency-Key': idempotencyKey,
          'Content-Type':   'application/json',
        },
        timeout: 30_000,
      },
    )

    if (response.data.status !== 'success' && response.data.status !== 'pending') {
      throw new Error(`Afriex error: ${response.data.message ?? JSON.stringify(response.data)}`)
    }

    return {
      reference:   response.data.data?.reference ?? idempotencyKey,
      status:      response.data.data?.status ?? 'pending',
      provider:    'afriex',
      localAmount: req.amount,
    }
  }

  /** Verify Afriex webhook signature */
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

  /** Check payout status by reference */
  async getPayoutStatus(reference: string): Promise<string> {
    const res = await axios.get(`${BASE}/payouts/${reference}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    return res.data.data?.status ?? 'unknown'
  }
}
