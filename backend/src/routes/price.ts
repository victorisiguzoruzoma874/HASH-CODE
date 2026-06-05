import { Router } from 'express'
import { param } from 'express-validator'
import { PriceOracleService } from '../services/oracle/PriceOracleService'
import { validate } from '../middleware/validate'

export const priceRouter = Router()
const oracle = new PriceOracleService()

// ── GET /price/all ───────────────────────────────────────────
priceRouter.get('/all', async (_req, res, next) => {
  try {
    const prices = await oracle.getAllPrices()
    res.json({ prices, timestamp: new Date().toISOString() })
  } catch (err) { next(err) }
})

// ── GET /price/:asset ────────────────────────────────────────
priceRouter.get(
  '/:asset',
  [param('asset').isIn(['ETH','BTC','SUI','APT','USDC','USDT','SOL','BNB','MATIC','AVAX','LINK','UNI','AAVE','ARB','DOGE','ADA','DOT','OP','DAI','WBTC','WETH'])],
  validate,
  async (req: any, res: any, next: any) => {
    try {
      const asset    = req.params.asset.toUpperCase()
      const usd      = await oracle.getUSDPrice(asset)
      const ngn      = await oracle.getRate(asset, 'NGN')
      res.json({ asset, usd, ngn, timestamp: new Date().toISOString() })
    } catch (err) { next(err) }
  },
)

// ── GET /price/convert/:asset/:currency ──────────────────────
priceRouter.get(
  '/convert/:asset/:currency',
  async (req: any, res: any, next: any) => {
    try {
      const { asset, currency } = req.params
      const rate = await oracle.getRate(asset.toUpperCase(), currency.toUpperCase())
      res.json({ asset: asset.toUpperCase(), currency: currency.toUpperCase(), rate, timestamp: new Date().toISOString() })
    } catch (err) { next(err) }
  },
)
