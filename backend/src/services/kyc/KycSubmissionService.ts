import { prisma } from '../../config/database'
import { AppError } from '../../middleware/errorHandler'
import { encrypt } from '../../utils/crypto'
import { logger } from '../../utils/logger'
import { KycService } from './KycService'
import { documentStore, parseDocument, type DocumentStore } from './DocumentStore'
import { KYC_TIERS, tierConfig } from './kycTiers'
import { getUsage } from './kycLimits'
import {
  sendKycApprovedEmail, sendKycMoreInfoEmail, sendKycReceivedEmail, sendKycRejectedEmail,
} from '../email/kycEmails'

export interface Tier1Input {
  firstName: string; lastName: string; dateOfBirth: string; phone: string
  idType: 'BVN' | 'NIN'; idNumber: string; country: string
}
export interface Tier2Input { idType: 'NIN' | 'PASSPORT' | 'DRIVERS_LICENSE'; idFrontBase64: string; idBackBase64?: string; selfieBase64: string }
export interface Tier3Input { address: string; sourceOfFunds: string; addressProofBase64: string }

const RESUBMIT_COOLDOWN_MS = 10 * 60 * 1000
const legacyLevel = (tier: number) => (tier >= 3 ? 'FULL' : tier >= 1 ? 'BASIC' : 'NONE') as 'NONE' | 'BASIC' | 'FULL'

export class KycSubmissionService {
  constructor(
    private readonly provider = new KycService(),
    private readonly store: DocumentStore = documentStore,
  ) {}

