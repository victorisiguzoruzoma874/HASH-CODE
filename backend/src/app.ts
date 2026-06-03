import express, { type Application, type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { authRouter }     from './routes/auth'
import { swapRouter }     from './routes/swap'
import { escrowRouter }   from './routes/escrow'
import { payoutRouter }   from './routes/payout'
import { airtimeRouter }  from './routes/airtime'
import { priceRouter }    from './routes/price'
import { kycRouter }      from './routes/kyc'
import { webhookRouter }  from './routes/webhook'
import { healthRouter }   from './routes/health'
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
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX ?? '100'),
  message:  { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})
app.use(limiter)

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
app.use(`${API}/airtime`, airtimeRouter)
app.use(`${API}/price`,   priceRouter)
app.use(`${API}/kyc`,     kycRouter)
app.use(`${API}/webhook`, webhookRouter)

// ── 404 handler ──────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// ── Global error handler ─────────────────────────────────────
app.use(errorHandler)

export default app
