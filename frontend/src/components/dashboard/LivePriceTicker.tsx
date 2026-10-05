import React, { useEffect, useState } from 'react'
import { priceApi } from '../../lib/api'

const NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SUI: 'Sui', APT: 'Aptos', USDC: 'USD Coin', USDT: 'Tether',
}

const NGN_RATE = 1565  // fallback until the backend returns a rate

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1)    return n.toFixed(4)
  return n.toFixed(6)
}

export const LivePriceTicker: React.FC = () => {
  const [prices, setPrices]   = useState<Record<string, number>>({})
  const [ngnRate, setNgnRate] = useState(NGN_RATE)
  const [state, setState]     = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await priceApi.getAll()
        // Merge so a partial response never removes a coin
        setPrices(prev => {
          const next = { ...prev }
          for (const [symbol, data] of Object.entries(res.prices)) next[symbol] = data.price
          return next
        })
        setState('ok')
        try {
          const rateRes = await priceApi.convert('USDC', 'NGN')
          setNgnRate(rateRes.rate || NGN_RATE)
        } catch { /* keep the previous rate */ }
      } catch {
        setState(s => (s === 'ok' ? s : 'error'))
      }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  const symbols = Object.keys(prices)

  if (symbols.length === 0) {
    return (
      <div className="dash-ticker" aria-live="polite">
        <div className="dash-tick" style={{ minWidth: 0, color: 'var(--grey)' }}>
          {state === 'error' ? 'Prices are unavailable. Retrying every 30 seconds.' : 'Loading prices…'}
        </div>
      </div>
    )
  }

  return (
    <div className="dash-ticker" role="list" aria-label="Live prices">
      {symbols.map(symbol => (
        <div className="dash-tick" role="listitem" key={symbol} title={NAMES[symbol] ?? symbol}>
          <b>{symbol}</b>
          <div className="usd">${fmt(prices[symbol])}</div>
          <div className="ngn">₦{Math.round(prices[symbol] * ngnRate).toLocaleString('en-NG')}</div>
        </div>
      ))}
    </div>
  )
}
