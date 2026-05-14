import axios from 'axios'
import { prisma } from '../../config/database'
import { cacheGet, cacheSet } from '../../config/redis'
import { logger } from '../../utils/logger'

interface KycResult {
  passed:  boolean
  level:   'NONE' | 'BASIC' | 'FULL'
  reason?: string
}

/**
 * KycService
 * ──────────
 * Verifies KYC status for a given Aptos address.
 *
 * Checks (in order):
 *   1. Redis cache (60s TTL)
 *   2. Local DB (user.kycStatus)
 *   3. Smile ID API (external KYC provider)
 *
 * Minimum KYC level for payout: BASIC
 * Minimum KYC level for large payouts (>$1000): FULL
 */
export class KycService {
  private readonly LARGE_PAYOUT_THRESHOLD_USD = 1000
  private readonly CACHE_TTL = 60

  async verify(aptosAddress: string, amountUSD?: number): Promise<KycResult> {
    const cacheKey = `kyc:${aptosAddress}`
    const cached   = await cacheGet<KycResult>(cacheKey)
    if (cached) return cached

    // Check DB first
    const user = await prisma.user.findUnique({
      where:  { aptosAddress },
      select: { kycStatus: true, kycLevel: true },
    })

    if (user) {
      const result = this.evaluateKycStatus(user.kycStatus, user.kycLevel, amountUSD)
      await cacheSet(cacheKey, result, this.CACHE_TTL)
      return result
    }

    // Unknown user — fail safe
    const result: KycResult = { passed: false, level: 'NONE', reason: 'USER_NOT_FOUND' }
    await cacheSet(cacheKey, result, this.CACHE_TTL)
    return result
  }

  async submitKyc(userId: string, data: {
    firstName:   string
    lastName:    string
    dateOfBirth: string
    idType:      'NIN' | 'BVN' | 'PASSPORT' | 'DRIVERS_LICENSE'
    idNumber:    string
    country:     string
    selfieBase64?: string
  }): Promise<{ jobId: string; status: string }> {
    logger.info(`[KycService] Submitting KYC for user ${userId}`)

    const response = await axios.post(
      'https://3eydmgh10d.execute-api.us-west-2.amazonaws.com/v1/smile_identity',
      {
        partner_id:   process.env.SMILE_ID_PARTNER_ID,
        partner_params: {
          job_id:   `HP-KYC-${userId}-${Date.now()}`,
          user_id:  userId,
          job_type: 5,  // Enhanced KYC
        },
        id_info: {
          first_name:    data.firstName,
          last_name:     data.lastName,
          dob:           data.dateOfBirth,
          id_type:       data.idType,
          id_number:     data.idNumber,
          country:       data.country,
          entered:       true,
        },
        options: { return_job_status: true },
      },
      {
        headers: { Authorization: `Bearer ${process.env.SMILE_ID_API_KEY}` },
      }
    )

    const jobId = response.data.job_id
    await prisma.user.update({
      where: { id: userId },
      data:  { kycStatus: 'PENDING', kycJobId: jobId },
    })

    return { jobId, status: 'PENDING' }
  }

  private evaluateKycStatus(
    status: string, level: string, amountUSD?: number
  ): KycResult {
    if (status !== 'APPROVED') {
      return { passed: false, level: level as KycResult['level'], reason: `KYC_STATUS_${status}` }
    }

    if (amountUSD && amountUSD > this.LARGE_PAYOUT_THRESHOLD_USD && level !== 'FULL') {
      return { passed: false, level: level as KycResult['level'], reason: 'FULL_KYC_REQUIRED_FOR_LARGE_PAYOUT' }
    }

    return { passed: true, level: level as KycResult['level'] }
  }
}
