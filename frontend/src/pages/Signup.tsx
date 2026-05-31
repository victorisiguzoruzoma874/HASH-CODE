import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, Shield, Cpu, AlertCircle } from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'
import { HashPayLogo, HashPayIcon } from '../components/ui/HashPayLogo'
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
  const strengthColors    = ['#DDE6F2', '#C5202B', '#B45309', '#0B50D4', '#057A4B']
  const strengthLabels    = ['', 'Weak', 'Fair', 'Good', 'Strong']

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px 14px 44px',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 12,
    border: '1.5px solid #C4D4E8',
    background: '#F8FAFD',
    color: '#0A1929',
    outline: 'none',
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#EEF3FB' }}>

      {/* Full-width Nav */}
      <nav className="w-full bg-white" style={{ borderBottom: '1px solid #DDE6F2', boxShadow: '0 1px 3px rgba(10,25,41,0.06)' }}>
        <div className="max-w-[1200px] mx-auto px-8 h-[68px] flex items-center justify-between">
          <Link to="/"><HashPayLogo size={34} /></Link>
          <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
            <Link to="/login" className="px-5 py-2 rounded-full text-[13px] font-bold transition-colors" style={{ color: '#7A97B4' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#7A97B4' }}>
              Log In
            </Link>
            <span className="px-5 py-2 rounded-full text-[13px] font-bold" style={{ background: '#0B50D4', color: '#fff' }}>
              Sign Up
            </span>
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
          style={{ maxWidth: 520 }}
        >
          {/* Above-card header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <HashPayIcon size={52} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0A1929', marginBottom: 6 }}>
              Create your account
            </h1>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#7A97B4' }}>
              Free forever. No credit card required.
            </p>
          </div>

          <div
            className="bg-white rounded-3xl"
            style={{
              padding: '44px 44px',
              boxShadow: '0 4px 24px rgba(10,25,41,0.09), 0 1px 4px rgba(10,25,41,0.05)',
              border: '1px solid #DDE6F2',
            }}
          >
            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-2xl"
                style={{ padding: '14px 16px', background: '#FDECEA', border: '1px solid rgba(197,32,43,0.18)', marginBottom: 24 }}
              >
                <AlertCircle size={15} style={{ color: '#C5202B', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#C5202B' }}>{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Full Name */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3D5A78', marginBottom: 8 }}>
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute top-1/2 -translate-y-1/2" style={{ left: 16, color: '#A8BDD4' }} />
                  <input
                    type="text" placeholder="Your full name" value={name}
                    onChange={e => setName(e.target.value)} required
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11,80,212,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3D5A78', marginBottom: 8 }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute top-1/2 -translate-y-1/2" style={{ left: 16, color: '#A8BDD4' }} />
                  <input
                    type="email" placeholder="you@example.com" value={email}
                    onChange={e => setEmail(e.target.value)} required
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11,80,212,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3D5A78', marginBottom: 8 }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute top-1/2 -translate-y-1/2" style={{ left: 16, color: '#A8BDD4' }} />
                  <input
                    type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8}
                    style={{ ...inputStyle, paddingRight: 48 }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(11,80,212,0.1)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute top-1/2 -translate-y-1/2" style={{ right: 16, color: '#A8BDD4' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {password && (
                  <div style={{ marginTop: 10 }}>
                    <div className="flex gap-1.5" style={{ marginBottom: 6 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{
                          height: 4, flex: 1, borderRadius: 99,
                          background: i <= strength ? strengthColors[strength] : '#DDE6F2',
                          transition: 'background 0.3s',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: strengthColors[strength] }}>
                      {strengthLabels[strength]}
                    </span>
                  </div>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer" style={{ marginBottom: 28 }}>
                <div className="relative flex-shrink-0" style={{ marginTop: 2 }}>
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
                  <div
                    className="flex items-center justify-center transition-all"
                    style={{
                      width: 18, height: 18, borderRadius: 5,
                      border: agreed ? '2px solid #057A4B' : '2px solid #C4D4E8',
                      background: agreed ? '#057A4B' : '#fff',
                    }}
                  >
                    {agreed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: '#3D5A78' }}>
                  I agree to the{' '}
                  <a href="#" style={{ color: '#0B50D4', fontWeight: 700, textDecoration: 'none' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" style={{ color: '#0B50D4', fontWeight: 700, textDecoration: 'none' }}>Privacy Policy</a>
                </span>
              </label>

              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                type="submit" disabled={authLoading || !agreed}
                className="w-full flex items-center justify-center gap-2 rounded-full font-bold transition-all"
                style={{
                  padding: '15px 24px',
                  fontSize: 15,
                  background: '#0B50D4',
                  color: '#fff',
                  boxShadow: (!authLoading && agreed) ? '0 4px 16px rgba(11,80,212,0.28)' : 'none',
                  opacity: (!authLoading && agreed) ? 1 : 0.5,
                  marginBottom: 20,
                }}
                onMouseEnter={e => { if (!authLoading && agreed) e.currentTarget.style.background = '#0840AA' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
              >
                {authLoading ? <><Spinner size={17} />Creating Account…</> : 'Create Free Account'}
              </motion.button>
            </form>

            <p className="text-center" style={{ fontSize: 14, fontWeight: 600, color: '#7A97B4' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#0B50D4', fontWeight: 800, textDecoration: 'none' }}>Log in</Link>
            </p>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-8" style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #EEF3FB' }}>
              {[
                { icon: <Shield size={13} style={{ color: '#057A4B' }} />, label: 'AES-256 Encrypted' },
                { icon: <Cpu    size={13} style={{ color: '#0B50D4' }} />, label: 'Non-Custodial' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A8BDD4' }}>
                  {b.icon}{b.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-6">
            {['Privacy Policy', 'Terms of Service', 'Security Audit'].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, fontWeight: 600, color: '#A8BDD4', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#A8BDD4' }}>{l}</a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
