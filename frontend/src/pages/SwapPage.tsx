import React, { useState, useEffect, useRef } from 'react'
import { useApiStore } from '../store/useApiStore'
import { priceApi } from '../lib/api'

// ── 20 tokens ────────────────────────────────────────────────
const ALL_TOKENS = [
  { symbol: 'ETH',   name: 'Ethereum',        category: 'Layer 1' },
  { symbol: 'USDC',  name: 'USD Coin',         category: 'Stablecoin' },
  { symbol: 'USDT',  name: 'Tether',           category: 'Stablecoin' },
  { symbol: 'WBTC',  name: 'Wrapped Bitcoin',  category: 'Wrapped' },
  { symbol: 'SUI',   name: 'Sui',              category: 'Layer 1' },
  { symbol: 'APT',   name: 'Aptos',            category: 'Layer 1' },
  { symbol: 'BNB',   name: 'BNB Chain',        category: 'Layer 1' },
  { symbol: 'SOL',   name: 'Solana',           category: 'Layer 1' },
  { symbol: 'MATIC', name: 'Polygon',          category: 'Layer 2' },
  { symbol: 'AVAX',  name: 'Avalanche',        category: 'Layer 1' },
  { symbol: 'LINK',  name: 'Chainlink',        category: 'DeFi' },
  { symbol: 'DAI',   name: 'Dai',              category: 'Stablecoin' },
  { symbol: 'WETH',  name: 'Wrapped ETH',      category: 'Wrapped' },
  { symbol: 'UNI',   name: 'Uniswap',          category: 'DeFi' },
  { symbol: 'AAVE',  name: 'Aave',             category: 'DeFi' },
  { symbol: 'ARB',   name: 'Arbitrum',         category: 'Layer 2' },
  { symbol: 'OP',    name: 'Optimism',         category: 'Layer 2' },
  { symbol: 'DOGE',  name: 'Dogecoin',         category: 'Meme' },
  { symbol: 'ADA',   name: 'Cardano',          category: 'Layer 1' },
  { symbol: 'DOT',   name: 'Polkadot',         category: 'Layer 1' },
]

type Token = typeof ALL_TOKENS[number]

const CATEGORIES = ['All', 'Layer 1', 'Layer 2', 'Stablecoin', 'DeFi', 'Wrapped', 'Meme']


const fmtPrice = (n: number) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(4)

