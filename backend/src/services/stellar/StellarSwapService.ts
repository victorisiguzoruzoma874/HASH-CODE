import axios from 'axios'
import { randomUUID } from 'crypto'
import { Account, Asset, Keypair, Networks, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk'
import { prisma } from '../../config/database'
import { cacheGet, cacheSet } from '../../config/redis'
import { AppError } from '../../middleware/errorHandler'

export const STELLAR_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
const usdc = new Asset('USDC', STELLAR_USDC_ISSUER)
const scale = 10_000_000n
function units(value: string): bigint {
  if (typeof value !== 'string' || !/^\d+(\.\d{1,7})?$/.test(value)) throw new AppError(400, 'Use a positive amount with at most 7 decimal places.', 'INVALID_AMOUNT')
  const [whole, fraction = ''] = value.split('.')
  const raw = BigInt(whole) * scale + BigInt(fraction.padEnd(7, '0'))
  if (raw > 9223372036854775807n) throw new AppError(400, 'Amount exceeds the Stellar limit.', 'INVALID_AMOUNT')
  return raw
}
function amount(raw: bigint): string { return `${raw / scale}.${(raw % scale).toString().padStart(7, '0')}` }
export interface StellarSwapQuote {
  quoteId: string; walletId: string; address: string; provider: string; network: 'mainnet'
  assetIn: string; assetOut: string; amountIn: string; amountOut: string; minOut: string
  feeXlm: string; reserveXlm: string; createsTrustline: boolean; usdcIssuer: string
  expiresAt: string; transactionXdr: string; transactionHash: string; networkPassphrase: string
}
interface StoredQuote extends StellarSwapQuote { userId: string }
export interface StellarSwapResult { status: 'confirmed' | 'pending' | 'failed' | 'expired'; transactionHash: string; network: 'mainnet' }

export class StellarSwapService {
  private get url() { return (process.env.WALLET_STELLAR_HORIZON_URL ?? 'https://horizon.stellar.org').replace(/\/$/, '') }
  private async wallet(userId: string, walletId: string) {
    const wallet = await prisma.linkedWallet.findFirst({ where: { id: walletId, userId, chain: 'stellar' } })
    if (!wallet || !['freighter', 'lobstr'].includes(wallet.provider)) throw new AppError(404, 'Connect a verified Freighter or LOBSTR wallet first.', 'STELLAR_WALLET_REQUIRED')
    return wallet
  }
  private async network() {
    const { data } = await axios.get(this.url, { timeout: 10_000 })
    if (data.network_passphrase !== Networks.PUBLIC) throw new AppError(503, 'The Stellar provider is not on mainnet.', 'STELLAR_NETWORK_MISMATCH')
  }
  async quote(userId: string, input: { walletId: string; assetIn: string; assetOut: string; amountIn: string }): Promise<StellarSwapQuote> {
    if (!['XLM', 'USDC'].includes(input.assetIn) || !['XLM', 'USDC'].includes(input.assetOut) || input.assetIn === input.assetOut) throw new AppError(400, 'Stellar swaps support XLM and Circle USDC on Stellar.', 'UNSUPPORTED_STELLAR_PAIR')
    const raw = units(input.amountIn)
    if (raw <= 0n) throw new AppError(400, 'Enter an amount greater than zero.', 'INVALID_AMOUNT')
    const wallet = await this.wallet(userId, input.walletId)
    await this.network()
    const [accountResponse, ledgerResponse, feesResponse] = await Promise.all([
      axios.get(`${this.url}/accounts/${wallet.address}`, { timeout: 10_000 }).catch(error => {
        if (error.response?.status === 404) throw new AppError(400, 'Fund this Stellar account with XLM first.', 'STELLAR_UNFUNDED')
        throw error
      }),
      axios.get(`${this.url}/ledgers`, { params: { order: 'desc', limit: 1 }, timeout: 10_000 }),
      axios.get(`${this.url}/fee_stats`, { timeout: 10_000 }),
    ])
    const account = accountResponse.data
    const signer = account.signers?.find((s: any) => s.key === wallet.address && s.type === 'ed25519_public_key')
    if (!signer || signer.weight < Math.max(account.thresholds?.med_threshold ?? 1, 1)) throw new AppError(400, 'This account requires additional signatures. Multisignature swaps are not supported yet.', 'STELLAR_MULTISIG')
    const native = account.balances.find((b: any) => b.asset_type === 'native')
    const line = account.balances.find((b: any) => b.asset_code === 'USDC' && b.asset_issuer === STELLAR_USDC_ISSUER)
    if (line && !line.is_authorized) throw new AppError(400, 'The Circle USDC trustline is not authorized.', 'STELLAR_TRUSTLINE_UNAUTHORIZED')
    if (input.assetIn === 'USDC' && (!line || units(line.balance) - units(line.selling_liabilities ?? '0') < raw)) throw new AppError(400, 'Not enough Circle USDC on Stellar in this wallet.', 'STELLAR_INSUFFICIENT_BALANCE')
    const createsTrustline = input.assetOut === 'USDC' && !line
    const reservePerEntry = BigInt(ledgerResponse.data._embedded.records[0].base_reserve_in_stroops)
    const entries = 2 + account.subentry_count + (account.num_sponsoring ?? 0) - (account.num_sponsored ?? 0) + (createsTrustline ? 1 : 0)
    const reserve = BigInt(entries) * reservePerEntry
    const feePerOperation = BigInt(feesResponse.data.fee_charged.p95)
    // A surprising provider fee must not turn a small swap into an expensive one.
    if (feePerOperation < 100n || feePerOperation > 100_000n) throw new AppError(503, 'Stellar fees are unusually high. Try again shortly.', 'STELLAR_FEE_UNAVAILABLE')
    const fee = feePerOperation * (createsTrustline ? 2n : 1n)
    const spend = input.assetIn === 'XLM' ? raw : 0n
    if (!native || units(native.balance) - units(native.selling_liabilities ?? '0') < reserve + fee + spend) throw new AppError(400, 'Not enough available XLM after the network fee and account reserve.', 'STELLAR_INSUFFICIENT_XLM')
    const sendAsset = input.assetIn === 'XLM' ? Asset.native() : usdc
    const destAsset = input.assetOut === 'XLM' ? Asset.native() : usdc
    const { data } = await axios.get(`${this.url}/paths/strict-send`, { timeout: 10_000, params: {
      source_asset_type: sendAsset.isNative() ? 'native' : 'credit_alphanum4',
      ...(sendAsset.isNative() ? {} : { source_asset_code: 'USDC', source_asset_issuer: STELLAR_USDC_ISSUER }),
      source_amount: amount(raw), destination_assets: destAsset.isNative() ? 'native' : `USDC:${STELLAR_USDC_ISSUER}`,
    } })
    const paths = (data._embedded?.records ?? []).filter((p: any) =>
      (destAsset.isNative() ? p.destination_asset_type === 'native' : p.destination_asset_code === 'USDC' && p.destination_asset_issuer === STELLAR_USDC_ISSUER) &&
      (sendAsset.isNative() ? p.source_asset_type === 'native' : p.source_asset_code === 'USDC' && p.source_asset_issuer === STELLAR_USDC_ISSUER) && units(p.source_amount) === raw)
    paths.sort((a: any, b: any) => units(a.destination_amount) > units(b.destination_amount) ? -1 : 1)
    const path = paths[0]
    if (!path) throw new AppError(409, 'No Stellar exchange route has enough liquidity for this amount.', 'STELLAR_NO_LIQUIDITY')
    const expected = units(path.destination_amount)
    const minimum = expected * 9950n / 10_000n
    if (minimum <= 0n) throw new AppError(400, 'This amount is too small to swap.', 'INVALID_AMOUNT')
    if (input.assetOut === 'USDC' && line && units(line.limit) - units(line.balance) - units(line.buying_liabilities ?? '0') < expected) throw new AppError(400, 'Increase the USDC trustline limit in your wallet first.', 'STELLAR_TRUSTLINE_LIMIT')
    const expires = Math.floor(Date.now() / 1000) + 90
    const builder = new TransactionBuilder(new Account(wallet.address, account.sequence), { fee: feePerOperation.toString(), networkPassphrase: Networks.PUBLIC, timebounds: { minTime: 0, maxTime: expires } })
    if (createsTrustline) builder.addOperation(Operation.changeTrust({ asset: usdc }))
    builder.addOperation(Operation.pathPaymentStrictSend({ sendAsset, sendAmount: amount(raw), destination: wallet.address, destAsset, destMin: amount(minimum), path: path.path.map((a: any) => a.asset_type === 'native' ? Asset.native() : new Asset(a.asset_code, a.asset_issuer)) }))
    const tx = builder.build()
    const quote: StoredQuote = {
      userId, quoteId: randomUUID(), walletId: wallet.id, address: wallet.address, provider: wallet.provider, network: 'mainnet',
      assetIn: input.assetIn, assetOut: input.assetOut, amountIn: amount(raw), amountOut: amount(expected), minOut: amount(minimum),
      feeXlm: amount(fee), reserveXlm: amount(createsTrustline ? reservePerEntry : 0n), createsTrustline,
      usdcIssuer: STELLAR_USDC_ISSUER, expiresAt: new Date(expires * 1000).toISOString(),
      transactionXdr: tx.toXDR(), transactionHash: Buffer.from(tx.hash()).toString('hex'), networkPassphrase: Networks.PUBLIC,
    }
    await cacheSet(`stellar-swap:${quote.quoteId}`, quote, 600)
    const { userId: _owner, ...publicQuote } = quote
    return publicQuote
  }
  private async stored(userId: string, quoteId: string, requireLink = true) {
    const quote = await cacheGet<StoredQuote>(`stellar-swap:${quoteId}`)
    if (!quote || quote.userId !== userId) throw new AppError(404, 'Swap quote not found. Request a new quote.', 'STELLAR_QUOTE_NOT_FOUND')
    if (requireLink) {
      const wallet = await this.wallet(userId, quote.walletId)
      if (wallet.address !== quote.address) throw new AppError(409, 'Wallet link changed. Request a new quote.', 'STELLAR_WALLET_CHANGED')
    }
    return quote
  }
  private async lookup(quote: StoredQuote): Promise<StellarSwapResult> {
    try {
      const { data } = await axios.get(`${this.url}/transactions/${quote.transactionHash}`, { timeout: 10_000 })
      if (data.hash !== quote.transactionHash || typeof data.successful !== 'boolean') throw new Error('Invalid confirmation')
      return { status: data.successful ? 'confirmed' : 'failed', transactionHash: quote.transactionHash, network: 'mainnet' }
    } catch (error: any) {
      if (error.response?.status !== 404) throw error
      return { status: 'pending', transactionHash: quote.transactionHash, network: 'mainnet' }
    }
  }
  async status(userId: string, quoteId: string) {
    const quote = await this.stored(userId, quoteId, false)
    await this.network()
    const result = await this.lookup(quote)
    if (result.status === 'pending' && Date.now() > Date.parse(quote.expiresAt)) {
      const { data } = await axios.get(`${this.url}/ledgers`, { params: { order: 'desc', limit: 1 }, timeout: 10_000 })
      // Horizon has ingested a ledger beyond the time bound: the transaction
      // cannot be included later. Re-read its hash after that ledger check.
      const closedAt = Date.parse(data._embedded?.records?.[0]?.closed_at)
      if (closedAt > Date.parse(quote.expiresAt)) {
        const final = await this.lookup(quote)
        return final.status === 'pending' ? { ...final, status: 'expired' as const } : final
      }
    }
    return result
  }
  async submit(userId: string, quoteId: string, signedXdr: string): Promise<StellarSwapResult> {
    const quote = await this.stored(userId, quoteId)
    let tx: Transaction
    try {
      const parsed = TransactionBuilder.fromXDR(signedXdr, Networks.PUBLIC)
      if (!(parsed instanceof Transaction) || Buffer.from(parsed.hash()).toString('hex') !== quote.transactionHash) throw new Error('Changed transaction')
      tx = parsed
      const key = Keypair.fromPublicKey(quote.address)
      if (!tx.signatures.some(sig => key.verify(tx.hash(), sig.signature))) throw new Error('Missing owner signature')
    } catch { throw new AppError(400, 'The signed transaction does not match this swap and wallet.', 'STELLAR_INVALID_SIGNATURE') }
    await this.network()
    const existing = await this.lookup(quote)
    if (existing.status !== 'pending') return existing
    if (Date.now() >= Date.parse(quote.expiresAt)) throw new AppError(409, 'This swap quote expired. Refresh it and approve again.', 'STELLAR_QUOTE_EXPIRED')
    // Keep reconciliation available after the short signing window, including
    // when the user navigates away or temporarily unlinks their wallet.
    await cacheSet(`stellar-swap:${quote.quoteId}`, quote, 86_400)
    try {
      const { data } = await axios.post(`${this.url}/transactions`, new URLSearchParams({ tx: tx.toXDR() }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20_000 })
      if (data.hash !== quote.transactionHash || data.successful !== true) throw new Error('Unexpected submission response')
      return { status: 'confirmed', transactionHash: quote.transactionHash, network: 'mainnet' }
    } catch (error: any) {
      // Reconcile first: a lost response is not evidence that funds did not move.
      const result = await this.lookup(quote).catch(() => ({ status: 'pending' as const, transactionHash: quote.transactionHash, network: 'mainnet' as const }))
      if (result.status !== 'pending') return result
      return result
    }
  }
}
