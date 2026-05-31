import React, { useState } from 'react'
import { Plus, TrendingUp, Droplets, Search } from 'lucide-react'
import { motion } from 'framer-motion'

const pools = [
  { pair: 'ETH/USDC',  tvl: '₦3.76B', apy: '6.2%', volume: '₦1.32B', myLiquidity: '₦1,940,600', color1: '#0B50D4', color2: '#0891B2', change: '+0.8%' },
  { pair: 'WETH/DAI',  tvl: '₦2.82B', apy: '5.1%', volume: '₦972M',  myLiquidity: '₦1,392,850', color1: '#0B50D4', color2: '#B45309', change: '+0.3%' },
  { pair: 'LINK/ETH',  tvl: '₦1.53B', apy: '8.4%', volume: '₦488M',  myLiquidity: null,          color1: '#B45309', color2: '#0B50D4', change: '+1.2%' },
  { pair: 'USDC/DAI',  tvl: '₦4.85B', apy: '3.8%', volume: '₦1.88B', myLiquidity: null,          color1: '#0891B2', color2: '#B45309', change: '+0.1%' },
  { pair: 'WBTC/ETH',  tvl: '₦6.57B', apy: '4.5%', volume: '₦1.53B', myLiquidity: null,          color1: '#B45309', color2: '#0B50D4', change: '+0.6%' },
]

const statItems = [
  { label: 'Total Value Locked', value: '₦19.53B', icon: Droplets,   color: '#0B50D4', bg: '#E8EFFE' },
  { label: 'Total Volume (24h)', value: '₦4.65B',  icon: TrendingUp, color: '#057A4B', bg: '#E4F7EE' },
  { label: 'My Liquidity',       value: '₦3.33M',  icon: Plus,       color: '#B45309', bg: '#FEF3E2' },
  { label: 'Active Pools',       value: '5',        icon: Droplets,   color: '#7C3AED', bg: '#F3EEFF' },
]

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDE6F2',
  borderRadius: 20, boxShadow: '0 1px 4px rgba(10,25,41,0.07)',
}

export const PoolsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const filtered = pools.filter(p => p.pair.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="h-full flex flex-col" style={{ background: '#EEF3FB' }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 bg-white" style={{ padding: '24px 28px', borderBottom: '1px solid #DDE6F2' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A1929', letterSpacing: '-0.02em' }}>Liquidity Pools</h1>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#7A97B4', marginTop: 4 }}>Provide liquidity and earn trading fees</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2"
          style={{ padding: '12px 22px', background: '#0B50D4', color: '#fff', border: 'none', borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(11,80,212,0.28)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0840AA' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
        >
          <Plus size={15} /> Add Liquidity
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6" style={{ padding: '24px 28px' }}>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {statItems.map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{ ...card, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A97B4', marginBottom: 4 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#0A1929', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* My positions */}
        <div style={card}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #DDE6F2' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>My Positions</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#7A97B4', marginTop: 3 }}>Your active liquidity positions</div>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {pools.filter(p => p.myLiquidity).map(pool => (
              <div key={pool.pair} className="flex items-center gap-3"
                style={{ padding: '16px 18px', background: '#F4F8FD', border: '1px solid #DDE6F2', borderRadius: 14 }}>
                <div className="flex flex-shrink-0" style={{ marginRight: 4 }}>
                  {[pool.color1, pool.color2].map((c, ci) => (
                    <div key={ci} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: ci > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', zIndex: ci === 0 ? 1 : 0, position: 'relative' }}>
                      {pool.pair.split('/')[ci][0]}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1929' }}>{pool.pair}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#7A97B4', marginTop: 2 }}>
                    APY: <span style={{ color: '#057A4B', fontWeight: 800 }}>{pool.apy}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: '#0A1929' }}>{pool.myLiquidity}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#057A4B', marginTop: 2 }}>{pool.change}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All pools table */}
        <div style={{ ...card, overflow: 'hidden' }}>
          {/* Table header */}
          <div className="flex items-center justify-between" style={{ padding: '18px 22px', borderBottom: '1px solid #DDE6F2' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>All Pools</div>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#A8BDD4', pointerEvents: 'none' }} />
              <input
                type="text" placeholder="Search pools…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 12px 8px 34px', fontSize: 13, fontWeight: 600, background: '#F4F8FD', border: '1.5px solid #DDE6F2', borderRadius: 99, width: 190, color: '#0A1929', outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#DDE6F2' }}
              />
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '10px 22px', borderBottom: '1px solid #EEF3FB' }}>
            {['Pool', 'TVL', 'APY', 'Volume (24h)', '24h Change', 'My Liquidity'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A8BDD4' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((pool, i) => (
            <motion.div
              key={pool.pair}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', padding: '14px 22px', alignItems: 'center', borderBottom: '1px solid #EEF3FB', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <div style={{ display: 'flex', flexShrink: 0 }}>
                  {[pool.color1, pool.color2].map((c, ci) => (
                    <div key={ci} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: ci > 0 ? -6 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', position: 'relative', zIndex: ci === 0 ? 1 : 0 }}>
                      {pool.pair.split('/')[ci][0]}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0A1929' }}>{pool.pair}</span>
              </div>

              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{pool.tvl}</span>

              <div className="flex items-center gap-1" style={{ fontSize: 14, fontWeight: 800, color: '#057A4B' }}>
                <TrendingUp size={12} />{pool.apy}
              </div>

              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{pool.volume}</span>

              <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#057A4B' }}>{pool.change}</span>

              <div>
                {pool.myLiquidity ? (
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#057A4B' }}>{pool.myLiquidity}</span>
                ) : (
                  <button
                    className="flex items-center gap-1"
                    style={{ fontSize: 13, fontWeight: 800, color: '#0B50D4', background: '#E8EFFE', border: 'none', borderRadius: 99, padding: '4px 12px', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#dce7fd' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#E8EFFE' }}
                  >
                    <Plus size={11} /> Add
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '40px 22px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#A8BDD4' }}>
              No pools match "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
