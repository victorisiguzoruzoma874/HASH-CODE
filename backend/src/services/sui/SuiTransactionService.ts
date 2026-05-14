import { suiClient, backendKeypair, SUI_CONFIG, SUI_FUNCTIONS } from '../../config/sui'
import { logger } from '../../utils/logger'

/**
 * SuiTransactionService
 * ─────────────────────
 * Builds, signs, and submits Sui transactions for:
 *   - mark_paid      (after successful fiat payout)
 *   - admin_refund   (after all retries exhausted)
 *   - update_rates   (price keeper job)
 */
export class SuiTransactionService {

  private get sdk() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@mysten/sui')
  }

  // ── mark_paid ──────────────────────────────────────────────

  async markPaid(
    recordId:  string,
    provider:  string,
    payoutRef: string,
  ): Promise<string> {
    if (!backendKeypair) {
      logger.warn('[SuiTxSvc] No backend keypair — skipping mark_paid (dev mode)')
      return 'dev-skip'
    }
    if (!SUI_CONFIG.packageId) {
      logger.warn('[SuiTxSvc] No package ID — skipping mark_paid')
      return 'dev-skip'
    }

    logger.info(`[SuiTxSvc] mark_paid — record=${recordId} provider=${provider}`)

    const { Transaction } = this.sdk
    const tx = new Transaction()

    tx.moveCall({
      target: SUI_FUNCTIONS.markPaid as `${string}::${string}::${string}`,
      arguments: [
        tx.object(SUI_CONFIG.backendCapId),
        tx.object(recordId),
        tx.pure.vector('u8', Array.from(Buffer.from(provider))),
        tx.pure.vector('u8', Array.from(Buffer.from(payoutRef))),
      ],
    })

    return this.signAndExecute(tx, 'mark_paid')
  }

  // ── admin_refund ───────────────────────────────────────────

  async adminRefund(
    recordId:     string,
    coinType:     string,
    coinObjectId: string,
    reason:       string,
  ): Promise<string> {
    if (!backendKeypair || !SUI_CONFIG.packageId) {
      logger.warn('[SuiTxSvc] Skipping admin_refund (dev mode)')
      return 'dev-skip'
    }

    logger.info(`[SuiTxSvc] admin_refund — record=${recordId} reason=${reason}`)

    const { Transaction } = this.sdk
    const tx = new Transaction()

    tx.moveCall({
      target: SUI_FUNCTIONS.adminRefund as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      arguments: [
        tx.object(SUI_CONFIG.treasuryCapId),
        tx.object(recordId),
        tx.object(coinObjectId),
        tx.pure.vector('u8', Array.from(Buffer.from(reason))),
      ],
    })

    return this.signAndExecute(tx, 'admin_refund')
  }

  // ── update_rates ───────────────────────────────────────────

  async updateRates(rates: {
    usdc_ngn: number; usdc_ghs: number; usdc_kes: number
    usdc_xof: number; usdc_xaf: number
    eth_ngn:  number; eth_ghs:  number; eth_kes:  number
    usdt_ngn: number; usdt_ghs: number
  }): Promise<string> {
    if (!backendKeypair || !SUI_CONFIG.packageId) {
      logger.debug('[SuiTxSvc] Skipping update_rates (dev mode)')
      return 'dev-skip'
    }

    const { Transaction } = this.sdk
    const tx = new Transaction()
    const toU64 = (n: number) => Math.round(n * 1_000_000)

    tx.moveCall({
      target: SUI_FUNCTIONS.updateRates as `${string}::${string}::${string}`,
      arguments: [
        tx.object(SUI_CONFIG.treasuryCapId),
        tx.object(SUI_CONFIG.rateStoreId),
        tx.pure.u64(toU64(rates.usdc_ngn)),
        tx.pure.u64(toU64(rates.usdc_ghs)),
        tx.pure.u64(toU64(rates.usdc_kes)),
        tx.pure.u64(toU64(rates.usdc_xof)),
        tx.pure.u64(toU64(rates.usdc_xaf)),
        tx.pure.u64(toU64(rates.eth_ngn)),
        tx.pure.u64(toU64(rates.eth_ghs)),
        tx.pure.u64(toU64(rates.eth_kes)),
        tx.pure.u64(toU64(rates.usdt_ngn)),
        tx.pure.u64(toU64(rates.usdt_ghs)),
      ],
    })

    return this.signAndExecute(tx, 'update_rates')
  }

  // ── Internal ───────────────────────────────────────────────

  private async signAndExecute(tx: unknown, label: string): Promise<string> {
    const txObj = tx as any
    txObj.setSender(backendKeypair!.getPublicKey().toSuiAddress())
    txObj.setGasBudget(10_000_000)

    const { bytes, signature } = await txObj.sign({
      client: suiClient,
      signer: backendKeypair!,
    })

    const result = await suiClient.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      options: { showEffects: true },
    })

    const status = (result as any).effects?.status?.status
    if (status !== 'success') {
      const err = (result as any).effects?.status?.error ?? 'Unknown error'
      logger.error(`[SuiTxSvc] ${label} failed: ${err}`)
      throw new Error(`Sui tx ${label} failed: ${err}`)
    }

    const digest = (result as any).digest as string
    logger.info(`[SuiTxSvc] ✓ ${label} — digest=${digest}`)
    return digest
  }
}
