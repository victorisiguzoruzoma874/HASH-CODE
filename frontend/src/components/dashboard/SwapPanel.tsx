import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ChevronDown, Info, Zap } from 'lucide-react'

export const SwapPanel: React.FC = () => {
  const [sellAmount, setSellAmount] = useState('0.45')
  const [sellToken, setSellToken]   = useState('ETH')
  const [buyToken,  setBuyToken]    = useState('USDC')
  const [loading,   setLoading]     = useState(false)
  const [success,   setSuccess]     = useState(false)

  const rate      = 3516.44
  const buyAmount = (parseFloat(sellAmount || '0') * rate).toFixed(2)

  const handleSwap = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }, 2000)
  }

  return (
    <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>Quick Swap</div>
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#64748B' }}>
          <Info size={11} />
          0.5% slippage
        </div>
      </div>

      {/* Sell box */}
      <div className="rounded-[12px] p-3.5 mb-1" style={{ background: '#162033', border: '1px solid #1E293B' }}>
        <div className="flex justify-between text-[11px] mb-2" style={{ color: '#64748B' }}>
          <span>Sell</span>
          <span>Balance: 2.45 ETH</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={sellAmount}
            onChange={e => setSellAmount(e.target.value)}
            className="flex-1 bg-transparent text-[20px] font-bold font-mono outline-none min-w-0"
            style={{ color: '#F8FAFC' }}
            placeholder="0.00"
          />
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
            style={{ background: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC' }}
          >
            <div className="w-4 h-4 rounded-full bg-[#3B82F6] flex items-center justify-center text-[8px] font-bold text-white">E</div>
            {sellToken}
            <ChevronDown size={11} style={{ color: '#64748B' }} />
          </button>
        </div>
      </div>

      {/* Flip */}
      <div className="flex justify-center my-1 relative z-10">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { setSellToken(buyToken); setBuyToken(sellToken) }}
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}
        >
          <ArrowUpDown size={13} className="text-white" />
        </motion.button>
      </div>

      {/* Buy box */}
      <div className="rounded-[12px] p-3.5 mb-4" style={{ background: '#162033', border: '1px solid #1E293B' }}>
        <div className="flex justify-between text-[11px] mb-2" style={{ color: '#64748B' }}>
          <span>Buy</span>
          <span>Balance: 0.00 USDC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-[20px] font-bold font-mono" style={{ color: '#22C55E' }}>{buyAmount}</div>
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
            style={{ background: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC' }}
          >
            <div className="w-4 h-4 rounded-full bg-[#06B6D4] flex items-center justify-center text-[8px] font-bold text-white">U</div>
            {buyToken}
            <ChevronDown size={11} style={{ color: '#64748B' }} />
          </button>
        </div>
      </div>

      {/* Rate row */}
      <div className="flex justify-between text-[11px] mb-4" style={{ color: '#64748B' }}>
        <span>1 ETH = {rate.toLocaleString()} USDC</span>
        <span style={{ color: '#334155' }}>~$4.12 fee</span>
      </div>

      {/* CTA */}
      {success ? (
        <div
          className="w-full py-3 rounded-[12px] text-[13px] font-semibold text-center"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          ✓ Swap Successful
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSwap}
          disabled={loading}
          className="w-full py-3 rounded-[12px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
            <><Zap size={14} /> Swap Assets</>
          )}
        </motion.button>
      )}
    </div>
  )
}
