import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronDown, ArrowRight, Shield, CheckCircle,
  Loader2, ExternalLink, Building2, Zap, Info
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { EscrowStatus } from '../../store/useStore'

interface ConvertModalProps { isOpen: boolean; onClose: () => void }

const ASSETS = [
  { symbol: 'USDT', name: 'Tether USD',  color: '#057A4B', rate: 1565 },
  { symbol: 'USDC', name: 'USD Coin',    color: '#0891B2', rate: 1562 },
  { symbol: 'ETH',  name: 'Ethereum',    color: '#0B50D4', rate: 5_510_000 },
  { symbol: 'APT',  name: 'Aptos',       color: '#7C3AED', rate: 14_200 },
]

const BANKS = ['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Kuda Bank', 'OPay', 'Moniepoint']

const PIPELINE: { status: EscrowStatus; label: string; detail: string; ms: number }[] = [
  { status: 'depositing', label: 'Depositing to escrow',   detail: 'Executing PTB: swap_manager::swap_and_escrow() on Sui…',    ms: 1800 },
  { status: 'confirming', label: 'Confirming on-chain',    detail: 'Waiting for Sui Move event DepositReceived to emit…',        ms: 2200 },
  { status: 'paying_out', label: 'Triggering fiat payout', detail: 'Backend calling Flutterwave /transfers API → NGN…',          ms: 2500 },
  { status: 'completed',  label: 'Settlement complete',    detail: 'Funds sent to your bank account. Payout ref stored.',        ms: 0    },
]

const statusColor: Record<EscrowStatus, string> = {
  idle: '#A8BDD4', depositing: '#B45309', confirming: '#0B50D4',
  paying_out: '#7C3AED', completed: '#057A4B', failed: '#C5202B', refunded: '#B45309',
}

const inputStyle: React.CSSProperties = {
  background: '#F8FAFD', border: '1.5px solid #C4D4E8',
  color: '#0A1929', borderRadius: 12, outline: 'none',
}

