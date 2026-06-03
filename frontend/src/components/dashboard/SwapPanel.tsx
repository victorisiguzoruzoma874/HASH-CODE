import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ChevronDown, Info, Zap } from 'lucide-react'
import { Spinner } from '../ui/Spinner'

export const SwapPanel: React.FC = () => {
  const [sellAmount, setSellAmount] = useState('0.45')
  const [sellToken,  setSellToken]  = useState('ETH')
  const [buyToken,   setBuyToken]   = useState('USDC')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)

  const rate      = 3516.44
  const buyAmount = (parseFloat(sellAmount || '0') * rate).toFixed(2)

  const handleSwap = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }, 2000)
  }

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 bg-white"
      style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] font-black" style={{ color: '#0A1929' }}>Quick Swap</div>
          <div className="text-[12px] font-semibold mt-0.5" style={{ color: '#7A97B4' }}>Instant token exchange</div>
        </div>
        <div
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ color: '#7A97B4', background: '#EEF3FB', border: '1px solid #DDE6F2' }}
        >
          <Info size={10} />
          0.5% fee
        </div>
      </div>

      {/* Sell box */}
      <div className="rounded-xl p-4" style={{ background: '#F4F8FD', border: '1px solid #DDE6F2' }}>
        <div className="flex justify-between text-[12px] font-semibold mb-2.5">
          <span style={{ color: '#7A97B4' }}>You pay</span>
          <span style={{ color: '#7A97B4' }}>Balance: 2.45 ETH</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={sellAmount}
            onChange={e => setSellAmount(e.target.value)}
            className="flex-1 bg-transparent text-[22px] font-black font-mono outline-none min-w-0"
            style={{ color: '#0A1929' }}
            placeholder="0.00"
          />
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold transition-all flex-shrink-0 bg-white"
            style={{ border: '1.5px solid #DDE6F2', color: '#0A1929' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2' }}
          >
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ background: '#0B50D4' }}>E</div>
            {sellToken}
            <ChevronDown size={11} style={{ color: '#7A97B4' }} />
          </button>
        </div>
      </div>

      {/* Flip button */}
      <div className="flex justify-center -my-1 relative z-10">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { setSellToken(buyToken); setBuyToken(sellToken) }}
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-white"
          style={{ border: '1.5px solid #DDE6F2' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.background = '#E8EFFE' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2'; e.currentTarget.style.background = '#fff' }}
        >
          <ArrowUpDown size={14} style={{ color: '#0B50D4' }} />
        </motion.button>
      </div>

      {/* Buy box */}
      <div className="rounded-xl p-4" style={{ background: '#F4F8FD', border: '1px solid #DDE6F2' }}>
        <div className="flex justify-between text-[12px] font-semibold mb-2.5">
          <span style={{ color: '#7A97B4' }}>You receive</span>
          <span style={{ color: '#7A97B4' }}>Balance: 0.00 USDC</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-[22px] font-black font-mono" style={{ color: '#057A4B' }}>{buyAmount}</div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold transition-all flex-shrink-0 bg-white"
            style={{ border: '1.5px solid #DDE6F2', color: '#0A1929' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891B2' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2' }}
          >
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ background: '#0891B2' }}>U</div>
            {buyToken}
            <ChevronDown size={11} style={{ color: '#7A97B4' }} />
          </button>
        </div>
      </div>

      {/* Rate row */}
      <div
        className="flex justify-between text-[12px] font-semibold px-3 py-2 rounded-xl"
        style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}
      >
        <span style={{ color: '#3D5A78' }}>1 ETH = {rate.toLocaleString()} USDC</span>
        <span style={{ color: '#7A97B4' }}>~₦4.12 fee</span>
      </div>

      {/* CTA */}
      {success ? (
        <div
          className="w-full py-3.5 rounded-full text-[13px] font-bold text-center"
          style={{ background: '#E4F7EE', color: '#057A4B', border: '1px solid rgba(5,122,75,0.2)' }}
        >
          ✓ Swap Successful
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSwap}
          disabled={loading}
          className="w-full py-3.5 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: '#0B50D4',
            color: '#fff',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(11,80,212,0.28)',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0840AA' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
        >
          {loading ? <><Spinner size={16} />Swapping…</> : <><Zap size={14} />Swap Assets</>}
        </motion.button>
      )}
    </div>
  )
}
