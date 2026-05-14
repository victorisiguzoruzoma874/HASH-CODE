import React from 'react'
import { Zap } from 'lucide-react'

interface EstimatedYieldProps { compact?: boolean }

const pools = [
  { label: 'ETH/USDC Pool', pct: 68, color: '#3B82F6',  apy: '6.2%' },
  { label: 'WETH/DAI Pool', pct: 45, color: '#06B6D4',  apy: '5.1%' },
  { label: 'LINK Staking',  pct: 30, color: '#8B5CF6',  apy: '4.8%' },
]

export const EstimatedYield: React.FC<EstimatedYieldProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="rounded-[16px] p-4" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Zap size={13} style={{ color: '#22C55E' }} />
          </div>
          <span className="text-[11px] font-medium" style={{ color: '#64748B' }}>Estimated Yield</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[22px] font-bold font-mono leading-none" style={{ color: '#22C55E' }}>5.82%</span>
          <span className="text-[12px]" style={{ color: '#64748B' }}>APR</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4" style={{ borderBottom: '1px solid #1E293B', paddingBottom: 14 }}>
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: '#64748B' }}>
            Estimated Yield
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-bold font-mono leading-none tracking-tight" style={{ color: '#22C55E' }}>
              5.82%
            </span>
            <span className="text-[14px] font-medium" style={{ color: '#64748B' }}>APR</span>
          </div>
          <div className="text-[12px] mt-1" style={{ color: '#64748B' }}>+$342.10 est. monthly</div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: 'rgba(34,197,94,0.08)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.15)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          Compounding
        </div>
      </div>

      {/* Pool bars */}
      <div className="flex flex-col gap-3 mb-4">
        {pools.map(pool => (
          <div key={pool.label}>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span style={{ color: '#64748B' }}>{pool.label}</span>
              <span className="font-semibold" style={{ color: pool.color }}>{pool.apy}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#162033' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pool.pct}%`, background: pool.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <span style={{ color: '#64748B' }}>
          Active Pools: <span className="font-semibold" style={{ color: '#94A3B8' }}>4</span>
        </span>
        <button
          className="font-medium transition-colors"
          style={{ color: '#3B82F6' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#60A5FA' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#3B82F6' }}
        >
          Manage →
        </button>
      </div>
    </div>
  )
}
