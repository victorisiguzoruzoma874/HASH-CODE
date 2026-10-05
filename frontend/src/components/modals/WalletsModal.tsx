import React, { useEffect, useRef, useState } from 'react'
import { useConnectWallet, useDisconnectWallet, useCurrentAccount, useWallets, useSignPersonalMessage } from '@mysten/dapp-kit'
import { Modal } from '../ui/Modal'
import { authApi, type WalletProvider, type LinkedWallet } from '../../lib/api'
import { connectExternalWallet, detectWallets, walletOptions } from '../../lib/walletConnectors'
import { useApiStore } from '../../store/useApiStore'
import { WalletBalanceDetails } from '../dashboard/ConnectedWalletBalances'

export const WalletsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const wallets = useWallets()
  const account = useCurrentAccount()
  const { mutateAsync: connectSui } = useConnectWallet()
  const { mutateAsync: signSui } = useSignPersonalMessage()
  const { mutate: disconnectSui } = useDisconnectWallet()
  const userId = useApiStore(s => s.user?.id)
  const user = useApiStore(s => s.user)
  const [links, setLinks] = useState<LinkedWallet[]>([])
  const [detected, setDetected] = useState<Partial<Record<WalletProvider, boolean>>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const inFlight = useRef(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setError(''); setNotice(''); setLoading(true)
    authApi.wallets().then(({ wallets: saved }) => { if (active) setLinks(saved) })
      .catch(err => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    detectWallets().then(result => { if (active) setDetected(result) })
    return () => { active = false }
  }, [isOpen, userId])

  const refreshLinks = async () => {
    const { user: refreshedUser } = await authApi.me()
    if (useApiStore.getState().user?.id !== userId) return
    setLinks(refreshedUser.linkedWallets ?? [])
    useApiStore.setState({ user: refreshedUser })
  }

  const link = async (provider: WalletProvider, suiWallet?: typeof wallets[number]) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(suiWallet?.name ?? provider); setError(''); setNotice('')
    try {
      let connection: { address: string; sign: (message: string) => Promise<string> }
      if (provider === 'sui' && suiWallet) {
        const result = await connectSui({ wallet: suiWallet })
        const selected = result.accounts[0]
        if (!selected) throw new Error('No Sui account selected.')
        connection = { address: selected.address, sign: async message => {
          const proof = await signSui({ message: new TextEncoder().encode(message), account: selected })
          return proof.signature
        } }
      } else if (provider !== 'sui') {
        connection = await connectExternalWallet(provider)
      } else {
        throw new Error('Choose a Sui wallet first.')
      }
      if (useApiStore.getState().user?.id !== userId) throw new Error('Your session changed. Please log in again.')
      const challenge = await authApi.walletChallenge({ provider, walletAddress: connection.address })
      const signature = await connection.sign(challenge.message)
      if (useApiStore.getState().user?.id !== userId) throw new Error('Your session changed. Please log in again.')
      await authApi.connectWallet({ challengeId: challenge.challengeId, signature })
      await refreshLinks()
      setNotice('Wallet linked to your HashPay account.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet connection was cancelled. Please try again.')
    } finally { inFlight.current = false; setBusy('') }
  }

  const unlink = async (wallet: LinkedWallet) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(wallet.id); setError(''); setNotice('')
    try {
      await authApi.unlinkWallet(wallet.id)
      if (wallet.chain === 'sui' && account?.address === wallet.address) disconnectSui()
      await refreshLinks()
      setNotice('Wallet removed from your HashPay account.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove wallet.') }
    finally { inFlight.current = false; setBusy('') }
  }

  const close = () => { if (!inFlight.current) onClose() }
  return (
    <Modal isOpen={isOpen} onClose={close} title="Connect wallets" subtitle="Link wallets to your HashPay account." width="max-w-[560px]">
      <div className="dash-stack">
        <p className="dash-grey">Choose a wallet and approve the connection, then sign a message to confirm ownership. Linking does not move funds.</p>
        {error && <div className="lp-error" role="alert">{error}</div>}
        {notice && <p role="status">{notice}</p>}
        {busy && <p role="status">{busy.length === 36 ? 'Removing wallet…' : 'Waiting for wallet approval…'}</p>}
        <div>
          <div className="lp-label">Available wallets</div>
          <div className="dash-wallet-options">
            {walletOptions.map(option => (
              <div className="dash-wallet-option" key={option.id}>
                <button className="lp-btn" disabled={!!busy || loading} onClick={() => link(option.id)}>
                  <b>{option.name}</b><span>{option.network}</span>
                </button>
                {detected[option.id] === false && <a className="lp-link" href={option.install} target="_blank" rel="noopener noreferrer">Install {option.name}</a>}
              </div>
            ))}
            {wallets.map(wallet => (
              <div className="dash-wallet-option" key={wallet.name}>
                <button className="lp-btn" disabled={!!busy || loading} onClick={() => link('sui', wallet)}>
                  <b>{wallet.name}</b><span>Sui</span>
                </button>
              </div>
            ))}
            {wallets.length === 0 && <div className="dash-wallet-option"><span>Sui wallet</span><a className="lp-link" href="https://suiet.app/" target="_blank" rel="noopener noreferrer">Install a Sui wallet</a></div>}
          </div>
        </div>
        <div>
          <div className="lp-label">Linked to your account</div>
          {loading ? <p role="status">Loading wallets…</p> : links.length === 0 ? <p className="dash-grey">No verified wallet links yet.</p> : (
            <ul className="dash-linked-wallets">
              {links.map(wallet => <li key={wallet.id}>
                <div><b>{walletOptions.find(o => o.id === wallet.provider)?.name ?? 'Sui wallet'}</b> <span className="dash-meta">{wallet.chain}</span><div className="dash-wallet-address">{wallet.address}</div><WalletBalanceDetails wallet={wallet} /></div>
                <button className="lp-btn small" disabled={!!busy} onClick={() => unlink(wallet)} aria-label={`Remove ${wallet.provider} wallet ${wallet.address}`}>Remove</button>
              </li>)}
            </ul>
          )}
        </div>
        {((user?.suiAddress && !links.some(w => w.address === user.suiAddress)) || (user?.evmAddress && !links.some(w => w.address.toLowerCase() === user.evmAddress?.toLowerCase()))) &&
          <p className="dash-grey">Previously saved wallet addresses need a new signature to appear as verified links.</p>}
      </div>
    </Modal>
  )
}
