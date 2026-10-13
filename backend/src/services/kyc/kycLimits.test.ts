import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../config/database', () => ({ prisma: {} }))

import { assertAllowed, guardDebit, windowStarts, requireTier } from './kycLimits'
import { KYC_TIERS, minTierFor, tierConfig } from './kycTiers'

/** Minimal stand-in for a Prisma client: a tier and an amount already used today/this month. */
function fakeDb(opts: { tier?: number; usedToday?: number; usedMonth?: number; failTier?: boolean }) {
  const aggregate = vi.fn()
    .mockResolvedValueOnce({ _sum: { amount: opts.usedToday ?? 0 } })
    .mockResolvedValueOnce({ _sum: { amount: opts.usedMonth ?? opts.usedToday ?? 0 } })
  return {
    user: { findUnique: opts.failTier ? vi.fn().mockRejectedValue(new Error('db down')) : vi.fn().mockResolvedValue({ kycTier: opts.tier ?? 0 }) },
    walletTransaction: { aggregate },
    $queryRaw: vi.fn().mockResolvedValue([]),
  } as any
}

describe('tier config', () => {
  it('limits only ever grow with the tier and tier 0 cannot transact', () => {
    for (let i = 1; i < KYC_TIERS.length; i++) {
      expect(KYC_TIERS[i].perTxLimit).toBeGreaterThanOrEqual(KYC_TIERS[i - 1].perTxLimit)
      expect(KYC_TIERS[i].dailyLimit).toBeGreaterThanOrEqual(KYC_TIERS[i - 1].dailyLimit)
      expect(KYC_TIERS[i].monthlyLimit).toBeGreaterThanOrEqual(KYC_TIERS[i - 1].monthlyLimit)
      expect(KYC_TIERS[i].allowedActions).toEqual(expect.arrayContaining(KYC_TIERS[i - 1].allowedActions))
    }
    expect(tierConfig(0).allowedActions).toEqual([])
    expect(tierConfig(99).tier).toBe(0)
  })

  it('maps every action to a minimum tier', () => {
    expect(minTierFor('BILLS')).toBe(1)
    expect(minTierFor('OFFRAMP')).toBe(2)
    expect(minTierFor('SWAP')).toBe(2)
  })
})

describe('assertAllowed', () => {
  it('blocks an unverified user with KYC_TIER_REQUIRED and names the tier needed', async () => {
    await expect(assertAllowed(fakeDb({ tier: 0 }), 'u1', 'BILLS', 100)).rejects.toMatchObject({
      statusCode: 403, code: 'KYC_TIER_REQUIRED', details: { requiredTier: 1, currentTier: 0 },
    })
  })

  it('blocks an action the tier does not include', async () => {
    await expect(assertAllowed(fakeDb({ tier: 1 }), 'u1', 'OFFRAMP', 100)).rejects.toMatchObject({ code: 'KYC_TIER_REQUIRED', details: { requiredTier: 2 } })
  })

  it('allows an amount inside every limit', async () => {
    await expect(assertAllowed(fakeDb({ tier: 1, usedToday: 10_000 }), 'u1', 'BILLS', 20_000)).resolves.toBeUndefined()
  })

  it('blocks over the per-transaction limit', async () => {
    const perTx = tierConfig(1).perTxLimit
    await expect(assertAllowed(fakeDb({ tier: 1 }), 'u1', 'INTERNAL_TRANSFER', perTx + 1)).rejects.toMatchObject({
      statusCode: 403, code: 'KYC_LIMIT_EXCEEDED', details: { currentTier: 1, requiredTier: 2, remaining: perTx },
    })
  })

  it('counts what was already spent today toward the daily limit', async () => {
    const cfg = tierConfig(1)
    const db = fakeDb({ tier: 1, usedToday: cfg.dailyLimit - 1_000, usedMonth: cfg.dailyLimit - 1_000 })
    await expect(assertAllowed(db, 'u1', 'BILLS', 1_001)).rejects.toMatchObject({ code: 'KYC_LIMIT_EXCEEDED', details: { remainingDaily: 1_000, remaining: 1_000 } })
  })

  it('counts the monthly limit separately', async () => {
    const cfg = tierConfig(1)
    const db = fakeDb({ tier: 1, usedToday: 0, usedMonth: cfg.monthlyLimit - 500 })
    await expect(assertAllowed(db, 'u1', 'BILLS', 501)).rejects.toMatchObject({ code: 'KYC_LIMIT_EXCEEDED', details: { remainingMonthly: 500 } })
  })

  it('has no further tier to suggest at Tier 3', async () => {
    const perTx = tierConfig(3).perTxLimit
    await expect(assertAllowed(fakeDb({ tier: 3 }), 'u1', 'OFFRAMP', perTx + 1)).rejects.toMatchObject({ details: { requiredTier: null } })
  })

  it('fails closed when the tier lookup errors', async () => {
    await expect(assertAllowed(fakeDb({ failTier: true }), 'u1', 'BILLS', 100)).rejects.toMatchObject({ statusCode: 503, code: 'KYC_UNAVAILABLE' })
  })

  it('rejects zero, negative and non-numeric amounts', async () => {
    for (const bad of [0, -5, NaN]) {
      await expect(assertAllowed(fakeDb({ tier: 1 }), 'u1', 'BILLS', bad)).rejects.toMatchObject({ code: 'INVALID_AMOUNT' })
    }
  })
})

describe('guardDebit', () => {
  it('locks the user row before checking, so concurrent debits are serialized', async () => {
    const db = fakeDb({ tier: 1 })
    const order: string[] = []
    db.$queryRaw.mockImplementation(async () => { order.push('lock'); return [] })
    db.user.findUnique.mockImplementation(async () => { order.push('tier'); return { kycTier: 1 } })
    await guardDebit(db, 'u1', 'BILLS', 100)
    expect(order).toEqual(['lock', 'tier'])
  })
})

describe('windowStarts', () => {
  it('rolls the day over at midnight Lagos time (UTC+1), not midnight UTC', () => {
    const justBeforeLagosMidnight = new Date('2026-10-12T22:59:00Z') // 23:59 in Lagos
    expect(windowStarts(justBeforeLagosMidnight).day.toISOString()).toBe('2026-10-11T23:00:00.000Z')
    const justAfter = new Date('2026-10-12T23:01:00Z') // 00:01 on the 13th in Lagos
    expect(windowStarts(justAfter).day.toISOString()).toBe('2026-10-12T23:00:00.000Z')
  })

  it('starts the month on the 1st in Lagos time', () => {
    expect(windowStarts(new Date('2026-10-20T12:00:00Z')).month.toISOString()).toBe('2026-09-30T23:00:00.000Z')
  })
})

describe('requireTier middleware', () => {
  beforeEach(() => vi.clearAllMocks())
  it('rejects a request with no user', async () => {
    const next = vi.fn()
    await requireTier('SWAP')({} as any, {} as any, next)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })
})
