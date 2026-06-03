import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ChevronDown, BookUser, Zap, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

interface AirtimeModalProps { isOpen: boolean; onClose: () => void }

const amounts = [
  { ngn: 5,  eth: '0.0018' },
  { ngn: 10, eth: '0.0036' },
  { ngn: 20, eth: '0.0072' },
  { ngn: 50, eth: '0.018'  },
]

const contacts = [
  { name: 'David',   initials: 'D', color: '#0B50D4' },
  { name: 'Sarah',   initials: 'S', color: '#057A4B' },
  { name: 'Michael', initials: 'M', color: '#B45309' },
]

export const AirtimeModal: React.FC<AirtimeModalProps> = ({ isOpen, onClose }) => {
  const [phone,          setPhone]          = useState('')
  const [selectedAmount, setSelectedAmount] = useState(10)
  const [customAmount,   setCustomAmount]   = useState('')
  const [loading,        setLoading]        = useState(false)
  const [success,        setSuccess]        = useState(false)

  const activeAmount = customAmount ? parseFloat(customAmount) : selectedAmount
  const ethAmount    = amounts.find(a => a.ngn === selectedAmount)?.eth || '0.0036'

  const handleBuy = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => { setSuccess(false); onClose() }, 2000) }, 2000)
  }

  const inputStyle: React.CSSProperties = {
    background: '#F8FAFD',
    border: '1.5px solid #C4D4E8',
    color: '#0A1929',
    borderRadius: 12,
    outline: 'none',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title="Airtime Purchase"
      subtitle="Top up mobile credits globally with instant settlement."
      width="max-w-[540px]"
    >
      <div className="flex flex-col gap-5">

        {/* Recipient */}
        <div>
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>
            Recipient Details
          </label>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-[12px] transition-all flex-shrink-0"
              style={inputStyle}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#C4D4E8' }}>
              <span className="text-base">🇳🇬</span>
              <span className="text-[13px] font-bold" style={{ color: '#0A1929' }}>+234</span>
              <ChevronDown size={11} style={{ color: '#7A97B4' }} />
            </button>
            <div className="flex-1 relative">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="080 0000 0000"
                className="w-full rounded-[12px] px-4 py-2.5 text-[13px] pr-10 transition-all"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }} />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#7A97B4' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0B50D4' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#7A97B4' }}>
                <BookUser size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Amount grid */}
        <div>
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>
            Select Amount
          </label>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {amounts.map(({ ngn, eth }) => {
              const isSelected = selectedAmount === ngn && !customAmount
              return (
                <motion.button key={ngn}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedAmount(ngn); setCustomAmount('') }}
                  className="p-4 rounded-[14px] text-left transition-all"
                  style={{
                    background: isSelected ? '#E8EFFE' : '#F8FAFD',
                    border: `1.5px solid ${isSelected ? '#0B50D4' : '#DDE6F2'}`,
                    boxShadow: isSelected ? '0 2px 12px rgba(11,80,212,0.12)' : 'none',
                  }}
                >
                  <div className="text-[20px] font-black" style={{ fontFamily: 'JetBrains Mono, monospace', color: isSelected ? '#0B50D4' : '#0A1929' }}>
                    ₦{ngn}
                  </div>
                  <div className="text-[10px] font-mono mt-1" style={{ color: '#A8BDD4' }}>{eth} ETH</div>
                </motion.button>
              )
            })}
          </div>
          <div className="relative">
            <input type="number" value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Custom amount"
              className="w-full rounded-[12px] px-4 py-2.5 text-[13px] pr-16 transition-all"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold"
              style={{ color: '#7A97B4' }}>NGN</span>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-[12px] p-4 flex flex-col gap-2.5 text-[12px]"
          style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
          <div className="flex justify-between">
            <span style={{ color: '#7A97B4' }}>Total Payment</span>
            <span className="font-bold font-mono" style={{ color: '#0A1929', fontFamily: 'JetBrains Mono, monospace' }}>₦{activeAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#7A97B4' }}>Estimated Gas</span>
            <span className="font-mono font-semibold" style={{ color: '#0A1929' }}>~{ethAmount} ETH</span>
          </div>
        </div>

        {/* CTA */}
        {success ? (
          <div className="w-full py-3.5 rounded-full text-[14px] font-bold text-center"
            style={{ background: '#E4F7EE', color: '#057A4B', border: '1.5px solid #057A4B40' }}>
            ✓ Airtime Sent Successfully
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleBuy} disabled={loading || !phone}
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
                Processing…
              </>
            ) : (
              <><Zap size={14} /> Buy Airtime</>
            )}
          </motion.button>
        )}

        {/* Frequent contacts */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase mb-3" style={{ color: '#7A97B4' }}>
            Frequent Contacts
          </div>
          <div className="flex items-center gap-3">
            {contacts.map(c => (
              <button key={c.name} onClick={() => setPhone('08000001234')}
                className="flex flex-col items-center gap-1.5 group">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold text-white transition-transform group-hover:scale-110"
                  style={{ background: c.color, boxShadow: `0 2px 8px ${c.color}40` }}>
                  {c.initials}
                </div>
                <span className="text-[10px] font-semibold" style={{ color: '#7A97B4' }}>{c.name}</span>
              </button>
            ))}
            <button className="flex flex-col items-center gap-1.5 group">
              <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{ border: '2px dashed #C4D4E8', background: '#F8FAFD' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#C4D4E8' }}>
                <Plus size={15} style={{ color: '#7A97B4' }} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: '#A8BDD4' }}>New</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
