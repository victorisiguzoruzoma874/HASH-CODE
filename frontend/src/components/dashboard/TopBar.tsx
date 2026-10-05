import React, { useState, useRef, useCallback } from 'react'
import { Menu, Moon, Sun } from 'lucide-react'
import { useCurrentAccount, useDisconnectWallet, useSuiClientContext } from '@mysten/dapp-kit'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'
import { useClickOutside } from '../ui/useClickOutside'
import { useFlatTheme } from '../ui/FlatShell'
import { useNavigate } from 'react-router-dom'

export const TopBar: React.FC = () => {
  const account          = useCurrentAccount()
  const { mutate: disconnect } = useDisconnectWallet()
  const { network }      = useSuiClientContext()
  const toggleSidebar    = useStore(s => s.toggleSidebar)
  const apiLogout        = useApiStore(s => s.logout)
  const user             = useApiStore(s => s.user)
  const navigate         = useNavigate()
  const { dark, toggle } = useFlatTheme()

  const [showUser, setShowUser] = useState(false)

  const userRef = useRef<HTMLDivElement>(null)
  useClickOutside(userRef, useCallback(() => setShowUser(false), []))

  return (
    <div className="dash-top">
      <button className="dash-iconbtn dash-menu" onClick={toggleSidebar} aria-label="Toggle menu">
        <Menu size={16} />
      </button>

      <div className="grow" />

      <span className="dash-net">{account ? `Sui ${network}` : `${user?.linkedWallets?.length ?? 0} wallet${user?.linkedWallets?.length === 1 ? '' : 's'} linked`}</span>

      <button className="dash-iconbtn" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="dash-menu-wrap" ref={userRef}>
        <button
          className="dash-iconbtn"
          onClick={() => setShowUser(!showUser)}
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
            <button className="row" onClick={() => { apiLogout(); if (account) disconnect(); navigate('/login') }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
