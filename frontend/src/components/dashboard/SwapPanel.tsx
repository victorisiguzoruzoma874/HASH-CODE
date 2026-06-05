import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ChevronDown, Info, Zap, RefreshCw, Loader2 } from 'lucide-react'
import { Spinner } from '../ui/Spinner'
import { priceApi } from '../../lib/api'

const TOKENS = [
  { symbol: 'ETH',  name: 'Ethereum', color: '#627EEA' },
  { symbol: 'SUI',  name: 'Sui',      color: '#4CA3FF' },
  { symbol: 'USDC', name: 'USD Coin', color: '#2775CA' },
  { symbol: 'USDT', name: 'Tether',   color: '#26A17B' },
  { symbol: 'BTC',  name: 'Bitcoin',  color: '#F7931A' },
  { symbol: 'SOL',  name: 'Solana',   color: '#9945FF' },
  { symbol: 'BNB',  name: 'BNB',      color: '#F0B90B' },
  { symbol: 'APT',  name: 'Aptos',    color: '#0EC89A' },
]

export const SwapPanel: React.FC = () => {
  const [sellToken,  setSellToken]  = useState(TOKENS[0])
  const [buyToken,   setBuyToken]   = useState(TOKENS[2])
  const [sellAmount, setSellAmount] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)
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
      setPrices(map)
      setLastUpdated(new Date())
    } catch { /* silent */ }
    finally { setFetching(false) }
  }, [])

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 30_000)
    return () => clearInterval(interval)
  }, [fetchPrices])

  // Compute live rate: how many buyToken per 1 sellToken
  const sellUSD  = prices[sellToken.symbol] ?? 0
  const buyUSD   = prices[buyToken.symbol]  ?? 0
  const rate     = sellUSD > 0 && buyUSD > 0 ? sellUSD / buyUSD : 0
  const buyAmount = sellAmount && rate > 0
    ? (parseFloat(sellAmount) * rate * 0.995).toFixed(buyUSD >= 1000 ? 6 : 4)
    : ''

  const rateLabel = rate > 0
    ? `1 ${sellToken.symbol} = ${rate >= 1000 ? rate.toLocaleString('en-US', { maximumFractionDigits: 2 }) : rate.toFixed(4)} ${buyToken.symbol}`
    : `Loading rate…`

  const handleSwap = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }, 1800)
  }

  const handleFlip = () => {
    setSellToken(buyToken)
    setBuyToken(sellToken)
    setSellAmount('')
  }

  const secondsAgo = lastUpdated ? Math.round((Date.now() - lastUpdated.getTime()) / 1000) : null

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 bg-white"
      style={{ border: '1px solid #DDE6F2', boxShadow: '0 1px 4px rgba(10,25,41,0.07)' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] font-black" style={{ color: '#0A1929' }}>Quick Swap</div>
          <div className="text-[12px] font-semibold mt-0.5" style={{ color: '#7A97B4' }}>Instant token exchange</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchPrices} disabled={fetching}
            className="flex items-center gap-1 text-[10px] font-bold transition-all"
            style={{ color: fetching ? '#A8BDD4' : '#0B50D4' }}>
            <RefreshCw size={10} className={fetching ? 'animate-spin' : ''} />
            {fetching ? 'Updating' : secondsAgo !== null ? `${secondsAgo}s ago` : 'Live'}
          </button>
          <div className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ color: '#7A97B4', background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
            <Info size={10} /> 0.5% fee
          </div>
        </div>
      </div>

      {/* Sell box */}
      <div className="rounded-xl p-4" style={{ background: '#F4F8FD', border: '1px solid #DDE6F2' }}>
        <div className="flex justify-between text-[12px] font-semibold mb-2.5">
          <span style={{ color: '#7A97B4' }}>You pay</span>
          {sellUSD > 0 && sellAmount && (
            <span style={{ color: '#7A97B4' }}>
              ≈ ${(parseFloat(sellAmount) * sellUSD).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number" value={sellAmount} onChange={e => setSellAmount(e.target.value)}
            className="flex-1 bg-transparent text-[22px] font-black font-mono outline-none min-w-0"
            style={{ color: '#0A1929' }} placeholder="0.00"
          />
          {/* Sell token selector */}
          <div className="relative">
            <button onClick={() => { setShowSellDrop(!showSellDrop); setShowBuyDrop(false) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold transition-all flex-shrink-0 bg-white"
              style={{ border: `1.5px solid ${showSellDrop ? '#0B50D4' : '#DDE6F2'}`, color: '#0A1929' }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white flex-shrink-0"
                style={{ background: sellToken.color }}>{sellToken.symbol[0]}</div>
              {sellToken.symbol}
              <ChevronDown size={11} style={{ color: '#7A97B4', transform: showSellDrop ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showSellDrop && (
              <div className="absolute right-0 top-full mt-1 z-50 rounded-[12px] overflow-hidden"
                style={{ background: '#fff', border: '1px solid #DDE6F2', boxShadow: '0 8px 24px rgba(10,25,41,0.12)', minWidth: 150 }}>
                {TOKENS.filter(t => t.symbol !== buyToken.symbol).map(t => (
                  <button key={t.symbol} onClick={() => { setSellToken(t); setShowSellDrop(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all"
                    style={{ background: sellToken.symbol === t.symbol ? '#EEF3FB' : 'transparent' }}
                    onMouseEnter={e => { if (sellToken.symbol !== t.symbol) e.currentTarget.style.background = '#F4F8FD' }}
                    onMouseLeave={e => { if (sellToken.symbol !== t.symbol) e.currentTarget.style.background = 'transparent' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white flex-shrink-0"
                      style={{ background: t.color }}>{t.symbol[0]}</div>
                    <div>
                      <div className="text-[12px] font-bold" style={{ color: '#0A1929' }}>{t.symbol}</div>
                      {prices[t.symbol] && (
                        <div className="text-[10px] font-mono" style={{ color: '#7A97B4' }}>
                          ${prices[t.symbol] >= 1000
                            ? prices[t.symbol].toLocaleString('en-US', { maximumFractionDigits: 0 })
                            : prices[t.symbol].toFixed(4)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flip */}
      <div className="flex justify-center -my-1 relative z-10">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }}
          onClick={handleFlip}
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-white"
          style={{ border: '1.5px solid #DDE6F2' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.background = '#E8EFFE' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2'; e.currentTarget.style.background = '#fff' }}
        >
          <ArrowUpDown size={14} style={{ color: '#0B50D4' }} />
        </motion.button>
      </div>

      {/* Buy box */}
      <div className="rounded-xl p-4" style={{ background: '#F4F8FD', border: '1px solid #DDE6F2' }}>
        <div className="flex justify-between text-[12px] font-semibold mb-2.5">
          <span style={{ color: '#7A97B4' }}>You receive</span>
          {buyUSD > 0 && buyAmount && (
            <span style={{ color: '#057A4B' }}>
              ≈ ${(parseFloat(buyAmount) * buyUSD).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-[22px] font-black font-mono flex items-center gap-2" style={{ color: '#057A4B' }}>
            {fetching && !buyAmount ? <Loader2 size={18} className="animate-spin" style={{ color: '#A8BDD4' }} /> : (buyAmount || '0.00')}
          </div>
          {/* Buy token selector */}
          <div className="relative">
            <button onClick={() => { setShowBuyDrop(!showBuyDrop); setShowSellDrop(false) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-bold transition-all flex-shrink-0 bg-white"
              style={{ border: `1.5px solid ${showBuyDrop ? '#0891B2' : '#DDE6F2'}`, color: '#0A1929' }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white flex-shrink-0"
                style={{ background: buyToken.color }}>{buyToken.symbol[0]}</div>
              {buyToken.symbol}
              <ChevronDown size={11} style={{ color: '#7A97B4', transform: showBuyDrop ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showBuyDrop && (
              <div className="absolute right-0 top-full mt-1 z-50 rounded-[12px] overflow-hidden"
                style={{ background: '#fff', border: '1px solid #DDE6F2', boxShadow: '0 8px 24px rgba(10,25,41,0.12)', minWidth: 150 }}>
                {TOKENS.filter(t => t.symbol !== sellToken.symbol).map(t => (
                  <button key={t.symbol} onClick={() => { setBuyToken(t); setShowBuyDrop(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all"
                    style={{ background: buyToken.symbol === t.symbol ? '#EEF3FB' : 'transparent' }}
                    onMouseEnter={e => { if (buyToken.symbol !== t.symbol) e.currentTarget.style.background = '#F4F8FD' }}
                    onMouseLeave={e => { if (buyToken.symbol !== t.symbol) e.currentTarget.style.background = 'transparent' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white flex-shrink-0"
                      style={{ background: t.color }}>{t.symbol[0]}</div>
                    <div>
                      <div className="text-[12px] font-bold" style={{ color: '#0A1929' }}>{t.symbol}</div>
                      {prices[t.symbol] && (
                        <div className="text-[10px] font-mono" style={{ color: '#7A97B4' }}>
                          ${prices[t.symbol] >= 1000
                            ? prices[t.symbol].toLocaleString('en-US', { maximumFractionDigits: 0 })
                            : prices[t.symbol].toFixed(4)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live rate row */}
      <div className="flex justify-between text-[12px] font-semibold px-3 py-2 rounded-xl"
        style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
        <span style={{ color: '#3D5A78' }}>{rateLabel}</span>
        <span style={{ color: '#057A4B', fontWeight: 700 }}>
          {fetching ? <Spinner size={10} /> : secondsAgo !== null ? `• ${secondsAgo}s` : '• Live'}
        </span>
      </div>

      {/* CTA */}
      {success ? (
        <div className="w-full py-3.5 rounded-full text-[13px] font-bold text-center"
          style={{ background: '#E4F7EE', color: '#057A4B', border: '1px solid rgba(5,122,75,0.2)' }}>
          ✓ Swap Successful
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSwap} disabled={loading || !sellAmount || rate === 0}
          className="w-full py-3.5 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{ background: '#0B50D4', color: '#fff', boxShadow: loading ? 'none' : '0 4px 16px rgba(11,80,212,0.28)' }}
          onMouseEnter={e => { if (!loading && sellAmount) e.currentTarget.style.background = '#0840AA' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
        >
          {loading
            ? <><Spinner size={16} />Swapping…</>
            : <><Zap size={14} />Swap {sellToken.symbol} → {buyToken.symbol}</>
          }
        </motion.button>
      )}
    </div>
  )
}