  /** Tier N can only be requested by a user who is exactly at Tier N-1, with nothing pending. */
  private async assertCanSubmit(userId: string, tier: 1 | 2 | 3) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { kycTier: true, email: true } })
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    if (user.kycTier >= tier) throw new AppError(409, `You are already verified at Tier ${user.kycTier}.`, 'KYC_ALREADY_VERIFIED')
    if (user.kycTier < tier - 1) throw new AppError(403, `Complete Tier ${tier - 1} first.`, 'KYC_TIER_REQUIRED', { requiredTier: tier - 1, currentTier: user.kycTier })

    const pending = await prisma.kycSubmission.findFirst({ where: { userId, status: 'PENDING' } })
    if (pending) throw new AppError(409, 'You already have a verification under review.', 'KYC_PENDING')

    const last = await prisma.kycSubmission.findFirst({ where: { userId, status: 'REJECTED' }, orderBy: { createdAt: 'desc' } })
    if (last && Date.now() - last.createdAt.getTime() < RESUBMIT_COOLDOWN_MS) {
      throw new AppError(429, 'Please wait a few minutes before submitting again.', 'KYC_COOLDOWN')
    }
    return user
  }

  async submitTier1(userId: string, input: Tier1Input) {
    await this.assertCanSubmit(userId, 1)
    const submission = await prisma.kycSubmission.create({
      data: { userId, tier: 1, encryptedData: encrypt(JSON.stringify(input)) },
    })
    let check
    try {
      check = await this.provider.verifyIdentity(input)
    } catch (err) {
      // Nothing was decided, so don't leave a stuck PENDING row that blocks the user.
      await prisma.kycSubmission.delete({ where: { id: submission.id } }).catch(() => undefined)
      logger.error('KYC provider call failed', { error: err instanceof Error ? err.message : String(err) })
      throw new AppError(502, 'Identity check is unavailable right now. Please try again later.', 'KYC_PROVIDER_UNAVAILABLE')
    }
    // Dojah answers immediately, so Tier 1 is decided here rather than by a callback.
    await this.decide(submission.id, check.approved ? 'APPROVED' : 'REJECTED', { actorId: 'dojah', note: check.reason })
    return { submissionId: submission.id, status: check.approved ? ('APPROVED' as const) : ('REJECTED' as const) }
  }

  async submitTier2(userId: string, input: Tier2Input) {
    const user = await this.assertCanSubmit(userId, 2)
    const front  = parseDocument(input.idFrontBase64)
    const back   = input.idBackBase64 ? parseDocument(input.idBackBase64) : null
    const selfie = parseDocument(input.selfieBase64)
    const docs = [
      { type: 'ID_FRONT' as const, ...front }, ...(back ? [{ type: 'ID_BACK' as const, ...back }] : []),
      { type: 'SELFIE' as const, ...selfie },
    ]
    return this.createManualSubmission(userId, user.email, 2, { idType: input.idType }, docs)
  }

  async submitTier3(userId: string, input: Tier3Input) {
    const user = await this.assertCanSubmit(userId, 3)
    const proof = parseDocument(input.addressProofBase64, true)
    return this.createManualSubmission(userId, user.email, 3,
      { address: input.address, sourceOfFunds: input.sourceOfFunds }, [{ type: 'ADDRESS_PROOF' as const, ...proof }])
  }

  /** Tiers 2 and 3 are reviewed by a person: documents are stored encrypted and queued. */
  private async createManualSubmission(
    userId: string, email: string, tier: 2 | 3, data: object,
    docs: Array<{ type: 'ID_FRONT' | 'ID_BACK' | 'SELFIE' | 'ADDRESS_PROOF'; bytes: Buffer; mime: string }>,
  ) {
    const stored = await Promise.all(docs.map(async d => ({ type: d.type, mimeType: d.mime, storageKey: await this.store.put(d.bytes) })))
    const submission = await prisma.kycSubmission.create({
      data: { userId, tier, encryptedData: encrypt(JSON.stringify(data)), documents: { create: stored } },
    })
    await prisma.user.update({ where: { id: userId }, data: { kycStatus: 'PENDING' } })
    void sendKycReceivedEmail(email, tier)
    return { submissionId: submission.id, status: 'PENDING' as const }
  }

  /** Applies a provider or admin decision. Idempotent: a decided submission is never changed again. */
  async decide(submissionId: string, decision: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO', opts: { actorId: string; note?: string }) {
    const result = await prisma.$transaction(async tx => {
      const claimed = await tx.kycSubmission.updateMany({
        where: { id: submissionId, status: 'PENDING' },
        data:  { status: decision, rejectionReason: decision === 'APPROVED' ? null : (opts.note ?? null), reviewedBy: opts.actorId, reviewedAt: new Date() },
      })
      if (claimed.count !== 1) return null
      const sub = await tx.kycSubmission.findUniqueOrThrow({ where: { id: submissionId }, include: { user: { select: { email: true, kycTier: true } } } })
      if (decision === 'APPROVED') {
        const tier = Math.max(sub.user.kycTier, sub.tier)
        await tx.user.update({ where: { id: sub.userId }, data: { kycTier: tier, kycStatus: 'APPROVED', kycLevel: legacyLevel(tier) } })
      } else {
        await tx.user.update({ where: { id: sub.userId }, data: { kycStatus: decision === 'REJECTED' ? 'REJECTED' : 'PENDING' } })
      }
      await tx.kycAuditLog.create({ data: { actorId: opts.actorId, action: decision, submissionId, note: opts.note ?? null } })
      return sub
    })
    if (!result) return false
    if (decision === 'APPROVED') void sendKycApprovedEmail(result.user.email, result.tier)
    else if (decision === 'REJECTED') void sendKycRejectedEmail(result.user.email, result.tier, opts.note ?? 'We could not verify the details provided.')
    else void sendKycMoreInfoEmail(result.user.email, result.tier, opts.note ?? 'Please review your submission and resend.')
    return true
  }

  async status(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { kycTier: true } })
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    const tier = (user.kycTier >= 1 && user.kycTier <= 3 ? user.kycTier : 0) as 0 | 1 | 2 | 3
    const cfg = tierConfig(tier)
    const latest = await prisma.kycSubmission.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
    const nextTier = tier < 3 ? ((tier + 1) as 1 | 2 | 3) : null
    const pendingForNext = !!latest && latest.status === 'PENDING' && latest.tier === nextTier
    const { usedToday, usedMonth } = await getUsage(prisma, userId)
    return {
      tier,
      status: latest?.status ?? 'NONE',
      nextTier,
      requirements: nextTier
        ? tierConfig(nextTier).requirements.filter(r => !r.startsWith('Everything in')).map((label, i) => ({ key: `t${nextTier}-${i}`, label, done: pendingForNext }))
        : [],
      limits: {
        perTx: cfg.perTxLimit, daily: cfg.dailyLimit, monthly: cfg.monthlyLimit, usedToday, usedMonth,
        remainingDaily: Math.max(0, cfg.dailyLimit - usedToday), remainingMonthly: Math.max(0, cfg.monthlyLimit - usedMonth),
      },
      tiers: KYC_TIERS.map(t => ({ tier: t.tier, label: t.label, requirements: t.requirements, allowedActions: t.allowedActions, perTxLimit: t.perTxLimit, dailyLimit: t.dailyLimit, monthlyLimit: t.monthlyLimit })),
      latestSubmission: latest ? { id: latest.id, tier: latest.tier, status: latest.status, rejectionReason: latest.rejectionReason, createdAt: latest.createdAt } : null,
    }
  }
}
