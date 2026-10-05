import { beforeEach, describe, expect, it, vi } from 'vitest'

const { browser, freighterMock, lobstrMock } = vi.hoisted(() => {
  const browser = new EventTarget() as EventTarget & { ethereum?: any; phantom?: any }
  vi.stubGlobal('window', browser)
  return {
    browser,
    freighterMock: { isConnected: vi.fn(), requestAccess: vi.fn(), signMessage: vi.fn() },
    lobstrMock: { isConnected: vi.fn(), getPublicKey: vi.fn(), signMessage: vi.fn() },
  }
})
vi.mock('@stellar/freighter-api', () => freighterMock)
vi.mock('@lobstrco/signer-extension-api', () => lobstrMock)
import { connectExternalWallet, detectWallets } from '../../../../frontend/src/lib/walletConnectors'

beforeEach(() => {
  vi.clearAllMocks()
  browser.ethereum = undefined
  browser.phantom = undefined
  freighterMock.isConnected.mockResolvedValue({ isConnected: false })
  lobstrMock.isConnected.mockResolvedValue(false)
})

describe('browser wallet connectors', () => {
  it('detects both Stellar wallets and Phantom independently', async () => {
    freighterMock.isConnected.mockResolvedValue({ isConnected: true })
    lobstrMock.isConnected.mockResolvedValue(true)
    browser.phantom = { solana: { isPhantom: true } }
    expect(await detectWallets()).toMatchObject({ freighter: true, lobstr: true, phantom: true, metamask: false })
  })

  it('selects MetaMask rather than Phantom when both inject Ethereum providers', async () => {
    const phantomRequest = vi.fn()
    const metamaskRequest = vi.fn().mockResolvedValue(['0x1234'])
    browser.ethereum = { providers: [
      { isMetaMask: true, isPhantom: true, request: phantomRequest },
      { isMetaMask: true, request: metamaskRequest },
    ] }
    const connection = await connectExternalWallet('metamask')
    expect(connection.address).toBe('0x1234')
    expect(phantomRequest).not.toHaveBeenCalled()
    expect(metamaskRequest).toHaveBeenCalledWith({ method: 'eth_requestAccounts' })
  })

  it('checks for account changes before requesting a MetaMask signature', async () => {
    const request = vi.fn().mockResolvedValueOnce(['0x1234']).mockResolvedValueOnce(['0x5678'])
    browser.ethereum = { isMetaMask: true, request }
    const connection = await connectExternalWallet('metamask')
    await expect(connection.sign('test')).rejects.toThrow('account changed')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('encodes personal_sign messages as UTF-8 hex', async () => {
    const request = vi.fn().mockResolvedValueOnce(['0x1234']).mockResolvedValueOnce(['0x1234']).mockResolvedValueOnce('0xsignature')
    browser.ethereum = { isMetaMask: true, request }
    const connection = await connectExternalWallet('metamask')
    expect(await connection.sign('£')).toBe('0xsignature')
    expect(request).toHaveBeenLastCalledWith({ method: 'personal_sign', params: ['0xc2a3', '0x1234'] })
  })

  it('encodes Phantom signatures as base64 and checks the returned signer', async () => {
    const publicKey = { toString: () => 'solana-address' }
    const signMessage = vi.fn().mockResolvedValue({ publicKey, signature: new Uint8Array([1, 2, 3]) })
    browser.phantom = { solana: { isPhantom: true, connect: async () => ({ publicKey }), signMessage } }
    const connection = await connectExternalWallet('phantom')
    expect(await connection.sign('HashPay')).toBe('AQID')
    expect(signMessage).toHaveBeenCalledWith(new TextEncoder().encode('HashPay'), 'utf8')
    signMessage.mockResolvedValueOnce({ publicKey: { toString: () => 'other-key' }, signature: new Uint8Array([1]) })
    await expect(connection.sign('HashPay')).rejects.toThrow('account changed')
  })

  it('uses the selected Freighter address and supports byte or base64 signatures', async () => {
    freighterMock.requestAccess.mockResolvedValue({ address: 'stellar-address' })
    freighterMock.signMessage.mockResolvedValue({ signerAddress: 'stellar-address', signedMessage: new Uint8Array([1, 2, 3]) })
    const connection = await connectExternalWallet('freighter')
    expect(await connection.sign('HashPay')).toBe('AQID')
    expect(freighterMock.signMessage).toHaveBeenCalledWith('HashPay', { address: 'stellar-address' })
    freighterMock.signMessage.mockResolvedValueOnce({ signerAddress: 'stellar-address', signedMessage: 'base64-signature' })
    expect(await connection.sign('HashPay')).toBe('base64-signature')
  })

  it('requests LOBSTR message approval and rejects another signer', async () => {
    lobstrMock.getPublicKey.mockResolvedValue('stellar-address')
    lobstrMock.signMessage.mockResolvedValue({ signerAddress: 'stellar-address', signedMessage: 'base64-signature' })
    const connection = await connectExternalWallet('lobstr')
    expect(await connection.sign('HashPay')).toBe('base64-signature')
    lobstrMock.signMessage.mockResolvedValueOnce({ signerAddress: 'other-address', signedMessage: 'signature' })
    await expect(connection.sign('HashPay')).rejects.toThrow('account changed')
  })

  it('shows an installation instruction when MetaMask is unavailable', async () => {
    await expect(connectExternalWallet('metamask')).rejects.toThrow('Install MetaMask')
  })

  it('handles an unavailable Stellar extension without losing the other detections', async () => {
    freighterMock.isConnected.mockRejectedValue(new Error('not installed'))
    lobstrMock.isConnected.mockResolvedValue(true)
    expect(await detectWallets()).toMatchObject({ freighter: false, lobstr: true })
  })

  it('uses the announced MetaMask provider when another extension owns window.ethereum', async () => {
    const request = vi.fn().mockResolvedValue(['0xmetamask'])
    browser.ethereum = { isPhantom: true, request: vi.fn() }
    browser.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: { rdns: 'io.metamask' }, provider: { request } } }))
    expect((await connectExternalWallet('metamask')).address).toBe('0xmetamask')
    expect(browser.ethereum.request).not.toHaveBeenCalled()
  })
})
