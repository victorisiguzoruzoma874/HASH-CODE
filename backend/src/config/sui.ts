// Sui client configuration — uses sub-path imports to avoid ESM/CJS incompatibility
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Ed25519Keypair }            from '@mysten/sui/keypairs/ed25519'

// ── Network ──────────────────────────────────────────────────
type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet'

function resolveNetwork(): SuiNetwork {
  const n = process.env.SUI_NETWORK ?? 'testnet'
  const valid: SuiNetwork[] = ['mainnet', 'testnet', 'devnet', 'localnet']
  return valid.includes(n as SuiNetwork) ? (n as SuiNetwork) : 'testnet'
}

function getNodeUrl(network: SuiNetwork): string {
  if (process.env.SUI_RPC_URL) return process.env.SUI_RPC_URL
  return getFullnodeUrl(network)
}

// ── Sui client ───────────────────────────────────────────────
const network = resolveNetwork()
export const suiClient = new SuiClient({ url: getNodeUrl(network) })

// ── Backend keypair ──────────────────────────────────────────
export function loadBackendKeypair(): Ed25519Keypair | null {
  const key = process.env.SUI_BACKEND_PRIVATE_KEY
  if (!key) return null
  try {
    if (key.startsWith('suiprivkey')) {
      return Ed25519Keypair.fromSecretKey(key)
    }
    const bytes = Buffer.from(key.replace('0x', ''), 'hex')
    return Ed25519Keypair.fromSecretKey(bytes)
  } catch (err) {
    console.warn('[SuiConfig] Could not load backend keypair:', err)
    return null
  }
}

export const backendKeypair = loadBackendKeypair()

// ── Contract addresses ───────────────────────────────────────
export const SUI_CONFIG = {
  packageId:       process.env.SUI_PACKAGE_ID       ?? '',
  treasuryAddress: process.env.SUI_TREASURY_ADDRESS ?? '',
  backendAddress:  process.env.SUI_BACKEND_ADDRESS  ?? '',
  backendCapId:    process.env.SUI_BACKEND_CAP_ID   ?? '',
  treasuryCapId:   process.env.SUI_TREASURY_CAP_ID  ?? '',
  rateStoreId:     process.env.SUI_RATE_STORE_ID    ?? '',
  network,
} as const

// ── Event type strings ───────────────────────────────────────
export const SUI_EVENTS = {
  depositEvent: `${SUI_CONFIG.packageId}::escrow::DepositEvent`,
  paidEvent:    `${SUI_CONFIG.packageId}::escrow::PaidEvent`,
  refundEvent:  `${SUI_CONFIG.packageId}::escrow::RefundEvent`,
} as const

// ── Move function identifiers ────────────────────────────────
export const SUI_FUNCTIONS = {
  depositAndLock: `${SUI_CONFIG.packageId}::escrow::deposit_and_lock`,
  markPaid:       `${SUI_CONFIG.packageId}::escrow::mark_paid`,
  adminRefund:    `${SUI_CONFIG.packageId}::escrow::admin_refund`,
  selfRefund:     `${SUI_CONFIG.packageId}::escrow::self_refund`,
  updateRates:    `${SUI_CONFIG.packageId}::quote_manager::update_rates`,
} as const
