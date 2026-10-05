import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'

const navItems = [
  { to: '/dashboard',           label: 'Dashboard', end: true },
  { to: '/dashboard/swap',      label: 'Swap' },
  { to: '/dashboard/portfolio', label: 'Portfolio' },
  { to: '/dashboard/offramp',   label: 'Offramp' },
]

export const Sidebar: React.FC = () => {
  const account          = useCurrentAccount()
  const { mutate: disconnect } = useDisconnectWallet()
  const sidebarOpen      = useStore(s => s.ui.sidebarOpen)
  const toggleSidebar    = useStore(s => s.toggleSidebar)
  const apiLogout        = useApiStore(s => s.logout)
  const navigate         = useNavigate()

  const closeOnMobile = () => {
    if (window.innerWidth < 1024 && sidebarOpen) toggleSidebar()
  }

  return (
    <>
      {sidebarOpen && <button className="dash-scrim" aria-label="Close menu" onClick={toggleSidebar} />}

      <aside className={`dash-side${sidebarOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="dash-side-logo">
          <Link to="/" className="lp-logo" aria-label="HashPay Global home"><b>HashPay</b> <span>global</span></Link>
        </div>

        <nav className="dash-nav">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to} to={to} end={end} onClick={closeOnMobile}
              className={({ isActive }) => `dash-navlink${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="dash-side-foot">
          <div className="dash-wallet">
            <div className="addr">{account ? `${account.address.slice(0, 8)}…${account.address.slice(-6)}` : '—'}</div>
            <div className={`state${account ? ' on' : ''}`}>
              {account ? 'Sui wallet connected' : 'No wallet connected'}
            </div>
          </div>
          <button
            className="lp-btn small" style={{ width: '100%' }}
            onClick={() => { apiLogout(); if (account) disconnect(); navigate('/login') }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
