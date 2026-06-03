import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, PhoneCall, Smartphone, BookOpen, Zap, BadgeCheck, Tv2,
  CircleDot, Gamepad2, Receipt, HeartPulse, PiggyBank, FileText,
  Gauge, Settings, LogOut, ArrowLeft, Building2, CreditCard,
  CheckCircle, Loader2, Info,
} from 'lucide-react'

interface BillPayModalProps { isOpen: boolean; onClose: () => void }

const SECTIONS = [
  {
    title: 'Bills and Recharges',
    items: [
      { id: 'airtime',     label: 'Airtime',     icon: PhoneCall,  color: '#0B50D4', bg: '#E8EFFE' },
      { id: 'data',        label: 'Data',        icon: Smartphone, color: '#0891B2', bg: '#E0F5FA' },
      { id: 'education',   label: 'Education',   icon: BookOpen,   color: '#0B50D4', bg: '#E8EFFE' },
      { id: 'electricity', label: 'Electricity', icon: Zap,        color: '#B45309', bg: '#FEF3E2' },
      { id: 'government',  label: 'Government',  icon: BadgeCheck, color: '#0B50D4', bg: '#E8EFFE' },
      { id: 'tv',          label: 'TV',          icon: Tv2,        color: '#7C3AED', bg: '#F3EEFF' },
    ],
  },
  {
    title: 'Lifestyle',
    items: [
      { id: 'betting',   label: 'Betting',   icon: CircleDot,  color: '#B45309', bg: '#FEF3E2' },
      { id: 'gaming',    label: 'Gaming',    icon: Gamepad2,   color: '#7C3AED', bg: '#F3EEFF' },
      { id: 'utilities', label: 'Utilities', icon: Receipt,    color: '#B45309', bg: '#FEF3E2' },
      { id: 'health',    label: 'Health',    icon: HeartPulse, color: '#C5202B', bg: '#FDECEA' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { id: 'savings', label: 'Savings', icon: PiggyBank, color: '#057A4B', bg: '#E4F7EE' },
    ],
  },
  {
    title: 'Accounts and Settings',
    items: [
      { id: 'statement', label: 'Statement', icon: FileText, color: '#7A97B4', bg: '#EEF3FB' },
      { id: 'limits',    label: 'Limits',    icon: Gauge,    color: '#7A97B4', bg: '#EEF3FB' },
      { id: 'settings',  label: 'Settings',  icon: Settings, color: '#7A97B4', bg: '#EEF3FB' },
      { id: 'logout',    label: 'Logout',    icon: LogOut,   color: '#C5202B', bg: '#FDECEA' },
    ],
  },
]

interface ServiceConfig {
  title: string; subtitle: string
  fields: { id: string; label: string; placeholder: string; type?: string }[]
  amounts?: { label: string; value: string; eth: string }[]
  providers?: string[]
}

const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  airtime: {
    title: 'Airtime Top-up', subtitle: 'Recharge any network instantly',
    providers: ['MTN', 'Airtel', 'Glo', 'Etisalat (9mobile)'],
    fields: [{ id: 'phone', label: 'Phone Number', placeholder: '080 0000 0000', type: 'tel' }],
    amounts: [
      { label: '₦100', value: '100', eth: '0.000018' }, { label: '₦200', value: '200', eth: '0.000036' },
      { label: '₦500', value: '500', eth: '0.000090' }, { label: '₦1000', value: '1000', eth: '0.000180' },
    ],
  },
  data: {
    title: 'Data Bundle', subtitle: 'Buy mobile data for any network',
    providers: ['MTN', 'Airtel', 'Glo', 'Etisalat (9mobile)'],
    fields: [{ id: 'phone', label: 'Phone Number', placeholder: '080 0000 0000', type: 'tel' }],
    amounts: [
      { label: '1GB / 1d', value: '300', eth: '0.000054' }, { label: '2GB / 7d', value: '500', eth: '0.000090' },
      { label: '5GB / 30d', value: '1500', eth: '0.000270' }, { label: '10GB / 30d', value: '2500', eth: '0.000450' },
    ],
  },
  electricity: {
    title: 'Electricity Bill', subtitle: 'Pay DISCO bills & buy prepaid tokens',
    providers: ['EKEDC', 'IKEDC', 'AEDC', 'PHEDC', 'KEDCO', 'BEDC'],
    fields: [
      { id: 'meter', label: 'Meter Number', placeholder: '12345678901' },
      { id: 'amount', label: 'Amount (₦)', placeholder: '5000', type: 'number' },
    ],
  },
  education: {
    title: 'Education Payment', subtitle: 'Pay school fees, WAEC, JAMB & more',
    providers: ['WAEC', 'NECO', 'JAMB', 'NABTEB', 'NIN Slip'],
    fields: [
      { id: 'examno', label: 'Exam / Student Number', placeholder: 'Enter number' },
      { id: 'amount', label: 'Amount (₦)', placeholder: '15000', type: 'number' },
    ],
  },
  government: {
    title: 'Government Services', subtitle: 'Pay levies, taxes & government fees',
    providers: ['FIRS', 'LIRS', 'CAC', 'NIN', 'Passport'],
    fields: [
      { id: 'ref', label: 'Reference / RRR Number', placeholder: 'Enter reference' },
      { id: 'amount', label: 'Amount (₦)', placeholder: '10000', type: 'number' },
    ],
  },
  tv: {
    title: 'TV Subscription', subtitle: 'Renew DStv, GOtv, Startimes & more',
    providers: ['DStv', 'GOtv', 'Startimes', 'ShowMax'],
    fields: [{ id: 'smartcard', label: 'Smart Card / IUC Number', placeholder: '1234567890' }],
    amounts: [
      { label: 'Padi (₦1,850)', value: '1850', eth: '0.000333' }, { label: 'Yanga (₦2,565)', value: '2565', eth: '0.000462' },
      { label: 'Confam (₦4,615)', value: '4615', eth: '0.000831' }, { label: 'Compact (₦9,000)', value: '9000', eth: '0.001620' },
    ],
  },
  betting: {
    title: 'Betting & Sports', subtitle: 'Fund your betting wallet instantly',
    providers: ['Bet9ja', 'SportyBet', '1xBet', 'BetKing', 'NairaBet'],
    fields: [
      { id: 'userid', label: 'User ID / Account Number', placeholder: 'Enter user ID' },
      { id: 'amount', label: 'Amount (₦)', placeholder: '2000', type: 'number' },
    ],
  },
  gaming: {
    title: 'Gaming Top-up', subtitle: 'Buy game credits, gift cards & pins',
    providers: ['PlayStation', 'Xbox', 'Steam', 'Roblox', 'PUBG Mobile'],
    fields: [{ id: 'gameid', label: 'Game ID / Username', placeholder: 'Enter game ID' }],
    amounts: [
      { label: '₦500', value: '500', eth: '0.000090' }, { label: '₦1000', value: '1000', eth: '0.000180' },
      { label: '₦2500', value: '2500', eth: '0.000450' }, { label: '₦5000', value: '5000', eth: '0.000900' },
    ],
  },
  utilities: {
    title: 'Utilities', subtitle: 'Pay water, waste & other utility bills',
    providers: ['Lagos Water', 'Abuja Water', 'LAWMA', 'RCCG'],
    fields: [
      { id: 'account', label: 'Account Number', placeholder: 'Enter account number' },
      { id: 'amount', label: 'Amount (₦)', placeholder: '3000', type: 'number' },
    ],
  },
  health: {
    title: 'Health & Insurance', subtitle: 'Pay HMO premiums & health bills',
    providers: ['NHIS', 'Hygeia HMO', 'AXA Mansard', 'Reliance HMO'],
    fields: [
      { id: 'memberid', label: 'Member / Policy ID', placeholder: 'Enter ID' },
      { id: 'amount', label: 'Amount (₦)', placeholder: '5000', type: 'number' },
    ],
  },
  savings: {
    title: 'Savings', subtitle: 'Fund your savings wallet or target',
    providers: ['PiggyVest', 'Cowrywise', 'Carbon', 'Kuda Savings'],
    fields: [
      { id: 'account', label: 'Account / Plan ID', placeholder: 'Enter ID' },
      { id: 'amount', label: 'Amount (₦)', placeholder: '10000', type: 'number' },
    ],
  },
  statement: {
    title: 'Account Statement', subtitle: 'Request your transaction statement',
    fields: [{ id: 'email', label: 'Email Address', placeholder: 'name@email.com', type: 'email' }],
    amounts: [
      { label: '1 Month', value: '1m', eth: '' }, { label: '3 Months', value: '3m', eth: '' },
      { label: '6 Months', value: '6m', eth: '' }, { label: '1 Year', value: '1y', eth: '' },
    ],
  },
  limits: { title: 'Transaction Limits', subtitle: 'View and manage your spending limits', fields: [] },
  settings: { title: 'Account Settings', subtitle: 'Manage your HashPay preferences', fields: [] },
  logout: { title: 'Logout', subtitle: 'Sign out of your HashPay account', fields: [] },
}

