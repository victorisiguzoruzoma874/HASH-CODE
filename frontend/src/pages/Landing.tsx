import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Zap, Globe, ArrowRight, CheckCircle, TrendingUp, Lock } from 'lucide-react'
import { HashPayLogo, HashPayIcon } from '../components/ui/HashPayLogo'

const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub: string; delay: number; accent: string
}> = ({ icon, label, value, sub, delay, accent }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    className="flex-1 bg-white rounded-2xl text-center"
    style={{ padding: '32px 28px', boxShadow: '0 2px 8px rgba(10,25,41,0.08)', border: '1px solid #DDE6F2' }}
  >
    <div className="flex justify-center mb-4" style={{ color: accent }}>{icon}</div>
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A97B4', marginBottom: 10 }}>
      {label}
    </div>
    <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", color: accent, marginBottom: 6 }}>
      {value}
    </div>
    <div style={{ fontSize: 13, fontWeight: 600, color: '#7A97B4' }}>{sub}</div>
  </motion.div>
)

const features = [
  { icon: Zap,         title: 'Instant Swaps',       desc: 'Cross-chain token exchange in under 400ms with built-in MEV protection.' },
  { icon: Shield,      title: 'Bank-Grade Security',  desc: 'AES-256 encryption and secp256k1 signed quotes on every transaction.' },
  { icon: Globe,       title: 'African Currencies',   desc: 'Direct settlement to NGN, GHS, KES, XOF and XAF bank accounts.' },
  { icon: Lock,        title: 'Non-Custodial',        desc: 'Your keys, your assets. We never hold your funds.' },
  { icon: TrendingUp,  title: 'Up to 12% APY',        desc: 'Earn yield through audited, battle-tested liquidity pools.' },
  { icon: CheckCircle, title: 'KYC-Gated Offramp',   desc: 'Convert crypto and settle to any local bank account in minutes.' },
]

