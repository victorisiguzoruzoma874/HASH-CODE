import React, { useCallback, useEffect, useState } from 'react'
import { escrowApi, walletApi, type WalletBalance, type WalletTransaction } from '../lib/api'

type Stats = { totalOrders: number; completedOrders: number; pendingOrders: number; totalNgnPaid: number }

const ngn = (n: number | string) =>
  `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PAGE_SIZE = 20

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

export const PortfolioPage: React.FC = () => {
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [stats, setStats]     = useState<Stats | null>(null)
  const [txs, setTxs]         = useState<WalletTransaction[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [state, setState]     = useState<'loading' | 'ok' | 'error'>('loading')

  const load = useCallback(async (p: number) => {
    setState(s => (s === 'ok' ? s : 'loading'))
    try {
      const [b, st, t] = await Promise.all([
        walletApi.getBalance(),
        escrowApi.getStats(),
        walletApi.getTransactions(p, PAGE_SIZE),
      ])
      setBalance(b.data)
      setStats(st)
      setTxs(t.data.transactions)
      setTotal(t.data.total)
      setState('ok')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statCards = [
    { label: 'Naira balance',      value: balance ? ngn(balance.ngnBalance) : '—' },
    { label: 'Cashed out to bank', value: stats ? ngn(stats.totalNgnPaid) : '—' },
    { label: 'Completed orders',   value: stats ? String(stats.completedOrders) : '—' },
    { label: 'Pending orders',     value: stats ? String(stats.pendingOrders) : '—' },
  ]

  return (
    <div className="dash-page">
      <div className="dash-ph">
        <div>
          <h1>Portfolio</h1>
          <p>Your naira balance and every transaction on your account.</p>
        </div>
      </div>

      {state === 'error' && (
        <div className="lp-error" role="alert">
          Your portfolio could not be loaded. Check your connection, then <button className="lp-link" style={{ background: 'none', border: 0, font: 'inherit', textDecoration: 'underline', cursor: 'pointer', color: 'inherit' }} onClick={() => load(page)}>try again</button>.
        </div>
      )}

      <div className="dash-stats">
        {statCards.map(s => (
          <div className="dash-stat" key={s.label}>
            <div className="lp-label" style={{ marginBottom: 4 }}>{s.label}</div>
            <div className="v">{state === 'loading' ? '…' : s.value}</div>
          </div>
        ))}
      </div>

      <section className="dash-card" aria-label="Transactions">
        <header>
          <h2>Transactions</h2>
          <span>{total} total</span>
        </header>
        {state === 'loading' && <p className="dash-empty">Loading transactions…</p>}
        {state === 'ok' && txs.length === 0 && (
          <p className="dash-empty">No transactions yet. Receive or send money and it will appear here.</p>
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
                  {tx.reference ? <> · <span className="dash-mono">{tx.reference}</span></> : null}
                </div>
              </div>
              <div className="num">
                <span className={credit ? 'dash-green' : undefined}>{credit ? '+' : '−'}{ngn(tx.amount)}</span>
                <small>Balance {ngn(tx.balanceAfter)}</small>
              </div>
            </div>
          )
        })}
        {pages > 1 && (
          <div className="dash-pad" style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--line)' }}>
            <button className="lp-btn small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span className="dash-grey" style={{ fontSize: 13 }}>Page {page} of {pages}</span>
            <button className="lp-btn small" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </section>
    </div>
  )
}
