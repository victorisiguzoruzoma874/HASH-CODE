import React, { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { stellarSwapApi, type StellarSwapQuote, type StellarSwapResult } from '../../lib/api'
import { signStellarSwap } from '../../lib/walletConnectors'
import { useApiStore } from '../../store/useApiStore'
import { displayCryptoAmount } from './ConnectedWalletBalances'

interface Props { assetIn: string; assetOut: string; amountIn: string; onBusy: (busy: boolean) => void }
interface PendingSwap { quoteId: string; transactionHash: string }
export const StellarSwapExecution: React.FC<Props> = ({ assetIn, assetOut, amountIn, onBusy }) => {
  const supportedPair = (assetIn === 'XLM' && assetOut === 'USDC') || (assetIn === 'USDC' && assetOut === 'XLM')
  const user = useApiStore(s => s.user)
  const wallets = user?.linkedWallets?.filter(w => w.chain === 'stellar' && ['freighter', 'lobstr'].includes(w.provider)) ?? []
  const [walletId, setWalletId] = useState('')
  const selected = wallets.find(w => w.id === walletId) ?? wallets[0]
  const [quote, setQuote] = useState<StellarSwapQuote | null>(null)
  const [result, setResult] = useState<StellarSwapResult | null>(null)
  const [pending, setPending] = useState<PendingSwap | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(Date.now())
  const queryClient = useQueryClient()
  const storageKey = `hashpay-stellar-pending:${user?.id}`
  const generation = useRef(0)
  const live = useRef(true)
  useEffect(() => { live.current = true; return () => { live.current = false; onBusy(false) } }, [onBusy])
  useEffect(() => { generation.current++; setQuote(null); setMessage(''); setResult(null) }, [assetIn, assetOut, amountIn, selected?.id])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      if (saved?.quoteId && saved?.transactionHash) { setPending(saved); onBusy(true) }
    } catch { /* storage is optional */ }
  }, [storageKey, onBusy])
  function remember(value: PendingSwap | null) {
    setPending(value)
    try { if (value) localStorage.setItem(storageKey, JSON.stringify(value)); else localStorage.removeItem(storageKey) } catch { /* optional */ }
  }
  function finish(response: StellarSwapResult) {
    setResult(response)
    if (response.status !== 'pending') {
      remember(null); onBusy(false); setQuote(null)
      if (response.status === 'confirmed') queryClient.invalidateQueries({ queryKey: ['linked-wallet-balance', user?.id] })
    }
  }
  useEffect(() => {
    if (!pending) return
    let cancelled = false
    const check = async () => {
      try { const response = await stellarSwapApi.status(pending.quoteId); if (!cancelled) { finish(response); setMessage('') } }
      catch { if (!cancelled) setMessage('Confirmation is unavailable. Check the transaction link before making another swap.') }
    }
    check()
    const timer = setInterval(check, 10_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [pending?.quoteId]) // Keep checking the same transaction even if the form changes.
  const requestQuote = async () => {
    if (!selected || busy || !supportedPair) return
    const requestGeneration = generation.current
    setBusy(true); onBusy(true); setMessage(''); setResult(null); setQuote(null)
    try {
      const response = await stellarSwapApi.quote({ walletId: selected.id, assetIn, assetOut, amountIn })
      if (live.current && generation.current === requestGeneration) setQuote(response)
    } catch (error: any) { if (live.current) setMessage(error.message ?? 'Could not find a Stellar swap route.') }
    finally { if (live.current) { setBusy(false); onBusy(false) } }
  }
  const execute = async () => {
    if (!quote || busy || pending || Date.now() >= Date.parse(quote.expiresAt)) return
    setBusy(true); onBusy(true); setMessage('Approve the transaction in your wallet.')
    let sent = false
    try {
      const signed = await signStellarSwap(quote.provider, quote.address, quote.transactionXdr, quote.networkPassphrase)
      if (Date.now() >= Date.parse(quote.expiresAt)) throw new Error('The quote expired during wallet approval. Refresh and approve again.')
      sent = true
      const operation = { quoteId: quote.quoteId, transactionHash: quote.transactionHash }
      remember(operation)
      setMessage('Submitting to Stellar…')
      const response = await stellarSwapApi.submit(quote.quoteId, signed)
      if (live.current) { finish(response); setMessage('') }
    } catch (error: any) {
      if (live.current) setMessage(sent ? 'Submission was interrupted. Checking this transaction; do not repeat the swap yet.' : error.message ?? 'Wallet approval was cancelled.')
    } finally { if (live.current) { setBusy(false); if (!sent) onBusy(false) } }
  }
  const expired = quote && now >= Date.parse(quote.expiresAt)
  const hash = pending?.transactionHash ?? result?.transactionHash
  if (!supportedPair && !pending && !result) return null
  return <div className="dash-box" aria-label="Stellar swap review">
    <b>Swap on Stellar mainnet</b>
    <p className="dash-meta">XLM ↔ Circle USDC on Stellar. Both assets stay in your selected wallet.</p>
    {!supportedPair ? null : !wallets.length ? <p>Connect Freighter or LOBSTR using Manage wallets to swap.</p> : <>
      <label className="lp-label" htmlFor="stellar-swap-wallet">Stellar wallet</label>
      <select id="stellar-swap-wallet" className="lp-input" value={selected?.id ?? ''} onChange={e => setWalletId(e.target.value)} disabled={busy || !!pending}>
        {wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.provider === 'freighter' ? 'Freighter' : 'LOBSTR'} · {wallet.address.slice(0, 6)}…{wallet.address.slice(-6)}</option>)}
      </select>
      <button type="button" className="lp-btn small" style={{ marginTop: 12 }} disabled={busy || !!pending || !/^\d+(\.\d{1,7})?$/.test(amountIn) || !/[1-9]/.test(amountIn)} onClick={requestQuote}>
        {busy && !quote ? 'Finding route…' : 'Get executable quote'}
      </button>
    </>}
    {quote && <div style={{ marginTop: 12 }}>
      <p>Pay <b>{displayCryptoAmount(quote.amountIn)} {quote.assetIn}</b></p>
      <p>Expected receive <b>{displayCryptoAmount(quote.amountOut)} {quote.assetOut}</b></p>
      <p>Minimum receive <b>{displayCryptoAmount(quote.minOut)} {quote.assetOut}</b> · 0.5% slippage</p>
      <p>Network fee: {displayCryptoAmount(quote.feeXlm)} XLM</p>
      {quote.createsTrustline && <p>This transaction also adds a Circle USDC trustline, reserving {displayCryptoAmount(quote.reserveXlm)} XLM in your account.</p>}
      <details><summary>USDC issuer and account</summary><p className="dash-wallet-address">USDC issuer: {quote.usdcIssuer}</p><p className="dash-wallet-address">Your account: {quote.address}</p></details>
      <p className="dash-meta">{expired ? 'Quote expired. Request a fresh quote.' : `Expires in ${Math.max(0, Math.ceil((Date.parse(quote.expiresAt) - now) / 1000))} seconds.`}</p>
      <button type="button" className="lp-btn solid" disabled={busy || !!pending || !!expired} onClick={execute}>{busy ? 'Waiting for wallet / network…' : `Approve swap in ${quote.provider === 'freighter' ? 'Freighter' : 'LOBSTR'}`}</button>
    </div>}
    {message && <p role="status">{message}</p>}
    {pending && <p role="status">Checking Stellar confirmation. Do not repeat this swap while its result is unknown.</p>}
    {result?.status === 'confirmed' && <p className="dash-green" role="status">Swap confirmed on Stellar.</p>}
    {result?.status === 'expired' && <p role="status">The quote expired without a confirmed swap. Request a new quote to try again.</p>}
    {result?.status === 'failed' && <p className="dash-red" role="status">The transaction failed on Stellar. Its network fee may still have been charged.</p>}
    {hash && <p><a className="lp-link" target="_blank" rel="noopener noreferrer" href={`https://stellar.expert/explorer/public/tx/${hash}`}>View transaction on Stellar</a></p>}
  </div>
}
