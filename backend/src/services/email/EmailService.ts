import { logger } from '../../utils/logger'

/**
 * EmailService
 * ────────────
 * Sends transactional email through Resend's REST API.
 *
 * Email is never allowed to break the action that triggered it, so send()
 * resolves to true/false and never throws. If RESEND_API_KEY is not set the
 * message is skipped and logged.
 */

const RESEND_URL = 'https://api.resend.com/emails'

export interface EmailMessage {
  to:      string
  subject: string
  html:    string
  text?:   string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    logger.warn('Email skipped: RESEND_API_KEY is not set', { subject: msg.subject })
    return false
  }
  try {
    const res = await fetch(RESEND_URL, {
      method:  'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    process.env.EMAIL_FROM ?? 'HashPay <onboarding@resend.dev>',
        to:      [msg.to],
        subject: msg.subject,
        html:    msg.html,
        text:    msg.text,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      logger.error('Resend rejected email', { status: res.status, body: (await res.text()).slice(0, 300), subject: msg.subject })
      return false
    }
    return true
  } catch (err) {
    logger.error('Email send failed', { error: err instanceof Error ? err.message : String(err), subject: msg.subject })
    return false
  }
}

function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Helvetica,Arial,sans-serif;background:#EDE9E3;padding:24px">
<div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #1a1a1a;padding:24px">
<h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(title)}</h2>${bodyHtml}
<p style="margin-top:24px;font-size:12px;color:#777">HashPay</p></div></div>`
}

export function sendWelcomeEmail(to: string, fullName: string, accountNumber: string | null | undefined): Promise<boolean> {
  const acct = accountNumber ? `<p>Your HashPay account number is <strong>${escapeHtml(accountNumber)}</strong>.</p>` : ''
  return sendEmail({
    to,
    subject: 'Welcome to HashPay',
    html: layout(`Welcome, ${fullName}`, `<p>Your account is ready.</p>${acct}`),
    text: `Welcome to HashPay, ${fullName}. Your account is ready.${accountNumber ? ` Account number: ${accountNumber}` : ''}`,
  })
}

export function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const url = escapeHtml(resetUrl)
  return sendEmail({
    to,
    subject: 'Reset your HashPay password',
    html: layout('Reset your password',
      `<p>Use the link below to choose a new password. It expires in 20 minutes and works once.</p>
<p><a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 16px;text-decoration:none">Reset password</a></p>
<p style="font-size:12px;color:#777">If you did not ask for this, ignore this email. Your password stays the same.</p>`),
    text: `Reset your HashPay password (expires in 20 minutes, works once): ${resetUrl}\nIf you did not ask for this, ignore this email.`,
  })
}

export function sendPasswordChangedEmail(to: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Your HashPay password was changed',
    html: layout('Password changed', '<p>Your password was just changed. If this was not you, contact support right away.</p>'),
    text: 'Your HashPay password was just changed. If this was not you, contact support right away.',
  })
}
