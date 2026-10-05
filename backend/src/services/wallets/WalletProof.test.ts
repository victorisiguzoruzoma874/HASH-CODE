import { describe, expect, it } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import { Wallet } from 'ethers'
import { Keypair } from '@stellar/stellar-sdk'
import bs58 from 'bs58'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { stellarMessageHash, verifyWalletProof, walletIdentity } from './WalletProof'

const message = 'HashPay wallet connection\nAccount: user-1\nNonce: test-nonce'

describe('wallet ownership proofs', () => {
  it('verifies MetaMask personal_sign and rejects another wallet or changed message', async () => {
    const wallet = Wallet.createRandom()
    const address = walletIdentity('metamask', wallet.address).address
    const signature = await wallet.signMessage(message)
    await expect(verifyWalletProof('evm', address, message, signature)).resolves.toBeUndefined()
    await expect(verifyWalletProof('evm', Wallet.createRandom().address, message, signature)).rejects.toThrow('ownership')
    await expect(verifyWalletProof('evm', address, message + 'tampered', signature)).rejects.toThrow('ownership')
  })

  it('verifies Phantom Ed25519 message signatures and rejects another key', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const address = bs58.encode(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32))
    const signature = sign(null, Buffer.from(message), privateKey).toString('base64')
    await expect(verifyWalletProof('solana', address, message, signature)).resolves.toBeUndefined()
    await expect(verifyWalletProof('solana', address, message + 'changed', signature)).rejects.toThrow('ownership')
    await expect(verifyWalletProof('solana', bs58.encode(Buffer.alloc(32, 1)), message, signature)).rejects.toThrow('ownership')
  })

  it('verifies Freighter and LOBSTR SEP-53 signatures', async () => {
    const wallet = Keypair.random()
    const signature = Buffer.from(wallet.sign(stellarMessageHash(message))).toString('base64')
    for (const provider of ['freighter', 'lobstr'] as const) {
      const identity = walletIdentity(provider, wallet.publicKey())
      await expect(verifyWalletProof(identity.chain, identity.address, message, signature)).resolves.toBeUndefined()
    }
    await expect(verifyWalletProof('stellar', wallet.publicKey(), message + 'changed', signature)).rejects.toThrow('ownership')
    // Signing raw bytes is not a SEP-53 ownership proof.
    await expect(verifyWalletProof('stellar', wallet.publicKey(), message, Buffer.from(wallet.sign(Buffer.from(message))).toString('base64'))).rejects.toThrow('ownership')
  })

  it('matches the published SEP-53 test vector', async () => {
    await expect(verifyWalletProof('stellar',
      'GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L',
      'Hello, World!',
      'fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==',
    )).resolves.toBeUndefined()
  })

  it('preserves Sui personal-message ownership verification', async () => {
    const wallet = new Ed25519Keypair()
    const address = wallet.getPublicKey().toSuiAddress()
    const { signature } = await wallet.signPersonalMessage(Buffer.from(message))
    await expect(verifyWalletProof('sui', address, message, signature)).resolves.toBeUndefined()
    await expect(verifyWalletProof('sui', new Ed25519Keypair().getPublicKey().toSuiAddress(), message, signature)).rejects.toThrow('ownership')
  })

  it.each(['metamask', 'phantom', 'freighter', 'lobstr', 'sui'] as const)('rejects malformed %s addresses', provider => {
    expect(() => walletIdentity(provider, 'not-a-wallet')).toThrow('Invalid wallet')
  })
})
