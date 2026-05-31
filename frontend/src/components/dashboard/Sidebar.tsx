import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Repeat2, Droplets, PieChart, ArrowRightLeft, LogOut, ChevronRight } from 'lucide-react'
import { HashPayIcon } from '../../components/ui/HashPayLogo'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'

const navItems = [
  { to: '/dashboard',           label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/swap',      label: 'Swap',      icon: Repeat2 },
  { to: '/dashboard/pools',     label: 'Pools',     icon: Droplets },
  { to: '/dashboard/portfolio', label: 'Portfolio', icon: PieChart },
  { to: '/dashboard/offramp',   label: 'Offramp',   icon: ArrowRightLeft },
]

export const Sidebar: React.FC = () => {
  const wallet           = useStore(s => s.wallet)
  const sidebarOpen      = useStore(s => s.ui.sidebarOpen)
  const toggleSidebar    = useStore(s => s.toggleSidebar)
  const disconnectWallet = useStore(s => s.disconnectWallet)
  const apiLogout        = useApiStore(s => s.logout)
  const navigate         = useNavigate()

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 lg:hidden"
            style={{ background: 'rgba(10,25,41,0.35)', backdropFilter: 'blur(4px)' }}
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -220 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-[220px] h-screen flex flex-col fixed left-0 top-0 z-30 bg-white"
        style={{ borderRight: '1px solid #DDE6F2', boxShadow: '2px 0 12px rgba(10,25,41,0.06)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #DDE6F2' }}>
          <HashPayIcon size={32} />
          <div>
            <div className="text-[15px] font-black tracking-tight" style={{ color: '#0A1929' }}>HashPay</div>
            <div className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: '#A8BDD4' }}>Global</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase px-3 mb-3" style={{ color: '#A8BDD4' }}>
            Navigation
          </div>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 relative ${
                  isActive ? '' : ''
                }`
              }
              style={({ isActive }) => isActive
                ? { background: '#E8EFFE', color: '#0B50D4' }
                : { color: '#7A97B4' }
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ background: '#0B50D4' }}
                    />
                  )}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                    style={isActive
                      ? { background: '#0B50D4', color: '#fff' }
                      : { background: '#F4F8FD', color: '#7A97B4' }
                    }
                  >
                    <Icon size={14} />
                  </div>
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={12} style={{ color: '#0B50D4', opacity: 0.6 }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Wallet pill */}
        <div className="px-3 pb-4 flex flex-col gap-2" style={{ borderTop: '1px solid #DDE6F2', paddingTop: 14 }}>
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: '#F4F8FD', border: '1px solid #DDE6F2' }}
          >
            <div className="relative flex-shrink-0">
              <HashPayIcon size={26} />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{
                  background: wallet.isConnected ? '#22C55E' : '#DDE6F2',
                  borderColor: '#fff',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono truncate font-semibold" style={{ color: '#3D5A78' }}>
                {wallet.address}
              </div>
              <div className="text-[10px] font-bold mt-0.5" style={{ color: wallet.isConnected ? '#057A4B' : '#A8BDD4' }}>
                {wallet.isConnected ? '● Connected' : '○ Disconnected'}
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => { apiLogout(); disconnectWallet(); navigate('/login') }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all w-full"
            style={{ color: '#7A97B4' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#C5202B'
              e.currentTarget.style.background = '#FDECEA'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#7A97B4'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={14} />
            Sign Out
          </motion.button>
        </div>
      </motion.aside>
    </>
  )
}
