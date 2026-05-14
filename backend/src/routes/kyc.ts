import { Router } from 'express'
import { body } from 'express-validator'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { KycService } from '../services/kyc/KycService'

export const kycRouter = Router()
const kyc = new KycService()

// ── GET /kyc/status ──────────────────────────────────────────
kycRouter.get('/status', requireAuth, async (req: AuthRequest, res: any, next: any) => {
  try {
    const { prisma } = await import('../config/database')
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: { kycStatus: true, kycLevel: true, kycJobId: true },
    })
    res.json({ kyc: user })
  } catch (err) { next(err) }
})

// ── POST /kyc/submit ─────────────────────────────────────────
kycRouter.post(
  '/submit',
  requireAuth,
  [
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('dateOfBirth').isISO8601().withMessage('Date must be ISO 8601 (YYYY-MM-DD)'),
    body('idType').isIn(['NIN', 'BVN', 'PASSPORT', 'DRIVERS_LICENSE']),
    body('idNumber').notEmpty(),
    body('country').isISO31661Alpha2().withMessage('Must be a valid 2-letter country code'),
  ],
  validate,
  async (req: AuthRequest, res: any, next: any) => {
    try {
      const result = await kyc.submitKyc(req.user!.id, req.body)
      res.json({ message: 'KYC submitted successfully', ...result })
    } catch (err) { next(err) }
  },
)

// ── POST /kyc/webhook ────────────────────────────────────────
// Smile ID posts results here
kycRouter.post('/webhook', async (req: any, res: any, next: any) => {
  try {
    const { job_id, result_code, result_text } = req.body
    const { prisma } = await import('../config/database')

    const approved = result_code === '0810'  // Smile ID success code
    await prisma.user.updateMany({
      where: { kycJobId: job_id },
      data:  {
        kycStatus: approved ? 'APPROVED' : 'REJECTED',
        kycLevel:  approved ? 'BASIC' : 'NONE',
      },
    })

    res.json({ received: true })
  } catch (err) { next(err) }
})
