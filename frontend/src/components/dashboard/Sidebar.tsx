import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Repeat2, Droplets, PieChart, ArrowRightLeft, LogOut, ChevronRight } from 'lucide-react'
import { HashPayIcon } from '../../components/ui/HashPayLogo'
import { useStore } from '../../store/useStore'

const navItems = [
  { to: '/dashboard',           label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/swap',      label: 'Swap',      icon: Repeat2 },
  { to: '/dashboard/pools',     label: 'Pools',     icon: Droplets },
  { to: '/dashboard/portfolio', label: 'Portfolio', icon: PieChart },
  { to: '/dashboard/offramp',   label: 'Offramp',   icon: ArrowRightLeft },
]

export const Sidebar: React.FC = () => {
  const wallet = useStore(s => s.wallet)
  const disconnectWallet = useStore(s => s.disconnectWallet)
  const navigate = useNavigate()

  return (
    <aside
      className="w-[220px] h-screen flex flex-col fixed left-0 top-0 z-30"
      style={{
        background: 'linear-gradient(180deg, #0A1628 0%, #07111F 100%)',
        borderRight: '1px solid #1E293B',
      }}
    >
      {/* ── Logo ── */}
      <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #1E293B' }}>
        <HashPayIcon size={32} />
        <div>
          <div className="text-[14px] font-bold tracking-tight" style={{ color: '#F8FAFC' }}>HashPay</div>
          <div className="text-[9px] font-semibold tracking-[0.18em] uppercase" style={{ color: '#334155' }}>Global</div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
        <div className="text-[9px] font-semibold tracking-[0.14em] uppercase px-3 mb-2" style={{ color: '#334155' }}>
          Navigation
        </div>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200 relative group ${
                isActive ? 'text-[#F8FAFC]' : 'hover:text-[#F8FAFC]'
              }`
            }
            style={({ isActive }) => isActive
              ? { background: 'rgba(59,130,246,0.12)', color: '#F8FAFC' }
              : { color: '#64748B' }
            }
          >
            {({ isActive }) => (
              <>
                {/* Active left bar */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: 'linear-gradient(180deg, #3B82F6, #06B6D4)' }}
                  />
                )}
                <div
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-all"
                  style={isActive
                    ? { background: 'rgba(59,130,246,0.2)', color: '#3B82F6' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#64748B' }
                  }
                >
                  <Icon size={14} />
                </div>
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} style={{ color: '#3B82F6', opacity: 0.6 }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Wallet pill ── */}
      <div className="px-3 pb-4 flex flex-col gap-2" style={{ borderTop: '1px solid #1E293B', paddingTop: 16 }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] cursor-pointer transition-all hover:border-[#2D3F55]"
          style={{ background: '#0F172A', border: '1px solid #1E293B' }}
        >
          <div className="relative flex-shrink-0">
            <HashPayIcon size={26} />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
              style={{
                background: wallet.isConnected ? '#22C55E' : '#334155',
                borderColor: '#07111F',
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono truncate" style={{ color: '#94A3B8' }}>
              {wallet.address}
            </div>
            <div className="text-[10px] font-medium" style={{ color: wallet.isConnected ? '#22C55E' : '#334155' }}>
              {wallet.isConnected ? '● Connected' : '○ Disconnected'}
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => { disconnectWallet(); navigate('/login') }}
          className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-medium transition-all w-full"
          style={{ color: '#64748B' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#EF4444'
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#64748B'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut size={14} />
          Sign Out
        </motion.button>
      </div>
    </aside>
  )
}
