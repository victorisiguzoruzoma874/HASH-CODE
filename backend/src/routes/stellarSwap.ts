import { Router, type Response, type NextFunction } from 'express'
import { body, param } from 'express-validator'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { StellarSwapService } from '../services/stellar/StellarSwapService'

export const stellarSwapRouter = Router()
const service = new StellarSwapService()
stellarSwapRouter.use(requireAuth)
stellarSwapRouter.post('/quote', [
  body('walletId').isString().isLength({ min: 1, max: 100 }),
  body('assetIn').isIn(['XLM', 'USDC']), body('assetOut').isIn(['XLM', 'USDC']),
  body('amountIn').isString().matches(/^\d+(\.\d{1,7})?$/).isLength({ max: 30 }),
], validate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await service.quote(req.user!.id, req.body)) } catch (error) { next(error) }
})
stellarSwapRouter.post('/submit', [body('quoteId').isUUID(), body('signedXdr').isString().isLength({ min: 1, max: 20_000 })], validate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(await service.submit(req.user!.id, req.body.quoteId, req.body.signedXdr)) } catch (error) { next(error) }
})
stellarSwapRouter.get('/:quoteId/status', [param('quoteId').isUUID()], validate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await service.status(req.user!.id, req.params.quoteId)) } catch (error) { next(error) }
})
