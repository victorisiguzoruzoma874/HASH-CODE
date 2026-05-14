import 'dotenv/config'
import app from './app'
import { logger } from './utils/logger'
import { connectDatabase } from './config/database'
import { connectRedis } from './config/redis'

// ── Aptos services (legacy — keep for existing orders) ────────
import { EscrowListener }    from './services/escrow/EscrowListener'
import { PriceOracleService } from './services/oracle/PriceOracleService'

// ── Sui services (primary chain) ──────────────────────────────
import { SuiEscrowListener } from './services/sui/SuiEscrowListener'
import { SuiPriceKeeperJob } from './jobs/suiPriceKeeper'

// ── EVM services ──────────────────────────────────────────────
import { EvmEscrowListener } from './services/evm/EvmEscrowListener'

const PORT = parseInt(process.env.PORT ?? '4000', 10)

async function bootstrap() {
  try {
    // ── Infrastructure ──────────────────────────────────────
    await connectDatabase()
    logger.info('✓ Database connected')

    await connectRedis()
    logger.info('✓ Redis connected')

    // ── Price oracle (shared by both chains) ────────────────
    const priceOracle = new PriceOracleService()
    await priceOracle.start()
    logger.info('✓ Price oracle started (Pyth → CoinGecko fallback)')

    // ── Sui services ────────────────────────────────────────
    const suiListener = new SuiEscrowListener()
    await suiListener.start()
    logger.info('✓ Sui escrow listener started (WebSocket subscription)')

    const suiPriceKeeper = new SuiPriceKeeperJob()
    await suiPriceKeeper.start()
    logger.info('✓ Sui price keeper started (pushing rates every 30s)')

    // ── Aptos legacy listener ───────────────────────────────
    // Keep running to process any remaining Aptos orders
    if (process.env.APTOS_NODE_URL && process.env.HASHPAY_MODULE_ADDRESS) {
      const aptosListener = new EscrowListener()
      await aptosListener.start()
      logger.info('✓ Aptos escrow listener started (legacy polling)')
    }

    // ── EVM listener ────────────────────────────────────────
    const evmListener = new EvmEscrowListener()
    await evmListener.start()
    logger.info('✓ EVM escrow listener started (Ethereum event subscription)')

    // ── HTTP server ─────────────────────────────────────────
    app.listen(PORT, () => {
      logger.info(`✓ HashPay API running on http://localhost:${PORT}`)
      logger.info(`  Environment : ${process.env.NODE_ENV}`)
      logger.info(`  Chain       : Sui (primary) + Aptos (legacy)`)
      logger.info(`  Providers   : Afriex | Opay | Flipeet | Flutterwave | Paystack`)
    })

    // ── Graceful shutdown ───────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`)
      await suiListener.stop()
      await evmListener.stop()
      suiPriceKeeper.stop()
      await priceOracle.stop()
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT',  () => shutdown('SIGINT'))

  } catch (err) {
    logger.error('Failed to bootstrap server', err)
    process.exit(1)
  }
}

bootstrap()
