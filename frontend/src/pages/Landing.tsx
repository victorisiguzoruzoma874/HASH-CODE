import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { priceApi } from '../lib/api'
import { FlatShell } from '../components/ui/FlatShell'

/* ── Content ──────────────────────────────────────────────── */

const CURRENCIES = [
  { code: 'NGN', name: 'Nigerian naira',          note: 'Paid out to any Nigerian bank account.' },
  { code: 'GHS', name: 'Ghanaian cedi',           note: 'Paid out to any Ghanaian bank account.' },
  { code: 'KES', name: 'Kenyan shilling',         note: 'Paid out to any Kenyan bank account.' },
  { code: 'XOF', name: 'West African CFA franc',  note: 'One currency across the West African CFA zone.' },
  { code: 'XAF', name: 'Central African CFA franc', note: 'One currency across the Central African CFA zone.' },
]

const FEATURES = [
  { title: 'Instant swaps',     desc: 'Cross-chain token exchange in under 400ms with built-in MEV protection.' },
  { title: 'Bank-grade security', desc: 'AES-256 encryption and secp256k1 signed quotes on every transaction.' },
  { title: 'Non-custodial',     desc: 'Your keys, your assets. We never hold your funds.' },
  { title: 'Up to 12% APY',     desc: 'Earn yield through audited liquidity pools.' },
  { title: 'KYC-gated offramp', desc: 'Convert crypto and settle to a local bank account in minutes.' },
  { title: 'Sui and Ethereum',  desc: 'Live on both mainnets. Swap, send and convert between them.' },
]

const SECURITY = ['AES-256 encryption', 'MPC authentication', 'KYC verified', 'secp256k1 signed quotes']

const STATS = [
  { value: '297k',   label: 'transactions per second', tone: 'green' },
  { value: '<400ms', label: 'end-to-end latency',      tone: 'green' },
  { value: '1,400+', label: 'distributed nodes',       tone: 'ink'   },
]

const COINS: { symbol: string; name: string }[] = [
  { symbol: 'BTC',  name: 'Bitcoin'  },
  { symbol: 'ETH',  name: 'Ethereum' },
  { symbol: 'SUI',  name: 'Sui'      },
  { symbol: 'APT',  name: 'Aptos'    },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether'   },
]

function fmtUsd(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1)    return n.toFixed(2)
  return n.toFixed(4)
}


/* ── Page ─────────────────────────────────────────────────── */

type Rates = Record<string, number>

export const Landing: React.FC = () => {
  const [currency, setCurrency] = useState(CURRENCIES[0])
  const [rates, setRates]       = useState<Rates>({})
  const [ngn, setNgn]           = useState<number | null>(null)
  const [state, setState]       = useState<'loading' | 'ok' | 'error'>('loading')
  const [updated, setUpdated]   = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadRates = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await priceApi.getAll()
      // Merge so a partial response never removes a row
      setRates(prev => {
        const next = { ...prev }
        for (const [symbol, data] of Object.entries(res.prices)) next[symbol] = data.price
        return next
      })
      setUpdated(new Date())
      setState('ok')
      try {
        const r = await priceApi.convert('USDC', 'NGN')
        if (r.rate) setNgn(r.rate)
      } catch { /* naira column is hidden until the rate is available */ }
    } catch {
      setState(s => (s === 'ok' ? s : 'error'))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
    const id = setInterval(loadRates, 30_000)
    return () => clearInterval(id)
  }, [loadRates])

  const live    = COINS.filter(c => rates[c.symbol] !== undefined).length
  const missing = COINS.length - live

  return (
    <FlatShell>
      <div className="lp-body">
        {/* ── Left: the pitch, top to bottom ── */}
        <main className="lp-left">
          <div className="lp-col">
            <section>
              <div className="lp-label">Live on Sui and Ethereum mainnet</div>
              <h1>DeFi payments built for Africa.</h1>
              <p className="lp-lede">
                Swap, send and convert crypto across chains, with direct bank settlement to NGN, GHS, KES and beyond.
              </p>
            </section>

            <section>
              <div className="lp-btnrow">
                <Link to="/signup" className="lp-btn solid">Create free account</Link>
                <Link to="/login" className="lp-btn">Log in</Link>
              </div>
              <p className="lp-label" style={{ marginTop: 12, marginBottom: 0 }}>
                Trusted by 12,400+ users worldwide
              </p>
            </section>

            <section>
              <div className="lp-label"><span>Settle to</span><span>{CURRENCIES.length} currencies</span></div>
              <div className="lp-chips" role="group" aria-label="Settlement currency">
                {CURRENCIES.map(c => (
                  <button key={c.code} className="lp-chip" aria-pressed={c.code === currency.code} onClick={() => setCurrency(c)}>
                    {c.code}
                  </button>
                ))}
              </div>
              <p className="lp-note">
                <b>{currency.name}</b>
                <small>{currency.note}</small>
              </p>
              <div className="lp-pills">
                {['Bank transfer', 'KYC-gated', 'Minutes, not days'].map(t => <span key={t} className="lp-pill">{t}</span>)}
              </div>
            </section>

            <section>
              <div className="lp-label">What you get</div>
              <div className="lp-grid">
                {FEATURES.map(f => (
                  <div key={f.title} className="lp-cell">
                    <b>{f.title}</b>
                    <span>{f.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="lp-label">Network</div>
              <div className="lp-stats">
                {STATS.map(s => (
                  <div key={s.label} className="lp-stat">
                    <b className={s.tone === 'green' ? 'lp-green' : undefined}>{s.value}</b>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="lp-label">Security</div>
              <div className="lp-box">
                <ul>
                  {SECURITY.map(s => <li key={s}>{s}<span>active</span></li>)}
                </ul>
              </div>
            </section>

            <section>
              <h2 style={{ marginBottom: 12 }}>Ready to move money?</h2>
              <Link to="/signup" className="lp-btn solid">Create free account</Link>
            </section>
          </div>
        </main>

        {/* ── Right: live rate board (the "queue") ── */}
        <aside className="lp-right" aria-label="Live rates">
          <div className="lp-rightcol">
            <h2>Live rates</h2>

            <div className="lp-counters">
              <div><b className="lp-green">{live}</b>live</div>
              <div><b className={missing > 0 ? 'lp-red' : undefined}>{missing}</b>unavailable</div>
              <div><b>{ngn ? Math.round(ngn).toLocaleString('en-NG') : '—'}</b>NGN per USD</div>
            </div>

            <button className="lp-btn" onClick={loadRates} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh now'}
            </button>

            <div className="lp-list" aria-live="polite">
              {state === 'loading' && <p className="lp-empty">Loading rates…</p>}
              {state === 'error' && live === 0 && (
                <p className="lp-empty">Rates are unavailable right now. Retrying every 30 seconds.</p>
              )}
              {COINS.map(c => {
                const price = rates[c.symbol]
                if (price === undefined) return null
                return (
                  <div className="lp-item" key={c.symbol}>
                    <div className="lp-bar" />
                    <div className="main">
                      <div className="val">${fmtUsd(price)}</div>
                      <div className="sub">{c.symbol} · {c.name}</div>
                      {ngn && (
                        <div className="mono">₦{Math.round(price * ngn).toLocaleString('en-NG')}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {updated && (
              <p className="lp-label" style={{ marginBottom: 0 }}>
                Updated {updated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </aside>
      </div>

    </FlatShell>
  )
}
