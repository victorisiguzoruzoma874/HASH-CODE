import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  PhoneCall,
  Smartphone,
  BookOpen,
  Zap,
  BadgeCheck,
  Tv2,
  CircleDot,
  Gamepad2,
  Receipt,
  HeartPulse,
  PiggyBank,
  FileText,
  Gauge,
  Settings,
  LogOut,
  ArrowLeft,
  Building2,
  CreditCard,
  CheckCircle,
  Loader2,
  Info,
} from 'lucide-react'

interface BillPayModalProps {
  isOpen: boolean
  onClose: () => void
}

// ── Category data ─────────────────────────────────────────────
const SECTIONS = [
  {
    title: 'Bills and recharges',
    items: [
      { id: 'airtime',     label: 'Airtime',     icon: PhoneCall,  color: '#3B82F6' },
      { id: 'data',        label: 'Data',        icon: Smartphone, color: '#3B82F6' },
      { id: 'education',   label: 'Education',   icon: BookOpen,   color: '#3B82F6' },
      { id: 'electricity', label: 'Electricity', icon: Zap,        color: '#3B82F6' },
      { id: 'government',  label: 'Government',  icon: BadgeCheck, color: '#3B82F6' },
      { id: 'tv',          label: 'TV',          icon: Tv2,        color: '#3B82F6' },
    ],
  },
  {
    title: 'Lifestyle',
    items: [
      { id: 'betting',   label: 'Betting',   icon: CircleDot,  color: '#F59E0B' },
      { id: 'gaming',    label: 'Gaming',    icon: Gamepad2,   color: '#F59E0B' },
      { id: 'utilities', label: 'Utilities', icon: Receipt,    color: '#F59E0B' },
      { id: 'health',    label: 'Health',    icon: HeartPulse, color: '#F59E0B' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { id: 'savings', label: 'Savings', icon: PiggyBank, color: '#22C55E' },
    ],
  },
  {
    title: 'Accounts and settings',
    items: [
      { id: 'statement', label: 'Statement', icon: FileText, color: '#64748B' },
      { id: 'limits',    label: 'Limits',    icon: Gauge,    color: '#64748B' },
      { id: 'settings',  label: 'Settings',  icon: Settings, color: '#64748B' },
      { id: 'logout',    label: 'Logout',    icon: LogOut,   color: '#EF4444' },
    ],
  },
]

// ── Per-service form configs ──────────────────────────────────
interface ServiceConfig {
  title: string
  subtitle: string
  fields: { id: string; label: string; placeholder: string; type?: string }[]
  amounts?: { label: string; value: string; eth: string }[]
  providers?: string[]
}

const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  airtime: {
    title: 'Airtime Top-up',
    subtitle: 'Recharge any network instantly',
    providers: ['MTN', 'Airtel', 'Glo', 'Etisalat (9mobile)'],
    fields: [{ id: 'phone', label: 'Phone Number', placeholder: '080 0000 0000', type: 'tel' }],
    amounts: [
      { label: '₦100',  value: '100',  eth: '0.000018' },
      { label: '₦200',  value: '200',  eth: '0.000036' },
      { label: '₦500',  value: '500',  eth: '0.000090' },
      { label: '₦1000', value: '1000', eth: '0.000180' },
    ],
  },
  data: {
    title: 'Data Bundle',
    subtitle: 'Buy mobile data for any network',
    providers: ['MTN', 'Airtel', 'Glo', 'Etisalat (9mobile)'],
    fields: [{ id: 'phone', label: 'Phone Number', placeholder: '080 0000 0000', type: 'tel' }],
    amounts: [
      { label: '1GB / 1d',  value: '300',  eth: '0.000054' },
      { label: '2GB / 7d',  value: '500',  eth: '0.000090' },
      { label: '5GB / 30d', value: '1500', eth: '0.000270' },
      { label: '10GB / 30d',value: '2500', eth: '0.000450' },
    ],
  },
  electricity: {
    title: 'Electricity Bill',
    subtitle: 'Pay DISCO bills & buy prepaid tokens',
    providers: ['EKEDC', 'IKEDC', 'AEDC', 'PHEDC', 'KEDCO', 'BEDC'],
    fields: [
      { id: 'meter',   label: 'Meter Number',  placeholder: '12345678901' },
      { id: 'amount',  label: 'Amount (₦)',    placeholder: '5000', type: 'number' },
    ],
  },
  education: {
    title: 'Education Payment',
    subtitle: 'Pay school fees, WAEC, JAMB & more',
    providers: ['WAEC', 'NECO', 'JAMB', 'NABTEB', 'NIN Slip'],
    fields: [
      { id: 'examno', label: 'Exam / Student Number', placeholder: 'Enter number' },
      { id: 'amount', label: 'Amount (₦)',             placeholder: '15000', type: 'number' },
    ],
  },
  government: {
    title: 'Government Services',
    subtitle: 'Pay levies, taxes & government fees',
    providers: ['FIRS', 'LIRS', 'CAC', 'NIN', 'Passport'],
    fields: [
      { id: 'ref',    label: 'Reference / RRR Number', placeholder: 'Enter reference' },
      { id: 'amount', label: 'Amount (₦)',              placeholder: '10000', type: 'number' },
    ],
  },
  tv: {
    title: 'TV Subscription',
    subtitle: 'Renew DStv, GOtv, Startimes & more',
    providers: ['DStv', 'GOtv', 'Startimes', 'ShowMax'],
    fields: [
      { id: 'smartcard', label: 'Smart Card / IUC Number', placeholder: '1234567890' },
    ],
    amounts: [
      { label: 'Padi (₦1,850)',    value: '1850',  eth: '0.000333' },
      { label: 'Yanga (₦2,565)',   value: '2565',  eth: '0.000462' },
      { label: 'Confam (₦4,615)',  value: '4615',  eth: '0.000831' },
      { label: 'Compact (₦9,000)', value: '9000',  eth: '0.001620' },
    ],
  },
  betting: {
    title: 'Betting & Sports',
    subtitle: 'Fund your betting wallet instantly',
    providers: ['Bet9ja', 'SportyBet', '1xBet', 'BetKing', 'NairaBet'],
    fields: [
      { id: 'userid', label: 'User ID / Account Number', placeholder: 'Enter user ID' },
      { id: 'amount', label: 'Amount (₦)',                placeholder: '2000', type: 'number' },
    ],
  },
  gaming: {
    title: 'Gaming Top-up',
    subtitle: 'Buy game credits, gift cards & pins',
    providers: ['PlayStation', 'Xbox', 'Steam', 'Roblox', 'PUBG Mobile'],
    fields: [
      { id: 'gameid', label: 'Game ID / Username', placeholder: 'Enter game ID' },
    ],
    amounts: [
      { label: '₦5',  value: '5',  eth: '0.0014' },
      { label: '₦10', value: '10', eth: '0.0028' },
      { label: '₦25', value: '25', eth: '0.0071' },
      { label: '₦50', value: '50', eth: '0.0142' },
    ],
  },
  utilities: {
    title: 'Utilities',
    subtitle: 'Pay water, waste & other utility bills',
    providers: ['Lagos Water', 'Abuja Water', 'LAWMA', 'RCCG'],
    fields: [
      { id: 'account', label: 'Account Number', placeholder: 'Enter account number' },
      { id: 'amount',  label: 'Amount (₦)',      placeholder: '3000', type: 'number' },
    ],
  },
  health: {
    title: 'Health & Insurance',
    subtitle: 'Pay HMO premiums & health bills',
    providers: ['NHIS', 'Hygeia HMO', 'AXA Mansard', 'Reliance HMO'],
    fields: [
      { id: 'memberid', label: 'Member / Policy ID', placeholder: 'Enter ID' },
      { id: 'amount',   label: 'Amount (₦)',          placeholder: '5000', type: 'number' },
    ],
  },
  savings: {
    title: 'Savings',
    subtitle: 'Fund your savings wallet or target',
    providers: ['PiggyVest', 'Cowrywise', 'Carbon', 'Kuda Savings'],
    fields: [
      { id: 'account', label: 'Account / Plan ID', placeholder: 'Enter ID' },
      { id: 'amount',  label: 'Amount (₦)',         placeholder: '10000', type: 'number' },
    ],
  },
  statement: {
    title: 'Account Statement',
    subtitle: 'Request your transaction statement',
    fields: [
      { id: 'email', label: 'Email Address', placeholder: 'name@email.com', type: 'email' },
    ],
    amounts: [
      { label: '1 Month',   value: '1m',  eth: '' },
      { label: '3 Months',  value: '3m',  eth: '' },
      { label: '6 Months',  value: '6m',  eth: '' },
      { label: '1 Year',    value: '1y',  eth: '' },
    ],
  },
  limits: {
    title: 'Transaction Limits',
    subtitle: 'View and manage your spending limits',
    fields: [],
  },
  settings: {
    title: 'Account Settings',
    subtitle: 'Manage your HashPay preferences',
    fields: [],
  },
  logout: {
    title: 'Logout',
    subtitle: 'Sign out of your HashPay account',
    fields: [],
  },
}

