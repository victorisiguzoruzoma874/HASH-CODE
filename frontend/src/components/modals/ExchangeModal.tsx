import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ArrowUpDown, ChevronDown, Info, AlertTriangle, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

interface ExchangeModalProps { isOpen: boolean; onClose: () => void }

const TokenBtn: React.FC<{ symbol: string; color: string }> = ({ symbol, color }) => (
  <button
    className="flex items-center gap-2 px-3 py-2 rounded-full transition-all flex-shrink-0"
    style={{ background: '#EEF3FB', border: '1.5px solid #DDE6F2' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.background = '#E8EFFE' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2'; e.currentTarget.style.background = '#EEF3FB' }}
  >
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
      style={{ background: color }}>{symbol[0]}</div>
    <span className="text-[13px] font-bold" style={{ color: '#0A1929' }}>{symbol}</span>
    <ChevronDown size={12} style={{ color: '#7A97B4' }} />
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

  const boxStyle: React.CSSProperties = {
    background: '#F8FAFD',
    border: '1.5px solid #C4D4E8',
    borderRadius: 14,
    padding: 16,
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exchange Assets" subtitle="Instant cross-chain liquidity">
      <div className="flex flex-col gap-4">

        {/* PAY */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: '#7A97B4' }}>Pay</div>
          <div style={boxStyle}>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="number" value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="flex-1 bg-transparent text-[26px] font-black font-mono outline-none min-w-0"
                style={{ color: '#0A1929', fontFamily: 'JetBrains Mono, monospace' }}
                placeholder="0.00"
              />
              <TokenBtn symbol="ETH" color="#0B50D4" />
            </div>
            <div className="text-[11px] font-mono text-right" style={{ color: '#A8BDD4' }}>Balance: 2.458 ETH</div>
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-2 relative z-10">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#0B50D4', boxShadow: '0 4px 14px rgba(11,80,212,0.3)' }}
          >
            <ArrowUpDown size={15} className="text-white" />
          </motion.button>
        </div>

        {/* RECEIVE */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: '#7A97B4' }}>Receive</div>
          <div style={boxStyle}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 text-[26px] font-black font-mono" style={{ color: '#057A4B', fontFamily: 'JetBrains Mono, monospace' }}>
                {receiveAmount}
              </div>
              <TokenBtn symbol="USDC" color="#0891B2" />
            </div>
            <div className="text-[11px] font-mono text-right" style={{ color: '#A8BDD4' }}>Balance: 12,402 USDC</div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-[12px] p-4 flex flex-col gap-2.5 text-[12px]"
          style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
          <div className="flex justify-between">
            <span className="flex items-center gap-1" style={{ color: '#7A97B4' }}>
              Exchange Rate <Info size={11} />
            </span>
            <span className="font-mono font-semibold" style={{ color: '#0A1929' }}>1 ETH ≈ {rate.toLocaleString()} USDC</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#7A97B4' }}>Max Slippage</span>
            <span className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: '#E8EFFE', color: '#0B50D4' }}>Auto</span>
              <span className="font-semibold" style={{ color: '#0A1929' }}>0.5%</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#7A97B4' }}>Network Fee</span>
            <span className="font-mono font-semibold" style={{ color: '#0A1929' }}>₦4.12</span>
          </div>
        </div>

        {/* CTA */}
        {success ? (
          <div className="w-full py-3.5 rounded-full text-[14px] font-bold text-center"
            style={{ background: '#E4F7EE', color: '#057A4B', border: '1.5px solid #057A4B40' }}>
            ✓ Exchange Confirmed
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleConfirm} disabled={loading}
            className="w-full py-3.5 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: '#0B50D4', color: '#fff' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0944bb' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
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
        <div className="flex gap-2.5 p-3.5 rounded-[12px]"
          style={{ background: '#FEF3E2', border: '1px solid #F59E0B30' }}>
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: '#92400E' }}>
            Final amount may vary slightly due to market volatility. By confirming, you agree to HashPay's Liquidity Protocol Terms.
          </p>
        </div>
      </div>
    </Modal>
  )
}
