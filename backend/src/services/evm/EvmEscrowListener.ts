import { ethers } from 'ethers'
import { evmProvider, loadEvmSigner, EVM_CONFIG, ESCROW_ABI } from '../../config/evm'
import { prisma } from '../../config/database'
import { logger } from '../../utils/logger'
import { CurrencyRouter } from '../payout/CurrencyRouter'
import { KycService } from '../kyc/KycService'

interface DepositEventArgs {
  orderId:   string   // bytes32 hex
  user:      string   // address
  token:     string   // ERC-20 address (address(0) = ETH)
  amount:    bigint
  netAmount: bigint
  fee:       bigint
  timestamp: bigint
}

// ERC-20 token address → asset symbol mapping
const TOKEN_SYMBOLS: Record<string, string> = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',  // mainnet USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',  // mainnet USDT
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',  // mainnet WETH
  '0x0000000000000000000000000000000000000000': 'ETH',   // native ETH
}

// Token decimals
const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6, USDT: 6, WETH: 18, ETH: 18,
}

/**
 * EvmEscrowListener
 * ─────────────────
 * Listens to HashPayEscrow.sol DepositReceived events on Ethereum.
 * On each event:
 *   1. Idempotency check (Postgres)
 *   2. KYC verification
 *   3. Route to fiat provider via CurrencyRouter
 *   4. On success → call release() on-chain
 *   5. On failure → enqueue retry, then refund() after max retries
 */
export class EvmEscrowListener {
  private contract:  ethers.Contract | null = null
  private signer:    ethers.Wallet   | null = null
  private running    = false
  private readonly router = new CurrencyRouter()
  private readonly kyc    = new KycService()

  async start(): Promise<void> {
    if (!evmProvider || !EVM_CONFIG.escrowAddress) {
      logger.warn('[EvmEscrowListener] ETH_RPC_URL or HASHPAY_EVM_CONTRACT not set — skipping (dev mode)')
      return
    }

    this.signer   = loadEvmSigner()
    this.contract = new ethers.Contract(
      EVM_CONFIG.escrowAddress,
      ESCROW_ABI,
      this.signer ?? evmProvider,
    )

    this.running = true

    // Subscribe to DepositReceived events
    this.contract.on('DepositReceived', async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog
      const [orderId, user, token, amount, netAmount, fee, timestamp] = args as unknown as [
        string, string, string, bigint, bigint, bigint, bigint, ethers.EventLog
      ]
      await this.handleDeposit({ orderId, user, token, amount, netAmount, fee, timestamp }, event)
    })

