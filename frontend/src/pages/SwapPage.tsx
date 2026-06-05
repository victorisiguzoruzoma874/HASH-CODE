import React, { useState, useEffect, useRef } from 'react'
import { ArrowUpDown, ChevronDown, Info, Zap, RefreshCw, TrendingUp, CheckCircle, Search, X } from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiStore } from '../store/useApiStore'
import { priceApi } from '../lib/api'

// ── 20 tokens ────────────────────────────────────────────────
const ALL_TOKENS = [
  { symbol: 'ETH',   name: 'Ethereum',        balance: '2.45',      color: '#627EEA', category: 'Layer 1' },
  { symbol: 'USDC',  name: 'USD Coin',         balance: '1,429.55',  color: '#2775CA', category: 'Stablecoin' },
  { symbol: 'USDT',  name: 'Tether',           balance: '850.00',    color: '#26A17B', category: 'Stablecoin' },
  { symbol: 'WBTC',  name: 'Wrapped Bitcoin',  balance: '0.012',     color: '#F7931A', category: 'Wrapped' },
  { symbol: 'SUI',   name: 'Sui',              balance: '320.50',    color: '#4CA3FF', category: 'Layer 1' },
  { symbol: 'APT',   name: 'Aptos',            balance: '45.00',     color: '#0EC89A', category: 'Layer 1' },
  { symbol: 'BNB',   name: 'BNB Chain',        balance: '1.80',      color: '#F0B90B', category: 'Layer 1' },
  { symbol: 'SOL',   name: 'Solana',           balance: '12.30',     color: '#9945FF', category: 'Layer 1' },
  { symbol: 'MATIC', name: 'Polygon',          balance: '2,400.00',  color: '#8247E5', category: 'Layer 2' },
  { symbol: 'AVAX',  name: 'Avalanche',        balance: '8.75',      color: '#E84142', category: 'Layer 1' },
  { symbol: 'LINK',  name: 'Chainlink',        balance: '142.00',    color: '#2A5ADA', category: 'DeFi' },
  { symbol: 'DAI',   name: 'Dai',              balance: '500.00',    color: '#F5AC37', category: 'Stablecoin' },
  { symbol: 'WETH',  name: 'Wrapped ETH',      balance: '0.50',      color: '#627EEA', category: 'Wrapped' },
  { symbol: 'UNI',   name: 'Uniswap',          balance: '28.00',     color: '#FF007A', category: 'DeFi' },
  { symbol: 'AAVE',  name: 'Aave',             balance: '3.40',      color: '#B6509E', category: 'DeFi' },
  { symbol: 'ARB',   name: 'Arbitrum',         balance: '600.00',    color: '#12AAFF', category: 'Layer 2' },
  { symbol: 'OP',    name: 'Optimism',         balance: '250.00',    color: '#FF0420', category: 'Layer 2' },
  { symbol: 'DOGE',  name: 'Dogecoin',         balance: '5,000.00',  color: '#C2A633', category: 'Meme' },
  { symbol: 'ADA',   name: 'Cardano',          balance: '900.00',    color: '#0D1E2D', category: 'Layer 1' },
  { symbol: 'DOT',   name: 'Polkadot',         balance: '55.00',     color: '#E6007A', category: 'Layer 1' },
]

const CATEGORIES = ['All', 'Layer 1', 'Layer 2', 'Stablecoin', 'DeFi', 'Wrapped', 'Meme']

const recentSwaps = [
  { from: 'ETH',  to: 'USDC', amount: '0.5 ETH',   received: '₦2,752,500', time: '2h ago',  status: 'completed' },
  { from: 'SUI',  to: 'USDT', amount: '120 SUI',   received: '389.00 USDT',time: '5h ago',  status: 'completed' },
  { from: 'LINK', to: 'ETH',  amount: '50 LINK',   received: '0.028 ETH',  time: '1d ago',  status: 'completed' },
  { from: 'ETH',  to: 'DAI',  amount: '0.2 ETH',   received: '703.29 DAI', time: '2d ago',  status: 'completed' },
  { from: 'MATIC','to': 'USDC', amount: '500 MATIC', received: '412.00 USDC',time: '3d ago', status: 'completed' },
]

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDE6F2',
  borderRadius: 20, boxShadow: '0 1px 4px rgba(10,25,41,0.07)',
}
const innerBox: React.CSSProperties = {
  background: '#F4F8FD', border: '1px solid #DDE6F2', borderRadius: 14,
}

// ── Token selector dropdown ───────────────────────────────────
interface TokenDropdownProps {
  selected: typeof ALL_TOKENS[0]
  onSelect: (t: typeof ALL_TOKENS[0]) => void
  exclude?: string
  label: string
  accentColor?: string
}

