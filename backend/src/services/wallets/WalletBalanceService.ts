import axios from 'axios'
import { formatUnits, Interface } from 'ethers'
import { prisma } from '../../config/database'
import { cacheGet, cacheSet } from '../../config/redis'
import { AppError } from '../../middleware/errorHandler'

export const balanceNetworks = {
  evm: [{ id: 'ethereum', label: 'Ethereum mainnet' }, { id: 'base', label: 'Base mainnet' }, { id: 'arbitrum', label: 'Arbitrum mainnet' }, { id: 'sepolia', label: 'Ethereum Sepolia (testnet)' }],
  sui: [{ id: 'mainnet', label: 'Sui mainnet' }, { id: 'testnet', label: 'Sui testnet' }],
  stellar: [{ id: 'mainnet', label: 'Stellar mainnet' }, { id: 'testnet', label: 'Stellar testnet' }],
  solana: [{ id: 'mainnet', label: 'Solana mainnet' }, { id: 'devnet', label: 'Solana devnet' }],
} as const
type Chain = keyof typeof balanceNetworks
interface TokenIndexPage { items: any[]; next_page_params?: Record<string, unknown> | null }
export interface WalletAssetBalance {
  id: string; symbol: string; amount: string; decimals: number | null
}
export interface WalletBalances {
  walletId: string; network: string; networkLabel: string; assets: WalletAssetBalance[]
  checkedAt: string; warnings: string[]; coverage: string
}
const erc20 = new Interface(['function balanceOf(address) view returns (uint256)'])
const evmNetworks: Record<string, { chainId: string; rpc: string; env: string; usdc: string }> = {
  ethereum: { chainId: '0x1', rpc: 'https://ethereum-rpc.publicnode.com', env: 'WALLET_ETH_RPC_URL', usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
  base: { chainId: '0x2105', rpc: 'https://mainnet.base.org', env: 'WALLET_BASE_RPC_URL', usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' },
  arbitrum: { chainId: '0xa4b1', rpc: 'https://arb1.arbitrum.io/rpc', env: 'WALLET_ARBITRUM_RPC_URL', usdc: '0xaf88d065e77c8cc2239327c5edb3a432268e5831' },
  sepolia: { chainId: '0xaa36a7', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', env: 'WALLET_SEPOLIA_RPC_URL', usdc: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238' },
}
const TOKEN_PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const evmExplorers: Record<string, string> = {
  ethereum: 'https://eth.blockscout.com', base: 'https://base.blockscout.com',
  arbitrum: 'https://arbitrum.blockscout.com', sepolia: 'https://eth-sepolia.blockscout.com',
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const { data } = await axios.post(url, { jsonrpc: '2.0', id: 1, method, params }, { timeout: 10_000 })
  if (data.error || data.result === undefined || data.result === null) throw new Error('Balance provider failed')
  return data.result as T
}
function quantity(raw: string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255 || !/^\d+$/.test(raw)) throw new Error('Invalid token amount')
  return formatUnits(BigInt(raw), decimals)
}

export class WalletBalanceService {
  private pending = new Map<string, Promise<WalletBalances>>()

  async get(userId: string, walletId: string, requestedNetwork?: string): Promise<WalletBalances> {
    const wallet = await prisma.linkedWallet.findFirst({ where: { id: walletId, userId } })
    if (!wallet) throw new AppError(404, 'Wallet link not found.', 'WALLET_NOT_FOUND')
    const chain = wallet.chain as Chain
    const options = balanceNetworks[chain]
    if (!options) throw new AppError(400, 'Unsupported wallet network.', 'INVALID_WALLET_NETWORK')
    const network = requestedNetwork ?? options[0].id
    const selected = options.find(option => option.id === network)
    if (!selected) throw new AppError(400, 'Select a supported network for this wallet.', 'INVALID_WALLET_NETWORK')
    const key = `wallet-balance:${chain}:${network}:${wallet.address}`
    try {
      const cached = await cacheGet<Omit<WalletBalances, 'walletId'>>(key)
      if (cached) return { ...cached, walletId }
    } catch { /* A cache outage must not block a read from the chain. */ }
    const running = this.pending.get(key)
    if (running) return { ...await running, walletId }
    const read = this.read(chain, network, wallet.address).then(async result => {
      const balance: WalletBalances = { ...result, walletId, network, networkLabel: selected.label, checkedAt: new Date().toISOString() }
      try { await cacheSet(key, balance, 15) } catch { /* best-effort cache */ }
      return balance
    }).catch(() => {
      throw new AppError(503, 'Wallet balances are temporarily unavailable on this network. Try refreshing shortly.', 'WALLET_BALANCE_UNAVAILABLE')
    }).finally(() => { this.pending.delete(key) })
    this.pending.set(key, read)
    return read
  }

  private async read(chain: Chain, network: string, address: string): Promise<Pick<WalletBalances, 'assets' | 'warnings' | 'coverage'>> {
    switch (chain) {
      case 'evm': return this.evm(network, address)
      case 'stellar': return this.stellar(network, address)
      case 'solana': return this.solana(network, address)
      case 'sui': return this.sui(network as 'mainnet' | 'testnet', address)
    }
  }

  private async evm(network: string, address: string) {
    const config = evmNetworks[network]
    const url = process.env[config.env] ?? config.rpc
    const chainId = await rpc<string>(url, 'eth_chainId', [])
    if (BigInt(chainId) !== BigInt(config.chainId)) throw new Error('RPC network mismatch')
    const results = await Promise.allSettled([
      rpc<string>(url, 'eth_getBalance', [address, 'latest']),
      rpc<string>(url, 'eth_call', [{ to: config.usdc, data: erc20.encodeFunctionData('balanceOf', [address]) }, 'latest']),
      this.indexedEvmTokens(network, address),
    ])
    const assets: WalletAssetBalance[] = []
    const warnings: string[] = []
    results.slice(0, 2).forEach((result, index) => {
      const symbol = index === 0 ? 'ETH' : 'USDC'
      if (result.status === 'rejected') { warnings.push(`${symbol} balance could not be loaded.`); return }
      try {
        if (typeof result.value !== 'string' || !/^0x[0-9a-f]+$/i.test(result.value)) throw new Error('Invalid RPC balance')
        const raw = BigInt(result.value)
        if (raw < 0n) throw new Error('Negative balance')
        assets.push({ id: index === 0 ? 'native' : config.usdc, symbol, decimals: index === 0 ? 18 : 6, amount: formatUnits(raw, index === 0 ? 18 : 6) })
      } catch { warnings.push(`${symbol} balance could not be loaded.`) }
    })
    const indexed = results[2]
    if (indexed.status === 'fulfilled') {
      const extra = indexed.value as { assets: WalletAssetBalance[]; warnings: string[] }
      for (const asset of extra.assets) {
        if (!assets.some(existing => existing.id === asset.id)) assets.push(asset)
      }
      warnings.push(...extra.warnings)
    } else warnings.push('Other ERC-20 token balances could not be loaded; only successful ETH/USDC reads are shown.')
    if (!assets.length) throw new Error('No balance reads succeeded')
    return { assets, warnings, coverage: 'ETH and native USDC are read from the chain; other ERC-20 holdings are indexed by Blockscout and may lag. Staking, DeFi positions and other networks are not included.' }
  }

  private async indexedEvmTokens(network: string, address: string) {
    const assets: WalletAssetBalance[] = []
    const warnings: string[] = []
    let nextPage: Record<string, unknown> | null = null
    const deadline = AbortSignal.timeout(12_000)
    for (let page = 0; page < 2; page++) {
      const { data }: { data: TokenIndexPage } = await axios.get<TokenIndexPage>(`${evmExplorers[network]}/api/v2/addresses/${address}/tokens`, {
        params: Object.assign({}, nextPage, { type: 'ERC-20' }), timeout: 6000, signal: deadline,
      })
      if (!Array.isArray(data.items)) throw new Error('Invalid token index response')
      for (const row of data.items.slice(0, 50)) {
        try {
          const id = row.token.address_hash.toLowerCase()
          if (!/^0x[0-9a-f]{40}$/.test(id) || row.token.type !== 'ERC-20') throw new Error('Invalid token address')
          if (typeof row.value !== 'string' || !/^\d+$/.test(row.value)) throw new Error('Invalid indexed token amount')
          const raw = BigInt(row.value)
          if (raw <= 0n) continue
          const decimals = row.token.decimals === null || row.token.decimals === undefined ? null : Number(row.token.decimals)
          const amount = decimals === null ? raw.toString() : quantity(raw.toString(), decimals)
          if (decimals === null) warnings.push('Some token decimals are unavailable; those amounts use raw units.')
          if (!assets.some(asset => asset.id === id)) {
            assets.push({ id, symbol: typeof row.token.symbol === 'string' && row.token.symbol ? row.token.symbol : `${id.slice(0, 6)}…${id.slice(-4)}`, amount, decimals })
          }
        } catch { warnings.push('An indexed ERC-20 balance could not be decoded.') }
      }
      nextPage = data.next_page_params ?? null
      if (!nextPage) break
    }
    if (nextPage) warnings.push('Only the first 100 indexed ERC-20 holdings are shown.')
    return { assets, warnings: [...new Set(warnings)] }
  }

  private async stellar(network: string, address: string) {
    const url = network === 'mainnet' ? process.env.WALLET_STELLAR_HORIZON_URL ?? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org'
    try {
      const { data } = await axios.get(`${url.replace(/\/$/, '')}/accounts/${address}`, { timeout: 10_000 })
      if (!Array.isArray(data.balances)) throw new Error('Invalid Stellar response')
      const assets: WalletAssetBalance[] = data.balances.filter((b: any) => b.asset_type !== 'liquidity_pool_shares').map((b: any) => {
        if (typeof b.balance !== 'string' || !/^\d+(\.\d+)?$/.test(b.balance)) throw new Error('Invalid Stellar balance')
        return { id: b.asset_type === 'native' ? 'native' : `${b.asset_code}:${b.asset_issuer}`, symbol: b.asset_type === 'native' ? 'XLM' : b.asset_code, amount: b.balance, decimals: 7 }
      })
      return { assets, warnings: [] as string[], coverage: 'XLM and issued-asset balances. Reserves, liabilities and liquidity-pool positions are not spendable cash.' }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { assets: [{ id: 'native', symbol: 'XLM', amount: '0.0000000', decimals: 7 }], warnings: ['This Stellar account is not funded on the selected network.'], coverage: 'XLM and issued-asset balances.' }
      }
      throw error
    }
  }

  private async solana(network: string, address: string) {
    const url = network === 'mainnet' ? process.env.WALLET_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com'
    const results = await Promise.allSettled([
      rpc<{ value: number }>(url, 'getBalance', [address, { commitment: 'confirmed' }]),
      ...TOKEN_PROGRAMS.map(programId => rpc<{ value: any[] }>(url, 'getTokenAccountsByOwner', [address, { programId }, { encoding: 'jsonParsed', commitment: 'confirmed' }])),
    ])
    const assets: WalletAssetBalance[] = []
    const warnings: string[] = []
    const native = results[0]
    if (native.status === 'fulfilled' && Number.isSafeInteger((native.value as { value: number }).value) && (native.value as { value: number }).value >= 0) {
      assets.push({ id: 'native', symbol: 'SOL', amount: quantity(String((native.value as { value: number }).value), 9), decimals: 9 })
    } else warnings.push('SOL balance could not be loaded accurately.')
    const tokens = new Map<string, { raw: bigint; decimals: number }>()
    for (const result of results.slice(1)) {
      if (result.status === 'rejected') { warnings.push('Some Solana token balances could not be loaded.'); continue }
      const rows = (result.value as { value: any[] }).value
      if (!Array.isArray(rows)) { warnings.push('Some Solana token balances could not be loaded.'); continue }
      for (const row of rows) {
        try {
          const info = row.account.data.parsed.info
          if (typeof info.tokenAmount.amount !== 'string' || !/^\d+$/.test(info.tokenAmount.amount)) throw new Error('Invalid Solana token amount')
          const raw = BigInt(info.tokenAmount.amount)
          const decimals = info.tokenAmount.decimals
          quantity(raw.toString(), decimals)
          const previous = tokens.get(info.mint)
          if (previous && previous.decimals !== decimals) throw new Error('Token decimals mismatch')
          tokens.set(info.mint, { raw: raw + (previous?.raw ?? 0n), decimals })
        } catch { warnings.push('A Solana token balance could not be decoded.') }
      }
    }
    for (const [mint, token] of tokens) {
      if (token.raw === 0n) continue
      assets.push({ id: mint, symbol: mint === SOLANA_USDC && network === 'mainnet' ? 'USDC' : `${mint.slice(0, 5)}…${mint.slice(-4)}`, amount: quantity(token.raw.toString(), token.decimals), decimals: token.decimals })
    }
    if (!assets.length && warnings.length) throw new Error('No balances loaded')
    return { assets, warnings: [...new Set(warnings)], coverage: 'SOL and SPL token-account balances, including Token-2022. Unknown tokens use their mint address. Collectibles are not valued; staking and DeFi positions are not included.' }
  }

  private async sui(network: 'mainnet' | 'testnet', address: string) {
    const url = process.env[`WALLET_SUI_${network.toUpperCase()}_GRAPHQL_URL`] ?? `https://graphql.${network}.sui.io/graphql`
    const { data } = await axios.post(url, {
      query: `query WalletBalances($owner: SuiAddress!) {
        address(address: $owner) {
          nativeBalance: balance(coinType: "0x2::sui::SUI") { totalBalance }
          balances(first: 50) {
            pageInfo { hasNextPage }
            nodes { coinType { repr } totalBalance }
          }
        }
      }`,
      variables: { owner: address },
    }, { timeout: 15_000 })
    const account = data.data?.address
    if (data.errors?.length || !account || !Array.isArray(account.balances?.nodes)) throw new Error('Invalid Sui balance response')
    const assets: WalletAssetBalance[] = [{ id: '0x2::sui::SUI', symbol: 'SUI', amount: quantity(account.nativeBalance?.totalBalance, 9), decimals: 9 }]
    const warnings: string[] = []
    const types: string[] = account.balances.nodes.map((coin: any) => coin.coinType?.repr).filter((type: unknown): type is string => typeof type === 'string' && !/^(0x)?0*2::sui::SUI$/.test(type))
    let metadataByIndex: Record<string, any> = {}
    if (types.length) {
      try {
        const variables = Object.fromEntries(types.map((type, index) => [`type${index}`, type]))
        const query = `query Metadata(${types.map((_, index) => `$type${index}: String!`).join(', ')}) { ${types.map((_, index) => `coin${index}: coinMetadata(coinType: $type${index}) { decimals symbol }`).join(' ')} }`
        const response = await axios.post(url, { query, variables }, { timeout: 10_000 })
        metadataByIndex = response.data.data ?? {}
      } catch { /* Balances remain available as explicitly labelled raw units. */ }
    }
    for (const coin of account.balances.nodes) {
      const id = coin.coinType?.repr
      if (typeof id !== 'string' || typeof coin.totalBalance !== 'string' || !/^\d+$/.test(coin.totalBalance)) throw new Error('Invalid Sui coin balance')
      if (/^(0x)?0*2::sui::SUI$/.test(id) || BigInt(coin.totalBalance) === 0n) continue
      const metadata = metadataByIndex[`coin${types.indexOf(id)}`]
      if (metadata && typeof metadata.symbol === 'string' && Number.isInteger(metadata.decimals) && metadata.decimals >= 0 && metadata.decimals <= 255) {
        assets.push({ id, symbol: metadata.symbol, amount: quantity(coin.totalBalance, metadata.decimals), decimals: metadata.decimals })
      } else {
        warnings.push('Some Sui coin metadata is unavailable; those amounts are shown in raw units.')
        assets.push({ id, symbol: id.split('::').pop() ?? 'Unknown coin', amount: coin.totalBalance, decimals: null })
      }
    }
    if (account.balances.pageInfo?.hasNextPage) warnings.push('Only the first 50 coin types are shown, alongside the native SUI balance.')
    return { assets, warnings: [...new Set(warnings)], coverage: 'SUI and coin balances, including address balance accumulators, read through GraphQL. NFTs, staking and DeFi positions are not included.' }
  }
}
