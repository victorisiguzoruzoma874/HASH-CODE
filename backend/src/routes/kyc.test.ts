import express from 'express'
import jwt from 'jsonwebtoken'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ decide: vi.fn(), status: vi.fn(), tier1: vi.fn() }))
vi.mock('../config/database', () => ({
  prisma: { kycSubmission: { findMany: vi.fn().mockResolvedValue([]) }, kycDocument: {}, kycAuditLog: {} },
}))
vi.mock('../services/kyc/KycSubmissionService', () => ({
  KycSubmissionService: class { decide = m.decide; status = m.status; submitTier1 = m.tier1; submitTier2 = vi.fn(); submitTier3 = vi.fn() },
}))
vi.mock('../services/kyc/DocumentStore', () => ({ documentStore: { get: vi.fn() } }))

import { kycRouter } from './kyc'
import { errorHandler } from '../middleware/errorHandler'

let server: Server; let url: string
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use('/kyc', kycRouter); app.use(errorHandler)
  server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r))
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}/kyc`
})
afterAll(() => new Promise<void>(r => server.close(() => r())))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('JWT_SECRET', 'test-secret')
  m.decide.mockResolvedValue(true)
})

const token = (role = 'USER') => jwt.sign({ sub: 'u1', address: '', role }, 'test-secret')
const send = (path: string, body?: unknown, tok?: string, method = 'POST') =>
  fetch(`${url}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })

describe('user endpoints', () => {
  it('has no unauthenticated provider webhook any more', async () => {
    expect((await send('/webhook', { job_id: 'job1' })).status).toBe(404)
    expect(m.decide).not.toHaveBeenCalled()
  })

  it('require a login', async () => {
    expect((await send('/status', undefined, undefined, 'GET')).status).toBe(401)
    expect((await send('/tier1', {})).status).toBe(401)
  })

  it('validate Tier 1 input before touching the service', async () => {
    const res = await send('/tier1', { firstName: 'Ada', lastName: 'Obi', dateOfBirth: '1990-01-01', phone: '+2348012345678', idType: 'BVN', idNumber: '123', country: 'NG' }, token())
    expect(res.status).toBe(422)
    expect(m.tier1).not.toHaveBeenCalled()
  })

  it('accepts a valid Tier 1 submission with 202', async () => {
    m.tier1.mockResolvedValue({ submissionId: 's1', status: 'PENDING' })
    const res = await send('/tier1', { firstName: 'Ada', lastName: 'Obi', dateOfBirth: '1990-01-01', phone: '+2348012345678', idType: 'BVN', idNumber: '12345678901', country: 'NG' }, token())
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ submissionId: 's1', status: 'PENDING' })
  })
})

describe('admin review', () => {
  const id = '11111111-1111-4111-8111-111111111111'

  it('is closed to normal users', async () => {
    expect((await send(`/admin/submissions/${id}/approve`, {}, token('USER'))).status).toBe(403)
    expect(m.decide).not.toHaveBeenCalled()
  })

  it('lets an admin approve, recording who did it', async () => {
    expect((await send(`/admin/submissions/${id}/approve`, {}, token('ADMIN'))).status).toBe(200)
    expect(m.decide).toHaveBeenCalledWith(id, 'APPROVED', { actorId: 'u1', note: undefined })
  })

  it('requires a reason to reject', async () => {
    expect((await send(`/admin/submissions/${id}/reject`, {}, token('ADMIN'))).status).toBe(422)
    expect(m.decide).not.toHaveBeenCalled()
  })

  it('returns 409 when the submission was already decided', async () => {
    m.decide.mockResolvedValue(false)
    expect((await send(`/admin/submissions/${id}/approve`, {}, token('ADMIN'))).status).toBe(409)
  })
})
