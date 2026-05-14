import { Router, type Request, type Response } from 'express'
import { prisma } from '../config/database'
import { redis } from '../config/redis'

export const healthRouter = Router()

healthRouter.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {}

  // DB
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  // Redis
  try {
    await redis.ping()
    checks.redis = 'ok'
  } catch {
    checks.redis = 'error'
  }

  const healthy = Object.values(checks).every(v => v === 'ok')
  res.status(healthy ? 200 : 503).json({
    status:    healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version ?? '1.0.0',
    checks,
  })
})
