import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Droplets, ExternalLink } from 'lucide-react'
import { useStore } from '../../store/useStore'

const iconMap = {
  swap:      { icon: ArrowUpRight,  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  receive:   { icon: ArrowDownLeft, color: '#22C55E', bg: 'rgba(34,197,94,0.1)'   },
  send:      { icon: ArrowUpRight,  color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  liquidity: { icon: Droplets,      color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
}

const statusStyle = {
  completed: { color: '#22C55E', bg: 'rgba(34,197,94,0.08)',  label: 'Completed' },
  pending:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', label: 'Pending'   },
  failed:    { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  label: 'Failed'    },
}

export const RecentActivity: React.FC = () => {
  const history = useStore(s => s.transactions.history)

  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #1E293B' }}
      >
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>Recent Activity</h3>
          <p className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>Your latest transactions</p>
        </div>
        <button
          className="flex items-center gap-1 text-[12px] font-medium transition-colors"
          style={{ color: '#3B82F6' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#60A5FA' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#3B82F6' }}
        >
          View all <ExternalLink size={11} />
        </button>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {history.map((tx, i) => {
          const { icon: Icon, color, bg } = iconMap[tx.type]
          const st = statusStyle[tx.status]
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3.5 px-5 py-3.5 cursor-pointer group transition-colors"
              style={{ borderBottom: '1px solid #162033' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={15} style={{ color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: '#F8FAFC' }}>{tx.description}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px]" style={{ color: '#334155' }}>{tx.timestamp}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ color: st.color, background: st.bg }}
                  >
                    {st.label}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div
                  className="text-[13px] font-semibold font-mono"
                  style={{ color: tx.type === 'receive' ? '#22C55E' : '#94A3B8' }}
                >
                  {tx.amountIn}
                </div>
                <div className="text-[11px] font-mono mt-0.5" style={{ color: '#334155' }}>{tx.amountOut}</div>
              </div>

              <ArrowUpRight
                size={13}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: '#334155' }}
              />
            </motion.div>
          )
        })}
      </div>

      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#162033' }}>
            <Droplets size={20} style={{ color: '#334155' }} />
          </div>
          <div className="text-[13px]" style={{ color: '#334155' }}>No activity yet. Make your first swap!</div>
        </div>
      )}
    </div>
  )
}
