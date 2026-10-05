import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { billsApi, walletApi, type BillCategory, type BillItem, type BillResult } from '../../lib/api'

interface BillsModalProps { isOpen: boolean; onClose: () => void }

const CATEGORIES: { id: BillCategory; label: string }[] = [
  { id: 'airtime',     label: 'Airtime' },
  { id: 'data',        label: 'Data' },
  { id: 'electricity', label: 'Electricity' },
]

const AIRTIME_PRESETS = [100, 200, 500, 1000]

const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`

/** Flat select used for provider and product */
const Pick: React.FC<{
  label: string; value: string; options: { value: string; label: string; hint?: string }[]
  onChange: (v: string) => void; placeholder: string; disabled?: boolean
}> = ({ label, value, options, onChange, placeholder, disabled }) => {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)
  return (
    <div>
      <div className="lp-label">{label}</div>
      <div className="dash-select">
        <button type="button" className="dash-selectbtn" aria-haspopup="listbox" aria-expanded={open}
          disabled={disabled} onClick={() => setOpen(!open)}>
          <span>{current?.label ?? placeholder}</span>
          <span>{open ? '▴' : '▾'}</span>
        </button>
        {open && (
          <div className="dash-selectlist" role="listbox">
            {options.map(o => (
              <button key={o.value} type="button" role="option" aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false) }}>
                <span>{o.label}</span>{o.hint && <span className="dash-meta">{o.hint}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const BillsModal: React.FC<BillsModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState<BillCategory>('airtime')
  const [items, setItems]       = useState<BillItem[]>([])
  const [itemsState, setItemsState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [itemsError, setItemsError] = useState('')

  const [billerCode, setBillerCode] = useState('')
  const [itemCode, setItemCode]     = useState('')
  const [customer, setCustomer]     = useState('')
  const [amount, setAmount]         = useState('')

  const [balance, setBalance]       = useState<number | null>(null)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [verifying, setVerifying]   = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const [paying, setPaying]   = useState(false)
  const [payError, setPayError] = useState('')
  const [result, setResult]   = useState<BillResult | null>(null)

  // Wallet balance whenever the modal opens
  useEffect(() => {
    if (!isOpen) return
    walletApi.getBalance().then(r => setBalance(parseFloat(r.data.ngnBalance))).catch(() => setBalance(null))
  }, [isOpen, result])

  // Provider catalogue for the chosen category
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setItemsState('loading'); setItemsError(''); setItems([])
    setBillerCode(''); setItemCode(''); setAmount(''); setCustomerName(null); setVerifyError('')
    billsApi.getItems(category)
      .then(r => { if (!cancelled) { setItems(r.items); setItemsState('ok') } })
      .catch(e => { if (!cancelled) { setItemsState('error'); setItemsError(e?.message ?? 'Providers could not be loaded.') } })
    return () => { cancelled = true }
  }, [isOpen, category])

  // Reset everything when closed
  useEffect(() => {
    if (!isOpen) {
      setCategory('airtime'); setCustomer(''); setAmount(''); setResult(null); setPayError(''); setPaying(false)
    }
  }, [isOpen])

  const billers = useMemo(() => {
    const seen = new Map<string, string>()
    items.forEach(i => {
      let label = i.billerName
      if (category === 'airtime' || category === 'data') {
        const name = i.billerName.trim().toUpperCase()
        if (/\b(9MOBILE|ETISALAT)\b/.test(name)) label = '9mobile'
        else if (/\bAIRTEL\b/.test(name)) label = 'Airtel'
        else if (/\bGLO\b/.test(name)) label = 'Glo'
        else if (/\bMTN\b/.test(name) || (category === 'airtime' && name === 'AIRTIME')) label = 'MTN'
        else return
      }
      if (!seen.has(i.billerCode)) seen.set(i.billerCode, label)
    })
    return Array.from(seen, ([value, label]) => ({ value, label }))
  }, [items, category])

  const products = useMemo(() => items.filter(i => i.billerCode === billerCode), [items, billerCode])

  // Auto-pick the only product for a provider
  useEffect(() => {
    if (products.length === 1) setItemCode(products[0].itemCode)
    else if (!products.some(p => p.itemCode === itemCode)) setItemCode('')
    setCustomerName(null); setVerifyError('')
  }, [products]) // eslint-disable-line react-hooks/exhaustive-deps

  const item = products.find(p => p.itemCode === itemCode) ?? null
  const fixed = !!item && item.amount > 0
  const price = item ? (fixed ? item.amount : parseFloat(amount) || 0) : 0
  const total = item ? price + item.fee : 0
  const insufficient = balance !== null && total > balance
  const needsVerify = category === 'electricity'

  const canPay =
    !!item && customer.trim().length >= 5 && price > 0 && !insufficient && !paying &&
    (!needsVerify || !!customerName)

  const verify = async () => {
    if (!item) return
    setVerifying(true); setVerifyError(''); setCustomerName(null)
    try {
      const r = await billsApi.validate({ category, billerCode: item.billerCode, itemCode: item.itemCode, customer: customer.trim() })
      if (r.valid) setCustomerName(r.name ?? 'Verified')
      else setVerifyError('That number could not be verified.')
    } catch (e: any) {
      setVerifyError(e?.message ?? 'That number could not be verified.')
    } finally {
      setVerifying(false)
    }
  }

  const pay = async () => {
    if (!item) return
    setPaying(true); setPayError('')
    try {
      const r = await billsApi.pay({
        category, billerCode: item.billerCode, itemCode: item.itemCode, customer: customer.trim(),
        amount: fixed ? undefined : price,
      })
      setResult(r)
    } catch (e: any) {
      setPayError(e?.message ?? 'The purchase failed. You have not been charged.')
    } finally {
      setPaying(false)
    }
  }

  const reset = () => { setResult(null); setCustomer(''); setAmount(''); setPayError('') }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Utilities"
      subtitle="Buy airtime, data and electricity from your naira balance." width="max-w-[520px]">
      <div className="dash-form">

        {result ? (
          <>
            {result.status === 'COMPLETED' ? (
              <div className="dash-ok" role="status">
                Purchase complete
                <div style={{ fontWeight: 400, color: 'var(--ink)', marginTop: 4 }}>{result.description}</div>
              </div>
            ) : (
              <div className="dash-notice" role="status">
                <b>Your purchase is still processing.</b> We have not been able to confirm it yet, so {naira(result.total)} is held
                from your balance. Check Recent activity later. If it does not complete, contact support with
                reference <span className="dash-mono">{result.reference}</span>.
              </div>
            )}

            {result.token && (
              <div>
                <div className="lp-label">Your electricity token</div>
                <div className="lp-input dash-mono" style={{ display: 'flex', alignItems: 'center', wordBreak: 'break-all' }}>{result.token}</div>
              </div>
            )}

            <div className="dash-box" style={{ padding: 0 }}>
              {[
                ['Amount', naira(result.amount)],
                ['Fee', naira(result.fee)],
                ['Total charged', naira(result.total)],
                ['Reference', result.reference],
              ].map(([k, v], i, arr) => (
                <div key={k} className="dash-note" style={{ padding: '10px 12px', borderBottom: i < arr.length - 1 ? '1px solid color-mix(in srgb, var(--line) 25%, transparent)' : 0 }}>
                  <span>{k}</span><span className="dash-mono" style={{ color: 'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="lp-btn" onClick={reset}>Buy something else</button>
              <button className="lp-btn solid" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <div className="dash-tabs" role="tablist" style={{ width: '100%' }}>
              {CATEGORIES.map(c => (
                <button key={c.id} role="tab" aria-selected={category === c.id} style={{ flex: 1, padding: 0 }}
                  onClick={() => setCategory(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>

            {balance !== null && (
              <div className="dash-notice" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Available balance</span><b className="dash-mono">{naira(balance)}</b>
              </div>
            )}

            {itemsState === 'loading' && <p className="dash-empty" style={{ padding: '16px 0' }}>Loading providers…</p>}
            {itemsState === 'error' && <div className="lp-error" role="alert">{itemsError}</div>}
            {itemsState === 'ok' && items.length === 0 && (
              <p className="dash-empty" style={{ padding: '16px 0' }}>No providers are available for this right now.</p>
            )}

            {itemsState === 'ok' && items.length > 0 && (
              <>
                <Pick label="Provider" value={billerCode} options={billers} onChange={setBillerCode} placeholder="Choose a provider" />

                {billerCode && products.length > 1 && (
                  <Pick
                    label={category === 'data' ? 'Data plan' : 'Product'}
                    value={itemCode}
                    options={products.map(p => ({ value: p.itemCode, label: p.name, hint: p.amount > 0 ? naira(p.amount) : undefined }))}
                    onChange={setItemCode} placeholder="Choose one"
                  />
                )}

                {item && (
                  <>
                    <div>
                      <label className="lp-label" htmlFor="bill-customer">{item.labelName}</label>
                      <input id="bill-customer" className="lp-input dash-mono" type="text" inputMode="numeric"
                        value={customer} onChange={e => { setCustomer(e.target.value.replace(/\s/g, '')); setCustomerName(null) }}
                        placeholder={category === 'electricity' ? 'Meter number' : '08012345678'} />
                      {needsVerify && (
                        <div style={{ marginTop: 8 }}>
                          <button className="lp-btn small" onClick={verify} disabled={verifying || customer.length < 5}>
                            {verifying ? 'Checking…' : 'Verify meter'}
                          </button>
                          {customerName && <div className="dash-found" style={{ marginTop: 8 }}>{customerName}</div>}
                          {verifyError && <div className="lp-error" style={{ marginTop: 8 }}>{verifyError}</div>}
                        </div>
                      )}
                    </div>

                    {!fixed && (
                      <div>
                        <label className="lp-label" htmlFor="bill-amount">Amount (₦)</label>
                        {category === 'airtime' && (
                          <div className="dash-chips" style={{ marginBottom: 8 }}>
                            {AIRTIME_PRESETS.map(p => (
                              <button key={p} type="button" className="dash-chip" aria-pressed={parseFloat(amount) === p}
                                onClick={() => setAmount(String(p))}>
                                {naira(p)}
                              </button>
                            ))}
                          </div>
                        )}
                        <input id="bill-amount" className="lp-input dash-mono" type="number" min="1" inputMode="decimal"
                          value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                      </div>
                    )}

                    <div className="dash-box" style={{ padding: 0 }}>
                      {[
                        ['Price', price > 0 ? naira(price) : '—'],
                        ['Fee', naira(item.fee)],
                        ['You pay', price > 0 ? naira(total) : '—'],
                      ].map(([k, v], i, arr) => (
                        <div key={k} className="dash-note" style={{ padding: '10px 12px', borderBottom: i < arr.length - 1 ? '1px solid color-mix(in srgb, var(--line) 25%, transparent)' : 0 }}>
                          <span>{k}</span><span className="dash-mono" style={{ color: 'var(--ink)' }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {insufficient && (
                      <p className="dash-red" style={{ fontSize: 13 }}>
                        Your balance is too low for this purchase. Receive money first, then try again.
                      </p>
                    )}
                    {payError && <div className="lp-error" role="alert">{payError}</div>}

                    <button className="lp-btn solid" onClick={pay} disabled={!canPay}>
                      {paying ? 'Processing… do not close this window' : price > 0 ? `Pay ${naira(total)}` : 'Pay'}
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
