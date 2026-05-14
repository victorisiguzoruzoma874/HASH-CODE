import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, ArrowRight } from 'lucide-react'

export const StakeBanner: React.FC = () => (
  <div
    className="rounded-[16px] p-5 relative overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, #1E1B4B 0%, #1E3A5F 100%)',
      border: '1px solid rgba(139,92,246,0.25)',
    }}
  >
    {/* Ambient blobs */}
    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
      style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
    <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-15"
      style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }} />

    <div className="relative">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.25)' }}>
          <TrendingUp size={13} style={{ color: '#8B5CF6' }} />
        </div>
        <span className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>Stake & Earn</span>
      </div>
      <p className="text-[11px] leading-relaxed mb-4" style={{ color: '#94A3B8' }}>
        Earn up to <span style={{ color: '#22C55E', fontWeight: 600 }}>12% APY</span> on idle assets with audited staking pools.
      </p>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold transition-all"
        style={{ background: 'rgba(139,92,246,0.2)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.3)' }}
      >
        Start Staking
        <ArrowRight size={12} />
      </motion.button>
    </div>
  </div>
)
