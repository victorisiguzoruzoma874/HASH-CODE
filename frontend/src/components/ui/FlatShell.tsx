import React, { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'

/**
 * Shared shell for the flat, bordered "HashPay" pages (landing, login, signup).
 * Styles are scoped to .lp so the rest of the app is untouched.
 */

const THEME_KEY = 'hp-theme'

/* Theme lives outside React so every page (and the dashboard top bar) shares it */
const listeners = new Set<() => void>()
function readTheme(): 'light' | 'dark' {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}
let currentTheme = readTheme()

export function useFlatTheme() {
  const theme = useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => currentTheme,
    () => 'light' as const,
  )
  const toggle = () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(THEME_KEY, currentTheme) } catch { /* ignore */ }
    listeners.forEach(l => l())
  }
  return { theme, dark: theme === 'dark', toggle }
}

export const FLAT_CSS = `
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

/* ── Forms (login / signup) ── */
.lp-field { display: flex; flex-direction: column; gap: 0; margin-bottom: 20px; }
.lp-input {
  width: 100%; min-height: 52px; padding: 0 14px; font: inherit; font-size: 15px;
  background: var(--field); color: var(--ink); border: 1px solid var(--line); border-radius: 0;
}
.lp-input::placeholder { color: var(--meta); }
.lp-inputwrap { position: relative; }
.lp-inputwrap .lp-input { padding-right: 76px; }
.lp-reveal {
  position: absolute; top: 0; right: 0; height: 100%; padding: 0 14px; font: inherit; font-size: 13px;
  background: transparent; color: var(--grey); border: 0; border-left: 1px solid var(--line); border-radius: 0; cursor: pointer;
}
.lp-error { padding: 12px 14px; border: 1px solid var(--red); color: var(--red); font-weight: 600; font-size: 14px; }
.lp-divider { display: flex; align-items: center; gap: 12px; color: var(--grey); font-size: 12px; }
.lp-divider::before, .lp-divider::after { content: ''; flex: 1; height: 1px; background: var(--line); opacity: 0.25; }
.lp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.lp-meter { display: flex; gap: 4px; margin-top: 8px; }
.lp-meter i { flex: 1; height: 4px; background: color-mix(in srgb, var(--line) 20%, transparent); }
.lp-check { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; font-size: 14px; }
.lp-check input { width: 20px; height: 20px; margin-top: 1px; accent-color: var(--solid); flex: none; }
.lp-link { font-weight: 600; }
.lp-switch { display: flex; border: 1px solid var(--line); }
.lp-switch a, .lp-switch span { flex: 1; text-align: center; padding: 10px 0; font-weight: 600; text-decoration: none; }
.lp-switch span { background: var(--solid); color: var(--on-ink); }
.lp-auth-form { display: flex; flex-direction: column; }

`

const FOOTER_LINKS = ['Privacy', 'Terms', 'Security', 'Audit', 'Docs']

export const FlatShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { dark, toggle: toggleTheme } = useFlatTheme()

  return (
    <div className="lp" data-theme={dark ? 'dark' : 'light'}>
      <style>{FLAT_CSS}</style>

      <header className="lp-header">
        <Link to="/" className="lp-logo" aria-label="HashPay Global home"><b>HashPay</b> <span>global</span></Link>
        <div className="lp-status">
          <span><i className="dot" />online</span>
          <button className="lp-toggle" onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {children}

      <footer className="lp-footer">
        <span>© 2026 HashPay Global. All rights reserved.</span>
        <nav aria-label="Footer">
          {FOOTER_LINKS.map(l => <a key={l} href="#">{l}</a>)}
        </nav>
      </footer>
    </div>
  )
}
