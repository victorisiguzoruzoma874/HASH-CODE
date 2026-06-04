import { Router } from 'express'
import { body, query } from 'express-validator'
import axios from 'axios'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../config/database'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { AppError } from '../middleware/errorHandler'
import { walletService } from '../services/wallet/WalletService'

export const walletRouter = Router()

// All wallet routes require auth
walletRouter.use(requireAuth)

// ── GET /wallet/balance ───────────────────────────────────────
walletRouter.get('/balance', async (req: AuthRequest, res: any, next: any) => {
  try {
    const data = await walletService.getBalance(req.user!.id)
    res.json({ data })
  } catch (err) { next(err) }
})

// ── POST /wallet/send ─────────────────────────────────────────
walletRouter.post(
  '/send',
  [
    body('recipientAccountNumber')
      .isLength({ min: 10, max: 10 })
      .withMessage('Account number must be 10 digits'),
    body('amount')
      .isFloat({ min: 1 })
      .withMessage('Amount must be at least ₦1'),
    body('pin').optional().isLength({ min: 4, max: 6 }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { recipientAccountNumber, amount } = req.body
      const result = await walletService.transfer(
        req.user!.id,
        recipientAccountNumber,
        new Decimal(amount),
      )
      res.json({ message: 'Transfer successful', data: result })
    } catch (err) { next(err) }
  },
)

// ── GET /wallet/transactions ──────────────────────────────────
walletRouter.get(
  '/transactions',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const page     = Number(req.query.page ?? 1)
      const pageSize = Number(req.query.pageSize ?? 20)
      const data = await walletService.listTransactions(req.user!.id, page, pageSize)
      res.json({ data })
    } catch (err) { next(err) }
  },
)

// ── GET /wallet/lookup/:accountNumber ────────────────────────
// Resolve a HashPay account number to the holder's name (before sending)
walletRouter.get('/lookup/:accountNumber', async (req: AuthRequest, res: any, next: any) => {
  try {
    const { accountNumber } = req.params
    const user = await prisma.user.findUnique({
      where:  { hashpayAccountNumber: accountNumber },
      select: { fullName: true, hashpayAccountNumber: true },
    })
    if (!user) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND')
    res.json({ data: { fullName: user.fullName, accountNumber: user.hashpayAccountNumber } })
  } catch (err) { next(err) }
})

// ── POST /wallet/create-virtual-account ──────────────────────
// Create a Paystack DVA tied to this user (requires KYC BASIC+)
walletRouter.post('/create-virtual-account', async (req: AuthRequest, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: {
        id: true, fullName: true, email: true,
        kycLevel: true, virtualAccountNumber: true,
      },
    })
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    if (user.virtualAccountNumber) {
      return res.json({ message: 'Virtual account already exists', data: { accountNumber: user.virtualAccountNumber } })
    }
    if (user.kycLevel === 'NONE') {
      throw new AppError(403, 'KYC required to create a virtual account', 'KYC_REQUIRED')
    }

    // Create a Paystack customer first, then assign a DVA
    const [firstName, ...rest] = user.fullName.trim().split(' ')
    const lastName = rest.join(' ') || firstName

    const customerRes = await axios.post(
      'https://api.paystack.co/customer',
      { email: user.email, first_name: firstName, last_name: lastName },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
    )
    const customerCode: string = customerRes.data.data.customer_code

    const dvaRes = await axios.post(
      'https://api.paystack.co/dedicated_account',
      { customer: customerCode, preferred_bank: 'wema-bank' },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
    )
    const dva = dvaRes.data.data

    await prisma.user.update({
      where: { id: user.id },
      data: {
        virtualAccountNumber: dva.account_number,
        virtualBankName:      dva.bank.name,
        virtualBankCode:      dva.bank.slug,
        virtualAccountRef:    customerCode,
      },
    })

    res.status(201).json({
      message: 'Virtual account created',
      data: {
        accountNumber: dva.account_number,
        bankName:      dva.bank.name,
      },
    })
  } catch (err: any) {
    if (err.response?.data?.message) {
      return next(new AppError(400, err.response.data.message, 'PAYSTACK_DVA_ERROR'))
    }
    next(err)
  }
})

// ── POST /wallet/initiate-deposit ─────────────────────────────
// Create a Paycrest order so the user can fund their NGN wallet with crypto
walletRouter.post(
  '/initiate-deposit',
  [
    body('token').isIn(['USDC', 'USDT']).withMessage('token must be USDC or USDT'),
    body('network').notEmpty().withMessage('network is required'),
    body('amount').isFloat({ min: 0.5 }).withMessage('Minimum deposit is $0.50'),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { token, network, amount } = req.body
      const user = await prisma.user.findUnique({
        where:  { id: req.user!.id },
        select: { id: true, fullName: true, hashpayAccountNumber: true },
      })
      if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')

      const paycrestRes = await axios.post(
        'https://api.paycrest.io/v2/orders',
        {
          amount:   String(amount),
          token,
          network,
          rate:     0,  // use market rate
          currency: 'NGN',
          recipient: {
            institution:       'HASHPAY_INTERNAL',
            accountIdentifier: user.hashpayAccountNumber,
            accountName:       user.fullName,
            memo:              `Wallet funding for ${user.hashpayAccountNumber}`,
          },
          returnAddress: '',
          reference:     `WF-${user.id}-${Date.now()}`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYCREST_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )

      const order = paycrestRes.data.data
      res.status(201).json({
        message: 'Deposit order created',
        data: {
          orderId:        order.id,
          depositAddress: order.receiveAddress,
          token,
          network,
          amount,
          expiresAt:      order.expiresAt,
        },
      })
    } catch (err: any) {
      if (err.response?.data?.message) {
        return next(new AppError(400, err.response.data.message, 'PAYCREST_ORDER_ERROR'))
      }
      next(err)
    }
  },
)

// ── GET /wallet/rate ──────────────────────────────────────────
// Get live crypto → NGN rate from Paycrest (no auth required by Paycrest but we keep it authed)
walletRouter.get('/rate', async (req: AuthRequest, res: any, next: any) => {
  try {
    const token   = (req.query.token   as string) ?? 'USDC'
    const network = (req.query.network as string) ?? 'base'
    const amount  = (req.query.amount  as string) ?? '1'

    const rateRes = await axios.get('https://api.paycrest.io/v2/token-rate', {
      params: { token, network, amount, currency: 'NGN' },
    })

    res.json({ data: rateRes.data.data })
  } catch (err: any) {
    if (err.response?.data?.message) {
      return next(new AppError(400, err.response.data.message, 'PAYCREST_RATE_ERROR'))
    }
    next(err)
  }
})