export const Landing: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: '#F0F4FA' }}>

      {/* Navbar */}
      <nav
        className="sticky top-0 z-40 w-full bg-white"
        style={{ borderBottom: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.06)' }}
      >
        <div className="max-w-[1200px] mx-auto px-8 h-[72px] flex items-center justify-between">
          <Link to="/"><HashPayLogo size={38} /></Link>

          <div className="hidden md:flex items-center gap-8">
            {['Ecosystem', 'Technology', 'Security', 'Docs'].map(item => (
              <a key={item} href="#"
                style={{ fontSize: 15, fontWeight: 700, color: '#3D5A78', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#3D5A78' }}
              >
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"
              style={{
                padding: '10px 22px', fontSize: 14, fontWeight: 800, borderRadius: 999,
                color: '#0B50D4', border: '2px solid #0B50D4', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E8EFFE' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Log In
            </Link>
            <Link to="/signup"
              style={{
                padding: '10px 22px', fontSize: 14, fontWeight: 800, borderRadius: 999,
                background: '#0B50D4', color: '#fff', textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(11,80,212,0.3)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0840AA' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
            >
              Get Started Free
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
            style={{ color: '#0A1929' }}>
            <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <div className={`w-5 h-0.5 bg-current my-1 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>

        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="md:hidden px-8 py-5 flex flex-col gap-4 bg-white"
            style={{ borderTop: '1px solid #DDE6F2' }}>
            {['Ecosystem', 'Technology', 'Security', 'Docs'].map(item => (
              <a key={item} href="#" style={{ fontSize: 15, fontWeight: 700, color: '#3D5A78' }}>{item}</a>
            ))}
            <Link to="/signup" style={{ fontSize: 15, fontWeight: 800, color: '#0B50D4' }}>Get Started Free →</Link>
          </motion.div>
        )}
      </nav>

      {/* Hero */}
      <main className="relative flex-1 flex flex-col items-center px-6 pt-24 pb-20">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2.5 bg-white rounded-full mb-10"
          style={{ padding: '8px 18px', border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.06)' }}
        >
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#057A4B' }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#057A4B' }}>
            Live on SUI + Ethereum Mainnet
          </span>
        </motion.div>

        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 36 }}
        >
          <HashPayIcon size={96} />
        </motion.div>

        {/* Headline — bold & confident */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          style={{
            fontSize: 'clamp(48px, 8vw, 88px)',
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
            textAlign: 'center',
            color: '#0A1929',
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          DeFi Payments{' '}
          <span style={{
            background: 'linear-gradient(135deg, #0B50D4 0%, #0891B2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Built for Africa.
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          style={{
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.6,
            textAlign: 'center',
            color: '#3D5A78',
            maxWidth: 520,
            marginBottom: 40,
          }}
        >
          Swap, send, and convert crypto across chains — with direct bank settlement
          to NGN, GHS, KES and beyond.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4"
          style={{ marginBottom: 36 }}
        >
          <Link to="/signup"
            className="flex items-center gap-2 rounded-full transition-all"
            style={{
              padding: '16px 36px',
              fontSize: 16,
              fontWeight: 800,
              background: '#0B50D4',
              color: '#fff',
              textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(11,80,212,0.32)',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0840AA'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Create Free Account <ArrowRight size={18} />
          </Link>
          <Link to="/login"
            className="flex items-center gap-2 rounded-full transition-all"
            style={{
              padding: '16px 36px',
              fontSize: 16,
              fontWeight: 800,
              color: '#0B50D4',
              border: '2px solid #0B50D4',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E8EFFE' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Log In
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex items-center gap-3"
          style={{ marginBottom: 88 }}
        >
          <div className="flex -space-x-2.5">
            {['#0B50D4','#057A4B','#B45309','#7C3AED','#0891B2'].map((c, i) => (
              <div key={i}
                className="rounded-full flex items-center justify-center text-white"
                style={{ width: 32, height: 32, fontSize: 11, fontWeight: 800, background: c, border: '2px solid #F0F4FA' }}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#7A97B4' }}>
            Trusted by <strong style={{ color: '#0A1929', fontWeight: 900 }}>12,400+</strong> users worldwide
          </span>
        </motion.div>

        {/* Stats */}
        <div className="w-full flex flex-col md:flex-row gap-5" style={{ maxWidth: 860, marginBottom: 100 }}>
          <StatCard icon={<Zap size={24} />}    label="Transaction Speed" value="297k"   sub="Transactions Per Second" delay={0.55} accent="#057A4B" />
          <StatCard icon={<Shield size={24} />}  label="Confirmation Time"  value="<400ms" sub="End-to-end latency"       delay={0.65} accent="#0891B2" />
          <StatCard icon={<Globe size={24} />}   label="Global Nodes"       value="1,400+" sub="Distributed worldwide"    delay={0.75} accent="#0B50D4" />
        </div>

        {/* Features section */}
        <div className="w-full" style={{ maxWidth: 1000 }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center"
            style={{ marginBottom: 48 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full"
              style={{ padding: '6px 16px', background: '#E8EFFE', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0B50D4' }}>
                Everything you need
              </span>
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#0A1929', lineHeight: 1.1 }}>
              Built for the next generation<br />of African finance
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.07, duration: 0.4 }}
                className="bg-white rounded-2xl cursor-default transition-all duration-200"
                style={{ padding: '32px 28px', border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.05)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(10,25,41,0.1)'
                  e.currentTarget.style.borderColor = '#C4D4E8'
                  e.currentTarget.style.transform = 'translateY(-3px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(10,25,41,0.05)'
                  e.currentTarget.style.borderColor = '#DDE6F2'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{ width: 48, height: 48, background: '#E8EFFE', marginBottom: 20 }}
                >
                  <Icon size={20} style={{ color: '#0B50D4' }} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1929', marginBottom: 10, letterSpacing: '-0.01em' }}>
                  {title}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#3D5A78', lineHeight: 1.65 }}>
                  {desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA / trust section */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="w-full bg-white rounded-3xl text-center"
          style={{
            maxWidth: 1000,
            marginTop: 80,
            padding: '64px 48px',
            border: '1px solid #DDE6F2',
            boxShadow: '0 4px 24px rgba(10,25,41,0.07)',
          }}
        >
          {/* Trust badges row */}
          <div className="flex flex-wrap items-center justify-center gap-10" style={{ marginBottom: 48 }}>
            {[
              { icon: <Shield size={19} style={{ color: '#057A4B' }} />, label: 'AES-256 Encryption' },
              { icon: <Lock   size={19} style={{ color: '#0B50D4' }} />, label: 'MPC Authentication' },
              { icon: <CheckCircle size={19} style={{ color: '#0891B2' }} />, label: 'KYC Verified' },
              { icon: <Zap   size={19} style={{ color: '#B45309' }} />, label: 'secp256k1 Quotes' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-2.5" style={{ fontSize: 14, fontWeight: 700, color: '#3D5A78' }}>
                {b.icon}{b.label}
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#0A1929', marginBottom: 12, lineHeight: 1.08 }}>
            Ready to go kinetic?
          </h3>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#3D5A78', marginBottom: 36 }}>
            Join 12,400+ users already using HashPay Global.
          </p>
          <Link to="/signup"
            className="inline-flex items-center gap-2 rounded-full transition-all"
            style={{
              padding: '17px 44px',
              fontSize: 16,
              fontWeight: 800,
              background: '#0B50D4',
              color: '#fff',
              textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(11,80,212,0.3)',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0840AA'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Create Free Account <ArrowRight size={18} />
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white" style={{ borderTop: '1px solid #DDE6F2', marginTop: 24 }}>
        <div className="max-w-[1200px] mx-auto px-8 py-14">
          <div className="flex flex-col md:flex-row items-start justify-between gap-12" style={{ marginBottom: 40 }}>
            <div>
              <HashPayLogo size={34} />
              <p style={{ fontSize: 14, fontWeight: 500, color: '#7A97B4', maxWidth: 220, lineHeight: 1.65, marginTop: 12 }}>
                Fast, secure, decentralised DeFi payments on SUI + Ethereum.
              </p>
            </div>
            <div className="flex gap-16">
              {[
                { heading: 'Product', links: ['Swap', 'Pools', 'Portfolio', 'Offramp'] },
                { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
                { heading: 'Legal',   links: ['Privacy', 'Terms', 'Security', 'Audit'] },
              ].map(col => (
                <div key={col.heading}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A8BDD4', marginBottom: 16 }}>
                    {col.heading}
                  </div>
                  <div className="flex flex-col gap-3">
                    {col.links.map(l => (
                      <a key={l} href="#"
                        style={{ fontSize: 14, fontWeight: 600, color: '#7A97B4', textDecoration: 'none', transition: 'color 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#7A97B4' }}
                      >
                        {l}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6" style={{ borderTop: '1px solid #DDE6F2' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#A8BDD4' }}>
              © 2026 HashPay Global · All rights reserved
            </p>
            <div className="flex items-center gap-6">
              {['Privacy', 'Terms'].map(l => (
                <a key={l} href="#" style={{ fontSize: 13, fontWeight: 700, color: '#7A97B4', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#7A97B4' }}>
                  {l}
                </a>
              ))}
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                style={{ color: '#7A97B4', transition: 'color 0.2s' }} aria-label="Twitter"
                onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#7A97B4' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                style={{ color: '#7A97B4', transition: 'color 0.2s' }} aria-label="GitHub"
                onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#7A97B4' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
