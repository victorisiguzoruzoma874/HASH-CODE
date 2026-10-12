import { logger } from '../../utils/logger'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

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
  attachments?: Array<{
    filename: string
    content: string
    content_type: string
    content_id: string
  }>
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
        attachments: msg.attachments,
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

export async function sendWelcomeEmail(to: string, fullName: string, accountNumber: string | null | undefined): Promise<boolean> {
  try {
    // This path works from both src/services/email and dist/services/email.
    // Docker copies assets alongside dist, so the logo travels with every email.
    let logo: Buffer | undefined
    try {
      logo = await readFile(resolve(__dirname, '../../../assets/email/hashpay-logo.png'))
    } catch {
      // Keep the welcome message usable if a deployment omits the image asset.
      logger.warn('Welcome logo unavailable; sending the text branding instead')
    }
    const dashboardUrl = new URL('/dashboard', process.env.FRONTEND_URL ?? 'http://localhost:5173').href
    const paragraph = 'margin:0 0 20px;font-size:16px;line-height:26px;'
    const acct = accountNumber
      ? `<p style="${paragraph}">Your HashPay account number is<br><strong style="font-size:20px;line-height:32px;letter-spacing:1px;word-break:break-word;">${escapeHtml(accountNumber)}</strong></p>`
      : ''
    return await sendEmail({
      to,
      subject: "You're in. Welcome to HashPay.",
      html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to HashPay</title></head>
<body style="margin:0;padding:0;background:#ffffff;color:#182330;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Your account is ready. Make yourself at home.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;"><tr><td align="center" style="padding:32px 24px;">
<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#182330;overflow-wrap:break-word;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;"><tr>
${logo ? '<td style="padding:0 14px 0 0;"><img src="cid:hashpay-welcome-logo" width="75" height="50" alt="HashPay logo" style="display:block;width:75px;height:50px;border:0;"></td>' : ''}
<td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:19px;line-height:26px;font-weight:bold;color:#182330;">HashPay</td>
</tr></table>
<p style="${paragraph}">Welcome, ${escapeHtml(fullName)}.</p>
<p style="${paragraph}">You just joined HashPay. We're glad you're here.</p>
<p style="${paragraph}">Your account is ready, and your dashboard is a good place to start. Take a look around, get to know your wallet, and settle in.</p>
${acct}
<p style="${paragraph}">No need to figure everything out today. One small first step is plenty.</p>
<p style="${paragraph}"><a href="${escapeHtml(dashboardUrl)}" style="color:#087cb5;text-decoration:underline;">Open your HashPay dashboard &rarr;</a></p>
<p style="${paragraph}">Thanks for choosing us.</p>
<p style="margin:0;font-size:16px;line-height:26px;">&mdash;<br>The HashPay team</p>
<p style="margin:32px 0 0;font-size:12px;line-height:19px;color:#677482;">You're receiving this welcome email because you created a HashPay account.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`,
      text: [
        `Welcome, ${fullName}.`,
        "You just joined HashPay. We're glad you're here.",
        'Your account is ready, and your dashboard is a good place to start. Take a look around, get to know your wallet, and settle in.',
        accountNumber ? `Your HashPay account number is\n${accountNumber}` : '',
        'No need to figure everything out today. One small first step is plenty.',
        `Open your HashPay dashboard: ${dashboardUrl}`,
        'Thanks for choosing us.',
        '—\nThe HashPay team',
        "You're receiving this welcome email because you created a HashPay account.",
      ].filter(Boolean).join('\n\n'),
      attachments: logo ? [{
        filename: 'hashpay-logo.png',
        content: logo.toString('base64'),
        content_type: 'image/png',
        content_id: 'hashpay-welcome-logo',
      }] : undefined,
    })
  } catch (err) {
    logger.error('Welcome email could not be prepared', { error: err instanceof Error ? err.message : String(err) })
    return false
  }
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
