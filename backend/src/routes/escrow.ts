import { Router } from 'express'
import { body, param } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../config/database'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { AppError } from '../middleware/errorHandler'
import { PriceOracleService } from '../services/oracle/PriceOracleService'
import {
  signQuote, getBackendPublicKey, getCurrentSuiEpoch,
} from '../utils/quoteSign'

export const escrowRouter = Router()
const oracle = new PriceOracleService()

const SUPPORTED_CURRENCIES = ['NGN', 'GHS', 'KES', 'XOF', 'XAF']
const SUPPORTED_ASSETS     = ['USDC', 'USDT', 'ETH', 'SUI', 'APT', 'BTC']
const FEE_BPS              = 50
const QUOTE_VALID_EPOCHS   = 5n   // ~5 Sui epochs ≈ 5 hours

// ── GET /escrow/orders ───────────────────────────────────────
escrowRouter.get('/orders', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where: any = { userId: req.user!.id }
    if (status) where.status = status.toUpperCase()

    const [orders, total] = await Promise.all([
      prisma.escrowOrder.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.escrowOrder.count({ where }),
    ])

    res.json({
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    })
  } catch (err) { next(err) }
})

// ── GET /escrow/orders/:id ───────────────────────────────────
escrowRouter.get(
  '/orders/:id',
  requireAuth,
  [param('id').isUUID()],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const order = await prisma.escrowOrder.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      })
      if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND')
      res.json({ order })
    } catch (err) { next(err) }
  },
)

// ── POST /escrow/quote ───────────────────────────────────────
// Returns a signed quote the frontend passes directly to deposit_and_lock()
escrowRouter.post(
  '/quote',
  requireAuth,
  [
    body('asset').isIn(SUPPORTED_ASSETS),
    body('amountIn').isNumeric().withMessage('amountIn must be a number'),
    body('currencyOut').optional().isIn(SUPPORTED_CURRENCIES),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { asset, amountIn, currencyOut = 'NGN' } = req.body

      // ── 1. Calculate fiat output ─────────────────────────
      const rate      = await oracle.getRate(asset, currencyOut)
      const gross     = parseFloat(amountIn) * rate
      const fee       = gross * (FEE_BPS / 10_000)
      const netAmount = Math.floor(gross - fee)

      // ── 2. Convert to on-chain u64 values ────────────────
      const decimals    = getDecimals(asset)
      const amountInU64 = BigInt(Math.round(parseFloat(amountIn) * Math.pow(10, decimals)))
      const amountOutU64 = BigInt(netAmount)

      // ── 3. Set expiry ────────────────────────────────────
      const currentEpoch = await getCurrentSuiEpoch()
      const expiry       = currentEpoch + QUOTE_VALID_EPOCHS

      // ── 4. Generate unique order ID ──────────────────────
      const orderId = uuidv4()

      // ── 5. Sign the quote ────────────────────────────────
      let signedQuote: { signature: string; orderIdHex: string } | null = null
      let backendPubkey = ''

      try {
        const result = signQuote({ orderId, amountIn: amountInU64, amountOut: amountOutU64, expiry })
        signedQuote  = result
        backendPubkey = getBackendPublicKey()
      } catch {
        // Dev mode: no signing key configured — return unsigned quote
      }

      res.json({
        // Display values
        asset,
        amountIn:      parseFloat(amountIn),
        currencyOut,
        rate,
        gross:         Math.floor(gross),
        fee:           Math.floor(fee),
        netAmount,
        feeBps:        FEE_BPS,

        // On-chain values — pass directly to deposit_and_lock()
        orderId,
        orderIdHex:    signedQuote?.orderIdHex ?? Buffer.from(orderId, 'utf8').toString('hex'),
        amountInU64:   amountInU64.toString(),
        amountOutU64:  amountOutU64.toString(),
        expiry:        expiry.toString(),
        signature:     signedQuote?.signature ?? null,
        backendPubkey: backendPubkey || null,
        timeoutEpochs: 100,   // user can self-refund after 100 epochs (~4 days)

        // Metadata
        expiresAt:     new Date(Date.now() + Number(QUOTE_VALID_EPOCHS) * 3_600_000).toISOString(),
        signed:        !!signedQuote,
      })
    } catch (err) { next(err) }
  },
)

// ── GET /escrow/stats ────────────────────────────────────────
escrowRouter.get('/stats', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const userId = req.user!.id
    const [total, completed, pending, totalNgn] = await Promise.all([
      prisma.escrowOrder.count({ where: { userId } }),
      prisma.escrowOrder.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.escrowOrder.count({ where: { userId, status: { in: ['PENDING_PAYOUT', 'DEPOSITING'] } } }),
      prisma.escrowOrder.aggregate({ where: { userId, status: 'COMPLETED' }, _sum: { ngnAmount: true } }),
    ])

    res.json({
      totalOrders:     total,
      completedOrders: completed,
      pendingOrders:   pending,
      totalNgnPaid:    totalNgn._sum.ngnAmount ?? 0,
    })
  } catch (err) { next(err) }
})

function getDecimals(asset: string): number {
  const map: Record<string, number> = { USDC: 6, USDT: 6, ETH: 18, SUI: 9, APT: 8, BTC: 8 }
  return map[asset.toUpperCase()] ?? 6
}
