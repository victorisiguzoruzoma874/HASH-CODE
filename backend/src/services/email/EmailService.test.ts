import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendEmail, sendWelcomeEmail, sendPasswordResetEmail } from './EmailService'

const fetchMock = vi.fn()
const msg = { to: 'a@example.com', subject: 'Hi', html: '<p>x</p>', text: 'x' }

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('EMAIL_FROM', 'HashPay <no-reply@example.com>')
  fetchMock.mockReset()
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('sendEmail', () => {
  it('posts the message to Resend with the key and configured sender', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    expect(await sendEmail(msg)).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer re_test')
    expect(JSON.parse(init.body)).toEqual({ from: 'HashPay <no-reply@example.com>', to: ['a@example.com'], subject: 'Hi', html: '<p>x</p>', text: 'x' })
  })

  it('skips without calling Resend when the key is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect(await sendEmail(msg)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['403 rejection', () => fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'nope' })],
    ['500 error',     () => fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' })],
    ['network error', () => fetchMock.mockRejectedValue(new Error('offline'))],
  ])('returns false and never throws on %s', async (_name, arrange) => {
    arrange()
    await expect(sendEmail(msg)).resolves.toBe(false)
  })
})

describe('templates', () => {
  it('escapes a name exactly once in the welcome email', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    await sendWelcomeEmail('a@example.com', 'A&B <script>', '123')
    const { html } = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(html).toContain('Welcome, A&amp;B &lt;script&gt;')
    expect(html).not.toContain('&amp;amp;')
    expect(html).not.toContain('<script>')
  })

  it('puts the reset link in both html and text', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    await sendPasswordResetEmail('a@example.com', 'https://app.example.com/reset-password?token=abc&x=1')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toContain('https://app.example.com/reset-password?token=abc&x=1')
    expect(body.html).toContain('token=abc&amp;x=1')
  })
})