    logger.info(`[EvmEscrowListener] ✓ Listening on ${EVM_CONFIG.escrowAddress} (${EVM_CONFIG.network})`)
  }

  async stop(): Promise<void> {
    this.running = false
    if (this.contract) {
      this.contract.removeAllListeners()
    }
    logger.info('[EvmEscrowListener] Stopped')
  }

  private async handleDeposit(
    args:  DepositEventArgs,
    event: ethers.EventLog,
  ): Promise<void> {
    if (!this.running) return

    const orderId = args.orderId  // bytes32 hex string

    // ── 1. Idempotency ──────────────────────────────────────
    const existing = await prisma.escrowOrder.findFirst({
      where: { txHash: event.transactionHash },
    })
    if (existing) {
      logger.debug(`[EvmEscrowListener] Skipping duplicate tx ${event.transactionHash}`)
      return
    }

    const tokenSymbol = TOKEN_SYMBOLS[args.token.toLowerCase()] ?? 'UNKNOWN'
    const decimals    = TOKEN_DECIMALS[tokenSymbol] ?? 18
    const amountRaw   = args.netAmount.toString()

    logger.info(`[EvmEscrowListener] Deposit — user=${args.user} token=${tokenSymbol} amount=${amountRaw} tx=${event.transactionHash}`)

    // ── 2. KYC check ────────────────────────────────────────
    const kycResult = await this.kyc.verify(args.user)
    if (!kycResult.passed) {
      logger.warn(`[EvmEscrowListener] KYC failed for ${args.user}`)
      await this.createOrderRecord(orderId, args, event, 'REFUNDED', 'KYC_FAILED', tokenSymbol)
      await this.executeRefund(orderId, 'KYC_FAILED')
      return
    }

    // ── 3. Look up user bank details ─────────────────────────
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { evmAddress:   args.user.toLowerCase() },
          { aptosAddress: args.user },
          { suiAddress:   args.user },
        ],
      },
    })

    if (!user?.bankAccountNumber || !user?.bankCode) {
      logger.error(`[EvmEscrowListener] No bank details for ${args.user}`)
      await this.createOrderRecord(orderId, args, event, 'REFUNDED', 'NO_BANK_DETAILS', tokenSymbol)
      await this.executeRefund(orderId, 'NO_BANK_DETAILS')
      return
    }

    // ── 4. Create pending order ──────────────────────────────
    const order = await prisma.escrowOrder.create({
      data: {
        aptosEventSeq: null,
        suiOrderId:    null,
        userAddress:   args.user,
        amountRaw,
        asset:         tokenSymbol,
        txHash:        event.transactionHash,
        status:        'PENDING_PAYOUT',
        userId:        user.id,
        currencyOut:   user.preferredCurrency ?? 'NGN',
        chain:         'evm',
        recordId:      orderId,  // store bytes32 orderId as recordId
      },
    })

    // ── 5. Route to fiat provider ────────────────────────────
    try {
      const result = await this.router.payout({
        orderId:       order.id,
        amountRaw,
        asset:         tokenSymbol,
        currencyOut:   user.preferredCurrency ?? 'NGN',
        bankCode:      user.bankCode,
        accountNumber: user.bankAccountNumber,
        accountName:   user.bankAccountName ?? '',
        reference:     `HP-EVM-${orderId.slice(2, 14)}`,
      })

      // ── 6. Release on-chain ──────────────────────────────
      await this.executeRelease(orderId, result.reference)

      await prisma.escrowOrder.update({
        where: { id: order.id },
        data: {
          status:      'COMPLETED',
          payoutRef:   result.reference,
          ngnAmount:   result.localAmount,
          completedAt: new Date(),
        },
      })

      logger.info(`[EvmEscrowListener] ✓ Payout complete — ref=${result.reference} provider=${result.provider}`)

    } catch (err) {
      logger.error(`[EvmEscrowListener] Payout failed for order ${order.id}`, err)

      await prisma.escrowOrder.update({
        where: { id: order.id },
        data:  { status: 'PAYOUT_FAILED', failureReason: String(err) },
      })

      await this.router.enqueueRetry(order.id, orderId)
    }
  }

  // ── On-chain calls ────────────────────────────────────────

  private async executeRelease(orderId: string, payoutRef: string): Promise<void> {
    if (!this.contract || !this.signer) {
      logger.warn('[EvmEscrowListener] No signer — skipping release()')
      return
    }
    try {
      const tx = await (this.contract.connect(this.signer) as ethers.Contract)
        .release(orderId, payoutRef)
      await tx.wait()
      logger.info(`[EvmEscrowListener] release() confirmed — tx=${tx.hash}`)
    } catch (err) {
      logger.error('[EvmEscrowListener] release() failed', err)
    }
  }

  private async executeRefund(orderId: string, reason: string): Promise<void> {
    if (!this.contract || !this.signer) {
      logger.warn('[EvmEscrowListener] No signer — skipping refund()')
      return
    }
    try {
      const tx = await (this.contract.connect(this.signer) as ethers.Contract)
        .refund(orderId, reason)
      await tx.wait()
      logger.info(`[EvmEscrowListener] refund() confirmed — tx=${tx.hash}`)
    } catch (err) {
      logger.error('[EvmEscrowListener] refund() failed', err)
    }
  }

  private async createOrderRecord(
    orderId:     string,
    args:        DepositEventArgs,
    event:       ethers.EventLog,
    status:      string,
    reason:      string,
    tokenSymbol: string,
  ): Promise<void> {
    await prisma.escrowOrder.create({
      data: {
        aptosEventSeq: null,
        suiOrderId:    null,
        userAddress:   args.user,
        amountRaw:     args.netAmount.toString(),
        asset:         tokenSymbol,
        txHash:        event.transactionHash,
        status:        status as any,
        failureReason: reason,
        currencyOut:   'NGN',
        chain:         'evm',
        recordId:      orderId,
      },
    })
  }
}
