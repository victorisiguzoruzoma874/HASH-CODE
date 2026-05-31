import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle, Clock, ExternalLink, Copy, RefreshCw,
  Zap, Shield, Building2, Hash, ChevronDown, ChevronRight
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { EscrowStatus, EscrowOrder } from '../store/useStore'

const statusMeta: Record<EscrowStatus, { label: string; color: string; bg: string }> = {
  idle:       { label: 'Idle',       color: '#7A97B4', bg: '#EEF3FB'                   },
  depositing: { label: 'Depositing', color: '#B45309', bg: '#FEF3E2'                   },
  confirming: { label: 'Confirming', color: '#0B50D4', bg: '#E8EFFE'                   },
  paying_out: { label: 'Paying Out', color: '#7C3AED', bg: '#F3EEFF'                   },
  completed:  { label: 'Completed',  color: '#057A4B', bg: '#E4F7EE'                   },
  failed:     { label: 'Failed',     color: '#C5202B', bg: '#FDECEA'                   },
  refunded:   { label: 'Refunded',   color: '#B45309', bg: '#FEF3E2'                   },
}

const StatusBadge: React.FC<{ status: EscrowStatus }> = ({ status }) => {
  const m = statusMeta[status]
  return (
    <span className="inline-flex items-center gap-1.5" style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800, color: m.color, background: m.bg }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
      {m.label}
    </span>
  )
}

