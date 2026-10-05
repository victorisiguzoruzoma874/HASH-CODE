import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCurrentAccount, useConnectWallet, useWallets, useSignPersonalMessage } from '@mysten/dapp-kit'
import { FlatShell } from '../components/ui/FlatShell'
import { useApiStore } from '../store/useApiStore'
import { authApi, saveToken } from '../lib/api'

export const Login: React.FC = () => {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')

  const navigate = useNavigate()
  const location = useLocation()
  const from     = (location.state as any)?.from?.pathname ?? '/dashboard'

  const login       = useApiStore(s => s.login)
  const fetchMe     = useApiStore(s => s.fetchMe)
  const authLoading = useApiStore(s => s.authLoading)

  const account     = useCurrentAccount()
  const wallets     = useWallets()
  const { mutate: connectWallet,      isPending: walletConnecting } = useConnectWallet()
  const { mutate: signPersonalMessage } = useSignPersonalMessage()

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

  const handleWalletConnect = () => {
    setError('')
    if (wallets.length === 0) {
      setError('No Sui wallet detected. Install Sui Wallet or Suiet.')
      return
    }
    connectWallet(
      { wallet: wallets[0] },
      {
        onSuccess: () => {
          if (!account?.address) return
          const challenge = `Sign in to HashPay\nAddress: ${account.address}\nTimestamp: ${Date.now()}`
          signPersonalMessage(
            { message: new TextEncoder().encode(challenge) },
            {
              onSuccess: async ({ signature }) => {
                try {
                  const { token } = await authApi.connectWallet({
                    walletAddress: account.address,
                    chain: 'SUI',
                    signature,
                  })
                  saveToken(token)
                  await fetchMe()
                  navigate(from, { replace: true })
                } catch (err: any) {
                  setError(err.message ?? 'Wallet authentication failed.')
                }
              },
              onError: (err) => setError(err.message ?? 'Failed to sign challenge.'),
            }
          )
        },
        onError: (err) => setError(err.message),
      }
    )
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
              <button type="button" className="lp-btn" onClick={handleWalletConnect} disabled={walletConnecting}>
                {walletConnecting
                  ? 'Connecting…'
                  : account ? `Connected: ${account.address.slice(0, 8)}…` : 'Connect Sui wallet'}
              </button>
            </section>

            <div className="lp-divider">or use email</div>

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
            <h2>Your keys, your funds</h2>
            <p className="lp-lede">HashPay is non-custodial. We never hold your assets.</p>
            <div>
              <div className="lp-label">Security</div>
              <div className="lp-box">
                <ul>
                  {['AES-256 encryption', 'MPC authentication', 'KYC verified', 'secp256k1 signed quotes']
                    .map(s => <li key={s}>{s}<span>active</span></li>)}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </FlatShell>
  )
}
