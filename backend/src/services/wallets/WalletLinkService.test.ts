import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Wallet } from 'ethers'

const { cache, redisMock, db, tx } = vi.hoisted(() => {
  const cache = new Map<string, string>()
  const db = { rows: [] as any[] }
  const redisMock = {
    set: vi.fn(async (key: string, value: string) => { cache.set(key, value); return 'OK' }),
    get: vi.fn(async (key: string) => cache.get(key) ?? null),
    getdel: vi.fn(async (key: string) => { const value = cache.get(key) ?? null; cache.delete(key); return value }),
  }
  const tx = {
    linkedWallet: {
      findUnique: vi.fn(async ({ where }: any) => db.rows.find(w => w.chain === where.chain_address.chain && w.address === where.chain_address.address) ?? null),
      findFirst: vi.fn(async ({ where }: any) => db.rows.find(w => w.userId === where.userId && (!where.id || w.id === where.id) && (!where.chain || w.chain === where.chain)) ?? null),
      create: vi.fn(async ({ data }: any) => { const row = { ...data, id: `link-${db.rows.length}`, createdAt: new Date() }; db.rows.push(row); return row }),
      update: vi.fn(async ({ where, data }: any) => { const row = db.rows.find(w => w.id === where.id); Object.assign(row, data); return row }),
      delete: vi.fn(async ({ where }: any) => { db.rows = db.rows.filter(w => w.id !== where.id) }),
    },
    user: { findFirst: vi.fn(async () => null), update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
  }
  return { cache, redisMock, db, tx }
})
vi.mock('../../config/redis', () => ({ redis: redisMock }))
vi.mock('../../config/database', () => ({ prisma: { $transaction: (callback: any) => callback(tx) } }))

import { WalletLinkService } from './WalletLinkService'
const service = new WalletLinkService()
const wallet = Wallet.createRandom()
const other = Wallet.createRandom()

beforeEach(() => {
  vi.clearAllMocks()
  cache.clear()
  db.rows = []
  tx.user.findFirst.mockResolvedValue(null)
})

describe('account wallet linking', () => {
  it('links only after a valid proof and refuses replay', async () => {
    const challenge = await service.challenge('user-1', 'metamask', wallet.address, 'https://hashpay.example')
    expect(challenge.message).toContain('https://hashpay.example')
    expect(challenge.message).toContain('Account: user-1')
    expect(db.rows).toHaveLength(0)
    const signature = await wallet.signMessage(challenge.message)
    const linked = await service.link('user-1', challenge.challengeId, signature)
    expect(linked).toMatchObject({ userId: 'user-1', address: wallet.address.toLowerCase(), chain: 'evm' })
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { evmAddress: wallet.address.toLowerCase() } })
    await expect(service.link('user-1', challenge.challengeId, signature)).rejects.toThrow('expired')
    expect(db.rows).toHaveLength(1)
  })

  it('rejects a proof signed by a different wallet without saving a link', async () => {
    const challenge = await service.challenge('user-1', 'metamask', wallet.address, 'https://hashpay.example')
    await expect(service.link('user-1', challenge.challengeId, await other.signMessage(challenge.message))).rejects.toThrow('ownership')
    expect(tx.linkedWallet.create).not.toHaveBeenCalled()
    expect(cache.has(`wallet-link:${challenge.challengeId}`)).toBe(true)
  })

  it('rejects a challenge from another HashPay account', async () => {
    const challenge = await service.challenge('user-1', 'metamask', wallet.address, 'https://hashpay.example')
    await expect(service.link('user-2', challenge.challengeId, await wallet.signMessage(challenge.message))).rejects.toThrow('Invalid wallet request')
    expect(tx.linkedWallet.create).not.toHaveBeenCalled()
  })

  it('rejects expired challenges even if a cache entry remains', async () => {
    const challenge = await service.challenge('user-1', 'metamask', wallet.address, 'https://hashpay.example')
    const key = `wallet-link:${challenge.challengeId}`
    const stored = JSON.parse(cache.get(key)!)
    stored.expiresAt = new Date(Date.now() - 1000).toISOString()
    cache.set(key, JSON.stringify(stored))
    await expect(service.link('user-1', challenge.challengeId, await wallet.signMessage(challenge.message))).rejects.toThrow('Invalid wallet request')
    expect(tx.linkedWallet.create).not.toHaveBeenCalled()
  })

  it('only accepts one of two concurrent uses of the same challenge', async () => {
    const challenge = await service.challenge('user-1', 'metamask', wallet.address, 'https://hashpay.example')
    const signature = await wallet.signMessage(challenge.message)
    const results = await Promise.allSettled([
      service.link('user-1', challenge.challengeId, signature), service.link('user-1', challenge.challengeId, signature),
    ])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(db.rows).toHaveLength(1)
  })

  it('prevents linking an address owned by another account', async () => {
    db.rows.push({ id: 'existing', chain: 'evm', address: wallet.address.toLowerCase(), userId: 'other-user' })
    const challenge = await service.challenge('user-1', 'metamask', wallet.address, 'https://hashpay.example')
    await expect(service.link('user-1', challenge.challengeId, await wallet.signMessage(challenge.message))).rejects.toThrow('another account')
    expect(tx.linkedWallet.create).not.toHaveBeenCalled()
    expect(tx.user.update).not.toHaveBeenCalled()
  })

  it('requires re-verification of a legacy address and respects its existing owner', async () => {
    tx.user.findFirst.mockResolvedValueOnce({ id: 'legacy-owner' } as any)
    const challenge = await service.challenge('user-1', 'metamask', wallet.address, 'https://hashpay.example')
    await expect(service.link('user-1', challenge.challengeId, await wallet.signMessage(challenge.message))).rejects.toThrow('another account')
    expect(tx.linkedWallet.create).not.toHaveBeenCalled()
  })

  it('does not allow removing another account’s link', async () => {
    db.rows.push({ id: 'existing', userId: 'other-user', chain: 'evm', address: wallet.address.toLowerCase() })
    await expect(service.unlink('user-1', 'existing')).rejects.toThrow('not found')
    expect(tx.linkedWallet.delete).not.toHaveBeenCalled()
  })

  it('removes a verified link and clears its settlement address', async () => {
    db.rows.push({ id: 'existing', userId: 'user-1', chain: 'evm', address: wallet.address.toLowerCase() })
    await service.unlink('user-1', 'existing')
    expect(db.rows).toHaveLength(0)
    expect(tx.user.updateMany).toHaveBeenCalledWith({ where: { id: 'user-1', evmAddress: wallet.address.toLowerCase() }, data: { evmAddress: null } })
  })

  it('fails closed when challenge storage is unavailable', async () => {
    redisMock.set.mockRejectedValueOnce(new Error('Redis unavailable'))
    await expect(service.challenge('user-1', 'metamask', wallet.address, 'https://hashpay.example')).rejects.toThrow('temporarily unavailable')
    expect(tx.linkedWallet.create).not.toHaveBeenCalled()
  })
})
