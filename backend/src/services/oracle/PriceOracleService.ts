import axios from 'axios'
import { cacheGet, cacheSet } from '../../config/redis'
import { logger } from '../../utils/logger'

interface PriceData {
  price:     number
  timestamp: number
  source:    string
}

const PRICE_CACHE_TTL = 30  // 30 seconds

const PYTH_FEEDS: Record<string, string> = {
  'ETH/USD':   '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BTC/USD':   '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'APT/USD':   '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  'USDC/USD':  '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDT/USD':  '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  'SUI/USD':   '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
  'SOL/USD':   '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BNB/USD':   '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  'AVAX/USD':  '0x93da3352f9f1d105fdfe4971cfa80e9269ef05da4ed5d142a41d8b32c28e0b9',
  'LINK/USD':  '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  'UNI/USD':   '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  'AAVE/USD':  '0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
  'ARB/USD':   '0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5',
  'DOGE/USD':  '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
}

// CoinGecko IDs for fallback
const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum', BTC: 'bitcoin', APT: 'aptos',
  USDC: 'usd-coin', USDT: 'tether', SUI: 'sui',
  SOL: 'solana', BNB: 'binancecoin', MATIC: 'matic-network',
  AVAX: 'avalanche-2', LINK: 'chainlink', UNI: 'uniswap',
  AAVE: 'aave', ARB: 'arbitrum', DOGE: 'dogecoin',
  DAI: 'dai', DOT: 'polkadot', ADA: 'cardano', OP: 'optimism',
  WBTC: 'wrapped-bitcoin', WETH: 'weth',
}

/**
 * PriceOracleService
 * ──────────────────
 * Fetches live crypto prices from Pyth Network (primary) with
 * CoinGecko as fallback. Results are cached in Redis for 30s.
 *
 * Also provides NGN conversion rates via a dedicated FX endpoint.
 */
const TRACKED_ASSETS = [
  'ETH', 'BTC', 'SUI', 'APT', 'USDC', 'USDT',
  'SOL', 'BNB', 'MATIC', 'AVAX', 'LINK', 'UNI',
  'AAVE', 'ARB', 'DOGE', 'ADA', 'DOT', 'OP', 'DAI',
]

// Last known good values are served when every provider fails, so prices never vanish
const STALE_MAX_AGE_MS = 15 * 60 * 1000

export class PriceOracleService {
  private refreshInterval: ReturnType<typeof setInterval> | null = null
  private lastGood  = new Map<string, { price: number; at: number }>()
  private inflight: Promise<void> | null = null
  private fxLastGood = new Map<string, number>()

  async start(): Promise<void> {
    // Pre-warm cache
    await this.refreshAll()
    // Refresh every 30s
    this.refreshInterval = setInterval(() => this.refreshAll(), 30_000)
    logger.info('[PriceOracle] Started — refreshing every 30s')
  }

  async stop(): Promise<void> {
    if (this.refreshInterval) clearInterval(this.refreshInterval)
  }

  // Redis problems must never take prices down
  private async safeGet<T>(key: string): Promise<T | null> {
    try { return await cacheGet<T>(key) } catch { return null }
  }
  private async safeSet(key: string, value: unknown, ttl: number): Promise<void> {
    try { await cacheSet(key, value, ttl) } catch { /* ignore */ }
  }

  /** Get price of asset in target currency (e.g. ETH → NGN) */
  async getRate(asset: string, target: string): Promise<number> {
    const cacheKey = `price:${asset}:${target}`
    const cached   = await this.safeGet<number>(cacheKey)
    if (cached) return cached

    const usdPrice = await this.getUSDPrice(asset)
    if (target === 'USD') return usdPrice

    const fxRate = await this.getFXRate('USD', target)
    const rate   = usdPrice * fxRate

    await this.safeSet(cacheKey, rate, PRICE_CACHE_TTL)
    return rate
  }

  async getUSDPrice(asset: string): Promise<number> {
    const key = asset.toUpperCase()
    const hit = await this.readPrice(key)
    if (hit !== null) return hit

    await this.refreshAll()

    const fresh = await this.readPrice(key)
    if (fresh !== null) return fresh
    throw new Error(`No price available for ${key}`)
  }

  /** Fresh cache first, then last known good (if not too old) */
  private async readPrice(asset: string): Promise<number | null> {
    const cached = await this.safeGet<number>(`price:${asset}:USD`)
    if (cached) return cached
    const stale = this.lastGood.get(asset)
    if (stale && Date.now() - stale.at < STALE_MAX_AGE_MS) return stale.price
    return null
  }

