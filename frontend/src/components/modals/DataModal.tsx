import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone, Zap, Calendar, Diamond, ShoppingCart, CheckCircle } from 'lucide-react'
import { HashPayIcon } from '../ui/HashPayLogo'

interface DataModalProps {
  isOpen: boolean
  onClose: () => void
}

const bundles = [
  {
    id: '1gb',
    size: '1GB',
    duration: '24 Hours',
    eth: '0.05',
    usd: '₦12.50',
    desc: 'High-speed priority access',
    icon: Zap,
    popular: false,
  },
  {
    id: '5gb',
    size: '5GB',
    duration: '7 Days',
    eth: '0.18',
    usd: '₦45.00',
    desc: 'Unthrottled weekly terminal data',
    icon: Calendar,
    popular: true,
  },
  {
    id: '20gb',
    size: '20GB',
    duration: '30 Days',
    eth: '0.55',
    usd: '₦137.50',
    desc: 'Power user monthly allocation',
    icon: Diamond,
    popular: false,
  },
]

export const DataModal: React.FC<DataModalProps> = ({ isOpen, onClose }) => {
  const [phone, setPhone] = useState('')
  const [selectedBundle, setSelectedBundle] = useState('5gb')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // selectedBundle drives the UI directly

  const handleBuy = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 2500)
    }, 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-[600px] bg-[#111827] border border-white/10 rounded-[20px] shadow-2xl z-10 overflow-hidden"
          >
            {/* Top nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/08">
              <div className="flex items-center gap-6">
                {['Dashboard', 'Assets', 'Transactions'].map((tab, i) => (
                  <button
                    key={tab}
                    className={`text-[13px] font-medium transition-colors ${
                      i === 2 ? 'text-white border-b-2 border-[#39FF14] pb-0.5' : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <HashPayIcon size={28} />
                <button onClick={onClose} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-[22px] font-semibold text-white">Data Purchase</h1>
                  <p className="text-[13px] text-[#94A3B8] mt-0.5">Top up your decentralized connectivity node.</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#4361EE]/20 flex items-center justify-center">
                  <ShoppingCart size={18} className="text-[#4361EE]" />
                </div>
              </div>

              {/* Phone input */}
              <div className="mb-5">
                <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#94A3B8] block mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#1A2235] border border-white/10 rounded-[10px] pl-9 pr-4 py-2.5 text-[13px] text-white placeholder-[#4B5563] transition-all"
                  />
                </div>
              </div>

              {/* Bundle header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-semibold text-white">Select Data Bundle</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#39FF14]/10 border border-[#39FF14]/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
                  <span className="text-[10px] font-medium text-[#39FF14] tracking-[0.06em]">ACTIVE NODE: TERMINAL V1</span>
                </div>
              </div>

              {/* Bundles */}
              <div className="flex flex-col gap-2.5 mb-5">
                {bundles.map(bundle => {
                  const Icon = bundle.icon
                  const isSelected = selectedBundle === bundle.id
                  return (
                    <motion.button
                      key={bundle.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedBundle(bundle.id)}
                      className={`flex items-center gap-4 p-4 rounded-[14px] border text-left transition-all ${
                        isSelected
                          ? 'border-[#39FF14] bg-[#39FF14]/06'
                          : 'border-white/10 bg-[#1A2235] hover:border-white/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[#39FF14]/20' : 'bg-white/05'
                      }`}>
                        <Icon size={18} className={isSelected ? 'text-[#39FF14]' : 'text-[#94A3B8]'} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[15px] font-bold ${isSelected ? 'text-[#39FF14]' : 'text-white'}`}>
                            {bundle.size}
                          </span>
                          <span className="text-[13px] text-[#94A3B8]">– {bundle.duration}</span>
                          {bundle.popular && (
                            <span className="px-1.5 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] rounded text-[10px] font-semibold">
                              POPULAR
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[#4B5563] mt-0.5">{bundle.desc}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[15px] font-bold text-white font-mono">{bundle.eth} ETH</div>
                        <div className="text-[11px] text-[#94A3B8] font-mono">{bundle.usd}</div>
                      </div>
                      {isSelected && (
                        <CheckCircle size={18} className="text-[#39FF14] flex-shrink-0" />
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBuy}
                disabled={loading || !phone}
                className="w-full py-3.5 bg-[#39FF14] text-[#0B0F1A] font-bold rounded-[12px] text-[14px] uppercase tracking-[0.06em] hover:bg-[#32e612] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                  <>
                    <CheckCircle size={16} />
                    Purchase Successful!
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} />
                    Buy Data
                  </>
                )}
              </motion.button>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/08 bg-[#0B0F1A]/50">
              <div className="flex items-center gap-2">
                <HashPayIcon size={20} />
                <span className="text-[12px] font-mono text-white">Balance: 2.450 ETH</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={13} className="text-[#39FF14]" />
                <span className="text-[11px] text-[#39FF14] font-medium">Network Verified</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
