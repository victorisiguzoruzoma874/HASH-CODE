import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, Droplets, ExternalLink } from 'lucide-react'
import { useStore } from '../../store/useStore'

const iconMap = {
  swap:      { icon: ArrowUpRight,  color: '#B45309', bg: '#FEF3E2' },
  receive:   { icon: ArrowDownLeft, color: '#057A4B', bg: '#E4F7EE' },
  send:      { icon: ArrowUpRight,  color: '#C5202B', bg: '#FDECEA' },
  liquidity: { icon: Droplets,      color: '#0B50D4', bg: '#E8EFFE' },
}

const statusStyle = {
  completed: { color: '#057A4B', bg: '#E4F7EE',  label: 'Completed' },
  pending:   { color: '#B45309', bg: '#FEF3E2',  label: 'Pending'   },
  failed:    { color: '#C5202B', bg: '#FDECEA',  label: 'Failed'    },
}

export const RecentActivity: React.FC = () => {
  const history = useStore(s => s.transactions.history)

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #DDE6F2' }}
      >
        <div>
          <h3 className="text-[15px] font-black" style={{ color: '#0A1929' }}>Recent Activity</h3>
          <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#7A97B4' }}>Your latest transactions</p>
        </div>
        <button
          className="flex items-center gap-1.5 text-[12px] font-bold transition-colors px-3 py-1.5 rounded-full"
          style={{ color: '#0B50D4', background: '#E8EFFE' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#dce7fd' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#E8EFFE' }}
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
              style={{ borderBottom: '1px solid #EEF3FB' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={15} style={{ color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold truncate" style={{ color: '#0A1929' }}>{tx.description}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-semibold" style={{ color: '#A8BDD4' }}>{tx.timestamp}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ color: st.color, background: st.bg }}
                  >
                    {st.label}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div
                  className="text-[13px] font-bold font-mono"
                  style={{ color: tx.type === 'receive' ? '#057A4B' : '#0A1929' }}
                >
                  {tx.amountIn}
                </div>
                <div className="text-[11px] font-mono font-semibold mt-0.5" style={{ color: '#A8BDD4' }}>{tx.amountOut}</div>
              </div>

              <ArrowUpRight
                size={13}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: '#A8BDD4' }}
              />
            </motion.div>
          )
        })}
      </div>

      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#EEF3FB' }}>
            <Droplets size={20} style={{ color: '#A8BDD4' }} />
          </div>
          <div className="text-[13px] font-semibold" style={{ color: '#A8BDD4' }}>No activity yet. Make your first swap!</div>
        </div>
      )}
    </div>
  )
}
