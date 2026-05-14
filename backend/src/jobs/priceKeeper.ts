import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'
import { aptosClient, MODULE_ADDRESS } from '../config/aptos'
import { PriceOracleService } from '../services/oracle/PriceOracleService'
import { logger } from '../utils/logger'

/**
 * PriceKeeperJob
 * ──────────────
 * Pushes fresh prices from Pyth/CoinGecko onto the Aptos chain
 * by calling oracle_price::update_prices() every 30 seconds.
 *
 * This keeps the on-chain oracle fresh so swap_manager can
 * enforce accurate slippage checks.
 */
export class PriceKeeperJob {
  private readonly oracle   = new PriceOracleService()
  private readonly treasury: Account
  private intervalId: ReturnType<typeof setInterval> | null = null
  private readonly INTERVAL_MS = 30_000

  constructor() {
    const pk = process.env.TREASURY_PRIVATE_KEY
    if (!pk) throw new Error('TREASURY_PRIVATE_KEY not set')
    this.treasury = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(pk) })
  }

  async start(): Promise<void> {
    logger.info('[PriceKeeper] Starting — pushing prices every 30s')
    await this.push()
    this.intervalId = setInterval(() => this.push(), this.INTERVAL_MS)
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    logger.info('[PriceKeeper] Stopped')
  }

  private async push(): Promise<void> {
    try {
      const [eth, btc, apt, usdc] = await Promise.all([
        this.oracle.getUSDPrice('ETH'),
        this.oracle.getUSDPrice('BTC'),
        this.oracle.getUSDPrice('APT'),
        this.oracle.getUSDPrice('USDC'),
      ])
      const ngnRate = await this.oracle.getRate('USD', 'NGN')

      // Convert to u64 with 6 decimal fixed point
      const toU64 = (n: number) => Math.round(n * 1_000_000).toString()

      const txn = await aptosClient.transaction.build.simple({
        sender: this.treasury.accountAddress,
        data: {
          function:          `${MODULE_ADDRESS}::oracle_price::update_prices` as `${string}::${string}::${string}`,
          typeArguments:     [],
          functionArguments: [
            toU64(eth),
            toU64(btc),
            toU64(apt),
            toU64(usdc),
            toU64(ngnRate),
          ],
        },
      })

      const signed    = await aptosClient.transaction.sign({ signer: this.treasury, transaction: txn })
      const submitted = await aptosClient.transaction.submit.simple({ transaction: txn, senderAuthenticator: signed })
      await aptosClient.waitForTransaction({ transactionHash: submitted.hash })

      logger.debug(`[PriceKeeper] Prices updated — ETH=$${eth.toFixed(2)} NGN=₦${ngnRate.toFixed(0)}`)

    } catch (err) {
      logger.error('[PriceKeeper] Failed to push prices', err)
    }
  }
}
