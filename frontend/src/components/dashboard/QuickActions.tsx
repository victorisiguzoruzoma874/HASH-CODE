import React from 'react'
import { motion } from 'framer-motion'
import { Send, Download, Repeat2, QrCode, Receipt, Phone, Wifi, ArrowRightLeft } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { ModalType } from '../../store/useStore'

const actions = [
  { id: 'send',     label: 'Send',     icon: Send,           accent: '#3B82F6' },
  { id: 'receive',  label: 'Receive',  icon: Download,       accent: '#22C55E' },
  { id: 'exchange', label: 'Exchange', icon: Repeat2,        accent: '#06B6D4' },
  { id: 'convert',  label: 'Convert',  icon: ArrowRightLeft, accent: '#8B5CF6' },
  { id: 'scan',     label: 'Scan',     icon: QrCode,         accent: '#3B82F6' },
  { id: 'bill',     label: 'Bill Pay', icon: Receipt,        accent: '#F59E0B' },
  { id: 'airtime',  label: 'Airtime',  icon: Phone,          accent: '#06B6D4' },
  { id: 'data',     label: 'Data',     icon: Wifi,           accent: '#8B5CF6' },
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
    <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>Quick Actions</h3>
          <p className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>Tap to get started</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {actions.map(({ id, label, icon: Icon, accent }, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleAction(id)}
            className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-[14px] transition-all duration-200 group"
            style={{ background: '#162033', border: '1px solid #1E293B' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = `${accent}40`
              e.currentTarget.style.background = `${accent}0A`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1E293B'
              e.currentTarget.style.background = '#162033'
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ background: `${accent}15` }}
            >
              <Icon size={15} style={{ color: accent }} />
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: '#64748B' }}>
              {label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