// ── Service detail form ───────────────────────────────────────
const ServiceForm: React.FC<{
  serviceId: string
  onBack: () => void
  onClose: () => void
}> = ({ serviceId, onBack, onClose }) => {
  const config = SERVICE_CONFIGS[serviceId]
  const [provider, setProvider] = useState(config?.providers?.[0] ?? '')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [selectedAmount, setSelectedAmount] = useState(config?.amounts?.[0]?.value ?? '')
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!config) return null

  const handlePay = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
    }, 2200)
  }

  const canSubmit = config.fields.every(f => fields[f.id]?.trim()) ||
    config.fields.length === 0

  // Special: limits / settings / logout — info only
  if (['limits', 'settings', 'logout'].includes(serviceId)) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-4 rounded-[12px]"
          style={{ background: '#162033', border: '1px solid #1E293B' }}>
          <Info size={15} className="flex-shrink-0" style={{ color: '#3B82F6' }} />
          <p className="text-[13px]" style={{ color: '#94A3B8' }}>
            {serviceId === 'logout'
              ? 'Use the sidebar disconnect button to sign out of HashPay.'
              : `${config.title} management is available in your profile settings.`}
          </p>
        </div>
        <button onClick={onBack}
          className="w-full py-3 rounded-[12px] text-[14px] font-medium transition-all"
          style={{ border: '1px solid #1E293B', color: '#64748B' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D3F55'; e.currentTarget.style.color = '#F8FAFC' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#64748B' }}>
          Go Back
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 py-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.12)' }}>
          <CheckCircle size={32} style={{ color: '#22C55E' }} />
        </div>
        <div className="text-center">
          <div className="text-[17px] font-semibold mb-1" style={{ color: '#F8FAFC' }}>Payment Successful</div>
          <div className="text-[13px]" style={{ color: '#64748B' }}>
            Your {config.title.toLowerCase()} payment has been processed.
          </div>
        </div>
        <div className="w-full rounded-[12px] p-4 text-[12px] flex flex-col gap-2"
          style={{ background: '#162033', border: '1px solid #1E293B' }}>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Service</span>
            <span className="font-medium" style={{ color: '#F8FAFC' }}>{config.title}</span>
          </div>
          {provider && (
            <div className="flex justify-between">
              <span style={{ color: '#64748B' }}>Provider</span>
              <span style={{ color: '#F8FAFC' }}>{provider}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Status</span>
            <span className="font-semibold" style={{ color: '#22C55E' }}>Confirmed</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Tx Hash</span>
            <span className="font-mono text-[11px]" style={{ color: '#3B82F6' }}>
              0x{Math.random().toString(16).slice(2, 10)}…
            </span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #22C55E, #06B6D4)', color: '#07111F' }}>
          Done
        </button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {config.providers && config.providers.length > 0 && (
        <div>
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase block mb-2" style={{ color: '#64748B' }}>
            Provider
          </label>
          <div className="flex flex-wrap gap-2">
            {config.providers.map(p => (
              <button key={p} onClick={() => setProvider(p)}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
                style={provider === p
                  ? { background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)' }
                  : { background: 'transparent', color: '#64748B', border: '1px solid #1E293B' }
                }
                onMouseEnter={e => { if (provider !== p) { e.currentTarget.style.borderColor = '#2D3F55'; e.currentTarget.style.color = '#F8FAFC' } }}
                onMouseLeave={e => { if (provider !== p) { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#64748B' } }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {config.fields.map(f => (
        <div key={f.id}>
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase block mb-2" style={{ color: '#64748B' }}>
            {f.label}
          </label>
          <input type={f.type ?? 'text'} placeholder={f.placeholder}
            value={fields[f.id] ?? ''}
            onChange={e => setFields(prev => ({ ...prev, [f.id]: e.target.value }))}
            className="w-full rounded-[10px] px-4 py-2.5 text-[13px] transition-all"
            style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }}
          />
        </div>
      ))}

      {config.amounts && config.amounts.length > 0 && (
        <div>
          <label className="text-[10px] font-semibold tracking-[0.12em] uppercase block mb-2" style={{ color: '#64748B' }}>
            Select Amount
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {config.amounts.map(a => {
              const isSel = selectedAmount === a.value && !customAmount
              return (
                <motion.button key={a.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedAmount(a.value); setCustomAmount('') }}
                  className="p-3 rounded-[10px] text-left transition-all"
                  style={{
                    background: isSel ? 'rgba(34,197,94,0.08)' : '#162033',
                    border: `1px solid ${isSel ? 'rgba(34,197,94,0.25)' : '#1E293B'}`,
                  }}>
                  <div className="text-[15px] font-bold font-mono"
                    style={{ color: isSel ? '#22C55E' : '#F8FAFC' }}>{a.label}</div>
                  {a.eth && <div className="text-[10px] font-mono mt-0.5" style={{ color: '#64748B' }}>{a.eth} ETH</div>}
                </motion.button>
              )
            })}
          </div>
          <input type="number" placeholder="Custom amount" value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount('') }}
            className="w-full rounded-[10px] px-4 py-2.5 text-[13px] transition-all"
            style={{ background: '#162033', border: '1px solid #1E293B', color: '#F8FAFC' }}
          />
        </div>
      )}

      {(selectedAmount || customAmount) && (
        <div className="rounded-[12px] p-3.5 flex flex-col gap-2 text-[12px]"
          style={{ background: '#162033', border: '1px solid #1E293B' }}>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Amount</span>
            <span className="font-mono font-semibold" style={{ color: '#F8FAFC' }}>
              {customAmount || selectedAmount}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#64748B' }}>Network Fee</span>
            <span className="font-mono" style={{ color: '#F8FAFC' }}>~₦0.42</span>
          </div>
          <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid #1E293B' }}>
            <span className="font-semibold" style={{ color: '#94A3B8' }}>Total</span>
            <span className="font-semibold font-mono" style={{ color: '#22C55E' }}>
              {customAmount || selectedAmount}
            </span>
          </div>
        </div>
      )}

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={handlePay} disabled={loading || !canSubmit}
        className="w-full py-3.5 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #22C55E, #06B6D4)', color: '#07111F' }}
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Processing…</>
        ) : (
          <><CreditCard size={15} /> Pay with ETH</>
        )}
      </motion.button>

      <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium tracking-[0.06em] uppercase"
        style={{ color: '#334155' }}>
        <Building2 size={11} style={{ color: '#3B82F6' }} />
        Powered by HashPay · Secured by ZK-SNARKs
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────
export const BillPayModal: React.FC<BillPayModalProps> = ({ isOpen, onClose }) => {
  const [activeService, setActiveService] = useState<string | null>(null)

  const handleClose = () => {
    setActiveService(null)
    onClose()
  }

  const activeConfig = activeService ? SERVICE_CONFIGS[activeService] : null
  const activeItem = SECTIONS.flatMap(s => s.items).find(i => i.id === activeService)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[520px] z-10 rounded-[22px] shadow-2xl overflow-hidden flex flex-col"
            style={{ background: '#0F172A', border: '1px solid #1E293B', maxHeight: '88vh' }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{ borderBottom: '1px solid #1E293B' }}>
              <div className="flex items-center gap-3">
                {activeService && (
                  <motion.button initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    onClick={() => setActiveService(null)}
                    className="p-1.5 rounded-[8px] transition-all"
                    style={{ color: '#64748B' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#162033'; e.currentTarget.style.color = '#F8FAFC' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}>
                    <ArrowLeft size={15} />
                  </motion.button>
                )}
                {activeItem && (
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                    style={{ background: `${activeItem.color}15` }}>
                    <activeItem.icon size={15} style={{ color: activeItem.color }} />
                  </div>
                )}
                {!activeService && (
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.12)' }}>
                    <Receipt size={15} style={{ color: '#3B82F6' }} />
                  </div>
                )}
                <div>
                  <h2 className="text-[16px] font-semibold leading-tight" style={{ color: '#F8FAFC' }}>
                    {activeConfig ? activeConfig.title : 'Bill Pay'}
                  </h2>
                  <p className="text-[12px]" style={{ color: '#64748B' }}>
                    {activeConfig ? activeConfig.subtitle : 'Pay bills, recharge & more with ETH'}
                  </p>
                </div>
              </div>
              <button onClick={handleClose}
                className="p-1.5 rounded-[8px] transition-all flex-shrink-0"
                style={{ color: '#64748B' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#162033'; e.currentTarget.style.color = '#F8FAFC' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}>
                <X size={16} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="overflow-y-auto flex-1">
              <AnimatePresence mode="wait">

                {/* ── Category grid ── */}
                {!activeService && (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 py-5 flex flex-col gap-6"
                  >
                    {SECTIONS.map(section => (
                      <div key={section.title}>
                        {/* Section label */}
                        <div className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-3"
                          style={{ color: '#334155' }}>
                          {section.title}
                        </div>

                        <div className="grid grid-cols-4 gap-2.5">
                          {section.items.map(item => {
                            const Icon = item.icon
                            const isLogout = item.id === 'logout'
                            return (
                              <motion.button key={item.id}
                                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setActiveService(item.id)}
                                className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-[14px] transition-all"
                                style={{
                                  background: isLogout ? 'rgba(239,68,68,0.04)' : '#162033',
                                  border: `1px solid ${isLogout ? 'rgba(239,68,68,0.15)' : '#1E293B'}`,
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = isLogout ? 'rgba(239,68,68,0.3)' : '#2D3F55'
                                  e.currentTarget.style.background = isLogout ? 'rgba(239,68,68,0.08)' : '#1C2B40'
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = isLogout ? 'rgba(239,68,68,0.15)' : '#1E293B'
                                  e.currentTarget.style.background = isLogout ? 'rgba(239,68,68,0.04)' : '#162033'
                                }}
                              >
                                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center"
                                  style={{ background: `${item.color}12` }}>
                                  <Icon size={21} style={{ color: item.color }} strokeWidth={1.6} />
                                </div>
                                <span className="text-[11px] font-medium leading-tight text-center"
                                  style={{ color: isLogout ? '#EF4444' : '#64748B' }}>
                                  {item.label}
                                </span>
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Footer note */}
                    <div className="flex items-center gap-2 p-3 rounded-[10px]"
                      style={{ background: '#162033', border: '1px solid #1E293B' }}>
                      <Info size={12} className="flex-shrink-0" style={{ color: '#3B82F6' }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: '#64748B' }}>
                        All payments are settled on-chain via ETH. Fiat conversion handled by HashPay's hybrid bridge.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* ── Service form ── */}
                {activeService && (
                  <motion.div
                    key={activeService}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 py-5"
                  >
                    <ServiceForm
                      serviceId={activeService}
                      onBack={() => setActiveService(null)}
                      onClose={handleClose}
                    />
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
