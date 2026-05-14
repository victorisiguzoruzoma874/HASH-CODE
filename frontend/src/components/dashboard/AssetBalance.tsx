import React from 'react'
import { TrendingUp } from 'lucide-react'

interface AssetBalanceProps { compact?: boolean }

const tokens = [
  { symbol: 'ETH',  name: 'Ethereum', amount: '2.45',     usd: '$8,615', pct: 57, color: '#3B82F6' },
  { symbol: 'USDC', name: 'USD Coin', amount: '1,429.55', usd: '$1,429', pct: 18, color: '#06B6D4' },
  { symbol: 'LINK', name: 'Chainlink',amount: '142.00',   usd: '$2,840', pct: 10, color: '#8B5CF6' },
]

export const AssetBalance: React.FC<AssetBalanceProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="rounded-[16px] p-4" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
            </svg>
          </div>
          <span className="text-[11px] font-medium" style={{ color: '#64748B' }}>Asset Balance</span>
        </div>
        <div className="text-[22px] font-bold font-mono leading-none" style={{ color: '#F8FAFC' }}>2.45 ETH</div>
        <div className="text-[12px] font-mono mt-1" style={{ color: '#64748B' }}>$8,615.28</div>
      </div>
    )
  }

  return (
    <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid #1E293B', paddingBottom: 14 }}>
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: '#64748B' }}>
            Asset Balance
          </div>
          <div className="text-[28px] font-bold font-mono leading-none tracking-tight" style={{ color: '#F8FAFC' }}>
            2.45 ETH
          </div>
          <div className="text-[13px] font-mono mt-1" style={{ color: '#64748B' }}>$6,842.12 USD</div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: 'rgba(34,197,94,0.08)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.15)' }}
        >
          <TrendingUp size={11} />
          +2.1%
        </div>
      </div>

      {/* Allocation bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] mb-1.5" style={{ color: '#64748B' }}>
          <span>Portfolio Allocation</span>
          <span style={{ color: '#94A3B8' }}>72.4%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#162033' }}>
          <div
            className="h-full rounded-full"
            style={{ width: '72.4%', background: 'linear-gradient(90deg, #3B82F6, #06B6D4)' }}
          />
        </div>
      </div>

      {/* Token rows */}
      <div className="flex flex-col gap-3">
        {tokens.map(token => (
          <div key={token.symbol} className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: token.color }}
            >
              {token.symbol[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[12px] mb-1">
                <span className="font-medium" style={{ color: '#F8FAFC' }}>{token.symbol}</span>
                <span className="font-mono" style={{ color: '#64748B' }}>{token.usd}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: '#162033' }}>
                <div className="h-full rounded-full" style={{ width: `${token.pct}%`, background: token.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
