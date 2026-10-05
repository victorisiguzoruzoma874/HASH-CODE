import { createHash, createPublicKey, verify } from 'node:crypto'
import { getAddress, verifyMessage } from 'ethers'
import { Keypair, StrKey } from '@stellar/stellar-sdk'
import bs58 from 'bs58'
import { verifyPersonalMessageSignature } from '@mysten/sui/verify'
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils'
import { AppError } from '../../middleware/errorHandler'

export const walletProviders = ['sui', 'metamask', 'phantom', 'freighter', 'lobstr'] as const
export type WalletProvider = typeof walletProviders[number]
export type WalletChain = 'sui' | 'evm' | 'solana' | 'stellar'

export function walletIdentity(provider: WalletProvider, address: string): { chain: WalletChain; address: string } {
  try {
    switch (provider) {
      case 'metamask': return { chain: 'evm', address: getAddress(address).toLowerCase() }
      case 'phantom': {
        if (bs58.decode(address).length !== 32) throw new Error('Invalid Solana key')
        return { chain: 'solana', address }
      }
      case 'freighter': case 'lobstr': {
        if (!StrKey.isValidEd25519PublicKey(address)) throw new Error('Invalid Stellar key')
        return { chain: 'stellar', address }
      }
      case 'sui': {
        if (!isValidSuiAddress(address)) throw new Error('Invalid Sui address')
        return { chain: 'sui', address: normalizeSuiAddress(address) }
      }
      default: throw new Error('Unsupported wallet')
    }
  } catch {
    throw new AppError(400, 'Invalid wallet address for the selected wallet.', 'INVALID_WALLET')
  }
}

export function stellarMessageHash(message: string): Buffer {
  return createHash('sha256').update('Stellar Signed Message:\n' + message, 'utf8').digest()
}

export async function verifyWalletProof(chain: WalletChain, address: string, message: string, signature: string): Promise<void> {
  try {
    let valid = false
    switch (chain) {
      case 'evm': valid = verifyMessage(message, signature).toLowerCase() === address.toLowerCase(); break
      case 'sui': {
        const key = await verifyPersonalMessageSignature(Buffer.from(message, 'utf8'), signature, { address })
        valid = key.toSuiAddress() === address
        break
      }
      case 'stellar': {
        const bytes = Buffer.from(signature, 'base64')
        valid = bytes.length === 64 && Keypair.fromPublicKey(address).verify(stellarMessageHash(message), bytes)
        break
      }
      case 'solana': {
        const publicKey = createPublicKey({
          key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(bs58.decode(address))]),
          format: 'der', type: 'spki',
        })
        const bytes = Buffer.from(signature, 'base64')
        valid = bytes.length === 64 && verify(null, Buffer.from(message, 'utf8'), publicKey, bytes)
        break
      }
    }
    if (!valid) throw new Error('Signature mismatch')
  } catch {
    throw new AppError(400, 'Wallet ownership could not be verified. Please try again.', 'INVALID_WALLET_SIGNATURE')
  }
}
