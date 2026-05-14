import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, Shield, Cpu, AlertCircle } from 'lucide-react'
import { HashPayLogo } from '../components/ui/HashPayLogo'
import { useApiStore } from '../store/useApiStore'

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

  const handleSubmit = async (e: React.FormEvent) => {
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
  const strengthColors = ['#334155', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E']
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#07111F' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }} className="relative z-10 mb-2">
        <HashPayLogo size={40} />
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="relative z-10 text-[13px] text-center mb-8 tracking-wide" style={{ color: '#64748B' }}>
        Enter the Ether of Decentralized Finance
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[440px] rounded-[24px] p-8"
        style={{ background: '#0F172A', border: '1px solid #1E293B' }}>

        <div className="mb-6">
          <h2 className="text-[20px] font-bold mb-1" style={{ color: '#F8FAFC' }}>Create Account</h2>
          <p className="text-[13px]" style={{ color: '#64748B' }}>Join the next generation of kinetic asset management.</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Full Name */}
          <div>
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase block mb-1.5" style={{ color: '#64748B' }}>Full Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
              <input type="text" placeholder="Satoshi Nakamoto" value={name}
                onChange={e => setName(e.target.value)} required
                className="w-full rounded-[12px] pl-10 pr-4 py-3 text-[14px] transition-all"
                style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase block mb-1.5" style={{ color: '#64748B' }}>Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
              <input type="email" placeholder="name@kinetic.io" value={email}
                onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-[12px] pl-10 pr-4 py-3 text-[14px] transition-all"
                style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase block mb-1.5" style={{ color: '#64748B' }}>Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
              <input type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full rounded-[12px] pl-10 pr-10 py-3 text-[14px] transition-all"
                style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: '#64748B' }}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: i <= strength ? strengthColors[strength] : '#1E293B' }} />
                  ))}
                </div>
                <div className="text-[10px] font-medium" style={{ color: strengthColors[strength] }}>
                  {strengthLabels[strength]}
                </div>
              </div>
            )}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5 flex-shrink-0">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
              <div className="w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all"
                style={agreed ? { background: '#22C55E', borderColor: '#22C55E' } : { background: 'transparent', borderColor: '#1E293B' }}>
                {agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#07111F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-[12px] leading-relaxed" style={{ color: '#64748B' }}>
              I agree to the <a href="#" style={{ color: '#3B82F6' }}>Terms of Service</a> and{' '}
              <a href="#" style={{ color: '#3B82F6' }}>Privacy Policy</a> regarding my digital asset sovereignty.
            </span>
          </label>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" disabled={authLoading || !agreed}
            className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 mt-1"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', color: '#fff' }}>
            {authLoading ? (
              <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>Creating Account…</>
            ) : 'Create Account'}
          </motion.button>
        </form>

        <p className="text-center text-[13px] mt-5" style={{ color: '#64748B' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold" style={{ color: '#3B82F6' }}>Sign in</Link>
        </p>

        <div className="flex items-center justify-center gap-4 mt-6 pt-5" style={{ borderTop: '1px solid #1E293B' }}>
          {[
            { icon: <Shield size={11} style={{ color: '#22C55E' }} />, label: 'AES-256 Encrypted' },
            { icon: <Cpu    size={11} style={{ color: '#3B82F6' }} />, label: 'Decentralized Auth' },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase" style={{ color: '#334155' }}>
              {b.icon}{b.label}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="relative z-10 mt-8 flex items-center gap-4 text-[12px]" style={{ color: '#334155' }}>
        {['Privacy Policy', 'Terms of Service', 'Security Audit'].map(l => (
          <a key={l} href="#" className="transition-colors hover:text-[#64748B]">{l}</a>
        ))}
      </div>
      <p className="relative z-10 mt-2 text-[11px]" style={{ color: '#334155' }}>© 2024 HashPay Global</p>
    </div>
  )
}
