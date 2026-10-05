import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import type { EscrowStatus, EscrowOrder } from '../store/useStore'

const statusMeta: Record<EscrowStatus, { label: string; tone: 'ok' | 'bad' | 'wait' | '' }> = {
  idle:       { label: 'Idle',       tone: 'wait' },
  depositing: { label: 'Depositing', tone: 'wait' },
  confirming: { label: 'Confirming', tone: 'wait' },
  paying_out: { label: 'Paying out', tone: 'wait' },
  completed:  { label: 'Completed',  tone: 'ok'   },
  failed:     { label: 'Failed',     tone: 'bad'  },
  refunded:   { label: 'Refunded',   tone: 'wait' },
}

const StatusBadge: React.FC<{ status: EscrowStatus }> = ({ status }) => {
  const m = statusMeta[status]
  return <span className={`dash-tag ${m.tone}`}>{m.label}</span>
}

const CodeBlock: React.FC<{ title: string; code: string }> = ({ title, code }) => {
  const [copied, setCopied] = useState(false)
  return (
    <div className="dash-code">
      <div>
        <span>{title}</span>
        <button className="lp-btn small" onClick={() => { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

const FLOW_NODES = [
  { label: 'User wallet',       sub: 'Sui / EVM' },
  { label: 'swap_manager',      sub: 'Move package' },
  { label: 'Cetus DEX',         sub: 'On-chain pool' },
  { label: 'escrow.move',       sub: 'Shared object' },
  { label: 'Sui indexer',       sub: 'Event listener' },
  { label: 'HashPay backend',   sub: 'Node.js service' },
  { label: 'Flutterwave API',   sub: 'Fiat rails' },
  { label: 'User bank account', sub: 'NGN settlement' },
]

const FlowDiagram: React.FC = () => (
  <section className="dash-card" aria-label="Settlement architecture">
    <header><h2>Settlement architecture</h2><span>Read in order</span></header>
    <ol className="dash-pad dash-flow" style={{ listStyle: 'none', margin: 0 }}>
      {FLOW_NODES.map((n, i) => (
        <li className="dash-node" key={n.label}>
          <b>{i + 1}. {n.label}</b>
          <span>{n.sub}</span>
        </li>
      ))}
    </ol>
  </section>
)

const OrderRow: React.FC<{ order: EscrowOrder }> = ({ order }) => {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="dash-order-wrap">
      <button className="dash-order" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <b className="dash-mono">{order.id}</b>
            <StatusBadge status={order.status} />
          </div>
          <div className="dash-meta">{order.createdAt}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="dash-mono">{order.amountCrypto}</div>
          <div className="dash-mono dash-green">{order.amountFiat}</div>
        </div>
        <span className="dash-grey" style={{ minWidth: 70 }}>{order.bankName}</span>
        <span className="dash-grey">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="dash-detail">
          <div><div className="k">Sui tx digest</div><div className="dash-mono" style={{ wordBreak: 'break-all' }}>{order.txHash}</div></div>
          <div><div className="k">Payout reference</div><div className="dash-mono">{order.payoutRef ?? '—'}</div></div>
          <div><div className="k">Account</div><div className="dash-mono">{order.accountNumber}</div></div>
          <div><div className="k">Sui event</div><div className="dash-mono" style={{ fontSize: 12, wordBreak: 'break-all' }}>{order.aptosEvent ?? '—'}</div></div>
        </div>
      )}
    </div>
  )
}

const HOW_IT_WORKS = [
  { title: 'On-chain swap', desc: 'swap_manager.move calls Cetus DEX to convert your asset to USDC. Rate locked to prevent front-running.' },
  { title: 'Escrow lock',   desc: 'escrow.move deposits USDC into a shared object vault and emits a DepositReceived event.' },
  { title: 'Event trigger', desc: 'HashPay backend subscribes via Sui Indexer. On event, verifies KYC and transaction finality.' },
  { title: 'NGN payout',    desc: 'Backend calls Flutterwave /transfers. If payout fails, refund() is called on-chain to return USDC.' },
]

const MOVE_VS_EVM = [
  ['Resources',     'Coins are resources — cannot be duplicated or lost',  'Safer custody; deposit/withdraw must be explicit'],
  ['Transactions',  'Atomic + gas metering on every op',                   'Full swap + escrow succeeds or nothing happens'],
  ['Events',        'Native event emission via EventHandle',                'Reliable backend triggers — no polling needed'],
  ['Access ctrl',   'Signer-based; only @hashpay admin can call refund()', 'No reentrancy, no unauthorized withdrawals'],
  ['Oracles',       'Pyth / Supra / Switchboard on Aptos',                 'Price locked in txn args — MEV resistant'],
]

const CHECKLIST = [
  { done: true,  item: 'Idempotency keys — prevent double payout on event replay' },
  { done: true,  item: 'Rate locking — quote hash stored on-chain, verified in txn' },
  { done: true,  item: 'Access control — only @hashpay signer calls payout_coin/refund' },
  { done: false, item: 'KYC gating — check on-chain KYC NFT or off-chain API' },
  { done: false, item: 'Reconciliation job — match on-chain USDC balance vs DB daily' },
  { done: true,  item: 'Refund path — escrow::refund() triggered if fiat payout fails' },
  { done: false, item: 'Multisig treasury — require 2-of-3 for large withdrawals' },
  { done: true,  item: 'Slippage guard — revert if output < min_out (1–2%)' },
]

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

  return (
    <div className="dash-page">
      <div className="dash-ph">
        <div>
          <h1>Fiat offramp</h1>
          <p>Convert crypto to NGN via Move escrow on Sui and Flutterwave settlement.</p>
        </div>
        <button className="lp-btn solid" onClick={() => openModal('convert')}>New conversion</button>
      </div>

      <div className="dash-tabs" role="tablist">
        {(['orders', 'architecture'] as const).map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {tab === 'orders' ? 'Orders and history' : 'Architecture and code'}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <>
          <div className="dash-stats">
            {[
              { label: 'Total converted', value: '₦78,500', tone: 'dash-green' },
              { label: 'Pending orders',  value: '0',       tone: '' },
              { label: 'Completed',       value: `${orders.filter(o => o.status === 'completed').length}`, tone: 'dash-green' },
              { label: 'Avg. settlement', value: '< 90s',   tone: '' },
            ].map(s => (
              <div className="dash-stat" key={s.label}>
                <div className="lp-label" style={{ marginBottom: 4 }}>{s.label}</div>
                <div className={`v ${s.tone}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <section className="dash-card" aria-label="Escrow orders">
            <header><h2>Escrow orders</h2><span>{orders.length} total</span></header>
            {orders.length === 0 ? (
              <p className="dash-empty">No orders yet. Select "New conversion" to convert crypto to naira.</p>
            ) : (
              orders.map(order => <OrderRow key={order.id} order={order} />)
            )}
          </section>

          <section className="dash-card" aria-label="How hybrid settlement works">
            <header><h2>How hybrid settlement works</h2></header>
            <div className="dash-cellgrid">
              {HOW_IT_WORKS.map(item => (
                <div key={item.title}><b>{item.title}</b><span>{item.desc}</span></div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === 'architecture' && (
        <>
          <FlowDiagram />

          <section className="dash-card" aria-label="Move versus EVM">
            <header><h2>Move vs EVM: key differences</h2></header>
            <div className="dash-tablewrap">
              <div className="dash-tr head" style={{ '--cols': '1fr 2fr 2fr' } as React.CSSProperties}>
                <div>Concept</div><div>Move on Sui</div><div>Why it matters</div>
              </div>
              {MOVE_VS_EVM.map(([concept, move, why]) => (
                <div className="dash-tr" key={concept} style={{ '--cols': '1fr 2fr 2fr', alignItems: 'start' } as React.CSSProperties}>
                  <b>{concept}</b>
                  <span className="dash-mono" style={{ fontSize: 12 }}>{move}</span>
                  <span className="dash-grey">{why}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="dash-stack">
            <CodeBlock title="swap_manager.move: Cetus DEX swap + escrow entry (Sui)" code={swapManagerCode} />
            <CodeBlock title="escrow.move: shared object vault + event emission (Sui)" code={escrowCode} />
            <CodeBlock title="escrow-listener.ts: backend Sui event handler + Flutterwave payout" code={backendCode} />
          </div>

          <section className="dash-card" aria-label="Production checklist">
            <header><h2>Production checklist</h2><span>{CHECKLIST.filter(c => c.done).length} of {CHECKLIST.length} done</span></header>
            {CHECKLIST.map(({ done, item }) => (
              <div className="dash-check" key={item} style={{ color: done ? 'var(--ink)' : 'var(--grey)' }}>
                <span className="m" style={{ color: done ? 'var(--green)' : 'var(--meta)' }}>{done ? '✓' : '○'}</span>
                <span>{item}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
