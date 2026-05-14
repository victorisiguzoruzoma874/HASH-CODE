import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  width?: string
  headerIcon?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, subtitle, children, width = 'max-w-[480px]', headerIcon,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${width} z-10 rounded-[22px] shadow-2xl overflow-hidden`}
            style={{ background: '#0F172A', border: '1px solid #1E293B' }}
          >
            {/* Header */}
            {(title || headerIcon) && (
              <div className="flex items-start justify-between px-6 py-5"
                style={{ borderBottom: '1px solid #1E293B' }}>
                <div className="flex items-center gap-3">
                  {headerIcon}
                  <div>
                    {title && (
                      <h2 className="text-[17px] font-semibold" style={{ color: '#F8FAFC' }}>{title}</h2>
                    )}
                    {subtitle && (
                      <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>{subtitle}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-[8px] transition-all flex-shrink-0"
                  style={{ color: '#64748B' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#162033'; e.currentTarget.style.color = '#F8FAFC' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
