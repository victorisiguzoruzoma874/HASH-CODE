import * as freighter from '@stellar/freighter-api'
import * as lobstr from '@lobstrco/signer-extension-api'
import type { WalletProvider } from './api'

interface EvmProvider {
  isMetaMask?: boolean
  isPhantom?: boolean
  providers?: EvmProvider[]
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}
interface PhantomProvider {
  isPhantom?: boolean
  connect(): Promise<{ publicKey: { toString(): string } }>
  signMessage(message: Uint8Array, display: 'utf8'): Promise<{ signature: Uint8Array; publicKey: { toString(): string } }>
}
type WalletWindow = Window & {
  ethereum?: EvmProvider
  phantom?: { solana?: PhantomProvider }
}
const announcedProviders = new Map<string, EvmProvider>()
window.addEventListener('eip6963:announceProvider', ((event: CustomEvent<{ info: { rdns: string }; provider: EvmProvider }>) => {
  announcedProviders.set(event.detail.info.rdns, event.detail.provider)
}) as EventListener)
window.dispatchEvent(new Event('eip6963:requestProvider'))

function metamask(): EvmProvider | undefined {
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  const announced = announcedProviders.get('io.metamask')
  if (announced) return announced
  const ethereum = (window as WalletWindow).ethereum
  return (ethereum?.providers ?? (ethereum ? [ethereum] : [])).find(p => p.isMetaMask && !p.isPhantom)
}

export const walletOptions = [
  { id: 'freighter', name: 'Freighter', network: 'Stellar', install: 'https://www.freighter.app/' },
  { id: 'lobstr', name: 'LOBSTR', network: 'Stellar', install: 'https://lobstr.co/signer-extension/' },
  { id: 'metamask', name: 'MetaMask', network: 'Ethereum / EVM', install: 'https://metamask.io/download/' },
  { id: 'phantom', name: 'Phantom', network: 'Solana', install: 'https://phantom.com/download' },
] as const

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
}

export async function detectWallets(): Promise<Partial<Record<WalletProvider, boolean>>> {
  const [freighterState, lobstrState] = await Promise.allSettled([freighter.isConnected(), lobstr.isConnected()])
  return {
    metamask: !!metamask(),
    phantom: !!(window as WalletWindow).phantom?.solana?.isPhantom,
    freighter: freighterState.status === 'fulfilled' && freighterState.value.isConnected,
    lobstr: lobstrState.status === 'fulfilled' && lobstrState.value,
  }
}

export async function connectExternalWallet(provider: Exclude<WalletProvider, 'sui'>): Promise<{
  address: string; sign: (message: string) => Promise<string>
}> {
  switch (provider) {
    case 'metamask': {
      const wallet = metamask()
      if (!wallet) throw new Error('Install MetaMask or open HashPay in its browser, then try again.')
      const accounts = await wallet.request({ method: 'eth_requestAccounts' }) as string[]
      const address = accounts[0]
      if (!address) throw new Error('No MetaMask account selected.')
      return { address, sign: async message => {
        const current = await wallet.request({ method: 'eth_accounts' }) as string[]
        if (current[0]?.toLowerCase() !== address.toLowerCase()) throw new Error('Wallet account changed. Please connect again.')
        const hex = '0x' + Array.from(new TextEncoder().encode(message), b => b.toString(16).padStart(2, '0')).join('')
        return await wallet.request({ method: 'personal_sign', params: [hex, address] }) as string
      } }
    }
    case 'phantom': {
      const wallet = (window as WalletWindow).phantom?.solana
      if (!wallet?.isPhantom) throw new Error('Install Phantom or open HashPay in its browser, then try again.')
      const { publicKey } = await wallet.connect()
      const address = publicKey.toString()
      return { address, sign: async message => {
        const result = await wallet.signMessage(new TextEncoder().encode(message), 'utf8')
        if (result.publicKey.toString() !== address) throw new Error('Wallet account changed. Please connect again.')
        return bytesToBase64(result.signature)
      } }
    }
    case 'freighter': {
      const result = await freighter.requestAccess()
      if (result.error) throw new Error(result.error.message)
      if (!result.address) throw new Error('No Freighter account selected.')
      const address = result.address
      return { address, sign: async message => {
        const proof = await freighter.signMessage(message, { address })
        if (proof.error) throw new Error(proof.error.message)
        if (!proof.signedMessage || proof.signerAddress !== address) throw new Error('Wallet account changed or signing was cancelled.')
        return typeof proof.signedMessage === 'string' ? proof.signedMessage : bytesToBase64(proof.signedMessage)
      } }
    }
    case 'lobstr': {
      const address = await lobstr.getPublicKey()
      if (!address) throw new Error('Connect the LOBSTR extension to your LOBSTR mobile wallet, then try again.')
      return { address, sign: async message => {
        const proof = await lobstr.signMessage(message)
        if (!proof?.signedMessage || proof.signerAddress !== address) throw new Error('Wallet account changed or signing was cancelled.')
        return proof.signedMessage
      } }
    }
  }
}
