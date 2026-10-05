import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { priceApi } from '../lib/api'

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

/* ── Styles (scoped to .lp so the rest of the app is untouched) ── */

const CSS = `
.lp {
  --bg: #EDE9E3; --panel: #E4DED6; --ink: #1A1A1A; --grey: #6B6B6B; --meta: #9B9B9B;
  --line: #000000; --green: #3D8B37; --red: #C0392B; --on-ink: #FFFFFF; --field: #FFFFFF;
  --solid: #000000;
  background: var(--bg); color: var(--ink); min-height: 100vh;
  display: flex; flex-direction: column;
  font-family: system-ui, Inter, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 15px; line-height: 1.5;
}
.lp[data-theme="dark"] {
  --bg: #161513; --panel: #1E1C1A; --ink: #EDE9E3; --grey: #A19B93; --meta: #7A756E;
  --line: #EDE9E3; --green: #5DB356; --red: #E0604F; --on-ink: #161513; --field: #161513;
  --solid: #EDE9E3;
}
.lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
.lp a { color: inherit; }
.lp :focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }

.lp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 32px; border-bottom: 1px solid var(--line); background: var(--bg);
}
.lp-logo { font-size: 20px; text-decoration: none; letter-spacing: -0.01em; }
.lp-logo b { font-weight: 700; }
.lp-logo span { font-weight: 300; }
.lp-status { display: flex; align-items: center; gap: 20px; color: var(--grey); font-size: 14px; }
.lp-status .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--green); margin-right: 8px; }
.lp-toggle {
  width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
  background: transparent; color: var(--ink); border: 1px solid var(--line); cursor: pointer; border-radius: 0;
}

.lp-body { flex: 1; display: grid; grid-template-columns: 55fr 45fr; align-items: stretch; }
.lp-left  { padding: 40px 32px 56px; background: var(--bg); }
.lp-right { padding: 40px 32px 56px; background: var(--panel); border-left: 1px solid var(--line); }
.lp-col { max-width: 640px; margin-left: auto; display: flex; flex-direction: column; gap: 32px; }
.lp-rightcol { max-width: 520px; display: flex; flex-direction: column; gap: 20px; position: sticky; top: 24px; }

.lp-label { font-size: 12px; color: var(--grey); margin-bottom: 8px; display: flex; justify-content: space-between; gap: 12px; }
.lp h1 { font-size: clamp(34px, 5vw, 52px); line-height: 1.04; letter-spacing: -0.03em; font-weight: 800; margin: 0 0 16px; }
.lp h2 { font-size: 18px; font-weight: 700; margin: 0; }
.lp p  { margin: 0; }
.lp-lede { color: var(--grey); font-size: 16px; max-width: 52ch; }

.lp-btn {
  display: flex; align-items: center; justify-content: center; width: 100%;
  min-height: 52px; padding: 0 20px; font: inherit; font-weight: 600; text-decoration: none; text-align: center;
  background: transparent; color: var(--ink); border: 1px solid var(--line); border-radius: 0; cursor: pointer;
}
.lp-btn:hover { background: var(--field); }
.lp-btn.solid { background: var(--solid); color: var(--on-ink); }
.lp-btn.solid:hover { opacity: 0.88; }
.lp-btn.small { width: auto; min-height: 36px; padding: 0 14px; font-size: 13px; }
.lp-btnrow { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }

.lp-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.lp-chip {
  min-height: 48px; min-width: 76px; padding: 0 16px; font: inherit; font-weight: 600; cursor: pointer;
  background: var(--field); color: var(--ink); border: 1px solid var(--line); border-radius: 0;
}
.lp-chip[aria-pressed="true"] { background: var(--solid); color: var(--on-ink); }
.lp-note { margin-top: 12px; color: var(--ink); }
.lp-note small { display: block; color: var(--grey); font-size: 13px; margin-top: 2px; }
.lp-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.lp-pill { padding: 3px 12px; font-size: 13px; border: 1px solid var(--line); border-radius: 999px; background: transparent; }

.lp-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--line); background: var(--field); }
.lp-cell { padding: 16px; border-bottom: 1px solid var(--line); }
.lp-cell:nth-child(odd) { border-right: 1px solid var(--line); }
.lp-cell:nth-last-child(-n+2) { border-bottom: 0; }
.lp-cell b { display: block; margin-bottom: 4px; }
.lp-cell span { color: var(--grey); font-size: 14px; }

.lp-box { border: 1px solid var(--line); background: var(--field); }
.lp-box li { list-style: none; padding: 12px 16px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; }
.lp-box li:last-child { border-bottom: 0; }
.lp-box ul { margin: 0; padding: 0; }
.lp-box li span { color: var(--green); font-size: 13px; }

.lp-stats { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--line); }
.lp-stat { padding: 16px; border-right: 1px solid var(--line); }
.lp-stat:last-child { border-right: 0; }
.lp-stat b { display: block; font-size: 26px; font-weight: 800; line-height: 1.1; }
.lp-stat span { color: var(--grey); font-size: 13px; }
.lp-green { color: var(--green); } .lp-red { color: var(--red); }

.lp-counters { display: flex; gap: 28px; flex-wrap: wrap; }
.lp-counters div { color: var(--grey); font-size: 14px; }
.lp-counters b { font-size: 20px; margin-right: 6px; }

.lp-list { border-top: 1px solid var(--line); }
.lp-item { display: flex; align-items: stretch; gap: 14px; padding: 14px 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 25%, transparent); }
.lp-bar { width: 4px; background: var(--green); flex: none; }
.lp-bar.stale { background: var(--red); }
.lp-item .main { flex: 1; min-width: 0; }
.lp-item .val { font-size: 18px; font-weight: 700; }
.lp-item .sub { color: var(--grey); font-size: 13px; }
.lp-item .mono { font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 12px; color: var(--meta); }
.lp-empty { padding: 24px 0; color: var(--grey); }

.lp-footer {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px;
  padding: 16px 32px; border-top: 1px solid var(--line); color: var(--grey); font-size: 13px; background: var(--bg);
}
.lp-footer nav { display: flex; flex-wrap: wrap; gap: 20px; }
.lp-footer a { text-decoration: none; } .lp-footer a:hover { text-decoration: underline; color: var(--ink); }

@media (max-width: 860px) {
  .lp-body { grid-template-columns: 1fr; }
  .lp-right { border-left: 0; border-top: 1px solid var(--line); }
  .lp-col, .lp-rightcol { max-width: none; margin: 0; position: static; }
  .lp-left, .lp-right, .lp-header, .lp-footer { padding-left: 16px; padding-right: 16px; }
  .lp-grid { grid-template-columns: 1fr; }
  .lp-cell, .lp-cell:nth-child(odd) { border-right: 0; }
  .lp-cell:nth-last-child(2) { border-bottom: 1px solid var(--line); }
  .lp-btnrow { grid-template-columns: 1fr; }
  .lp-stats { grid-template-columns: 1fr; }
  .lp-stat { border-right: 0; border-bottom: 1px solid var(--line); }
  .lp-stat:last-child { border-bottom: 0; }
}
`

