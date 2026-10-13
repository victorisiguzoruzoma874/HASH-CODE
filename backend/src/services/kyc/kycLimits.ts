import type { Prisma } from '@prisma/client'
import type { NextFunction, Response } from 'express'
import { prisma } from '../../config/database'
import { AppError } from '../../middleware/errorHandler'
import type { AuthRequest } from '../../middleware/auth'
import { logger } from '../../utils/logger'
import { tierConfig, minTierFor, type KycAction, type KycTier } from './kycTiers'

type Db = Prisma.TransactionClient

const LAGOS_OFFSET_MS = 60 * 60 * 1000 // WAT is UTC+1, no daylight saving

/** Start of the current day and month in Lagos time, as UTC instants. */
export function windowStarts(now = new Date()): { day: Date; month: Date } {
  const lagos = new Date(now.getTime() + LAGOS_OFFSET_MS)
  const day   = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate()) - LAGOS_OFFSET_MS
  const month = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1) - LAGOS_OFFSET_MS
  return { day: new Date(day), month: new Date(month) }
}

export async function getTier(db: Db, userId: string): Promise<KycTier> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { kycTier: true } })
  const t = user?.kycTier ?? 0
  return (t >= 1 && t <= 3 ? t : 0) as KycTier
}

/** NGN already debited by this user (pending and completed) today and this month. */
export async function getUsage(db: Db, userId: string, now = new Date()): Promise<{ usedToday: number; usedMonth: number }> {
  const { day, month } = windowStarts(now)
  const sum = async (since: Date) => {
    const r = await db.walletTransaction.aggregate({
      _sum:  { amount: true },
      where: { type: 'DEBIT', status: { in: ['PENDING', 'COMPLETED'] }, createdAt: { gte: since }, wallet: { userId } },
    })
    return Number(r._sum.amount ?? 0)
  }
  const [usedToday, usedMonth] = await Promise.all([sum(day), sum(month)])
  return { usedToday, usedMonth }
}

export function kycError(code: 'KYC_TIER_REQUIRED' | 'KYC_LIMIT_EXCEEDED', message: string, details: Record<string, unknown>): AppError {
  return new AppError(403, message, code, details)
}

/**
 * Throws unless the user's tier allows the action and, when an NGN amount is given,
 * the amount fits the per-transaction, daily and monthly limits.
 * Fails closed: any lookup error blocks the action.
 */
export async function assertAllowed(db: Db, userId: string, action: KycAction, amount?: number): Promise<void> {
  let tier: KycTier
  try { tier = await getTier(db, userId) }
  catch (err) {
    logger.error('KYC tier lookup failed; blocking action', { action, error: err instanceof Error ? err.message : String(err) })
    throw new AppError(503, 'Verification status is unavailable. Please try again.', 'KYC_UNAVAILABLE')
  }
  const cfg = tierConfig(tier)
  if (!cfg.allowedActions.includes(action)) {
    throw kycError('KYC_TIER_REQUIRED', 'Verify your identity to continue.', { requiredTier: minTierFor(action), currentTier: tier })
  }
  if (amount === undefined) return
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError(400, 'Invalid amount', 'INVALID_AMOUNT')

  const { usedToday, usedMonth } = await getUsage(db, userId)
  const remainingDaily   = Math.max(0, cfg.dailyLimit - usedToday)
  const remainingMonthly = Math.max(0, cfg.monthlyLimit - usedMonth)
  const remaining = Math.min(cfg.perTxLimit, remainingDaily, remainingMonthly)
  if (amount > remaining) {
    const next = tier < 3 ? tier + 1 : null
    throw kycError('KYC_LIMIT_EXCEEDED', 'This amount is over your verification limit.', {
      requiredTier: next, currentTier: tier, remaining,
      perTx: cfg.perTxLimit, remainingDaily, remainingMonthly,
    })
  }
}

/**
 * Use inside the transaction that debits the wallet. Locking the user row serializes
 * concurrent debits for the same user, so two requests cannot both fit under one limit.
 */
export async function guardDebit(tx: Db, userId: string, action: KycAction, amount: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
  await assertAllowed(tx, userId, action, amount)
}

/** Route-level tier check for actions that have no NGN amount yet (swap, off-ramp quote). */
export function requireTier(action: KycAction) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED')
      await assertAllowed(prisma, req.user.id, action)
      next()
    } catch (err) { next(err) }
  }
}
