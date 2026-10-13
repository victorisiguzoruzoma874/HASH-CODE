import express from 'express'
import jwt from 'jsonwebtoken'
import { createHmac } from 'node:crypto'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ decide: vi.fn(), status: vi.fn(), tier1: vi.fn(), findByJob: vi.fn() }))
vi.mock('../config/database', () => ({
  prisma: { kycSubmission: { findUnique: m.findByJob, findMany: vi.fn().mockResolvedValue([]) }, kycDocument: {}, kycAuditLog: {} },
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
  vi.stubEnv('JWT_SECRET', 'test-secret'); vi.stubEnv('SMILE_ID_PARTNER_ID', 'p1'); vi.stubEnv('SMILE_ID_API_KEY', 'k1')
  m.decide.mockResolvedValue(true)
})

const token = (role = 'USER') => jwt.sign({ sub: 'u1', address: '', role }, 'test-secret')
const send = (path: string, body?: unknown, tok?: string, method = 'POST') =>
  fetch(`${url}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
const sign = (timestamp: string) => createHmac('sha256', 'k1').update(timestamp + 'p1' + 'sid_request').digest('base64')
const hook = (over: Record<string, unknown> = {}) => {
  const timestamp = new Date().toISOString()
  return { job_id: 'job1', result_code: '0810', timestamp, signature: sign(timestamp), ...over }
}

describe('POST /kyc/webhook', () => {
  it('rejects a request with no signature and changes nothing', async () => {
    const res = await send('/webhook', { job_id: 'job1', result_code: '0810' })
    expect(res.status).toBe(401)
    expect(m.decide).not.toHaveBeenCalled()
  })

  it('rejects a wrong signature', async () => {
    expect((await send('/webhook', hook({ signature: 'AAAA' }))).status).toBe(401)
    expect(m.decide).not.toHaveBeenCalled()
  })

  it('rejects a replayed (stale) but correctly signed request', async () => {
    const old = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect((await send('/webhook', hook({ timestamp: old, signature: sign(old) }))).status).toBe(401)
    expect(m.decide).not.toHaveBeenCalled()
  })

  it('fails closed when the provider keys are not configured', async () => {
    vi.stubEnv('SMILE_ID_API_KEY', '')
    expect((await send('/webhook', hook())).status).toBe(401)
  })

  it('approves a known job on the success code', async () => {
    m.findByJob.mockResolvedValue({ id: 'sub1' })
    expect((await send('/webhook', hook())).status).toBe(200)
    expect(m.decide).toHaveBeenCalledWith('sub1', 'APPROVED', { actorId: 'smile-id', note: undefined })
  })

  it('rejects the submission on any other result code', async () => {
    m.findByJob.mockResolvedValue({ id: 'sub1' })
    await send('/webhook', hook({ result_code: '1013', result_text: 'No match' }))
    expect(m.decide).toHaveBeenCalledWith('sub1', 'REJECTED', { actorId: 'smile-id', note: 'No match' })
  })

  it('acknowledges an unknown job without changing anything', async () => {
    m.findByJob.mockResolvedValue(null)
    expect((await send('/webhook', hook({ job_id: 'nope' }))).status).toBe(200)
    expect(m.decide).not.toHaveBeenCalled()
  })
})

describe('user endpoints', () => {
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
