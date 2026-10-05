import React, { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { useApiStore } from '../store/useApiStore'
import { escrowApi, type EscrowOrder } from '../lib/api'

type Stats = { totalOrders: number; completedOrders: number; pendingOrders: number; totalNgnPaid: number }

const STATUS: Record<EscrowOrder['status'], { label: string; tone: 'ok' | 'bad' | 'wait' }> = {
  DEPOSITING:     { label: 'Depositing',     tone: 'wait' },
  PENDING_PAYOUT: { label: 'Paying out',     tone: 'wait' },
  COMPLETED:      { label: 'Completed',      tone: 'ok'   },
  PAYOUT_FAILED:  { label: 'Payout failed',  tone: 'bad'  },
  REFUNDED:       { label: 'Refunded',       tone: 'wait' },
}

const DECIMALS: Record<string, number> = { USDC: 6, USDT: 6, ETH: 18, SUI: 9, APT: 8, BTC: 8 }

/** On-chain integer amount → human amount */
function formatCrypto(raw: string, asset: string): string {
  const decimals = DECIMALS[asset.toUpperCase()] ?? 6
  const n = Number(raw) / Math.pow(10, decimals)
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${asset}`
}

const HOW_IT_WORKS = [
  { title: 'Get a quote',       desc: 'Choose an asset and an amount. The quote is signed and valid for a short time.' },
  { title: 'Deposit to escrow', desc: 'Your crypto is locked in an escrow contract on Sui until the payout is confirmed.' },
  { title: 'Verification',      desc: 'HashPay confirms the deposit on-chain and checks your KYC status.' },
  { title: 'Bank payout',       desc: 'Naira is sent to your bank account. If the payout fails, your crypto is refunded.' },
]

const linkBtn: React.CSSProperties = {
  background: 'none', border: 0, font: 'inherit', textDecoration: 'underline', cursor: 'pointer', color: 'inherit',
}

const OrderRow: React.FC<{ order: EscrowOrder }> = ({ order }) => {
  const [expanded, setExpanded] = useState(false)
  const st = STATUS[order.status]
  return (
    <div className="dash-order-wrap">
      <button className="dash-order" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <b className="dash-mono">{order.id.slice(0, 8)}</b>
            <span className={`dash-tag ${st.tone}`}>{st.label}</span>
          </div>
          <div className="dash-meta">{new Date(order.createdAt).toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="dash-mono">{formatCrypto(order.amountRaw, order.asset)}</div>
          <div className="dash-mono dash-green">
            {order.ngnAmount != null ? `₦${order.ngnAmount.toLocaleString('en-NG')}` : '—'}
          </div>
        </div>
        <span className="dash-grey">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="dash-detail">
          <div><div className="k">Transaction</div><div className="dash-mono" style={{ wordBreak: 'break-all' }}>{order.txHash}</div></div>
          <div><div className="k">Payout reference</div><div className="dash-mono">{order.payoutRef ?? '—'}</div></div>
          <div><div className="k">Currency</div><div className="dash-mono">{order.currencyOut ?? 'NGN'}</div></div>
          <div><div className="k">Completed</div><div className="dash-mono">{order.completedAt ? new Date(order.completedAt).toLocaleString() : '—'}</div></div>
        </div>
      )}
    </div>
  )
}

export const OfframpPage: React.FC = () => {
  const openModal     = useStore(s => s.openModal)
  const orders        = useApiStore(s => s.orders)
  const ordersLoading = useApiStore(s => s.ordersLoading)
  const fetchOrders   = useApiStore(s => s.fetchOrders)

  const [stats, setStats]   = useState<Stats | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      await fetchOrders()
      setStats(await escrowApi.getStats())
    } catch {
      setFailed(true)
    }
  }, [fetchOrders])

  useEffect(() => { load() }, [load])

  const cards = [
    { label: 'Total converted',  value: stats ? `₦${Number(stats.totalNgnPaid).toLocaleString('en-NG')}` : '—', tone: 'dash-green' },
    { label: 'Pending orders',   value: stats ? String(stats.pendingOrders) : '—', tone: '' },
    { label: 'Completed orders', value: stats ? String(stats.completedOrders) : '—', tone: 'dash-green' },
    { label: 'All orders',       value: stats ? String(stats.totalOrders) : '—', tone: '' },
  ]

  return (
    <div className="dash-page">
      <div className="dash-ph">
        <div>
          <h1>Fiat offramp</h1>
          <p>Convert crypto to naira and receive it in your bank account.</p>
        </div>
        <button className="lp-btn solid" onClick={() => openModal('convert')}>New conversion</button>
      </div>

      {failed && (
        <div className="lp-error" role="alert">
          Your orders could not be loaded. Check your connection, then{' '}
          <button style={linkBtn} onClick={load}>try again</button>.
        </div>
      )}

      <div className="dash-stats">
        {cards.map(s => (
          <div className="dash-stat" key={s.label}>
            <div className="lp-label" style={{ marginBottom: 4 }}>{s.label}</div>
            <div className={`v ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <section className="dash-card" aria-label="Orders">
        <header>
          <h2>Orders</h2>
          <span>{orders.length} shown</span>
        </header>
        {ordersLoading && orders.length === 0 && <p className="dash-empty">Loading orders…</p>}
        {!ordersLoading && !failed && orders.length === 0 && (
          <p className="dash-empty">No orders yet. Select "New conversion" to convert crypto to naira.</p>
        )}
        {orders.map(order => <OrderRow key={order.id} order={order} />)}
      </section>

      <section className="dash-card" aria-label="How settlement works">
        <header><h2>How settlement works</h2></header>
        <div className="dash-cellgrid">
          {HOW_IT_WORKS.map(item => (
            <div key={item.title}><b>{item.title}</b><span>{item.desc}</span></div>
          ))}
        </div>
      </section>
    </div>
  )
}
