import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, axiosMock, cache } = vi.hoisted(() => ({
  db: { findFirst: vi.fn() },
  axiosMock: { get: vi.fn(), post: vi.fn(), isAxiosError: (error: any) => error?.isAxiosError === true },
  cache: { get: vi.fn(), set: vi.fn() },
}))
vi.mock('../../config/database', () => ({ prisma: { linkedWallet: { findFirst: db.findFirst } } }))
vi.mock('../../config/redis', () => ({ cacheGet: cache.get, cacheSet: cache.set }))
vi.mock('axios', () => ({ default: axiosMock }))
import { WalletBalanceService } from './WalletBalanceService'

const address = '0x1111111111111111111111111111111111111111'
const nativeSui = '0x2::sui::SUI'
let service: WalletBalanceService
beforeEach(() => {
  vi.resetAllMocks()
  service = new WalletBalanceService()
  db.findFirst.mockResolvedValue({ id: 'wallet-1', userId: 'user-1', chain: 'evm', address })
  cache.get.mockResolvedValue(null)
  axiosMock.get.mockResolvedValue({ data: { items: [], next_page_params: null } })
  axiosMock.post.mockImplementation(async (_url: string, body: any) => {
    if (body.method === 'eth_chainId') return { data: { result: '0x1' } }
    if (body.method === 'eth_getBalance') return { data: { result: '0xde0b6b3a7640000' } }
    if (body.method === 'eth_call') return { data: { result: '0x75bcd15' } }
    throw new Error('Unexpected RPC method')
  })
})

