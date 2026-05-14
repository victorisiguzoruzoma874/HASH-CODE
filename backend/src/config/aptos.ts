import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

function resolveNetwork(): Network {
  const n = process.env.APTOS_NETWORK ?? 'mainnet'
  const map: Record<string, Network> = {
    mainnet: Network.MAINNET,
    testnet: Network.TESTNET,
    devnet:  Network.DEVNET,
    local:   Network.LOCAL,
  }
  return map[n] ?? Network.MAINNET
}

export const aptosClient = new Aptos(
  new AptosConfig({
    network:  resolveNetwork(),
    fullnode: process.env.APTOS_NODE_URL,
    indexer:  process.env.APTOS_INDEXER_URL,
  })
)

/** The deployed HashPay module address on Aptos */
export const MODULE_ADDRESS = process.env.HASHPAY_MODULE_ADDRESS ?? ''

/** Full module identifiers */
export const MODULES = {
  escrow:       `${MODULE_ADDRESS}::escrow`,
  swapManager:  `${MODULE_ADDRESS}::swap_manager`,
  oraclePrice:  `${MODULE_ADDRESS}::oracle_price`,
} as const

/** Move event types to subscribe to */
export const EVENT_TYPES = {
  depositReceived: `${MODULE_ADDRESS}::escrow::DepositReceived`,
  refundIssued:    `${MODULE_ADDRESS}::escrow::RefundIssued`,
  swapCompleted:   `${MODULE_ADDRESS}::swap_manager::SwapCompleted`,
} as const
