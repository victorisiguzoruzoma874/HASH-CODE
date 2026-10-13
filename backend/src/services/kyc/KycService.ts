import axios from 'axios'
import { prisma } from '../../config/database'
import { cacheGet, cacheSet } from '../../config/redis'

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
 *   (Tier 1 identity checks go to Dojah via verifyIdentity)
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
      select: { kycTier: true },
    })

    if (user) {
      const result = this.evaluateTier(user.kycTier, amountUSD)
      await cacheSet(cacheKey, result, this.CACHE_TTL)
      return result
    }

    // Unknown user — fail safe
    const result: KycResult = { passed: false, level: 'NONE', reason: 'USER_NOT_FOUND' }
    await cacheSet(cacheKey, result, this.CACHE_TTL)
    return result
  }

  /** Off-ramp payouts need Tier 2; large payouts need Tier 3. */
  private evaluateTier(tier: number, amountUSD?: number): KycResult {
    const level: KycResult['level'] = tier >= 3 ? 'FULL' : tier >= 1 ? 'BASIC' : 'NONE'
    if (tier < 2) return { passed: false, level, reason: 'TIER_2_REQUIRED' }
    if (amountUSD && amountUSD > this.LARGE_PAYOUT_THRESHOLD_USD && tier < 3) {
      return { passed: false, level, reason: 'TIER_3_REQUIRED_FOR_LARGE_PAYOUT' }
    }
    return { passed: true, level }
  }


  /**
   * Checks a BVN/NIN against Dojah and compares the registered name and date of birth with what the user entered.
   * Dojah answers synchronously, so the result is final. Throws when the provider is unreachable or misconfigured
   * (callers treat that as "try again later"); a number Dojah does not know is a rejection, not an error.
   */
  async verifyIdentity(data: {
    firstName: string; lastName: string; dateOfBirth: string
    idType: 'BVN' | 'NIN'; idNumber: string
  }): Promise<IdentityCheckResult> {
    const appId  = process.env.DOJAH_APP_ID?.trim()
    const secret = process.env.DOJAH_SECRET_KEY?.trim()
    if (!appId || !secret) throw new Error('DOJAH_NOT_CONFIGURED: set DOJAH_APP_ID and DOJAH_SECRET_KEY from the same Dojah app and environment')

    const base = process.env.DOJAH_ENV === 'production' ? 'https://api.dojah.io' : 'https://sandbox.dojah.io'
    const [path, param] = data.idType === 'BVN' ? ['/api/v1/kyc/bvn/full', 'bvn'] : ['/api/v1/kyc/nin', 'nin']

    let entity: Record<string, unknown> | undefined
    try {
      const res = await axios.get(`${base}${path}`, {
        params:  { [param]: data.idNumber },
        headers: { Authorization: secret, AppId: appId }, // Dojah wants the raw secret, no "Bearer"
        timeout: 15_000,
      })
      entity = res.data?.entity
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      // Do not propagate Axios errors: their request config contains the secret and ID number.
      if (status === 401) {
        const invalidAppId = axios.isAxiosError(err) && err.response?.data?.error === 'Enter Correct AppId'
        throw new Error(invalidAppId
          ? 'DOJAH_INVALID_APP_ID: use the App ID from Developers > Configuration for the selected environment, not a public or secret API key'
          : 'DOJAH_AUTH_FAILED: verify the App ID and secret key belong to the same app and environment')
      }
      if (status === 403) throw new Error('DOJAH_ACCESS_DENIED: this app is not permitted to use the requested identity endpoint')
      if (status === 400 || status === 404) {
        return { approved: false, reason: `That ${data.idType} was not found. Check the number and try again.` }
      }
      throw new Error(`DOJAH_UNAVAILABLE: ${status ? `HTTP ${status}` : 'network request failed'}`)
    }
    if (!entity) throw new Error('DOJAH_EMPTY_RESPONSE')
    return matchIdentity(data, entity)
  }
}

export interface IdentityCheckResult { approved: boolean; reason?: string }

const normName = (v: unknown) => String(v ?? '').toUpperCase().replace(/[^A-Z]/g, '')

/** First and last name must match (either order, middle names ignored) and the date of birth must be identical. */
export function matchIdentity(
  input: { firstName: string; lastName: string; dateOfBirth: string },
  entity: Record<string, unknown>,
): IdentityCheckResult {
  const first = normName(entity.first_name), last = normName(entity.last_name)
  const inFirst = normName(input.firstName), inLast = normName(input.lastName)
  const namesMatch = !!first && !!last && ((first === inFirst && last === inLast) || (first === inLast && last === inFirst))
  if (!namesMatch) return { approved: false, reason: 'The name does not match the name registered to this ID.' }

  const dob = typeof entity.date_of_birth === 'string' ? entity.date_of_birth.slice(0, 10) : ''
  if (dob !== input.dateOfBirth) return { approved: false, reason: 'The date of birth does not match the one registered to this ID.' }
  return { approved: true }
}
