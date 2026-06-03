import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ChevronDown, Clipboard, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

interface SendModalProps { isOpen: boolean; onClose: () => void }

const input: React.CSSProperties = {
  background: '#F8FAFD',
  border: '1.5px solid #C4D4E8',
  color: '#0A1929',
  borderRadius: 12,
  outline: 'none',
  transition: 'border-color 0.15s',
}

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Assets"
      subtitle="Transfer tokens across the Ethereum network." width="max-w-[520px]">
      <div className="flex flex-col gap-4">

        {/* Asset selector */}
        <div>
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>
            Asset
          </label>
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] transition-all"
            style={{ ...input, display: 'flex' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #0B50D4, #0891B2)' }}>E</div>
              <div className="text-left">
                <div className="text-[14px] font-semibold" style={{ color: '#0A1929' }}>Ethereum</div>
                <div className="text-[11px] font-mono" style={{ color: '#7A97B4' }}>Balance: 14.42 ETH</div>
              </div>
            </div>
            <ChevronDown size={15} style={{ color: '#7A97B4' }} />
          </button>
        </div>

        {/* To address */}
        <div>
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>To</label>
          <div className="relative">
            <input
              type="text" value={toAddress}
              onChange={e => setToAddress(e.target.value)}
              placeholder="0x… or ENS name"
              className="w-full rounded-[12px] pl-4 pr-24 py-3 text-[13px] font-mono"
              style={input}
              onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }}
            />
            <button onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={{ background: '#E8EFFE', color: '#0B50D4' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dce7fd' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#E8EFFE' }}>
              <Clipboard size={11} /> Paste
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: '#7A97B4' }}>Amount</label>
            <span className="text-[11px] font-medium" style={{ color: '#7A97B4' }}>Balance: 14.42 ETH</span>
          </div>
          <div className="rounded-[12px] p-4" style={{ background: '#F8FAFD', border: '1.5px solid #C4D4E8' }}>
            <div className="flex items-center gap-3">
              <input
                type="number" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-[28px] font-black font-mono outline-none"
                style={{ color: '#0A1929', fontFamily: 'JetBrains Mono, monospace' }}
              />
              <div className="flex items-center gap-2">
                <button onClick={() => setAmount('14.42')}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={{ background: '#E4F7EE', color: '#057A4B' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#c8f0dc' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#E4F7EE' }}>
                  MAX
                </button>
                <span className="text-[13px] font-semibold" style={{ color: '#7A97B4' }}>ETH</span>
              </div>
            </div>
            <div className="text-[12px] font-mono mt-2" style={{ color: '#A8BDD4' }}>≈ ₦{usdValue}</div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-[12px] p-4 flex flex-col gap-2.5 text-[12px]"
          style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
          <div className="flex justify-between">
            <span style={{ color: '#7A97B4' }}>Network Fee</span>
            <span className="font-mono font-semibold" style={{ color: '#0A1929' }}>
              0.00042 ETH <span style={{ color: '#7A97B4' }}>(~₦0.88)</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#7A97B4' }}>Estimated Time</span>
            <span className="font-bold" style={{ color: '#057A4B' }}>&lt;30 Seconds</span>
          </div>
        </div>

        {/* CTA */}
        {success ? (
          <div className="w-full py-3.5 rounded-full text-[14px] font-bold text-center"
            style={{ background: '#E4F7EE', color: '#057A4B', border: '1.5px solid #057A4B40' }}>
            ✓ Transaction Sent
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSend} disabled={loading || !toAddress || !amount}
            className="w-full py-3.5 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
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
                Sending…
              </>
            ) : 'Send Assets →'}
          </motion.button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase"
          style={{ color: '#A8BDD4' }}>
          <Shield size={11} style={{ color: '#0B50D4' }} />
          Powered by EtherShell Advanced Secure Bridge
        </div>
      </div>
    </Modal>
  )
}