  private async store(prices: Record<string, number>): Promise<void> {
    const now = Date.now()
    await Promise.all(Object.entries(prices).map(([asset, price]) => {
      this.lastGood.set(asset, { price, at: now })
      return this.safeSet(`price:${asset}:USD`, price, PRICE_CACHE_TTL)
    }))
  }

  /** One batched CoinGecko request for every asset (19 separate calls got rate-limited) */
  private async fetchBatchFromCoinGecko(assets: string[]): Promise<Record<string, number>> {
    const ids = assets.map(a => COINGECKO_IDS[a]).filter(Boolean)
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: { ids: ids.join(','), vs_currencies: 'usd' },
        headers: process.env.COINGECKO_API_KEY
          ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
          : {},
        timeout: 8000,
      }
    )
    const out: Record<string, number> = {}
    for (const a of assets) {
      const price = res.data?.[COINGECKO_IDS[a]]?.usd
      if (price) out[a] = price
    }
    return out
  }

  /** One batched Pyth request for every asset that has a feed */
  private async fetchBatchFromPyth(assets: string[]): Promise<Record<string, number>> {
    const feeds = assets
      .filter(a => PYTH_FEEDS[`${a}/USD`])
      .map(a => ({ asset: a, id: PYTH_FEEDS[`${a}/USD`] }))
    if (feeds.length === 0) return {}

    const res = await axios.get(
      `${process.env.PYTH_ENDPOINT ?? 'https://hermes.pyth.network'}/v2/updates/price/latest`,
      { params: { ids: feeds.map(f => f.id) }, timeout: 8000 }
    )
    const out: Record<string, number> = {}
    for (const p of res.data?.parsed ?? []) {
      const feed = feeds.find(f => f.id.replace(/^0x/, '') === p.id)
      if (feed) out[feed.asset] = Math.abs(p.price.price * Math.pow(10, p.price.expo))
    }
    return out
  }

  private async getFXRate(from: string, to: string): Promise<number> {
    const cacheKey = `fx:${from}:${to}`
    const cached   = await this.safeGet<number>(cacheKey)
    if (cached) return cached

    try {
      const res  = await axios.get(`https://open.er-api.com/v6/latest/${from}`, { timeout: 8000 })
      const rate = res.data.rates?.[to]
      if (!rate) throw new Error(`No ${to} rate in FX response`)
      this.fxLastGood.set(`${from}:${to}`, rate)
      await this.safeSet(cacheKey, rate, 300)  // cache FX for 5 min
      return rate
    } catch (err: any) {
      const stale = this.fxLastGood.get(`${from}:${to}`)
      if (stale) {
        logger.warn(`[PriceOracle] FX fetch failed (${err?.message}), serving last known ${from}/${to}`)
        return stale
      }
      throw err
    }
  }

  /** Refreshes every tracked asset in one go; concurrent callers share the same run */
  private refreshAll(): Promise<void> {
    if (this.inflight) return this.inflight
    this.inflight = this.doRefresh().finally(() => { this.inflight = null })
    return this.inflight
  }

  private async doRefresh(): Promise<void> {
    let got: Record<string, number> = {}

    try {
      got = await this.fetchBatchFromCoinGecko(TRACKED_ASSETS)
    } catch (err: any) {
      logger.warn(`[PriceOracle] CoinGecko failed: ${err?.response?.status ?? ''} ${err?.message}`)
    }

    const missing = TRACKED_ASSETS.filter(a => !got[a])
    if (missing.length > 0) {
      try {
        got = { ...(await this.fetchBatchFromPyth(missing)), ...got }
      } catch (err: any) {
        logger.warn(`[PriceOracle] Pyth failed: ${err?.response?.status ?? ''} ${err?.message}`)
      }
    }

    await this.store(got)

    const stillMissing = TRACKED_ASSETS.filter(a => !got[a])
    if (stillMissing.length > 0) {
      logger.warn(`[PriceOracle] No fresh price for: ${stillMissing.join(', ')} (serving last known where available)`)
    }
  }

  /** Returns a snapshot of all cached prices */
  async getAllPrices(): Promise<Record<string, PriceData>> {
    const result: Record<string, PriceData> = {}

    for (const asset of TRACKED_ASSETS) {
      const price = await this.readPrice(asset)
      if (price !== null) result[asset] = { price, timestamp: Date.now(), source: 'cache' }
    }

    // Cold start / everything expired: fetch once, then re-read
    if (Object.keys(result).length < TRACKED_ASSETS.length) {
      await this.refreshAll()
      for (const asset of TRACKED_ASSETS) {
        if (result[asset]) continue
        const price = await this.readPrice(asset)
        if (price !== null) result[asset] = { price, timestamp: Date.now(), source: 'cache' }
      }
    }
    return result
  }
}