/* ── Page ─────────────────────────────────────────────────── */

type Rates = Record<string, number>

export const Landing: React.FC = () => {
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem('hp-landing-theme') === 'dark' } catch { return false }
  })
  const [currency, setCurrency] = useState(CURRENCIES[0])
  const [rates, setRates]       = useState<Rates>({})
  const [ngn, setNgn]           = useState<number | null>(null)
  const [state, setState]       = useState<'loading' | 'ok' | 'error'>('loading')
  const [updated, setUpdated]   = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const toggleTheme = () => {
    setDark(d => {
      try { localStorage.setItem('hp-landing-theme', d ? 'light' : 'dark') } catch { /* ignore */ }
      return !d
    })
  }

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
    <div className="lp" data-theme={dark ? 'dark' : 'light'}>
      <style>{CSS}</style>

      <header className="lp-header">
        <Link to="/" className="lp-logo" aria-label="HashPay Global home"><b>HashPay</b> <span>global</span></Link>
        <div className="lp-status">
          <span><i className="dot" />online</span>
          <button className="lp-toggle" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

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

      <footer className="lp-footer">
        <span>© 2026 HashPay Global. All rights reserved.</span>
        <nav aria-label="Footer">
          {['Privacy', 'Terms', 'Security', 'Audit', 'Docs'].map(l => <a key={l} href="#">{l}</a>)}
        </nav>
      </footer>
    </div>
  )
}
