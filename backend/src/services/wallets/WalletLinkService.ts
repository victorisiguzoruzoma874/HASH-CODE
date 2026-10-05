import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/database'
import { redis } from '../../config/redis'
import { AppError } from '../../middleware/errorHandler'
import { walletIdentity, verifyWalletProof, type WalletChain, type WalletProvider } from './WalletProof'

interface Challenge {
  userId: string; provider: WalletProvider; chain: WalletChain; address: string
  message: string; expiresAt: string
}
const publicLink = { id: true, provider: true, chain: true, address: true, createdAt: true } as const

export class WalletLinkService {
  async challenge(userId: string, provider: WalletProvider, address: string, origin: string) {
    const identity = walletIdentity(provider, address)
    const challengeId = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    const message = [
      'HashPay wallet connection', `Website: ${origin}`, `Account: ${userId}`,
      `Wallet: ${identity.address}`, `Network: ${identity.chain}`, `Provider: ${provider}`,
      'Link this wallet to my HashPay account. This does not authorize a payment.',
      `Nonce: ${challengeId}`, `Expires: ${expiresAt}`,
    ].join('\n')
    const challenge: Challenge = { userId, provider, ...identity, message, expiresAt }
    try {
      await redis.set(`wallet-link:${challengeId}`, JSON.stringify(challenge), 'EX', 300)
    } catch {
      throw new AppError(503, 'Wallet verification is temporarily unavailable. Try again shortly.', 'WALLET_VERIFICATION_UNAVAILABLE')
    }
    return { challengeId, message, expiresAt }
  }

  async link(userId: string, challengeId: string, signature: string) {
    const key = `wallet-link:${challengeId}`
    const raw = await redis.get(key)
    if (!raw) throw new AppError(400, 'Wallet request expired. Please connect again.', 'WALLET_CHALLENGE_EXPIRED')
    const challenge = JSON.parse(raw) as Challenge
    if (challenge.userId !== userId || Date.parse(challenge.expiresAt) <= Date.now()) {
      throw new AppError(400, 'Invalid wallet request. Please connect again.', 'INVALID_WALLET_CHALLENGE')
    }
    await verifyWalletProof(challenge.chain, challenge.address, challenge.message, signature)
    // Atomically consume the nonce: two simultaneous requests cannot reuse a proof.
    if (await redis.getdel(key) !== raw) {
      throw new AppError(400, 'Wallet request already used. Please connect again.', 'WALLET_CHALLENGE_USED')
    }
    try {
      return await prisma.$transaction(async tx => {
        const existing = await tx.linkedWallet.findUnique({
          where: { chain_address: { chain: challenge.chain, address: challenge.address } },
        })
        if (existing && existing.userId !== userId) {
          throw new AppError(409, 'This wallet is already linked to another account.', 'WALLET_ALREADY_LINKED')
        }
        // Preserve the address fields used by the existing Sui/EVM settlement code.
        const field = challenge.chain === 'sui' ? 'suiAddress' : challenge.chain === 'evm' ? 'evmAddress' : null
        if (field) {
          const owner = await tx.user.findFirst({ where: { [field]: { equals: challenge.address, mode: 'insensitive' }, id: { not: userId } } })
          if (owner) throw new AppError(409, 'This wallet is already linked to another account.', 'WALLET_ALREADY_LINKED')
          await tx.user.update({ where: { id: userId }, data: { [field]: challenge.address } })
        }
        if (existing) return tx.linkedWallet.update({ where: { id: existing.id }, data: { provider: challenge.provider }, select: publicLink })
        return tx.linkedWallet.create({ data: { userId, chain: challenge.chain, address: challenge.address, provider: challenge.provider }, select: publicLink })
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'This wallet is already linked. Refresh and try again.', 'WALLET_ALREADY_LINKED')
      }
      throw err
    }
  }

  list(userId: string) {
    return prisma.linkedWallet.findMany({ where: { userId }, select: publicLink, orderBy: { createdAt: 'asc' } })
  }

  async unlink(userId: string, id: string) {
    await prisma.$transaction(async tx => {
      const link = await tx.linkedWallet.findFirst({ where: { id, userId } })
      if (!link) throw new AppError(404, 'Wallet link not found.', 'WALLET_NOT_FOUND')
      await tx.linkedWallet.delete({ where: { id: link.id } })
      const field = link.chain === 'sui' ? 'suiAddress' : link.chain === 'evm' ? 'evmAddress' : null
      if (field) {
        const remaining = await tx.linkedWallet.findFirst({ where: { userId, chain: link.chain }, orderBy: { createdAt: 'desc' } })
        await tx.user.updateMany({ where: { id: userId, [field]: link.address }, data: { [field]: remaining?.address ?? null } })
      }
    })
  }
}
