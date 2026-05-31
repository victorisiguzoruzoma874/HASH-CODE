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
        className="px-3 py-2.5 rounded-xl bg-white"
        style={{ border: '1px solid #DDE6F2', boxShadow: '0 8px 24px rgba(10,25,41,0.12)' }}
      >
        <p className="text-[10px] font-bold tracking-[0.1em] uppercase mb-1" style={{ color: '#7A97B4' }}>{label}</p>
        <p className="text-[16px] font-black font-mono" style={{ color: '#0B50D4' }}>
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
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between" style={{ borderBottom: '1px solid #EEF3FB' }}>
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#057A4B' }} />
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: '#7A97B4' }}>
              Portfolio Overview
            </span>
          </div>
          <div className="text-[34px] font-black font-mono leading-none tracking-tight" style={{ color: '#0A1929' }}>
            {totalBalance}
          </div>
          <motion.div
            key={changePercent}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full text-[12px] font-bold"
            style={changePositive
              ? { background: '#E4F7EE', color: '#057A4B' }
              : { background: '#FDECEA', color: '#C5202B' }
            }
          >
            {changePositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {changePercent} this period
          </motion.div>
        </div>

        {/* Timeframe tabs */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-xl"
          style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}
        >
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all duration-200"
              style={timeframe === tf
                ? { background: '#0B50D4', color: '#fff', boxShadow: '0 2px 8px rgba(11,80,212,0.25)' }
                : { color: '#7A97B4' }
              }
              onMouseEnter={e => { if (timeframe !== tf) e.currentTarget.style.color = '#0A1929' }}
              onMouseLeave={e => { if (timeframe !== tf) e.currentTarget.style.color = '#7A97B4' }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-3 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#0B50D4" stopOpacity={0.18} />
                <stop offset="60%"  stopColor="#0891B2" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#0891B2" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lineGradLight" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#0B50D4" />
                <stop offset="100%" stopColor="#0891B2" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(221,230,242,0.8)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: '#A8BDD4', fontSize: 10, fontWeight: 700 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: '#A8BDD4', fontSize: 10, fontWeight: 600 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(11,80,212,0.2)', strokeWidth: 1 }} />
            <Area
              type="monotone" dataKey="value"
              stroke="url(#lineGradLight)" strokeWidth={2.5}
              fill="url(#chartGradLight)" dot={false}
              activeDot={{ r: 5, fill: '#0B50D4', stroke: '#fff', strokeWidth: 2.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