export const ConvertModal: React.FC<ConvertModalProps> = ({ isOpen, onClose }) => {
  const submitEscrowOrder   = useStore(s => s.submitEscrowOrder)
  const advanceEscrowStatus = useStore(s => s.advanceEscrowStatus)
  const activeOrder         = useStore(s => s.escrow.activeOrder)
  const clearActiveOrder    = useStore(s => s.clearActiveOrder)

  const [step, setStep]               = useState<'form' | 'pipeline'>('form')
  const [asset, setAsset]             = useState(ASSETS[0])
  const [amount, setAmount]           = useState('')
  const [bank, setBank]               = useState(BANKS[0])
  const [accountNo, setAccountNo]     = useState('')
  const [accountName, setAccountName] = useState('')
  const [showBankDrop, setShowBankDrop]   = useState(false)
  const [showAssetDrop, setShowAssetDrop] = useState(false)
  const [pipelineStep, setPipelineStep]   = useState(0)

  const fiatAmount = amount ? Math.floor(parseFloat(amount) * asset.rate).toLocaleString() : '0'
  const fee        = amount ? Math.floor(parseFloat(amount) * asset.rate * 0.005).toLocaleString() : '0'
  const netAmount  = amount ? Math.floor(parseFloat(amount) * asset.rate * 0.995).toLocaleString() : '0'

  useEffect(() => {
    if (accountNo.length === 10) {
      const t = setTimeout(() => setAccountName('JOHN DOE ADEYEMI'), 800)
      return () => clearTimeout(t)
    } else setAccountName('')
  }, [accountNo])

  useEffect(() => {
    if (step !== 'pipeline' || !activeOrder) return
    let i = 0
    const run = () => {
      if (i >= PIPELINE.length) return
      const p = PIPELINE[i]
      advanceEscrowStatus(activeOrder.id, p.status, p.status === 'completed' ? { payoutRef: `FLW-REF-${Date.now()}` } : {})
      setPipelineStep(i)
      i++
      if (p.ms > 0) setTimeout(run, p.ms)
    }
    const t = setTimeout(run, 400)
    return () => clearTimeout(t)
  }, [step, activeOrder?.id])

  const handleSubmit = () => {
    submitEscrowOrder({
      txHash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      asset: asset.symbol, amountCrypto: `${amount} ${asset.symbol}`,
      amountFiat: `₦${netAmount}`, currency: 'NGN', bankName: bank,
      accountNumber: accountNo,
      aptosEvent: `hashpay::escrow::DepositReceived { sender: 0x123, amount: ${amount}, asset: ${asset.symbol} }`,
    })
    setStep('pipeline')
    setPipelineStep(0)
  }

  const handleClose = () => {
    clearActiveOrder(); setStep('form'); setAmount(''); setAccountNo(''); setAccountName(''); setPipelineStep(0); onClose()
  }

  const currentStatus = activeOrder?.status ?? 'idle'
  const isDone = currentStatus === 'completed' || currentStatus === 'failed' || currentStatus === 'refunded'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(10,25,41,0.5)' }}
            onClick={isDone || step === 'form' ? handleClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-[520px] rounded-[20px] z-10 overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #DDE6F2', boxShadow: '0 8px 40px rgba(10,25,41,0.14)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #EEF3FB' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #E8EFFE, #F3EEFF)' }}>
                  <ArrowRight size={17} style={{ color: '#0B50D4' }} />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold" style={{ color: '#0A1929' }}>Convert to Fiat</h2>
                  <p className="text-[12px]" style={{ color: '#7A97B4' }}>Crypto → NGN · Hybrid on-chain/off-chain settlement</p>
                </div>
              </div>
              <button onClick={handleClose}
                className="p-1.5 rounded-full transition-all"
                style={{ color: '#7A97B4', background: '#EEF3FB' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#DDE6F2'; e.currentTarget.style.color = '#0A1929' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#EEF3FB'; e.currentTarget.style.color = '#7A97B4' }}>
                <X size={15} />
              </button>
            </div>

            {/* ── FORM ── */}
            {step === 'form' && (
              <div className="p-6 flex flex-col gap-4">

                {/* Notice */}
                <div className="flex gap-2.5 p-3.5 rounded-[12px]"
                  style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
                  <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#0B50D4' }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: '#7A97B4' }}>
                    <span className="font-bold" style={{ color: '#0A1929' }}>Hybrid settlement:</span> Your crypto is swapped on-chain via Sui Move (Cetus DEX), locked in escrow, then our backend triggers NGN payout via Flutterwave.
                  </p>
                </div>

                {/* You Send */}
                <div>
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>You Send</label>
                  <div className="rounded-[12px] p-4" style={inputStyle}>
                    <div className="flex items-center gap-3 mb-2">
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-[26px] font-black font-mono outline-none min-w-0"
                        style={{ color: '#0A1929', fontFamily: 'JetBrains Mono, monospace' }} />
                      <div className="relative">
                        <button onClick={() => setShowAssetDrop(!showAssetDrop)}
                          className="flex items-center gap-2 px-3 py-2 rounded-full transition-all"
                          style={{ background: '#EEF3FB', border: '1.5px solid #DDE6F2' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.background = '#E8EFFE' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2'; e.currentTarget.style.background = '#EEF3FB' }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ background: asset.color }}>{asset.symbol[0]}</div>
                          <span className="text-[13px] font-bold" style={{ color: '#0A1929' }}>{asset.symbol}</span>
                          <ChevronDown size={12} style={{ color: '#7A97B4' }} />
                        </button>
                        <AnimatePresence>
                          {showAssetDrop && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                              className="absolute right-0 top-full mt-1 w-[180px] rounded-[12px] overflow-hidden z-20"
                              style={{ background: '#fff', border: '1px solid #DDE6F2', boxShadow: '0 8px 24px rgba(10,25,41,0.12)' }}>
                              {ASSETS.map(a => (
                                <button key={a.symbol} onClick={() => { setAsset(a); setShowAssetDrop(false) }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
                                  style={{ color: '#0A1929' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                    style={{ background: a.color }}>{a.symbol[0]}</div>
                                  <div>
                                    <div className="text-[13px] font-semibold">{a.symbol}</div>
                                    <div className="text-[10px]" style={{ color: '#7A97B4' }}>{a.name}</div>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="text-[12px] font-mono" style={{ color: '#A8BDD4' }}>
                      Rate: 1 {asset.symbol} = ₦{asset.rate.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* You Receive */}
                <div>
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>You Receive (NGN)</label>
                  <div className="rounded-[12px] p-4" style={{ background: '#E4F7EE', border: '1.5px solid #057A4B30' }}>
                    <div className="text-[28px] font-black font-mono" style={{ color: '#057A4B', fontFamily: 'JetBrains Mono, monospace' }}>₦{netAmount}</div>
                    <div className="flex justify-between text-[12px] mt-2" style={{ color: '#7A97B4' }}>
                      <span>Gross: ₦{fiatAmount}</span>
                      <span>Fee (0.5%): −₦{fee}</span>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: '#7A97B4' }}>Bank Details</label>
                  <div className="relative">
                    <button onClick={() => setShowBankDrop(!showBankDrop)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] transition-all"
                      style={inputStyle}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#C4D4E8' }}>
                      <div className="flex items-center gap-2.5">
                        <Building2 size={15} style={{ color: '#7A97B4' }} />
                        <span className="text-[13px] font-semibold" style={{ color: '#0A1929' }}>{bank}</span>
                      </div>
                      <ChevronDown size={14} style={{ color: '#7A97B4' }} />
                    </button>
                    <AnimatePresence>
                      {showBankDrop && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 right-0 top-full mt-1 rounded-[12px] overflow-hidden z-20 overflow-y-auto"
                          style={{ background: '#fff', border: '1px solid #DDE6F2', boxShadow: '0 8px 24px rgba(10,25,41,0.12)', maxHeight: 200 }}>
                          {BANKS.map(b => (
                            <button key={b} onClick={() => { setBank(b); setShowBankDrop(false) }}
                              className="w-full text-left px-4 py-2.5 text-[13px] transition-all"
                              style={{ color: '#7A97B4' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD'; e.currentTarget.style.color = '#0A1929' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A97B4' }}>
                              {b}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <input type="text" maxLength={10} value={accountNo}
                      onChange={e => setAccountNo(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit account number"
                      className="w-full rounded-[12px] px-4 py-3 text-[13px] font-mono transition-all"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }} />
                    {accountName && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <CheckCircle size={13} style={{ color: '#057A4B' }} />
                        <span className="text-[11px] font-bold" style={{ color: '#057A4B' }}>{accountName}</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Settlement Flow */}
                <div className="rounded-[12px] p-4" style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
                  <div className="text-[11px] font-bold tracking-[0.08em] uppercase mb-3" style={{ color: '#7A97B4' }}>Settlement Flow</div>
                  <div className="flex items-center">
                    {[
                      { label: 'Swap on DEX', sub: 'Cetus DEX',   color: '#0B50D4' },
                      { label: 'Escrow Lock', sub: 'Sui Move',    color: '#7C3AED' },
                      { label: 'Event Emitted', sub: 'Sui Indexer', color: '#B45309' },
                      { label: 'NGN Payout',  sub: 'Flutterwave', color: '#057A4B' },
                    ].map((node, i, arr) => (
                      <React.Fragment key={node.label}>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: node.color }}>{i + 1}</div>
                          <div className="text-[10px] font-semibold text-center leading-tight" style={{ color: '#0A1929' }}>{node.label}</div>
                          <div className="text-[9px] text-center" style={{ color: '#7A97B4' }}>{node.sub}</div>
                        </div>
                        {i < arr.length - 1 && <div className="w-6 h-px flex-shrink-0 mb-4" style={{ background: '#C4D4E8' }} />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit} disabled={!amount || !accountNo || accountNo.length < 10}
                  className="w-full py-3.5 font-bold rounded-full text-[15px] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: '#0B50D4', color: '#fff' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#0944bb' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}>
                  <Zap size={15} />
                  Convert {amount || '0'} {asset.symbol} → ₦{netAmount}
                </motion.button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-[0.06em] uppercase"
                  style={{ color: '#A8BDD4' }}>
                  <Shield size={11} style={{ color: '#057A4B' }} />
                  Secured by Move escrow · KYC verified · Idempotency protected
                </div>
              </div>
            )}

            {/* ── PIPELINE ── */}
            {step === 'pipeline' && activeOrder && (
              <div className="p-6 flex flex-col gap-4">
                {/* Order summary */}
                <div className="rounded-[12px] p-4 flex items-center justify-between"
                  style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
                  <div>
                    <div className="text-[11px] font-medium mb-0.5" style={{ color: '#7A97B4' }}>Converting</div>
                    <div className="text-[18px] font-black font-mono" style={{ color: '#0A1929', fontFamily: 'JetBrains Mono, monospace' }}>{activeOrder.amountCrypto}</div>
                  </div>
                  <ArrowRight size={18} style={{ color: '#A8BDD4' }} />
                  <div className="text-right">
                    <div className="text-[11px] font-medium mb-0.5" style={{ color: '#7A97B4' }}>You receive</div>
                    <div className="text-[18px] font-black font-mono" style={{ color: '#057A4B', fontFamily: 'JetBrains Mono, monospace' }}>{activeOrder.amountFiat}</div>
                  </div>
                </div>

                {/* Pipeline steps */}
                <div className="flex flex-col gap-2">
                  {PIPELINE.map((p, i) => {
                    const isActive   = pipelineStep === i && !isDone
                    const isDoneStep = pipelineStep > i || isDone
                    const col        = isDoneStep ? '#057A4B' : isActive ? statusColor[p.status] : '#A8BDD4'
                    return (
                      <motion.div key={p.status}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-start gap-3 p-3.5 rounded-[12px] transition-all"
                        style={{
                          background: isActive ? '#EEF3FB' : isDoneStep ? '#E4F7EE' : '#F8FAFD',
                          border: `1.5px solid ${isActive ? '#C4D4E8' : isDoneStep ? '#057A4B30' : '#DDE6F2'}`,
                        }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${col}20`, color: col }}>
                          {isDoneStep ? <CheckCircle size={14} /> : isActive ? <Loader2 size={14} className="animate-spin" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold" style={{ color: isActive || isDoneStep ? '#0A1929' : '#A8BDD4' }}>{p.label}</div>
                          <div className="text-[11px] font-mono leading-relaxed mt-0.5" style={{ color: '#7A97B4' }}>{p.detail}</div>
                          {isDoneStep && i === 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] font-mono" style={{ color: '#0B50D4' }}>{activeOrder.txHash}</span>
                              <ExternalLink size={10} style={{ color: '#0B50D4' }} />
                            </div>
                          )}
                          {isDoneStep && i === 3 && activeOrder.payoutRef && (
                            <div className="text-[10px] font-mono mt-1 font-semibold" style={{ color: '#057A4B' }}>
                              Ref: {activeOrder.payoutRef}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Event log — keep dark (code block) */}
                <div className="rounded-[10px] p-3" style={{ background: '#0A1929', border: '1px solid #1E2D3F' }}>
                  <div className="text-[10px] font-bold tracking-[0.08em] uppercase mb-2" style={{ color: '#4B5563' }}>Sui Event Log</div>
                  <div className="font-mono text-[11px] leading-relaxed" style={{ color: '#057A4B' }}>
                    <div style={{ color: '#4B5563' }}>// Sui Indexer · queryEvents subscription</div>
                    <div className="mt-1">{activeOrder.aptosEvent ?? 'Waiting for event…'}</div>
                    {pipelineStep >= 1 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-0.5" style={{ color: '#7C3AED' }}>escrow::deposit() → USDC locked in shared object vault</motion.div>}
                    {pipelineStep >= 2 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-0.5" style={{ color: '#B45309' }}>oracle_price::quote_out(amount, price, 50) → {activeOrder.amountFiat}</motion.div>}
                    {currentStatus === 'completed' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-0.5" style={{ color: '#057A4B' }}>✓ payout_confirmed · ref={activeOrder.payoutRef}</motion.div>}
                  </div>
                </div>

                {currentStatus === 'completed' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5 p-3.5 rounded-[12px]"
                      style={{ background: '#E4F7EE', border: '1.5px solid #057A4B30' }}>
                      <CheckCircle size={18} style={{ color: '#057A4B', flexShrink: 0 }} />
                      <div>
                        <div className="text-[13px] font-bold" style={{ color: '#0A1929' }}>Settlement complete</div>
                        <div className="text-[11px]" style={{ color: '#7A97B4' }}>{activeOrder.amountFiat} sent to {activeOrder.bankName} · {activeOrder.accountNumber}</div>
                      </div>
                    </div>
                    <button onClick={handleClose}
                      className="w-full py-3.5 rounded-full text-[15px] font-bold transition-all"
                      style={{ background: '#057A4B', color: '#fff' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#046640' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#057A4B' }}>
                      Done
                    </button>
                  </motion.div>
                )}

                {!isDone && (
                  <div className="flex items-center justify-center gap-2 text-[12px]" style={{ color: '#7A97B4' }}>
                    <Loader2 size={13} className="animate-spin" />
                    Processing — do not close this window
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
