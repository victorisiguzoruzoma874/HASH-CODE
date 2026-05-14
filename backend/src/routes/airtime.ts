import { Router } from 'express'
import { body } from 'express-validator'
import axios from 'axios'
import { prisma } from '../config/database'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { PriceOracleService } from '../services/oracle/PriceOracleService'
import { AppError } from '../middleware/errorHandler'

export const airtimeRouter = Router()
const oracle = new PriceOracleService()

const AT_BASE = 'https://api.africastalking.com/version1'

// ── POST /airtime/topup ──────────────────────────────────────
airtimeRouter.post(
  '/topup',
  requireAuth,
  [
    body('phoneNumber').isMobilePhone('any').withMessage('Invalid phone number'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isIn(['NGN', 'USD', 'GHS', 'KES']).default('NGN'),
    body('payAsset').isIn(['ETH', 'USDC', 'USDT', 'APT']).default('USDC'),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { phoneNumber, amount, currency, payAsset } = req.body

      // Convert fiat amount to crypto equivalent for display
      const rate       = await oracle.getRate(payAsset, currency)
      const cryptoCost = parseFloat(amount) / rate

      // Call Africa's Talking airtime API
      const response = await axios.post(
        `${AT_BASE}/airtime/send`,
        new URLSearchParams({
          username:   process.env.AT_USERNAME ?? 'sandbox',
          recipients: JSON.stringify([{
            phoneNumber,
            currencyCode: currency,
            amount:       parseFloat(amount),
          }]),
        }),
        {
          headers: {
            apiKey:       process.env.AT_API_KEY ?? '',
            Accept:       'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )

      const result = response.data.responses?.[0]
      if (result?.status !== 'Success') {
        throw new AppError(400, result?.errorMessage ?? 'Airtime top-up failed', 'AIRTIME_FAILED')
      }

      // Record the transaction
      const tx = await prisma.airtimeTransaction.create({
        data: {
          userId:      req.user!.id,
          phoneNumber,
          amount:      parseFloat(amount),
          currency,
          payAsset,
          cryptoCost,
          status:      'COMPLETED',
          reference:   result.requestId,
        },
      })

      res.json({
        success:    true,
        reference:  result.requestId,
        phoneNumber,
        amount:     parseFloat(amount),
        currency,
        cryptoCost,
        payAsset,
        transactionId: tx.id,
      })
    } catch (err) { next(err) }
  },
)

// ── GET /airtime/history ─────────────────────────────────────
airtimeRouter.get('/history', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const transactions = await prisma.airtimeTransaction.findMany({
      where:   { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })
    res.json({ transactions })
  } catch (err) { next(err) }
})
