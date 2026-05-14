import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Wallet, Eye, EyeOff, Shield, Key, AlertCircle } from 'lucide-react'
import { useCurrentAccount, useConnectWallet, useWallets } from '@mysten/dapp-kit'
import { HashPayLogo, HashPayIcon } from '../components/ui/HashPayLogo'
import { useApiStore } from '../store/useApiStore'

export const Login: React.FC = () => {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')

  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as any)?.from?.pathname ?? '/dashboard'

  const login        = useApiStore(s => s.login)
  const authLoading  = useApiStore(s => s.authLoading)

  // Sui wallet
  const account          = useCurrentAccount()
  const wallets          = useWallets()
  const { mutate: connectWallet, isPending: walletConnecting } = useConnectWallet()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Check your credentials.')
    }
  }

  const handleWalletConnect = async () => {
    setError('')
    if (wallets.length === 0) {
      setError('No Sui wallet detected. Install Sui Wallet or Suiet.')
      return
    }
    connectWallet(
      { wallet: wallets[0] },
      {
        onSuccess: async () => {
          // After wallet connect, try to log in or register with wallet address
          if (account?.address) {
            try {
              // Try to get a token via wallet-based auth
              // For now, navigate to dashboard — full wallet auth requires a challenge/sign flow
              navigate(from, { replace: true })
            } catch (err: any) {
              setError(err.message)
            }
          }
        },
        onError: (err) => setError(err.message),
      }
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#07111F' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 px-6 h-14 flex items-center justify-between max-w-[1280px] mx-auto w-full"
        style={{ borderBottom: '1px solid #1E293B' }}>
        <Link to="/"><HashPayLogo size={32} /></Link>
        <div className="flex items-center gap-6">
          <span className="text-[14px] font-semibold pb-0.5"
            style={{ color: '#F8FAFC', borderBottom: '2px solid #3B82F6' }}>Login</span>
          <Link to="/signup" className="text-[14px] transition-colors" style={{ color: '#64748B' }}>Sign Up</Link>
        </div>
      </nav>

      {/* Main */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[420px]">

          <div className="rounded-[24px] p-8" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-5"><HashPayIcon size={56} /></div>
              <h1 className="text-[22px] font-bold mb-1.5" style={{ color: '#F8FAFC' }}>Welcome back</h1>
              <p className="text-[13px]" style={{ color: '#64748B' }}>Access your decentralized treasury</p>
            </div>

            {/* Error banner */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-[10px] mb-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                <p className="text-[12px]" style={{ color: '#EF4444' }}>{error}</p>
              </motion.div>
            )}

            {/* Wallet CTA */}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleWalletConnect}
              disabled={walletConnecting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-[12px] text-[14px] font-semibold mb-6 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #22C55E, #06B6D4)', color: '#07111F' }}>
              {walletConnecting ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>Connecting…</>
              ) : (
                <><Wallet size={17} />
                  {account ? `Connected: ${account.address.slice(0, 8)}…` : 'Connect Sui Wallet'}</>
              )}
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ background: '#1E293B' }} />
              <span className="text-[11px] font-semibold tracking-[0.1em] uppercase" style={{ color: '#334155' }}>or email</span>
              <div className="flex-1 h-px" style={{ background: '#1E293B' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
                <input type="email" placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="w-full rounded-[12px] pl-10 pr-4 py-3 text-[14px] transition-all"
                  style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }} />
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
                <input type={showPass ? 'text' : 'password'} placeholder="Password" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full rounded-[12px] pl-10 pr-20 py-3 text-[14px] transition-all"
                  style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ color: '#64748B' }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <a href="#" className="text-[11px] font-medium" style={{ color: '#3B82F6' }}>Forgot?</a>
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit" disabled={authLoading}
                className="w-full py-3 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 mt-1"
                style={{ background: '#1E293B', color: '#F8FAFC', border: '1px solid #2D3F55' }}>
                {authLoading ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>Signing in…</>
                ) : 'Sign In with Email'}
              </motion.button>
            </form>

            <p className="text-center text-[13px] mt-5" style={{ color: '#64748B' }}>
              New to HashPay?{' '}
              <Link to="/signup" className="font-semibold" style={{ color: '#3B82F6' }}>Create account</Link>
            </p>

            <div className="flex items-center justify-center gap-4 mt-6 pt-5" style={{ borderTop: '1px solid #1E293B' }}>
              {[
                { icon: <Shield size={11} style={{ color: '#22C55E' }} />, label: 'AES-256' },
                { icon: <Key    size={11} style={{ color: '#3B82F6' }} />, label: 'MPC Auth' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase" style={{ color: '#334155' }}>
                  {b.icon}{b.label}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="relative z-10 py-4 px-6" style={{ borderTop: '1px solid #1E293B' }}>
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-[12px]" style={{ color: '#334155' }}>
          <div className="flex items-center gap-4">
            {['Privacy Policy', 'Terms of Service', 'Security Audit'].map(l => (
              <a key={l} href="#" className="transition-colors hover:text-[#64748B]">{l}</a>
            ))}
          </div>
          <span>© 2024 HashPay Global</span>
        </div>
      </footer>
    </div>
  )
}
