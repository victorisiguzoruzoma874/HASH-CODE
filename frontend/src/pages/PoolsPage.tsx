import React, { useState } from 'react'

const pools = [
  { pair: 'ETH/USDC',  tvl: '₦3.76B', apy: '6.2%', volume: '₦1.32B', myLiquidity: '₦1,940,600', change: '+0.8%' },
  { pair: 'WETH/DAI',  tvl: '₦2.82B', apy: '5.1%', volume: '₦972M',  myLiquidity: '₦1,392,850', change: '+0.3%' },
  { pair: 'LINK/ETH',  tvl: '₦1.53B', apy: '8.4%', volume: '₦488M',  myLiquidity: null,          change: '+1.2%' },
  { pair: 'USDC/DAI',  tvl: '₦4.85B', apy: '3.8%', volume: '₦1.88B', myLiquidity: null,          change: '+0.1%' },
  { pair: 'WBTC/ETH',  tvl: '₦6.57B', apy: '4.5%', volume: '₦1.53B', myLiquidity: null,          change: '+0.6%' },
]

const statItems = [
  { label: 'Total value locked', value: '₦19.53B' },
  { label: 'Volume (24h)',       value: '₦4.65B' },
  { label: 'My liquidity',       value: '₦3.33M' },
  { label: 'Active pools',       value: '5' },
]

export const PoolsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const filtered = pools.filter(p => p.pair.toLowerCase().includes(search.toLowerCase()))
  const mine = pools.filter(p => p.myLiquidity)

  return (
    <div className="dash-page">
      <div className="dash-ph">
        <div>
          <h1>Liquidity pools</h1>
          <p>Provide liquidity and earn trading fees.</p>
        </div>
        <button className="lp-btn solid">Add liquidity</button>
      </div>

      <div className="dash-stats">
        {statItems.map(s => (
          <div className="dash-stat" key={s.label}>
            <div className="lp-label" style={{ marginBottom: 4 }}>{s.label}</div>
            <div className="v">{s.value}</div>
          </div>
        ))}
      </div>

      <section className="dash-card" aria-label="My positions">
        <header>
          <h2>My positions</h2>
          <span>Your active liquidity positions</span>
        </header>
        {mine.length === 0 && <p className="dash-empty">You have no liquidity positions yet. Add liquidity to a pool to start earning fees.</p>}
        {mine.map(pool => (
          <div className="dash-row" key={pool.pair}>
            <div className="bar" />
            <div className="main">
              <div className="t">{pool.pair}</div>
              <div className="sub">APY <span className="dash-green">{pool.apy}</span></div>
            </div>
            <div className="num">
              {pool.myLiquidity}
              <small className="dash-green">{pool.change}</small>
            </div>
          </div>
        ))}
      </section>

      <section className="dash-card" aria-label="All pools">
        <header>
          <h2>All pools</h2>
          <input className="lp-input dash-search2" type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search pools" aria-label="Search pools" />
        </header>
        <div className="dash-tablewrap">
          <div className="dash-tr head" style={{ '--cols': '1.5fr 1fr 1fr 1fr 1fr 1fr' } as React.CSSProperties}>
            {['Pool', 'TVL', 'APY', 'Volume (24h)', '24h change', 'My liquidity'].map(h => <div key={h}>{h}</div>)}
          </div>
          {filtered.map(pool => (
            <div className="dash-tr click" key={pool.pair} style={{ '--cols': '1.5fr 1fr 1fr 1fr 1fr 1fr' } as React.CSSProperties}>
              <b>{pool.pair}</b>
              <span className="dash-mono">{pool.tvl}</span>
              <span className="dash-green" style={{ fontWeight: 700 }}>{pool.apy}</span>
              <span className="dash-mono">{pool.volume}</span>
              <span className="dash-mono dash-green">{pool.change}</span>
              <div>
                {pool.myLiquidity
                  ? <span className="dash-mono dash-green">{pool.myLiquidity}</span>
                  : <button className="lp-btn small">Add</button>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="dash-empty">No pools match "{search}". Try a different pair.</p>}
        </div>
      </section>
    </div>
  )
}
