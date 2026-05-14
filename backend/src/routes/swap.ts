import { Router } from 'express'
import { body } from 'express-validator'
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'
import { aptosClient, MODULE_ADDRESS } from '../config/aptos'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { PriceOracleService } from '../services/oracle/PriceOracleService'
import { AppError } from '../middleware/errorHandler'

export const swapRouter = Router()
const oracle = new PriceOracleService()

// ── POST /swap/quote ─────────────────────────────────────────
// Returns a swap quote with locked rate and min_out for slippage protection
swapRouter.post(
  '/quote',
  requireAuth,
  [
    body('assetIn').isIn(['ETH', 'USDC', 'USDT', 'APT', 'BTC', 'WETH']),
    body('assetOut').isIn(['ETH', 'USDC', 'USDT', 'APT', 'BTC', 'WETH']),
    body('amountIn').isNumeric(),
    body('slippageBps').optional().isInt({ min: 1, max: 500 }).default(50),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { assetIn, assetOut, amountIn, slippageBps = 50 } = req.body

      const priceIn  = await oracle.getUSDPrice(assetIn)
      const priceOut = await oracle.getUSDPrice(assetOut)
      const rate     = priceIn / priceOut

      const amountOut    = parseFloat(amountIn) * rate
      const minOut       = amountOut * (1 - slippageBps / 10_000)
      const priceImpact  = 0.05  // mock — real DEX would calculate this

      res.json({
        assetIn,
        assetOut,
        amountIn:    parseFloat(amountIn),
        amountOut,
        minOut,
        rate,
        slippageBps,
        priceImpact,
        networkFee:  0.00042,
        networkFeeUSD: 0.00042 * priceIn,
        expiresAt:   new Date(Date.now() + 30_000).toISOString(),
        quoteId:     `Q-${Date.now()}`,
      })
    } catch (err) { next(err) }
  },
)

// ── POST /swap/build-tx ──────────────────────────────────────
// Builds the unsigned Move transaction payload for the frontend to sign
swapRouter.post(
  '/build-tx',
  requireAuth,
  [
    body('quoteId').notEmpty(),
    body('senderAddress').notEmpty(),
    body('amountIn').isNumeric(),
    body('minOut').isNumeric(),
    body('assetIn').notEmpty(),
    body('assetOut').notEmpty(),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { senderAddress, amountIn, minOut, assetIn, assetOut } = req.body

      // Build the Move transaction payload
      const payload = {
        function:      `${MODULE_ADDRESS}::swap_manager::swap_and_escrow` as `${string}::${string}::${string}`,
        typeArguments: [
          `${MODULE_ADDRESS}::coins::${assetIn}`,
          `${MODULE_ADDRESS}::coins::${assetOut}`,
        ] as [`${string}::${string}::${string}`, `${string}::${string}::${string}`],
        functionArguments: [
          Math.floor(parseFloat(amountIn) * 1e6).toString(),  // u64 with 6 decimals
          Math.floor(parseFloat(minOut)   * 1e6).toString(),  // min_out slippage guard
        ],
      }

      const txn = await aptosClient.transaction.build.simple({
        sender: senderAddress,
        data:   payload,
      })

      res.json({
        transaction: txn,
        message:     'Sign this transaction with your wallet and submit via /swap/submit',
      })
    } catch (err) { next(err) }
  },
)

// ── POST /swap/submit ────────────────────────────────────────
// Submits a signed transaction to the Aptos network
swapRouter.post(
  '/submit',
  requireAuth,
  [
    body('signedTransaction').notEmpty(),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const { signedTransaction } = req.body

      const submitted = await aptosClient.transaction.submit.simple({
        transaction:         signedTransaction.transaction,
        senderAuthenticator: signedTransaction.authenticator,
      })

      const result = await aptosClient.waitForTransaction({
        transactionHash: submitted.hash,
        options: { checkSuccess: true },
      })

      res.json({
        txHash:  result.hash,
        success: result.success,
        message: 'Transaction submitted. Escrow listener will process the payout.',
      })
    } catch (err) { next(err) }
  },
)
