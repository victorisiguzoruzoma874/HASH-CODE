import React from 'react'
import { Link } from 'react-router-dom'

export const StakeBanner: React.FC = () => (
  <section className="dash-card">
    <header>
      <h2>Stake and earn</h2>
      <span>Audited, non-custodial</span>
    </header>
    <div className="dash-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ color: 'var(--grey)', fontSize: 14 }}>
        Earn up to 12% APY on idle assets with audited staking pools.
      </p>
      <div className="dash-sum" style={{ border: '1px solid var(--line)' }}>
        {[['12%', 'Max APY'], ['₦4.2M', 'TVL'], ['3', 'Pools']].map(([v, l]) => (
          <div key={l} style={{ padding: '10px 12px' }}>
            <div className="v" style={{ fontSize: 15 }}>{v}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>{l}</div>
          </div>
        ))}
      </div>
      <Link to="/dashboard/pools" className="lp-btn solid">Start staking</Link>
    </div>
  </section>
)