const inputStyle: React.CSSProperties = {
  background: '#F8FAFD', border: '1.5px solid #C4D4E8', color: '#0A1929',
  borderRadius: 12, outline: 'none',
}

const ServiceForm: React.FC<{ serviceId: string; onBack: () => void; onClose: () => void }> = ({ serviceId, onBack, onClose }) => {
  const config = SERVICE_CONFIGS[serviceId]
  const [provider, setProvider]         = useState(config?.providers?.[0] ?? '')
  const [fields, setFields]             = useState<Record<string, string>>({})
  const [selectedAmount, setSelectedAmount] = useState(config?.amounts?.[0]?.value ?? '')
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading]           = useState(false)
  const [success, setSuccess]           = useState(false)

  if (!config) return null

  const handlePay = () => { setLoading(true); setTimeout(() => { setLoading(false); setSuccess(true) }, 2200) }
  const canSubmit = config.fields.every(f => fields[f.id]?.trim()) || config.fields.length === 0

  if (['limits', 'settings', 'logout'].includes(serviceId)) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-4 rounded-[12px]"
          style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
          <Info size={15} className="flex-shrink-0" style={{ color: '#0B50D4' }} />
          <p className="text-[13px]" style={{ color: '#7A97B4' }}>
            {serviceId === 'logout' ? 'Use the sidebar disconnect button to sign out of HashPay.' : `${config.title} management is available in your profile settings.`}
          </p>
        </div>
        <button onClick={onBack}
          className="w-full py-3 rounded-full text-[14px] font-semibold transition-all"
          style={{ border: '1.5px solid #DDE6F2', color: '#7A97B4', background: '#F8FAFD' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.color = '#0B50D4'; e.currentTarget.style.background = '#E8EFFE' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6F2'; e.currentTarget.style.color = '#7A97B4'; e.currentTarget.style.background = '#F8FAFD' }}>
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
          style={{ background: '#E4F7EE' }}>
          <CheckCircle size={32} style={{ color: '#057A4B' }} />
        </div>
        <div className="text-center">
          <div className="text-[17px] font-bold mb-1" style={{ color: '#0A1929' }}>Payment Successful</div>
          <div className="text-[13px]" style={{ color: '#7A97B4' }}>Your {config.title.toLowerCase()} payment has been processed.</div>
        </div>
        <div className="w-full rounded-[12px] p-4 text-[12px] flex flex-col gap-2"
          style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
          {[
            { label: 'Service', value: config.title },
            ...(provider ? [{ label: 'Provider', value: provider }] : []),
            { label: 'Status', value: 'Confirmed', green: true },
            { label: 'Tx Hash', value: `0x${Math.random().toString(16).slice(2, 10)}…`, mono: true },
          ].map((row: any) => (
            <div key={row.label} className="flex justify-between">
              <span style={{ color: '#7A97B4' }}>{row.label}</span>
              <span className={row.mono ? 'font-mono' : 'font-semibold'} style={{ color: row.green ? '#057A4B' : '#0A1929' }}>{row.value}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose}
          className="w-full py-3.5 rounded-full text-[14px] font-bold transition-all"
          style={{ background: '#057A4B', color: '#fff' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#046640' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#057A4B' }}>
          Done
        </button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {config.providers && config.providers.length > 0 && (
        <div>
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>Provider</label>
          <div className="flex flex-wrap gap-2">
            {config.providers.map(p => (
              <button key={p} onClick={() => setProvider(p)}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
                style={provider === p
                  ? { background: '#E8EFFE', color: '#0B50D4', border: '1.5px solid #0B50D430' }
                  : { background: '#F8FAFD', color: '#7A97B4', border: '1.5px solid #DDE6F2' }}
                onMouseEnter={e => { if (provider !== p) { e.currentTarget.style.borderColor = '#0B50D4'; e.currentTarget.style.color = '#0B50D4' } }}
                onMouseLeave={e => { if (provider !== p) { e.currentTarget.style.borderColor = '#DDE6F2'; e.currentTarget.style.color = '#7A97B4' } }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {config.fields.map(f => (
        <div key={f.id}>
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>{f.label}</label>
          <input type={f.type ?? 'text'} placeholder={f.placeholder}
            value={fields[f.id] ?? ''}
            onChange={e => setFields(prev => ({ ...prev, [f.id]: e.target.value }))}
            className="w-full rounded-[12px] px-4 py-2.5 text-[13px] transition-all"
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }} />
        </div>
      ))}

      {config.amounts && config.amounts.length > 0 && (
        <div>
          <label className="text-[11px] font-bold tracking-[0.1em] uppercase block mb-2" style={{ color: '#7A97B4' }}>Select Amount</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {config.amounts.map(a => {
              const isSel = selectedAmount === a.value && !customAmount
              return (
                <motion.button key={a.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedAmount(a.value); setCustomAmount('') }}
                  className="p-3 rounded-[12px] text-left transition-all"
                  style={{
                    background: isSel ? '#E8EFFE' : '#F8FAFD',
                    border: `1.5px solid ${isSel ? '#0B50D4' : '#DDE6F2'}`,
                    boxShadow: isSel ? '0 2px 8px rgba(11,80,212,0.1)' : 'none',
                  }}>
                  <div className="text-[15px] font-black" style={{ fontFamily: 'JetBrains Mono, monospace', color: isSel ? '#0B50D4' : '#0A1929' }}>{a.label}</div>
                  {a.eth && <div className="text-[10px] font-mono mt-0.5" style={{ color: '#A8BDD4' }}>{a.eth} ETH</div>}
                </motion.button>
              )
            })}
          </div>
          <input type="number" placeholder="Custom amount (₦)" value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount('') }}
            className="w-full rounded-[12px] px-4 py-2.5 text-[13px] transition-all"
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = '#0B50D4' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#C4D4E8' }} />
        </div>
      )}

      {(selectedAmount || customAmount) && (
        <div className="rounded-[12px] p-3.5 flex flex-col gap-2 text-[12px]"
          style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
          <div className="flex justify-between">
            <span style={{ color: '#7A97B4' }}>Amount</span>
            <span className="font-mono font-semibold" style={{ color: '#0A1929' }}>₦{customAmount || selectedAmount}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#7A97B4' }}>Network Fee</span>
            <span className="font-mono" style={{ color: '#0A1929' }}>~₦0.42</span>
          </div>
          <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid #DDE6F2' }}>
            <span className="font-bold" style={{ color: '#0A1929' }}>Total</span>
            <span className="font-bold font-mono" style={{ color: '#057A4B' }}>₦{customAmount || selectedAmount}</span>
          </div>
        </div>
      )}

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={handlePay} disabled={loading || !canSubmit}
        className="w-full py-3.5 rounded-full text-[15px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: '#0B50D4', color: '#fff' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0944bb' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}>
        {loading ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><CreditCard size={15} /> Pay Now</>}
      </motion.button>

      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-[0.06em] uppercase"
        style={{ color: '#A8BDD4' }}>
        <Building2 size={11} style={{ color: '#0B50D4' }} />
        Powered by HashPay · Secured by ZK-SNARKs
      </div>
    </div>
  )
}

export const BillPayModal: React.FC<BillPayModalProps> = ({ isOpen, onClose }) => {
  const [activeService, setActiveService] = useState<string | null>(null)
  const handleClose = () => { setActiveService(null); onClose() }
  const activeConfig = activeService ? SERVICE_CONFIGS[activeService] : null
  const activeItem   = SECTIONS.flatMap(s => s.items).find(i => i.id === activeService)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(10,25,41,0.5)' }}
            onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[520px] z-10 rounded-[20px] overflow-hidden flex flex-col"
            style={{ background: '#FFFFFF', border: '1px solid #DDE6F2', boxShadow: '0 8px 40px rgba(10,25,41,0.14)', maxHeight: '88vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{ borderBottom: '1px solid #EEF3FB' }}>
              <div className="flex items-center gap-3">
                {activeService && (
                  <motion.button initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    onClick={() => setActiveService(null)}
                    className="p-1.5 rounded-full transition-all"
                    style={{ color: '#7A97B4', background: '#EEF3FB' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#DDE6F2'; e.currentTarget.style.color = '#0A1929' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#EEF3FB'; e.currentTarget.style.color = '#7A97B4' }}>
                    <ArrowLeft size={14} />
                  </motion.button>
                )}
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: activeItem ? activeItem.bg : '#E8EFFE' }}>
                  {activeItem
                    ? <activeItem.icon size={17} style={{ color: activeItem.color }} />
                    : <Receipt size={17} style={{ color: '#0B50D4' }} />
                  }
                </div>
                <div>
                  <h2 className="text-[16px] font-bold leading-tight" style={{ color: '#0A1929' }}>
                    {activeConfig ? activeConfig.title : 'Bill Pay'}
                  </h2>
                  <p className="text-[12px]" style={{ color: '#7A97B4' }}>
                    {activeConfig ? activeConfig.subtitle : 'Pay bills, recharge & more with ETH'}
                  </p>
                </div>
              </div>
              <button onClick={handleClose}
                className="p-1.5 rounded-full transition-all flex-shrink-0"
                style={{ color: '#7A97B4', background: '#EEF3FB' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#DDE6F2'; e.currentTarget.style.color = '#0A1929' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#EEF3FB'; e.currentTarget.style.color = '#7A97B4' }}>
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              <AnimatePresence mode="wait">
                {!activeService && (
                  <motion.div key="grid"
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                    className="px-6 py-5 flex flex-col gap-6">
                    {SECTIONS.map(section => (
                      <div key={section.title}>
                        <div className="text-[11px] font-bold tracking-[0.1em] uppercase mb-3" style={{ color: '#7A97B4' }}>
                          {section.title}
                        </div>
                        <div className="grid grid-cols-4 gap-2.5">
                          {section.items.map(item => {
                            const Icon = item.icon
                            return (
                              <motion.button key={item.id}
                                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setActiveService(item.id)}
                                className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-[16px] transition-all"
                                style={{ background: '#FAFBFF', border: '1.5px solid #E8EEF8' }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = item.bg
                                  e.currentTarget.style.borderColor = item.color + '40'
                                  e.currentTarget.style.boxShadow = `0 4px 16px ${item.color}18`
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = '#FAFBFF'
                                  e.currentTarget.style.borderColor = '#E8EEF8'
                                  e.currentTarget.style.boxShadow = 'none'
                                }}>
                                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center"
                                  style={{ background: item.bg, boxShadow: `0 2px 8px ${item.color}20` }}>
                                  <Icon size={20} style={{ color: item.color }} strokeWidth={1.8} />
                                </div>
                                <span className="text-[11px] font-semibold leading-tight text-center" style={{ color: '#4A6580' }}>
                                  {item.label}
                                </span>
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 p-3.5 rounded-[12px]"
                      style={{ background: '#EEF3FB', border: '1px solid #DDE6F2' }}>
                      <Info size={12} className="flex-shrink-0" style={{ color: '#0B50D4' }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: '#7A97B4' }}>
                        All payments are settled on-chain via ETH. Fiat conversion handled by HashPay's hybrid bridge.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeService && (
                  <motion.div key={activeService}
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}
                    className="px-6 py-5">
                    <ServiceForm serviceId={activeService} onBack={() => setActiveService(null)} onClose={handleClose} />
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
