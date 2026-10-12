import express from 'express'
import { createHash } from 'node:crypto'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  findUser: vi.fn(), createToken: vi.fn(), deleteMany: vi.fn(), deleteToken: vi.fn(),
  findToken: vi.fn(), updateMany: vi.fn(), updateUser: vi.fn(),
  sendReset: vi.fn(), sendChanged: vi.fn(),
}))
vi.mock('../config/database', () => {
  const tx = { passwordResetToken: { updateMany: m.updateMany, deleteMany: m.deleteMany }, user: { update: m.updateUser } }
  return { prisma: {
    user: { findUnique: m.findUser },
    passwordResetToken: { create: m.createToken, deleteMany: m.deleteMany, delete: m.deleteToken, findUnique: m.findToken },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  } }
})
vi.mock('../services/email/EmailService', () => ({
  sendWelcomeEmail: vi.fn(), sendPasswordResetEmail: m.sendReset, sendPasswordChangedEmail: m.sendChanged,
}))
vi.mock('../services/wallets/WalletLinkService', () => ({ WalletLinkService: class {} }))
vi.mock('../services/wallets/WalletBalanceService', () => ({ WalletBalanceService: class {}, balanceNetworks: [] }))
vi.mock('../services/wallets/WalletProof', () => ({ walletProviders: [] }))

import { authRouter } from './auth'
import { errorHandler } from '../middleware/errorHandler'

let server: Server; let url: string
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use('/auth', authRouter); app.use(errorHandler)
  server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r))
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}/auth`
})
afterAll(() => new Promise<void>(r => server.close(() => r())))
beforeEach(() => { vi.clearAllMocks(); m.sendReset.mockResolvedValue(true) })

const post = (path: string, body: unknown) => fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const settle = () => new Promise(r => setTimeout(r, 30))
const sha = (v: string) => createHash('sha256').update(v).digest('hex')

// The forgot-password IP limiter allows 5 requests per window and this file shares one process,
// so these tests use at most 4 forgot-password requests in total.
describe('POST /auth/forgot-password', () => {
  it('returns the same 202 body for unknown and known emails, and only sends to real users', async () => {
    m.findUser.mockResolvedValueOnce(null)
    const missing = await post('/forgot-password', { email: 'nobody@example.com' })
    m.findUser.mockResolvedValueOnce({ id: 'u1', email: 'real@example.com' })
    m.createToken.mockResolvedValue({ id: 't1' })
    const real = await post('/forgot-password', { email: 'real@example.com' })
    await settle()
    expect(missing.status).toBe(202); expect(real.status).toBe(202)
    expect(await missing.json()).toEqual(await real.json())
    expect(m.sendReset).toHaveBeenCalledTimes(1)
  })

  it('stores only the token hash with a 20 minute expiry and links to it', async () => {
    m.findUser.mockResolvedValueOnce({ id: 'u2', email: 'two@example.com' })
    m.createToken.mockResolvedValue({ id: 't2' })
    const before = Date.now()
    await post('/forgot-password', { email: 'two@example.com' })
    await settle()
    const data = m.createToken.mock.calls[0][0].data
    const link: string = m.sendReset.mock.calls[0][1]
    const token = new URL(link).searchParams.get('token')!
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(data.tokenHash).toBe(sha(token)); expect(data.tokenHash).not.toBe(token)
    expect(data.expiresAt.getTime() - before).toBeGreaterThan(19 * 60_000)
    expect(data.expiresAt.getTime() - before).toBeLessThanOrEqual(20 * 60_000 + 2000)
  })

  it('keeps older links and discards the new token when delivery fails', async () => {
    m.findUser.mockResolvedValueOnce({ id: 'u3', email: 'three@example.com' })
    m.createToken.mockResolvedValue({ id: 't3' })
    m.sendReset.mockResolvedValue(false)
    await post('/forgot-password', { email: 'three@example.com' })
    await settle()
    expect(m.deleteToken).toHaveBeenCalledWith({ where: { id: 't3' } })
    expect(m.deleteMany).not.toHaveBeenCalled()
  })

  it('retires older links once the new one is sent', async () => {
    m.findUser.mockResolvedValueOnce({ id: 'u4', email: 'four@example.com' })
    m.createToken.mockResolvedValue({ id: 't4' })
    await post('/forgot-password', { email: 'four@example.com' })
    await settle()
    expect(m.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u4', id: { not: 't4' } } })
  })
})

describe('POST /auth/reset-password', () => {
  const token = 'a'.repeat(64)
  const record = (over = {}) => ({ userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() + 60_000), user: { id: 'u1', email: 'real@example.com' }, ...over })

  it('rejects malformed tokens and short passwords', async () => {
    expect((await post('/reset-password', { token: 'short', password: 'longenough1' })).status).toBe(422)
    expect((await post('/reset-password', { token, password: 'short' })).status).toBe(422)
    expect(m.findToken).not.toHaveBeenCalled()
  })

  it('rejects unknown, used and expired tokens with one generic error', async () => {
    for (const rec of [null, record({ usedAt: new Date() }), record({ expiresAt: new Date(Date.now() - 1000) })]) {
      m.findToken.mockResolvedValueOnce(rec)
      const res = await post('/reset-password', { token, password: 'longenough1' })
      expect(res.status).toBe(400)
      expect(JSON.stringify(await res.json())).toMatch(/invalid or has expired/)
    }
    expect(m.updateUser).not.toHaveBeenCalled()
  })

  it('changes the password once and emails the user', async () => {
    m.findToken.mockResolvedValueOnce(record()); m.updateMany.mockResolvedValueOnce({ count: 1 })
    const res = await post('/reset-password', { token, password: 'longenough1' })
    expect(res.status).toBe(200)
    expect(m.updateUser).toHaveBeenCalledTimes(1)
    expect(m.updateUser.mock.calls[0][0].data.passwordHash).toMatch(/^\$2[aby]\$/)
    expect(m.sendChanged).toHaveBeenCalledWith('real@example.com')
  })

  it('does not change the password when another request already claimed the token', async () => {
    m.findToken.mockResolvedValueOnce(record()); m.updateMany.mockResolvedValueOnce({ count: 0 })
    const res = await post('/reset-password', { token, password: 'longenough1' })
    expect(res.status).toBe(400)
    expect(m.updateUser).not.toHaveBeenCalled(); expect(m.sendChanged).not.toHaveBeenCalled()
  })
})
