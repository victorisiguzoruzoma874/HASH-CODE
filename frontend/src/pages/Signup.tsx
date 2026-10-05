import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FlatShell } from '../components/ui/FlatShell'
import { useApiStore } from '../store/useApiStore'

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['', 'var(--red)', 'var(--red)', 'var(--green)', 'var(--green)']

export const Signup: React.FC = () => {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [agreed,   setAgreed]   = useState(false)
  const [error,    setError]    = useState('')

  const navigate    = useNavigate()
  const register    = useApiStore(s => s.register)
  const authLoading = useApiStore(s => s.authLoading)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!agreed) return
    setError('')
    try {
      await register(email, password, name)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Registration failed. Please try again.')
    }
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : password.length < 14 ? 3 : 4

  return (
    <FlatShell>
      <div className="lp-body">
        <main className="lp-left">
          <div className="lp-col" style={{ maxWidth: 520 }}>
            <section>
              <div className="lp-switch" style={{ marginBottom: 28 }}>
                <Link to="/login">Log in</Link>
                <span aria-current="page">Sign up</span>
              </div>
              <h1 style={{ fontSize: 'clamp(30px, 4vw, 40px)' }}>Create your account</h1>
              <p className="lp-lede">Free to join. No credit card required.</p>
            </section>

            {error && <div className="lp-error" role="alert">{error}</div>}

            <form className="lp-auth-form" onSubmit={handleSubmit}>
              <div className="lp-field">
                <label className="lp-label" htmlFor="name">Full name</label>
                <input
                  id="name" className="lp-input" type="text" autoComplete="name" required
                  value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                />
              </div>

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
                  <span>At least 8 characters</span>
                </label>
                <div className="lp-inputwrap">
                  <input
                    id="password" className="lp-input" autoComplete="new-password" required minLength={8}
                    type={showPass ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a password"
                  />
                  <button type="button" className="lp-reveal" onClick={() => setShowPass(s => !s)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}>
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
                {password && (
                  <>
                    <div className="lp-meter" aria-hidden="true">
                      {[1, 2, 3, 4].map(i => (
                        <i key={i} style={i <= strength ? { background: STRENGTH_COLORS[strength] } : undefined} />
                      ))}
                    </div>
                    <span style={{ fontSize: 12, marginTop: 6, color: STRENGTH_COLORS[strength] }}>
                      Password strength: {STRENGTH_LABELS[strength]}
                    </span>
                  </>
                )}
              </div>

              <label className="lp-check" style={{ marginBottom: 24 }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span>
                  I agree to the <a href="#" className="lp-link">Terms of Service</a> and <a href="#" className="lp-link">Privacy Policy</a>.
                </span>
              </label>

              <button type="submit" className="lp-btn solid" disabled={authLoading || !agreed}>
                {authLoading ? 'Creating account…' : 'Create free account'}
              </button>
            </form>

            <p className="lp-lede" style={{ fontSize: 14 }}>
              Already have an account? <Link to="/login" className="lp-link" style={{ color: 'var(--ink)' }}>Log in</Link>
            </p>
          </div>
        </main>

        <aside className="lp-right" aria-label="What you get">
          <div className="lp-rightcol">
            <h2>What you get</h2>
            <div className="lp-box">
              <ul>
                {['A HashPay account number for receiving naira', 'Free instant transfers to other HashPay users', 'Live crypto prices in dollars and naira', 'Signed quotes for converting crypto to cash']
                .map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </FlatShell>
  )
}
