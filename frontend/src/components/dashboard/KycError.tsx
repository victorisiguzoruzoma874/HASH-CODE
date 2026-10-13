import { Link } from 'react-router-dom'
import { ApiError } from '../../lib/api'

export const formatNgn = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)

export function kycErrorMessage(error: unknown, onNavigate?: () => void) {
  if (!(error instanceof ApiError) || !['KYC_TIER_REQUIRED', 'KYC_LIMIT_EXCEEDED'].includes(error.code)) return null
  const details = error.details as { remaining?: number } | undefined
  const remaining = details?.remaining
  return <>
    {error.code === 'KYC_TIER_REQUIRED' ? 'Verify to continue.' : typeof remaining === 'number' && Number.isFinite(remaining)
      ? `This is over your limit, remaining today: ${formatNgn(remaining)}.` : 'This is over your verification limit.'}{' '}
    <Link className="lp-link" to="/dashboard/verification" onClick={onNavigate}>Verification</Link>
  </>
}
