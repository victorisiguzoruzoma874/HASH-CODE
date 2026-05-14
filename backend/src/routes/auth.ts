import { Router } from 'express'
import { body } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { prisma } from '../config/database'
import { validate } from '../middleware/validate'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'

export const authRouter = Router()

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
      const user = await prisma.user.create({
        data:   { email, passwordHash, fullName, role: 'USER' },
        select: { id: true, email: true, fullName: true, role: true, createdAt: true },
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
    body('walletAddress').notEmpty().withMessage('Wallet address required'),
    body('chain').isIn(['sui', 'aptos', 'evm']).withMessage('chain must be sui | aptos | evm'),
    body('signature').notEmpty().withMessage('Signature required'),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { walletAddress, chain } = req.body
      const updateData: Record<string, string> = {}
      if (chain === 'sui')   updateData.suiAddress   = walletAddress
      if (chain === 'aptos') updateData.aptosAddress = walletAddress
      if (chain === 'evm')   updateData.evmAddress   = walletAddress

      const user = await prisma.user.update({
        where:  { id: req.user!.id },
        data:   updateData,
        select: { id: true, email: true, aptosAddress: true, suiAddress: true, evmAddress: true },
      })
      res.json({ user, message: `${chain} wallet connected` })
    } catch (err) { next(err) }
  },
)

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
      },
    })
    res.json({ user })
  } catch (err) { next(err) }
})
