import React, { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { priceApi } from '../../lib/api'

interface CoinPrice {
  symbol:  string
  usd:     number
  change?: number
}

const COIN_META: Record<string, { name: string; color: string; bg: string }> = {
  BTC:  { name: 'Bitcoin',  color: '#F7931A', bg: '#FFF4E6' },
  ETH:  { name: 'Ethereum', color: '#627EEA', bg: '#EEF1FD' },
  SUI:  { name: 'Sui',      color: '#4CA3FF', bg: '#E8F3FF' },
  APT:  { name: 'Aptos',    color: '#0EC89A', bg: '#E4F9F4' },
  USDC: { name: 'USDC',     color: '#2775CA', bg: '#E8F0FA' },
  USDT: { name: 'Tether',   color: '#26A17B', bg: '#E4F7EE' },
}

const NGN_RATE = 1565  // fallback; real rate from backend

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1)    return n.toFixed(4)
  return n.toFixed(6)
}

function CoinChip({ coin, ngn }: { coin: CoinPrice; ngn: number }) {
  const meta    = COIN_META[coin.symbol]
  const ngnVal  = coin.usd * ngn
  const positive = (coin.change ?? 0) >= 0

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 rounded-[12px] flex-shrink-0"
      style={{ background: meta?.bg ?? '#F8FAFD', border: '1.5px solid #DDE6F2' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
        style={{ background: meta?.color ?? '#0B50D4' }}>
        {coin.symbol[0]}
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-black" style={{ color: '#0A1929' }}>
            {coin.symbol}
          </span>
          <span className="text-[11px] font-mono font-semibold" style={{ color: '#0A1929' }}>
            ${fmt(coin.usd)}
          </span>
          {coin.change !== undefined && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold`}
              style={{ color: positive ? '#057A4B' : '#D92D20' }}>
              {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(coin.change).toFixed(2)}%
            </span>
          )}
        </div>
        <div className="text-[10px] font-mono" style={{ color: '#7A97B4' }}>
          ₦{ngnVal.toLocaleString('en-NG', { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  )
}

export const LivePriceTicker: React.FC = () => {
  const [coins, setCoins]     = useState<CoinPrice[]>([])
  const [ngnRate, setNgnRate] = useState(NGN_RATE)
  const [loading, setLoading] = useState(true)
  const tickerRef             = useRef<HTMLDivElement>(null)
  const animRef               = useRef<number>(0)
  const posRef                = useRef(0)

  const fetchPrices = async () => {
    try {
      const res = await priceApi.getAll()
      const list = Object.entries(res.prices).map(([symbol, data]) => ({
        symbol,
        usd: data.price,
      }))
      setCoins(list)

      // Get NGN rate
      try {
        const rateRes = await priceApi.convert('USDC', 'NGN')
        setNgnRate(rateRes.rate || NGN_RATE)
      } catch { /* use fallback */ }

      setLoading(false)
    } catch { /* silently fail */ }
  }

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll animation
  useEffect(() => {
    if (loading || !tickerRef.current) return
    const el = tickerRef.current

    const scroll = () => {
      posRef.current += 0.5
      if (posRef.current >= el.scrollWidth / 2) posRef.current = 0
      el.scrollLeft = posRef.current
      animRef.current = requestAnimationFrame(scroll)
    }

    animRef.current = requestAnimationFrame(scroll)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [loading, coins])

  if (loading) {
    return (
      <div className="w-full h-[52px] rounded-[12px] animate-pulse"
        style={{ background: '#EEF3FB' }} />
    )
  }

  const doubled = [...coins, ...coins]  // duplicate for seamless loop

  return (
    <div className="w-full overflow-hidden rounded-[14px] relative"
      style={{ background: '#F8FAFD', border: '1.5px solid #DDE6F2' }}>
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #F8FAFD, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #F8FAFD, transparent)' }} />

      <div
        ref={tickerRef}
        className="flex items-center gap-3 px-4 py-2 overflow-hidden"
        style={{ scrollbarWidth: 'none', whiteSpace: 'nowrap' }}
        onMouseEnter={() => { if (animRef.current) cancelAnimationFrame(animRef.current) }}
        onMouseLeave={() => {
          const el = tickerRef.current
          if (!el) return
          const scroll = () => {
            posRef.current += 0.5
            if (posRef.current >= el.scrollWidth / 2) posRef.current = 0
            el.scrollLeft = posRef.current
            animRef.current = requestAnimationFrame(scroll)
          }
          animRef.current = requestAnimationFrame(scroll)
        }}
      >
        {doubled.map((coin, i) => (
          <CoinChip key={`${coin.symbol}-${i}`} coin={coin} ngn={ngnRate} />
        ))}
      </div>
    </div>
  )
}
