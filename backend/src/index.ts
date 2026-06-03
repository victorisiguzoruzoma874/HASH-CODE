// Capture synchronous import errors before logger is available
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message)
  console.error(err.stack)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
  process.exit(1)
})

import 'dotenv/config'
import app from './app'
import { logger } from './utils/logger'
import { connectDatabase } from './config/database'
import { connectRedis } from './config/redis'

import { EscrowListener }     from './services/escrow/EscrowListener'
import { PriceOracleService }  from './services/oracle/PriceOracleService'
import { SuiEscrowListener }  from './services/sui/SuiEscrowListener'
import { SuiPriceKeeperJob }  from './jobs/suiPriceKeeper'
import { EvmEscrowListener }  from './services/evm/EvmEscrowListener'

const PORT = parseInt(process.env.PORT ?? '4000', 10)

async function bootstrap() {
  // ── Core infrastructure (required) ──────────────────────────
  await connectDatabase()
  logger.info('✓ Database connected')

  await connectRedis()
  logger.info('✓ Redis connected')

  // ── Optional blockchain services (skip if config is missing) ─
  try {
    const priceOracle = new PriceOracleService()
    await priceOracle.start()
    logger.info('✓ Price oracle started')
  } catch (e: any) {
    logger.warn(`⚠ Price oracle skipped: ${e.message}`)
  }

  try {
    if (process.env.SUI_PACKAGE_ID) {
      const suiListener = new SuiEscrowListener()
      await suiListener.start()
      logger.info('✓ Sui escrow listener started')
    } else {
      logger.warn('⚠ Sui escrow listener skipped: SUI_PACKAGE_ID not set')
    }
  } catch (e: any) {
    logger.warn(`⚠ Sui escrow listener skipped: ${e.message}`)
  }

  try {
    if (process.env.SUI_PACKAGE_ID) {
      const suiPriceKeeper = new SuiPriceKeeperJob()
      await suiPriceKeeper.start()
      logger.info('✓ Sui price keeper started')
    }
  } catch (e: any) {
    logger.warn(`⚠ Sui price keeper skipped: ${e.message}`)
  }

  try {
    if (process.env.APTOS_NODE_URL && process.env.HASHPAY_MODULE_ADDRESS) {
      const aptosListener = new EscrowListener()
      await aptosListener.start()
      logger.info('✓ Aptos escrow listener started (legacy)')
    } else {
      logger.warn('⚠ Aptos listener skipped: APTOS_NODE_URL not set')
    }
  } catch (e: any) {
    logger.warn(`⚠ Aptos listener skipped: ${e.message}`)
  }

  try {
    if (process.env.ETH_RPC_URL || process.env.INFURA_KEY) {
      const evmListener = new EvmEscrowListener()
      await evmListener.start()
      logger.info('✓ EVM escrow listener started')
    } else {
      logger.warn('⚠ EVM listener skipped: ETH_RPC_URL not set')
    }
  } catch (e: any) {
    logger.warn(`⚠ EVM listener skipped: ${e.message}`)
  }

  // ── HTTP server (always starts) ─────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`✓ HashPay API listening on port ${PORT}`)
    logger.info(`  Environment: ${process.env.NODE_ENV}`)
  })

  process.on('SIGTERM', () => { logger.info('SIGTERM received — shutting down'); process.exit(0) })
  process.on('SIGINT',  () => { logger.info('SIGINT received — shutting down');  process.exit(0) })
}

bootstrap().catch(err => {
  console.error('Fatal bootstrap error:', err)
  process.exit(1)
})
