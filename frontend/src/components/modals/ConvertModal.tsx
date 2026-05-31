import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronDown, ArrowRight, Shield, CheckCircle,
  Loader2, ExternalLink,
  Building2, Zap, Info
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { EscrowStatus } from '../../store/useStore'

interface ConvertModalProps {
  isOpen: boolean
  onClose: () => void
}

const ASSETS = [
  { symbol: 'USDT', name: 'Tether USD',  color: '#26A17B', rate: 1565 },
  { symbol: 'USDC', name: 'USD Coin',    color: '#39FF14', rate: 1562 },
  { symbol: 'ETH',  name: 'Ethereum',    color: '#4361EE', rate: 5_510_000 },
  { symbol: 'APT',  name: 'Aptos',       color: '#00D4AA', rate: 14_200 },
]

const BANKS = [
  'GTBank', 'Access Bank', 'Zenith Bank', 'First Bank',
  'UBA', 'Kuda Bank', 'OPay', 'Moniepoint',
]

// Simulated escrow pipeline steps
const PIPELINE: { status: EscrowStatus; label: string; detail: string; ms: number }[] = [
  { status: 'depositing',  label: 'Depositing to escrow',       detail: 'Executing PTB: swap_manager::swap_and_escrow() on Sui…',    ms: 1800 },
  { status: 'confirming',  label: 'Confirming on-chain',        detail: 'Waiting for Sui Move event DepositReceived to emit…',        ms: 2200 },
  { status: 'paying_out',  label: 'Triggering fiat payout',     detail: 'Backend calling Flutterwave /transfers API → NGN…',          ms: 2500 },
  { status: 'completed',   label: 'Settlement complete',        detail: 'Funds sent to your bank account. Payout ref stored.',        ms: 0    },
]

const statusColor: Record<EscrowStatus, string> = {
  idle:       '#4B5563',
  depositing: '#F59E0B',
  confirming: '#4361EE',
  paying_out: '#A855F7',
  completed:  '#39FF14',
  failed:     '#EF4444',
  refunded:   '#F59E0B',
}


