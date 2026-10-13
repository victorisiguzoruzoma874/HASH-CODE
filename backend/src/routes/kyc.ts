import { Router } from 'express'
import { body, param, query } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { prisma } from '../config/database'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { AppError } from '../middleware/errorHandler'
import { KycSubmissionService } from '../services/kyc/KycSubmissionService'
import { documentStore } from '../services/kyc/DocumentStore'

export const kycRouter = Router()
export const kycService = new KycSubmissionService()

// Submissions are expensive and sensitive: a few per hour per user.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 8,
  keyGenerator: (req: any) => req.user?.id ?? req.ip,
  message: { error: 'Too many verification attempts, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
})

// ── GET /kyc/status ──────────────────────────────────────────
kycRouter.get('/status', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.json(await kycService.status(req.user!.id))
  } catch (err) { next(err) }
})

// ── POST /kyc/tier1 ──────────────────────────────────────────
kycRouter.post(
  '/tier1', requireAuth, submitLimiter,
  [
    body('firstName').trim().isLength({ min: 1, max: 80 }),
    body('lastName').trim().isLength({ min: 1, max: 80 }),
    body('dateOfBirth').isISO8601({ strict: true }).withMessage('Date must be YYYY-MM-DD'),
    body('phone').trim().matches(/^\+?[0-9]{8,15}$/).withMessage('Enter a valid phone number'),
    body('idType').isIn(['BVN', 'NIN']),
    body('idNumber').trim().matches(/^[0-9]{11}$/).withMessage('BVN and NIN are 11 digits'),
    body('country').isISO31661Alpha2(),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try { res.status(202).json(await kycService.submitTier1(req.user!.id, req.body)) }
    catch (err) { next(err) }
  },
)

// ── POST /kyc/tier2 ──────────────────────────────────────────
kycRouter.post(
  '/tier2', requireAuth, submitLimiter,
  [
    body('idType').isIn(['NIN', 'PASSPORT', 'DRIVERS_LICENSE']),
    body('idFrontBase64').isString().isLength({ min: 100, max: 4_300_000 }),
    body('idBackBase64').optional().isString().isLength({ min: 100, max: 4_300_000 }),
    body('selfieBase64').isString().isLength({ min: 100, max: 4_300_000 }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try { res.status(202).json(await kycService.submitTier2(req.user!.id, req.body)) }
    catch (err) { next(err) }
  },
)

// ── POST /kyc/tier3 ──────────────────────────────────────────
kycRouter.post(
  '/tier3', requireAuth, submitLimiter,
  [
    body('address').trim().isLength({ min: 10, max: 300 }),
    body('sourceOfFunds').trim().isLength({ min: 3, max: 500 }),
    body('addressProofBase64').isString().isLength({ min: 100, max: 4_300_000 }),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try { res.status(202).json(await kycService.submitTier3(req.user!.id, req.body)) }
    catch (err) { next(err) }
  },
)

// ── Admin review ─────────────────────────────────────────────
const admin = Router()
admin.use(requireAuth, requireRole('ADMIN'))

admin.get('/submissions', [query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO'])], validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const rows = await prisma.kycSubmission.findMany({
        where: { status: (req.query.status as any) ?? 'PENDING' },
        orderBy: { createdAt: 'asc' }, take: 100,
        select: { id: true, tier: true, status: true, createdAt: true, user: { select: { email: true, fullName: true } }, documents: { select: { id: true, type: true, mimeType: true } } },
      })
      res.setHeader('Cache-Control', 'no-store')
      res.json({ submissions: rows })
    } catch (err) { next(err) }
  })

admin.get('/documents/:id', [param('id').isUUID()], validate, async (req: AuthRequest, res: any, next: any) => {
  try {
    const doc = await prisma.kycDocument.findUnique({ where: { id: req.params.id } })
    if (!doc) throw new AppError(404, 'Document not found', 'NOT_FOUND')
    await prisma.kycAuditLog.create({ data: { actorId: req.user!.id, action: 'VIEW_DOCUMENT', submissionId: doc.submissionId, note: doc.type } })
    res.setHeader('Cache-Control', 'no-store')
    res.type(doc.mimeType).send(await documentStore.get(doc.storageKey))
  } catch (err) { next(err) }
})

const decideRoute = (path: string, decision: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO', noteRequired: boolean) =>
  admin.post(path, [param('id').isUUID(), body('note').optional().isString().isLength({ max: 300 }), ...(noteRequired ? [body('note').trim().notEmpty()] : [])], validate,
    async (req: AuthRequest, res: any, next: any) => {
      try {
        const done = await kycService.decide(req.params.id, decision, { actorId: req.user!.id, note: req.body.note })
        if (!done) throw new AppError(409, 'This submission was already decided or does not exist.', 'KYC_ALREADY_DECIDED')
        res.json({ message: `Submission ${decision.toLowerCase().replace(/_/g, ' ')}.` })
      } catch (err) { next(err) }
    })
decideRoute('/submissions/:id/approve', 'APPROVED', false)
decideRoute('/submissions/:id/reject', 'REJECTED', true)
decideRoute('/submissions/:id/request-info', 'NEEDS_MORE_INFO', true)

kycRouter.use('/admin', admin)
