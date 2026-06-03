import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone, Zap, Calendar, Diamond, ShoppingCart, CheckCircle } from 'lucide-react'
import { HashPayIcon } from '../ui/HashPayLogo'

interface DataModalProps { isOpen: boolean; onClose: () => void }

const bundles = [
  { id: '1gb',  size: '1GB',  duration: '24 Hours', eth: '0.05', ngn: '₦12.50',  desc: 'High-speed priority access',      icon: Zap,      popular: false },
  { id: '5gb',  size: '5GB',  duration: '7 Days',   eth: '0.18', ngn: '₦45.00',  desc: 'Unthrottled weekly terminal data', icon: Calendar, popular: true  },
  { id: '20gb', size: '20GB', duration: '30 Days',  eth: '0.55', ngn: '₦137.50', desc: 'Power user monthly allocation',    icon: Diamond,  popular: false },
]

export const DataModal: React.FC<DataModalProps> = ({ isOpen, onClose }) => {
  const [phone,          setPhone]          = useState('')
  const [selectedBundle, setSelectedBundle] = useState('5gb')
  const [loading,        setLoading]        = useState(false)
  const [success,        setSuccess]        = useState(false)

  const handleBuy = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => { setSuccess(false); onClose() }, 2500) }, 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(10,25,41,0.5)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] rounded-[20px] z-10 overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #DDE6F2', boxShadow: '0 8px 40px rgba(10,25,41,0.14)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #EEF3FB' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                  style={{ background: '#E8EFFE' }}>
                  <ShoppingCart size={17} style={{ color: '#0B50D4' }} />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold" style={{ color: '#0A1929' }}>Data Purchase</h2>
                  <p className="text-[11px]" style={{ color: '#7A97B4' }}>Top up your mobile data instantly</p>
                </div>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-full transition-all"
                style={{ color: '#7A97B4', background: '#EEF3FB' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#DDE6F2'; e.currentTarget.style.color = '#0A1929' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#EEF3FB'; e.currentTarget.style.color = '#7A97B4' }}>
                <X size={15} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">

              {/* Phone input */}
              <div>
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>
                  Phone Number
                </label>
                <div className="relative">
                  <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7A97B4' }} />
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="080 0000 0000"
                    className="w-full rounded-[12px] pl-9 pr-4 py-2.5 text-[13px] transition-all outline-none"
                    style={{ background: '#F8FAFD', border: '1.5px solid #C4D4E8', color: '#0A1929' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }}
                  />
                </div>
              </div>

              {/* Bundle header */}
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold" style={{ color: '#0A1929' }}>Select Data Bundle</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: '#E4F7EE', border: '1px solid #057A4B30' }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#057A4B' }} />
                  <span className="text-[10px] font-bold tracking-[0.06em]" style={{ color: '#057A4B' }}>NETWORK ACTIVE</span>
                </div>
              </div>

              {/* Bundles */}
              <div className="flex flex-col gap-2.5">
                {bundles.map(bundle => {
                  const Icon = bundle.icon
                  const isSelected = selectedBundle === bundle.id
                  return (
                    <motion.button
                      key={bundle.id}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedBundle(bundle.id)}
                      className="flex items-center gap-4 p-4 rounded-[14px] text-left transition-all"
                      style={{
                        background: isSelected ? '#E8EFFE' : '#F8FAFD',
                        border: `1.5px solid ${isSelected ? '#0B50D4' : '#DDE6F2'}`,
                        boxShadow: isSelected ? '0 2px 12px rgba(11,80,212,0.12)' : 'none',
                      }}
                    >
                      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                        style={{ background: isSelected ? '#0B50D4' : '#EEF3FB' }}>
                        <Icon size={18} style={{ color: isSelected ? '#fff' : '#7A97B4' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-black" style={{ color: isSelected ? '#0B50D4' : '#0A1929' }}>
                            {bundle.size}
                          </span>
                          <span className="text-[12px]" style={{ color: '#7A97B4' }}>– {bundle.duration}</span>
                          {bundle.popular && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ background: '#FEF3E2', color: '#B45309' }}>POPULAR</span>
                          )}
                        </div>
                        <div className="text-[12px] mt-0.5" style={{ color: '#A8BDD4' }}>{bundle.desc}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[15px] font-black font-mono" style={{ color: '#0A1929', fontFamily: 'JetBrains Mono, monospace' }}>
                          {bundle.eth} ETH
                        </div>
                        <div className="text-[11px] font-mono" style={{ color: '#7A97B4' }}>{bundle.ngn}</div>
                      </div>
                      {isSelected && <CheckCircle size={18} style={{ color: '#0B50D4', flexShrink: 0 }} />}
                    </motion.button>
                  )
                })}
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleBuy} disabled={loading || !phone}
                className="w-full py-3.5 rounded-full text-[15px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                    Processing...
                  </>
                ) : success ? (
                  <><CheckCircle size={16} /> Purchase Successful!</>
                ) : (
                  <><ShoppingCart size={16} /> Buy Data</>
                )}
              </motion.button>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-6 py-3"
              style={{ borderTop: '1px solid #EEF3FB', background: '#F8FAFD' }}>
              <div className="flex items-center gap-2">
                <HashPayIcon size={18} />
                <span className="text-[12px] font-mono font-semibold" style={{ color: '#0A1929' }}>Balance: 2.450 ETH</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={13} style={{ color: '#057A4B' }} />
                <span className="text-[11px] font-semibold" style={{ color: '#057A4B' }}>Network Verified</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
