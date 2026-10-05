import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '../ui/Modal'
import { useApiStore } from '../../store/useApiStore'
import { escrowApi, payoutApi, type ConvertQuote } from '../../lib/api'

interface ConvertModalProps { isOpen: boolean; onClose: () => void }

const ASSETS = [
  { symbol: 'USDT', name: 'Tether USD' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'XLM',  name: 'Stellar' },
  { symbol: 'SUI',  name: 'Sui' },
  { symbol: 'ETH',  name: 'Ethereum' },
  { symbol: 'APT',  name: 'Aptos' },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`

export const ConvertModal: React.FC<ConvertModalProps> = ({ isOpen, onClose }) => {
  const banks      = useApiStore(s => s.banks)
  const fetchBanks = useApiStore(s => s.fetchBanks)

  const [asset, setAsset]         = useState(ASSETS[0])
  const [amount, setAmount]       = useState('')
  const [bank, setBank]           = useState<{ code: string; name: string } | null>(null)
  const [accountNo, setAccountNo] = useState('')
  const [accountName, setAccountName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [showBankDrop, setShowBankDrop]   = useState(false)
  const [showAssetDrop, setShowAssetDrop] = useState(false)

  const [quote, setQuote]           = useState<ConvertQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')

  const debouncedAmount = useDebounce(amount, 500)

  // Real bank list from the payout provider
  useEffect(() => {
    if (isOpen && banks.length === 0) fetchBanks()
  }, [isOpen, banks.length, fetchBanks])

  useEffect(() => {
    if (!bank && banks.length > 0) setBank(banks[0])
  }, [banks, bank])

  // Fetch the backend quote, or a read-only estimate for native XLM.
  useEffect(() => {
    const n = parseFloat(debouncedAmount)
    if (!isOpen || !n || n <= 0) { setQuote(null); setQuoteError(''); return }
    let cancelled = false
    setQuoteLoading(true); setQuoteError('')
    const getQuote = asset.symbol === 'XLM' ? escrowApi.getEstimate : escrowApi.getQuote
    getQuote({ asset: asset.symbol, amountIn: n, currencyOut: 'NGN' })
      .then(q => { if (!cancelled) setQuote(q) })
      .catch(e => { if (!cancelled) { setQuote(null); setQuoteError(e?.message ?? 'Could not get a quote. Try again.') } })
      .finally(() => { if (!cancelled) setQuoteLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, debouncedAmount, asset.symbol])

  const verifyAccount = useCallback(async (no: string, code: string | undefined) => {
    if (no.length !== 10 || !code) { setAccountName(''); setVerifyError(''); return }
    setVerifying(true); setVerifyError(''); setAccountName('')
    try {
      const res = await payoutApi.verifyAccount({ accountNumber: no, bankCode: code })
      setAccountName(res.accountName)
    } catch (err: any) {
      setVerifyError(err?.message || 'Could not verify this account. Check the number and bank.')
    } finally {
      setVerifying(false)
    }
  }, [])

  useEffect(() => { verifyAccount(accountNo, bank?.code) }, [accountNo, bank?.code, verifyAccount])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setAmount(''); setAccountNo(''); setAccountName(''); setVerifyError('')
      setQuote(null); setQuoteError(''); setShowBankDrop(false); setShowAssetDrop(false)
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert to cash"
      subtitle="Turn crypto into naira in your bank account." width="max-w-[520px]">
      <div className="dash-form">

        <div>
          <label className="lp-label" htmlFor="cv-amount">You send</label>
          <div className="dash-box">
            <div className="line">
              <input id="cv-amount" className="dash-amount" type="number" min="0" inputMode="decimal"
                value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              <div className="dash-token">
                <button type="button" className="dash-tokenbtn" aria-haspopup="listbox" aria-expanded={showAssetDrop}
                  onClick={() => setShowAssetDrop(!showAssetDrop)}>
                  {asset.symbol} {showAssetDrop ? '▴' : '▾'}
                </button>
                {showAssetDrop && (
                  <div className="dash-tokenlist" role="listbox">
                    {ASSETS.map(a => (
                      <button key={a.symbol} type="button" role="option" aria-selected={a.symbol === asset.symbol}
                        onClick={() => { setAsset(a); setShowAssetDrop(false) }}>
                        <b>{a.symbol}</b><span className="p">{a.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="lp-label">You receive (NGN)</div>
          <div className="dash-box" aria-live="polite">
            <div className="dash-big dash-green" style={{ fontSize: 28 }}>
              {quoteLoading ? 'Getting quote…' : quote ? naira(quote.netAmount) : '₦0'}
            </div>
            {quote && (
              <div className="dash-note" style={{ marginTop: 8 }}>
                <span>1 {asset.symbol} = {naira(quote.rate)}</span>
                <span>Fee {naira(quote.fee)} ({(quote.feeBps / 100).toFixed(2)}%)</span>
              </div>
            )}
            {quoteError && <p className="dash-red" style={{ fontSize: 13, marginTop: 8 }}>{quoteError}</p>}
            {quote?.estimate && <p className="dash-meta" style={{ fontSize: 13, marginTop: 8 }}>XLM cash-out estimate only. Stellar bank payouts are not available yet.</p>}
            {quote && !quote.signed && !quote.estimate && (
              <p className="dash-red" style={{ fontSize: 13, marginTop: 8 }}>
                This quote is not signed by the server, so the escrow contract would reject a deposit.
              </p>
            )}
          </div>
        </div>

        <div className="dash-form" style={{ gap: 12 }}>
          <div className="lp-label" style={{ marginBottom: 0 }}>Bank details</div>

          <div className="dash-select">
            <button type="button" className="dash-selectbtn" aria-haspopup="listbox" aria-expanded={showBankDrop}
              onClick={() => setShowBankDrop(!showBankDrop)} disabled={banks.length === 0}>
              <span>{bank?.name ?? (banks.length === 0 ? 'Loading banks…' : 'Select a bank')}</span>
              <span>{showBankDrop ? '▴' : '▾'}</span>
            </button>
            {showBankDrop && (
              <div className="dash-selectlist" role="listbox">
                {banks.map(b => (
                  <button key={b.code} type="button" role="option" aria-selected={bank?.code === b.code}
                    onClick={() => { setBank(b); setShowBankDrop(false) }}>
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input className="lp-input dash-mono" type="text" inputMode="numeric" maxLength={10} aria-label="Account number"
            value={accountNo} onChange={e => setAccountNo(e.target.value.replace(/\D/g, ''))}
            placeholder="10-digit account number" />

          <div aria-live="polite">
            {verifying && <p className="dash-meta">Verifying account…</p>}
            {!verifying && accountName && <div className="dash-found">{accountName}</div>}
            {!verifying && verifyError && <div className="lp-error">{verifyError}</div>}
          </div>
        </div>

        <div className="dash-notice">
          <b>Deposits are not open yet.</b> You can check a live quote and verify your bank account here.
          {asset.symbol === 'XLM' ? ' Stellar bank payouts need a settlement integration. No money moves from this screen.' : ' Sending crypto to escrow needs the Sui escrow contract deployed and configured on the server, so no money moves from this screen.'}
        </div>

        <button className="lp-btn solid" disabled>
          Convert is not available yet
        </button>
      </div>
    </Modal>
  )
}
