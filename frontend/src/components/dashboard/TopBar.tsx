import React, { useState, useRef, useCallback } from 'react'
import { Menu, Moon, Sun } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'
import { useClickOutside } from '../ui/useClickOutside'
import { useFlatTheme } from '../ui/FlatShell'
import { useNavigate } from 'react-router-dom'

export const TopBar: React.FC = () => {
  const notifications    = useStore(s => s.ui.notifications)
  const markRead         = useStore(s => s.markNotificationsRead)
  const disconnectWallet = useStore(s => s.disconnectWallet)
  const toggleSidebar    = useStore(s => s.toggleSidebar)
  const apiLogout        = useApiStore(s => s.logout)
  const user             = useApiStore(s => s.user)
  const navigate         = useNavigate()
  const { dark, toggle } = useFlatTheme()

  const [showNotifs, setShowNotifs] = useState(false)
  const [showUser,   setShowUser]   = useState(false)

  const notifsRef = useRef<HTMLDivElement>(null)
  const userRef   = useRef<HTMLDivElement>(null)
  useClickOutside(notifsRef, useCallback(() => setShowNotifs(false), []))
  useClickOutside(userRef,   useCallback(() => setShowUser(false),   []))

  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="dash-top">
      <button className="dash-iconbtn dash-menu" onClick={toggleSidebar} aria-label="Toggle menu">
        <Menu size={16} />
      </button>

      <input className="lp-input dash-search" type="search" placeholder="Search tokens and markets" aria-label="Search tokens and markets" />

      <div className="grow" />

      <span className="dash-net"><i />Sui mainnet</span>

      <div className="dash-menu-wrap" ref={notifsRef}>
        <button
          className="dash-iconbtn"
          onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); if (!showNotifs) markRead() }}
          aria-expanded={showNotifs} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          Alerts{unread > 0 && <span className="dash-count">{unread}</span>}
        </button>

        {showNotifs && (
          <div className="dash-pop" role="menu">
            <div className="row head">Notifications</div>
            {notifications.length === 0 && <div className="row">You have no notifications.</div>}
            {notifications.map(n => (
              <div key={n.id} className={`row${!n.read ? ' unread' : ''}`}>{n.message}</div>
            ))}
          </div>
        )}
      </div>

      <button className="dash-iconbtn" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="dash-menu-wrap" ref={userRef}>
        <button
          className="dash-iconbtn"
          onClick={() => { setShowUser(!showUser); setShowNotifs(false) }}
          aria-expanded={showUser}
        >
          Account
        </button>

        {showUser && (
          <div className="dash-pop" role="menu">
            <div className="row">
              <b>{user?.fullName ?? 'My account'}</b>
              <div className="mono">{user?.suiAddress ?? user?.evmAddress ?? user?.email ?? '—'}</div>
            </div>
            <button className="row" onClick={() => { apiLogout(); disconnectWallet(); navigate('/login') }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
