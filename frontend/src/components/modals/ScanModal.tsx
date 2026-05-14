import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, History, Flashlight, ZoomIn, QrCode, Wallet, BarChart2, Shield } from 'lucide-react'
import { HashPayIcon } from '../ui/HashPayLogo'

interface ScanModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ScanModal: React.FC<ScanModalProps> = ({ isOpen, onClose }) => {
  const [flashOn, setFlashOn] = useState(false)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-[#0B0F1A] flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/08">
            <div className="flex items-center gap-2.5">
              <HashPayIcon size={32} />
              <span className="text-[16px] font-semibold text-white">Scan QR Code</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <X size={18} />
            </motion.button>
          </div>

          {/* Main content */}
          <div className="flex-1 flex relative overflow-hidden">
            {/* Left sidebar icons */}
            <div className="w-14 flex flex-col items-center gap-4 py-6 border-r border-white/08">
              {[
                { icon: QrCode, active: true },
                { icon: Wallet, active: false },
                { icon: BarChart2, active: false },
              ].map(({ icon: Icon, active }, i) => (
                <button
                  key={i}
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${
                    active ? 'bg-[#39FF14]/15 text-[#39FF14]' : 'text-[#4B5563] hover:text-[#94A3B8]'
                  }`}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>

            {/* Camera area */}
            <div className="flex-1 flex flex-col items-center justify-center relative bg-[#0B0F1A] p-8">
              {/* Simulated camera feed */}
              <div className="relative w-full max-w-[400px] aspect-square">
                {/* Dark camera bg */}
                <div className="w-full h-full bg-[#050810] rounded-[20px] overflow-hidden flex items-center justify-center">
                  {/* Simulated camera noise */}
                  <div className="w-full h-full opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 50% 50%, #1A2235 0%, #0B0F1A 100%)',
                    }}
                  />
                  {/* Center QR hint */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 border-2 border-dashed border-white/20 rounded-[12px] flex items-center justify-center">
                      <QrCode size={40} className="text-white/20" />
                    </div>
                  </div>
                </div>

                {/* Corner brackets */}
                <div className="absolute inset-0 pointer-events-none pulse-border">
                  {/* Top-left */}
                  <div className="absolute top-3 left-3 w-8 h-8 border-t-3 border-l-3 border-[#39FF14] rounded-tl-[6px]"
                    style={{ borderTopWidth: 3, borderLeftWidth: 3 }} />
                  {/* Top-right */}
                  <div className="absolute top-3 right-3 w-8 h-8 border-t-3 border-r-3 border-[#39FF14] rounded-tr-[6px]"
                    style={{ borderTopWidth: 3, borderRightWidth: 3 }} />
                  {/* Bottom-left */}
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-b-3 border-l-3 border-[#39FF14] rounded-bl-[6px]"
                    style={{ borderBottomWidth: 3, borderLeftWidth: 3 }} />
                  {/* Bottom-right */}
                  <div className="absolute bottom-3 right-3 w-8 h-8 border-b-3 border-r-3 border-[#39FF14] rounded-br-[6px]"
                    style={{ borderBottomWidth: 3, borderRightWidth: 3 }} />
                </div>

                {/* Scan line animation */}
                <motion.div
                  animate={{ top: ['15%', '85%', '15%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-[#39FF14] to-transparent opacity-70"
                  style={{ position: 'absolute' }}
                />
              </div>

              {/* Instruction */}
              <p className="text-[14px] text-[#94A3B8] mt-6 text-center">
                Align QR code within the frame
              </p>

              {/* Action cards */}
              <div className="flex gap-3 mt-6">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] border border-white/10 rounded-[12px] text-[13px] text-[#94A3B8] hover:text-white hover:border-white/20 transition-all">
                  <Image size={15} />
                  Upload from Gallery
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] border border-white/10 rounded-[12px] text-[13px] text-[#94A3B8] hover:text-white hover:border-white/20 transition-all">
                  <History size={15} />
                  Recent Scans
                </button>
              </div>
            </div>

            {/* Right controls */}
            <div className="w-14 flex flex-col items-center gap-4 py-6 border-l border-white/08">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setFlashOn(!flashOn)}
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${
                  flashOn ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'text-[#4B5563] hover:text-[#94A3B8]'
                }`}
              >
                <Flashlight size={18} />
              </motion.button>
              <button className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#4B5563] hover:text-[#94A3B8] transition-all">
                <ZoomIn size={18} />
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/08 bg-[#111827]">
            <div className="flex items-center gap-2.5">
              <Shield size={15} className="text-[#39FF14]" />
              <div>
                <div className="text-[11px] font-medium tracking-[0.06em] uppercase text-white">
                  Secure Node Connection
                </div>
                <div className="text-[10px] text-[#4B5563]">End-to-end encrypted validation active</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
              <span className="text-[11px] text-[#39FF14] font-medium">Active</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
