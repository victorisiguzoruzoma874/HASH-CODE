import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

const holdings = [
  { symbol: 'ETH',  name: 'Ethereum',    amount: '2.45',     usd: '₦13,565,358', change: '+5.2%', positive: true,  pct: 57, color: '#3B82F6' },
  { symbol: 'USDC', name: 'USD Coin',    amount: '1,429.55', usd: '₦2,237,246',  change: '0.0%',  positive: true,  pct: 9,  color: '#06B6D4' },
  { symbol: 'LINK', name: 'Chainlink',   amount: '142.00',   usd: '₦4,444,788',  change: '+8.7%', positive: true,  pct: 19, color: '#F59E0B' },
  { symbol: 'DAI',  name: 'Dai',         amount: '500.00',   usd: '₦782,500',    change: '-0.1%', positive: false, pct: 3,  color: '#EF4444' },
  { symbol: 'WETH', name: 'Wrapped ETH', amount: '0.50',     usd: '₦2,752,615',  change: '+5.1%', positive: true,  pct: 12, color: '#8B5CF6' },
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

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="px-3 py-2.5 rounded-[10px] shadow-xl"
        style={{ background: '#162033', border: '1px solid #1E293B' }}>
        <p className="text-[10px] font-semibold tracking-wide uppercase mb-1" style={{ color: '#64748B' }}>{label}</p>
        <p className="text-[15px] font-bold font-mono" style={{ color: '#3B82F6' }}>
          ₦{(payload[0].value * 1565).toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

const statCards = [
  { label: 'Total Value',    value: '₦23,699,507', change: '+12.4%', positive: true },
  { label: '24h Change',     value: '+₦1,317,630', change: '+5.9%',  positive: true },
  { label: 'Total Invested', value: '₦19,406,000', change: '',       positive: true },
  { label: 'Total Profit',   value: '+₦4,293,507', change: '+22.1%', positive: true },
]

export const PortfolioPage: React.FC = () => (
  <div className="h-full flex flex-col">
    {/* Header */}
    <div className="px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid #1E293B' }}>
      <h1 className="text-[20px] font-bold" style={{ color: '#F8FAFC' }}>Portfolio</h1>
      <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>Your complete asset overview</p>
    </div>

    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="rounded-[18px] p-4"
            style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
            <div className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1.5" style={{ color: '#64748B' }}>
              {card.label}
            </div>
            <div className="text-[22px] font-bold font-mono leading-tight" style={{ color: '#F8FAFC' }}>
              {card.value}
            </div>
            {card.change && (
              <div className="text-[12px] font-semibold mt-1 flex items-center gap-1"
                style={{ color: card.positive ? '#22C55E' : '#EF4444' }}>
                {card.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {card.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart + Pie */}
      <div className="grid grid-cols-3 gap-5">

        {/* Performance chart */}
        <div className="col-span-2 rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: '#64748B' }}>
                Performance
              </div>
              <div className="text-[24px] font-bold font-mono" style={{ color: '#F8FAFC' }}>₦23,699,507</div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold"
              style={{ background: 'rgba(34,197,94,0.08)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.15)' }}>
              <TrendingUp size={11} /> +12.4% this week
            </div>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₦${(v * 1565 / 1_000_000).toFixed(1)}M`} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(59,130,246,0.2)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2.5}
                  fill="url(#portfolioGrad2)" dot={false}
                  activeDot={{ r: 4, fill: '#3B82F6', stroke: '#07111F', strokeWidth: 2.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocation pie */}
        <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: '#64748B' }}>
            Allocation
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, '']}
                  contentStyle={{ background: '#162033', border: '1px solid #1E293B', borderRadius: 10 }}
                  labelStyle={{ color: '#64748B' }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            {holdings.map(h => (
              <div key={h.symbol} className="flex items-center gap-2 text-[12px]">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: h.color }} />
                <span className="flex-1" style={{ color: '#64748B' }}>{h.symbol}</span>
                <span className="font-semibold" style={{ color: '#F8FAFC' }}>{h.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings + Recent tx */}
      <div className="grid grid-cols-3 gap-5">

        {/* Holdings table */}
        <div className="col-span-2 rounded-[20px] overflow-hidden" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #1E293B' }}>
            <h3 className="text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>Holdings</h3>
          </div>
          <div className="grid px-5 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', borderBottom: '1px solid #1E293B', color: '#334155' }}>
            <span>Asset</span><span>Amount</span><span>Value</span><span>24h</span><span>Allocation</span>
          </div>
          {holdings.map(h => (
            <div key={h.symbol}
              className="grid px-5 py-3.5 items-center transition-colors"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', borderBottom: '1px solid #162033' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: h.color }}>
                  {h.symbol[0]}
                </div>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>{h.symbol}</div>
                  <div className="text-[11px]" style={{ color: '#64748B' }}>{h.name}</div>
                </div>
              </div>
              <span className="text-[13px] font-mono" style={{ color: '#F8FAFC' }}>{h.amount}</span>
              <span className="text-[13px] font-mono" style={{ color: '#F8FAFC' }}>{h.usd}</span>
              <span className="text-[12px] font-semibold flex items-center gap-0.5"
                style={{ color: h.positive ? '#22C55E' : '#EF4444' }}>
                {h.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {h.change}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#162033' }}>
                  <div className="h-full rounded-full" style={{ width: `${h.pct}%`, background: h.color }} />
                </div>
                <span className="text-[11px] w-7 text-right flex-shrink-0" style={{ color: '#64748B' }}>{h.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        <div className="rounded-[20px] overflow-hidden" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1E293B' }}>
            <h3 className="text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>Recent Transactions</h3>
            <button className="text-[12px] font-medium transition-colors" style={{ color: '#3B82F6' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#60A5FA' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#3B82F6' }}>
              View all
            </button>
          </div>
          <div className="flex flex-col">
            {recentTx.map((tx, i) => {
              const isReceive = tx.type === 'receive'
              return (
                <div key={i}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: '1px solid #162033' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: isReceive ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)' }}>
                    {isReceive
                      ? <ArrowDownLeft size={14} style={{ color: '#22C55E' }} />
                      : <ArrowUpRight  size={14} style={{ color: '#3B82F6' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: '#F8FAFC' }}>{tx.desc}</div>
                    <div className="text-[11px]" style={{ color: '#334155' }}>{tx.time}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[13px] font-semibold font-mono"
                      style={{ color: isReceive ? '#22C55E' : '#94A3B8' }}>
                      {tx.usd}
                    </div>
                    <div className="text-[11px] font-mono" style={{ color: '#334155' }}>{tx.amount}</div>
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
