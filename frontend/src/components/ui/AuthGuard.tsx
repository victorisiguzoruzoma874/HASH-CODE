import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken, saveToken } from '../../lib/api'
import { useApiStore } from '../../store/useApiStore'
import { HashPayIcon } from './HashPayLogo'

interface AuthGuardProps {
  children: React.ReactNode
}

const MOCK_MODE = import.meta.env.VITE_MOCK_API === 'true'

/**
 * AuthGuard
 * ─────────
 * Wraps protected routes. Redirects to /login if no JWT token.
 *
 * In MOCK mode (VITE_MOCK_API=true):
 *   - Auto-injects a mock token so the dashboard is always accessible
 *   - No real API call needed
 *
 * In production mode:
 *   - Validates JWT by calling /auth/me
 *   - Redirects to /login if token is missing or expired
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location  = useLocation()
  const fetchMe   = useApiStore(s => s.fetchMe)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Mock mode: inject a fake token and skip validation
    if (MOCK_MODE) {
      if (!getToken()) saveToken('mock-jwt-token-dev')
      setChecking(false)
      return
    }

    const token = getToken()
    if (!token) {
      setChecking(false)
      return
    }

    fetchMe().finally(() => setChecking(false))
  }, [fetchMe])

  // Show spinner while checking
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07111F' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <HashPayIcon size={52} />
          </div>
          <div className="text-[13px]" style={{ color: '#64748B' }}>
            {MOCK_MODE ? 'Loading demo…' : 'Verifying session…'}
          </div>
        </div>
      </div>
    )
  }

  // No token → redirect to login (preserving intended destination)
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
