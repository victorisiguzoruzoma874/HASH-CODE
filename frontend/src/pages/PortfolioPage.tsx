import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

const holdings = [
  { symbol: 'ETH',  name: 'Ethereum',    amount: '2.45',     usd: '₦13,565,358', change: '+5.2%', positive: true,  pct: 57, color: '#0B50D4' },
  { symbol: 'USDC', name: 'USD Coin',    amount: '1,429.55', usd: '₦2,237,246',  change: '0.0%',  positive: true,  pct: 9,  color: '#0891B2' },
  { symbol: 'LINK', name: 'Chainlink',   amount: '142.00',   usd: '₦4,444,788',  change: '+8.7%', positive: true,  pct: 19, color: '#B45309' },
  { symbol: 'DAI',  name: 'Dai',         amount: '500.00',   usd: '₦782,500',    change: '-0.1%', positive: false, pct: 3,  color: '#C5202B' },
  { symbol: 'WETH', name: 'Wrapped ETH', amount: '0.50',     usd: '₦2,752,615',  change: '+5.1%', positive: true,  pct: 12, color: '#7C3AED' },
]

const pieData = holdings.map(h => ({ name: h.symbol, value: h.pct, color: h.color }))

const chartData = [
  { day: 'MON', value: 12400 }, { day: 'TUE', value: 13100 },
  { day: 'WED', value: 12800 }, { day: 'THU', value: 14200 },
  { day: 'FRI', value: 13900 }, { day: 'SAT', value: 14800 },
  { day: 'SUN', value: 15143 },
]

const recentTx = [
  { type: 'send',    desc: 'Sent ETH',           amount: '-0.5 ETH',  usd: '-₦2,752,500', time: '2h ago' },
  { type: 'receive', desc: 'Received LINK',       amount: '+142 LINK', usd: '+₦4,444,788', time: '5h ago' },
  { type: 'swap',    desc: 'Swapped ETH → USDC', amount: '-0.3 ETH',  usd: '+₦1,649,250', time: '1d ago' },
  { type: 'receive', desc: 'Received USDC',       amount: '+500 USDC', usd: '+₦782,500',   time: '2d ago' },
]

