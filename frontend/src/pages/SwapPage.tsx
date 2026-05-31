import React, { useState, useEffect } from 'react'
import { ArrowUpDown, ChevronDown, Info, Zap, RefreshCw, TrendingUp, CheckCircle } from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'
import { motion } from 'framer-motion'
import { useApiStore } from '../store/useApiStore'

const tokens = [
  { symbol: 'ETH',  name: 'Ethereum',    balance: '2.45',     color: '#0B50D4' },
  { symbol: 'USDC', name: 'USD Coin',    balance: '1,429.55', color: '#0891B2' },
  { symbol: 'LINK', name: 'Chainlink',   balance: '142.00',   color: '#B45309' },
  { symbol: 'DAI',  name: 'Dai',         balance: '500.00',   color: '#B45309' },
  { symbol: 'WETH', name: 'Wrapped ETH', balance: '0.50',     color: '#0B50D4' },
]

const recentSwaps = [
  { from: 'ETH',  to: 'USDC', amount: '0.5 ETH',  received: '₦2,752,500', time: '2h ago',  status: 'completed' },
  { from: 'LINK', to: 'ETH',  amount: '50 LINK',  received: '0.028 ETH',  time: '1d ago',  status: 'completed' },
  { from: 'ETH',  to: 'DAI',  amount: '0.2 ETH',  received: '703.29 DAI', time: '2d ago',  status: 'completed' },
]

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDE6F2',
  borderRadius: 20, boxShadow: '0 1px 4px rgba(10,25,41,0.07)',
}
const innerBox: React.CSSProperties = {
  background: '#F4F8FD', border: '1px solid #DDE6F2', borderRadius: 14,
}

export const SwapPage: React.FC = () => {
  const [sellToken,  setSellToken]  = useState(tokens[0])
  const [buyToken,   setBuyToken]   = useState(tokens[1])
  const [sellAmount, setSellAmount] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)

  const getSwapQuote = useApiStore(s => s.getSwapQuote)
  const swapQuote    = useApiStore(s => s.swapQuote)
  const swapLoading  = useApiStore(s => s.swapLoading)

  useEffect(() => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) return
    const t = setTimeout(() => getSwapQuote(sellToken.symbol, buyToken.symbol, parseFloat(sellAmount)), 400)
    return () => clearTimeout(t)
  }, [sellAmount, sellToken.symbol, buyToken.symbol, getSwapQuote])

  const rate      = swapQuote?.rate ?? 0
  const buyAmount = swapQuote ? swapQuote.amountOut.toFixed(2) : ''

  const handleSwap = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }, 2000)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#EEF3FB' }}>
      {/* Page header */}
      <div className="px-7 pt-7 pb-5 flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #DDE6F2' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A1929', letterSpacing: '-0.02em' }}>Swap Tokens</h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#7A97B4', marginTop: 4 }}>Instant cross-chain token exchange with MEV protection</p>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
        <div className="flex gap-6 mx-auto" style={{ maxWidth: 980 }}>

          {/* ── Swap form ── */}
          <div style={{ width: 460, flexShrink: 0 }}>
            <div style={{ ...card, padding: 24 }}>

              {/* Header row */}
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
                  <button
                    className="flex items-center gap-2 flex-shrink-0"
                    style={{ padding: '8px 14px', background: '#fff', border: '1.5px solid #DDE6F2', borderRadius: 99, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2' }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: sellToken.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>
                      {sellToken.symbol[0]}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0A1929' }}>{sellToken.symbol}</span>
                    <ChevronDown size={12} style={{ color: '#7A97B4' }} />
                  </button>
                </div>
                {swapQuote && (
                  <div style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 8, color: '#7A97B4' }}>
                    Min received: {swapQuote.minOut.toFixed(4)} {buyToken.symbol}
                  </div>
                )}
              </div>

              {/* Flip */}
              <div className="flex justify-center" style={{ margin: '4px 0', position: 'relative', zIndex: 10 }}>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { setSellToken(buyToken); setBuyToken(sellToken) }}
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
                  <button
                    className="flex items-center gap-2 flex-shrink-0"
                    style={{ padding: '8px 14px', background: '#fff', border: '1.5px solid #DDE6F2', borderRadius: 99, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891B2' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2' }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: buyToken.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>
                      {buyToken.symbol[0]}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0A1929' }}>{buyToken.symbol}</span>
                    <ChevronDown size={12} style={{ color: '#7A97B4' }} />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div style={{ ...innerBox, padding: '12px 16px', marginBottom: 20 }}>
                {[
                  { label: 'Rate', value: rate > 0 ? `1 ${sellToken.symbol} = ${rate.toLocaleString()} ${buyToken.symbol}` : '—', hasRefresh: true },
                  { label: 'Slippage', value: swapQuote ? `${(swapQuote.slippageBps / 100).toFixed(1)}%` : '0.5%' },
                  { label: 'Network Fee', value: swapQuote ? `~$${swapQuote.networkFeeUSD.toFixed(2)}` : '—' },
                  { label: 'Route', value: `${sellToken.symbol} → ${buyToken.symbol}` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #EEF3FB' }}>
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
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #DDE6F2' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1929' }}>Available Tokens</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#7A97B4', marginTop: 2 }}>Click to set as sell token</div>
              </div>
              <div style={{ padding: '8px 8px' }}>
                {tokens.map(t => (
                  <div
                    key={t.symbol}
                    onClick={() => setSellToken(t)}
                    className="flex items-center gap-3 cursor-pointer"
                    style={{ padding: '10px 12px', borderRadius: 12, transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                      {t.symbol[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1929' }}>{t.symbol}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#7A97B4' }}>{t.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{t.balance}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#A8BDD4' }}>Balance</div>
                    </div>
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
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E8EFFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TrendingUp size={15} style={{ color: '#0B50D4' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1929' }}>{s.from} → {s.to}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#7A97B4' }}>{s.amount} · {s.time}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#057A4B' }}>{s.received}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: '#E4F7EE', color: '#057A4B', borderRadius: 99, display: 'inline-block', marginTop: 3 }}>
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
