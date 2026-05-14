import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Zap, Globe, ArrowRight, CheckCircle, TrendingUp, Lock } from 'lucide-react'
import { HashPayLogo, HashPayIcon } from '../components/ui/HashPayLogo'

// ── Stat card ─────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub: string; delay: number; accent: string
}> = ({ icon, label, value, sub, delay, accent }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    className="flex-1 relative overflow-hidden rounded-[20px] p-6 text-center"
    style={{ background: '#0F172A', border: '1px solid #1E293B' }}
  >
    <div className="absolute inset-0 pointer-events-none"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}12 0%, transparent 65%)` }} />
    <div className="relative">
      <div className="flex justify-center mb-3" style={{ color: accent }}>{icon}</div>
      <div className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: '#64748B' }}>{label}</div>
      <div className="text-[34px] font-bold leading-none mb-1 font-mono" style={{ color: accent }}>{value}</div>
      <div className="text-[12px]" style={{ color: '#475569' }}>{sub}</div>
    </div>
  </motion.div>
)

// ── Feature cards ─────────────────────────────────────────────
const featureAccents = ['#3B82F6', '#22C55E', '#06B6D4', '#8B5CF6', '#22C55E', '#3B82F6']
const features = [
  { icon: Zap,         title: 'Instant Swaps',       desc: 'Cross-chain token exchange in under 400ms with MEV protection built in.' },
  { icon: Shield,      title: 'ZK-SNARK Security',   desc: 'Every transaction is cryptographically verified on-chain, zero trust required.' },
  { icon: Globe,       title: '1,400+ Global Nodes', desc: 'Decentralised infrastructure with 99.99% uptime SLA across 6 continents.' },
  { icon: Lock,        title: 'AES-256 + MPC Auth',  desc: 'Military-grade encryption combined with multi-party computation wallets.' },
  { icon: TrendingUp,  title: 'Up to 12% APY',       desc: 'Earn yield on idle assets through audited, battle-tested liquidity pools.' },
  { icon: CheckCircle, title: 'KYC-Gated Offramp',   desc: 'Convert crypto to NGN and settle directly to any Nigerian bank account.' },
]

export const Landing: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: '#07111F' }}>

      {/* ── Ambient mesh ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }} />
        <div className="absolute -top-24 right-0 w-[600px] h-[600px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: 'linear-gradient(#94A3B8 1px, transparent 1px), linear-gradient(90deg, #94A3B8 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />
      </div>

      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-40"
        style={{ background: 'rgba(7,17,31,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1E293B' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/"><HashPayLogo size={36} /></Link>

          <div className="hidden md:flex items-center gap-8">
            {['Ecosystem', 'Technology', 'Security', 'Docs'].map(item => (
              <a key={item} href="#"
                className="text-[14px] transition-colors duration-200"
                style={{ color: '#64748B' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748B' }}
              >
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"
              className="px-4 py-2 text-[13px] font-medium rounded-[10px] transition-all duration-200"
              style={{ border: '1px solid #1E293B', color: '#94A3B8', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55'; e.currentTarget.style.color = '#F8FAFC' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#94A3B8' }}
            >
              Connect Wallet
            </Link>
            <Link to="/login"
              className="px-4 py-2 text-[13px] font-semibold rounded-[10px] transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #22C55E, #06B6D4)', color: '#07111F' }}
            >
              Launch App
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"
            style={{ color: '#F8FAFC' }}>
            <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <div className={`w-5 h-0.5 bg-current my-1 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>

        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="md:hidden px-6 py-4 flex flex-col gap-4"
            style={{ borderTop: '1px solid #1E293B', background: 'rgba(7,17,31,0.98)' }}>
            {['Ecosystem', 'Technology', 'Security', 'Docs'].map(item => (
              <a key={item} href="#" className="text-[14px]" style={{ color: '#64748B' }}>{item}</a>
            ))}
            <Link to="/login" className="text-[14px] font-semibold" style={{ color: '#22C55E' }}>Launch App →</Link>
          </motion.div>
        )}
      </nav>

      {/* ── Hero ── */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: '#22C55E' }}>
            Now live on SUI + Ethereum Mainnet
          </span>
        </motion.div>

        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
          style={{ filter: 'drop-shadow(0 0 48px rgba(6,182,212,0.35)) drop-shadow(0 0 96px rgba(59,130,246,0.2))' }}
        >
          <HashPayIcon size={100} />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="text-center font-bold leading-[1.05] tracking-tight mb-5"
          style={{ fontSize: 'clamp(44px, 7.5vw, 76px)', color: '#F8FAFC' }}
        >
          The Future of{' '}
          <span style={{
            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #8B5CF6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            DeFi Payments
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center max-w-[520px] mb-10 leading-relaxed"
          style={{ fontSize: 17, color: '#64748B' }}
        >
          Swap, send, and convert crypto assets across chains — with ZK-SNARK security,
          297,000 TPS throughput, and direct NGN bank settlement.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-6"
        >
          <Link to="/signup"
            className="flex items-center gap-2 px-7 py-3.5 text-[15px] font-semibold rounded-[12px] transition-all hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, #22C55E, #06B6D4)',
              color: '#07111F',
              boxShadow: '0 4px 24px rgba(34,197,94,0.2)',
            }}
          >
            Get Started Free <ArrowRight size={16} />
          </Link>
          <Link to="/login"
            className="flex items-center gap-2 px-7 py-3.5 text-[15px] font-medium rounded-[12px] transition-all"
            style={{ border: '1px solid #1E293B', color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55'; e.currentTarget.style.color = '#F8FAFC' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#94A3B8' }}
          >
            Connect Wallet
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex items-center gap-2.5 mb-20"
        >
          <div className="flex -space-x-2">
            {['#3B82F6','#22C55E','#F59E0B','#8B5CF6','#06B6D4'].map((c, i) => (
              <div key={i}
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: c, borderColor: '#07111F' }}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          <span className="text-[12px]" style={{ color: '#475569' }}>
            Trusted by <span style={{ color: '#F8FAFC', fontWeight: 600 }}>12,400+</span> users worldwide
          </span>
        </motion.div>

        {/* Stats */}
        <div className="w-full max-w-[860px] flex flex-col md:flex-row gap-4 mb-24">
          <StatCard icon={<Zap size={22} />}   label="Transaction Speed" value="297,000" sub="Transactions Per Second" delay={0.6} accent="#22C55E" />
          <StatCard icon={<Shield size={22} />} label="Practical Latency" value="<400ms"  sub="End-to-end confirmation"  delay={0.7} accent="#06B6D4" />
          <StatCard icon={<Globe size={22} />}  label="Global Nodes"      value="1,400+"  sub="Distributed worldwide"    delay={0.8} accent="#3B82F6" />
        </div>

        {/* Features grid */}
        <div className="w-full max-w-[960px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-3" style={{ color: '#3B82F6' }}>
              Everything you need
            </div>
            <h2 className="text-[28px] font-bold" style={{ color: '#F8FAFC' }}>
              Built for the next generation of finance
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.07, duration: 0.4 }}
                className="p-5 rounded-[18px] transition-all duration-300 cursor-default"
                style={{ background: '#0F172A', border: '1px solid #1E293B' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3"
                  style={{ background: `${featureAccents[i]}15` }}
                >
                  <Icon size={17} style={{ color: featureAccents[i] }} />
                </div>
                <div className="text-[14px] font-semibold mb-1.5" style={{ color: '#F8FAFC' }}>{title}</div>
                <div className="text-[13px] leading-relaxed" style={{ color: '#64748B' }}>{desc}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="w-full max-w-[960px] mt-16 rounded-[24px] p-12 text-center relative overflow-hidden"
          style={{ background: '#0F172A', border: '1px solid #1E293B' }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 65%)' }} />
          <div className="relative">
            <div className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-3" style={{ color: '#3B82F6' }}>
              Get started today
            </div>
            <h3 className="text-[28px] font-bold mb-3" style={{ color: '#F8FAFC' }}>Ready to go kinetic?</h3>
            <p className="text-[15px] mb-8" style={{ color: '#64748B' }}>
              Join 12,400+ users already using HashPay Global.
            </p>
            <Link to="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-[15px] font-semibold rounded-[12px] transition-all hover:scale-[1.03]"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #06B6D4)',
                color: '#07111F',
                boxShadow: '0 4px 28px rgba(34,197,94,0.2)',
              }}
            >
              Create Free Account <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #1E293B', background: '#07111F' }}>
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            <div>
              <HashPayLogo size={32} />
              <p className="text-[12px] mt-3 max-w-[200px] leading-relaxed" style={{ color: '#334155' }}>
                Fast, secure, decentralised DeFi payments on SUI + Ethereum.
              </p>
            </div>
            <div className="flex gap-14">
              {[
                { heading: 'Product', links: ['Swap', 'Pools', 'Portfolio', 'Offramp'] },
                { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
                { heading: 'Legal',   links: ['Privacy', 'Terms', 'Security', 'Audit'] },
              ].map(col => (
                <div key={col.heading}>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: '#334155' }}>
                    {col.heading}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {col.links.map(l => (
                      <a key={l} href="#"
                        className="text-[13px] transition-colors"
                        style={{ color: '#475569' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}
                      >
                        {l}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6" style={{ borderTop: '1px solid #1E293B' }}>
            <p className="text-[11px] tracking-[0.06em]" style={{ color: '#334155' }}>
              © 2024 HashPay Global · Protocol secured by ZK-SNARKs
            </p>
            <div className="flex items-center gap-5">
              {['Privacy', 'Terms'].map(l => (
                <a key={l} href="#" className="text-[12px] transition-colors" style={{ color: '#475569' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}>
                  {l}
                </a>
              ))}
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                className="transition-colors" style={{ color: '#475569' }} aria-label="Twitter"
                onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="transition-colors" style={{ color: '#475569' }} aria-label="GitHub"
                onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
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
