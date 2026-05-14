import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle, Clock, ExternalLink, Copy, RefreshCw,
  Zap, Shield, Building2, Hash, ChevronDown, ChevronRight
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { EscrowStatus, EscrowOrder } from '../store/useStore'

// ── Status badge ──────────────────────────────────────────────
const statusMeta: Record<EscrowStatus, { label: string; color: string; bg: string }> = {
  idle:       { label: 'Idle',       color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
  depositing: { label: 'Depositing', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  confirming: { label: 'Confirming', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  paying_out: { label: 'Paying Out', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
  completed:  { label: 'Completed',  color: '#22C55E', bg: 'rgba(34,197,94,0.1)'   },
  failed:     { label: 'Failed',     color: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  refunded:   { label: 'Refunded',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
}

const StatusBadge: React.FC<{ status: EscrowStatus }> = ({ status }) => {
  const m = statusMeta[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ color: m.color, background: m.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  )
}

// ── Code block ────────────────────────────────────────────────
const CodeBlock: React.FC<{ title: string; code: string }> = ({ title, code }) => {
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-[14px] overflow-hidden" style={{ background: '#07111F', border: '1px solid #1E293B' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #1E293B' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(239,68,68,0.5)' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(245,158,11,0.5)' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(34,197,94,0.5)' }} />
          </div>
          <span className="text-[11px] font-medium ml-1" style={{ color: '#334155' }}>{title}</span>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="flex items-center gap-1 text-[10px] transition-colors"
          style={{ color: '#334155' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#94A3B8' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#334155' }}
        >
          <Copy size={11} />{copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-4 text-[11px] font-mono overflow-x-auto leading-relaxed whitespace-pre"
        style={{ color: '#94A3B8' }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ── Architecture diagram ──────────────────────────────────────
const FlowDiagram: React.FC = () => {
  const nodes = [
    { id: 1, label: 'User Wallet',       sub: 'Aptos / EVM',     color: '#3B82F6', icon: '👤' },
    { id: 2, label: 'swap_manager',      sub: 'Move module',     color: '#8B5CF6', icon: '⚡' },
    { id: 3, label: 'Liquidswap DEX',    sub: 'On-chain pool',   color: '#F59E0B', icon: '🔄' },
    { id: 4, label: 'escrow.move',       sub: 'Resource acct',   color: '#8B5CF6', icon: '🔒' },
    { id: 5, label: 'Aptos Indexer',     sub: 'Event listener',  color: '#3B82F6', icon: '📡' },
    { id: 6, label: 'HashPay Backend',   sub: 'Node.js service', color: '#64748B', icon: '⚙️' },
    { id: 7, label: 'Flutterwave API',   sub: 'Fiat rails',      color: '#22C55E', icon: '🏦' },
    { id: 8, label: 'User Bank Account', sub: 'NGN settlement',  color: '#22C55E', icon: '✅' },
  ]
  return (
    <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
      <div className="text-[13px] font-semibold mb-4" style={{ color: '#F8FAFC' }}>Settlement Architecture</div>
      <div className="flex flex-wrap items-center gap-2">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[10px] min-w-[90px]"
              style={{ border: `1px solid ${node.color}25`, background: `${node.color}08` }}
            >
              <span className="text-base">{node.icon}</span>
              <div className="text-[11px] font-semibold text-center leading-tight" style={{ color: '#F8FAFC' }}>{node.label}</div>
              <div className="text-[9px] text-center font-mono" style={{ color: '#334155' }}>{node.sub}</div>
            </motion.div>
            {i < nodes.length - 1 && <ChevronRight size={13} style={{ color: '#334155', flexShrink: 0 }} />}
          </React.Fragment>
        ))}
      </div>
      <div className="flex gap-5 mt-4 pt-4" style={{ borderTop: '1px solid #1E293B' }}>
        {[['#8B5CF6','On-chain (Move)'],['#3B82F6','Indexer / Events'],['#22C55E','Off-chain / Fiat']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5 text-[11px]" style={{ color: '#64748B' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Order row ─────────────────────────────────────────────────
const OrderRow: React.FC<{ order: EscrowOrder }> = ({ order }) => {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid #1E293B' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-semibold font-mono" style={{ color: '#F8FAFC' }}>{order.id}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="text-[11px]" style={{ color: '#334155' }}>{order.createdAt}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-[13px] font-medium font-mono" style={{ color: '#F8FAFC' }}>{order.amountCrypto}</div>
            <div className="text-[11px] font-semibold font-mono" style={{ color: '#22C55E' }}>{order.amountFiat}</div>
          </div>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: '#64748B' }}>
            <Building2 size={12} />{order.bankName}
          </div>
          <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: '#334155' }} />
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
          className="px-5 py-4"
          style={{ borderTop: '1px solid #1E293B', background: 'rgba(7,17,31,0.5)' }}
        >
          <div className="grid grid-cols-2 gap-4 text-[12px]">
            <div>
              <div className="mb-1" style={{ color: '#334155' }}>Aptos Tx Hash</div>
              <div className="flex items-center gap-1.5 font-mono" style={{ color: '#3B82F6' }}>
                {order.txHash}<ExternalLink size={11} />
              </div>
            </div>
            <div>
              <div className="mb-1" style={{ color: '#334155' }}>Payout Reference</div>
              <div className="font-mono" style={{ color: '#22C55E' }}>{order.payoutRef ?? '—'}</div>
            </div>
            <div>
              <div className="mb-1" style={{ color: '#334155' }}>Account</div>
              <div className="font-mono" style={{ color: '#F8FAFC' }}>{order.accountNumber}</div>
            </div>
            <div>
              <div className="mb-1" style={{ color: '#334155' }}>Move Event</div>
              <div className="font-mono text-[11px] break-all" style={{ color: '#8B5CF6' }}>{order.aptosEvent ?? '—'}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export const OfframpPage: React.FC = () => {
  const orders    = useStore(s => s.escrow.orders)
  const openModal = useStore(s => s.openModal)
  const [activeTab, setActiveTab] = useState<'orders' | 'architecture'>('orders')

  const swapManagerCode = `// swap_manager.move
module hashpay::swap_manager {
  use aptos_framework::coin;
  use liquidswap::router;
  use hashpay::escrow;
  use hashpay::oracle_price;

  public entry fun swap_and_escrow<CoinIn, CoinOut>(
    user: &signer,
    amount_in: u64,
    min_out: u64,   // slippage guard
  ) {
    let price    = oracle_price::get_price<CoinIn, CoinOut>();
    let coin_in  = coin::withdraw<CoinIn>(user, amount_in);
    let coin_out = router::swap_exact_coin_for_coin<CoinIn, CoinOut>(coin_in, min_out);
    escrow::deposit(user, coin_out);
    // → emits DepositReceived(user, amount, asset, tx_hash)
  }
}`

  const escrowCode = `// escrow.move
module hashpay::escrow {
  struct DepositReceived has drop, store {
    user: address, amount: u64, asset: vector<u8>, tx_hash: vector<u8>,
  }
  struct EscrowVault<phantom CoinType> has key {
    balance: coin::Coin<CoinType>,
    events:  event::EventHandle<DepositReceived>,
  }
  public fun deposit<CoinType>(user: &signer, coin_in: coin::Coin<CoinType>) {
    let vault = borrow_global_mut<EscrowVault<CoinType>>(@hashpay);
    coin::merge(&mut vault.balance, coin_in);
    event::emit_event(&mut vault.events, DepositReceived { ... });
  }
  public entry fun refund<CoinType>(admin: &signer, user: address, amount: u64) {
    assert!(signer::address_of(admin) == @hashpay, 403);
    let refund_coin = coin::extract(&mut vault.balance, amount);
    coin::deposit(user, refund_coin);
  }
}`

  const oracleCode = `// oracle_price.move
module hashpay::oracle_price {
  public fun quote_out(amount_in: u64, price: u64, fee_bps: u64): u64 {
    let gross = amount_in * price / 1_000_000;
    let fee   = gross * fee_bps / 10_000;
    gross - fee
  }
  public fun get_price<CoinIn, CoinOut>(): u64 {
    let feed_id = price_identifier::from_byte_vec(ETH_USD_FEED);
    (pyth::get_price(feed_id).price as u64)
  }
}`

  const backendCode = `// escrow-listener.ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import Flutterwave from "flutterwave-node-v3";

const aptos = new Aptos(new AptosConfig({ network: Network.MAINNET }));
const flw   = new Flutterwave(process.env.FLW_PUBLIC, process.env.FLW_SECRET);

async function listenForDeposits() {
  const events = await aptos.getModuleEventsByEventType({
    eventType: "0xhashpay::escrow::DepositReceived",
  });
  for (const event of events) {
    if (await db.orderExists(event.sequence_number)) continue;
    const kyc = await checkKYC(event.data.user);
    if (!kyc.passed) { await triggerRefund(event.data.user, event.data.amount); continue; }
    const ngnAmount = await getRate(event.data.asset) * event.data.amount * 0.995;
    const payout = await flw.Transfer.initiate({
      account_bank: user.bankCode, account_number: user.accountNumber,
      amount: ngnAmount, currency: "NGN",
      reference: \`HP-\${event.sequence_number}\`,
    });
    await db.saveOrder({ aptosEvent: event.sequence_number, payoutRef: payout.data.reference });
  }
}`

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #1E293B' }}>
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-[20px] font-bold" style={{ color: '#F8FAFC' }}>Fiat Offramp</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
              style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}>
              HYBRID · MOVE + FIAT
            </span>
          </div>
          <p className="text-[13px]" style={{ color: '#64748B' }}>
            Crypto → NGN via Move escrow on Aptos + Flutterwave settlement
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => openModal('convert')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)' }}
        >
          <Zap size={14} /> New Conversion
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 flex-shrink-0">
        {(['orders', 'architecture'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all capitalize"
            style={activeTab === tab
              ? { background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }
              : { color: '#64748B' }
            }
            onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = '#F8FAFC' }}
            onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = '#64748B' }}
          >
            {tab === 'orders' ? 'Orders & History' : 'Architecture & Code'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Converted', value: '₦78,500', color: '#22C55E' },
                { label: 'Pending Orders',  value: '0',        color: '#F59E0B' },
                { label: 'Completed',       value: `${orders.filter(o => o.status === 'completed').length}`, color: '#22C55E' },
                { label: 'Avg. Settlement', value: '< 90s',    color: '#3B82F6' },
              ].map(s => (
                <div key={s.label} className="rounded-[18px] p-4" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
                  <div className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1.5" style={{ color: '#64748B' }}>
                    {s.label}
                  </div>
                  <div className="text-[22px] font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Orders list */}
            <div className="rounded-[20px] overflow-hidden" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1E293B' }}>
                <span className="text-[14px] font-semibold" style={{ color: '#F8FAFC' }}>Escrow Orders</span>
                <button className="flex items-center gap-1.5 text-[12px] font-medium transition-colors" style={{ color: '#64748B' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#64748B' }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              <div className="flex flex-col gap-2 p-4">
                {orders.length === 0 ? (
                  <div className="text-center py-10 text-[13px]" style={{ color: '#334155' }}>
                    No orders yet. Click "New Conversion" to get started.
                  </div>
                ) : (
                  orders.map(order => <OrderRow key={order.id} order={order} />)
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="text-[13px] font-semibold mb-4" style={{ color: '#F8FAFC' }}>How Hybrid Settlement Works</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: 'On-chain swap',  desc: 'swap_manager.move calls Liquidswap DEX to convert your asset to USDC. Rate locked in txn args to prevent front-running.', color: '#3B82F6', icon: <Zap size={13} /> },
                  { title: 'Escrow lock',    desc: 'escrow.move deposits USDC into a resource account. Emits DepositReceived event with amount, asset, and tx_hash.', color: '#8B5CF6', icon: <Shield size={13} /> },
                  { title: 'Event trigger',  desc: 'HashPay backend subscribes via Aptos Indexer GraphQL. On event, verifies KYC status and confirmations.', color: '#F59E0B', icon: <Hash size={13} /> },
                  { title: 'NGN payout',     desc: 'Backend calls Flutterwave /transfers API. If payout fails, refund() is called on-chain to return USDC to user.', color: '#22C55E', icon: <Building2 size={13} /> },
                ].map(item => (
                  <div key={item.title} className="flex gap-3 p-4 rounded-[14px]"
                    style={{ background: '#162033', border: '1px solid #1E293B' }}>
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}15`, color: item.color }}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold mb-0.5" style={{ color: '#F8FAFC' }}>{item.title}</div>
                      <div className="text-[11px] leading-relaxed" style={{ color: '#64748B' }}>{item.desc}</div>
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
            <div className="rounded-[20px] overflow-hidden" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #1E293B' }}>
                <span className="text-[13px] font-semibold" style={{ color: '#F8FAFC' }}>Move vs EVM — Key Differences</span>
              </div>
              <div className="grid text-[12px]" style={{ gridTemplateColumns: '1.5fr 2fr 2fr' }}>
                {[['Concept','#334155'],['Move on Aptos','#8B5CF6'],['Why it matters','#3B82F6']].map(([h, c]) => (
                  <div key={h} className="px-5 py-2.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
                    style={{ borderBottom: '1px solid #1E293B', color: c }}>{h}</div>
                ))}
                {[
                  ['Resources',     'Coins are resources — cannot be duplicated or lost',       'Safer custody; deposit/withdraw must be explicit'],
                  ['Transactions',  'Atomic + gas metering on every op',                        'Full swap + escrow succeeds or nothing happens'],
                  ['Events',        'Native event emission via EventHandle',                    'Reliable backend triggers — no polling needed'],
                  ['Entry fns',     'User calls entry fun swap_and_escrow() in one tx',         'Better UX, fewer steps, atomic guarantee'],
                  ['Access ctrl',   'Signer-based; only @hashpay admin can call refund()',      'No reentrancy, no unauthorized withdrawals'],
                  ['Oracles',       'Pyth / Supra / Switchboard on Aptos',                     'Price locked in txn args — MEV resistant'],
                ].map(([concept, move, why], i) => (
                  <React.Fragment key={i}>
                    <div className="px-5 py-3 font-medium" style={{ borderBottom: '1px solid #162033', color: '#94A3B8' }}>{concept}</div>
                    <div className="px-5 py-3 font-mono text-[11px]" style={{ borderBottom: '1px solid #162033', color: '#8B5CF6' }}>{move}</div>
                    <div className="px-5 py-3" style={{ borderBottom: '1px solid #162033', color: '#64748B' }}>{why}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Code blocks */}
            <div className="flex flex-col gap-4">
              <CodeBlock title="swap_manager.move — DEX swap + escrow entry" code={swapManagerCode} />
              <CodeBlock title="escrow.move — Resource account + event emission" code={escrowCode} />
              <CodeBlock title="oracle_price.move — Pyth price feed + quote" code={oracleCode} />
              <CodeBlock title="escrow-listener.ts — Backend event handler + Flutterwave payout" code={backendCode} />
            </div>

            {/* Production checklist */}
            <div className="rounded-[20px] p-5" style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
              <div className="text-[13px] font-semibold mb-4" style={{ color: '#F8FAFC' }}>Production Checklist</div>
              <div className="grid grid-cols-2 gap-2">
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
                  <div key={item} className="flex items-start gap-2.5 p-3 rounded-[10px]"
                    style={{ background: '#162033', border: '1px solid #1E293B' }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: done ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)' }}>
                      {done
                        ? <CheckCircle size={11} style={{ color: '#22C55E' }} />
                        : <Clock       size={11} style={{ color: '#334155' }} />
                      }
                    </div>
                    <span className="text-[12px] leading-relaxed" style={{ color: done ? '#94A3B8' : '#334155' }}>
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
