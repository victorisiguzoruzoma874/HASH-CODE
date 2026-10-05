import React, { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'
import { SwapPanel } from './SwapPanel'
import { StakeBanner } from './StakeBanner'
import { LivePriceTicker } from './LivePriceTicker'
import { priceApi } from '../../lib/api'
import type { ModalType } from '../../store/useStore'

// ── Chart tooltip ────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="dash-pop" style={{ position: 'static', minWidth: 0, padding: '8px 12px' }}>
        <div className="head" style={{ fontSize: 12, color: 'var(--grey)' }}>{label}</div>
        <b className="mono" style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>₦{payload[0].value.toLocaleString()}</b>
      </div>
    )
  }
  return null
}

// ── Quick actions ────────────────────────────────────────────
const actions: { id: ModalType & string; label: string }[] = [
  { id: 'send',     label: 'Send' },
  { id: 'receive',  label: 'Receive' },
  { id: 'exchange', label: 'Exchange' },
  { id: 'convert',  label: 'Convert' },
  { id: 'scan',     label: 'Scan' },
  { id: 'bill',     label: 'Bill pay' },
  { id: 'airtime',  label: 'Airtime' },
  { id: 'data',     label: 'Data' },
]

const statusLabel = { completed: 'Completed', pending: 'Pending', failed: 'Failed' } as const

const TIMEFRAMES = ['1W', '1M', '3M', 'ALL'] as const

const LIVE_ASSETS = [
  { symbol: 'SUI',  name: 'Sui' },
  { symbol: 'ETH',  name: 'Ethereum' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'BTC',  name: 'Bitcoin' },
]

export const DashboardHome: React.FC = () => {
  const openModal = useStore(s => s.openModal)
  const wallet    = useStore(s => s.wallet)
  const history   = useStore(s => s.transactions.history)
  const user      = useApiStore(s => s.user)

  const { totalBalance, changePercent, changePositive, timeframe, chartData } = useStore(s => s.portfolio)
  const setTimeframe = useStore(s => s.setTimeframe)

  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [ngnRate, setNgnRate]       = useState(1565)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await priceApi.getAll()
        const map: Record<string, number> = {}
        Object.entries(res.prices).forEach(([k, v]) => { map[k] = v.price })
        // Merge so a partial response never drops a price
        setLivePrices(prev => ({ ...prev, ...map }))
        const fx = await priceApi.convert('USDC', 'NGN')
        setNgnRate(fx.rate || 1565)
      } catch { /* silently fail */ }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const displayName = user?.fullName?.split(' ')[0] ?? user?.email ?? (wallet.isConnected ? wallet.address.slice(0, 8) + '…' : 'there')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="dash-page">
      <LivePriceTicker />

      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>{greeting}, {displayName}</h1>

      <div className="dash-grid">
        {/* ── Main column ── */}
        <div className="dash-stack">

          {/* Portfolio */}
          <section className="dash-card" aria-label="Portfolio value">
            <div className="dash-hero">
              <div>
                <div className="lp-label" style={{ marginBottom: 6 }}>Total portfolio value</div>
                <div className="dash-big">{totalBalance}</div>
                <div className={changePositive ? 'dash-green' : 'dash-red'} style={{ fontWeight: 600, marginTop: 6 }}>
                  {changePercent} this period
                </div>
              </div>
              <div className="dash-seg" role="group" aria-label="Time range">
                {TIMEFRAMES.map(tf => (
                  <button key={tf} aria-pressed={timeframe === tf} onClick={() => setTimeframe(tf)}>{tf}</button>
                ))}
              </div>
            </div>

            <div className="dash-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" strokeOpacity={0.12} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'var(--grey)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--grey)', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--line)', strokeOpacity: 0.3 }} />
                  <Area type="monotone" dataKey="value" stroke="var(--ink)" strokeWidth={2}
                    fill="none" dot={false} isAnimationActive={false}
                    activeDot={{ r: 4, fill: 'var(--ink)', stroke: 'var(--bg)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="dash-sum">
              {[
                { label: 'ETH balance', value: '2.45 ETH', sub: '₦8,615.28' },
                { label: 'Yield (APR)', value: '5.82%',    sub: '+₦342/mo' },
                { label: 'Wallet',      value: wallet.isConnected ? 'Connected' : 'Not connected', sub: wallet.balance },
              ].map((s, i) => (
                <div key={s.label}>
                  <div className="lp-label" style={{ marginBottom: 4 }}>{s.label}</div>
                  <div className={`v${i === 2 && wallet.isConnected ? ' dash-green' : ''}`}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--meta)' }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick actions */}
          <section className="dash-card" aria-label="Quick actions">
            <header>
              <h2>Quick actions</h2>
              <span>Send, receive and manage your assets</span>
            </header>
            <div className="dash-actions">
              {actions.map(({ id, label }) => (
                <button key={id} className="dash-act" onClick={() => openModal(id)}>{label}</button>
              ))}
            </div>
          </section>

          {/* Recent activity */}
          <section className="dash-card" aria-label="Recent activity">
            <header>
              <h2>Recent activity</h2>
              <span>Your latest transactions</span>
            </header>
            {history.length === 0 ? (
              <p className="dash-empty">No activity yet. Make your first swap to see it here.</p>
            ) : (
              history.map(tx => (
                <div className="dash-row" key={tx.id}>
                  <div className={`bar ${tx.status === 'completed' ? '' : tx.status}`} />
                  <div className="main">
                    <div className="t">{tx.description}</div>
                    <div className="sub">{statusLabel[tx.status]} · {tx.timestamp}</div>
                  </div>
                  <div className="num">
                    <span className={tx.type === 'receive' ? 'dash-green' : undefined}>{tx.amountIn}</span>
                    <small>{tx.amountOut}</small>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* ── Side column ── */}
        <div className="dash-stack">
          <SwapPanel />

          <section className="dash-card" aria-label="Live prices">
            <header>
              <h2>Live prices</h2>
              <span>Updates every 30s</span>
            </header>
            {LIVE_ASSETS.map(token => {
              const usd = livePrices[token.symbol] ?? 0
              const ngn = usd * ngnRate
              return (
                <div className="dash-row" key={token.symbol}>
                  <div className={`bar${usd > 0 ? '' : ' pending'}`} />
                  <div className="main">
                    <div className="t">{token.symbol}</div>
                    <div className="sub">{token.name}</div>
                  </div>
                  <div className="num">
                    {usd > 0 ? `$${usd >= 1000 ? usd.toLocaleString('en-US', { maximumFractionDigits: 2 }) : usd.toFixed(4)}` : '—'}
                    <small>{ngn > 0 ? `₦${ngn.toLocaleString('en-NG', { maximumFractionDigits: 0 })}` : '—'}</small>
                  </div>
                </div>
              )
            })}
          </section>

          <StakeBanner />
        </div>
      </div>
    </div>
  )
}
