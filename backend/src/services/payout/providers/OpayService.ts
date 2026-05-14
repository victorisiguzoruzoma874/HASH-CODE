import axios from 'axios'
import crypto from 'crypto'
import { logger } from '../../../utils/logger'

const BASE = 'https://cashierapi.opayweb.com/api/v3'

export interface OpayPayoutRequest {
  orderId:       string
  amount:        number   // NGN amount in kobo (multiply by 100)
  accountNumber: string
  bankCode:      string
  accountName:   string
  callbackUrl:   string
}

export interface OpayPayoutResult {
  reference:   string
  status:      string
  provider:    string
  localAmount: number
}

/**
 * OpayService
 * ───────────
 * Handles NGN bank transfers via Opay Business API.
 * Faster success rate for Nigerian banks than Flutterwave/Paystack.
 * NGN only — route GHS/KES to Afriex.
 *
 * Docs: https://documentation.opayweb.com
 */
export class OpayService {
  private readonly merchantId  = process.env.OPAY_MERCHANT_ID  ?? ''
  private readonly publicKey   = process.env.OPAY_PUBLIC_KEY   ?? ''
  private readonly privateKey  = process.env.OPAY_PRIVATE_KEY  ?? ''

  async createPayout(req: OpayPayoutRequest): Promise<OpayPayoutResult> {
    logger.info(`[Opay] Creating payout — order=${req.orderId} amount=₦${req.amount}`)

    const reference = `HP-OPAY-${req.orderId.slice(0, 12)}-${Date.now()}`
    const amountKobo = req.amount * 100

    const payload = {
      reference,
      amount:    { total: amountKobo, currency: 'NGN' },
      reason:    `HashPay Global — ${req.orderId}`,
      receiver: {
        bankAccountNumber: req.accountNumber,
        bankCode:          req.bankCode,
        name:              req.accountName,
      },
      callbackUrl: req.callbackUrl,
    }

    // Opay requires HMAC-SHA512 signature of the JSON body
    const signature = this.signPayload(JSON.stringify(payload))

    const response = await axios.post(
      `${BASE}/merchant/transfer/tobank`,
      payload,
      {
        headers: {
          Authorization:  `Bearer ${this.publicKey}`,
          MerchantId:     this.merchantId,
          HashKey:        signature,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      },
    )

    if (response.data.code !== '00000') {
      throw new Error(`Opay error [${response.data.code}]: ${response.data.message}`)
    }

    return {
      reference:   reference,
      status:      response.data.data?.status ?? 'PENDING',
      provider:    'opay',
      localAmount: req.amount,
    }
  }

  /** Verify Opay webhook — uses RSA-SHA256 */
  verifyWebhookSignature(rawBody: string, receivedSig: string): boolean {
    try {
      return crypto.verify(
        'sha256',
        Buffer.from(rawBody),
        { key: this.publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING },
        Buffer.from(receivedSig, 'base64'),
      )
    } catch {
      return false
    }
  }

  async getPayoutStatus(reference: string): Promise<string> {
    const res = await axios.post(
      `${BASE}/merchant/transfer/status/tobank`,
      { reference },
      {
        headers: {
          Authorization: `Bearer ${this.publicKey}`,
          MerchantId:    this.merchantId,
        },
      },
    )
    return res.data.data?.status ?? 'UNKNOWN'
  }

  private signPayload(body: string): string {
    return crypto
      .createHmac('sha512', this.privateKey)
      .update(body)
      .digest('hex')
  }
}
