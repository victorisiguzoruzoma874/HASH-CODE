import { prisma } from '../config/database'
import { aptosClient, MODULE_ADDRESS } from '../config/aptos'
import { logger } from '../utils/logger'

/**
 * ReconciliationJob
 * ─────────────────
 * Runs daily (or on-demand) to verify that the on-chain escrow vault
 * balance matches the sum of PENDING orders in the database.
 *
 * Discrepancies indicate either:
 *   - A missed event (backend was down)
 *   - A double-payout bug
 *   - An on-chain exploit
 *
 * On discrepancy: logs alert + creates ReconciliationLog entry.
 * In production: also sends PagerDuty / Slack alert.
 */
export class ReconciliationJob {
  async run(): Promise<void> {
    logger.info('[Reconciliation] Starting daily reconciliation run')

    try {
      // 1. Get on-chain vault balance
      const onChainBalance = await this.getOnChainBalance()

      // 2. Sum all PENDING orders in DB
      const dbResult = await prisma.escrowOrder.aggregate({
        where:  { status: 'PENDING_PAYOUT' },
        _sum:   { ngnAmount: true },
      })
      const dbBalance = dbResult._sum.ngnAmount ?? 0

      // 3. Compare (allow 0.01% tolerance for rounding)
      const discrepancy = Math.abs(onChainBalance - dbBalance)
      const tolerance   = onChainBalance * 0.0001
      const status      = discrepancy <= tolerance ? 'OK' : 'DISCREPANCY'

      // 4. Log result
      await prisma.reconciliationLog.create({
        data: {
          onChainBalance,
          dbBalance,
          discrepancy,
          status,
          notes: status === 'DISCREPANCY'
            ? `⚠️ Discrepancy of ${discrepancy.toFixed(2)} detected. Manual review required.`
            : 'All balances match.',
        },
      })

      if (status === 'DISCREPANCY') {
        logger.error(`[Reconciliation] DISCREPANCY DETECTED — on-chain: ${onChainBalance}, DB: ${dbBalance}, diff: ${discrepancy}`)
        await this.sendAlert(onChainBalance, dbBalance, discrepancy)
      } else {
        logger.info(`[Reconciliation] ✓ Balances match — ${onChainBalance}`)
      }

      // 5. Check for stuck orders (PENDING > 1 hour)
      await this.checkStuckOrders()

    } catch (err) {
      logger.error('[Reconciliation] Job failed', err)
    }
  }

  private async getOnChainBalance(): Promise<number> {
    try {
      const result = await aptosClient.view({
        payload: {
          function:      `${MODULE_ADDRESS}::escrow::vault_balance` as `${string}::${string}::${string}`,
          typeArguments: [`${MODULE_ADDRESS}::coins::USDC`] as [`${string}::${string}::${string}`],
          functionArguments: [],
        },
      })
      // Convert from u64 (6 decimals) to float
      return parseInt(result[0] as string) / 1_000_000
    } catch (err) {
      logger.warn('[Reconciliation] Could not fetch on-chain balance', err)
      return 0
    }
  }

  private async checkStuckOrders(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const stuck = await prisma.escrowOrder.findMany({
      where: {
        status:    'PENDING_PAYOUT',
        createdAt: { lt: oneHourAgo },
      },
    })

    if (stuck.length > 0) {
      logger.warn(`[Reconciliation] ${stuck.length} stuck orders found (>1h pending)`)
      for (const order of stuck) {
        logger.warn(`  - Order ${order.id} stuck since ${order.createdAt.toISOString()}`)
      }
    }
  }

  private async sendAlert(onChain: number, db: number, diff: number): Promise<void> {
    // In production: integrate PagerDuty, Slack, or email
    logger.error(`🚨 HASHPAY RECONCILIATION ALERT
      On-chain balance : ${onChain}
      DB balance       : ${db}
      Discrepancy      : ${diff}
      Action required  : Manual review of escrow_orders table
    `)
  }
}

// ── Standalone runner ────────────────────────────────────────
// Run with: npx tsx src/jobs/reconciliation.ts
if (require.main === module) {
  const job = new ReconciliationJob()
  job.run().then(() => process.exit(0)).catch(() => process.exit(1))
}