const CodeBlock: React.FC<{ title: string; code: string }> = ({ title, code }) => {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ background: '#0A1929', border: '1px solid #1A2D4A', borderRadius: 16, overflow: 'hidden' }}>
      <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '1px solid #1A2D4A' }}>
        <div className="flex items-center gap-2">
          <div style={{ display: 'flex', gap: 6 }}>
            {['rgba(239,68,68,0.6)','rgba(245,158,11,0.6)','rgba(34,197,94,0.6)'].map(bg => (
              <div key={bg} style={{ width: 10, height: 10, borderRadius: '50%', background: bg }} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#4E6A8D', marginLeft: 4 }}>{title}</span>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="flex items-center gap-1"
          style={{ fontSize: 11, fontWeight: 700, color: '#4E6A8D', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#8BA3C7' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4E6A8D' }}
        >
          <Copy size={11} />{copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre style={{ padding: '16px', fontSize: 11, fontFamily: 'monospace', color: '#8BA3C7', overflowX: 'auto', lineHeight: 1.7, whiteSpace: 'pre', margin: 0 }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

const FlowDiagram: React.FC = () => {
  const nodes = [
    { label: 'User Wallet',       sub: 'Sui / EVM',       color: '#0B50D4', icon: '👤' },
    { label: 'swap_manager',      sub: 'Move package',    color: '#7C3AED', icon: '⚡' },
    { label: 'Cetus DEX',         sub: 'On-chain pool',   color: '#B45309', icon: '🔄' },
    { label: 'escrow.move',       sub: 'Shared object',   color: '#7C3AED', icon: '🔒' },
    { label: 'Sui Indexer',       sub: 'Event listener',  color: '#0B50D4', icon: '📡' },
    { label: 'HashPay Backend',   sub: 'Node.js service', color: '#3D5A78', icon: '⚙️' },
    { label: 'Flutterwave API',   sub: 'Fiat rails',      color: '#057A4B', icon: '🏦' },
    { label: 'User Bank Account', sub: 'NGN settlement',  color: '#057A4B', icon: '✅' },
  ]
  return (
    <div style={{ background: '#fff', border: '1px solid #DDE6F2', borderRadius: 20, boxShadow: '0 1px 4px rgba(10,25,41,0.07)', padding: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929', marginBottom: 20 }}>Settlement Architecture</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {nodes.map((node, i) => (
          <React.Fragment key={node.label}>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 14px', borderRadius: 12, minWidth: 90, border: `1px solid ${node.color}30`, background: `${node.color}08` }}
            >
              <span style={{ fontSize: 18 }}>{node.icon}</span>
              <div style={{ fontSize: 11, fontWeight: 800, textAlign: 'center', color: '#0A1929', lineHeight: 1.3 }}>{node.label}</div>
              <div style={{ fontSize: 9, textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: '#7A97B4' }}>{node.sub}</div>
            </motion.div>
            {i < nodes.length - 1 && <ChevronRight size={14} style={{ color: '#C4D4E8', flexShrink: 0 }} />}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 16, borderTop: '1px solid #EEF3FB' }}>
        {[['#7C3AED','On-chain (Sui Move)'],['#0B50D4','Indexer / Events'],['#057A4B','Off-chain / Fiat']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: '#7A97B4' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
          </div>
        ))}
      </div>
    </div>
  )
}

const OrderRow: React.FC<{ order: EscrowOrder }> = ({ order }) => {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ border: '1px solid #DDE6F2', borderRadius: 14, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 text-left transition-colors"
        style={{ padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F4F8FD' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#A8BDD4' }}>{order.createdAt}</div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#0A1929' }}>{order.amountCrypto}</div>
            <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: '#057A4B' }}>{order.amountFiat}</div>
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: '#7A97B4' }}>
            <Building2 size={13} />{order.bankName}
          </div>
          <ChevronDown size={14} style={{ color: '#A8BDD4', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
          style={{ padding: '16px 20px', borderTop: '1px solid #EEF3FB', background: '#F4F8FD' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 600, color: '#7A97B4', marginBottom: 4 }}>Sui Tx Digest</div>
              <div className="flex items-center gap-1.5" style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0B50D4' }}>
                {order.txHash}<ExternalLink size={11} />
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#7A97B4', marginBottom: 4 }}>Payout Reference</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#057A4B' }}>{order.payoutRef ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#7A97B4', marginBottom: 4 }}>Account</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0A1929' }}>{order.accountNumber}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#7A97B4', marginBottom: 4 }}>Sui Event</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', fontWeight: 600, color: '#7C3AED' }}>{order.aptosEvent ?? '—'}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export const OfframpPage: React.FC = () => {
  const orders    = useStore(s => s.escrow.orders)
  const openModal = useStore(s => s.openModal)
  const [activeTab, setActiveTab] = useState<'orders' | 'architecture'>('orders')

  const swapManagerCode = `// swap_manager.move (Sui Move)
module hashpay::swap_manager {
  use sui::coin::{Self, Coin};
  use cetus_clmm::pool_script;
  use hashpay::escrow;

  public entry fun swap_and_escrow<CoinIn, CoinOut>(
    pool: &mut Pool<CoinIn, CoinOut>,
    coin_in: Coin<CoinIn>,
    min_out: u64,
    ctx: &mut TxContext,
  ) {
    let coin_out = pool_script::swap_a2b(pool, coin_in, min_out, ctx);
    escrow::deposit(coin_out, ctx);
    // → emits DepositReceived { sender, amount, asset, digest }
  }
}`

  const escrowCode = `// escrow.move (Sui Move)
module hashpay::escrow {
  struct DepositReceived has copy, drop {
    sender: address, amount: u64, asset: vector<u8>,
  }
  public fun deposit<CoinType>(coin_in: Coin<CoinType>, ctx: &mut TxContext) {
    balance::join(&mut vault.balance, coin::into_balance(coin_in));
    event::emit(DepositReceived { sender: tx_context::sender(ctx), ... });
  }
  public entry fun refund<CoinType>(
    _admin_cap: &AdminCap, recipient: address, amount: u64, ctx: &mut TxContext,
  ) {
    transfer::public_transfer(coin::from_balance(..., ctx), recipient);
  }
}`

  const backendCode = `// escrow-listener.ts
const sui = new SuiClient({ url: getFullnodeUrl("mainnet") });
const flw = new Flutterwave(process.env.FLW_PUBLIC, process.env.FLW_SECRET);

async function listenForDeposits() {
  const events = await sui.queryEvents({
    query: { MoveEventType: "0xhashpay::escrow::DepositReceived" },
  });
  for (const event of events.data) {
    const { sender, amount } = event.parsedJson as any;
    const ngnAmount = await getRate(event.parsedJson.asset) * amount * 0.995;
    await flw.Transfer.initiate({
      account_bank: user.bankCode,
      account_number: user.accountNumber,
      amount: ngnAmount, currency: "NGN",
    });
  }
}`

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #DDE6F2',
    borderRadius: 20, boxShadow: '0 1px 4px rgba(10,25,41,0.07)',
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#EEF3FB' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 bg-white" style={{ padding: '24px 28px', borderBottom: '1px solid #DDE6F2' }}>
        <div>
          <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A1929', letterSpacing: '-0.02em' }}>Fiat Offramp</h1>
            <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800, background: '#F3EEFF', color: '#7C3AED' }}>
              HYBRID · SUI + FIAT
            </span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#7A97B4' }}>
            Convert crypto to NGN via Move escrow on Sui + Flutterwave settlement
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => openModal('convert')}
          className="flex items-center gap-2"
          style={{ padding: '12px 22px', background: '#0B50D4', color: '#fff', border: 'none', borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(11,80,212,0.28)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0840AA' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0B50D4' }}
        >
          <Zap size={14} /> New Conversion
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-shrink-0 bg-white" style={{ padding: '0 22px', borderBottom: '1px solid #DDE6F2' }}>
        {(['orders', 'architecture'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '14px 16px',
              fontSize: 14,
              fontWeight: 800,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #0B50D4' : '2px solid transparent',
              color: activeTab === tab ? '#0B50D4' : '#7A97B4',
              transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}
            onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = '#0A1929' }}
            onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = '#7A97B4' }}
          >
            {tab === 'orders' ? 'Orders & History' : 'Architecture & Code'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6" style={{ padding: '24px 28px' }}>

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Converted', value: '₦78,500',  color: '#057A4B', bg: '#E4F7EE' },
                { label: 'Pending Orders',  value: '0',         color: '#B45309', bg: '#FEF3E2' },
                { label: 'Completed',       value: `${orders.filter(o => o.status === 'completed').length}`, color: '#057A4B', bg: '#E4F7EE' },
                { label: 'Avg. Settlement', value: '< 90s',     color: '#0B50D4', bg: '#E8EFFE' },
              ].map(s => (
                <div key={s.label} style={{ ...card, padding: '20px 22px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A97B4', marginBottom: 8 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Orders list */}
            <div style={card}>
              <div className="flex items-center justify-between" style={{ padding: '18px 22px', borderBottom: '1px solid #DDE6F2' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>Escrow Orders</div>
                <button className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 700, color: '#7A97B4', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#0A1929' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#7A97B4' }}>
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 14, fontWeight: 600, color: '#A8BDD4' }}>
                    No orders yet. Click "New Conversion" to get started.
                  </div>
                ) : (
                  orders.map(order => <OrderRow key={order.id} order={order} />)
                )}
              </div>
            </div>

            {/* How it works */}
            <div style={card}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #DDE6F2' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1929' }}>How Hybrid Settlement Works</div>
              </div>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { title: 'On-chain swap',  desc: 'swap_manager.move calls Cetus DEX to convert your asset to USDC. Rate locked to prevent front-running.', color: '#0B50D4', bg: '#E8EFFE', icon: <Zap size={14} /> },
                  { title: 'Escrow lock',    desc: 'escrow.move deposits USDC into a shared object vault and emits a DepositReceived event.', color: '#7C3AED', bg: '#F3EEFF', icon: <Shield size={14} /> },
                  { title: 'Event trigger',  desc: 'HashPay backend subscribes via Sui Indexer. On event, verifies KYC and transaction finality.', color: '#B45309', bg: '#FEF3E2', icon: <Hash size={14} /> },
                  { title: 'NGN payout',     desc: 'Backend calls Flutterwave /transfers. If payout fails, refund() is called on-chain to return USDC.', color: '#057A4B', bg: '#E4F7EE', icon: <Building2 size={14} /> },
                ].map(item => (
                  <div key={item.title} className="flex gap-3" style={{ padding: '16px 18px', background: '#F4F8FD', border: '1px solid #DDE6F2', borderRadius: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1929', marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#3D5A78', lineHeight: 1.65 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── ARCHITECTURE TAB ── */}
        {activeTab === 'architecture' && (
          <>
            <FlowDiagram />

            {/* Move vs EVM table */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #DDE6F2', fontSize: 16, fontWeight: 800, color: '#0A1929' }}>
                Move vs EVM — Key Differences
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 2fr', fontSize: 13 }}>
                {[['Concept','#A8BDD4'],['Move on Sui','#7C3AED'],['Why it matters','#0B50D4']].map(([h, c]) => (
                  <div key={h} style={{ padding: '10px 22px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #DDE6F2', color: c }}>{h}</div>
                ))}
                {[
                  ['Resources',     'Coins are resources — cannot be duplicated or lost',  'Safer custody; deposit/withdraw must be explicit'],
                  ['Transactions',  'Atomic + gas metering on every op',                   'Full swap + escrow succeeds or nothing happens'],
                  ['Events',        'Native event emission via EventHandle',                'Reliable backend triggers — no polling needed'],
                  ['Access ctrl',   'Signer-based; only @hashpay admin can call refund()', 'No reentrancy, no unauthorized withdrawals'],
                  ['Oracles',       'Pyth / Supra / Switchboard on Aptos',                 'Price locked in txn args — MEV resistant'],
                ].map(([concept, move, why], i) => (
                  <React.Fragment key={i}>
                    <div style={{ padding: '12px 22px', borderBottom: '1px solid #EEF3FB', fontWeight: 700, color: '#3D5A78' }}>{concept}</div>
                    <div style={{ padding: '12px 22px', borderBottom: '1px solid #EEF3FB', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#7C3AED' }}>{move}</div>
                    <div style={{ padding: '12px 22px', borderBottom: '1px solid #EEF3FB', fontWeight: 500, color: '#7A97B4' }}>{why}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Code blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CodeBlock title="swap_manager.move — Cetus DEX swap + escrow entry (Sui)" code={swapManagerCode} />
              <CodeBlock title="escrow.move — Shared object vault + event emission (Sui)" code={escrowCode} />
              <CodeBlock title="escrow-listener.ts — Backend Sui event handler + Flutterwave payout" code={backendCode} />
            </div>

            {/* Production checklist */}
            <div style={card}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #DDE6F2', fontSize: 16, fontWeight: 800, color: '#0A1929' }}>
                Production Checklist
              </div>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { done: true,  item: 'Idempotency keys — prevent double payout on event replay' },
                  { done: true,  item: 'Rate locking — quote hash stored on-chain, verified in txn' },
                  { done: true,  item: 'Access control — only @hashpay signer calls payout_coin/refund' },
                  { done: false, item: 'KYC gating — check on-chain KYC NFT or off-chain API' },
                  { done: false, item: 'Reconciliation job — match on-chain USDC balance vs DB daily' },
                  { done: true,  item: 'Refund path — escrow::refund() triggered if fiat payout fails' },
                  { done: false, item: 'Multisig treasury — require 2-of-3 for large withdrawals' },
                  { done: true,  item: 'Slippage guard — revert if output < min_out (1–2%)' },
                ].map(({ done, item }) => (
                  <div key={item} className="flex items-start gap-3" style={{ padding: '12px 14px', background: done ? '#F4F8FD' : '#fff', border: '1px solid #DDE6F2', borderRadius: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: done ? '#E4F7EE' : '#EEF3FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {done
                        ? <CheckCircle size={12} style={{ color: '#057A4B' }} />
                        : <Clock       size={12} style={{ color: '#A8BDD4' }} />
                      }
                    </div>
                    <span style={{ fontSize: 13, fontWeight: done ? 600 : 500, lineHeight: 1.55, color: done ? '#0A1929' : '#A8BDD4' }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
