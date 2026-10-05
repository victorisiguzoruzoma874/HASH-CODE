import React, { useState, useEffect, useCallback } from 'react'
import { priceApi } from '../../lib/api'

const TOKENS = [
  { symbol: 'ETH',  name: 'Ethereum' },
  { symbol: 'SUI',  name: 'Sui' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'BTC',  name: 'Bitcoin' },
  { symbol: 'SOL',  name: 'Solana' },
  { symbol: 'BNB',  name: 'BNB' },
  { symbol: 'APT',  name: 'Aptos' },
]

type Token = typeof TOKENS[number]

const fmtPrice = (n: number) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(4)

const TokenPicker: React.FC<{
  value: Token; exclude: string; open: boolean; prices: Record<string, number>
  onToggle: () => void; onPick: (t: Token) => void; label: string
}> = ({ value, exclude, open, prices, onToggle, onPick, label }) => (
  <div className="dash-token">
    <button type="button" className="dash-tokenbtn" onClick={onToggle} aria-haspopup="listbox" aria-expanded={open} aria-label={label}>
      {value.symbol} {open ? '▴' : '▾'}
    </button>
    {open && (
      <div className="dash-tokenlist" role="listbox">
        {TOKENS.filter(t => t.symbol !== exclude).map(t => (
          <button key={t.symbol} type="button" role="option" aria-selected={t.symbol === value.symbol} onClick={() => onPick(t)}>
            <b>{t.symbol}</b>
            {prices[t.symbol] !== undefined && <span className="p">${fmtPrice(prices[t.symbol])}</span>}
          </button>
        ))}
      </div>
    )}
  </div>
)

export const SwapPanel: React.FC = () => {
  const [sellToken,  setSellToken]  = useState(TOKENS[0])
  const [buyToken,   setBuyToken]   = useState(TOKENS[2])
  const [sellAmount, setSellAmount] = useState('')
  const [showSellDrop, setShowSellDrop] = useState(false)
  const [showBuyDrop,  setShowBuyDrop]  = useState(false)

  const [prices, setPrices]     = useState<Record<string, number>>({})
  const [fetching, setFetching] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPrices = useCallback(async () => {
    setFetching(true)
    try {
      const res = await priceApi.getAll()
      const map: Record<string, number> = {}
      Object.entries(res.prices).forEach(([k, v]) => { map[k] = v.price })
      // Merge so a partial response never drops a price
      setPrices(prev => ({ ...prev, ...map }))
      setLastUpdated(new Date())
    } catch { /* silent */ }
    finally { setFetching(false) }
  }, [])

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 30_000)
    return () => clearInterval(interval)
  }, [fetchPrices])

  // Live rate: how many buyToken per 1 sellToken
  const sellUSD  = prices[sellToken.symbol] ?? 0
  const buyUSD   = prices[buyToken.symbol]  ?? 0
  const rate     = sellUSD > 0 && buyUSD > 0 ? sellUSD / buyUSD : 0
  const buyAmount = sellAmount && rate > 0
    ? (parseFloat(sellAmount) * rate).toFixed(buyUSD >= 1000 ? 6 : 4)
    : ''

  const rateLabel = rate > 0
    ? `1 ${sellToken.symbol} = ${rate >= 1000 ? rate.toLocaleString('en-US', { maximumFractionDigits: 2 }) : rate.toFixed(4)} ${buyToken.symbol}`
    : 'Loading rate…'

  const handleFlip = () => {
    setSellToken(buyToken)
    setBuyToken(sellToken)
    setSellAmount('')
  }

  const secondsAgo = lastUpdated ? Math.round((Date.now() - lastUpdated.getTime()) / 1000) : null

  return (
    <section className="dash-card">
      <header>
        <h2>Quick swap</h2>
        <span>Estimate from live prices</span>
      </header>

      <div className="dash-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="dash-box">
          <div className="top">
            <label htmlFor="swap-sell">You pay</label>
            {sellUSD > 0 && sellAmount && (
              <span>≈ ${(parseFloat(sellAmount) * sellUSD).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            )}
          </div>
          <div className="line">
            <input id="swap-sell" className="dash-amount" type="number" inputMode="decimal" min="0"
              value={sellAmount} onChange={e => setSellAmount(e.target.value)} placeholder="0.00" />
            <TokenPicker value={sellToken} exclude={buyToken.symbol} open={showSellDrop} prices={prices} label="Token to pay with"
              onToggle={() => { setShowSellDrop(!showSellDrop); setShowBuyDrop(false) }}
              onPick={t => { setSellToken(t); setShowSellDrop(false) }} />
          </div>
        </div>

        <button type="button" className="lp-btn small dash-flip" onClick={handleFlip} aria-label="Swap the two tokens">
          Flip
        </button>

        <div className="dash-box">
          <div className="top">
            <span>You receive</span>
            {buyUSD > 0 && buyAmount && (
              <span className="dash-green">≈ ${(parseFloat(buyAmount) * buyUSD).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            )}
          </div>
          <div className="line">
            <div className="dash-amount dash-green" aria-live="polite">
              {fetching && !buyAmount ? 'Loading…' : (buyAmount || '0.00')}
            </div>
            <TokenPicker value={buyToken} exclude={sellToken.symbol} open={showBuyDrop} prices={prices} label="Token to receive"
              onToggle={() => { setShowBuyDrop(!showBuyDrop); setShowSellDrop(false) }}
              onPick={t => { setBuyToken(t); setShowBuyDrop(false) }} />
          </div>
        </div>

        <div className="dash-note">
          <span>{rateLabel}</span>
          <button type="button" onClick={fetchPrices} disabled={fetching}
            style={{ font: 'inherit', background: 'none', border: 0, color: 'var(--grey)', cursor: 'pointer', textDecoration: 'underline' }}>
            {fetching ? 'Updating…' : secondsAgo !== null ? `Updated ${secondsAgo}s ago` : 'Refresh'}
          </button>
        </div>

        <button type="button" className="lp-btn solid" disabled>
          Swapping is not available yet
        </button>
        <p className="dash-meta">
          Amounts are estimates from live prices. Swaps will open once wallet signing is connected.
        </p>
      </div>
    </section>
  )
}
