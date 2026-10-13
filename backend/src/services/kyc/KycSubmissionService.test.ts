import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  userFind: vi.fn(), userUpdate: vi.fn(),
  subFind: vi.fn(), subCreate: vi.fn(), subUpdate: vi.fn(), subDelete: vi.fn(), subUpdateMany: vi.fn(), subFindUniqueOrThrow: vi.fn(),
  audit: vi.fn(), sendReceived: vi.fn(), sendApproved: vi.fn(), sendRejected: vi.fn(), sendMore: vi.fn(),
}))
vi.mock('../../config/database', () => {
  const tx = {
    kycSubmission: { updateMany: m.subUpdateMany, findUniqueOrThrow: m.subFindUniqueOrThrow },
    user: { update: m.userUpdate }, kycAuditLog: { create: m.audit },
  }
  return { prisma: {
    user: { findUnique: m.userFind, update: m.userUpdate },
    kycSubmission: { findFirst: m.subFind, create: m.subCreate, update: m.subUpdate, delete: m.subDelete },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  } }
})
vi.mock('../email/kycEmails', () => ({
  sendKycReceivedEmail: m.sendReceived, sendKycApprovedEmail: m.sendApproved,
  sendKycRejectedEmail: m.sendRejected, sendKycMoreInfoEmail: m.sendMore,
}))
vi.mock('../../utils/crypto', () => ({ encrypt: (s: string) => `enc:${Buffer.from(s).toString('hex')}`, decrypt: (s: string) => s }))

import { KycSubmissionService } from './KycSubmissionService'
import { parseDocument } from './DocumentStore'

const provider = { verifyIdentity: vi.fn() }
const store = { put: vi.fn(), get: vi.fn() }
const svc = () => new KycSubmissionService(provider as any, store as any)

const tier1 = { firstName: 'Ada', lastName: 'Obi', dateOfBirth: '1990-01-01', phone: '+2348012345678', idType: 'BVN' as const, idNumber: '12345678901', country: 'NG' }
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]).toString('base64')

beforeEach(() => {
  vi.clearAllMocks()
  m.userFind.mockResolvedValue({ kycTier: 0, email: 'ada@example.com' })
  m.subFind.mockResolvedValue(null)
  m.subCreate.mockResolvedValue({ id: 'sub1' })
  store.put.mockResolvedValue('11111111-1111-1111-1111-111111111111')
  m.subDelete.mockResolvedValue({})
})

describe('submitTier1', () => {
  const decided = (tier = 1) => {
    m.subUpdateMany.mockResolvedValue({ count: 1 })
    m.subFindUniqueOrThrow.mockResolvedValue({ id: 'sub1', userId: 'u1', tier, user: { email: 'ada@example.com', kycTier: 0 } })
  }

  it('encrypts the sensitive fields and never stores them in plain text', async () => {
    decided(); provider.verifyIdentity.mockResolvedValue({ approved: true })
    await svc().submitTier1('u1', tier1)
    const stored = JSON.stringify(m.subCreate.mock.calls[0][0])
    expect(stored).toContain('enc:')
    expect(stored).not.toContain('12345678901')
  })

  it('approves immediately when the provider confirms the identity', async () => {
    decided(); provider.verifyIdentity.mockResolvedValue({ approved: true })
    expect(await svc().submitTier1('u1', tier1)).toEqual({ submissionId: 'sub1', status: 'APPROVED' })
    expect(m.userUpdate.mock.calls[0][0].data.kycTier).toBe(1)
    expect(m.sendApproved).toHaveBeenCalledWith('ada@example.com', 1)
  })

  it('rejects with the reason when the details do not match', async () => {
    decided(); provider.verifyIdentity.mockResolvedValue({ approved: false, reason: 'The name does not match the name registered to this ID.' })
    expect(await svc().submitTier1('u1', tier1)).toEqual({ submissionId: 'sub1', status: 'REJECTED' })
    expect(m.subUpdateMany.mock.calls[0][0].data.rejectionReason).toContain('name does not match')
    expect(m.sendRejected).toHaveBeenCalled()
    expect(m.sendApproved).not.toHaveBeenCalled()
  })

  it('removes the submission and reports 502 when the provider is down, so the user is not stuck', async () => {
    provider.verifyIdentity.mockRejectedValue(new Error('boom'))
    await expect(svc().submitTier1('u1', tier1)).rejects.toMatchObject({ statusCode: 502, code: 'KYC_PROVIDER_UNAVAILABLE' })
    expect(m.subDelete).toHaveBeenCalledWith({ where: { id: 'sub1' } })
    expect(m.subUpdateMany).not.toHaveBeenCalled()
    expect(m.sendApproved).not.toHaveBeenCalled()
  })

  it('refuses when a submission is already under review', async () => {
    m.subFind.mockResolvedValueOnce({ id: 'old', status: 'PENDING' })
    await expect(svc().submitTier1('u1', tier1)).rejects.toMatchObject({ code: 'KYC_PENDING' })
    expect(provider.verifyIdentity).not.toHaveBeenCalled()
  })

  it('enforces a cooldown after a rejection', async () => {
    m.subFind.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 'REJECTED', createdAt: new Date() })
    await expect(svc().submitTier1('u1', tier1)).rejects.toMatchObject({ statusCode: 429, code: 'KYC_COOLDOWN' })
  })

  it('refuses a user who already has this tier or higher', async () => {
    m.userFind.mockResolvedValue({ kycTier: 1, email: 'a@b.c' })
    await expect(svc().submitTier1('u1', tier1)).rejects.toMatchObject({ code: 'KYC_ALREADY_VERIFIED' })
  })
})

