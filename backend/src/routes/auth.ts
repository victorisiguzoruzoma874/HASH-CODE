import { Router } from 'express'
import { body } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { prisma } from '../config/database'
import { validate } from '../middleware/validate'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { WalletLinkService } from '../services/wallets/WalletLinkService'
import { walletProviders } from '../services/wallets/WalletProof'
import { WalletBalanceService, balanceNetworks } from '../services/wallets/WalletBalanceService'

async function generateUniqueAccountNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const num = String(Math.floor(1000000000 + Math.random() * 9000000000))
    const exists = await prisma.user.findUnique({ where: { hashpayAccountNumber: num } })
    if (!exists) return num
  }
  throw new Error('Failed to generate unique account number')
}

export const authRouter = Router()
const walletLinks = new WalletLinkService()
const walletBalances = new WalletBalanceService()

function signToken(payload: object): string {
  const opts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'] }
  return jwt.sign(payload, process.env.JWT_SECRET!, opts)
}

// ── POST /auth/register ──────────────────────────────────────
authRouter.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').trim().notEmpty(),
  ],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const { email, password, fullName } = req.body

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS')

      const passwordHash = await bcrypt.hash(password, 12)
      const hashpayAccountNumber = await generateUniqueAccountNumber()
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role: 'USER',
          hashpayAccountNumber,
          wallet: { create: { ngnBalance: 0 } },
        },
        select: { id: true, email: true, fullName: true, role: true, hashpayAccountNumber: true, createdAt: true },
      })

      const token = signToken({ sub: user.id, address: '', role: user.role })
      res.status(201).json({ user, token })
    } catch (err) { next(err) }
  },
)

// ── POST /auth/login ─────────────────────────────────────────
authRouter.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const { email, password } = req.body

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS')

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS')

      const token = signToken({ sub: user.id, address: user.aptosAddress ?? '', role: user.role })
      res.json({
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
        token,
      })
    } catch (err) { next(err) }
  },
)

// ── POST /auth/connect-wallet ────────────────────────────────
authRouter.post(
  '/connect-wallet',
  requireAuth,
  [
    body('challengeId').isHexadecimal().isLength({ min: 64, max: 64 }),
    body('signature').isString().isLength({ min: 1, max: 4096 }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const wallet = await walletLinks.link(req.user!.id, req.body.challengeId, req.body.signature)
      res.json({ wallet, message: 'Wallet linked to your account.' })
    } catch (err) { next(err) }
  },
)

authRouter.post('/wallet-challenge', requireAuth, [
  body('provider').isIn(walletProviders),
  body('walletAddress').isString().isLength({ min: 1, max: 128 }),
], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const configuredOrigin = new URL(process.env.FRONTEND_URL ?? 'http://localhost:5173').origin
    const origin = req.get('origin') ?? configuredOrigin
    if (origin !== configuredOrigin) throw new AppError(403, 'Wallet request came from an unexpected website.', 'INVALID_WALLET_ORIGIN')
    res.json(await walletLinks.challenge(req.user!.id, req.body.provider, req.body.walletAddress, origin))
  } catch (err) { next(err) }
})

authRouter.get('/wallets', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try { res.json({ wallets: await walletLinks.list(req.user!.id) }) }
  catch (err) { next(err) }
})

authRouter.get('/wallet-networks', requireAuth, (_req, res) => { res.json({ networks: balanceNetworks }) })

authRouter.get('/wallets/:id/balance', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    if (req.query.network !== undefined && typeof req.query.network !== 'string') {
      throw new AppError(400, 'Select a supported wallet network.', 'INVALID_WALLET_NETWORK')
    }
    res.setHeader('Cache-Control', 'no-store')
    res.json(await walletBalances.get(req.user!.id, req.params.id, req.query.network as string | undefined))
  } catch (err) { next(err) }
})

authRouter.delete('/wallets/:id', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    await walletLinks.unlink(req.user!.id, req.params.id)
    res.json({ message: 'Wallet removed from your account.' })
  } catch (err) { next(err) }
})

// ── GET /auth/me ─────────────────────────────────────────────
authRouter.get('/me', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: {
        id: true, email: true, fullName: true,
        aptosAddress: true, suiAddress: true, evmAddress: true,
        kycStatus: true, kycLevel: true, role: true,
        preferredCurrency: true, createdAt: true,
        linkedWallets: { select: { id: true, provider: true, chain: true, address: true, createdAt: true } },
      },
    })
    res.json({ user })
  } catch (err) { next(err) }
})
