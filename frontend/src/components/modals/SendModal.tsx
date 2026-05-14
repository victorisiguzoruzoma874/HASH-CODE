import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ChevronDown, Clipboard, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

interface SendModalProps { isOpen: boolean; onClose: () => void }

export const SendModal: React.FC<SendModalProps> = ({ isOpen, onClose }) => {
  const [toAddress, setToAddress] = useState('')
  const [amount,    setAmount]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)

  const ethPrice = 3516.44
  const usdValue = amount ? (parseFloat(amount) * ethPrice).toFixed(2) : '0.00'

  const handleSend = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => { setSuccess(false); onClose() }, 2000) }, 2000)
  }

  const handlePaste = async () => {
    try { setToAddress(await navigator.clipboard.readText()) }
    catch { setToAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045') }
  }

  const inputStyle = {
    background: '#162033',
    border: '1px solid #1E293B',
    color: '#F8FAFC',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Assets"
      subtitle="Transfer tokens across the Ethereum network." width="max-w-[520px]">
      <div className="flex flex-col gap-4">

        {/* Asset selector */}
        <div>
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase block mb-2" style={{ color: '#64748B' }}>
            Asset
          </label>
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] transition-all"
            style={inputStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}>E</div>
              <div className="text-left">
                <div className="text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>Ethereum</div>
                <div className="text-[11px] font-mono" style={{ color: '#64748B' }}>Balance: 14.42 ETH</div>
              </div>
            </div>
            <ChevronDown size={15} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* To address */}
        <div>
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase block mb-2" style={{ color: '#64748B' }}>
            To
          </label>
          <div className="relative">
            <input
              type="text" value={toAddress}
              onChange={e => setToAddress(e.target.value)}
              placeholder="0x… or ENS name"
              className="w-full rounded-[12px] pl-4 pr-24 py-3 text-[13px] font-mono transition-all"
              style={inputStyle}
            />
            <button onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)' }}>
              <Clipboard size={11} /> Paste
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: '#64748B' }}>Amount</label>
            <span className="text-[11px]" style={{ color: '#64748B' }}>Balance: 14.42 ETH</span>
          </div>
          <div className="rounded-[12px] p-4" style={inputStyle}>
            <div className="flex items-center gap-3">
              <input
                type="number" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-[28px] font-bold font-mono outline-none"
                style={{ color: '#F8FAFC' }}
              />
              <div className="flex items-center gap-2">
                <button onClick={() => setAmount('14.42')}
                  className="px-2 py-1 rounded-[6px] text-[11px] font-semibold transition-all"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)' }}>
                  MAX
                </button>
                <span className="text-[13px] font-medium" style={{ color: '#64748B' }}>ETH</span>
              </div>
            </div>
            <div className="text-[12px] font-mono mt-1" style={{ color: '#64748B' }}>≈ ${usdValue} USD</div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-[12px] p-4 flex flex-col gap-2.5 text-[12px]"
          style={{ background: '#162033', border: '1px solid #1E293B' }}>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Network Fee</span>
            <span className="font-mono" style={{ color: '#F8FAFC' }}>
              0.00042 ETH <span style={{ color: '#64748B' }}>(~$0.88)</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Estimated Time</span>
            <span className="font-semibold" style={{ color: '#22C55E' }}>&lt;30 Seconds</span>
          </div>
        </div>

        {/* CTA */}
        {success ? (
          <div className="w-full py-3.5 rounded-[12px] text-[13px] font-semibold text-center"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
            ✓ Transaction Sent
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSend} disabled={loading || !toAddress || !amount}
            className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #22C55E, #06B6D4)', color: '#07111F' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : 'Send Assets →'}
          </motion.button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium tracking-[0.06em] uppercase"
          style={{ color: '#334155' }}>
          <Shield size={11} style={{ color: '#3B82F6' }} />
          Powered by EtherShell Advanced Secure Bridge
        </div>
      </div>
    </Modal>
  )
}
