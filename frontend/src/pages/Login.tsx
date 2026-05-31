import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Wallet, Eye, EyeOff, Shield, Key, AlertCircle } from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'
import { useCurrentAccount, useConnectWallet, useWallets, useSignPersonalMessage } from '@mysten/dapp-kit'
import { HashPayLogo, HashPayIcon } from '../components/ui/HashPayLogo'
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
    <div className="min-h-screen flex flex-col" style={{ background: '#EEF3FB' }}>

      {/* Full-width Nav */}
      <nav className="w-full bg-white" style={{ borderBottom: '1px solid #DDE6F2', boxShadow: '0 1px 3px rgba(10,25,41,0.06)' }}>
        <div className="max-w-[1200px] mx-auto px-8 h-[68px] flex items-center justify-between">
          <Link to="/"><HashPayLogo size={34} /></Link>
          <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
            <span className="px-5 py-2 rounded-full text-[13px] font-bold" style={{ background: '#0B50D4', color: '#fff' }}>
              Log In
            </span>
            <Link to="/signup" className="px-5 py-2 rounded-full text-[13px] font-bold transition-colors" style={{ color: '#7A97B4' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#7A97B4' }}>
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full"
          style={{ maxWidth: 480 }}
        >
          <div
            className="bg-white rounded-3xl"
            style={{
              padding: '48px 44px',
              boxShadow: '0 4px 24px rgba(10,25,41,0.09), 0 1px 4px rgba(10,25,41,0.05)',
              border: '1px solid #DDE6F2',
            }}
          >
            {/* Logo + heading */}
            <div className="text-center mb-10">
              <div className="flex justify-center mb-5">
                <HashPayIcon size={56} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0A1929', marginBottom: 8 }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 15, fontWeight: 500, color: '#7A97B4' }}>
                Log in to your HashPay account
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-2xl mb-6"
                style={{ padding: '14px 16px', background: '#FDECEA', border: '1px solid rgba(197,32,43,0.18)' }}
              >
                <AlertCircle size={15} style={{ color: '#C5202B', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#C5202B' }}>{error}</p>
              </motion.div>
            )}

            {/* Wallet CTA */}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={handleWalletConnect}
              disabled={walletConnecting}
              className="w-full flex items-center justify-center gap-3 rounded-full font-bold transition-all disabled:opacity-60"
              style={{
                padding: '15px 24px',
                fontSize: 15,
                background: '#057A4B',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(5,122,75,0.22)',
                marginBottom: 24,
              }}
              onMouseEnter={e => { if (!walletConnecting) e.currentTarget.style.background = '#046040' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#057A4B' }}
            >
              {walletConnecting
                ? <><Spinner size={17} />Connecting…</>
                : <><Wallet size={18} />{account ? `Connected: ${account.address.slice(0, 8)}…` : 'Connect Sui Wallet'}</>
              }
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-4" style={{ marginBottom: 24 }}>
              <div className="flex-1 h-px" style={{ background: '#DDE6F2' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#A8BDD4' }}>OR</span>
              <div className="flex-1 h-px" style={{ background: '#DDE6F2' }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3D5A78', marginBottom: 8 }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute top-1/2 -translate-y-1/2" style={{ left: 16, color: '#A8BDD4' }} />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    style={{
                      width: '100%',
                      padding: '14px 16px 14px 44px',
                      fontSize: 14,
                      fontWeight: 500,
                      borderRadius: 12,
                      border: '1.5px solid #C4D4E8',
                      background: '#F8FAFD',
                      color: '#0A1929',
                      outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11,80,212,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#3D5A78' }}>Password</label>
                  <a href="#" style={{ fontSize: 13, fontWeight: 700, color: '#0B50D4', textDecoration: 'none' }}>Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute top-1/2 -translate-y-1/2" style={{ left: 16, color: '#A8BDD4' }} />
                  <input
                    type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '14px 48px 14px 44px',
                      fontSize: 14,
                      fontWeight: 500,
                      borderRadius: 12,
                      border: '1.5px solid #C4D4E8',
                      background: '#F8FAFD',
                      color: '#0A1929',
                      outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11,80,212,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute top-1/2 -translate-y-1/2" style={{ right: 16, color: '#A8BDD4' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                type="submit" disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 rounded-full font-bold transition-all disabled:opacity-60"
                style={{
                  padding: '15px 24px',
                  fontSize: 15,
                  background: '#0B50D4',
                  color: '#fff',
                  boxShadow: '0 4px 16px rgba(11,80,212,0.28)',
                  marginBottom: 20,
                }}
                onMouseEnter={e => { if (!authLoading) e.currentTarget.style.background = '#0840AA' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
              >
                {authLoading ? <><Spinner size={17} />Signing in…</> : 'Log In'}
              </motion.button>
            </form>

            <p className="text-center" style={{ fontSize: 14, fontWeight: 600, color: '#7A97B4' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#0B50D4', fontWeight: 800, textDecoration: 'none' }}>
                Create one free
              </Link>
            </p>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-8" style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #EEF3FB' }}>
              {[
                { icon: <Shield size={13} style={{ color: '#057A4B' }} />, label: 'AES-256 Encrypted' },
                { icon: <Key    size={13} style={{ color: '#0B50D4' }} />, label: 'MPC Auth' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A8BDD4' }}>
                  {b.icon}{b.label}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="w-full bg-white" style={{ borderTop: '1px solid #DDE6F2' }}>
        <div className="max-w-[1200px] mx-auto px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Security Audit'].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, fontWeight: 600, color: '#A8BDD4', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#A8BDD4' }}>{l}</a>
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#A8BDD4' }}>© 2026 HashPay Global</span>
        </div>
      </footer>
    </div>
  )
}
