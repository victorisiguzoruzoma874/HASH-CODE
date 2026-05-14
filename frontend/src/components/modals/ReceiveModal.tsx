import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Copy, Share2, Download, ChevronDown, Info } from 'lucide-react'
import { HashPayIcon } from '../ui/HashPayLogo'
import { motion } from 'framer-motion'

interface ReceiveModalProps { isOpen: boolean; onClose: () => void }

const QRCodeDisplay: React.FC = () => (
  <div className="relative w-full aspect-square max-w-[190px] mx-auto">
    <div className="w-full h-full bg-white rounded-[14px] p-3 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="5"  y="5"  width="25" height="25" fill="none" stroke="#07111F" strokeWidth="3" />
        <rect x="10" y="10" width="15" height="15" fill="#07111F" />
        <rect x="70" y="5"  width="25" height="25" fill="none" stroke="#07111F" strokeWidth="3" />
        <rect x="75" y="10" width="15" height="15" fill="#07111F" />
        <rect x="5"  y="70" width="25" height="25" fill="none" stroke="#07111F" strokeWidth="3" />
        <rect x="10" y="75" width="15" height="15" fill="#07111F" />
        {[35,40,45,50,55,60,65].map(x =>
          [5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90].map(y =>
            Math.sin(x * y) > 0.3 ? <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#07111F" /> : null
          )
        )}
        {[5,10,15,20,25,30].map(x =>
          [35,40,45,50,55,60,65].map(y =>
            Math.cos(x + y) > 0.2 ? <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#07111F" /> : null
          )
        )}
        {[70,75,80,85,90,95].map(x =>
          [35,40,45,50,55,60,65].map(y =>
            Math.sin(x - y) > 0.1 ? <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#07111F" /> : null
          )
        )}
      </svg>
    </div>
    {/* Corner brackets — blue instead of neon green */}
    {[
      'top-0 left-0 border-t-2 border-l-2 rounded-tl-[4px]',
      'top-0 right-0 border-t-2 border-r-2 rounded-tr-[4px]',
      'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[4px]',
      'bottom-0 right-0 border-b-2 border-r-2 rounded-br-[4px]',
    ].map((cls, i) => (
      <div key={i} className={`absolute w-5 h-5 ${cls}`} style={{ borderColor: '#3B82F6' }} />
    ))}
  </div>
)

export const ReceiveModal: React.FC<ReceiveModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false)
  const address     = '0x123...4567'
  const fullAddress = '0x1234567890abcdef1234567890abcdef12345678'

  const handleCopy = () => {
    navigator.clipboard.writeText(fullAddress).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title="Receive Assets" subtitle="HashPay · Institutional Grade"
      width="max-w-[420px]"
      headerIcon={<HashPayIcon size={30} />}
    >
      <div className="flex flex-col gap-4">

        {/* QR */}
        <div className="flex flex-col items-center gap-2">
          <QRCodeDisplay />
          <span className="text-[11px] font-medium" style={{ color: '#64748B' }}>Scan to receive</span>
        </div>

        {/* Network */}
        <button
          className="flex items-center justify-between px-4 py-2.5 rounded-[10px] transition-all"
          style={{ background: '#162033', border: '1px solid #1E293B' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="text-[12px] font-semibold tracking-[0.04em]" style={{ color: '#F8FAFC' }}>
              ETHEREUM MAINNET
            </span>
          </div>
          <ChevronDown size={13} style={{ color: '#64748B' }} />
        </button>

        {/* Address */}
        <div>
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase block mb-2" style={{ color: '#64748B' }}>
            Your Wallet Address
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-[10px] px-3 py-2.5 text-[13px] font-mono truncate"
              style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }}>
              {address}
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-[10px] text-[12px] font-semibold transition-all flex-shrink-0"
              style={copied
                ? { background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }
                : { background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }
              }
            >
              <Copy size={12} />
              {copied ? 'Copied!' : 'Copy'}
            </motion.button>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Share2,   label: 'Share Address' },
            { icon: Download, label: 'Save QR' },
          ].map(({ icon: Icon, label }) => (
            <button key={label}
              className="flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-medium transition-all"
              style={{ border: '1px solid #1E293B', color: '#64748B' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55'; e.currentTarget.style.color = '#F8FAFC' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#64748B' }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="flex gap-2.5 p-3 rounded-[10px]"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#3B82F6' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: '#94A3B8' }}>
            Only send Ethereum (ETH) and ERC-20 tokens to this address. Sending other assets may result in permanent loss.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <HashPayIcon size={18} />
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: '#334155' }}>
            Secured by HashPay Global
          </span>
        </div>
      </div>
    </Modal>
  )
}
