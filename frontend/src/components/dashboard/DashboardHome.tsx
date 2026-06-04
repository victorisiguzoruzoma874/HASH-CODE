import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Send, Download, Repeat2, QrCode, Receipt, Phone, Wifi,
  ArrowRightLeft, TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownLeft, Droplets, ExternalLink, Sparkles,
} from 'lucide-react'
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

// ── Shared styles ────────────────────────────────────────────
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #DDE6F2',
  borderRadius: 20,
  boxShadow: '0 1px 4px rgba(10,25,41,0.07)',
}

// ── Chart tooltip ────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #DDE6F2', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(10,25,41,0.12)' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A97B4', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#0B50D4' }}>
          ₦{payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

// ── Quick actions ────────────────────────────────────────────
const actions = [
  { id: 'send',     label: 'Send',     icon: Send,           bg: '#E8EFFE', color: '#0B50D4' },
  { id: 'receive',  label: 'Receive',  icon: Download,       bg: '#E4F7EE', color: '#057A4B' },
  { id: 'exchange', label: 'Exchange', icon: Repeat2,        bg: '#E0F5FA', color: '#0891B2' },
  { id: 'convert',  label: 'Convert',  icon: ArrowRightLeft, bg: '#F3EEFF', color: '#7C3AED' },
  { id: 'scan',     label: 'Scan',     icon: QrCode,         bg: '#E8EFFE', color: '#0B50D4' },
  { id: 'bill',     label: 'Bill Pay', icon: Receipt,        bg: '#FEF3E2', color: '#B45309' },
  { id: 'airtime',  label: 'Airtime',  icon: Phone,          bg: '#E0F5FA', color: '#0891B2' },
  { id: 'data',     label: 'Data',     icon: Wifi,           bg: '#F3EEFF', color: '#7C3AED' },
] as const

// ── Activity icon map ─────────────────────────────────────────
const iconMap = {
  swap:      { icon: ArrowUpRight,  color: '#B45309', bg: '#FEF3E2' },
  receive:   { icon: ArrowDownLeft, color: '#057A4B', bg: '#E4F7EE' },
  send:      { icon: ArrowUpRight,  color: '#C5202B', bg: '#FDECEA' },
  liquidity: { icon: Droplets,      color: '#0B50D4', bg: '#E8EFFE' },
}
const statusStyle = {
  completed: { color: '#057A4B', bg: '#E4F7EE', label: 'Completed' },
  pending:   { color: '#B45309', bg: '#FEF3E2', label: 'Pending'   },
  failed:    { color: '#C5202B', bg: '#FDECEA', label: 'Failed'    },
}

// ── Timeframe buttons ─────────────────────────────────────────
const TIMEFRAMES = ['1W', '1M', '3M', 'ALL'] as const

// ── DashboardHome ─────────────────────────────────────────────
const LIVE_ASSETS = [
  { symbol: 'SUI',  name: 'Sui',      amount: '0.00', color: '#4CA3FF' },
  { symbol: 'ETH',  name: 'Ethereum', amount: '0.00', color: '#0B50D4' },
  { symbol: 'USDC', name: 'USD Coin', amount: '0.00', color: '#0891B2' },
  { symbol: 'BTC',  name: 'Bitcoin',  amount: '0.00', color: '#F7931A' },
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
        setLivePrices(map)
        const fx = await priceApi.convert('USDC', 'NGN')
        setNgnRate(fx.rate || 1565)
      } catch { /* silently fail */ }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const displayName = user?.fullName?.split(' ')[0] ?? user?.email ?? (wallet.isConnected ? wallet.address.slice(0, 8) + '…' : 'there')

  const handleAction = (id: string) => {
    const map: Record<string, ModalType> = {
      send: 'send', receive: 'receive', exchange: 'exchange',
      convert: 'convert', scan: 'scan', bill: 'bill',
      airtime: 'airtime', data: 'data',
    }
    if (map[id]) openModal(map[id])
  }

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Live Price Ticker ────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <LivePriceTicker />
      </div>

      {/* ── Greeting ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2"
        style={{ marginBottom: 24 }}
      >
        <Sparkles size={15} style={{ color: '#0B50D4' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#7A97B4' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},
        </span>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#0A1929' }}>{displayName} 👋</span>
        <div
          className="flex items-center gap-1.5 ml-3"
          style={{ padding: '4px 12px', background: '#E4F7EE', borderRadius: 99, fontSize: 12, fontWeight: 800, color: '#057A4B' }}
        >
          <TrendingUp size={11} /> +12.4% this week
        </div>
      </motion.div>

      {/* ── Two-column layout ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ══ LEFT COLUMN (main) ══════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Balance hero card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={card}
          >
            {/* Top: balance + timeframe selector */}
            <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid #EEF3FB' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#057A4B', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A97B4' }}>
                      Total Portfolio Value
                    </span>
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#0A1929', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 12 }}>
                    {totalBalance}
                  </div>
                  <motion.div
                    key={changePercent}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-1.5"
                    style={{ padding: '5px 12px', borderRadius: 99, fontSize: 13, fontWeight: 800, background: changePositive ? '#E4F7EE' : '#FDECEA', color: changePositive ? '#057A4B' : '#C5202B' }}
                  >
                    {changePositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {changePercent} this period
                  </motion.div>
                </div>

                {/* Timeframe tabs */}
                <div className="flex items-center gap-0.5" style={{ padding: 4, background: '#EEF3FB', border: '1px solid #DDE6F2', borderRadius: 12 }}>
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      style={{
                        padding: '7px 14px', fontSize: 12, fontWeight: 800, borderRadius: 9,
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        background: timeframe === tf ? '#0B50D4' : 'transparent',
                        color: timeframe === tf ? '#fff' : '#7A97B4',
                        boxShadow: timeframe === tf ? '0 2px 8px rgba(11,80,212,0.25)' : 'none',
                      }}
                      onMouseEnter={e => { if (timeframe !== tf) e.currentTarget.style.color = '#0A1929' }}
                      onMouseLeave={e => { if (timeframe !== tf) e.currentTarget.style.color = '#7A97B4' }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div style={{ padding: '16px 8px 12px', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#0B50D4" stopOpacity={0.18} />
                      <stop offset="70%"  stopColor="#0891B2" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="#0891B2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dashLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#0B50D4" />
                      <stop offset="100%" stopColor="#0891B2" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(221,230,242,0.7)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#A8BDD4', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#A8BDD4', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(11,80,212,0.15)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="value" stroke="url(#dashLine)" strokeWidth={2.5}
                    fill="url(#dashGrad)" dot={false}
                    activeDot={{ r: 5, fill: '#0B50D4', stroke: '#fff', strokeWidth: 2.5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid #EEF3FB' }}>
              {[
                { label: 'ETH Balance',    value: '2.45 ETH',  sub: '₦8,615.28' },
                { label: 'Yield (APR)',     value: '5.82%',     sub: '+₦342/mo' },
                { label: 'Wallet',          value: wallet.isConnected ? '● Connected' : '○ Disconnected', sub: wallet.balance },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: '16px 24px', borderRight: i < 2 ? '1px solid #EEF3FB' : 'none' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A97B4', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: i === 2 && wallet.isConnected ? '#057A4B' : '#0A1929' }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#A8BDD4', marginTop: 3 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            style={card}
          >
            <div style={{ padding: '22px 28px 0' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>Quick Actions</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#7A97B4', marginTop: 3 }}>Send, receive, and manage your assets</div>
            </div>
            <div style={{ padding: '20px 20px 24px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10 }}>
              {actions.map(({ id, label, icon: Icon, bg, color }, i) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}
                  onClick={() => handleAction(id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    padding: '18px 6px 16px', borderRadius: 16,
                    background: '#FAFBFF', border: '1.5px solid #E8EEF8',
                    cursor: 'pointer', transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = bg
                    e.currentTarget.style.borderColor = color + '40'
                    e.currentTarget.style.boxShadow = `0 6px 20px ${color}1A`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#FAFBFF'
                    e.currentTarget.style.borderColor = '#E8EEF8'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 2px 8px ${color}20`,
                  }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4A6580', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            style={{ ...card, overflow: 'hidden' }}
          >
            <div className="flex items-center justify-between" style={{ padding: '20px 24px', borderBottom: '1px solid #DDE6F2' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>Recent Activity</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#7A97B4', marginTop: 3 }}>Your latest transactions</div>
              </div>
              <button
                className="flex items-center gap-1.5"
                style={{ padding: '7px 14px', background: '#E8EFFE', border: 'none', borderRadius: 99, fontSize: 13, fontWeight: 800, color: '#0B50D4', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dce7fd' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#E8EFFE' }}
              >
                View all <ExternalLink size={11} />
              </button>
            </div>

            <div>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{ padding: '48px 24px', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EEF3FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Droplets size={20} style={{ color: '#A8BDD4' }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#A8BDD4' }}>No activity yet. Make your first swap!</span>
                </div>
              ) : (
                history.map((tx, i) => {
                  const { icon: Icon, color, bg } = iconMap[tx.type]
                  const st = statusStyle[tx.status]
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 cursor-pointer group"
                      style={{ padding: '16px 24px', borderBottom: '1px solid #EEF3FB', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} style={{ color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1929', marginBottom: 3 }}>{tx.description}</div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#A8BDD4' }}>{tx.timestamp}</span>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: tx.type === 'receive' ? '#057A4B' : '#0A1929' }}>
                          {tx.amountIn}
                        </div>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#A8BDD4', marginTop: 3 }}>{tx.amountOut}</div>
                      </div>
                      <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: '#A8BDD4' }} />
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>

        {/* ══ RIGHT SIDEBAR ═══════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Swap Panel */}
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <SwapPanel />
          </motion.div>

          {/* Live Asset Prices card */}
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            style={card}
          >
            <div className="flex items-center justify-between" style={{ padding: '18px 20px', borderBottom: '1px solid #EEF3FB' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1929' }}>Live Prices</div>
              <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 700, color: '#057A4B' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#057A4B', animation: 'pulse 2s infinite' }} />
                Live · 30s
              </div>
            </div>
            <div style={{ padding: '8px 8px' }}>
              {LIVE_ASSETS.map(token => {
                const usdPrice = livePrices[token.symbol] ?? 0
                const ngnPrice = usdPrice * ngnRate
                const allPrices = Object.values(livePrices).filter(Boolean)
                const maxNgn = Math.max(...allPrices.map(p => p * ngnRate), 1)
                const pct = maxNgn > 0 ? Math.round((ngnPrice / maxNgn) * 100) : 0
                return (
                  <div key={token.symbol} className="flex items-center gap-3"
                    style={{ padding: '10px 12px', borderRadius: 12, transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: token.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                      {token.symbol[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0A1929' }}>{token.symbol}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#A8BDD4', fontFamily: 'monospace' }}>
                          {token.name}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: '#EEF3FB', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: token.color, width: `${pct}%`, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 72 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#0A1929' }}>
                        {usdPrice > 0 ? `$${usdPrice >= 1000 ? usdPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }) : usdPrice.toFixed(4)}` : '—'}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#A8BDD4', marginTop: 2, fontFamily: 'monospace' }}>
                        {ngnPrice > 0 ? `₦${ngnPrice.toLocaleString('en-NG', { maximumFractionDigits: 0 })}` : '—'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Stake Banner */}
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
          >
            <StakeBanner />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
