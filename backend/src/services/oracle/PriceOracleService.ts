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

    // 1. Try Pyth
    try {
      const price = await this.fetchFromPyth(asset)
      await cacheSet(cacheKey, price, PRICE_CACHE_TTL)
      return price
    } catch {
      logger.warn(`[PriceOracle] Pyth failed for ${asset}, trying CoinGecko`)
    }

    // 2. Try CoinGecko
    try {
      const price = await this.fetchFromCoinGecko(asset)
      await cacheSet(cacheKey, price, PRICE_CACHE_TTL)
      return price
    } catch {
      logger.warn(`[PriceOracle] CoinGecko failed for ${asset}, trying CoinCap`)
    }

    // 3. Try CoinCap
    const price = await this.fetchFromCoinCap(asset)
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
    const id = COINGECKO_IDS[asset.toUpperCase()]
    if (!id) throw new Error(`No CoinGecko ID for ${asset}`)

    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: { ids: id, vs_currencies: 'usd' },
        headers: process.env.COINGECKO_API_KEY
          ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
          : {},
        timeout: 8000,
      }
    )

    const price = res.data[id]?.usd
    if (!price) throw new Error(`CoinGecko returned no price for ${asset}`)
    return price
  }

  // CoinCap as third-level fallback (no API key, generous rate limit)
  private async fetchFromCoinCap(asset: string): Promise<number> {
    const idMap: Record<string, string> = {
      ETH: 'ethereum', BTC: 'bitcoin', SUI: 'sui', APT: 'aptos',
      USDC: 'usd-coin', USDT: 'tether', SOL: 'solana', BNB: 'binance-coin',
      MATIC: 'polygon', AVAX: 'avalanche', LINK: 'chainlink', UNI: 'uniswap',
      AAVE: 'aave', ARB: 'arbitrum', DOGE: 'dogecoin', ADA: 'cardano',
      DOT: 'polkadot', OP: 'optimism',
    }
    const id = idMap[asset.toUpperCase()]
    if (!id) throw new Error(`No CoinCap ID for ${asset}`)

    const res = await axios.get(`https://api.coincap.io/v2/assets/${id}`, { timeout: 8000 })
    const price = parseFloat(res.data?.data?.priceUsd ?? '0')
    if (!price) throw new Error(`CoinCap returned no price for ${asset}`)
    return price
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
    const assets = [
      'ETH', 'BTC', 'SUI', 'APT', 'USDC', 'USDT',
      'SOL', 'BNB', 'MATIC', 'AVAX', 'LINK', 'UNI',
      'AAVE', 'ARB', 'DOGE', 'ADA', 'DOT', 'OP', 'DAI',
    ]
    await Promise.allSettled(assets.map(a => this.getUSDPrice(a)))
  }

  /** Returns a snapshot of all cached prices */
  async getAllPrices(): Promise<Record<string, PriceData>> {
    const assets = [
      'ETH', 'BTC', 'SUI', 'APT', 'USDC', 'USDT',
      'SOL', 'BNB', 'MATIC', 'AVAX', 'LINK', 'UNI',
      'AAVE', 'ARB', 'DOGE', 'ADA', 'DOT', 'OP', 'DAI',
    ]
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