const statCards = [
  { label: 'Total Value',    value: '₦23,699,507', change: '+12.4%', positive: true },
  { label: '24h Change',     value: '+₦1,317,630', change: '+5.9%',  positive: true },
  { label: 'Total Invested', value: '₦19,406,000', change: '',       positive: true },
  { label: 'Total Profit',   value: '+₦4,293,507', change: '+22.1%', positive: true },
]

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDE6F2',
  borderRadius: 20, boxShadow: '0 1px 4px rgba(10,25,41,0.07)',
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #DDE6F2', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(10,25,41,0.12)' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A97B4', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', color: '#0B50D4' }}>
          ₦{(payload[0].value * 1565).toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

export const PortfolioPage: React.FC = () => (
  <div className="h-full flex flex-col" style={{ background: '#EEF3FB' }}>
    {/* Header */}
    <div className="flex-shrink-0 bg-white" style={{ padding: '24px 28px', borderBottom: '1px solid #DDE6F2' }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A1929', letterSpacing: '-0.02em' }}>Portfolio</h1>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#7A97B4', marginTop: 4 }}>Your complete asset overview</p>
    </div>

    <div className="flex-1 overflow-y-auto flex flex-col gap-6" style={{ padding: '24px 28px' }}>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(card2 => (
          <div key={card2.label} style={{ ...card, padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A97B4', marginBottom: 8 }}>
              {card2.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#0A1929', lineHeight: 1, marginBottom: 6 }}>
              {card2.value}
            </div>
            {card2.change && (
              <div className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700, color: card2.positive ? '#057A4B' : '#C5202B' }}>
                {card2.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {card2.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart + Pie */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>

        {/* Performance chart */}
        <div style={card}>
          <div className="flex items-center justify-between" style={{ padding: '20px 22px', borderBottom: '1px solid #EEF3FB' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A97B4', marginBottom: 6 }}>
                Performance
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#0A1929' }}>
                ₦23,699,507
              </div>
            </div>
            <div className="flex items-center gap-1.5" style={{ padding: '6px 12px', background: '#E4F7EE', borderRadius: 99, fontSize: 12, fontWeight: 800, color: '#057A4B' }}>
              <TrendingUp size={12} /> +12.4% this week
            </div>
          </div>
          <div style={{ padding: '16px 12px 12px', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portGradLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0B50D4" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#0891B2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(221,230,242,0.8)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#A8BDD4', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A8BDD4', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₦${(v * 1565 / 1_000_000).toFixed(1)}M`} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(11,80,212,0.2)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="value" stroke="#0B50D4" strokeWidth={2.5}
                  fill="url(#portGradLight)" dot={false}
                  activeDot={{ r: 5, fill: '#0B50D4', stroke: '#fff', strokeWidth: 2.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation pie */}
        <div style={card}>
          <div style={{ padding: '20px 22px', borderBottom: '1px solid #EEF3FB' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1929' }}>Allocation</div>
          </div>
          <div style={{ height: 160, padding: '8px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={2} stroke="#fff">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, '']}
                  contentStyle={{ background: '#fff', border: '1px solid #DDE6F2', borderRadius: 12 }}
                  labelStyle={{ color: '#7A97B4' }}
                  itemStyle={{ color: '#0A1929', fontWeight: 700 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {holdings.map(h => (
              <div key={h.symbol} className="flex items-center gap-2" style={{ fontSize: 13 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: h.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 600, color: '#3D5A78' }}>{h.symbol}</span>
                <span style={{ fontWeight: 800, color: '#0A1929' }}>{h.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings + Recent tx */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr' }}>

        {/* Holdings table */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #DDE6F2' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>Holdings</div>
          </div>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', padding: '10px 22px', borderBottom: '1px solid #EEF3FB' }}>
            {['Asset', 'Amount', 'Value', '24h', 'Allocation'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A8BDD4' }}>{h}</div>
            ))}
          </div>
          {holdings.map(h => (
            <div key={h.symbol}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', padding: '14px 22px', alignItems: 'center', borderBottom: '1px solid #EEF3FB', transition: 'background 0.15s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                  {h.symbol[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1929' }}>{h.symbol}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#7A97B4' }}>{h.name}</div>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{h.amount}</span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{h.usd}</span>
              <div className="flex items-center gap-1" style={{ fontSize: 13, fontWeight: 800, color: h.positive ? '#057A4B' : '#C5202B' }}>
                {h.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {h.change}
              </div>
              <div className="flex items-center gap-2">
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#EEF3FB', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: h.color, width: `${h.pct}%`, transition: 'width 0.7s' }} />
                </div>
                <span style={{ fontSize: 12, width: 28, textAlign: 'right', flexShrink: 0, fontWeight: 700, color: '#7A97B4' }}>{h.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div className="flex items-center justify-between" style={{ padding: '18px 22px', borderBottom: '1px solid #DDE6F2' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>Recent Transactions</div>
            <button style={{ fontSize: 13, fontWeight: 800, color: '#0B50D4', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0840AA' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#0B50D4' }}>
              View all
            </button>
          </div>
          <div>
            {recentTx.map((tx, i) => {
              const isReceive = tx.type === 'receive'
              return (
                <div key={i}
                  className="flex items-center gap-3"
                  style={{ padding: '14px 22px', borderBottom: '1px solid #EEF3FB', transition: 'background 0.15s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: isReceive ? '#E4F7EE' : '#E8EFFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isReceive
                      ? <ArrowDownLeft size={15} style={{ color: '#057A4B' }} />
                      : <ArrowUpRight  size={15} style={{ color: '#0B50D4' }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1929', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.desc}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#A8BDD4', marginTop: 2 }}>{tx.time}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: isReceive ? '#057A4B' : '#0A1929' }}>{tx.usd}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: '#A8BDD4', marginTop: 2 }}>{tx.amount}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
)
