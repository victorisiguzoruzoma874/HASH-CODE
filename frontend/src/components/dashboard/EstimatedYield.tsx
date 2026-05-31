import React from 'react'
import { Zap } from 'lucide-react'

interface EstimatedYieldProps { compact?: boolean }

const pools = [
  { label: 'ETH/USDC Pool', pct: 68, color: '#0B50D4', apy: '6.2%' },
  { label: 'WETH/DAI Pool', pct: 45, color: '#0891B2', apy: '5.1%' },
  { label: 'LINK Staking',  pct: 30, color: '#7C3AED', apy: '4.8%' },
]

export const EstimatedYield: React.FC<EstimatedYieldProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#E4F7EE' }}>
            <Zap size={13} style={{ color: '#057A4B' }} />
          </div>
          <span className="text-[12px] font-bold" style={{ color: '#7A97B4' }}>Estimated Yield</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[22px] font-black font-mono leading-none" style={{ color: '#057A4B' }}>5.82%</span>
          <span className="text-[12px] font-semibold" style={{ color: '#7A97B4' }}>APR</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-5 bg-white"
      style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4" style={{ borderBottom: '1px solid #EEF3FB', paddingBottom: 14 }}>
        <div>
          <div className="text-[11px] font-bold tracking-[0.08em] uppercase mb-2" style={{ color: '#7A97B4' }}>
            Estimated Yield
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-black font-mono leading-none tracking-tight" style={{ color: '#057A4B' }}>
              5.82%
            </span>
            <span className="text-[14px] font-bold" style={{ color: '#7A97B4' }}>APR</span>
          </div>
          <div className="text-[12px] font-semibold mt-1" style={{ color: '#7A97B4' }}>+$342.10 est. monthly</div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: '#E4F7EE', color: '#057A4B' }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#057A4B' }} />
          Compounding
        </div>
      </div>

      {/* Pool bars */}
      <div className="flex flex-col gap-3.5 mb-4">
        {pools.map(pool => (
          <div key={pool.label}>
            <div className="flex justify-between text-[12px] font-semibold mb-1.5">
              <span style={{ color: '#3D5A78' }}>{pool.label}</span>
              <span className="font-bold" style={{ color: pool.color }}>{pool.apy}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EEF3FB' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pool.pct}%`, background: pool.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[13px]">
        <span style={{ color: '#7A97B4' }}>
          Active Pools: <span className="font-bold" style={{ color: '#3D5A78' }}>4</span>
        </span>
        <button
          className="font-bold transition-colors"
          style={{ color: '#0B50D4' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0840AA' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#0B50D4' }}
        >
          Manage →
        </button>
      </div>
    </div>
  )
}
