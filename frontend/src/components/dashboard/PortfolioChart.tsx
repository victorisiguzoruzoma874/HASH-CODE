import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { TrendingUp, TrendingDown } from 'lucide-react'

const timeframes = ['1W', '1M', '3M', 'ALL'] as const

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div
        className="px-3 py-2.5 rounded-[10px] shadow-xl"
        style={{ background: '#162033', border: '1px solid #1E293B' }}
      >
        <p className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1" style={{ color: '#64748B' }}>{label}</p>
        <p className="text-[15px] font-bold font-mono" style={{ color: '#22C55E' }}>
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

export const PortfolioChart: React.FC = () => {
  const { totalBalance, changePercent, changePositive, timeframe, chartData } = useStore(s => s.portfolio)
  const setTimeframe = useStore(s => s.setTimeframe)

  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between" style={{ borderBottom: '1px solid #1E293B' }}>
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingUp size={11} style={{ color: '#64748B' }} />
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: '#64748B' }}>
              Portfolio Overview
            </span>
          </div>
          <div className="text-[32px] font-bold font-mono leading-none tracking-tight" style={{ color: '#F8FAFC' }}>
            {totalBalance}
          </div>
          <motion.div
            key={changePercent}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[12px] font-semibold"
            style={changePositive
              ? { background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.15)' }
              : { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }
            }
          >
            {changePositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {changePercent} this period
          </motion.div>
        </div>

        {/* Timeframe tabs */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-[10px]"
          style={{ background: '#162033', border: '1px solid #1E293B' }}
        >
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-3 py-1.5 text-[12px] font-semibold rounded-[8px] transition-all duration-200"
              style={timeframe === tf
                ? { background: '#1E293B', color: '#F8FAFC' }
                : { color: '#64748B' }
              }
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-3 h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: '#334155', fontSize: 10, fontWeight: 500 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: '#334155', fontSize: 10 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(59,130,246,0.2)', strokeWidth: 1 }} />
            <Area
              type="monotone" dataKey="value"
              stroke="#3B82F6" strokeWidth={2.5}
              fill="url(#chartGrad)" dot={false}
              activeDot={{ r: 5, fill: '#3B82F6', stroke: '#07111F', strokeWidth: 2.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
