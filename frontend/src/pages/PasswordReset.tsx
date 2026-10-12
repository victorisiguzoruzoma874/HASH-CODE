import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FlatShell } from '../components/ui/FlatShell'
import { authApi } from '../lib/api'

const Frame: React.FC<{ title: string; lede: string; children: React.ReactNode }> = ({ title, lede, children }) => (
  <FlatShell>
    <div className="lp-body">
      <main className="lp-left">
        <div className="lp-col" style={{ maxWidth: 520 }}>
          <section>
            <h1 style={{ fontSize: 'clamp(30px, 4vw, 40px)' }}>{title}</h1>
            <p className="lp-lede">{lede}</p>
          </section>
          {children}
          <p className="lp-lede" style={{ fontSize: 14 }}>
            <Link to="/login" className="lp-link" style={{ color: 'var(--ink)' }}>Back to log in</Link>
          </p>
        </div>
      </main>
    </div>
  </FlatShell>
)

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try { setDone((await authApi.forgotPassword({ email })).message) }
    catch (err: any) { setError(err.message ?? 'Could not send the request. Try again.') }
    finally { setBusy(false) }
  }

  return (
    <Frame title="Forgot password" lede="Enter your email and we will send you a link to choose a new password.">
      {error && <div className="lp-error" role="alert">{error}</div>}
      {done ? <div className="lp-box" role="status">{done}</div> : (
        <form className="lp-auth-form" onSubmit={submit}>
          <div className="lp-field">
            <label className="lp-label" htmlFor="email">Email address</label>
            <input id="email" className="lp-input" type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <button type="submit" className="lp-btn solid" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </Frame>
  )
}

export const ResetPassword: React.FC = () => {
  const token = useSearchParams()[0].get('token') ?? ''
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try { setDone((await authApi.resetPassword({ token, password })).message) }
    catch (err: any) { setError(err.message ?? 'Could not reset the password.') }
    finally { setBusy(false) }
  }

  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return <Frame title="Link not valid" lede="This reset link is missing or broken. Request a new one."><Link to="/forgot-password" className="lp-btn solid">Request a new link</Link></Frame>
  }

  return (
    <Frame title="Choose a new password" lede="Use at least 8 characters.">
      {error && <div className="lp-error" role="alert">{error}</div>}
      {done ? <div className="lp-box" role="status">{done} <Link to="/login" className="lp-link">Log in</Link></div> : (
        <form className="lp-auth-form" onSubmit={submit}>
          <div className="lp-field">
            <label className="lp-label" htmlFor="password">New password</label>
            <input id="password" className="lp-input" type="password" autoComplete="new-password" required minLength={8} maxLength={72}
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="lp-btn solid" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </form>
      )}
    </Frame>
  )
}
