import React, { useCallback, useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'
import { LivePriceTicker } from './LivePriceTicker'
import { ConnectedWalletBalances } from './ConnectedWalletBalances'
import { priceApi, walletApi, type WalletBalance, type WalletTransaction } from '../../lib/api'
import type { ModalType } from '../../store/useStore'

const actions: { id: Exclude<ModalType, null>; label: string }[] = [
  { id: 'send',    label: 'Send' },
  { id: 'receive', label: 'Receive' },
  { id: 'scan',    label: 'Scan' },
  { id: 'convert', label: 'Convert to cash' },
  { id: 'bills',   label: 'Utilities' },
]

const LIVE_ASSETS = [
  { symbol: 'XLM', name: 'Stellar' },
  { symbol: 'SUI',  name: 'Sui' },
  { symbol: 'ETH',  name: 'Ethereum' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'BTC',  name: 'Bitcoin' },
]

const ngn = (n: number | string) =>
  `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function describe(tx: WalletTransaction): string {
  if (tx.description) return tx.description
  switch (tx.source) {
    case 'INTERNAL_TRANSFER_IN':  return `Received from ${tx.sender?.fullName ?? 'a HashPay user'}`
    case 'INTERNAL_TRANSFER_OUT': return `Sent to ${tx.recipient?.fullName ?? 'a HashPay user'}`
    case 'CRYPTO_DEPOSIT':        return `${tx.cryptoAsset ?? 'Crypto'} deposit`
    case 'WITHDRAWAL':            return 'Withdrawal to bank'
    case 'REVERSAL':              return 'Reversal'
    default:                      return 'Transaction'
  }
}

export const DashboardHome: React.FC = () => {
  const openModal = useStore(s => s.openModal)
  const user      = useApiStore(s => s.user)

  const [balance, setBalance]   = useState<WalletBalance | null>(null)
  const [txs, setTxs]           = useState<WalletTransaction[]>([])
  const [walletState, setWalletState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [copied, setCopied]     = useState(false)

  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [ngnRate, setNgnRate]       = useState<number | null>(null)

  const loadWallet = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([walletApi.getBalance(), walletApi.getTransactions(1, 8)])
      setBalance(b.data)
      setTxs(t.data.transactions)
      setWalletState('ok')
    } catch {
      setWalletState(s => (s === 'ok' ? s : 'error'))
    }
  }, [])

  useEffect(() => {
    loadWallet()
    const id = setInterval(loadWallet, 30_000)
    return () => clearInterval(id)
  }, [loadWallet])

  // Refresh right after a modal (send / receive) closes
  const activeModal = useStore(s => s.ui.activeModal)
  useEffect(() => { if (activeModal === null) loadWallet() }, [activeModal, loadWallet])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await priceApi.getAll()
        const map: Record<string, number> = {}
        Object.entries(res.prices).forEach(([k, v]) => { map[k] = v.price })
        // Merge so a partial response never drops a price
        setLivePrices(prev => ({ ...prev, ...map }))
        const fx = await priceApi.convert('USDC', 'NGN')
        if (fx.rate) setNgnRate(fx.rate)
      } catch { /* keep what we have */ }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const displayName = user?.fullName?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const accountNumber = balance?.hashpayAccountNumber ?? null
  const copyAccount = () => {
    if (!accountNumber) return
    navigator.clipboard.writeText(accountNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }

  return (
    <div className="dash-page">
      <LivePriceTicker />

      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>{greeting}, {displayName}</h1>

      <div className="dash-grid">
        {/* ── Main column ── */}
        <div className="dash-stack">

          <section className="dash-card" aria-label="Wallet balance">
            <div className="dash-hero">
              <div>
                <div className="lp-label" style={{ marginBottom: 6 }}>Naira balance</div>
                <div className="dash-big">
                  {walletState === 'ok' && balance ? ngn(balance.ngnBalance) : walletState === 'error' ? '—' : 'Loading…'}
                </div>
                {walletState === 'error' && (
                  <p className="dash-red" style={{ marginTop: 6, fontSize: 14 }}>
                    Your balance could not be loaded. We will try again in 30 seconds.
                  </p>
                )}
              </div>
            </div>

            <div className="dash-sum" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div>
                <div className="lp-label" style={{ marginBottom: 4 }}>HashPay account number</div>
                <div className="v">{accountNumber ?? '—'}</div>
                {accountNumber && (
                  <button className="lp-btn small" style={{ marginTop: 8 }} onClick={copyAccount}>
                    {copied ? 'Copied' : 'Copy number'}
                  </button>
                )}
              </div>
              <div>
                <div className="lp-label" style={{ marginBottom: 4 }}>Deposit account</div>
                {balance?.virtualAccount ? (
                  <>
                    <div className="v">{balance.virtualAccount.accountNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)' }}>{balance.virtualAccount.bankName ?? 'Bank'}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, color: 'var(--grey)' }}>
                    Not created yet. Open Receive to set one up.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="dash-card" aria-label="Quick actions">
            <header>
              <h2>Quick actions</h2>
              <span>Move money in and out</span>
            </header>
            <div className="dash-actions">
              {actions.map(({ id, label }) => (
                <button key={id} className="dash-act" onClick={() => openModal(id)}>{label}</button>
              ))}
            </div>
          </section>

          <section className="dash-card" aria-label="Recent activity">
            <header>
              <h2>Recent activity</h2>
              <span>Your latest wallet transactions</span>
            </header>
            {walletState === 'loading' && <p className="dash-empty">Loading activity…</p>}
            {walletState === 'error' && <p className="dash-empty">Activity could not be loaded.</p>}
            {walletState === 'ok' && txs.length === 0 && (
              <p className="dash-empty">No activity yet. Receive or send money and it will appear here.</p>
            )}
            {txs.map(tx => {
              const credit = tx.type === 'CREDIT'
              const barClass = tx.status === 'FAILED' ? 'failed' : tx.status === 'PENDING' ? 'pending' : ''
              return (
                <div className="dash-row" key={tx.id}>
                  <div className={`bar ${barClass}`} />
                  <div className="main">
                    <div className="t">{describe(tx)}</div>
                    <div className="sub">
                      {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()} · {new Date(tx.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="num">
                    <span className={credit ? 'dash-green' : undefined}>{credit ? '+' : '−'}{ngn(tx.amount)}</span>
                    <small>Balance {ngn(tx.balanceAfter)}</small>
                  </div>
                </div>
              )
            })}
          </section>
        </div>

        {/* ── Side column ── */}
        <div className="dash-stack">
          <ConnectedWalletBalances />
          <section className="dash-card" aria-label="Live prices">
            <header>
              <h2>Live prices</h2>
              <span>Updates every 30s</span>
            </header>
            {LIVE_ASSETS.map(token => {
              const usd = livePrices[token.symbol] ?? 0
              const naira = ngnRate ? usd * ngnRate : 0
              return (
                <div className="dash-row" key={token.symbol}>
                  <div className={`bar${usd > 0 ? '' : ' pending'}`} />
                  <div className="main">
                    <div className="t">{token.symbol}</div>
                    <div className="sub">{token.name}</div>
                  </div>
                  <div className="num">
                    {usd > 0 ? `$${usd >= 1000 ? usd.toLocaleString('en-US', { maximumFractionDigits: 2 }) : usd.toFixed(4)}` : '—'}
                    <small>{naira > 0 ? `₦${naira.toLocaleString('en-NG', { maximumFractionDigits: 0 })}` : '—'}</small>
                  </div>
                </div>
              )
            })}
          </section>
        </div>
      </div>
    </div>
  )
}
