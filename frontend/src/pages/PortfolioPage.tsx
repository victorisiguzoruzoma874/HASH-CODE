import React from 'react'
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'

const holdings = [
  { symbol: 'ETH',  name: 'Ethereum',    amount: '2.45',     usd: '₦13,565,358', change: '+5.2%', positive: true,  pct: 57 },
  { symbol: 'USDC', name: 'USD Coin',    amount: '1,429.55', usd: '₦2,237,246',  change: '0.0%',  positive: true,  pct: 9  },
  { symbol: 'LINK', name: 'Chainlink',   amount: '142.00',   usd: '₦4,444,788',  change: '+8.7%', positive: true,  pct: 19 },
  { symbol: 'DAI',  name: 'Dai',         amount: '500.00',   usd: '₦782,500',    change: '-0.1%', positive: false, pct: 3  },
  { symbol: 'WETH', name: 'Wrapped ETH', amount: '0.50',     usd: '₦2,752,615',  change: '+5.1%', positive: true,  pct: 12 },
]

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
  { label: 'Total value',    value: '₦23,699,507', change: '+12.4%', positive: true },
  { label: '24h change',     value: '+₦1,317,630', change: '+5.9%',  positive: true },
  { label: 'Total invested', value: '₦19,406,000', change: '',       positive: true },
  { label: 'Total profit',   value: '+₦4,293,507', change: '+22.1%', positive: true },
]

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="dash-pop" style={{ position: 'static', minWidth: 0, padding: '8px 12px' }}>
        <div style={{ fontSize: 12, color: 'var(--grey)' }}>{label}</div>
        <b className="dash-mono">₦{(payload[0].value * 1565).toLocaleString()}</b>
      </div>
    )
  }
  return null
}

export const PortfolioPage: React.FC = () => (
  <div className="dash-page">
    <div className="dash-ph">
      <div>
        <h1>Portfolio</h1>
        <p>Your complete asset overview.</p>
      </div>
    </div>

    <div className="dash-stats">
      {statCards.map(s => (
        <div className="dash-stat" key={s.label}>
          <div className="lp-label" style={{ marginBottom: 4 }}>{s.label}</div>
          <div className="v">{s.value}</div>
          {s.change && <div className={`d ${s.positive ? 'dash-green' : 'dash-red'}`}>{s.change}</div>}
        </div>
      ))}
    </div>

    <section className="dash-card" aria-label="Performance">
      <div className="dash-hero">
        <div>
          <div className="lp-label" style={{ marginBottom: 6 }}>Performance</div>
          <div className="dash-big">₦23,699,507</div>
        </div>
        <span className="dash-green" style={{ fontWeight: 600 }}>+12.4% this week</span>
      </div>
      <div className="dash-chart" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeOpacity={0.12} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--grey)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--grey)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `₦${(v * 1565 / 1_000_000).toFixed(1)}M`} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--line)', strokeOpacity: 0.3 }} />
            <Area type="monotone" dataKey="value" stroke="var(--ink)" strokeWidth={2} fill="none" dot={false} isAnimationActive={false}
              activeDot={{ r: 4, fill: 'var(--ink)', stroke: 'var(--bg)', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>

    <div className="dash-2col">
      <section className="dash-card" aria-label="Holdings">
        <header><h2>Holdings</h2><span>{holdings.length} assets</span></header>
        <div className="dash-tablewrap">
          <div className="dash-tr head" style={{ '--cols': '1.6fr 1fr 1.3fr 0.8fr 1.6fr' } as React.CSSProperties}>
            {['Asset', 'Amount', 'Value', '24h', 'Allocation'].map(h => <div key={h}>{h}</div>)}
          </div>
          {holdings.map(h => (
            <div className="dash-tr" key={h.symbol} style={{ '--cols': '1.6fr 1fr 1.3fr 0.8fr 1.6fr' } as React.CSSProperties}>
              <div>
                <b>{h.symbol}</b>
                <div className="dash-meta">{h.name}</div>
              </div>
              <span className="dash-mono">{h.amount}</span>
              <span className="dash-mono">{h.usd}</span>
              <span className={`dash-mono ${h.positive ? 'dash-green' : 'dash-red'}`}>{h.change}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="dash-bar" style={{ flex: 1 }}><i style={{ width: `${h.pct}%` }} /></div>
                <span className="dash-meta" style={{ width: 32, textAlign: 'right' }}>{h.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dash-card" aria-label="Recent transactions">
        <header><h2>Recent transactions</h2><span>Last 4</span></header>
        {recentTx.map((tx, i) => (
          <div className="dash-row" key={i}>
            <div className="bar" style={tx.type === 'receive' ? undefined : { background: 'var(--meta)' }} />
            <div className="main">
              <div className="t">{tx.desc}</div>
              <div className="sub">{tx.time}</div>
            </div>
            <div className="num">
              <span className={tx.type === 'receive' ? 'dash-green' : undefined}>{tx.usd}</span>
              <small>{tx.amount}</small>
            </div>
          </div>
        ))}
      </section>
    </div>
  </div>
)
