/**
 * KYC tier configuration — the single source of truth for what each tier may do.
 *
 * IMPORTANT: every limit below is a PLACEHOLDER (NGN). Confirm the real figures with
 * compliance / legal before launch. Nothing else in the codebase may hard-code them.
 */

export type KycTier = 0 | 1 | 2 | 3

export type KycAction =
  | 'RECEIVE'
  | 'INTERNAL_TRANSFER'
  | 'BILLS'
  | 'OFFRAMP'
  | 'SWAP'

export interface TierConfig {
  tier:           KycTier
  label:          string
  requirements:   string[]      // human-readable, shown in the UI
  allowedActions: KycAction[]
  perTxLimit:     number        // NGN, 0 = not allowed to transact
  dailyLimit:     number
  monthlyLimit:   number
}

export const KYC_TIERS: readonly TierConfig[] = [
  {
    tier: 0, label: 'Unverified',
    requirements: ['Email and password'],
    allowedActions: [],
    perTxLimit: 0, dailyLimit: 0, monthlyLimit: 0,
  },
  {
    tier: 1, label: 'Tier 1',
    requirements: ['Full name and date of birth', 'Phone number', 'BVN or NIN'],
    allowedActions: ['RECEIVE', 'INTERNAL_TRANSFER', 'BILLS'],
    perTxLimit: 50_000, dailyLimit: 100_000, monthlyLimit: 500_000,
  },
  {
    tier: 2, label: 'Tier 2',
    requirements: ['Everything in Tier 1', 'Government ID photo', 'Selfie'],
    allowedActions: ['RECEIVE', 'INTERNAL_TRANSFER', 'BILLS', 'OFFRAMP', 'SWAP'],
    perTxLimit: 500_000, dailyLimit: 2_000_000, monthlyLimit: 10_000_000,
  },
  {
    tier: 3, label: 'Tier 3',
    requirements: ['Everything in Tier 2', 'Proof of address', 'Source of funds'],
    allowedActions: ['RECEIVE', 'INTERNAL_TRANSFER', 'BILLS', 'OFFRAMP', 'SWAP'],
    perTxLimit: 5_000_000, dailyLimit: 20_000_000, monthlyLimit: 100_000_000,
  },
]

export function tierConfig(tier: number): TierConfig {
  return KYC_TIERS.find(t => t.tier === tier) ?? KYC_TIERS[0]
}

/** Lowest tier allowed to perform an action, or null if no tier can. */
export function minTierFor(action: KycAction): KycTier | null {
  const t = KYC_TIERS.find(c => c.allowedActions.includes(action))
  return t ? t.tier : null
}

/** Legacy kycLevel -> tier, used only while migrating old rows. */
export function tierFromLegacy(status: string, level: string): KycTier {
  if (status !== 'APPROVED') return 0
  if (level === 'FULL') return 3
  if (level === 'BASIC') return 1
  return 0
}
