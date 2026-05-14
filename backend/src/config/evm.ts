import { ethers } from 'ethers'

// ── Provider ──────────────────────────────────────────────────
function createProvider(): ethers.JsonRpcProvider | null {
  const url = process.env.ETH_RPC_URL
  if (!url) {
    return null
  }
  return new ethers.JsonRpcProvider(url)
}

export const evmProvider = createProvider()

// ── Backend signer (treasury wallet) ─────────────────────────
export function loadEvmSigner(): ethers.Wallet | null {
  const key = process.env.ETH_PRIVATE_KEY
  if (!key || !evmProvider) return null
  return new ethers.Wallet(key, evmProvider)
}

// ── Contract addresses ────────────────────────────────────────
export const EVM_CONFIG = {
  escrowAddress: process.env.HASHPAY_EVM_CONTRACT ?? '',
  network:       process.env.ETH_NETWORK ?? 'mainnet',
} as const

// ── HashPayEscrow ABI (events + functions we need) ───────────
export const ESCROW_ABI = [
  // Events
  'event DepositReceived(bytes32 indexed orderId, address indexed user, address indexed token, uint256 amount, uint256 netAmount, uint256 fee, uint256 timestamp)',
  'event OrderReleased(bytes32 indexed orderId, address indexed user, string payoutRef, uint256 timestamp)',
  'event OrderRefunded(bytes32 indexed orderId, address indexed user, string reason, uint256 timestamp)',

  // Read
  'function getOrder(bytes32 orderId) view returns (tuple(address user, address token, uint256 amount, uint8 status, uint256 createdAt, string payoutRef))',
  'function getStats() view returns (uint256, uint256, uint256)',

  // Write (owner only)
  'function release(bytes32 orderId, string calldata payoutRef)',
  'function refund(bytes32 orderId, string calldata reason)',
] as const
