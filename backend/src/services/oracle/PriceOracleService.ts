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
  'ETH/USD':  '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BTC/USD':  '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'APT/USD':  '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
}

/**
 * PriceOracleService
 * ──────────────────
 * Fetches live crypto prices from Pyth Network (primary) with
 * CoinGecko as fallback. Results are cached in Redis for 30s.
 *
 * Also provides NGN conversion rates via a dedicated FX endpoint.
 */
export class PriceOracleService {
  private refreshInterval: ReturnType<typeof setInterval> | null = null

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

  /** Get price of asset in target currency (e.g. ETH → NGN) */
  async getRate(asset: string, target: string): Promise<number> {
    const cacheKey = `price:${asset}:${target}`
    const cached   = await cacheGet<number>(cacheKey)
    if (cached) return cached

    const usdPrice = await this.getUSDPrice(asset)
    if (target === 'USD') return usdPrice

    const fxRate = await this.getFXRate('USD', target)
    const rate   = usdPrice * fxRate

    await cacheSet(cacheKey, rate, PRICE_CACHE_TTL)
    return rate
  }

  async getUSDPrice(asset: string): Promise<number> {
    const cacheKey = `price:${asset}:USD`
    const cached   = await cacheGet<number>(cacheKey)
    if (cached) return cached

    // Try Pyth first
    try {
      const price = await this.fetchFromPyth(asset)
      await cacheSet(cacheKey, price, PRICE_CACHE_TTL)
      return price
    } catch {
      logger.warn(`[PriceOracle] Pyth failed for ${asset}, falling back to CoinGecko`)
    }

    // Fallback: CoinGecko
    const price = await this.fetchFromCoinGecko(asset)
    await cacheSet(cacheKey, price, PRICE_CACHE_TTL)
    return price
  }

  private async fetchFromPyth(asset: string): Promise<number> {
    const feedId = PYTH_FEEDS[`${asset.toUpperCase()}/USD`]
    if (!feedId) throw new Error(`No Pyth feed for ${asset}`)

    const res = await axios.get(
      `${process.env.PYTH_ENDPOINT ?? 'https://hermes.pyth.network'}/v2/updates/price/latest`,
      { params: { ids: [feedId] } }
    )

    const parsed = res.data.parsed?.[0]
    if (!parsed) throw new Error('No price data from Pyth')

    const price = parsed.price.price * Math.pow(10, parsed.price.expo)
    return Math.abs(price)
  }

  private async fetchFromCoinGecko(asset: string): Promise<number> {
    const idMap: Record<string, string> = {
      ETH: 'ethereum', BTC: 'bitcoin', APT: 'aptos',
      USDC: 'usd-coin', USDT: 'tether',
    }
    const id = idMap[asset.toUpperCase()]
    if (!id) throw new Error(`No CoinGecko ID for ${asset}`)

    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: { ids: id, vs_currencies: 'usd' },
        headers: process.env.COINGECKO_API_KEY
          ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
          : {},
      }
    )

    return res.data[id]?.usd ?? 0
  }

  private async getFXRate(from: string, to: string): Promise<number> {
    const cacheKey = `fx:${from}:${to}`
    const cached   = await cacheGet<number>(cacheKey)
    if (cached) return cached

    // Use exchangerate-api or similar
    const res = await axios.get(
      `https://open.er-api.com/v6/latest/${from}`
    )
    const rate = res.data.rates?.[to] ?? 1
    await cacheSet(cacheKey, rate, 300)  // cache FX for 5 min
    return rate
  }

  private async refreshAll(): Promise<void> {
    const assets = ['ETH', 'BTC', 'APT', 'USDC', 'USDT']
    await Promise.allSettled(assets.map(a => this.getUSDPrice(a)))
  }

  /** Returns a snapshot of all cached prices */
  async getAllPrices(): Promise<Record<string, PriceData>> {
    const assets = ['ETH', 'BTC', 'APT', 'USDC', 'USDT']
    const result: Record<string, PriceData> = {}

    for (const asset of assets) {
      try {
        const price = await this.getUSDPrice(asset)
        result[asset] = { price, timestamp: Date.now(), source: 'cache' }
      } catch {
        // skip
      }
    }
    return result
  }
}
