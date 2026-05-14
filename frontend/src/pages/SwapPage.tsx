import React, { useState } from 'react'
import { ArrowUpDown, ChevronDown, Info, Zap, RefreshCw, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

const tokens = [
  { symbol: 'ETH',  name: 'Ethereum',    balance: '2.45',     color: '#3B82F6' },
  { symbol: 'USDC', name: 'USD Coin',    balance: '1,429.55', color: '#06B6D4' },
  { symbol: 'LINK', name: 'Chainlink',   balance: '142.00',   color: '#F59E0B' },
  { symbol: 'DAI',  name: 'Dai',         balance: '500.00',   color: '#F59E0B' },
  { symbol: 'WETH', name: 'Wrapped ETH', balance: '0.50',     color: '#3B82F6' },
]

const recentSwaps = [
  { from: 'ETH',  to: 'USDC', amount: '0.5 ETH',  received: '₦2,752,500',   time: '2h ago',  status: 'completed' },
  { from: 'LINK', to: 'ETH',  amount: '50 LINK',  received: '0.028 ETH',    time: '1d ago',  status: 'completed' },
  { from: 'ETH',  to: 'DAI',  amount: '0.2 ETH',  received: '703.29 DAI',   time: '2d ago',  status: 'completed' },
]

export const SwapPage: React.FC = () => {
  const [sellToken,  setSellToken]  = useState(tokens[0])
  const [buyToken,   setBuyToken]   = useState(tokens[1])
  const [sellAmount, setSellAmount] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)

  const rate      = 3516.44
  const buyAmount = sellAmount ? (parseFloat(sellAmount) * rate).toFixed(2) : ''

  const handleSwap = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }, 2000)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid #1E293B' }}>
        <h1 className="text-[20px] font-bold" style={{ color: '#F8FAFC' }}>Swap Tokens</h1>
        <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>Instant cross-chain token exchange</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6 max-w-[960px] mx-auto">

          {/* ── Swap form ── */}
          <div className="w-[440px] flex-shrink-0">
            <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>

              {/* Sell */}
              <div className="rounded-[14px] p-4 mb-1" style={{ background: '#162033', border: '1px solid #1E293B' }}>
                <div className="flex justify-between text-[11px] mb-3" style={{ color: '#64748B' }}>
                  <span>Sell</span>
                  <span>Balance: {sellToken.balance} {sellToken.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number" value={sellAmount}
                    onChange={e => setSellAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-[28px] font-bold font-mono outline-none min-w-0"
                    style={{ color: '#F8FAFC' }}
                  />
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-[10px] transition-all flex-shrink-0"
                    style={{ background: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC' }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: sellToken.color }}>
                      {sellToken.symbol[0]}
                    </div>
                    <span className="text-[13px] font-semibold">{sellToken.symbol}</span>
                    <ChevronDown size={12} style={{ color: '#64748B' }} />
                  </button>
                </div>
                {sellAmount && (
                  <div className="text-[11px] font-mono mt-2" style={{ color: '#64748B' }}>
                    ≈ ₦{(parseFloat(sellAmount) * rate * 1565).toLocaleString()} NGN
                  </div>
                )}
              </div>

              {/* Flip */}
              <div className="flex justify-center my-1 relative z-10">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { setSellToken(buyToken); setBuyToken(sellToken) }}
                  className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}
                >
                  <ArrowUpDown size={15} className="text-white" />
                </motion.button>
              </div>

              {/* Buy */}
              <div className="rounded-[14px] p-4 mt-1 mb-5" style={{ background: '#162033', border: '1px solid #1E293B' }}>
                <div className="flex justify-between text-[11px] mb-3" style={{ color: '#64748B' }}>
                  <span>Buy</span>
                  <span>Balance: {buyToken.balance} {buyToken.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-[28px] font-bold font-mono" style={{ color: '#22C55E' }}>
                    {buyAmount || '0.00'}
                  </div>
                  <button
                    className="flex items-center gap-2 px-3 py-2 rounded-[10px] transition-all flex-shrink-0"
                    style={{ background: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC' }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: buyToken.color }}>
                      {buyToken.symbol[0]}
                    </div>
                    <span className="text-[13px] font-semibold">{buyToken.symbol}</span>
                    <ChevronDown size={12} style={{ color: '#64748B' }} />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="rounded-[12px] p-4 mb-5 flex flex-col gap-2.5 text-[12px]"
                style={{ background: '#162033', border: '1px solid #1E293B' }}>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1" style={{ color: '#64748B' }}>
                    Rate <Info size={11} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono" style={{ color: '#F8FAFC' }}>
                      1 {sellToken.symbol} = {rate.toLocaleString()} {buyToken.symbol}
                    </span>
                    <button style={{ color: '#3B82F6' }}><RefreshCw size={11} /></button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#64748B' }}>Slippage</span>
                  <span style={{ color: '#F8FAFC' }}>0.5%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#64748B' }}>Network Fee</span>
                  <span className="font-mono" style={{ color: '#F8FAFC' }}>~₦6,441.69</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#64748B' }}>Route</span>
                  <span style={{ color: '#F8FAFC' }}>{sellToken.symbol} → {buyToken.symbol}</span>
                </div>
              </div>

              {success ? (
                <div className="w-full py-3.5 rounded-[12px] text-[13px] font-semibold text-center"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                  ✓ Swap Successful
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSwap}
                  disabled={loading || !sellAmount}
                  className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #22C55E, #06B6D4)', color: '#07111F' }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Swapping…
                    </>
                  ) : (
                    <><Zap size={15} /> Swap {sellToken.symbol} → {buyToken.symbol}</>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* ── Right panels ── */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Token list */}
            <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-4" style={{ color: '#64748B' }}>
                Available Tokens
              </div>
              <div className="flex flex-col gap-0.5">
                {tokens.map(t => (
                  <div
                    key={t.symbol}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-all"
                    style={{ color: '#F8FAFC' }}
                    onClick={() => setSellToken(t)}
                    onMouseEnter={e => { e.currentTarget.style.background = '#162033' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: t.color }}>
                      {t.symbol[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>{t.symbol}</div>
                      <div className="text-[11px]" style={{ color: '#64748B' }}>{t.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-mono" style={{ color: '#F8FAFC' }}>{t.balance}</div>
                      <div className="text-[10px]" style={{ color: '#64748B' }}>Balance</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent swaps */}
            <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-4" style={{ color: '#64748B' }}>
                Recent Swaps
              </div>
              <div className="flex flex-col gap-0.5">
                {recentSwaps.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all"
                    onMouseEnter={e => { e.currentTarget.style.background = '#162033' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(59,130,246,0.12)' }}>
                      <TrendingUp size={14} style={{ color: '#3B82F6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium" style={{ color: '#F8FAFC' }}>{s.from} → {s.to}</div>
                      <div className="text-[11px]" style={{ color: '#64748B' }}>{s.amount} · {s.time}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13px] font-mono font-semibold" style={{ color: '#22C55E' }}>{s.received}</div>
                      <div className="text-[10px] px-1.5 py-0.5 rounded-full inline-block font-semibold"
                        style={{ background: 'rgba(34,197,94,0.08)', color: '#22C55E' }}>
                        {s.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
