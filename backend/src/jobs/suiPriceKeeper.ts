import { PriceOracleService } from '../services/oracle/PriceOracleService'
import { SuiTransactionService } from '../services/sui/SuiTransactionService'
import { logger } from '../utils/logger'

/**
 * SuiPriceKeeperJob
 * ─────────────────
 * Pushes live exchange rates onto the Sui RateStore every 30 seconds.
 * Fetches from Pyth/CoinGecko via PriceOracleService, then calls
 * quote_manager::update_rates() on-chain.
 *
 * This keeps the on-chain rates fresh so quote verification
 * in deposit_and_lock doesn't revert with E_STALE_RATE.
 */
export class SuiPriceKeeperJob {
  private readonly oracle  = new PriceOracleService()
  private readonly txSvc   = new SuiTransactionService()
  private intervalId: ReturnType<typeof setInterval> | null = null
  private readonly INTERVAL_MS = 30_000

  async start(): Promise<void> {
    logger.info('[SuiPriceKeeper] Starting — pushing rates every 30s')
    await this.push()
    this.intervalId = setInterval(() => this.push(), this.INTERVAL_MS)
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    logger.info('[SuiPriceKeeper] Stopped')
  }

  private async push(): Promise<void> {
    try {
      // Fetch all prices in parallel
      const [ethUsd, usdcUsd, usdtUsd] = await Promise.all([
        this.oracle.getUSDPrice('ETH'),
        this.oracle.getUSDPrice('USDC'),
        this.oracle.getUSDPrice('USDT'),
      ])

      // Fetch FX rates for all supported currencies
      const [ngnRate, ghsRate, kesRate, xofRate, xafRate] = await Promise.all([
        this.oracle.getRate('USD', 'NGN'),
        this.oracle.getRate('USD', 'GHS'),
        this.oracle.getRate('USD', 'KES'),
        this.oracle.getRate('USD', 'XOF'),
        this.oracle.getRate('USD', 'XAF'),
      ])

      // Compute cross rates: 1 USDC → local currency
      const rates = {
        usdc_ngn: usdcUsd * ngnRate,
        usdc_ghs: usdcUsd * ghsRate,
        usdc_kes: usdcUsd * kesRate,
        usdc_xof: usdcUsd * xofRate,
        usdc_xaf: usdcUsd * xafRate,
        eth_ngn:  ethUsd  * ngnRate,
        eth_ghs:  ethUsd  * ghsRate,
        eth_kes:  ethUsd  * kesRate,
        usdt_ngn: usdtUsd * ngnRate,
        usdt_ghs: usdtUsd * ghsRate,
      }

      await this.txSvc.updateRates(rates)

      logger.debug(
        `[SuiPriceKeeper] Rates pushed — ETH/NGN=₦${rates.eth_ngn.toFixed(0)} USDC/NGN=₦${rates.usdc_ngn.toFixed(2)}`
      )
    } catch (err) {
      logger.error('[SuiPriceKeeper] Failed to push rates', err)
    }
  }
}
