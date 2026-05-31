import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, ChevronDown, User, Settings, LogOut, Menu } from 'lucide-react'
import { HashPayIcon } from '../../components/ui/HashPayLogo'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'
import { useClickOutside } from '../ui/useClickOutside'
import { useNavigate } from 'react-router-dom'

const dropdownVariants = {
  hidden:  { opacity: 0, y: 8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: 8, scale: 0.97 },
}

export const TopBar: React.FC = () => {
  const notifications    = useStore(s => s.ui.notifications)
  const markRead         = useStore(s => s.markNotificationsRead)
  const disconnectWallet = useStore(s => s.disconnectWallet)
  const toggleSidebar    = useStore(s => s.toggleSidebar)
  const apiLogout        = useApiStore(s => s.logout)
  const user             = useApiStore(s => s.user)
  const navigate         = useNavigate()

  const [showNotifs, setShowNotifs] = useState(false)
  const [showUser,   setShowUser]   = useState(false)

  const notifsRef = useRef<HTMLDivElement>(null)
  const userRef   = useRef<HTMLDivElement>(null)
  useClickOutside(notifsRef, useCallback(() => setShowNotifs(false), []))
  useClickOutside(userRef,   useCallback(() => setShowUser(false),   []))

  const unread = notifications.filter(n => !n.read).length

  return (
    <div
      className="h-14 flex-shrink-0 flex items-center gap-3 px-5 z-20 bg-white"
      style={{ borderBottom: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.05)' }}
    >
      {/* Hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-lg transition-all flex-shrink-0"
        style={{ color: '#7A97B4' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EEF3FB'; e.currentTarget.style.color = '#0A1929' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A97B4' }}
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="flex-1 relative max-w-[300px]">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#A8BDD4' }} />
        <input
          type="text"
          placeholder="Search tokens, markets…"
          className="w-full rounded-full pl-9 pr-4 py-2 text-[13px] font-semibold transition-all"
          style={{
            background: '#EEF3FB',
            border: '1px solid #DDE6F2',
            color: '#0A1929',
          }}
        />
      </div>

      <div className="flex-1" />

      {/* Network badge */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ background: '#E4F7EE', border: '1px solid rgba(5,122,75,0.2)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#057A4B' }} />
        <span className="text-[11px] font-bold tracking-[0.05em]" style={{ color: '#057A4B' }}>
          Sui Mainnet
        </span>
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifsRef}>
        <button
          onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); if (!showNotifs) markRead() }}
          className="relative p-2 rounded-lg transition-all"
          style={{ color: '#7A97B4' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EEF3FB'; e.currentTarget.style.color = '#0A1929' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A97B4' }}
          aria-label="Notifications"
        >
          <Bell size={17} />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center"
              style={{ background: '#C5202B' }}
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
              className="absolute right-0 top-full mt-2 w-[320px] rounded-2xl overflow-hidden z-50 bg-white"
              style={{ border: '1px solid #DDE6F2', boxShadow: '0 16px 48px rgba(10,25,41,0.12)' }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #DDE6F2' }}>
                <span className="text-[13px] font-bold" style={{ color: '#0A1929' }}>Notifications</span>
                <span className="text-[11px] font-bold cursor-pointer" style={{ color: '#0B50D4' }}>Mark all read</span>
              </div>
              {notifications.map(n => (
                <div
                  key={n.id}
                  className="px-4 py-3 flex items-start gap-3"
                  style={{
                    borderBottom: '1px solid #EEF3FB',
                    background: !n.read ? '#F4F8FD' : 'transparent',
                  }}
                >
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#0B50D4' }} />
                  )}
                  <p className="text-[12px] font-semibold leading-relaxed" style={{ color: '#3D5A78' }}>{n.message}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => { setShowUser(!showUser); setShowNotifs(false) }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all"
          style={{ border: '1px solid transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EEF3FB'; e.currentTarget.style.borderColor = '#DDE6F2' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
        >
          <HashPayIcon size={26} />
          <ChevronDown size={13} style={{ color: '#7A97B4' }} />
        </button>

        <AnimatePresence>
          {showUser && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden" animate="visible" exit="exit"
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-[210px] rounded-2xl overflow-hidden z-50 bg-white"
              style={{ border: '1px solid #DDE6F2', boxShadow: '0 16px 48px rgba(10,25,41,0.12)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #DDE6F2' }}>
                <div className="text-[13px] font-bold" style={{ color: '#0A1929' }}>
                  {user?.fullName ?? 'My Account'}
                </div>
                <div className="text-[11px] font-mono mt-0.5 truncate font-semibold" style={{ color: '#7A97B4' }}>
                  {user?.suiAddress ?? user?.evmAddress ?? user?.email ?? '—'}
                </div>
              </div>
              {[
                { icon: User,     label: 'Profile' },
                { icon: Settings, label: 'Settings' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-all"
                  style={{ color: '#3D5A78' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD'; e.currentTarget.style.color = '#0A1929' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3D5A78' }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
              <div style={{ borderTop: '1px solid #DDE6F2' }} />
              <button
                onClick={() => { apiLogout(); disconnectWallet(); navigate('/login') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold transition-all"
                style={{ color: '#C5202B' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FDECEA' }}
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
