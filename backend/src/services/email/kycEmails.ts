import { escapeHtml, sendEmail } from './EmailService'

// Short, plain messages. They never include ID numbers, documents or other personal data.

function wrap(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#182330;line-height:26px">
<h2 style="font-size:18px;margin:0 0 16px">${escapeHtml(title)}</h2>${bodyHtml}
<p style="margin:24px 0 0;font-size:12px;color:#677482">HashPay</p></div>`
}

export const sendKycReceivedEmail = (to: string, tier: number) => sendEmail({
  to, subject: 'We received your verification',
  html: wrap('Verification received', `<p>We received your Tier ${tier} verification and will review it shortly. We will email you when it is done.</p>`),
  text: `We received your Tier ${tier} verification and will review it shortly. We will email you when it is done.`,
})

export const sendKycApprovedEmail = (to: string, tier: number) => sendEmail({
  to, subject: `You are now verified at Tier ${tier}`,
  html: wrap(`Tier ${tier} approved`, `<p>Your Tier ${tier} verification was approved. Your new limits are now active in your dashboard.</p>`),
  text: `Your Tier ${tier} verification was approved. Your new limits are now active in your dashboard.`,
})

export const sendKycRejectedEmail = (to: string, tier: number, reason: string) => sendEmail({
  to, subject: 'Your verification was not approved',
  html: wrap('Verification not approved', `<p>We could not approve your Tier ${tier} verification.</p><p><strong>Reason:</strong> ${escapeHtml(reason)}</p><p>You can submit again from the Verification page in your dashboard.</p>`),
  text: `We could not approve your Tier ${tier} verification. Reason: ${reason}. You can submit again from the Verification page in your dashboard.`,
})

export const sendKycMoreInfoEmail = (to: string, tier: number, note: string) => sendEmail({
  to, subject: 'More information needed for your verification',
  html: wrap('More information needed', `<p>We need a little more to finish your Tier ${tier} verification.</p><p>${escapeHtml(note)}</p><p>Open the Verification page in your dashboard to continue.</p>`),
  text: `We need a little more to finish your Tier ${tier} verification. ${note} Open the Verification page in your dashboard to continue.`,
})