const TokenDropdown: React.FC<TokenDropdownProps> = ({ selected, onSelect, exclude, accentColor = '#0B50D4' }) => {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('All')
  const ref = useRef<HTMLDivElement>(null)
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 flex-shrink-0 transition-all"
        style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${open ? accentColor : '#DDE6F2'}`, borderRadius: 99, cursor: 'pointer' }}
      >
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: selected.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
          {selected.symbol[0]}
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0A1929' }}>{selected.symbol}</span>
        <ChevronDown size={12} style={{ color: '#7A97B4', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 300, zIndex: 100,
              background: '#fff', border: '1px solid #DDE6F2',
              borderRadius: 16, boxShadow: '0 12px 40px rgba(10,25,41,0.14)',
              overflow: 'hidden',
            }}
          >
            {/* Search */}
            <div style={{ padding: '12px 12px 8px' }}>
              <div className="flex items-center gap-2" style={{ background: '#F4F8FD', border: '1.5px solid #DDE6F2', borderRadius: 10, padding: '8px 12px' }}>
                <Search size={13} style={{ color: '#A8BDD4', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search token…"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0A1929' }}
                />
                {search && <button onClick={() => setSearch('')}><X size={11} style={{ color: '#A8BDD4' }} /></button>}
              </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-1 overflow-x-auto" style={{ padding: '0 12px 8px', scrollbarWidth: 'none' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{
                    flexShrink: 0, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                    background: category === cat ? accentColor : 'transparent',
                    borderColor: category === cat ? accentColor : '#DDE6F2',
                    color: category === cat ? '#fff' : '#7A97B4',
                  }}
                >{cat}</button>
              ))}
            </div>

            {/* Token list */}
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 6px 8px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#A8BDD4' }}>No tokens found</div>
              ) : filtered.map(t => (
                <button key={t.symbol}
                  onClick={() => { onSelect(t); setOpen(false); setSearch(''); setCategory('All') }}
                  className="w-full flex items-center gap-3 transition-all"
                  style={{
                    padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: selected.symbol === t.symbol ? '#EEF3FB' : 'transparent',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (selected.symbol !== t.symbol) e.currentTarget.style.background = '#F4F8FD' }}
                  onMouseLeave={e => { if (selected.symbol !== t.symbol) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                    {t.symbol[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0A1929' }}>{t.symbol}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#7A97B4' }}>{t.name}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{t.balance}</div>
                    <div style={{ fontSize: 10, color: '#A8BDD4' }}>{t.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export const SwapPage: React.FC = () => {
  const [sellToken,  setSellToken]  = useState(ALL_TOKENS[0])
  const [buyToken,   setBuyToken]   = useState(ALL_TOKENS[1])
  const [sellAmount, setSellAmount] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [listCategory, setListCategory] = useState('All')
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  const getSwapQuote = useApiStore(s => s.getSwapQuote)
  const swapQuote    = useApiStore(s => s.swapQuote)
  const swapLoading  = useApiStore(s => s.swapLoading)

  // Fetch live USD prices
  useEffect(() => {
    priceApi.getAll().then(res => {
      const map: Record<string, number> = {}
      Object.entries(res.prices).forEach(([k, v]) => { map[k] = v.price })
      setLivePrices(map)
    }).catch(() => {})
    const interval = setInterval(() => {
      priceApi.getAll().then(res => {
        const map: Record<string, number> = {}
        Object.entries(res.prices).forEach(([k, v]) => { map[k] = v.price })
        setLivePrices(map)
      }).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) return
    const t = setTimeout(() => getSwapQuote(sellToken.symbol, buyToken.symbol, parseFloat(sellAmount)), 400)
    return () => clearTimeout(t)
  }, [sellAmount, sellToken.symbol, buyToken.symbol, getSwapQuote])

  const rate      = swapQuote?.rate ?? 0
  const buyAmount = swapQuote ? swapQuote.amountOut.toFixed(4) : ''

  const handleSwap = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }, 2000)
  }

  const handleFlip = () => { setSellToken(buyToken); setBuyToken(sellToken); setSellAmount('') }

  const visibleTokens = ALL_TOKENS.filter(t =>
    (listCategory === 'All' || t.category === listCategory) &&
    (t.symbol.toLowerCase().includes(listSearch.toLowerCase()) ||
     t.name.toLowerCase().includes(listSearch.toLowerCase()))
  )

  return (
    <div className="h-full flex flex-col" style={{ background: '#EEF3FB' }}>
      {/* Page header */}
      <div className="px-7 pt-7 pb-5 flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #DDE6F2' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A1929', letterSpacing: '-0.02em' }}>Swap Tokens</h1>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#7A97B4', marginTop: 4 }}>Instant cross-chain exchange across {ALL_TOKENS.length} tokens with MEV protection</p>
          </div>
          <div className="flex items-center gap-2" style={{ padding: '8px 16px', background: '#E8EFFE', border: '1px solid #0B50D420', borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#0B50D4' }}>
            {ALL_TOKENS.length} tokens available
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
        <div className="flex gap-6 mx-auto" style={{ maxWidth: 1100 }}>

          {/* ── Swap form ── */}
          <div style={{ width: 460, flexShrink: 0 }}>
            <div style={{ ...card, padding: 24 }}>

              {/* Header */}
              <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>Quick Swap</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#7A97B4', marginTop: 2 }}>Best rate across all pools</div>
                </div>
                <div className="flex items-center gap-1.5" style={{ padding: '6px 12px', background: '#EEF3FB', border: '1px solid #DDE6F2', borderRadius: 99, fontSize: 12, fontWeight: 700, color: '#7A97B4' }}>
                  <Info size={11} /> 0.5% fee
                </div>
              </div>

              {/* Sell */}
              <div style={{ ...innerBox, padding: 16, marginBottom: 4 }}>
                <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 600, color: '#7A97B4', marginBottom: 10 }}>
                  <span>You pay</span>
                  <span>Balance: {sellToken.balance} {sellToken.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number" value={sellAmount} onChange={e => setSellAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ flex: 1, background: 'transparent', fontSize: 28, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", outline: 'none', border: 'none', color: '#0A1929', minWidth: 0 }}
                  />
                  <TokenDropdown selected={sellToken} onSelect={setSellToken} exclude={buyToken.symbol} label="sell" />
                </div>
                {livePrices[sellToken.symbol] && sellAmount && (
                  <div style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 8, color: '#7A97B4' }}>
                    ≈ ${(parseFloat(sellAmount) * livePrices[sellToken.symbol]).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              {/* Flip */}
              <div className="flex justify-center" style={{ margin: '4px 0', position: 'relative', zIndex: 10 }}>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}
                  onClick={handleFlip}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1.5px solid #DDE6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(10,25,41,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.background = '#E8EFFE' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2'; e.currentTarget.style.background = '#fff' }}
                >
                  <ArrowUpDown size={15} style={{ color: '#0B50D4' }} />
                </motion.button>
              </div>

              {/* Buy */}
              <div style={{ ...innerBox, padding: 16, marginBottom: 20 }}>
                <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 600, color: '#7A97B4', marginBottom: 10 }}>
                  <span>You receive</span>
                  <span>Balance: {buyToken.balance} {buyToken.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ flex: 1, fontSize: 28, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: '#057A4B', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {swapLoading ? <Spinner size={22} /> : (buyAmount || '0.00')}
                  </div>
                  <TokenDropdown selected={buyToken} onSelect={setBuyToken} exclude={sellToken.symbol} label="buy" accentColor="#0891B2" />
                </div>
                {swapQuote && (
                  <div style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 8, color: '#7A97B4' }}>
                    Min received: {swapQuote.minOut.toFixed(4)} {buyToken.symbol}
                  </div>
                )}
              </div>

              {/* Details */}
              <div style={{ ...innerBox, padding: '12px 16px', marginBottom: 20 }}>
                {[
                  { label: 'Rate',        value: rate > 0 ? `1 ${sellToken.symbol} = ${rate.toLocaleString()} ${buyToken.symbol}` : '—', hasRefresh: true },
                  { label: 'Slippage',    value: swapQuote ? `${(swapQuote.slippageBps / 100).toFixed(1)}%` : '0.5%' },
                  { label: 'Network Fee', value: swapQuote ? `~$${swapQuote.networkFeeUSD.toFixed(2)}` : '—' },
                  { label: 'Route',       value: `${sellToken.symbol} → ${buyToken.symbol}` },
                ].map((row, i, arr) => (
                  <div key={row.label} className="flex justify-between items-center"
                    style={{ paddingBottom: i < arr.length - 1 ? 8 : 0, marginBottom: i < arr.length - 1 ? 8 : 0, borderBottom: i < arr.length - 1 ? '1px solid #EEF3FB' : 'none' }}>
                    <span className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: '#7A97B4' }}>
                      {row.label} {row.hasRefresh && <Info size={10} />}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{row.value}</span>
                      {row.hasRefresh && (
                        <button onClick={() => sellAmount && getSwapQuote(sellToken.symbol, buyToken.symbol, parseFloat(sellAmount))} style={{ color: '#0B50D4', cursor: 'pointer' }}>
                          <RefreshCw size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {success ? (
                <div className="flex items-center justify-center gap-2" style={{ padding: '15px 24px', background: '#E4F7EE', border: '1px solid rgba(5,122,75,0.2)', borderRadius: 99, fontSize: 14, fontWeight: 800, color: '#057A4B' }}>
                  <CheckCircle size={16} /> Swap Successful
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSwap} disabled={loading || !sellAmount}
                  className="w-full flex items-center justify-center gap-2"
                  style={{ padding: '15px 24px', background: '#0B50D4', color: '#fff', border: 'none', borderRadius: 99, fontSize: 15, fontWeight: 800, cursor: loading || !sellAmount ? 'not-allowed' : 'pointer', opacity: loading || !sellAmount ? 0.5 : 1, boxShadow: '0 4px 16px rgba(11,80,212,0.28)' }}
                  onMouseEnter={e => { if (!loading && sellAmount) e.currentTarget.style.background = '#0840AA' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
                >
                  {loading ? <><Spinner size={17} />Swapping…</> : <><Zap size={15} />Swap {sellToken.symbol} → {buyToken.symbol}</>}
                </motion.button>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex-1 flex flex-col gap-5" style={{ minWidth: 0 }}>

            {/* Token list */}
            <div style={card}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #DDE6F2' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1929' }}>Available Tokens</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#7A97B4', marginTop: 2 }}>Click to set as sell token</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: '#EEF3FB', borderRadius: 99, color: '#7A97B4' }}>
                    {visibleTokens.length} / {ALL_TOKENS.length}
                  </span>
                </div>

                {/* Search bar */}
                <div className="flex items-center gap-2" style={{ background: '#F4F8FD', border: '1.5px solid #DDE6F2', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                  <Search size={13} style={{ color: '#A8BDD4', flexShrink: 0 }} />
                  <input
                    value={listSearch}
                    onChange={e => setListSearch(e.target.value)}
                    placeholder="Search tokens…"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0A1929' }}
                  />
                  {listSearch && <button onClick={() => setListSearch('')}><X size={11} style={{ color: '#A8BDD4' }} /></button>}
                </div>

                {/* Category chips */}
                <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setListCategory(cat)}
                      style={{
                        flexShrink: 0, padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                        border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                        background: listCategory === cat ? '#0B50D4' : 'transparent',
                        borderColor: listCategory === cat ? '#0B50D4' : '#DDE6F2',
                        color: listCategory === cat ? '#fff' : '#7A97B4',
                      }}
                    >{cat}</button>
                  ))}
                </div>
              </div>

              {/* Scrollable token list */}
              <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 8px' }}>
                {visibleTokens.map(t => (
                  <div key={t.symbol}
                    onClick={() => setSellToken(t)}
                    className="flex items-center gap-3 cursor-pointer"
                    style={{
                      padding: '9px 12px', borderRadius: 12, transition: 'background 0.15s',
                      background: sellToken.symbol === t.symbol ? '#EEF3FB' : 'transparent',
                    }}
                    onMouseEnter={e => { if (sellToken.symbol !== t.symbol) e.currentTarget.style.background = '#F4F8FD' }}
                    onMouseLeave={e => { if (sellToken.symbol !== t.symbol) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                      {t.symbol[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0A1929' }}>{t.symbol}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', background: '#EEF3FB', borderRadius: 99, color: '#7A97B4' }}>{t.category}</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#7A97B4' }}>{t.name}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{t.balance}</div>
                      {livePrices[t.symbol] ? (
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#057A4B', marginTop: 1 }}>
                          ${livePrices[t.symbol] >= 1000
                            ? livePrices[t.symbol].toLocaleString('en-US', { maximumFractionDigits: 0 })
                            : livePrices[t.symbol].toFixed(4)}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: '#A8BDD4' }}>Balance</div>
                      )}
                    </div>
                    {sellToken.symbol === t.symbol && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0B50D4', flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent swaps */}
            <div style={card}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #DDE6F2' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1929' }}>Recent Swaps</div>
              </div>
              <div style={{ padding: '8px 8px' }}>
                {recentSwaps.map((s, i) => (
                  <div key={i} className="flex items-center gap-3"
                    style={{ padding: '10px 12px', borderRadius: 12, transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E8EFFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TrendingUp size={14} style={{ color: '#0B50D4' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1929' }}>{s.from} → {s.to}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#7A97B4' }}>{s.amount} · {s.time}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: '#057A4B' }}>{s.received}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#E4F7EE', color: '#057A4B', borderRadius: 99, display: 'inline-block', marginTop: 3 }}>
                        {s.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