describe('linked-wallet balances', () => {
  it('checks account ownership before cache or chain reads', async () => {
    db.findFirst.mockResolvedValue(null)
    await expect(service.get('another-user', 'wallet-1')).rejects.toMatchObject({ statusCode: 404 })
    expect(db.findFirst).toHaveBeenCalledWith({ where: { id: 'wallet-1', userId: 'another-user' } })
    expect(cache.get).not.toHaveBeenCalled()
    expect(axiosMock.post).not.toHaveBeenCalled()
  })

  it('refuses unsupported networks and arbitrary RPC URLs', async () => {
    await expect(service.get('user-1', 'wallet-1', 'https://attacker.example')).rejects.toMatchObject({ statusCode: 400 })
    expect(axiosMock.post).not.toHaveBeenCalled()
  })

  it('returns precise ETH/USDC and indexed ERC-20 holdings', async () => {
    axiosMock.get.mockResolvedValue({ data: { items: [{ value: '7500000', token: { address_hash: '0x2222222222222222222222222222222222222222', decimals: '6', symbol: 'USDT', type: 'ERC-20' } }], next_page_params: null } })
    const result = await service.get('user-1', 'wallet-1')
    expect(result.networkLabel).toBe('Ethereum mainnet')
    expect(result.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: 'ETH', amount: '1.0' }),
      expect.objectContaining({ symbol: 'USDC', amount: '123.456789' }),
      expect.objectContaining({ symbol: 'USDT', amount: '7.5' }),
    ]))
    expect(result.warnings).toEqual([])
    expect(cache.set).toHaveBeenCalledWith(expect.stringContaining('ethereum'), expect.objectContaining({ walletId: 'wallet-1' }), 15)
  })

  it('preserves very large and very small amounts without floating-point rounding', async () => {
    axiosMock.post.mockImplementation(async (_url: string, body: any) => ({ data: { result: body.method === 'eth_chainId' ? '0x1' : body.method === 'eth_getBalance' ? '0x' + (9007199254740993123456789n).toString(16) : '0x1' } }))
    const result = await service.get('user-1', 'wallet-1')
    expect(result.assets.find(a => a.symbol === 'ETH')?.amount).toBe('9007199.254740993123456789')
    expect(result.assets.find(a => a.symbol === 'USDC')?.amount).toBe('0.000001')
  })

  it('does not label a misconfigured EVM RPC as the requested network', async () => {
    axiosMock.post.mockResolvedValue({ data: { result: '0x2105' } })
    await expect(service.get('user-1', 'wallet-1', 'ethereum')).rejects.toMatchObject({ code: 'WALLET_BALANCE_UNAVAILABLE' })
    expect(axiosMock.post).toHaveBeenCalledTimes(1)
  })

  it('keeps successful assets and warns instead of inventing a zero on partial failure', async () => {
    axiosMock.post.mockImplementation(async (_url: string, body: any) => {
      if (body.method === 'eth_chainId') return { data: { result: '0x1' } }
      if (body.method === 'eth_getBalance') throw new Error('Rate limited')
      return { data: { result: '0x1' } }
    })
    const result = await service.get('user-1', 'wallet-1')
    expect(result.assets.some(a => a.symbol === 'ETH')).toBe(false)
    expect(result.assets.find(a => a.symbol === 'USDC')?.amount).toBe('0.000001')
    expect(result.warnings).toContain('ETH balance could not be loaded.')
  })

  it('does not convert a complete upstream failure into zero holdings', async () => {
    axiosMock.post.mockRejectedValue(new Error('Unavailable'))
    await expect(service.get('user-1', 'wallet-1')).rejects.toMatchObject({ statusCode: 503 })
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('does not interpret a malformed empty RPC result as a zero balance', async () => {
    axiosMock.post.mockImplementation(async (_url: string, body: any) => ({ data: { result: body.method === 'eth_chainId' ? '0x1' : '' } }))
    await expect(service.get('user-1', 'wallet-1')).rejects.toMatchObject({ statusCode: 503 })
  })

  it('returns partial EVM results when the token indexer fails', async () => {
    axiosMock.get.mockRejectedValue(new Error('Indexer unavailable'))
    const result = await service.get('user-1', 'wallet-1')
    expect(result.assets).toHaveLength(2)
    expect(result.warnings[0]).toContain('Other ERC-20')
  })

  it('bounds token pagination and reports truncation', async () => {
    axiosMock.get.mockResolvedValue({ data: { items: [], next_page_params: { value: '123', id: 50 } } })
    const result = await service.get('user-1', 'wallet-1')
    expect(axiosMock.get).toHaveBeenCalledTimes(2)
    expect(result.warnings).toContain('Only the first 100 indexed ERC-20 holdings are shown.')
  })

  it('falls through to real network reads when Redis fails', async () => {
    cache.get.mockRejectedValue(new Error('Redis down'))
    cache.set.mockRejectedValue(new Error('Redis down'))
    expect((await service.get('user-1', 'wallet-1')).assets[0].amount).toBe('1.0')
  })

  it('retains distinct Stellar issuers even when their symbols are identical', async () => {
    db.findFirst.mockResolvedValue({ id: 'wallet-1', chain: 'stellar', address: 'GTEST' })
    axiosMock.get.mockResolvedValue({ data: { balances: [
      { asset_type: 'native', balance: '10.1234567' },
      { asset_type: 'credit_alphanum4', asset_code: 'USD', asset_issuer: 'GISSUER1', balance: '5.0000000' },
      { asset_type: 'credit_alphanum4', asset_code: 'USD', asset_issuer: 'GISSUER2', balance: '7.0000000' },
    ] } })
    const result = await service.get('user-1', 'wallet-1', 'testnet')
    expect(result.assets.map(a => a.id)).toEqual(['native', 'USD:GISSUER1', 'USD:GISSUER2'])
    expect(result.networkLabel).toBe('Stellar testnet')
    expect(axiosMock.get).toHaveBeenCalledWith(expect.stringContaining('horizon-testnet.stellar.org'), expect.anything())
  })

  it('reports an unfunded Stellar account only when Horizon returns 404', async () => {
    db.findFirst.mockResolvedValue({ id: 'wallet-1', chain: 'stellar', address: 'GTEST' })
    axiosMock.get.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
    const result = await service.get('user-1', 'wallet-1')
    expect(result.assets[0].amount).toBe('0.0000000')
    expect(result.warnings[0]).toContain('not funded')
    axiosMock.get.mockRejectedValue({ isAxiosError: true, response: { status: 429 } })
    await expect(service.get('user-1', 'wallet-1')).rejects.toMatchObject({ statusCode: 503 })
  })

  it('aggregates Solana token accounts by mint and reads both token programs', async () => {
    db.findFirst.mockResolvedValue({ id: 'wallet-1', chain: 'solana', address: 'SOLANA' })
    const row = (amount: string) => ({ account: { data: { parsed: { info: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', tokenAmount: { amount, decimals: 6 } } } } } })
    axiosMock.post.mockImplementation(async (_url: string, body: any) => ({ data: { result: body.method === 'getBalance' ? { value: 2000000001 } : { value: body.params[1].programId.startsWith('Tokenkeg') ? [row('1234567'), row('2000000')] : [] } } }))
    const result = await service.get('user-1', 'wallet-1')
    expect(result.assets.find(a => a.symbol === 'SOL')?.amount).toBe('2.000000001')
    expect(result.assets.find(a => a.symbol === 'USDC')?.amount).toBe('3.234567')
    expect(axiosMock.post).toHaveBeenCalledTimes(3)
  })

  it('does not round unsafe Solana lamport integers into a false balance', async () => {
    db.findFirst.mockResolvedValue({ id: 'wallet-1', chain: 'solana', address: 'SOLANA' })
    axiosMock.post.mockImplementation(async (_url: string, body: any) => ({ data: { result: body.method === 'getBalance' ? { value: Number.MAX_SAFE_INTEGER + 1 } : { value: [] } } }))
    await expect(service.get('user-1', 'wallet-1')).rejects.toMatchObject({ statusCode: 503 })
  })

  it('uses Sui decimals and labels missing metadata as raw units', async () => {
    db.findFirst.mockResolvedValue({ id: 'wallet-1', chain: 'sui', address: '0x123' })
    axiosMock.post.mockResolvedValueOnce({ data: { data: { address: {
      nativeBalance: { totalBalance: '1000000001' },
      balances: { nodes: [
        { coinType: { repr: nativeSui }, totalBalance: '1000000001', coinMetadata: null },
        { coinType: { repr: '0x123::coin::USD' }, totalBalance: '1234567', coinMetadata: { symbol: 'USD', decimals: 6 } },
        { coinType: { repr: '0x456::coin::UNKNOWN' }, totalBalance: '987654321012345678', coinMetadata: null },
      ], pageInfo: { hasNextPage: false } },
    } } } })
    axiosMock.post.mockResolvedValueOnce({ data: { data: { coin0: { symbol: 'USD', decimals: 6 }, coin1: null } } })
    const result = await service.get('user-1', 'wallet-1')
    expect(result.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: 'SUI', amount: '1.000000001' }),
      expect.objectContaining({ symbol: 'USD', amount: '1.234567' }),
      expect.objectContaining({ symbol: 'UNKNOWN', amount: '987654321012345678', decimals: null }),
    ]))
    expect(result.warnings[0]).toContain('raw units')
  })

  it('shows zero SUI only after a successful empty balance response', async () => {
    db.findFirst.mockResolvedValue({ id: 'wallet-1', chain: 'sui', address: '0x123' })
    axiosMock.post.mockResolvedValue({ data: { data: { address: { nativeBalance: { totalBalance: '0' }, balances: { nodes: [] } } } } })
    expect((await service.get('user-1', 'wallet-1')).assets[0].amount).toBe('0.0')
    axiosMock.post.mockResolvedValue({ data: { errors: [{ message: 'Unavailable' }], data: { address: null } } })
    await expect(service.get('user-1', 'wallet-1')).rejects.toMatchObject({ statusCode: 503 })
  })

  it('reads native SUI separately from truncated token pages and includes accumulator totals', async () => {
    db.findFirst.mockResolvedValue({ id: 'wallet-1', chain: 'sui', address: '0x123' })
    axiosMock.post.mockResolvedValue({ data: { data: { address: {
      nativeBalance: { totalBalance: '2000000001' },
      balances: { nodes: [], pageInfo: { hasNextPage: true } },
    } } } })
    const result = await service.get('user-1', 'wallet-1')
    expect(result.assets[0].amount).toBe('2.000000001')
    expect(result.warnings[0]).toContain('first 50')
    expect(axiosMock.post).toHaveBeenCalledWith(expect.stringContaining('graphql.mainnet.sui.io'), expect.objectContaining({ variables: { owner: '0x123' } }), expect.anything())
  })

  it('rejects a missing native GraphQL balance instead of inventing zero', async () => {
    db.findFirst.mockResolvedValue({ id: 'wallet-1', chain: 'sui', address: '0x123' })
    axiosMock.post.mockResolvedValue({ data: { data: { address: { balances: { nodes: [] } } } } })
    await expect(service.get('user-1', 'wallet-1')).rejects.toMatchObject({ statusCode: 503 })
  })

})
