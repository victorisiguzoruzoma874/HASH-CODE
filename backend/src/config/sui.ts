// Sui client configuration
// Uses @mysten/sui package (v1+)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const suiSdk = require('@mysten/sui')

type SuiClientType = InstanceType<typeof suiSdk.SuiClient>

// ── Network ──────────────────────────────────────────────────
type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet'

function resolveNetwork(): SuiNetwork {
  const n = process.env.SUI_NETWORK ?? 'testnet'
  const valid: SuiNetwork[] = ['mainnet', 'testnet', 'devnet', 'localnet']
  return valid.includes(n as SuiNetwork) ? (n as SuiNetwork) : 'testnet'
}

function getNodeUrl(network: SuiNetwork): string {
  const urls: Record<SuiNetwork, string> = {
    mainnet:  'https://fullnode.mainnet.sui.io:443',
    testnet:  'https://fullnode.testnet.sui.io:443',
    devnet:   'https://fullnode.devnet.sui.io:443',
    localnet: 'http://127.0.0.1:9000',
  }
  return process.env.SUI_RPC_URL ?? urls[network]
}

// ── Sui client ───────────────────────────────────────────────
const network = resolveNetwork()
export const suiClient: SuiClientType = new suiSdk.SuiClient({ url: getNodeUrl(network) })

// ── Backend keypair ──────────────────────────────────────────
export function loadBackendKeypair() {
  const key = process.env.SUI_BACKEND_PRIVATE_KEY
  if (!key) {
    // Return null in dev if key not set — services will skip on-chain calls
    return null
  }
  try {
    const { Ed25519Keypair } = suiSdk
    // Key can be bech32 (suiprivkey1...) or raw hex
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
