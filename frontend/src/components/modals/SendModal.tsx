import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { walletApi } from '../../lib/api'

interface SendModalProps { isOpen: boolean; onClose: () => void }

type SendState = 'idle' | 'loading' | 'success' | 'error'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const ngn = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const SendModal: React.FC<SendModalProps> = ({ isOpen, onClose }) => {
  const [accountNum, setAccountNum]     = useState('')
  const [resolvedName, setResolvedName] = useState<string | null>(null)
  const [resolving, setResolving]       = useState(false)
  const [ngnBalance, setNgnBalance]     = useState<number | null>(null)
  const [ngnAmount, setNgnAmount]       = useState('')
  const [sendState, setSendState]       = useState<SendState>('idle')
  const [sendError, setSendError]       = useState<string | null>(null)
  const debouncedAccount = useDebounce(accountNum, 600)

  // Fetch the real balance whenever the modal opens
  useEffect(() => {
    if (!isOpen) return
    walletApi.getBalance()
      .then(r => setNgnBalance(parseFloat(r.data.ngnBalance)))
      .catch(() => setNgnBalance(null))
  }, [isOpen])

  // Look up the recipient as the account number is typed
  useEffect(() => {
    if (debouncedAccount.length !== 10) { setResolvedName(null); return }
    setResolving(true)
    walletApi.lookup(debouncedAccount)
      .then(r => setResolvedName(r.data.fullName ?? null))
      .catch(() => setResolvedName(null))
      .finally(() => setResolving(false))
  }, [debouncedAccount])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setAccountNum(''); setResolvedName(null); setNgnAmount('')
      setSendState('idle'); setSendError(null)
    }
  }, [isOpen])

  const amount = parseFloat(ngnAmount)
  const overBalance = ngnBalance !== null && amount > ngnBalance
  const canSend =
    accountNum.length === 10 && !!resolvedName && amount >= 1 &&
    ngnBalance !== null && !overBalance

  const handleSend = async () => {
    setSendState('loading'); setSendError(null)
    try {
      await walletApi.send({ recipientAccountNumber: accountNum, amount })
      setSendState('success')
      setNgnBalance(prev => (prev !== null ? prev - amount : null))
      setTimeout(() => { setSendState('idle'); onClose() }, 2200)
    } catch (e: any) {
      setSendError(e.message ?? 'The transfer failed. Try again.')
      setSendState('error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send money"
      subtitle="Send naira to another HashPay account. Transfers are instant and free." width="max-w-[520px]">
      <div className="dash-form">

        {ngnBalance !== null && (
          <div className="dash-notice" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Available balance</span>
            <b className="dash-mono">{ngn(ngnBalance)}</b>
          </div>
        )}

        <div>
          <label className="lp-label" htmlFor="send-account">Recipient HashPay account number</label>
          <input
            id="send-account" className="lp-input dash-mono" type="text" inputMode="numeric" maxLength={10}
            value={accountNum} onChange={e => setAccountNum(e.target.value.replace(/\D/g, ''))}
            placeholder="10-digit account number"
          />
          <div aria-live="polite" style={{ marginTop: 8 }}>
            {resolving && <p className="dash-meta">Looking up account…</p>}
            {resolvedName && <div className="dash-found">{resolvedName}</div>}
            {accountNum.length === 10 && !resolvedName && !resolving && (
              <div className="lp-error">No HashPay account matches that number.</div>
            )}
          </div>
        </div>

        <div>
          <div className="lp-label">
            <label htmlFor="send-amount">Amount (₦)</label>
            {ngnBalance !== null && (
              <button type="button" style={{ background: 'none', border: 0, font: 'inherit', textDecoration: 'underline', cursor: 'pointer', color: 'var(--ink)' }}
                onClick={() => setNgnAmount(String(ngnBalance))}>
                Use full balance
              </button>
            )}
          </div>
          <input
            id="send-amount" className="lp-input dash-mono" type="number" min="1" inputMode="decimal"
            value={ngnAmount} onChange={e => setNgnAmount(e.target.value)} placeholder="0.00"
          />
          {overBalance && <p className="dash-red" style={{ fontSize: 13, marginTop: 6 }}>That is more than your available balance.</p>}
        </div>

        {sendState === 'error' && sendError && <div className="lp-error" role="alert">{sendError}</div>}

        {sendState === 'success' ? (
          <div className="dash-ok" role="status">Transfer sent</div>
        ) : (
          <button className="lp-btn solid" onClick={handleSend} disabled={!canSend || sendState === 'loading'}>
            {sendState === 'loading' ? 'Sending…' : `Send ${ngnAmount ? ngn(amount) : '₦0.00'}`}
          </button>
        )}
      </div>
    </Modal>
  )
}
