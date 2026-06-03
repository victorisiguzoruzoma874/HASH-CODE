import React from 'react'
import { motion } from 'framer-motion'
import { Zap, ArrowRight, Shield } from 'lucide-react'

export const StakeBanner: React.FC = () => (
  <div
    className="rounded-2xl p-5 relative overflow-hidden"
    style={{
      background: 'linear-gradient(145deg, #0B50D4 0%, #0840AA 60%, #062E80 100%)',
    }}
  >
    {/* Subtle texture */}
    <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
      style={{
        backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 50%), radial-gradient(circle at 20% 80%, #0891B2 0%, transparent 50%)',
      }}
    />

    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          <Zap size={13} className="text-white" />
        </div>
        <span className="text-[13px] font-black text-white">Stake & Earn</span>
      </div>

      <p className="text-[12px] font-semibold leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.75)' }}>
        Earn up to <span className="text-white font-black">12% APY</span> on idle assets with audited staking pools.
      </p>

      <div className="flex items-center justify-between mb-5">
        <div className="text-center">
          <div className="text-[18px] font-black font-mono text-white">12%</div>
          <div className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>Max APY</div>
        </div>
        <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="text-center">
          <div className="text-[18px] font-black font-mono text-white">₦4.2M</div>
          <div className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>TVL</div>
        </div>
        <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="text-center">
          <div className="text-[18px] font-black font-mono text-white">3</div>
          <div className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>Pools</div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[13px] font-bold transition-all text-white"
        style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
      >
        Start Staking
        <ArrowRight size={13} />
      </motion.button>

      <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>
        <Shield size={9} />
        Audited & Non-Custodial
      </div>
    </div>
  </div>
)
