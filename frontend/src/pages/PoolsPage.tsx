import React, { useState } from 'react'
import { Plus, TrendingUp, Droplets, Search } from 'lucide-react'
import { motion } from 'framer-motion'

const pools = [
  { pair: 'ETH/USDC',  tvl: '₦3.76B',  apy: '6.2%', volume: '₦1.32B',  myLiquidity: '₦1,940,600', color1: '#3B82F6', color2: '#06B6D4', change: '+0.8%' },
  { pair: 'WETH/DAI',  tvl: '₦2.82B',  apy: '5.1%', volume: '₦972M',   myLiquidity: '₦1,392,850', color1: '#3B82F6', color2: '#F59E0B', change: '+0.3%' },
  { pair: 'LINK/ETH',  tvl: '₦1.53B',  apy: '8.4%', volume: '₦488M',   myLiquidity: null,          color1: '#F59E0B', color2: '#3B82F6', change: '+1.2%' },
  { pair: 'USDC/DAI',  tvl: '₦4.85B',  apy: '3.8%', volume: '₦1.88B',  myLiquidity: null,          color1: '#06B6D4', color2: '#F59E0B', change: '+0.1%' },
  { pair: 'WBTC/ETH',  tvl: '₦6.57B',  apy: '4.5%', volume: '₦1.53B',  myLiquidity: null,          color1: '#F59E0B', color2: '#3B82F6', change: '+0.6%' },
]

const statItems = [
  { label: 'Total Value Locked', value: '₦19.53B', icon: Droplets,   color: '#3B82F6' },
  { label: 'Total Volume (24h)', value: '₦4.65B',  icon: TrendingUp, color: '#22C55E' },
  { label: 'My Liquidity',       value: '₦3.33M',  icon: Plus,       color: '#F59E0B' },
  { label: 'Active Pools',       value: '5',        icon: Droplets,   color: '#8B5CF6' },
]

export const PoolsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const filtered = pools.filter(p => p.pair.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #1E293B' }}>
        <div>
          <h1 className="text-[20px] font-bold" style={{ color: '#F8FAFC' }}>Liquidity Pools</h1>
          <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>Provide liquidity and earn trading fees</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #22C55E, #06B6D4)', color: '#07111F' }}
        >
          <Plus size={15} /> Add Liquidity
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {statItems.map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-[18px] p-4 flex items-center gap-3"
                style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.color}12` }}>
                  <Icon size={17} style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: '#64748B' }}>
                    {stat.label}
                  </div>
                  <div className="text-[20px] font-bold font-mono leading-tight" style={{ color: '#F8FAFC' }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* My positions */}
        <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
          <div className="text-[13px] font-semibold mb-4" style={{ color: '#F8FAFC' }}>My Positions</div>
          <div className="grid grid-cols-2 gap-3">
            {pools.filter(p => p.myLiquidity).map(pool => (
              <div key={pool.pair} className="flex items-center gap-3 p-4 rounded-[14px]"
                style={{ background: '#162033', border: '1px solid #1E293B' }}>
                <div className="flex -space-x-2 flex-shrink-0">
                  {[pool.color1, pool.color2].map((c, ci) => (
                    <div key={ci} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: c, borderColor: '#162033' }}>
                      {pool.pair.split('/')[ci][0]}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>{pool.pair}</div>
                  <div className="text-[11px]" style={{ color: '#64748B' }}>
                    APY: <span style={{ color: '#22C55E', fontWeight: 600 }}>{pool.apy}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold font-mono" style={{ color: '#F8FAFC' }}>{pool.myLiquidity}</div>
                  <div className="text-[11px] font-semibold" style={{ color: '#22C55E' }}>{pool.change}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All pools table */}
        <div className="rounded-[20px] overflow-hidden" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
          {/* Table header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1E293B' }}>
            <span className="text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>All Pools</span>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#334155' }} />
              <input
                type="text" placeholder="Search pools…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="rounded-[8px] pl-8 pr-3 py-1.5 text-[12px] w-[180px] transition-all"
                style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }}
              />
            </div>
          </div>

          {/* Column headers */}
          <div className="grid px-5 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid #1E293B', color: '#334155' }}>
            <span>Pool</span><span>TVL</span><span>APY</span>
            <span>Volume (24h)</span><span>24h Change</span><span>My Liquidity</span>
          </div>

          {/* Rows */}
          {filtered.map((pool, i) => (
            <motion.div
              key={pool.pair}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid px-5 py-4 items-center transition-colors cursor-pointer"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid #162033' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5 flex-shrink-0">
                  {[pool.color1, pool.color2].map((c, ci) => (
                    <div key={ci} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: c, borderColor: '#0F172A' }}>
                      {pool.pair.split('/')[ci][0]}
                    </div>
                  ))}
                </div>
                <span className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>{pool.pair}</span>
              </div>

              <span className="text-[13px] font-mono" style={{ color: '#F8FAFC' }}>{pool.tvl}</span>

              <span className="text-[13px] font-semibold flex items-center gap-1" style={{ color: '#22C55E' }}>
                <TrendingUp size={11} />{pool.apy}
              </span>

              <span className="text-[13px] font-mono" style={{ color: '#F8FAFC' }}>{pool.volume}</span>

              <span className="text-[13px] font-semibold font-mono" style={{ color: '#22C55E' }}>{pool.change}</span>

              <div>
                {pool.myLiquidity ? (
                  <span className="text-[13px] font-semibold font-mono" style={{ color: '#22C55E' }}>{pool.myLiquidity}</span>
                ) : (
                  <button
                    className="flex items-center gap-1 text-[12px] font-semibold transition-colors"
                    style={{ color: '#3B82F6' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#60A5FA' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#3B82F6' }}
                  >
                    <Plus size={11} /> Add
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px]" style={{ color: '#334155' }}>
              No pools match "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
