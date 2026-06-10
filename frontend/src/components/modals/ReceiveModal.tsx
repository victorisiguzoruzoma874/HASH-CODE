import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Copy, Share2, Building2, Wallet, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'
import { HashPayIcon } from '../ui/HashPayLogo'
import { QRCode } from '../ui/QRCode'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiStore } from '../../store/useApiStore'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'

interface ReceiveModalProps { isOpen: boolean; onClose: () => void }

type Tab = 'hashpay' | 'bank' | 'crypto'

interface WalletData {
  ngnBalance: string
  hashpayAccountNumber: string | null
  virtualAccount: { accountNumber: string; bankName: string | null } | null
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
      onClick={handle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold transition-all flex-shrink-0"
      style={copied
        ? { background: '#E4F7EE', color: '#057A4B', border: '1.5px solid #057A4B30' }
        : { background: '#E8EFFE', color: '#0B50D4', border: '1.5px solid #0B50D430' }
      }
    >
      {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </motion.button>
  )
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: '#7A97B4' }}>{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-[12px] px-3 py-2.5 text-[14px] font-mono font-bold truncate"
          style={{ background: '#F8FAFD', border: '1.5px solid #C4D4E8', color: '#0A1929' }}>
          {value}
        </div>
        <CopyButton text={value} />
      </div>
    </div>
  )
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({ isOpen, onClose }) => {
  const { user } = useApiStore()
  const [tab, setTab]           = useState<Tab>('hashpay')
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loading, setLoading]   = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [chain, setChain]       = useState<'evm' | 'sui' | 'aptos'>('evm')

  // Crypto chains the user actually has an address for
  const cryptoChains = ([
    { key: 'evm',   label: 'EVM',   address: user?.evmAddress },
    { key: 'sui',   label: 'Sui',   address: user?.suiAddress },
    { key: 'aptos', label: 'Aptos', address: user?.aptosAddress },
  ] as const).filter(c => !!c.address)

  const activeChain   = cryptoChains.find(c => c.key === chain) ?? cryptoChains[0]
  const activeAddress = activeChain?.address ?? ''

  useEffect(() => {
    if (!isOpen) return
    const token = localStorage.getItem('hp_token')
    if (!token) return
    setLoading(true)
    fetch(`${BASE}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(r => setWalletData(r.data))
      .catch(() => setError('Failed to load wallet'))
      .finally(() => setLoading(false))
  }, [isOpen])

  const createVirtualAccount = async () => {
    const token = localStorage.getItem('hp_token')
    if (!token) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/wallet/create-virtual-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to create virtual account')
      // Refresh wallet data
      const balRes = await fetch(`${BASE}/wallet/balance`, { headers: { Authorization: `Bearer ${token}` } })
      const balData = await balRes.json()
      setWalletData(balData.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'hashpay', label: 'HashPay ID',    icon: <HashPayIcon size={14} /> },
    { key: 'bank',    label: 'Bank Account',  icon: <Building2 size={14} /> },
    { key: 'crypto',  label: 'Crypto',        icon: <Wallet size={14} /> },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title="Receive Money" subtitle="HashPay · Instant Transfers"
      width="max-w-[420px]"
      headerIcon={<HashPayIcon size={30} />}
    >
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

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin" style={{ color: '#0B50D4' }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >

              {/* ── HashPay ID tab ─────────────────────────── */}
              {tab === 'hashpay' && (
                <>
                  <div className="flex flex-col items-center gap-3 py-3 rounded-[16px]"
                    style={{ background: '#EEF3FB', border: '1.5px solid #DDE6F2' }}>
                    <div className="flex items-center gap-2">
                      <HashPayIcon size={20} />
                      <span className="text-[12px] font-bold tracking-[0.08em] uppercase" style={{ color: '#7A97B4' }}>
                        HashPay Account
                      </span>
                    </div>
                    {walletData?.hashpayAccountNumber && (
                      <div className="p-2.5 rounded-[14px] bg-white" style={{ border: '1.5px solid #DDE6F2' }}>
                        <QRCode value={walletData.hashpayAccountNumber} size={172} />
                      </div>
                    )}
                    <div className="text-[32px] font-black font-mono tracking-widest" style={{ color: '#0A1929' }}>
                      {walletData?.hashpayAccountNumber
                        ? walletData.hashpayAccountNumber.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
                        : '—'}
                    </div>
                    <div className="text-[12px] font-semibold" style={{ color: '#7A97B4' }}>
                      {user?.fullName ?? ''}
                    </div>
                  </div>

                  {walletData?.hashpayAccountNumber && (
                    <AccountRow label="Account Number" value={walletData.hashpayAccountNumber} />
                  )}

                  <div className="flex gap-2.5 p-3.5 rounded-[12px]"
                    style={{ background: '#E8EFFE', border: '1px solid #0B50D430' }}>
                    <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#0B50D4' }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: '#0B50D4' }}>
                      Share your HashPay ID with other HashPay users. Transfers are instant and free.
                    </p>
                  </div>

                  <button
                    onClick={() => navigator.share?.({ title: 'My HashPay ID', text: `Send me money on HashPay: ${walletData?.hashpayAccountNumber}` }).catch(() => {})}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                    style={{ border: '1.5px solid #DDE6F2', color: '#7A97B4', background: '#F8FAFD' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.color = '#0B50D4'; e.currentTarget.style.background = '#E8EFFE' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2'; e.currentTarget.style.color = '#7A97B4'; e.currentTarget.style.background = '#F8FAFD' }}
                  >
                    <Share2 size={13} /> Share HashPay ID
                  </button>
                </>
              )}

              {/* ── Bank Account tab ───────────────────────── */}
              {tab === 'bank' && (
                <>
                  {walletData?.virtualAccount ? (
                    <>
                      <div className="flex flex-col items-center gap-3 py-4 rounded-[16px]"
                        style={{ background: '#EEF3FB', border: '1.5px solid #DDE6F2' }}>
                        <Building2 size={24} style={{ color: '#0B50D4' }} />
                        <div className="p-2.5 rounded-[14px] bg-white" style={{ border: '1.5px solid #DDE6F2' }}>
                          <QRCode value={walletData.virtualAccount.accountNumber} size={160} fgColor="#0B50D4" />
                        </div>
                        <div className="text-[28px] font-black font-mono tracking-widest" style={{ color: '#0A1929' }}>
                          {walletData.virtualAccount.accountNumber}
                        </div>
                        <div className="text-[12px] font-bold" style={{ color: '#7A97B4' }}>
                          {walletData.virtualAccount.bankName ?? 'Virtual Account'}
                        </div>
                      </div>

                      <AccountRow label="Account Number" value={walletData.virtualAccount.accountNumber} />
                      <AccountRow label="Bank Name" value={walletData.virtualAccount.bankName ?? ''} />
                      <AccountRow label="Account Name" value={user?.fullName ?? ''} />

                      <div className="flex gap-2.5 p-3.5 rounded-[12px]"
                        style={{ background: '#E4F7EE', border: '1px solid #057A4B30' }}>
                        <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#057A4B' }} />
                        <p className="text-[11px] leading-relaxed" style={{ color: '#057A4B' }}>
                          Anyone in Nigeria can send money to this account. Deposits reflect instantly in your HashPay NGN balance.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: '#EEF3FB' }}>
                        <Building2 size={28} style={{ color: '#0B50D4' }} />
                      </div>
                      <div className="text-center">
                        <p className="text-[14px] font-bold mb-1" style={{ color: '#0A1929' }}>
                          No Virtual Account Yet
                        </p>
                        <p className="text-[12px]" style={{ color: '#7A97B4' }}>
                          Create a dedicated Nigerian bank account number to receive transfers from anyone.
                        </p>
                      </div>

                      {error && (
                        <p className="text-[12px] font-semibold text-center" style={{ color: '#D92D20' }}>{error}</p>
                      )}

                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={createVirtualAccount} disabled={creating}
                        className="w-full py-3 rounded-full text-[14px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        style={{ background: '#0B50D4', color: '#fff' }}
                      >
                        {creating ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : <>Create Virtual Account <ChevronRight size={16} /></>}
                      </motion.button>

                      <p className="text-[10px] text-center" style={{ color: '#A8BDD4' }}>
                        Requires KYC verification · Powered by Paystack
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Crypto tab ─────────────────────────────── */}
              {tab === 'crypto' && (
                <>
                  {cryptoChains.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <Wallet size={28} style={{ color: '#A8BDD4' }} />
                      <p className="text-[12px]" style={{ color: '#7A97B4' }}>
                        No crypto wallet addresses linked to your account yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Chain selector */}
                      {cryptoChains.length > 1 && (
                        <div className="flex gap-1 p-1 rounded-[12px]" style={{ background: '#EEF3FB' }}>
                          {cryptoChains.map(c => (
                            <button key={c.key} onClick={() => setChain(c.key)}
                              className="flex-1 py-1.5 rounded-[9px] text-[12px] font-bold transition-all"
                              style={activeChain?.key === c.key
                                ? { background: '#fff', color: '#0B50D4', boxShadow: '0 1px 6px rgba(11,80,212,0.12)' }
                                : { color: '#7A97B4' }
                              }
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-3 py-3 rounded-[16px]"
                        style={{ background: '#EEF3FB', border: '1.5px solid #DDE6F2' }}>
                        <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: '#7A97B4' }}>
                          {activeChain?.label} Wallet Address
                        </span>
                        <div className="p-2.5 rounded-[14px] bg-white" style={{ border: '1.5px solid #DDE6F2' }}>
                          <QRCode value={activeAddress} size={172} />
                        </div>
                        <div className="text-[13px] font-mono font-semibold px-4 text-center break-all" style={{ color: '#0A1929' }}>
                          {activeAddress}
                        </div>
                      </div>

                      <AccountRow label={`${activeChain?.label} Address`} value={activeAddress} />

                      <div className="flex gap-2.5 p-3.5 rounded-[12px]"
                        style={{ background: '#FFF8EC', border: '1px solid #F59E0B30' }}>
                        <p className="text-[11px] leading-relaxed" style={{ color: '#B45309' }}>
                          Only send supported {activeChain?.label} tokens to this address. Sending unsupported assets may result in permanent loss.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}

            </motion.div>
          </AnimatePresence>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <HashPayIcon size={18} />
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: '#A8BDD4' }}>
            Secured by HashPay Global
          </span>
        </div>
      </div>
    </Modal>
  )
}
