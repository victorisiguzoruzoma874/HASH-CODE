import { Router } from 'express'
import { body } from 'express-validator'
import { prisma } from '../config/database'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { AppError } from '../middleware/errorHandler'

export const payoutRouter = Router()

// ── GET /payout/banks ────────────────────────────────────────
// Returns list of supported Nigerian banks with their codes
payoutRouter.get('/banks', requireAuth, async (_req: any, res: any, next: any) => {
  try {
    // In production, fetch from Flutterwave /banks/NG
    const banks = [
      { code: '044', name: 'Access Bank' },
      { code: '023', name: 'Citibank Nigeria' },
      { code: '050', name: 'EcoBank Nigeria' },
      { code: '011', name: 'First Bank of Nigeria' },
      { code: '214', name: 'First City Monument Bank' },
      { code: '058', name: 'Guaranty Trust Bank' },
      { code: '030', name: 'Heritage Bank' },
      { code: '301', name: 'Jaiz Bank' },
      { code: '082', name: 'Keystone Bank' },
      { code: '526', name: 'Kuda Bank' },
      { code: '076', name: 'Polaris Bank' },
      { code: '101', name: 'Providus Bank' },
      { code: '221', name: 'Stanbic IBTC Bank' },
      { code: '068', name: 'Standard Chartered Bank' },
      { code: '232', name: 'Sterling Bank' },
      { code: '100', name: 'SunTrust Bank' },
      { code: '032', name: 'Union Bank of Nigeria' },
      { code: '033', name: 'United Bank for Africa' },
      { code: '215', name: 'Unity Bank' },
      { code: '035', name: 'Wema Bank' },
      { code: '057', name: 'Zenith Bank' },
      { code: '999992', name: 'OPay' },
      { code: '999991', name: 'Moniepoint' },
      { code: '999993', name: 'PalmPay' },
    ]
    res.json({ banks })
  } catch (err) { next(err) }
})

// ── POST /payout/verify-account ──────────────────────────────
// Verify a bank account number before payout
payoutRouter.post(
  '/verify-account',
  requireAuth,
  [
    body('accountNumber').isLength({ min: 10, max: 10 }).withMessage('Account number must be 10 digits'),
    body('bankCode').notEmpty(),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { accountNumber, bankCode } = req.body

      // Call Flutterwave account verification
      const axios = (await import('axios')).default
      const response = await axios.get(
        `https://api.flutterwave.com/v3/accounts/resolve`,
        {
          params:  { account_number: accountNumber, account_bank: bankCode },
          headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
        },
      )

      if (response.data.status !== 'success') {
        throw new AppError(400, 'Could not verify account', 'ACCOUNT_VERIFICATION_FAILED')
      }

      res.json({
        accountNumber,
        bankCode,
        accountName: response.data.data.account_name,
        verified:    true,
      })
    } catch (err) { next(err) }
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
