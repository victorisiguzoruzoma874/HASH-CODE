import { beforeEach, describe, expect, it, vi } from 'vitest'
const db = vi.hoisted(() => ({ user: { findUnique: vi.fn() }, walletTransaction: { findMany: vi.fn() }, escrowOrder: { findMany: vi.fn() } }))
vi.mock('../../config/database', () => ({ prisma: db }))
vi.mock('../oracle/PriceOracleService', () => ({ PriceOracleService: class { getAllPrices = vi.fn().mockResolvedValue({}) } }))
import { executeAssistantTool } from './AssistantTools'
beforeEach(() => vi.resetAllMocks())
describe('assistant app permissions', () => {
  it('scopes balances, transactions and orders to the authenticated user', async () => {
    db.user.findUnique.mockResolvedValue({ fullName: 'Me' })
    await executeAssistantTool('signed-in-user', 'get_account', {})
    await executeAssistantTool('signed-in-user', 'get_transactions', { limit: 5 })
    await executeAssistantTool('signed-in-user', 'get_orders', {})
    expect(db.user.findUnique.mock.calls[0][0].where).toEqual({ id: 'signed-in-user' })
    expect(db.walletTransaction.findMany.mock.calls[0][0].where).toEqual({ wallet: { userId: 'signed-in-user' } })
    expect(db.escrowOrder.findMany.mock.calls[0][0].where).toEqual({ userId: 'signed-in-user' })
  })
  it('rejects arbitrary account IDs, URLs, unsupported tools and invalid drafts', async () => {
    await expect(executeAssistantTool('me', 'get_account', { userId: 'someone-else' })).rejects.toThrow()
    await expect(executeAssistantTool('me', 'open_screen', { screen: 'https://evil.example' })).rejects.toThrow()
    await expect(executeAssistantTool('me', 'transfer_money', {})).rejects.toThrow()
    await expect(executeAssistantTool('me', '__proto__', {})).rejects.toThrow()
    await expect(executeAssistantTool('me', 'prepare_send', { recipientAccountNumber: '1234567890', amount: -1 })).rejects.toThrow()
    await expect(executeAssistantTool('me', 'prepare_send', { recipientAccountNumber: '1234567890', amount: 1.234 })).rejects.toThrow()
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })
  it('prepares a review without transferring funds and rejects self-transfers', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'recipient', fullName: 'Recipient' })
    const result = await executeAssistantTool('me', 'prepare_send', { recipientAccountNumber: '1234567890', amount: 200 })
    expect(result.action).toEqual({ kind: 'prepare_send', recipientAccountNumber: '1234567890', amount: 200 })
    expect(result.data).toMatchObject({ fundsMoved: false, status: 'review_required' })
    db.user.findUnique.mockResolvedValue({ id: 'me', fullName: 'Me' })
    await expect(executeAssistantTool('me', 'prepare_send', { recipientAccountNumber: '1234567890', amount: 200 })).rejects.toThrow('yourself')
  })
})
