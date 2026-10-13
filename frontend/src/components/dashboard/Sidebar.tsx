import React, { useEffect, useState } from 'react'
import { kycApi, type KycTier } from '../../lib/api'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit'
import { WalletsModal } from '../modals/WalletsModal'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'

const navItems = [
  { to: '/dashboard',           label: 'Dashboard', end: true },
  { to: '/dashboard/swap',      label: 'Swap' },
  { to: '/dashboard/portfolio', label: 'Portfolio' },
  { to: '/dashboard/offramp',   label: 'Offramp' },
  { to: '/dashboard/verification', label: 'Verification' },
]

export const Sidebar: React.FC = () => {
  const account          = useCurrentAccount()
  const { mutate: disconnect } = useDisconnectWallet()
  const sidebarOpen      = useStore(s => s.ui.sidebarOpen)
  const toggleSidebar    = useStore(s => s.toggleSidebar)
  const apiLogout        = useApiStore(s => s.logout)
  const navigate         = useNavigate()
  const linkedWallets    = useApiStore(s => s.user?.linkedWallets ?? [])
  const [showWallets, setShowWallets] = useState(false)
  const [tier, setTier] = useState<KycTier | null>(null)
  useEffect(() => {
    let active = true
    const refresh = () => { kycApi.status().then(status => { if (active) setTier(status.tier) }).catch(() => {}) }
    refresh()
    window.addEventListener('kyc-status-updated', refresh)
    const timer = setInterval(refresh, 30_000)
    return () => { active = false; clearInterval(timer); window.removeEventListener('kyc-status-updated', refresh) }
  }, [])

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
              {label === 'Verification' && tier !== null && <span className="dash-chip" style={{ marginLeft: 'auto', padding: '0 6px', minHeight: 22, cursor: 'inherit' }}>Tier {tier}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="dash-side-foot">
          <div className="dash-wallet">
            <div className="addr">{linkedWallets.length ? `${linkedWallets.length} wallet${linkedWallets.length === 1 ? '' : 's'} linked` : 'No wallets linked'}</div>
            <div className={`state${linkedWallets.length ? ' on' : ''}`}>
              Freighter, LOBSTR, MetaMask, Phantom and Sui
            </div>
          </div>
          <button className="lp-btn solid small" style={{ width: '100%' }} onClick={() => setShowWallets(true)}>
            {linkedWallets.length ? 'Manage wallets' : 'Connect wallet'}
          </button>
          <button
            className="lp-btn small" style={{ width: '100%' }}
            onClick={() => { apiLogout(); if (account) disconnect(); navigate('/login') }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <WalletsModal isOpen={showWallets} onClose={() => setShowWallets(false)} />
    </>
  )
}
