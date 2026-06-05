import { Decimal } from '@prisma/client/runtime/library'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../config/database'
import { AppError } from '../../middleware/errorHandler'

export class WalletService {
  // ── Get or create wallet for a user ──────────────────────────
  async getOrCreateWallet(userId: string) {
    const wallet = await prisma.wallet.upsert({
      where:  { userId },
      update: {},
      create: { userId, ngnBalance: 0 },
    })
    return wallet
  }

  // ── Get wallet balance + account info ─────────────────────────
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id: true,
        fullName: true,
        hashpayAccountNumber: true,
        virtualAccountNumber: true,
        virtualBankName: true,
        virtualBankCode: true,
        wallet: { select: { id: true, ngnBalance: true } },
      },
    })
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')

    const wallet = user.wallet ?? await this.getOrCreateWallet(userId)
    return {
      ngnBalance:          wallet.ngnBalance,
      hashpayAccountNumber: user.hashpayAccountNumber,
      virtualAccount: user.virtualAccountNumber
        ? {
            accountNumber: user.virtualAccountNumber,
            bankName:      user.virtualBankName,
            bankCode:      user.virtualBankCode,
          }
        : null,
    }
  }

  // ── Internal transfer (HashPay → HashPay) ─────────────────────
  async transfer(senderId: string, recipientAccountNumber: string, amount: Decimal) {
    if (amount.lte(0)) throw new AppError(400, 'Amount must be greater than zero', 'INVALID_AMOUNT')

    const recipient = await prisma.user.findUnique({
      where:  { hashpayAccountNumber: recipientAccountNumber },
      select: { id: true, fullName: true, hashpayAccountNumber: true, wallet: true },
    })
    if (!recipient) throw new AppError(404, 'Recipient account not found', 'RECIPIENT_NOT_FOUND')
    if (recipient.id === senderId) throw new AppError(400, 'Cannot transfer to yourself', 'SELF_TRANSFER')

    const senderWallet = await this.getOrCreateWallet(senderId)
    if (new Decimal(senderWallet.ngnBalance).lt(amount)) {
      throw new AppError(400, 'Insufficient balance', 'INSUFFICIENT_BALANCE')
    }

    const recipientWallet = await this.getOrCreateWallet(recipient.id)
    const ref = `TRF-${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16)}`

    await prisma.$transaction(async (tx) => {
      const senderBefore  = new Decimal(senderWallet.ngnBalance)
      const senderAfter   = senderBefore.minus(amount)
      const recipBefore   = new Decimal(recipientWallet.ngnBalance)
      const recipAfter    = recipBefore.plus(amount)

      await tx.wallet.update({ where: { id: senderWallet.id },    data: { ngnBalance: senderAfter } })
      await tx.wallet.update({ where: { id: recipientWallet.id }, data: { ngnBalance: recipAfter } })

      await tx.walletTransaction.create({
        data: {
          walletId:      senderWallet.id,
          type:          'DEBIT',
          source:        'INTERNAL_TRANSFER_OUT',
          status:        'COMPLETED',
          amount,
          balanceBefore: senderBefore,
          balanceAfter:  senderAfter,
          senderId,
          recipientId:   recipient.id,
          reference:     ref,
          description:   `Transfer to ${recipient.fullName} (${recipientAccountNumber})`,
        },
      })

      await tx.walletTransaction.create({
        data: {
          walletId:      recipientWallet.id,
          type:          'CREDIT',
          source:        'INTERNAL_TRANSFER_IN',
          status:        'COMPLETED',
          amount,
          balanceBefore: recipBefore,
          balanceAfter:  recipAfter,
          senderId,
          recipientId:   recipient.id,
          reference:     `${ref}-IN`,
          description:   `Transfer received`,
        },
      })
    })

    return { reference: ref, recipient: { fullName: recipient.fullName, accountNumber: recipientAccountNumber } }
  }

  // ── Credit wallet from Paycrest crypto deposit ────────────────
  async creditFromCryptoDeposit(opts: {
    paycrestOrderId: string
    recipientUserId: string
    ngnAmount:       Decimal
    cryptoAsset:     string
    cryptoAmount:    Decimal
    exchangeRate:    Decimal
  }) {
    const existing = await prisma.walletTransaction.findUnique({
      where: { paycrestOrderId: opts.paycrestOrderId },
    })
    if (existing) return existing  // idempotent

    const wallet = await this.getOrCreateWallet(opts.recipientUserId)
    const balBefore = new Decimal(wallet.ngnBalance)
    const balAfter  = balBefore.plus(opts.ngnAmount)

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { id: wallet.id }, data: { ngnBalance: balAfter } })
      await tx.walletTransaction.create({
        data: {
          walletId:       wallet.id,
          type:           'CREDIT',
          source:         'CRYPTO_DEPOSIT',
          status:         'COMPLETED',
          amount:         opts.ngnAmount,
          balanceBefore:  balBefore,
          balanceAfter:   balAfter,
          paycrestOrderId: opts.paycrestOrderId,
          cryptoAsset:    opts.cryptoAsset,
          cryptoAmount:   opts.cryptoAmount,
          exchangeRate:   opts.exchangeRate,
          recipientId:    opts.recipientUserId,
          reference:      `PCRD-${opts.paycrestOrderId}`,
          description:    `${opts.cryptoAmount} ${opts.cryptoAsset} deposit`,
        },
      })
    })
  }

  // ── List transactions ─────────────────────────────────────────
  async listTransactions(userId: string, page = 1, pageSize = 20) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) return { transactions: [], total: 0 }

    const skip  = (page - 1) * pageSize
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where:   { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    pageSize,
        include: {
          sender:    { select: { fullName: true, hashpayAccountNumber: true } },
          recipient: { select: { fullName: true, hashpayAccountNumber: true } },
        },
      }),
      prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ])

    return { transactions, total, page, pageSize }
  }
}

export const walletService = new WalletService()