export const ConvertModal: React.FC<ConvertModalProps> = ({ isOpen, onClose }) => {
  const submitEscrowOrder  = useStore(s => s.submitEscrowOrder)
  const advanceEscrowStatus = useStore(s => s.advanceEscrowStatus)
  const activeOrder        = useStore(s => s.escrow.activeOrder)
  const clearActiveOrder   = useStore(s => s.clearActiveOrder)

  const [step, setStep]           = useState<'form' | 'pipeline'>('form')
  const [asset, setAsset]         = useState(ASSETS[0])
  const [amount, setAmount]       = useState('')
  const [bank, setBank]           = useState(BANKS[0])
  const [accountNo, setAccountNo] = useState('')
  const [accountName, setAccountName] = useState('')
  const [showBankDrop, setShowBankDrop] = useState(false)
  const [showAssetDrop, setShowAssetDrop] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)

  const fiatAmount = amount ? Math.floor(parseFloat(amount) * asset.rate).toLocaleString() : '0'
  const fee        = amount ? Math.floor(parseFloat(amount) * asset.rate * 0.005).toLocaleString() : '0'
  const netAmount  = amount ? Math.floor(parseFloat(amount) * asset.rate * 0.995).toLocaleString() : '0'

  // Simulate account name lookup
  useEffect(() => {
    if (accountNo.length === 10) {
      const timer = setTimeout(() => setAccountName('JOHN DOE ADEYEMI'), 800)
      return () => clearTimeout(timer)
    } else {
      setAccountName('')
    }
  }, [accountNo])

  // Run pipeline simulation
  useEffect(() => {
    if (step !== 'pipeline' || !activeOrder) return
    let i = 0
    const run = () => {
      if (i >= PIPELINE.length) return
      const p = PIPELINE[i]
      advanceEscrowStatus(activeOrder.id, p.status,
        p.status === 'completed' ? { payoutRef: `FLW-REF-${Date.now()}` } : {}
      )
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
      asset: asset.symbol,
      amountCrypto: `${amount} ${asset.symbol}`,
      amountFiat: `₦${netAmount}`,
      currency: 'NGN',
      bankName: bank,
      accountNumber: accountNo,
      aptosEvent: `hashpay::escrow::DepositReceived { sender: 0x123, amount: ${amount}, asset: ${asset.symbol} }`,
    })
    setStep('pipeline')
    setPipelineStep(0)
  }

  const handleClose = () => {
    clearActiveOrder()
    setStep('form')
    setAmount('')
    setAccountNo('')
    setAccountName('')
    setPipelineStep(0)
    onClose()
  }

  const currentStatus = activeOrder?.status ?? 'idle'
  const isDone = currentStatus === 'completed' || currentStatus === 'failed' || currentStatus === 'refunded'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={isDone || step === 'form' ? handleClose : undefined}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-[520px] bg-[#111827] border border-white/10 rounded-[20px] shadow-2xl z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#A855F7] to-[#4361EE] flex items-center justify-center">
                  <ArrowRight size={17} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-white">Convert to Fiat</h2>
                  <p className="text-[12px] text-[#94A3B8]">Crypto → NGN · Hybrid on-chain/off-chain settlement</p>
                </div>
              </div>
              <button onClick={handleClose}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors">
                <X size={17} />
              </button>
            </div>

            {/* ── FORM STEP ── */}
            {step === 'form' && (
              <div className="p-6 flex flex-col gap-4">

                {/* Architecture notice */}
                <div className="flex gap-2.5 p-3 bg-[#4361EE]/10 border border-[#4361EE]/20 rounded-[10px]">
                  <Info size={14} className="text-[#4361EE] flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    <span className="text-white font-medium">Hybrid settlement:</span> Your crypto is swapped on-chain via Sui Move package
                    (Cetus DEX), locked in escrow, then our backend triggers NGN payout via Flutterwave.
                  </p>
                </div>

                {/* Asset + Amount */}
                <div>
                  <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#94A3B8] block mb-2">
                    You Send
                  </label>
                  <div className="bg-[#1A2235] rounded-[12px] p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-[26px] font-bold text-white font-mono outline-none min-w-0"
                      />
                      {/* Asset dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowAssetDrop(!showAssetDrop)}
                          className="flex items-center gap-2 px-3 py-2 bg-[#111827] border border-white/10 rounded-[10px] hover:border-white/20 transition-all"
                        >
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ background: asset.color }}>
                            {asset.symbol[0]}
                          </div>
                          <span className="text-[14px] font-medium text-white">{asset.symbol}</span>
                          <ChevronDown size={13} className="text-[#94A3B8]" />
                        </button>
                        <AnimatePresence>
                          {showAssetDrop && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                              className="absolute right-0 top-full mt-1 w-[180px] bg-[#1A2235] border border-white/10 rounded-[12px] overflow-hidden z-20 shadow-xl"
                            >
                              {ASSETS.map(a => (
                                <button key={a.symbol}
                                  onClick={() => { setAsset(a); setShowAssetDrop(false) }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/05 transition-all text-left"
                                >
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                    style={{ background: a.color }}>{a.symbol[0]}</div>
                                  <div>
                                    <div className="text-[13px] font-medium text-white">{a.symbol}</div>
                                    <div className="text-[10px] text-[#94A3B8]">{a.name}</div>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="text-[12px] text-[#94A3B8] font-mono">
                      Rate: 1 {asset.symbol} = ₦{asset.rate.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* You receive */}
                <div>
                  <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#94A3B8] block mb-2">
                    You Receive (NGN)
                  </label>
                  <div className="bg-[#1A2235] rounded-[12px] p-4">
                    <div className="text-[26px] font-bold text-[#39FF14] font-mono">₦{netAmount}</div>
                    <div className="flex justify-between text-[12px] text-[#94A3B8] mt-2">
                      <span>Gross: ₦{fiatAmount}</span>
                      <span>Fee (0.5%): −₦{fee}</span>
                    </div>
                  </div>
                </div>

                {/* Bank details */}
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#94A3B8]">
                    Bank Details
                  </label>

                  {/* Bank selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowBankDrop(!showBankDrop)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#1A2235] border border-white/10 rounded-[10px] hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 size={15} className="text-[#94A3B8]" />
                        <span className="text-[13px] text-white">{bank}</span>
                      </div>
                      <ChevronDown size={14} className="text-[#94A3B8]" />
                    </button>
                    <AnimatePresence>
                      {showBankDrop && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 right-0 top-full mt-1 bg-[#1A2235] border border-white/10 rounded-[12px] overflow-hidden z-20 shadow-xl max-h-[200px] overflow-y-auto"
                        >
                          {BANKS.map(b => (
                            <button key={b}
                              onClick={() => { setBank(b); setShowBankDrop(false) }}
                              className="w-full text-left px-4 py-2.5 text-[13px] text-[#94A3B8] hover:text-white hover:bg-white/05 transition-all"
                            >
                              {b}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Account number */}
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      value={accountNo}
                      onChange={e => setAccountNo(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit account number"
                      className="w-full bg-[#1A2235] border border-white/10 rounded-[10px] px-4 py-3 text-[13px] text-white placeholder-[#4B5563] font-mono transition-all"
                    />
                    {accountName && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5"
                      >
                        <CheckCircle size={13} className="text-[#39FF14]" />
                        <span className="text-[11px] text-[#39FF14] font-medium">{accountName}</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Flow summary */}
                <div className="bg-[#0B0F1A] rounded-[12px] p-4 border border-white/[0.06]">
                  <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#94A3B8] mb-3">Settlement Flow</div>
                  <div className="flex items-center gap-0">
                    {[
                      { label: 'Swap on DEX', sub: 'Cetus DEX',  color: '#4361EE' },
                      { label: 'Escrow Lock', sub: 'Sui Move',   color: '#A855F7' },
                      { label: 'Event Emitted', sub: 'Sui Indexer', color: '#F59E0B' },
                      { label: 'NGN Payout', sub: 'Flutterwave', color: '#39FF14' },
                    ].map((node, i, arr) => (
                      <React.Fragment key={node.label}>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: node.color }}>
                            {i + 1}
                          </div>
                          <div className="text-[10px] font-medium text-white text-center leading-tight">{node.label}</div>
                          <div className="text-[9px] text-[#4B5563] text-center">{node.sub}</div>
                        </div>
                        {i < arr.length - 1 && (
                          <div className="w-6 h-px bg-white/10 flex-shrink-0 mb-4" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!amount || !accountNo || accountNo.length < 10}
                  className="w-full py-3.5 font-semibold rounded-[12px] text-[14px] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #A855F7, #4361EE)', color: '#fff' }}
                >
                  <Zap size={15} />
                  Convert {amount || '0'} {asset.symbol} → ₦{netAmount}
                </motion.button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#4B5563]">
                  <Shield size={11} className="text-[#39FF14]" />
                  Secured by Move escrow · KYC verified · Idempotency protected
                </div>
              </div>
            )}

            {/* ── PIPELINE STEP ── */}
            {step === 'pipeline' && activeOrder && (
              <div className="p-6 flex flex-col gap-5">

                {/* Order summary */}
                <div className="bg-[#1A2235] rounded-[12px] p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#94A3B8] mb-0.5">Converting</div>
                    <div className="text-[18px] font-bold text-white font-mono">{activeOrder.amountCrypto}</div>
                  </div>
                  <ArrowRight size={18} className="text-[#94A3B8]" />
                  <div className="text-right">
                    <div className="text-[11px] text-[#94A3B8] mb-0.5">You receive</div>
                    <div className="text-[18px] font-bold text-[#39FF14] font-mono">{activeOrder.amountFiat}</div>
                  </div>
                </div>

                {/* Pipeline steps */}
                <div className="flex flex-col gap-2">
                  {PIPELINE.map((p, i) => {
                    const isActive  = pipelineStep === i && !isDone
                    const isDoneStep = pipelineStep > i || isDone
                    const color = isDoneStep ? '#39FF14' : isActive ? statusColor[p.status] : '#4B5563'
                    return (
                      <motion.div
                        key={p.status}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`flex items-start gap-3 p-3.5 rounded-[12px] border transition-all ${
                          isActive  ? 'border-white/15 bg-white/[0.04]' :
                          isDoneStep ? 'border-[#39FF14]/15 bg-[#39FF14]/[0.03]' :
                          'border-white/[0.05] bg-transparent'
                        }`}
                      >
                        {/* Step indicator */}
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${color}20`, color }}>
                          {isDoneStep
                            ? <CheckCircle size={14} />
                            : isActive
                              ? <Loader2 size={14} className="animate-spin" />
                              : <span className="text-[11px] font-bold">{i + 1}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium" style={{ color: isActive || isDoneStep ? '#fff' : '#4B5563' }}>
                            {p.label}
                          </div>
                          <div className="text-[11px] text-[#4B5563] mt-0.5 font-mono leading-relaxed">
                            {p.detail}
                          </div>
                          {/* Show tx hash on confirming step */}
                          {isDoneStep && i === 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] font-mono text-[#4361EE]">{activeOrder.txHash}</span>
                              <ExternalLink size={10} className="text-[#4361EE]" />
                            </div>
                          )}
                          {/* Show payout ref on completed */}
                          {isDoneStep && i === 3 && activeOrder.payoutRef && (
                            <div className="text-[10px] font-mono text-[#39FF14] mt-1">
                              Ref: {activeOrder.payoutRef}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Move event log */}
                <div className="bg-[#0B0F1A] rounded-[10px] p-3 border border-white/[0.06]">
                  <div className="text-[10px] font-medium tracking-[0.08em] uppercase text-[#4B5563] mb-2">
                    Sui Event Log
                  </div>
                  <div className="font-mono text-[11px] text-[#39FF14] leading-relaxed">
                    <div className="text-[#4B5563]">// Sui Indexer · queryEvents subscription</div>
                    <div className="mt-1">{activeOrder.aptosEvent ?? 'Waiting for event…'}</div>
                    {pipelineStep >= 1 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#A855F7] mt-0.5">
                        escrow::deposit() → USDC locked in shared object vault
                      </motion.div>
                    )}
                    {pipelineStep >= 2 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#F59E0B] mt-0.5">
                        oracle_price::quote_out(amount, price, 50) → ₦{activeOrder.amountFiat}
                      </motion.div>
                    )}
                    {currentStatus === 'completed' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#39FF14] mt-0.5">
                        ✓ payout_confirmed · ref={activeOrder.payoutRef}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Done state */}
                {currentStatus === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2.5 p-3.5 bg-[#39FF14]/10 border border-[#39FF14]/25 rounded-[12px]">
                      <CheckCircle size={18} className="text-[#39FF14] flex-shrink-0" />
                      <div>
                        <div className="text-[13px] font-semibold text-white">Settlement complete</div>
                        <div className="text-[11px] text-[#94A3B8]">
                          {activeOrder.amountFiat} sent to {activeOrder.bankName} · {activeOrder.accountNumber}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-full py-3 bg-[#39FF14] text-[#0B0F1A] font-semibold rounded-[12px] text-[14px] hover:bg-[#32e612] transition-all"
                    >
                      Done
                    </button>
                  </motion.div>
                )}

                {/* Still processing */}
                {!isDone && (
                  <div className="flex items-center justify-center gap-2 text-[12px] text-[#4B5563]">
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
