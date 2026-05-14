import axios from 'axios'
import { PriceOracleService } from '../oracle/PriceOracleService'
import { logger } from '../../utils/logger'
import { generateIdempotencyKey } from '../../utils/crypto'

interface PayoutRequest {
  orderId:       string
  amountRaw:     string   // on-chain u64 (6 decimals for USDC/USDT)
  asset:         string   // 'USDC' | 'USDT' | 'ETH' | 'APT'
  bankCode:      string
  accountNumber: string
  accountName:   string
  reference:     string
}

interface PayoutResult {
  reference: string
  ngnAmount: number
  provider:  string
  status:    string
}

const FLW_BASE = 'https://api.flutterwave.com/v3'
const FEE_BPS  = 50  // 0.5% platform fee

/**
 * PayoutService
 * ─────────────
 * Converts on-chain crypto amount → NGN and sends to user's bank.
 * Primary provider: Flutterwave
 * Fallback provider: Paystack
 *
 * Flow:
 *   1. Get live rate from PriceOracleService
 *   2. Calculate NGN = amount * rate * (1 - fee)
 *   3. POST to Flutterwave /transfers
 *   4. On failure, retry with Paystack
 */
export class PayoutService {
  private readonly oracle = new PriceOracleService()

  async sendNGN(req: PayoutRequest): Promise<PayoutResult> {
    // ── 1. Calculate NGN amount ──────────────────────────────
    const rate      = await this.oracle.getRate(req.asset, 'NGN')
    const rawAmount = parseInt(req.amountRaw, 10)
    const decimals  = this.getDecimals(req.asset)
    const cryptoAmt = rawAmount / Math.pow(10, decimals)
    const gross     = cryptoAmt * rate
    const fee       = gross * (FEE_BPS / 10_000)
    const ngnAmount = Math.floor(gross - fee)

    logger.info(`[PayoutService] ${cryptoAmt} ${req.asset} → ₦${ngnAmount.toLocaleString()} (rate=${rate})`)

    // ── 2. Try Flutterwave ───────────────────────────────────
    try {
      return await this.flutterwavePayout({ ...req, ngnAmount })
    } catch (flwErr) {
      logger.warn('[PayoutService] Flutterwave failed, trying Paystack', flwErr)
    }

    // ── 3. Fallback: Paystack ────────────────────────────────
    return await this.paystackPayout({ ...req, ngnAmount })
  }

  private async flutterwavePayout(
    req: PayoutRequest & { ngnAmount: number }
  ): Promise<PayoutResult> {
    const idempotencyKey = generateIdempotencyKey(req.orderId)

    const response = await axios.post(
      `${FLW_BASE}/transfers`,
      {
        account_bank:   req.bankCode,
        account_number: req.accountNumber,
        amount:         req.ngnAmount,
        currency:       'NGN',
        narration:      `HashPay payout — ${req.orderId}`,
        reference:      req.reference,
        callback_url:   `${process.env.API_BASE_URL}/api/v1/webhook/flutterwave`,
        debit_currency: 'NGN',
      },
      {
        headers: {
          Authorization:   `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Idempotency-Key': idempotencyKey,
        },
      }
    )

    if (response.data.status !== 'success') {
      throw new Error(`Flutterwave error: ${response.data.message}`)
    }

    return {
      reference: response.data.data.reference,
      ngnAmount: req.ngnAmount,
      provider:  'flutterwave',
      status:    response.data.data.status,
    }
  }

  private async paystackPayout(
    req: PayoutRequest & { ngnAmount: number }
  ): Promise<PayoutResult> {
    // Convert NGN to kobo (Paystack uses kobo)
    const amountKobo = req.ngnAmount * 100

    const response = await axios.post(
      'https://api.paystack.co/transfer',
      {
        source:    'balance',
        amount:    amountKobo,
        recipient: await this.createPaystackRecipient(req.bankCode, req.accountNumber, req.accountName),
        reason:    `HashPay payout — ${req.orderId}`,
        reference: req.reference,
      },
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    )

    if (!response.data.status) {
      throw new Error(`Paystack error: ${response.data.message}`)
    }

    return {
      reference: response.data.data.reference,
      ngnAmount: req.ngnAmount,
      provider:  'paystack',
      status:    response.data.data.status,
    }
  }

  private async createPaystackRecipient(
    bankCode: string, accountNumber: string, name: string
  ): Promise<string> {
    const res = await axios.post(
      'https://api.paystack.co/transferrecipient',
      { type: 'nuban', name, account_number: accountNumber, bank_code: bankCode, currency: 'NGN' },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    )
    return res.data.data.recipient_code
  }

  private getDecimals(asset: string): number {
    const map: Record<string, number> = {
      USDC: 6, USDT: 6, ETH: 18, APT: 8, BTC: 8,
    }
    return map[asset.toUpperCase()] ?? 6
  }
}
