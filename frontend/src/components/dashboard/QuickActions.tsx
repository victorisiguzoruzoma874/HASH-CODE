import React from 'react'
import { motion } from 'framer-motion'
import { Send, Download, Repeat2, QrCode, Receipt, Phone, Wifi, ArrowRightLeft } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { ModalType } from '../../store/useStore'

const actions = [
  { id: 'send',     label: 'Send',     icon: Send,           bg: '#E8EFFE', color: '#0B50D4' },
  { id: 'receive',  label: 'Receive',  icon: Download,       bg: '#E4F7EE', color: '#057A4B' },
  { id: 'exchange', label: 'Exchange', icon: Repeat2,        bg: '#E0F5FA', color: '#0891B2' },
  { id: 'convert',  label: 'Convert',  icon: ArrowRightLeft, bg: '#F3EEFF', color: '#7C3AED' },
  { id: 'scan',     label: 'Scan',     icon: QrCode,         bg: '#E8EFFE', color: '#0B50D4' },
  { id: 'bill',     label: 'Bill Pay', icon: Receipt,        bg: '#FEF3E2', color: '#B45309' },
  { id: 'airtime',  label: 'Airtime',  icon: Phone,          bg: '#E0F5FA', color: '#0891B2' },
  { id: 'data',     label: 'Data',     icon: Wifi,           bg: '#F3EEFF', color: '#7C3AED' },
] as const

export const QuickActions: React.FC = () => {
  const openModal = useStore(s => s.openModal)

  const handleAction = (id: string) => {
    const map: Record<string, ModalType> = {
      send: 'send', receive: 'receive', exchange: 'exchange',
      convert: 'convert', scan: 'scan', bill: 'bill',
      airtime: 'airtime', data: 'data',
    }
    if (map[id]) openModal(map[id])
  }

  return (
    <div
      className="rounded-2xl p-5 bg-white"
      style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-black" style={{ color: '#0A1929' }}>Quick Actions</h3>
          <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#7A97B4' }}>Tap to get started</p>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-2">
        {actions.map(({ id, label, icon: Icon, bg, color }, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleAction(id)}
            className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl transition-all duration-200 bg-white"
            style={{ border: '1px solid #DDE6F2' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = color + '55'
              e.currentTarget.style.background = bg
              e.currentTarget.style.boxShadow = `0 4px 16px ${color}18`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#DDE6F2'
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ background: bg }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: '#7A97B4' }}>
              {label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
