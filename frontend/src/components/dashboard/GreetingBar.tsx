import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Wallet } from 'lucide-react'
import { useStore } from '../../store/useStore'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const GreetingBar: React.FC = () => {
  const wallet = useStore(s => s.wallet)

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-center justify-between px-6 py-3.5 flex-shrink-0"
      style={{ borderBottom: '1px solid #1E293B', background: 'rgba(15,23,42,0.5)' }}
    >
      <div>
        <span className="text-[12px]" style={{ color: '#64748B' }}>{getGreeting()} — </span>
        <span className="text-[12px] font-semibold" style={{ color: '#94A3B8' }}>
          {wallet.isConnected ? wallet.address : 'Welcome back'}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Portfolio change */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#22C55E' }}
        >
          <TrendingUp size={11} />
          +12.4% this week
        </div>

        {/* Balance */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px]"
          style={{ background: '#0F172A', border: '1px solid #1E293B' }}
        >
          <Wallet size={11} style={{ color: '#64748B' }} />
          <span className="font-mono font-medium" style={{ color: '#F8FAFC' }}>{wallet.balance}</span>
          <span style={{ color: '#64748B' }}>{wallet.balanceUSD}</span>
        </div>
      </div>
    </motion.div>
  )
}
