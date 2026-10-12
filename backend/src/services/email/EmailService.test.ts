import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendEmail, sendWelcomeEmail, sendPasswordResetEmail } from './EmailService'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as fileSystem from 'node:fs/promises'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, readFile: vi.fn(actual.readFile) }
})

const fetchMock = vi.fn()
const msg = { to: 'a@example.com', subject: 'Hi', html: '<p>x</p>', text: 'x' }

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('EMAIL_FROM', 'HashPay <no-reply@example.com>')
  fetchMock.mockReset()
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

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
  it('still sends a usable welcome email when the logo file is missing', async () => {
    vi.mocked(fileSystem.readFile).mockRejectedValueOnce(new Error('Missing asset'))
    fetchMock.mockResolvedValue({ ok: true })
    expect(await sendWelcomeEmail('a@example.com', 'Victor', '1234567890')).toBe(true)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.attachments).toBeUndefined()
    expect(body.html).not.toContain('cid:')
    expect(body.html).toContain('HashPay</td>')
    expect(body.text).toContain('1234567890')
  })

  it('embeds the supplied logo and links HTML and plain text to the configured dashboard', async () => {
    vi.stubEnv('FRONTEND_URL', 'https://hashpay.example/')
    fetchMock.mockResolvedValue({ ok: true })
    expect(await sendWelcomeEmail('a@example.com', 'Victor', '1234567890')).toBe(true)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.html).toContain('href="https://hashpay.example/dashboard"')
    expect(body.text).toContain('https://hashpay.example/dashboard')
    expect(body.html).toContain('1234567890')
    expect(body.text).toContain('1234567890')
    expect(body.attachments).toHaveLength(1)
    const attachment = body.attachments[0]
    expect(body.html).toContain(`src="cid:${attachment.content_id}"`)
    expect(attachment.content_type).toBe('image/png')
    expect(Buffer.from(attachment.content, 'base64')).toEqual(readFileSync(resolve(__dirname, '../../../assets/email/hashpay-logo.png')))
  })

  it('omits the account-number paragraph when no account number is available', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    await sendWelcomeEmail('a@example.com', 'Victor', null)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.html).not.toContain('account number')
    expect(body.text).not.toContain('account number')
  })

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
