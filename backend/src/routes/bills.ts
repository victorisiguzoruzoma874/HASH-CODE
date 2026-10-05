import { Router } from 'express'
import { body, query } from 'express-validator'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { billsService, type BillCategory } from '../services/bills/BillsService'

export const billsRouter = Router()

// Every bills route needs a logged-in user
billsRouter.use(requireAuth)

const CATEGORIES = ['airtime', 'data', 'electricity']

// ── GET /bills/items?category=airtime|data|electricity ───────
billsRouter.get(
  '/items',
  [query('category').isIn(CATEGORIES)],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const items = await billsService.getCatalogue(req.query.category as BillCategory)
      res.json({ items })
    } catch (err) { next(err) }
  },
)

// ── POST /bills/validate ─────────────────────────────────────
// Confirm a meter number / account name before paying
billsRouter.post(
  '/validate',
  [
    body('category').isIn(CATEGORIES),
    body('billerCode').isString().notEmpty(),
    body('itemCode').isString().notEmpty(),
    body('customer').isString().trim().isLength({ min: 5, max: 20 }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { category, billerCode, itemCode, customer } = req.body
      const result = await billsService.validateCustomer(category, billerCode, itemCode, customer)
      res.json(result)
    } catch (err) { next(err) }
  },
)

// ── POST /bills/pay ──────────────────────────────────────────
// Debits the wallet, buys from the provider, refunds on a clear failure
billsRouter.post(
  '/pay',
  [
    body('category').isIn(CATEGORIES),
    body('billerCode').isString().notEmpty(),
    body('itemCode').isString().notEmpty(),
    body('customer').isString().trim().isLength({ min: 5, max: 20 }),
    body('amount').optional().isFloat({ min: 1 }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { category, billerCode, itemCode, customer, amount } = req.body
      const result = await billsService.pay({
        userId: req.user!.id, category, billerCode, itemCode, customer,
        amount: amount !== undefined ? Number(amount) : undefined,
      })
      res.status(result.status === 'PENDING' ? 202 : 200).json(result)
    } catch (err) { next(err) }
  },
)
