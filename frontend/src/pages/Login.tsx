import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FlatShell } from '../components/ui/FlatShell'
import { useApiStore } from '../store/useApiStore'

export const Login: React.FC = () => {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')

  const navigate = useNavigate()
  const location = useLocation()
  const from     = (location.state as any)?.from?.pathname ?? '/dashboard'

  const login       = useApiStore(s => s.login)
  const authLoading = useApiStore(s => s.authLoading)


  const handleEmailLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Check your credentials.')
    }
  }


  return (
    <FlatShell>
      <div className="lp-body">
        <main className="lp-left">
          <div className="lp-col" style={{ maxWidth: 520 }}>
            <section>
              <div className="lp-switch" style={{ marginBottom: 28 }}>
                <span aria-current="page">Log in</span>
                <Link to="/signup">Sign up</Link>
              </div>
              <h1 style={{ fontSize: 'clamp(30px, 4vw, 40px)' }}>Welcome back</h1>
              <p className="lp-lede">Log in to your HashPay account.</p>
            </section>

            {error && <div className="lp-error" role="alert">{error}</div>}

            <section>
              <div className="lp-label"><span>Wallet</span></div>
              <p className="lp-lede" style={{ fontSize: 14 }}>Log in with your email, then use Connect wallet in your dashboard to link Freighter, LOBSTR, MetaMask, Phantom or Sui.</p>
            </section>


            <form className="lp-auth-form" onSubmit={handleEmailLogin}>
              <div className="lp-field">
                <label className="lp-label" htmlFor="email">Email address</label>
                <input
                  id="email" className="lp-input" type="email" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                />
              </div>

              <div className="lp-field">
                <label className="lp-label" htmlFor="password">
                  <span>Password</span>
                  <a href="#" className="lp-link">Forgot password?</a>
                </label>
                <div className="lp-inputwrap">
                  <input
                    id="password" className="lp-input" autoComplete="current-password" required
                    type={showPass ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
                  />
                  <button type="button" className="lp-reveal" onClick={() => setShowPass(s => !s)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}>
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button type="submit" className="lp-btn solid" disabled={authLoading}>
                {authLoading ? 'Signing in…' : 'Log in'}
              </button>
            </form>

            <p className="lp-lede" style={{ fontSize: 14 }}>
              No account yet? <Link to="/signup" className="lp-link" style={{ color: 'var(--ink)' }}>Create one free</Link>
            </p>
          </div>
        </main>

        <aside className="lp-right" aria-label="About your account">
          <div className="lp-rightcol">
            <h2>Welcome back</h2>
            <p className="lp-lede">Log in to see your naira balance, send money and check live prices.</p>
            <div>
              <div className="lp-label">Security</div>
              <div className="lp-box">
                <ul>
                  {['AES-256 encryption for sensitive data', 'Signed conversion quotes (secp256k1)']
                    .map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </FlatShell>
  )
}
