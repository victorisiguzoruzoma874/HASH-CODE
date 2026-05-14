import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'
import { aptosClient, MODULE_ADDRESS } from '../../config/aptos'
import { logger } from '../../utils/logger'

/**
 * RefundService
 * ─────────────
 * Calls hashpay::escrow::refund() on-chain using the treasury signer.
 * Only the @hashpay admin account can call this function (enforced in Move).
 */
export class RefundService {
  private readonly treasury: Account

  constructor() {
    const privateKey = process.env.TREASURY_PRIVATE_KEY
    if (!privateKey) throw new Error('TREASURY_PRIVATE_KEY not set')

    this.treasury = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(privateKey),
    })
  }

  async execute(userAddress: string, amount: string, asset: string): Promise<string> {
    logger.info(`[RefundService] Refunding ${amount} ${asset} to ${userAddress}`)

    try {
      const txn = await aptosClient.transaction.build.simple({
        sender: this.treasury.accountAddress,
        data: {
          function:      `${MODULE_ADDRESS}::escrow::refund`,
          typeArguments: [`${MODULE_ADDRESS}::coins::${asset}`],
          functionArguments: [userAddress, amount],
        },
      })

      const signed    = await aptosClient.transaction.sign({ signer: this.treasury, transaction: txn })
      const submitted = await aptosClient.transaction.submit.simple({ transaction: txn, senderAuthenticator: signed })
      const result    = await aptosClient.waitForTransaction({ transactionHash: submitted.hash })

      logger.info(`[RefundService] Refund tx: ${result.hash}`)
      return result.hash

    } catch (err) {
      logger.error('[RefundService] Refund failed', err)
      throw err
    }
  }
}
