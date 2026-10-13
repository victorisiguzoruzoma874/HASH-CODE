import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('axios', () => ({ default: { get: m.get, isAxiosError: (e: any) => !!e?.isAxiosError } }))
vi.mock('../../config/database', () => ({ prisma: {} }))
vi.mock('../../config/redis', () => ({ cacheGet: vi.fn(), cacheSet: vi.fn() }))

import { KycService, matchIdentity } from './KycService'

const person = { firstName: 'Ada', lastName: 'Obi', dateOfBirth: '1990-01-01', idType: 'BVN' as const, idNumber: '22222222222' }

describe('matchIdentity', () => {
  it('approves a matching name and date of birth, ignoring case, spacing and middle names', () => {
    expect(matchIdentity(person, { first_name: 'ADA', last_name: ' obi ', middle_name: 'Grace', date_of_birth: '1990-01-01' })).toEqual({ approved: true })
  })
  it('accepts first and last name swapped (common on Nigerian IDs)', () => {
    expect(matchIdentity(person, { first_name: 'Obi', last_name: 'Ada', date_of_birth: '1990-01-01' }).approved).toBe(true)
  })
  it('rejects a different name', () => {
    expect(matchIdentity(person, { first_name: 'John', last_name: 'Musa', date_of_birth: '1990-01-01' }).approved).toBe(false)
  })
  it('rejects a different date of birth', () => {
    expect(matchIdentity(person, { first_name: 'Ada', last_name: 'Obi', date_of_birth: '1991-01-01' }).approved).toBe(false)
  })
  it('rejects when the provider returns no usable data', () => {
    expect(matchIdentity(person, {}).approved).toBe(false)
  })
})

describe('KycService.verifyIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DOJAH_APP_ID', 'app1'); vi.stubEnv('DOJAH_SECRET_KEY', 'sec1'); vi.stubEnv('DOJAH_ENV', '')
  })

  it('throws when credentials are missing', async () => {
    vi.stubEnv('DOJAH_SECRET_KEY', '')
    await expect(new KycService().verifyIdentity(person)).rejects.toThrow('DOJAH_NOT_CONFIGURED')
    expect(m.get).not.toHaveBeenCalled()
  })

  it('calls the sandbox BVN endpoint with the raw secret (no Bearer) by default', async () => {
    m.get.mockResolvedValue({ data: { entity: { first_name: 'ADA', last_name: 'OBI', date_of_birth: '1990-01-01' } } })
    expect((await new KycService().verifyIdentity(person)).approved).toBe(true)
    const [url, cfg] = m.get.mock.calls[0]
    expect(url).toBe('https://sandbox.dojah.io/api/v1/kyc/bvn/full')
    expect(cfg.params).toEqual({ bvn: '22222222222' })
    expect(cfg.headers).toEqual({ Authorization: 'sec1', AppId: 'app1' })
  })

  it('uses the production host and NIN endpoint when asked', async () => {
    vi.stubEnv('DOJAH_ENV', 'production')
    m.get.mockResolvedValue({ data: { entity: { first_name: 'Ada', last_name: 'Obi', date_of_birth: '1990-01-01' } } })
    await new KycService().verifyIdentity({ ...person, idType: 'NIN', idNumber: '70123456789' })
    expect(m.get.mock.calls[0][0]).toBe('https://api.dojah.io/api/v1/kyc/nin')
    expect(m.get.mock.calls[0][1].params).toEqual({ nin: '70123456789' })
  })

  it('trims copied credential whitespace before sending headers', async () => {
    vi.stubEnv('DOJAH_APP_ID', ' app1 '); vi.stubEnv('DOJAH_SECRET_KEY', ' sec1\n')
    m.get.mockResolvedValue({ data: { entity: { first_name: 'Ada', last_name: 'Obi', date_of_birth: '1990-01-01' } } })
    await new KycService().verifyIdentity(person)
    expect(m.get.mock.calls[0][1].headers).toEqual({ AppId: 'app1', Authorization: 'sec1' })
  })

  it('identifies an invalid App ID without exposing the credential-bearing request', async () => {
    m.get.mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { error: 'Enter Correct AppId' } }, config: { headers: { Authorization: 'secret-value' } } })
    const error = await new KycService().verifyIdentity(person).catch(e => e)
    expect(error.message).toContain('DOJAH_INVALID_APP_ID')
    expect(error.config).toBeUndefined()
    expect(error.message).not.toContain('secret-value')
  })

  it('distinguishes other authentication failures from an invalid App ID', async () => {
    m.get.mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { error: 'Invalid key' } } })
    await expect(new KycService().verifyIdentity(person)).rejects.toThrow('DOJAH_AUTH_FAILED')
  })

  it('treats an unknown number (400/404) as a rejection, not an outage', async () => {
    m.get.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
    const r = await new KycService().verifyIdentity(person)
    expect(r.approved).toBe(false); expect(r.reason).toContain('not found')
  })

  it.each([401, 402, 424, 429, 500])('treats provider status %i as unavailable', async status => {
    m.get.mockRejectedValue({ isAxiosError: true, response: { status } })
    await expect(new KycService().verifyIdentity(person)).rejects.toBeDefined()
  })
})
