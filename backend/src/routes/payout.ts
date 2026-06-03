import { Router } from 'express'
import { body } from 'express-validator'
import { prisma } from '../config/database'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { AppError } from '../middleware/errorHandler'

export const payoutRouter = Router()

// ── GET /payout/banks ────────────────────────────────────────
// Fetches live bank list from Paystack
payoutRouter.get('/banks', async (_req: any, res: any, _next: any) => {
  try {
    const axios = (await import('axios')).default
    const response = await axios.get('https://api.paystack.co/bank?country=nigeria&perPage=100', {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const banks = response.data.data.map((b: any) => ({ code: b.code, name: b.name }))
    res.json({ banks })
  } catch {
    // Fallback static list if Paystack is unreachable
    res.json({
      banks: [
        { code: '058', name: 'GTBank' },
        { code: '044', name: 'Access Bank' },
        { code: '057', name: 'Zenith Bank' },
        { code: '011', name: 'First Bank' },
        { code: '033', name: 'UBA' },
        { code: '50211', name: 'Kuda Bank' },
        { code: '100004', name: 'OPay' },
        { code: '50515', name: 'Moniepoint' },
        { code: '100033', name: 'PalmPay' },
        { code: '050', name: 'EcoBank' },
        { code: '214', name: 'FCMB' },
        { code: '070', name: 'Fidelity Bank' },
        { code: '076', name: 'Polaris Bank' },
        { code: '221', name: 'Stanbic IBTC' },
        { code: '232', name: 'Sterling Bank' },
        { code: '032', name: 'Union Bank' },
        { code: '035', name: 'Wema Bank' },
        { code: '057', name: 'Zenith Bank' },
      ],
    })
  }
})

// ── POST /payout/verify-account ──────────────────────────────
// Verify a Nigerian bank account number via Paystack (no auth required — public lookup)
payoutRouter.post(
  '/verify-account',
  [
    body('accountNumber').isLength({ min: 10, max: 10 }).withMessage('Account number must be 10 digits'),
    body('bankCode').notEmpty().withMessage('Bank code is required'),
  ],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const { accountNumber, bankCode } = req.body
      const axios = (await import('axios')).default

      const response = await axios.get('https://api.paystack.co/bank/resolve', {
        params:  { account_number: accountNumber, bank_code: bankCode },
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      })

      if (!response.data.status) {
        throw new AppError(400, response.data.message || 'Account not found', 'ACCOUNT_NOT_FOUND')
      }

      res.json({
        accountNumber,
        bankCode,
        accountName: response.data.data.account_name,
        verified: true,
      })
    } catch (err: any) {
      if (err.response?.data?.message) {
        return next(new AppError(400, err.response.data.message, 'PAYSTACK_ERROR'))
      }
      next(err)
    }
  },
)

// ── PUT /payout/bank-details ─────────────────────────────────
// Save user's bank details for future payouts
payoutRouter.put(
  '/bank-details',
  requireAuth,
  [
    body('bankCode').notEmpty(),
    body('bankName').notEmpty(),
    body('accountNumber').isLength({ min: 10, max: 10 }),
    body('accountName').notEmpty(),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { bankCode, bankName, accountNumber, accountName } = req.body
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data:  { bankCode, bankName, bankAccountNumber: accountNumber, bankAccountName: accountName },
        select: { id: true, bankCode: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
      })
      res.json({ user, message: 'Bank details saved' })
    } catch (err) { next(err) }
  },
)
