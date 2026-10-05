import React, { useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi, type LinkedWallet } from '../../lib/api'
import { useApiStore } from '../../store/useApiStore'
import { useStore } from '../../store/useStore'
import { walletOptions } from '../../lib/walletConnectors'

export function displayCryptoAmount(amount: string): string {
  const [whole, fraction] = amount.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const trimmed = fraction?.replace(/0+$/, '')
  return trimmed ? `${grouped}.${trimmed}` : grouped
}

export const WalletBalanceDetails: React.FC<{ wallet: LinkedWallet }> = ({ wallet }) => {
  const userId = useApiStore(s => s.user?.id)
  const selectId = useId()
  const walletKey = `${userId}:${wallet.id}`
  const network = useStore(s => s.walletNetworks[walletKey] ?? (wallet.chain === 'evm' ? 'ethereum' : 'mainnet'))
  const selectWalletNetwork = useStore(s => s.selectWalletNetwork)
  const options = useQuery({
    queryKey: ['wallet-networks', userId], queryFn: authApi.walletNetworks,
    enabled: !!userId, staleTime: Infinity, retry: 1,
  })
  const balance = useQuery({
    queryKey: ['linked-wallet-balance', userId, wallet.id, network],
    queryFn: () => authApi.walletBalances(wallet.id, network), enabled: !!userId,
    staleTime: 15_000, refetchInterval: 30_000, retry: 1,
  })
  return (
    <div className="dash-wallet-balance">
      <div className="dash-wallet-balance-controls">
        <label htmlFor={selectId}>Network</label>
        <select id={selectId} className="lp-input" value={network} onChange={e => selectWalletNetwork(walletKey, e.target.value)}>
          {(options.data?.networks[wallet.chain] ?? [{ id: network, label: wallet.chain === 'evm' ? 'Ethereum mainnet' : `${wallet.chain} mainnet` }]).map(option => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <button className="lp-btn small" disabled={balance.isFetching} onClick={() => balance.refetch()} aria-label={`Refresh ${wallet.provider} wallet balance`}>
          {balance.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {options.isError && <p className="dash-red" role="status">Network options unavailable. <button className="lp-link" onClick={() => options.refetch()}>Retry</button></p>}
      {balance.isPending && <p className="dash-grey" role="status">Loading wallet balances…</p>}
      {balance.isError && <p className="dash-red" role="status">{balance.data ? 'Refresh failed. Showing last retrieved balances.' : 'Balance unavailable. Please try refreshing.'}</p>}
      {balance.data && <>
        {balance.data.assets.length === 0 ? <p className="dash-grey">No token balances found on this network.</p> : (
          <ul className="dash-wallet-assets">
            {balance.data.assets.map(asset => <li key={asset.id}>
              <div><b>{asset.symbol}</b>{asset.id !== 'native' && <details><summary>Asset ID</summary><span className="dash-wallet-address">{asset.id}</span></details>}</div>
              <div className="dash-wallet-quantity">{displayCryptoAmount(asset.amount)}{asset.decimals === null && <small> raw units</small>}</div>
            </li>)}
          </ul>
        )}
        {['testnet', 'devnet', 'sepolia'].includes(network) && <p className="dash-grey">Testnet balances have no cash value.</p>}
        {balance.data.warnings.map(warning => <p className="dash-red" key={warning} role="status">{warning}</p>)}
        <p className="dash-meta">Updated {new Date(balance.data.checkedAt).toLocaleString()}</p>
        <p className="dash-wallet-coverage">{balance.data.coverage}</p>
      </>}
    </div>
  )
}

export const ConnectedWalletBalances: React.FC = () => {
  const links = useApiStore(s => s.user?.linkedWallets)
  return (
    <section className="dash-card" aria-label="Connected wallet balances">
      <header><h2>Connected wallet balances</h2></header>
      {!links?.length ? <p className="dash-empty">Use Connect wallet in the menu to link a wallet and see its balances.</p> : links.map(wallet => (
        <div className="dash-wallet-holding" key={wallet.id}>
          <b>{walletOptions.find(option => option.id === wallet.provider)?.name ?? 'Sui wallet'}</b>
          <div className="dash-wallet-address">{wallet.address}</div>
          <WalletBalanceDetails wallet={wallet} />
        </div>
      ))}
    </section>
  )
}
