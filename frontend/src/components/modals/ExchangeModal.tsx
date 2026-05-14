import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ArrowUpDown, ChevronDown, Info, AlertTriangle, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

interface ExchangeModalProps { isOpen: boolean; onClose: () => void }

const TokenBtn: React.FC<{ symbol: string; color: string }> = ({ symbol, color }) => (
  <button
    className="flex items-center gap-2 px-3 py-2 rounded-[10px] transition-all flex-shrink-0"
    style={{ background: '#0F172A', border: '1px solid #1E293B' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B' }}
  >
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
      style={{ background: color }}>{symbol[0]}</div>
    <span className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>{symbol}</span>
    <ChevronDown size={12} style={{ color: '#64748B' }} />
  </button>
)

export const ExchangeModal: React.FC<ExchangeModalProps> = ({ isOpen, onClose }) => {
  const [payAmount, setPayAmount] = useState('1.50')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)

  const rate          = 2275
  const receiveAmount = (parseFloat(payAmount || '0') * rate).toFixed(2)

  const handleConfirm = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => { setSuccess(false); onClose() }, 2000) }, 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exchange Assets" subtitle="Instant cross-chain liquidity">
      <div className="flex flex-col gap-4">

        {/* PAY */}
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: '#64748B' }}>Pay</div>
          <div className="rounded-[14px] p-4" style={{ background: '#162033', border: '1px solid #1E293B' }}>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="number" value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="flex-1 bg-transparent text-[26px] font-bold font-mono outline-none min-w-0"
                style={{ color: '#F8FAFC' }}
                placeholder="0.00"
              />
              <TokenBtn symbol="ETH" color="#3B82F6" />
            </div>
            <div className="text-[11px] font-mono text-right" style={{ color: '#64748B' }}>Balance: 2.458 ETH</div>
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-2 relative z-10">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}
          >
            <ArrowUpDown size={15} className="text-white" />
          </motion.button>
        </div>

        {/* RECEIVE */}
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: '#64748B' }}>Receive</div>
          <div className="rounded-[14px] p-4" style={{ background: '#162033', border: '1px solid #1E293B' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 text-[26px] font-bold font-mono" style={{ color: '#22C55E' }}>{receiveAmount}</div>
              <TokenBtn symbol="USDC" color="#06B6D4" />
            </div>
            <div className="text-[11px] font-mono text-right" style={{ color: '#64748B' }}>Balance: 12,402 USDC</div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-[12px] p-4 flex flex-col gap-2.5 text-[12px]"
          style={{ background: '#162033', border: '1px solid #1E293B' }}>
          <div className="flex justify-between">
            <span className="flex items-center gap-1" style={{ color: '#64748B' }}>
              Exchange Rate <Info size={11} />
            </span>
            <span className="font-mono" style={{ color: '#F8FAFC' }}>1 ETH ≈ {rate.toLocaleString()} USDC</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Max Slippage</span>
            <span className="flex items-center gap-1.5" style={{ color: '#F8FAFC' }}>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>Auto</span>
              0.5%
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Network Fee</span>
            <span className="font-mono" style={{ color: '#F8FAFC' }}>$4.12</span>
          </div>
        </div>

        {/* CTA */}
        {success ? (
          <div className="w-full py-3.5 rounded-[12px] text-[13px] font-semibold text-center"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
            ✓ Exchange Confirmed
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleConfirm} disabled={loading}
            className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)', color: '#fff' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing…
              </>
            ) : (
              <>Confirm Exchange <Zap size={14} /></>
            )}
          </motion.button>
        )}

        {/* Warning */}
        <div className="flex gap-2.5 p-3 rounded-[10px]"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: '#94A3B8' }}>
            Final amount may vary slightly due to market volatility. By confirming, you agree to HashPay's Liquidity Protocol Terms.
          </p>
        </div>
      </div>
    </Modal>
  )
}