describe('tier order', () => {
  it('does not let a Tier 0 user skip to Tier 2', async () => {
    await expect(svc().submitTier2('u1', { idType: 'NIN', idFrontBase64: jpeg, selfieBase64: jpeg })).rejects.toMatchObject({
      code: 'KYC_TIER_REQUIRED', details: { requiredTier: 1, currentTier: 0 },
    })
    expect(store.put).not.toHaveBeenCalled()
  })

  it('stores Tier 2 documents encrypted and queues them for review', async () => {
    m.userFind.mockResolvedValue({ kycTier: 1, email: 'ada@example.com' })
    await svc().submitTier2('u1', { idType: 'NIN', idFrontBase64: jpeg, selfieBase64: jpeg })
    expect(store.put).toHaveBeenCalledTimes(2)
    const data = m.subCreate.mock.calls[0][0].data
    expect(data.tier).toBe(2)
    expect(data.documents.create.map((d: any) => d.type)).toEqual(['ID_FRONT', 'SELFIE'])
    expect(JSON.stringify(data)).not.toContain(jpeg)
  })

  it('rejects a document that is not really an image, whatever its name says', async () => {
    m.userFind.mockResolvedValue({ kycTier: 1, email: 'ada@example.com' })
    const fake = Buffer.from('<html>not an image</html>'.repeat(10)).toString('base64')
    await expect(svc().submitTier2('u1', { idType: 'NIN', idFrontBase64: fake, selfieBase64: jpeg })).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' })
  })
})

describe('decide', () => {
  const sub = { id: 'sub1', userId: 'u1', tier: 2, user: { email: 'ada@example.com', kycTier: 1 } }

  it('approves once: sets the tier, writes an audit row and sends one email', async () => {
    m.subUpdateMany.mockResolvedValue({ count: 1 }); m.subFindUniqueOrThrow.mockResolvedValue(sub)
    expect(await svc().decide('sub1', 'APPROVED', { actorId: 'admin1' })).toBe(true)
    expect(m.userUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { kycTier: 2, kycStatus: 'APPROVED', kycLevel: 'BASIC' } })
    expect(m.audit).toHaveBeenCalledTimes(1)
    expect(m.sendApproved).toHaveBeenCalledWith('ada@example.com', 2)
  })

  it('is idempotent: a second decision on the same submission changes nothing and sends nothing', async () => {
    m.subUpdateMany.mockResolvedValue({ count: 0 })
    expect(await svc().decide('sub1', 'APPROVED', { actorId: 'dojah' })).toBe(false)
    expect(m.userUpdate).not.toHaveBeenCalled(); expect(m.sendApproved).not.toHaveBeenCalled()
  })

  it('never lowers a tier the user already has', async () => {
    m.subUpdateMany.mockResolvedValue({ count: 1 }); m.subFindUniqueOrThrow.mockResolvedValue({ ...sub, tier: 1, user: { email: 'a@b.c', kycTier: 3 } })
    await svc().decide('sub1', 'APPROVED', { actorId: 'dojah' })
    expect(m.userUpdate.mock.calls[0][0].data.kycTier).toBe(3)
  })

  it('rejects with the reason and does not change the tier', async () => {
    m.subUpdateMany.mockResolvedValue({ count: 1 }); m.subFindUniqueOrThrow.mockResolvedValue(sub)
    await svc().decide('sub1', 'REJECTED', { actorId: 'admin1', note: 'Blurry photo' })
    expect(m.userUpdate.mock.calls[0][0].data).toEqual({ kycStatus: 'REJECTED' })
    expect(m.sendRejected).toHaveBeenCalledWith('ada@example.com', 2, 'Blurry photo')
  })
})

describe('parseDocument', () => {
  it('accepts jpeg and png, rejects pdf unless allowed, and rejects oversize and bad base64', () => {
    expect(parseDocument(jpeg).mime).toBe('image/jpeg')
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]).toString('base64')
    expect(parseDocument(png).mime).toBe('image/png')
    const pdf = Buffer.from('%PDF-1.4' + ' '.repeat(100)).toString('base64')
    expect(() => parseDocument(pdf)).toThrow()
    expect(parseDocument(pdf, true).mime).toBe('application/pdf')
    expect(() => parseDocument('not base64!!')).toThrow()
    expect(() => parseDocument(Buffer.alloc(3 * 1024 * 1024 + 1, 0xff).toString('base64'))).toThrow()
  })
})
