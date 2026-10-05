import express, { type Application, type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { authRouter }     from './routes/auth'
import { swapRouter }     from './routes/swap'
import { escrowRouter }   from './routes/escrow'
import { payoutRouter }   from './routes/payout'
import { priceRouter }    from './routes/price'
import { kycRouter }      from './routes/kyc'
import { webhookRouter }  from './routes/webhook'
import { healthRouter }   from './routes/health'
import { walletRouter }   from './routes/wallet'
import { errorHandler }   from './middleware/errorHandler'
import { logger }         from './utils/logger'

const app: Application = express()
const API = process.env.API_PREFIX ?? '/api/v1'

// Trust Railway's reverse proxy so rate-limiter sees real client IPs
app.set('trust proxy', 1)

// ── Security middleware ──────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin:      process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))

// ── Rate limiting ────────────────────────────────────────────
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000')

// General limit. Price/health are polled by the frontend every 30s from several
// components, so they get their own bucket and must not eat the shared quota.
const limiter = rateLimit({
  windowMs,
  max:      parseInt(process.env.RATE_LIMIT_MAX ?? '300'),
  message:  { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => req.path.startsWith(`${API}/price`) || req.path.startsWith(`${API}/health`),
})
app.use(limiter)

const pollingLimiter = rateLimit({
  windowMs: 60_000,
  max:      120,
  message:  { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})
app.use(`${API}/price`, pollingLimiter)

// Strict limit on credential endpoints; successful logins don't count against it
const authLimiter = rateLimit({
  windowMs,
  max:      20,
  message:  { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,
})
app.use(`${API}/auth`, authLimiter)

// ── Body parsing ─────────────────────────────────────────────
// Raw body for webhook signature verification
app.use(`${API}/webhook`, express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Logging ──────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}))

// ── Routes ───────────────────────────────────────────────────
app.use(`${API}/health`,  healthRouter)
app.use(`${API}/auth`,    authRouter)
app.use(`${API}/swap`,    swapRouter)
app.use(`${API}/escrow`,  escrowRouter)
app.use(`${API}/payout`,  payoutRouter)
// Airtime is disabled: the top-up route called Africa's Talking without charging
// the user. Re-enable only after it debits the wallet before sending airtime.
app.use(`${API}/airtime`, (_req, res) => {
  res.status(503).json({ error: 'Airtime top-up is not available.', code: 'AIRTIME_DISABLED' })
})
app.use(`${API}/price`,   priceRouter)
app.use(`${API}/kyc`,     kycRouter)
app.use(`${API}/wallet`,  walletRouter)
app.use(`${API}/webhook`, webhookRouter)

// ── 404 handler ──────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// ── Global error handler ─────────────────────────────────────
app.use(errorHandler)

export default app
