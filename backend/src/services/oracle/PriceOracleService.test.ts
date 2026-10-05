import { beforeEach, describe, expect, it, vi } from 'vitest'
const { http, cache } = vi.hoisted(() => ({ http: { get: vi.fn() }, cache: { get: vi.fn(), set: vi.fn() } }))
vi.mock('axios', () => ({ default: http }))
vi.mock('../../config/redis', () => ({ cacheGet: cache.get, cacheSet: cache.set }))
vi.mock('../../utils/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }))
import { PriceOracleService } from './PriceOracleService'
const feed = 'b7a8eba68a997cd0210c2e1e4ee811ad2d174b3611c22d9ebf16f4cb7e9ba850'
beforeEach(() => { vi.resetAllMocks(); cache.get.mockResolvedValue(null) })
describe('Stellar pricing', () => {
  it('tracks the stellar provider ID and exposes XLM in the price snapshot', async () => {
    http.get.mockImplementation(async (url, config) => {
      if (url.includes('coingecko')) { expect(config.params.ids.split(',')).toContain('stellar'); return { data: { stellar: { usd: 0.25 } } } }
      return { data: { parsed: [] } }
    })
    const oracle = new PriceOracleService()
    expect((await oracle.getAllPrices()).XLM.price).toBe(0.25)
    expect(await oracle.getUSDPrice('xlm')).toBe(0.25)
  })
  it('uses the verified XLM Pyth feed if CoinGecko fails', async () => {
    http.get.mockImplementation(async (url, config) => {
      if (url.includes('coingecko')) throw new Error('Rate limited')
      expect(config.params.ids).toContain(`0x${feed}`)
      return { data: { parsed: [{ id: feed, price: { price: '25000000', expo: -8 } }] } }
    })
    expect(await new PriceOracleService().getUSDPrice('XLM')).toBe(0.25)
  })
  it('converts XLM to naira using the existing FX rate', async () => {
    http.get.mockImplementation(async url => {
      if (url.includes('coingecko')) return { data: { stellar: { usd: 0.25 } } }
      if (url.includes('open.er-api')) return { data: { rates: { NGN: 1500 } } }
      return { data: { parsed: [] } }
    })
    expect(await new PriceOracleService().getRate('XLM', 'NGN')).toBe(375)
  })
})
