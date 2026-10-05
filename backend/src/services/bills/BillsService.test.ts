import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// ── In-memory stand-ins for the database, cache and provider ──────────
const { db, prismaMock, axiosMock } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Decimal: D } = require('@prisma/client/runtime/library')
  const db = {
    wallet: { id: 'w1', userId: 'u1', ngnBalance: new D(1000) as any },
    txs: [] as any[],
  }

  const txMock = {
    wallet: {
      findUnique: async () => ({ ...db.wallet }),
      findUniqueOrThrow: async () => ({ ...db.wallet }),
      updateMany: async ({ where, data }: any) => {
        if (db.wallet.ngnBalance.lt(where.ngnBalance.gte)) return { count: 0 }
        db.wallet.ngnBalance = db.wallet.ngnBalance.minus(data.ngnBalance.decrement)
        return { count: 1 }
      },
      update: async ({ data }: any) => {
        db.wallet.ngnBalance = db.wallet.ngnBalance.plus(data.ngnBalance.increment)
        return { ...db.wallet }
      },
    },
    walletTransaction: {
      create: async ({ data }: any) => { const row = { id: `t${db.txs.length + 1}`, ...data }; db.txs.push(row); return row },
      findUniqueOrThrow: async ({ where }: any) => ({ ...db.txs.find((t: any) => t.id === where.id) }),
      update: async ({ where, data }: any) => { Object.assign(db.txs.find((t: any) => t.id === where.id), data); return {} },
    },
  }

  const prismaMock = {
    $transaction: async (cb: (tx: any) => Promise<any>) => cb(txMock),
    wallet: txMock.wallet,
    walletTransaction: txMock.walletTransaction,
  }
  const axiosMock = { get: vi.fn(), post: vi.fn() }
  return { db, prismaMock, axiosMock }
})

vi.mock('../../config/database', () => ({ prisma: prismaMock }))
vi.mock('../../config/redis', () => ({ cacheGet: async () => null, cacheSet: async () => {} }))
vi.mock('../../utils/logger', () => ({ logger: { warn: () => {}, error: () => {}, info: () => {} } }))
vi.mock('axios', () => ({ default: axiosMock, AxiosError: class {} }))

import { BillsService } from './BillsService'

const catalogue = {
  data: { status: 'success', data: [
    { biller_code: 'BIL099', item_code: 'AT099', name: 'MTN VTU', biller_name: 'MTN', label_name: 'Mobile Number', amount: 0, fee: 0 },
  ] },
}

describe('BillsService.pay', () => {
  beforeEach(() => {
    process.env.FLUTTERWAVE_SECRET_KEY = 'test'
    db.wallet.ngnBalance = new Decimal(1000)
    db.txs = []
    axiosMock.get.mockReset().mockResolvedValue(catalogue)
    axiosMock.post.mockReset()
  })

  const buy = (amount = 200) => new BillsService().pay({
    userId: 'u1', category: 'airtime', billerCode: 'BIL099', itemCode: 'AT099', customer: '08030000000', amount,
  })

  it('debits the wallet and completes on provider success', async () => {
    axiosMock.post.mockResolvedValue({ data: { status: 'success', data: { flw_ref: 'F1', tx_ref: 'T1' } } })
    const r = await buy(200)
    expect(r.status).toBe('COMPLETED')
    expect(db.wallet.ngnBalance.toNumber()).toBe(800)
    expect(db.txs[0].status).toBe('COMPLETED')
  })

  it('refunds when the provider clearly rejects the purchase', async () => {
    axiosMock.post.mockRejectedValue({ message: 'bad', response: { status: 400, data: { message: 'Invalid number' } } })
    await expect(buy(200)).rejects.toMatchObject({ code: 'BILL_FAILED' })
    expect(db.wallet.ngnBalance.toNumber()).toBe(1000)
    expect(db.txs[0].status).toBe('FAILED')
    expect(db.txs.some(t => t.source === 'REVERSAL' && t.type === 'CREDIT')).toBe(true)
  })

  it('keeps the money held and reports PENDING when the outcome is unknown', async () => {
    axiosMock.post.mockRejectedValue({ message: 'timeout of 45000ms exceeded' })
    const r = await buy(200)
    expect(r.status).toBe('PENDING')
    expect(db.wallet.ngnBalance.toNumber()).toBe(800)   // not refunded
    expect(db.txs).toHaveLength(1)
    expect(db.txs[0].status).toBe('PENDING')
  })

  it('refuses without calling the provider when the balance is too low', async () => {
    await expect(buy(5000)).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' })
    expect(axiosMock.post).not.toHaveBeenCalled()
    expect(db.wallet.ngnBalance.toNumber()).toBe(1000)
  })

  it('rejects amounts outside the allowed range', async () => {
    await expect(buy(10)).rejects.toMatchObject({ code: 'INVALID_AMOUNT' })
    expect(db.wallet.ngnBalance.toNumber()).toBe(1000)
  })

  it('rejects a product that is not in the provider catalogue', async () => {
    await expect(new BillsService().pay({
      userId: 'u1', category: 'airtime', billerCode: 'NOPE', itemCode: 'X', customer: '08030000000', amount: 200,
    })).rejects.toMatchObject({ code: 'ITEM_NOT_FOUND' })
  })
})
