import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { ChevronDown, Clipboard, Shield, Loader2, CheckCircle2, AlertCircle, User2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { HashPayIcon } from '../ui/HashPayLogo'
import { useApiStore } from '../../store/useApiStore'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'

interface SendModalProps { isOpen: boolean; onClose: () => void }

type Tab = 'hashpay' | 'crypto'
type SendState = 'idle' | 'loading' | 'success' | 'error'

const inputStyle: React.CSSProperties = {
  background: '#F8FAFD',
  border: '1.5px solid #C4D4E8',
  color: '#0A1929',
  borderRadius: 12,
  outline: 'none',
  transition: 'border-color 0.15s',
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export const SendModal: React.FC<SendModalProps> = ({ isOpen, onClose }) => {
  useApiStore()
  const [tab, setTab]           = useState<Tab>('hashpay')

  // HashPay transfer state
  const [accountNum, setAccountNum]   = useState('')
  const [resolvedName, setResolvedName] = useState<string | null>(null)
  const [resolving, setResolving]     = useState(false)
  const [ngnBalance, setNgnBalance]   = useState<number | null>(null)
  const [ngnAmount, setNgnAmount]     = useState('')
  const [sendState, setSendState]     = useState<SendState>('idle')
  const [sendError, setSendError]     = useState<string | null>(null)
  const debouncedAccount = useDebounce(accountNum, 600)

  // Crypto send state
  const [toAddress, setToAddress] = useState('')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [cryptoLoading, setCryptoLoading] = useState(false)
  const [cryptoSuccess, setCryptoSuccess] = useState(false)

  const token = () => localStorage.getItem('hashpay_token') ?? ''

  // Fetch NGN balance on open
  useEffect(() => {
    if (!isOpen) return
    fetch(`${BASE}/wallet/balance`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(r => setNgnBalance(parseFloat(r.data?.ngnBalance ?? '0')))
      .catch(() => {})
  }, [isOpen])

  // Lookup account name as user types
  useEffect(() => {
    if (debouncedAccount.length !== 10) { setResolvedName(null); return }
    setResolving(true)
    fetch(`${BASE}/wallet/lookup/${debouncedAccount}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(r => setResolvedName(r.data?.fullName ?? null))
      .catch(() => setResolvedName(null))
      .finally(() => setResolving(false))
  }, [debouncedAccount])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setAccountNum(''); setResolvedName(null); setNgnAmount('')
      setSendState('idle'); setSendError(null)
      setToAddress(''); setCryptoAmount(''); setCryptoSuccess(false)
    }
  }, [isOpen])

  const handleHashPaySend = async () => {
    setSendState('loading'); setSendError(null)
    try {
      const res = await fetch(`${BASE}/wallet/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientAccountNumber: accountNum, amount: parseFloat(ngnAmount) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Transfer failed')
      setSendState('success')
      setNgnBalance(prev => prev !== null ? prev - parseFloat(ngnAmount) : null)
      setTimeout(() => { setSendState('idle'); onClose() }, 2200)
    } catch (e: any) {
      setSendError(e.message)
      setSendState('error')
    }
  }

  const handleCryptoSend = () => {
    setCryptoLoading(true)
    setTimeout(() => { setCryptoLoading(false); setCryptoSuccess(true); setTimeout(() => { setCryptoSuccess(false); onClose() }, 2000) }, 2000)
  }

  const handlePaste = async () => {
    try { setToAddress(await navigator.clipboard.readText()) }
    catch { setToAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045') }
  }

  const ethPrice = 3516.44
  const usdValue = cryptoAmount ? (parseFloat(cryptoAmount) * ethPrice).toFixed(2) : '0.00'

  const canSendHashpay = accountNum.length === 10 && resolvedName && parseFloat(ngnAmount) >= 1 &&
    ngnBalance !== null && parseFloat(ngnAmount) <= ngnBalance && sendState === 'idle'

  const tabs = [
    { key: 'hashpay' as Tab, label: 'HashPay Transfer', icon: <HashPayIcon size={13} /> },
    { key: 'crypto'  as Tab, label: 'Crypto Send',       icon: <Shield size={13} /> },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Money"
      subtitle="Instant HashPay transfers · Crypto sends" width="max-w-[520px]">
      <div className="flex flex-col gap-4">

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-[14px]" style={{ background: '#EEF3FB' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[12px] font-bold transition-all"
              style={tab === t.key
                ? { background: '#fff', color: '#0B50D4', boxShadow: '0 1px 6px rgba(11,80,212,0.12)' }
                : { color: '#7A97B4' }
              }
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-4"
          >

            {/* ── HashPay Transfer tab ─────────────────────── */}
            {tab === 'hashpay' && (
              <>
                {/* Balance chip */}
                {ngnBalance !== null && (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-[12px]"
                    style={{ background: '#EEF3FB', border: '1.5px solid #DDE6F2' }}>
                    <span className="text-[12px] font-semibold" style={{ color: '#7A97B4' }}>Available Balance</span>
                    <span className="text-[14px] font-black" style={{ color: '#0A1929' }}>
                      ₦{ngnBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Recipient account number */}
                <div>
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>
                    Recipient HashPay ID
                  </label>
                  <div className="relative">
                    <input
                      type="text" inputMode="numeric" maxLength={10}
                      value={accountNum}
                      onChange={e => setAccountNum(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit account number"
                      className="w-full rounded-[12px] px-4 py-3 text-[14px] font-mono"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }}
                    />
                    {resolving && (
                      <Loader2 size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#0B50D4' }} />
                    )}
                  </div>

                  {/* Resolved name */}
                  <AnimatePresence>
                    {resolvedName && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 mt-2 px-3 py-2 rounded-[10px]"
                        style={{ background: '#E4F7EE', border: '1px solid #057A4B30' }}>
                        <User2 size={13} style={{ color: '#057A4B' }} />
                        <span className="text-[12px] font-bold" style={{ color: '#057A4B' }}>{resolvedName}</span>
                        <CheckCircle2 size={12} style={{ color: '#057A4B' }} />
                      </motion.div>
                    )}
                    {accountNum.length === 10 && !resolvedName && !resolving && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 mt-2 px-3 py-2 rounded-[10px]"
                        style={{ background: '#FFF1F1', border: '1px solid #D92D2030' }}>
                        <AlertCircle size={13} style={{ color: '#D92D20' }} />
                        <span className="text-[12px] font-semibold" style={{ color: '#D92D20' }}>Account not found</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Amount */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: '#7A97B4' }}>Amount (₦)</label>
                    {ngnBalance !== null && (
                      <button onClick={() => setNgnAmount(String(ngnBalance))}
                        className="text-[11px] font-bold" style={{ color: '#0B50D4' }}>
                        Send Max
                      </button>
                    )}
                  </div>
                  <div className="rounded-[12px] p-4" style={{ background: '#F8FAFD', border: '1.5px solid #C4D4E8' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-[22px] font-black" style={{ color: '#A8BDD4' }}>₦</span>
                      <input
                        type="number" min="1"
                        value={ngnAmount}
                        onChange={e => setNgnAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-[28px] font-black font-mono outline-none"
                        style={{ color: '#0A1929', fontFamily: 'JetBrains Mono, monospace' }}
                      />
                    </div>
                    {ngnBalance !== null && ngnAmount && parseFloat(ngnAmount) > ngnBalance && (
                      <p className="text-[11px] font-semibold mt-2" style={{ color: '#D92D20' }}>Exceeds available balance</p>
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div className="rounded-[12px] p-4 flex flex-col gap-2 text-[12px]"
                  style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
                  <div className="flex justify-between">
                    <span style={{ color: '#7A97B4' }}>Transfer Fee</span>
                    <span className="font-bold" style={{ color: '#057A4B' }}>Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#7A97B4' }}>Arrival Time</span>
                    <span className="font-bold" style={{ color: '#057A4B' }}>Instant</span>
                  </div>
                </div>

                {/* Error */}
                {sendState === 'error' && sendError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px]"
                    style={{ background: '#FFF1F1', border: '1px solid #D92D2030' }}>
                    <AlertCircle size={14} style={{ color: '#D92D20' }} />
                    <span className="text-[12px] font-semibold" style={{ color: '#D92D20' }}>{sendError}</span>
                  </div>
                )}

                {/* CTA */}
                {sendState === 'success' ? (
                  <div className="w-full py-3.5 rounded-full text-[14px] font-bold text-center flex items-center justify-center gap-2"
                    style={{ background: '#E4F7EE', color: '#057A4B', border: '1.5px solid #057A4B40' }}>
                    <CheckCircle2 size={16} /> Transfer Sent!
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleHashPaySend}
                    disabled={!canSendHashpay}
                    className="w-full py-3.5 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    style={{ background: '#0B50D4', color: '#fff' }}
                    onMouseEnter={e => { if (canSendHashpay) e.currentTarget.style.background = '#0944bb' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
                  >
                    {sendState === 'loading'
                      ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                      : `Send ₦${ngnAmount ? Number(ngnAmount).toLocaleString() : '0'} →`
                    }
                  </motion.button>
                )}
              </>
            )}

            {/* ── Crypto Send tab ──────────────────────────── */}
            {tab === 'crypto' && (
              <>
                {/* Asset selector */}
                <div>
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>Asset</label>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] transition-all"
                    style={{ ...inputStyle, display: 'flex' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #0B50D4, #0891B2)' }}>E</div>
                      <div className="text-left">
                        <div className="text-[14px] font-semibold" style={{ color: '#0A1929' }}>Ethereum</div>
                        <div className="text-[11px] font-mono" style={{ color: '#7A97B4' }}>Balance: 14.42 ETH</div>
                      </div>
                    </div>
                    <ChevronDown size={15} style={{ color: '#7A97B4' }} />
                  </button>
                </div>

                {/* To address */}
                <div>
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>To</label>
                  <div className="relative">
                    <input
                      type="text" value={toAddress}
                      onChange={e => setToAddress(e.target.value)}
                      placeholder="0x… or ENS name"
                      className="w-full rounded-[12px] pl-4 pr-24 py-3 text-[13px] font-mono"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }}
                    />
                    <button onClick={handlePaste}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
                      style={{ background: '#E8EFFE', color: '#0B50D4' }}>
                      <Clipboard size={11} /> Paste
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: '#7A97B4' }}>Amount</label>
                    <span className="text-[11px] font-medium" style={{ color: '#7A97B4' }}>Balance: 14.42 ETH</span>
                  </div>
                  <div className="rounded-[12px] p-4" style={{ background: '#F8FAFD', border: '1.5px solid #C4D4E8' }}>
                    <div className="flex items-center gap-3">
                      <input
                        type="number" value={cryptoAmount}
                        onChange={e => setCryptoAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-[28px] font-black font-mono outline-none"
                        style={{ color: '#0A1929', fontFamily: 'JetBrains Mono, monospace' }}
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCryptoAmount('14.42')}
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: '#E4F7EE', color: '#057A4B' }}>
                          MAX
                        </button>
                        <span className="text-[13px] font-semibold" style={{ color: '#7A97B4' }}>ETH</span>
                      </div>
                    </div>
                    <div className="text-[12px] font-mono mt-2" style={{ color: '#A8BDD4' }}>≈ ₦{usdValue}</div>
                  </div>
                </div>

                {/* Details */}
                <div className="rounded-[12px] p-4 flex flex-col gap-2.5 text-[12px]"
                  style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
                  <div className="flex justify-between">
                    <span style={{ color: '#7A97B4' }}>Network Fee</span>
                    <span className="font-mono font-semibold" style={{ color: '#0A1929' }}>
                      0.00042 ETH <span style={{ color: '#7A97B4' }}>(~₦0.88)</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#7A97B4' }}>Estimated Time</span>
                    <span className="font-bold" style={{ color: '#057A4B' }}>&lt;30 Seconds</span>
                  </div>
                </div>

                {/* CTA */}
                {cryptoSuccess ? (
                  <div className="w-full py-3.5 rounded-full text-[14px] font-bold text-center flex items-center justify-center gap-2"
                    style={{ background: '#E4F7EE', color: '#057A4B', border: '1.5px solid #057A4B40' }}>
                    <CheckCircle2 size={16} /> Transaction Sent
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleCryptoSend}
                    disabled={cryptoLoading || !toAddress || !cryptoAmount}
                    className="w-full py-3.5 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    style={{ background: '#0B50D4', color: '#fff' }}
                    onMouseEnter={e => { if (!cryptoLoading) e.currentTarget.style.background = '#0944bb' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
                  >
                    {cryptoLoading
                      ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                      : 'Send Assets →'
                    }
                  </motion.button>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase"
                  style={{ color: '#A8BDD4' }}>
                  <Shield size={11} style={{ color: '#0B50D4' }} />
                  Powered by EtherShell Advanced Secure Bridge
                </div>
              </>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </Modal>
  )
}
