import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Account, Asset, Keypair, Networks, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk'
const { db, http, cache } = vi.hoisted(() => ({ db: { findFirst: vi.fn() }, http: { get: vi.fn(), post: vi.fn() }, cache: { get: vi.fn(), set: vi.fn() } }))
vi.mock('../../config/database', () => ({ prisma: { linkedWallet: { findFirst: db.findFirst } } }))
vi.mock('../../config/redis', () => ({ cacheGet: cache.get, cacheSet: cache.set }))
vi.mock('axios', () => ({ default: http }))
import { StellarSwapService, STELLAR_USDC_ISSUER, type StellarSwapQuote } from './StellarSwapService'
const owner = Keypair.random()
let service: StellarSwapService
let account: any
let route: any
let stored = new Map<string, any>()
const input = { walletId: 'wallet-1', assetIn: 'XLM', assetOut: 'USDC', amountIn: '6' }
function sign(quote: StellarSwapQuote, signer = owner, network = Networks.PUBLIC) {
  const tx = TransactionBuilder.fromXDR(quote.transactionXdr, network) as Transaction
  tx.sign(signer)
  return tx.toXDR()
}
beforeEach(() => {
  vi.resetAllMocks()
  service = new StellarSwapService(); stored = new Map()
  db.findFirst.mockResolvedValue({ id: 'wallet-1', address: owner.publicKey(), provider: 'freighter', chain: 'stellar' })
  cache.get.mockImplementation(async key => stored.get(key) ?? null)
  cache.set.mockImplementation(async (key, value) => { stored.set(key, value) })
  account = { sequence: '100', subentry_count: 0, thresholds: { med_threshold: 1 }, signers: [{ key: owner.publicKey(), type: 'ed25519_public_key', weight: 1 }], balances: [{ asset_type: 'native', balance: '100.0000000', selling_liabilities: '0.0000000' }] }
  route = { source_asset_type: 'native', source_amount: '6.0000000', destination_asset_type: 'credit_alphanum4', destination_asset_code: 'USDC', destination_asset_issuer: STELLAR_USDC_ISSUER, destination_amount: '1.3000001', path: [] }
  http.get.mockImplementation(async url => {
    if (url.endsWith('/accounts/' + owner.publicKey())) return { data: account }
    if (url.endsWith('/ledgers')) return { data: { _embedded: { records: [{ base_reserve_in_stroops: 5000000 }] } } }
    if (url.endsWith('/fee_stats')) return { data: { fee_charged: { p95: '100' } } }
    if (url.endsWith('/paths/strict-send')) return { data: { _embedded: { records: [route] } } }
    if (url.includes('/transactions/')) throw { response: { status: 404 } }
    return { data: { network_passphrase: Networks.PUBLIC } }
  })
})
describe('Stellar executable swaps', () => {
  it('requires wallet ownership before any chain request', async () => {
    db.findFirst.mockResolvedValue(null)
    await expect(service.quote('other-user', input)).rejects.toMatchObject({ statusCode: 404 })
    expect(db.findFirst).toHaveBeenCalledWith({ where: { id: 'wallet-1', userId: 'other-user', chain: 'stellar' } })
    expect(http.get).not.toHaveBeenCalled()
  })
  it('rejects unsupported assets and floating point notation', async () => {
    await expect(service.quote('u1', { ...input, assetOut: 'ETH' })).rejects.toMatchObject({ statusCode: 400 })
    for (const amountIn of ['0', '1e3', '-1', '0.00000001']) await expect(service.quote('u1', { ...input, amountIn })).rejects.toMatchObject({ statusCode: 400 })
    expect(http.get).not.toHaveBeenCalled()
  })
  it('builds a self-swap with the exact Circle issuer, trustline, minimum receive and expiry', async () => {
    const quote = await service.quote('u1', input)
    const tx = TransactionBuilder.fromXDR(quote.transactionXdr, Networks.PUBLIC) as Transaction
    expect(tx.source).toBe(owner.publicKey())
    expect(tx.operations).toHaveLength(2)
    expect(tx.operations[0].type).toBe('changeTrust')
    const op: any = tx.operations[1]
    expect(op.type).toBe('pathPaymentStrictSend'); expect(op.destination).toBe(owner.publicKey())
    expect(op.sendAmount).toBe('6.0000000'); expect(op.destMin).toBe('1.2935000')
    expect(op.destAsset.getIssuer()).toBe(STELLAR_USDC_ISSUER)
    expect(quote.createsTrustline).toBe(true); expect(quote.reserveXlm).toBe('0.5000000'); expect(quote.feeXlm).toBe('0.0000200')
    expect(tx.fee).toBe('200'); expect(Number(tx.timeBounds?.maxTime)).toBe(Date.parse(quote.expiresAt) / 1000)
    expect(quote).not.toHaveProperty('userId')
  })
  it('does not create another trustline when one exists', async () => {
    account.subentry_count = 1
    account.balances.push({ asset_code: 'USDC', asset_issuer: STELLAR_USDC_ISSUER, balance: '0', limit: '1000', is_authorized: true })
    const quote = await service.quote('u1', input)
    expect(quote.createsTrustline).toBe(false); expect(quote.feeXlm).toBe('0.0000100')
    expect((TransactionBuilder.fromXDR(quote.transactionXdr, Networks.PUBLIC) as Transaction).operations).toHaveLength(1)
  })
  it('protects the reserve and checks liabilities and multisignature thresholds', async () => {
    account.balances[0].balance = '7.5'
    await expect(service.quote('u1', input)).rejects.toMatchObject({ code: 'STELLAR_INSUFFICIENT_XLM' })
    account.balances[0].balance = '100'; account.thresholds.med_threshold = 2
    await expect(service.quote('u1', input)).rejects.toMatchObject({ code: 'STELLAR_MULTISIG' })
  })
  it('rejects wrong network providers', async () => {
    http.get.mockResolvedValue({ data: { network_passphrase: Networks.TESTNET } })
    await expect(service.quote('u1', input)).rejects.toMatchObject({ code: 'STELLAR_NETWORK_MISMATCH' })
  })
  it('rejects nonexistent exchange routes and wrong USDC issuers', async () => {
    route.destination_asset_issuer = Keypair.random().publicKey()
    await expect(service.quote('u1', input)).rejects.toMatchObject({ code: 'STELLAR_NO_LIQUIDITY' })
  })
  it('rejects wrong signers, wrong networks and modified transactions without submission', async () => {
    const quote = await service.quote('u1', input)
    await expect(service.submit('u1', quote.quoteId, sign(quote, Keypair.random()))).rejects.toMatchObject({ code: 'STELLAR_INVALID_SIGNATURE' })
    await expect(service.submit('u1', quote.quoteId, sign(quote, owner, Networks.TESTNET))).rejects.toMatchObject({ code: 'STELLAR_INVALID_SIGNATURE' })
    const changed = new TransactionBuilder(new Account(owner.publicKey(), '100'), { fee: '100', networkPassphrase: Networks.PUBLIC }).addOperation(Operation.payment({ destination: Keypair.random().publicKey(), asset: Asset.native(), amount: '6' })).setTimeout(90).build()
    changed.sign(owner)
    await expect(service.submit('u1', quote.quoteId, changed.toXDR())).rejects.toMatchObject({ code: 'STELLAR_INVALID_SIGNATURE' })
    expect(http.post).not.toHaveBeenCalled()
  })
  it('rejects replay by another user and expired quotes', async () => {
    const quote = await service.quote('u1', input)
    await expect(service.submit('u2', quote.quoteId, sign(quote))).rejects.toMatchObject({ code: 'STELLAR_QUOTE_NOT_FOUND' })
    stored.get(`stellar-swap:${quote.quoteId}`).expiresAt = new Date(Date.now() - 1000).toISOString()
    await expect(service.submit('u1', quote.quoteId, sign(quote))).rejects.toMatchObject({ code: 'STELLAR_QUOTE_EXPIRED' })
    expect(http.post).not.toHaveBeenCalled()
  })
  it('submits the exact signed XDR and confirms the matching chain hash', async () => {
    const quote = await service.quote('u1', input); const xdr = sign(quote)
    http.post.mockResolvedValue({ data: { hash: quote.transactionHash, successful: true } })
    expect((await service.submit('u1', quote.quoteId, xdr)).status).toBe('confirmed')
    expect(new URLSearchParams(http.post.mock.calls[0][1]).get('tx')).toBe(xdr)
  })
  it('returns a confirmed retry without broadcasting another transaction', async () => {
    const quote = await service.quote('u1', input)
    const get = http.get.getMockImplementation()!
    http.get.mockImplementation(async url => url.includes('/transactions/') ? { data: { hash: quote.transactionHash, successful: true } } : get(url))
    expect((await service.submit('u1', quote.quoteId, sign(quote))).status).toBe('confirmed')
    expect(http.post).not.toHaveBeenCalled()
  })
  it('keeps timeout results pending and reconciles lost responses', async () => {
    const quote = await service.quote('u1', input)
    http.post.mockRejectedValue(new Error('Timeout'))
    expect((await service.submit('u1', quote.quoteId, sign(quote))).status).toBe('pending')
    const get = http.get.getMockImplementation()!
    http.get.mockImplementation(async url => url.includes('/transactions/') ? { data: { hash: quote.transactionHash, successful: true } } : get(url))
    expect((await service.status('u1', quote.quoteId)).status).toBe('confirmed')
  })
  it('resolves an unsubmitted expired transaction only after Horizon ingests a later ledger', async () => {
    const quote = await service.quote('u1', input)
    stored.get(`stellar-swap:${quote.quoteId}`).expiresAt = new Date(Date.now() - 1000).toISOString()
    const get = http.get.getMockImplementation()!
    http.get.mockImplementation(async url => url.endsWith('/ledgers') ? { data: { _embedded: { records: [{ closed_at: new Date().toISOString() }] } } } : get(url))
    expect((await service.status('u1', quote.quoteId)).status).toBe('expired')
  })
  it('supports USDC to XLM and subtracts selling liabilities', async () => {
    account.balances.push({ asset_code: 'USDC', asset_issuer: STELLAR_USDC_ISSUER, balance: '10', selling_liabilities: '2', limit: '1000', is_authorized: true })
    route = { source_asset_type: 'credit_alphanum4', source_asset_code: 'USDC', source_asset_issuer: STELLAR_USDC_ISSUER, source_amount: '6', destination_asset_type: 'native', destination_amount: '27.1234567', path: [] }
    const quote = await service.quote('u1', { ...input, assetIn: 'USDC', assetOut: 'XLM' })
    const op: any = (TransactionBuilder.fromXDR(quote.transactionXdr, Networks.PUBLIC) as Transaction).operations[0]
    expect(op.sendAsset.getIssuer()).toBe(STELLAR_USDC_ISSUER); expect(op.destAsset.isNative()).toBe(true)
    expect(quote.createsTrustline).toBe(false)
    account.balances[1].selling_liabilities = '5'
    await expect(service.quote('u1', { ...input, assetIn: 'USDC', assetOut: 'XLM' })).rejects.toMatchObject({ code: 'STELLAR_INSUFFICIENT_BALANCE' })
  })

  it('retains submitted quotes for recovery and lets their owner check after unlinking', async () => {
    const quote = await service.quote('u1', input)
    http.post.mockRejectedValue(new Error('Timeout'))
    await service.submit('u1', quote.quoteId, sign(quote))
    expect(cache.set).toHaveBeenLastCalledWith(`stellar-swap:${quote.quoteId}`, expect.objectContaining({ userId: 'u1' }), 86400)
    db.findFirst.mockResolvedValue(null)
    expect((await service.status('u1', quote.quoteId)).status).toBe('pending')
    await expect(service.status('u2', quote.quoteId)).rejects.toMatchObject({ code: 'STELLAR_QUOTE_NOT_FOUND' })
  })

})