// ── Token selector dropdown ───────────────────────────────────
const TokenDropdown: React.FC<{
  selected: Token; onSelect: (t: Token) => void; exclude?: string; label: string; prices: Record<string, number>
}> = ({ selected, onSelect, exclude, label, prices }) => {
  const [open, setOpen]         = useState(false)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('All')
  const ref      = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = ALL_TOKENS.filter(t =>
    t.symbol !== exclude &&
    (category === 'All' || t.category === category) &&
    (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
     t.name.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="dash-token">
      <button type="button" className="dash-tokenbtn" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label={label}>
        {selected.symbol} {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="dash-tokenlist" style={{ width: 300, maxHeight: 'none' }}>
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--line)' }}>
            <input ref={inputRef} className="lp-input" style={{ minHeight: 40 }} value={search}
              onChange={e => setSearch(e.target.value)} placeholder="Search token" aria-label="Search token" />
            <div className="dash-chips">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" className="dash-chip" aria-pressed={category === cat} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }} role="listbox">
            {filtered.length === 0 ? (
              <p className="dash-empty">No tokens found.</p>
            ) : filtered.map(t => (
              <button key={t.symbol} type="button" role="option" aria-selected={selected.symbol === t.symbol}
                onClick={() => { onSelect(t); setOpen(false); setSearch(''); setCategory('All') }}>
                <span><b>{t.symbol}</b> <span className="dash-meta">{t.name}</span></span>
                <span className="p">{prices[t.symbol] ? `$${fmtPrice(prices[t.symbol])}` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export const SwapPage: React.FC = () => {
  const [sellToken,  setSellToken]  = useState(ALL_TOKENS[0])
  const [buyToken,   setBuyToken]   = useState(ALL_TOKENS[1])
  const [sellAmount, setSellAmount] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [listCategory, setListCategory] = useState('All')
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  const getSwapQuote = useApiStore(s => s.getSwapQuote)
  const swapQuote    = useApiStore(s => s.swapQuote)
  const swapLoading  = useApiStore(s => s.swapLoading)

  // Fetch live USD prices
  useEffect(() => {
    const load = () => {
      priceApi.getAll().then(res => {
        const map: Record<string, number> = {}
        Object.entries(res.prices).forEach(([k, v]) => { map[k] = v.price })
        // Merge so a partial response never drops a price
        setLivePrices(prev => ({ ...prev, ...map }))
      }).catch(() => {})
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) return
    const t = setTimeout(() => getSwapQuote(sellToken.symbol, buyToken.symbol, parseFloat(sellAmount)), 400)
    return () => clearTimeout(t)
  }, [sellAmount, sellToken.symbol, buyToken.symbol, getSwapQuote])

  const rate      = swapQuote?.rate ?? 0
  const buyAmount = swapQuote ? swapQuote.amountOut.toFixed(4) : ''

  const handleFlip = () => { setSellToken(buyToken); setBuyToken(sellToken); setSellAmount('') }

  const visibleTokens = ALL_TOKENS.filter(t =>
    (listCategory === 'All' || t.category === listCategory) &&
    (t.symbol.toLowerCase().includes(listSearch.toLowerCase()) ||
     t.name.toLowerCase().includes(listSearch.toLowerCase()))
  )

  const details = [
    { label: 'Rate',        value: rate > 0 ? `1 ${sellToken.symbol} = ${rate.toLocaleString()} ${buyToken.symbol}` : '—' },
    { label: 'Slippage',    value: swapQuote ? `${(swapQuote.slippageBps / 100).toFixed(1)}%` : '—' },
    { label: 'Route',       value: `${sellToken.symbol} → ${buyToken.symbol}` },
  ]

  return (
    <div className="dash-page">
      <div className="dash-ph">
        <div>
          <h1>Swap tokens</h1>
          <p>Get a live quote across {ALL_TOKENS.length} tokens.</p>
        </div>
      </div>

      <div className="dash-swapgrid">
        {/* ── Swap form ── */}
        <section className="dash-card" aria-label="Swap">
          <header>
            <h2>Quick swap</h2>
            <span>Quote from live prices</span>
          </header>
          <div className="dash-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="dash-box">
              <div className="top">
                <label htmlFor="sp-sell">You pay</label>
              </div>
              <div className="line">
                <input id="sp-sell" className="dash-amount" style={{ fontSize: 26 }} type="number" inputMode="decimal" min="0"
                  value={sellAmount} onChange={e => setSellAmount(e.target.value)} placeholder="0.00" />
                <TokenDropdown selected={sellToken} onSelect={setSellToken} exclude={buyToken.symbol} label="Token to pay with" prices={livePrices} />
              </div>
              {livePrices[sellToken.symbol] && sellAmount && (
                <div className="dash-meta dash-mono" style={{ marginTop: 8 }}>
                  ≈ ${(parseFloat(sellAmount) * livePrices[sellToken.symbol]).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
              )}
            </div>

            <button type="button" className="lp-btn small dash-flip" onClick={handleFlip} aria-label="Swap the two tokens">Flip</button>

            <div className="dash-box">
              <div className="top">
                <span>You receive</span>
              </div>
              <div className="line">
                <div className="dash-amount dash-green" style={{ fontSize: 26 }} aria-live="polite">
                  {swapLoading ? 'Loading…' : (buyAmount || '0.00')}
                </div>
                <TokenDropdown selected={buyToken} onSelect={setBuyToken} exclude={sellToken.symbol} label="Token to receive" prices={livePrices} />
              </div>
              {swapQuote && (
                <div className="dash-meta dash-mono" style={{ marginTop: 8 }}>
                  Min received: {swapQuote.minOut.toFixed(4)} {buyToken.symbol}
                </div>
              )}
            </div>

            <div className="dash-box" style={{ padding: 0 }}>
              {details.map((row, i) => (
                <div key={row.label} className="dash-note"
                  style={{ padding: '10px 12px', borderBottom: i < details.length - 1 ? '1px solid color-mix(in srgb, var(--line) 25%, transparent)' : 0 }}>
                  <span>{row.label}</span>
                  <span className="dash-mono" style={{ color: 'var(--ink)' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ padding: '0 12px 10px' }}>
                <button type="button" className="lp-btn small" disabled={!sellAmount}
                  onClick={() => sellAmount && getSwapQuote(sellToken.symbol, buyToken.symbol, parseFloat(sellAmount))}>
                  Refresh quote
                </button>
              </div>
            </div>

            <button type="button" className="lp-btn solid" disabled>Swapping is not available yet</button>
            <p className="dash-meta">Quotes are live. Swaps will open once wallet signing is connected.</p>
          </div>
        </section>

        {/* ── Right column ── */}
        <div className="dash-stack">
          <section className="dash-card" aria-label="Available tokens">
            <header>
              <h2>Available tokens</h2>
              <span>{visibleTokens.length} of {ALL_TOKENS.length} · select one to sell</span>
            </header>
            <div className="dash-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--line)' }}>
              <input className="lp-input" style={{ minHeight: 40 }} value={listSearch}
                onChange={e => setListSearch(e.target.value)} placeholder="Search tokens" aria-label="Search tokens" />
              <div className="dash-chips">
                {CATEGORIES.map(cat => (
                  <button key={cat} className="dash-chip" aria-pressed={listCategory === cat} onClick={() => setListCategory(cat)}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="dash-scrollbox">
              {visibleTokens.length === 0 && <p className="dash-empty">No tokens match your search.</p>}
              {visibleTokens.map(t => (
                <div key={t.symbol} className="dash-row" style={{ cursor: 'pointer', background: sellToken.symbol === t.symbol ? 'var(--panel)' : undefined }}
                  role="button" tabIndex={0}
                  onClick={() => setSellToken(t)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSellToken(t) } }}>
                  <div className="bar" style={{ background: sellToken.symbol === t.symbol ? 'var(--ink)' : 'transparent' }} />
                  <div className="main">
                    <div className="t">{t.symbol} <span className="dash-tag">{t.category}</span></div>
                    <div className="sub">{t.name}</div>
                  </div>
                  <div className="num">
                    {livePrices[t.symbol] ? `$${fmtPrice(livePrices[t.symbol])}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
