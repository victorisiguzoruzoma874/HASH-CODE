/**
 * quoteSign.ts
 * ────────────
 * Generates and verifies secp256k1 signatures for HashPay quotes.
 *
 * The backend signs a quote before returning it to the frontend.
 * The Sui contract verifies the same signature in deposit_and_lock().
 *
 * Message format (matches escrow.move::build_quote_message):
 *   msg = order_id_bytes || BCS(amount_in) || BCS(amount_out) || BCS(expiry)
 *
 * Signing algorithm: secp256k1 + keccak256 (matches sui::ecdsa_k1 hash_function=0)
 */

import crypto from 'crypto'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { secp256k1 } from 'ethereum-cryptography/secp256k1'
import { hexToBytes, bytesToHex } from 'ethereum-cryptography/utils'

// ── BCS-style u64 serialisation (little-endian 8 bytes) ──────
function bcsU64(value: bigint): Uint8Array {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(value)
  return buf
}

// ── Build the canonical quote message ────────────────────────
export function buildQuoteMessage(
  orderId:   Buffer | Uint8Array,
  amountIn:  bigint,
  amountOut: bigint,
  expiry:    bigint,
): Uint8Array {
  return Buffer.concat([
    orderId,
    bcsU64(amountIn),
    bcsU64(amountOut),
    bcsU64(expiry),
  ])
}

// ── Sign a quote ──────────────────────────────────────────────

export interface QuoteSignInput {
  /** UUID string — will be encoded as UTF-8 bytes */
  orderId:    string
  /** On-chain amount in smallest unit (e.g. 100_000000 for 100 USDC) */
  amountIn:   bigint
  /** Locked fiat output (e.g. 156500n for ₦156,500) */
  amountOut:  bigint
  /** Sui epoch after which the quote expires */
  expiry:     bigint
}

export interface QuoteSignResult {
  /** 64-byte compact signature as hex string */
  signature:  string
  /** Message hash (keccak256) as hex — for debugging */
  msgHash:    string
  /** The order_id as hex bytes — pass to the contract */
  orderIdHex: string
}

export function signQuote(input: QuoteSignInput): QuoteSignResult {
  const privKeyHex = process.env.SUI_BACKEND_SECP256K1_PRIVKEY
  if (!privKeyHex) throw new Error('SUI_BACKEND_SECP256K1_PRIVKEY not set')

  const privKey    = hexToBytes(privKeyHex.replace('0x', ''))
  const orderIdBuf = Buffer.from(input.orderId, 'utf8')

  const msg     = buildQuoteMessage(orderIdBuf, input.amountIn, input.amountOut, input.expiry)
  const msgHash = keccak256(msg)

  // Sign with secp256k1 — returns { r, s, recovery }
  const sig = secp256k1.sign(msgHash, privKey)

  // Compact 64-byte format: r (32 bytes) || s (32 bytes)
  const sigBytes = sig.toCompactRawBytes()

  return {
    signature:  bytesToHex(sigBytes),
    msgHash:    bytesToHex(msgHash),
    orderIdHex: orderIdBuf.toString('hex'),
  }
}

// ── Verify a quote signature ──────────────────────────────────

export function verifyQuote(
  input:     QuoteSignInput,
  signature: string,
  pubKeyHex: string,
): boolean {
  try {
    const orderIdBuf = Buffer.from(input.orderId, 'utf8')
    const msg        = buildQuoteMessage(orderIdBuf, input.amountIn, input.amountOut, input.expiry)
    const msgHash    = keccak256(msg)
    const sigBytes   = hexToBytes(signature.replace('0x', ''))
    const pubKey     = hexToBytes(pubKeyHex.replace('0x', ''))

    const sig = secp256k1.Signature.fromCompact(sigBytes)
    return secp256k1.verify(sig, msgHash, pubKey)
  } catch {
    return false
  }
}

// ── Get backend public key (33-byte compressed hex) ──────────

export function getBackendPublicKey(): string {
  const privKeyHex = process.env.SUI_BACKEND_SECP256K1_PRIVKEY
  if (!privKeyHex) throw new Error('SUI_BACKEND_SECP256K1_PRIVKEY not set')
  const privKey = hexToBytes(privKeyHex.replace('0x', ''))
  const pubKey  = secp256k1.getPublicKey(privKey, true)  // compressed = true
  return bytesToHex(pubKey)
}

// ── Current Sui epoch helper ──────────────────────────────────

export async function getCurrentSuiEpoch(): Promise<bigint> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { suiClient } = require('../config/sui')
    const state = await suiClient.getLatestSuiSystemState()
    return BigInt(state.epoch)
  } catch {
    // Fallback: estimate based on Sui mainnet epoch duration (~24h)
    const EPOCH_ZERO_TIMESTAMP_MS = 1680000000000n
    const EPOCH_DURATION_MS       = 86_400_000n
    const now                     = BigInt(Date.now())
    return (now - EPOCH_ZERO_TIMESTAMP_MS) / EPOCH_DURATION_MS
  }
}
