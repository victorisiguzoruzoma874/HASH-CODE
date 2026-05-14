import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ChevronDown, BookUser, Zap, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

interface AirtimeModalProps { isOpen: boolean; onClose: () => void }

const amounts = [
  { usd: 5,  eth: '0.0018' },
  { usd: 10, eth: '0.0036' },
  { usd: 20, eth: '0.0072' },
  { usd: 50, eth: '0.018'  },
]

const contacts = [
  { name: 'David',   initials: 'D', color: '#3B82F6' },
  { name: 'Sarah',   initials: 'S', color: '#22C55E' },
  { name: 'Michael', initials: 'M', color: '#F59E0B' },
]

export const AirtimeModal: React.FC<AirtimeModalProps> = ({ isOpen, onClose }) => {
  const [phone,          setPhone]          = useState('')
  const [selectedAmount, setSelectedAmount] = useState(10)
  const [customAmount,   setCustomAmount]   = useState('')
  const [loading,        setLoading]        = useState(false)
  const [success,        setSuccess]        = useState(false)

  const activeAmount = customAmount ? parseFloat(customAmount) : selectedAmount
  const ethAmount    = amounts.find(a => a.usd === selectedAmount)?.eth || '0.0036'

  const handleBuy = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => { setSuccess(false); onClose() }, 2000) }, 2000)
  }

  const inputStyle = { background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title="Airtime Purchase"
      subtitle="Top up mobile credits globally with instant settlement."
      width="max-w-[540px]"
    >
      <div className="flex flex-col gap-5">

        {/* Recipient */}
        <div>
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase block mb-2" style={{ color: '#64748B' }}>
            Recipient Details
          </label>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-[10px] transition-all flex-shrink-0"
              style={inputStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B' }}>
              <span className="text-base">🇺🇸</span>
              <span className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>+1</span>
              <ChevronDown size={11} style={{ color: '#64748B' }} />
            </button>
            <div className="flex-1 relative">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full rounded-[10px] px-4 py-2.5 text-[13px] transition-all pr-10"
                style={inputStyle} />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#64748B' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748B' }}>
                <BookUser size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Amount grid */}
        <div>
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase block mb-2" style={{ color: '#64748B' }}>
            Select Amount
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {amounts.map(({ usd, eth }) => {
              const isSelected = selectedAmount === usd && !customAmount
              return (
                <motion.button key={usd}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedAmount(usd); setCustomAmount('') }}
                  className="p-3.5 rounded-[12px] text-left transition-all"
                  style={{
                    background: isSelected ? 'rgba(34,197,94,0.08)' : '#162033',
                    border: `1px solid ${isSelected ? 'rgba(34,197,94,0.3)' : '#1E293B'}`,
                  }}
                >
                  <div className="text-[18px] font-bold font-mono"
                    style={{ color: isSelected ? '#22C55E' : '#F8FAFC' }}>
                    ${usd}
                  </div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color: '#64748B' }}>{eth} ETH</div>
                </motion.button>
              )
            })}
          </div>
          <div className="relative">
            <input type="number" value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Custom amount"
              className="w-full rounded-[10px] px-4 py-2.5 text-[13px] pr-14 transition-all"
              style={inputStyle} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold"
              style={{ color: '#64748B' }}>USD</span>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-[12px] p-4 flex flex-col gap-2.5 text-[12px]"
          style={{ background: '#162033', border: '1px solid #1E293B' }}>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Total Payment</span>
            <span className="font-semibold font-mono" style={{ color: '#F8FAFC' }}>${activeAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Estimated Gas</span>
            <span className="font-mono" style={{ color: '#F8FAFC' }}>~{ethAmount} ETH</span>
          </div>
        </div>

        {/* CTA */}
        {success ? (
          <div className="w-full py-3.5 rounded-[12px] text-[13px] font-semibold text-center"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
            ✓ Airtime Sent Successfully
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleBuy} disabled={loading || !phone}
            className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #22C55E, #06B6D4)', color: '#07111F' }}
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
              <><Zap size={14} /> Buy Airtime</>
            )}
          </motion.button>
        )}

        {/* Frequent contacts */}
        <div>
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: '#64748B' }}>
            Frequent Contacts
          </div>
          <div className="flex items-center gap-3">
            {contacts.map(c => (
              <button key={c.name} onClick={() => setPhone('5550001234')}
                className="flex flex-col items-center gap-1.5 group">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold text-white transition-transform group-hover:scale-110"
                  style={{ background: c.color }}>
                  {c.initials}
                </div>
                <span className="text-[10px] transition-colors" style={{ color: '#64748B' }}>{c.name}</span>
              </button>
            ))}
            <button className="flex flex-col items-center gap-1.5 group">
              <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{ border: '2px dashed #1E293B' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B' }}>
                <Plus size={15} style={{ color: '#334155' }} />
              </div>
              <span className="text-[10px]" style={{ color: '#334155' }}>New</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
