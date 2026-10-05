/**
 * Flat dashboard styles. Rides on the .lp colour tokens from FlatShell (FLAT_CSS),
 * and is scoped to .dash so unmigrated pages keep their current look.
 */
export const DASH_CSS = `
.lp.dash { height: 100vh; min-height: 0; flex-direction: row; overflow: hidden; }

/* Sidebar */
.dash-side {
  position: fixed; left: 0; top: 0; z-index: 30; width: 220px; height: 100vh;
  display: flex; flex-direction: column; background: var(--bg); border-right: 1px solid var(--line);
  transform: translateX(-100%); transition: transform 0.18s ease;
}
.dash-side.open { transform: translateX(0); }
.dash-scrim { position: fixed; inset: 0; z-index: 20; background: rgba(0,0,0,0.45); border: 0; }
.dash-side-logo { padding: 16px 20px; border-bottom: 1px solid var(--line); height: 61px; display: flex; align-items: center; }
.dash-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.dash-navlink {
  display: flex; align-items: center; min-height: 44px; padding: 0 14px; font-weight: 600; text-decoration: none;
  color: var(--ink); border: 1px solid var(--line); background: var(--field);
}
.dash-navlink:hover { background: var(--panel); }
.dash-navlink.active { background: var(--solid); color: var(--on-ink); }
.dash-side-foot { padding: 12px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; }
.dash-wallet { border: 1px solid var(--line); padding: 10px 12px; background: var(--field); }
.dash-wallet .addr { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dash-wallet .state { font-size: 12px; color: var(--grey); }
.dash-wallet .state.on { color: var(--green); }

/* Main */
.dash-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
@media (min-width: 1024px) {
  .dash-main.shifted { margin-left: 220px; }
  .dash-scrim { display: none; }
  .dash-menu { display: none !important; }
}

/* Top bar */
.dash-top {
  height: 61px; flex: none; display: flex; align-items: center; gap: 12px; padding: 0 20px;
  border-bottom: 1px solid var(--line); background: var(--bg); position: relative; z-index: 15;
}
.dash-top .grow { flex: 1; }
.dash-search { max-width: 300px; flex: 1; min-height: 40px; }
.dash-iconbtn {
  min-width: 40px; height: 40px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  font: inherit; font-size: 13px; font-weight: 600; background: transparent; color: var(--ink);
  border: 1px solid var(--line); border-radius: 0; cursor: pointer;
}
.dash-iconbtn:hover { background: var(--panel); }
.dash-net { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--grey); white-space: nowrap; }
.dash-net i { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
.dash-count { color: var(--red); font-weight: 700; }
.dash-menu-wrap { position: relative; }
.dash-pop {
  position: absolute; right: 0; top: calc(100% + 8px); min-width: 240px; z-index: 50;
  background: var(--field); border: 1px solid var(--line);
}
.dash-pop .row { padding: 12px 14px; border-bottom: 1px solid color-mix(in srgb, var(--line) 25%, transparent); font-size: 14px; }
.dash-pop .row:last-child { border-bottom: 0; }
.dash-pop .row.unread { border-left: 4px solid var(--green); }
.dash-pop .head { font-size: 12px; color: var(--grey); }
.dash-pop button.row { display: block; width: 100%; text-align: left; font: inherit; background: transparent; color: var(--ink); border: 0; cursor: pointer; }
.dash-pop button.row:hover { background: var(--panel); }
.dash-pop .mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--meta); overflow: hidden; text-overflow: ellipsis; }

/* Content */
.dash-scroll { flex: 1; overflow-y: auto; }
.dash-page { padding: 24px 24px 48px; max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
.dash-legacy { min-height: 100%; background: #EEF3FB; color: #0A1929; }
.dash-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; align-items: start; }
.dash-stack { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
@media (max-width: 1100px) { .dash-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 700px) { .dash-page { padding: 16px 16px 40px; } .dash-top { padding: 0 12px; } .dash-net { display: none; } .dash-search { display: none; } }

.dash-card { border: 1px solid var(--line); background: var(--field); }
.dash-card > header { padding: 14px 16px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.dash-card > header h2 { font-size: 16px; }
.dash-card > header span { font-size: 12px; color: var(--grey); }
.dash-pad { padding: 16px; }

.dash-ticker { display: flex; overflow-x: auto; border: 1px solid var(--line); background: var(--field); }
.dash-tick { flex: none; padding: 10px 16px; border-right: 1px solid var(--line); min-width: 150px; }
.dash-tick:last-child { border-right: 0; }
.dash-tick b { display: block; font-size: 14px; }
.dash-tick .usd { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; }
.dash-tick .ngn { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--meta); }

.dash-hero { padding: 20px 20px 16px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
.dash-big { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: clamp(30px, 5vw, 44px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
.dash-seg { display: inline-flex; border: 1px solid var(--line); }
.dash-seg button { min-height: 40px; min-width: 52px; padding: 0 14px; font: inherit; font-weight: 600; background: transparent; color: var(--ink); border: 0; border-right: 1px solid var(--line); border-radius: 0; cursor: pointer; }
.dash-seg button:last-child { border-right: 0; }
.dash-seg button[aria-pressed="true"] { background: var(--solid); color: var(--on-ink); }
.dash-chart { height: 200px; padding: 8px 8px 8px 0; border-top: 1px solid var(--line); }
.dash-sum { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line); }
.dash-sum > div { padding: 14px 16px; border-right: 1px solid var(--line); }
.dash-sum > div:last-child { border-right: 0; }
.dash-sum .v { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 16px; font-weight: 700; }
@media (max-width: 700px) { .dash-sum { grid-template-columns: 1fr; } .dash-sum > div { border-right: 0; border-bottom: 1px solid var(--line); } .dash-sum > div:last-child { border-bottom: 0; } }

.dash-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 16px; }
@media (max-width: 700px) { .dash-actions { grid-template-columns: repeat(2, 1fr); } }
.dash-act {
  min-height: 56px; font: inherit; font-weight: 600; background: var(--field); color: var(--ink);
  border: 1px solid var(--line); border-radius: 0; cursor: pointer;
}
.dash-act:hover { background: var(--solid); color: var(--on-ink); }

.dash-row { display: flex; align-items: stretch; gap: 14px; padding: 14px 16px; border-bottom: 1px solid color-mix(in srgb, var(--line) 25%, transparent); }
.dash-row:last-child { border-bottom: 0; }
.dash-row .bar { width: 4px; flex: none; background: var(--green); }
.dash-row .bar.pending { background: var(--meta); }
.dash-row .bar.failed { background: var(--red); }
.dash-row .main { flex: 1; min-width: 0; }
.dash-row .t { font-weight: 600; }
.dash-row .sub { font-size: 13px; color: var(--grey); }
.dash-row .num { text-align: right; font-family: ui-monospace, Menlo, Consolas, monospace; }
.dash-row .num small { display: block; color: var(--meta); font-size: 12px; }
.dash-empty { padding: 32px 16px; color: var(--grey); }

/* Swap panel */
.dash-box { border: 1px solid var(--line); padding: 12px; }
.dash-box .top { display: flex; justify-content: space-between; font-size: 12px; color: var(--grey); margin-bottom: 8px; }
.dash-box .line { display: flex; gap: 8px; align-items: center; }
.dash-amount { flex: 1; min-width: 0; font: inherit; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 22px; font-weight: 700; background: transparent; color: var(--ink); border: 0; outline: 0; padding: 0; }
.dash-amount::placeholder { color: var(--meta); }
.dash-token { position: relative; }
.dash-tokenbtn { min-height: 40px; padding: 0 12px; font: inherit; font-weight: 700; background: var(--field); color: var(--ink); border: 1px solid var(--line); border-radius: 0; cursor: pointer; }
.dash-tokenbtn:hover { background: var(--panel); }
.dash-tokenlist { position: absolute; right: 0; top: calc(100% + 4px); z-index: 40; min-width: 160px; background: var(--field); border: 1px solid var(--line); max-height: 260px; overflow-y: auto; }
.dash-tokenlist [role="option"] { display: flex; justify-content: space-between; gap: 12px; width: 100%; padding: 10px 12px; font: inherit; background: transparent; color: var(--ink); border: 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 20%, transparent); cursor: pointer; text-align: left; }
.dash-tokenlist [role="option"]:hover, .dash-tokenlist [role="option"][aria-selected="true"] { background: var(--panel); }
.dash-tokenlist .p { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--meta); }
.dash-flip { align-self: center; }
.dash-note { font-size: 13px; color: var(--grey); display: flex; justify-content: space-between; gap: 8px; }
.dash-ok { padding: 14px; border: 1px solid var(--green); color: var(--green); font-weight: 600; text-align: center; }
.dash-green { color: var(--green); } .dash-red { color: var(--red); }
@media (prefers-reduced-motion: reduce) { .dash-side { transition: none; } }

/* Page chrome shared by Swap / Pools / Portfolio / Offramp */
.dash-ph { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.dash-ph h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
.dash-ph p { color: var(--grey); margin-top: 4px; }
.dash-ph .lp-btn { width: auto; padding: 0 24px; }
.dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--line); background: var(--field); }
.dash-stat { padding: 16px; border-right: 1px solid var(--line); }
.dash-stat:last-child { border-right: 0; }
.dash-stat .v { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 22px; font-weight: 700; line-height: 1.2; }
.dash-stat .d { font-size: 13px; margin-top: 2px; }
@media (max-width: 900px) {
  .dash-stats { grid-template-columns: repeat(2, 1fr); }
  .dash-stat { border-bottom: 1px solid var(--line); }
  .dash-stat:nth-child(2n) { border-right: 0; }
  .dash-stat:nth-last-child(-n+2) { border-bottom: 0; }
}
.dash-2col { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 24px; align-items: start; }
.dash-eq { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: start; }
.dash-swapgrid { display: grid; grid-template-columns: 440px minmax(0, 1fr); gap: 24px; align-items: start; }
@media (max-width: 1100px) { .dash-2col, .dash-eq, .dash-swapgrid { grid-template-columns: minmax(0, 1fr); } }

.dash-tablewrap { overflow-x: auto; }
.dash-tr { display: grid; grid-template-columns: var(--cols); gap: 12px; align-items: center; padding: 12px 16px; border-bottom: 1px solid color-mix(in srgb, var(--line) 25%, transparent); min-width: 640px; }
.dash-tr.head { font-size: 12px; color: var(--grey); border-bottom: 1px solid var(--line); }
.dash-tr:last-child { border-bottom: 0; }
.dash-tr.sel { background: var(--panel); }
.dash-tr.click { cursor: pointer; }
.dash-tr.click:hover { background: var(--panel); }
.dash-mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
.dash-meta { color: var(--meta); font-size: 12px; }
.dash-grey { color: var(--grey); }

.dash-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.dash-chip { min-height: 32px; padding: 0 12px; font: inherit; font-size: 13px; font-weight: 600; background: var(--field); color: var(--ink); border: 1px solid var(--line); border-radius: 0; cursor: pointer; }
.dash-chip[aria-pressed="true"] { background: var(--solid); color: var(--on-ink); }
.dash-tabs { display: flex; border: 1px solid var(--line); width: max-content; max-width: 100%; }
.dash-tabs button { min-height: 44px; padding: 0 20px; font: inherit; font-weight: 600; background: var(--field); color: var(--ink); border: 0; border-right: 1px solid var(--line); border-radius: 0; cursor: pointer; }
.dash-tabs button:last-child { border-right: 0; }
.dash-tabs button[aria-selected="true"] { background: var(--solid); color: var(--on-ink); }
.dash-bar { height: 6px; background: color-mix(in srgb, var(--line) 15%, transparent); }
.dash-bar i { display: block; height: 100%; background: var(--ink); }
.dash-tag { display: inline-block; padding: 1px 10px; font-size: 12px; border: 1px solid var(--line); border-radius: 999px; }
.dash-tag.ok { border-color: var(--green); color: var(--green); }
.dash-tag.bad { border-color: var(--red); color: var(--red); }
.dash-tag.wait { border-color: var(--meta); color: var(--grey); }
.dash-scrollbox { max-height: 340px; overflow-y: auto; }
.dash-cellgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.dash-cellgrid > div { padding: 16px; border-bottom: 1px solid var(--line); }
.dash-cellgrid > div:nth-child(odd) { border-right: 1px solid var(--line); }
.dash-cellgrid > div:nth-last-child(-n+2) { border-bottom: 0; }
.dash-cellgrid b { display: block; margin-bottom: 4px; }
.dash-cellgrid span { font-size: 14px; color: var(--grey); }
@media (max-width: 700px) { .dash-cellgrid { grid-template-columns: 1fr; } .dash-cellgrid > div, .dash-cellgrid > div:nth-child(odd) { border-right: 0; } .dash-cellgrid > div:nth-last-child(2) { border-bottom: 1px solid var(--line); } }
.dash-flow { display: flex; flex-wrap: wrap; align-items: stretch; gap: 0; }
.dash-node { padding: 10px 14px; border: 1px solid var(--line); background: var(--field); min-width: 120px; margin: 0 -1px -1px 0; }
.dash-node b { display: block; font-size: 13px; }
.dash-node span { font-size: 12px; color: var(--meta); font-family: ui-monospace, Menlo, Consolas, monospace; }
.dash-code { border: 1px solid var(--line); background: var(--field); }
.dash-code > div { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--line); font-size: 12px; color: var(--grey); }
.dash-code pre { margin: 0; padding: 14px; font-size: 12px; line-height: 1.7; overflow-x: auto; font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--ink); }
.dash-check { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid color-mix(in srgb, var(--line) 25%, transparent); font-size: 14px; }
.dash-check .m { flex: none; width: 20px; font-weight: 700; }
.dash-detail { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 14px 16px; border-top: 1px solid var(--line); background: var(--panel); font-size: 13px; }
.dash-detail .k { color: var(--grey); margin-bottom: 2px; }
@media (max-width: 700px) { .dash-detail { grid-template-columns: 1fr; } }
.dash-order { width: 100%; display: flex; align-items: center; gap: 16px; padding: 14px 16px; background: transparent; color: var(--ink); border: 0; font: inherit; text-align: left; cursor: pointer; }
.dash-order:hover { background: var(--panel); }
.dash-order-wrap { border-bottom: 1px solid color-mix(in srgb, var(--line) 25%, transparent); }
.dash-order-wrap:last-child { border-bottom: 0; }
.dash-search2 { max-width: 220px; min-height: 40px; }
`
