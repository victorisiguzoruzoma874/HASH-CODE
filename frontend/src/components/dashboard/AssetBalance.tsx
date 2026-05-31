import React from 'react'
import { TrendingUp } from 'lucide-react'

interface AssetBalanceProps { compact?: boolean }

const tokens = [
  { symbol: 'ETH',  name: 'Ethereum', amount: '2.45',     usd: '$8,615', pct: 57, color: '#0B50D4' },
  { symbol: 'USDC', name: 'USD Coin', amount: '1,429.55', usd: '$1,429', pct: 18, color: '#0891B2' },
  { symbol: 'LINK', name: 'Chainlink',amount: '142.00',   usd: '$2,840', pct: 10, color: '#7C3AED' },
]

export const AssetBalance: React.FC<AssetBalanceProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#E8EFFE' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B50D4" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
            </svg>
          </div>
          <span className="text-[12px] font-bold" style={{ color: '#7A97B4' }}>Asset Balance</span>
        </div>
        <div className="text-[22px] font-black font-mono leading-none" style={{ color: '#0A1929' }}>2.45 ETH</div>
        <div className="text-[12px] font-semibold font-mono mt-1" style={{ color: '#7A97B4' }}>$8,615.28</div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-5 bg-white"
      style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid #EEF3FB', paddingBottom: 14 }}>
        <div>
          <div className="text-[11px] font-bold tracking-[0.08em] uppercase mb-2" style={{ color: '#7A97B4' }}>
            Asset Balance
          </div>
          <div className="text-[28px] font-black font-mono leading-none tracking-tight" style={{ color: '#0A1929' }}>
            2.45 ETH
          </div>
          <div className="text-[13px] font-semibold font-mono mt-1" style={{ color: '#7A97B4' }}>$6,842.12 USD</div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: '#E4F7EE', color: '#057A4B' }}
        >
          <TrendingUp size={11} />
          +2.1%
        </div>
      </div>

      {/* Allocation bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[12px] font-semibold mb-1.5">
          <span style={{ color: '#7A97B4' }}>Portfolio Allocation</span>
          <span style={{ color: '#3D5A78' }}>72.4%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#EEF3FB' }}>
          <div
            className="h-full rounded-full"
            style={{ width: '72.4%', background: 'linear-gradient(90deg, #0B50D4, #0891B2)' }}
          />
        </div>
      </div>

      {/* Token rows */}
      <div className="flex flex-col gap-3.5">
        {tokens.map(token => (
          <div key={token.symbol} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
              style={{ background: token.color }}
            >
              {token.symbol[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-bold" style={{ color: '#0A1929' }}>{token.symbol}</span>
                <span className="font-mono font-semibold" style={{ color: '#3D5A78' }}>{token.usd}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EEF3FB' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${token.pct}%`, background: token.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
