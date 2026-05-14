import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { HashPayIcon } from '../../components/ui/HashPayLogo'
import { useStore } from '../../store/useStore'
import { useNavigate } from 'react-router-dom'

const dropdownVariants = {
  hidden:  { opacity: 0, y: 6, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: 6, scale: 0.97 },
}

export const TopBar: React.FC = () => {
  const notifications   = useStore(s => s.ui.notifications)
  const markRead        = useStore(s => s.markNotificationsRead)
  const disconnectWallet = useStore(s => s.disconnectWallet)
  const navigate        = useNavigate()

  const [showNotifs, setShowNotifs] = useState(false)
  const [showUser,   setShowUser]   = useState(false)

  const unread = notifications.filter(n => !n.read).length

  return (
    <div
      className="h-14 flex-shrink-0 flex items-center gap-3 px-6 z-20"
      style={{
        background: 'rgba(7,17,31,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #1E293B',
      }}
    >
      {/* Search */}
      <div className="flex-1 relative max-w-[340px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#334155' }} />
        <input
          type="text"
          placeholder="Search tokens, markets…"
          className="w-full rounded-[10px] pl-9 pr-4 py-2 text-[13px] transition-all"
          style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            color: '#F8FAFC',
          }}
        />
      </div>

      <div className="flex-1" />

      {/* Network badge */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-[8px]"
        style={{ background: '#0F172A', border: '1px solid #1E293B' }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
        <span className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: '#64748B' }}>
          ETH Mainnet
        </span>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); if (!showNotifs) markRead() }}
          className="relative p-2 rounded-[8px] transition-all"
          style={{ color: '#64748B' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0F172A'; e.currentTarget.style.color = '#F8FAFC' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}
          aria-label="Notifications"
        >
          <Bell size={17} />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
              style={{ background: '#EF4444' }}
            >
              {unread}
            </span>
          )}
        </button>

        <AnimatePresence>
          {showNotifs && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-[320px] rounded-[16px] shadow-2xl overflow-hidden z-50"
              style={{ background: '#0F172A', border: '1px solid #1E293B' }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1E293B' }}>
                <span className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>Notifications</span>
                <span className="text-[11px] font-medium" style={{ color: '#3B82F6' }}>Mark all read</span>
              </div>
              {notifications.map(n => (
                <div
                  key={n.id}
                  className="px-4 py-3 flex items-start gap-3 transition-colors"
                  style={{
                    borderBottom: '1px solid #162033',
                    background: !n.read ? 'rgba(59,130,246,0.04)' : 'transparent',
                  }}
                >
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#3B82F6' }} />
                  )}
                  <p className="text-[12px] leading-relaxed" style={{ color: '#94A3B8' }}>{n.message}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User avatar */}
      <div className="relative">
        <button
          onClick={() => { setShowUser(!showUser); setShowNotifs(false) }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-[10px] transition-all"
          style={{ border: '1px solid transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0F172A'; e.currentTarget.style.borderColor = '#1E293B' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
        >
          <HashPayIcon size={26} />
          <ChevronDown size={13} style={{ color: '#64748B' }} />
        </button>

        <AnimatePresence>
          {showUser && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-[200px] rounded-[16px] shadow-2xl overflow-hidden z-50"
              style={{ background: '#0F172A', border: '1px solid #1E293B' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1E293B' }}>
                <div className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>My Account</div>
                <div className="text-[11px] font-mono mt-0.5" style={{ color: '#64748B' }}>0x123...4567</div>
              </div>
              {[
                { icon: User,     label: 'Profile' },
                { icon: Settings, label: 'Settings' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-all"
                  style={{ color: '#94A3B8' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#162033'; e.currentTarget.style.color = '#F8FAFC' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #1E293B' }} />
              <button
                onClick={() => { disconnectWallet(); navigate('/login') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-all"
                style={{ color: '#EF4444' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
