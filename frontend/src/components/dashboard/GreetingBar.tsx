import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Wallet } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useApiStore } from '../../store/useApiStore'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const GreetingBar: React.FC = () => {
  const wallet = useStore(s => s.wallet)
  const user   = useApiStore(s => s.user)

  const displayName = user?.fullName ?? user?.email ?? (wallet.isConnected ? wallet.address : 'Trader')
  const firstName   = displayName.split(' ')[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between px-5 py-3.5 flex-shrink-0 bg-white"
      style={{ borderBottom: '1px solid #DDE6F2' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-semibold" style={{ color: '#7A97B4' }}>{getGreeting()},</span>
        <span className="text-[14px] font-black" style={{ color: '#0A1929' }}>{firstName} 👋</span>
      </div>

      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold"
          style={{ background: '#E4F7EE', color: '#057A4B' }}
        >
          <TrendingUp size={11} />
          +12.4% this week
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full text-[12px]"
          style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}
        >
          <Wallet size={11} style={{ color: '#7A97B4' }} />
          <span className="font-mono font-bold" style={{ color: '#0A1929' }}>{wallet.balance}</span>
          <span className="font-semibold" style={{ color: '#7A97B4' }}>{wallet.balanceUSD}</span>
        </div>
      </div>
    </motion.div>
  )
}
