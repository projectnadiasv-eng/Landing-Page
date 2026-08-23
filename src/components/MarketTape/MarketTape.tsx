'use client'

/* ============================================================================
   Block 03 — the live market tape.  legacy/index.html 695-1000.
   Root id is #mktick-root.

   The legacy script builds every quote with createElement + innerHTML. Here the
   two marquee copies are rendered as JSX and the effect only writes text into
   them through refs. The DOM shape, class names and node order are unchanged;
   what changes is who creates the nodes.

   SSR note: the numbers, the sparkline paths and the clock are all rendered
   EMPTY (and the session label as the legacy literal "US markets open"), exactly
   as legacy/index.html serves them before its script runs. Nothing derived from
   Math.random() or Date reaches the server output, so there is no hydration
   mismatch and the parity harness compares like with like.

   legacy:990-999 — the IIFE that walks up the ancestor chain zeroing margins is
   NOT ported. It fought HighLevel's funnel wrappers, which do not exist here.
   ========================================================================= */

import { useEffect, useRef } from 'react'
import styles from './MarketTape.module.css'

type Instrument = {
  sym: string
  last: number
  prevClose: number
  dp: number
  vol: number
}

/* legacy:832-857 — seed quotes, verbatim. `last` and `prevClose` are the demo
   feed's starting point; `vol` scales each random step. */
const EQUITIES: Instrument[] = [
  { sym: 'AAPL', last: 241.18, prevClose: 239.17, dp: 2, vol: 0.0012 },
  { sym: 'MSFT', last: 472.06, prevClose: 466.83, dp: 2, vol: 0.0011 },
  { sym: 'NVDA', last: 186.44, prevClose: 189.03, dp: 2, vol: 0.0022 },
  { sym: 'AMZN', last: 238.9, prevClose: 237.8, dp: 2, vol: 0.0014 },
  { sym: 'GOOGL', last: 207.53, prevClose: 203.64, dp: 2, vol: 0.0013 },
  { sym: 'META', last: 694.27, prevClose: 698.6, dp: 2, vol: 0.0016 },
  { sym: 'TSLA', last: 352.61, prevClose: 344.02, dp: 2, vol: 0.0031 },
  { sym: 'AVGO', last: 318.44, prevClose: 321.07, dp: 2, vol: 0.0019 },
  { sym: 'JPM', last: 289.35, prevClose: 288.11, dp: 2, vol: 0.0008 },
  { sym: 'SPY', last: 664.82, prevClose: 662.19, dp: 2, vol: 0.0006 },
]

const CRYPTO: Instrument[] = [
  { sym: 'BTC', last: 97412.0, prevClose: 96180.0, dp: 2, vol: 0.0018 },
  { sym: 'ETH', last: 3284.55, prevClose: 3310.2, dp: 2, vol: 0.0024 },
  { sym: 'SOL', last: 214.67, prevClose: 208.9, dp: 2, vol: 0.0035 },
  { sym: 'XRP', last: 2.41, prevClose: 2.3941, dp: 4, vol: 0.0028 },
  { sym: 'BNB', last: 678.2, prevClose: 671.95, dp: 2, vol: 0.0021 },
  { sym: 'DOGE', last: 0.3182, prevClose: 0.3252, dp: 4, vol: 0.0042 },
  { sym: 'ADA', last: 0.9047, prevClose: 0.8935, dp: 4, vol: 0.0033 },
  { sym: 'AVAX', last: 38.71, prevClose: 38.9, dp: 2, vol: 0.0037 },
  { sym: 'LINK', last: 23.94, prevClose: 23.19, dp: 2, vol: 0.0031 },
]

/* legacy:859-861 */
const fmt = (n: number, dp: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
const fmtPct = (p: number) => (p >= 0 ? '+' : '') + p.toFixed(2) + '%'
const fmtAbs = (a: number, dp: number) => (a < 0 ? '-' : '') + fmt(Math.abs(a), dp)

/* legacy:863 — sparkline viewBox. */
const W = 46
const H = 15

/* legacy:864-872 — 25 points bridging prevClose to last, with noise. */
function seedSeries(inst: Instrument): number[] {
  const pts = [inst.prevClose]
  for (let i = 1; i < 24; i++) {
    const drift = (inst.last - inst.prevClose) / 24
    pts.push(pts[i - 1] + drift + (Math.random() - 0.5) * inst.last * inst.vol * 1.6)
  }
  pts.push(inst.last)
  return pts
}

/* legacy:873-881 */
function sparkPath(pts: number[]) {
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const span = max - min || 1
  return pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * W
      const y = H - ((v - min) / span) * (H - 2) - 1
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
    })
    .join(' ')
}

/* legacy:957-969 — session label from New York wall-clock time. */
const timeET = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})
const partsET = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function sessionLabel() {
  const p = Object.fromEntries(
    partsET.formatToParts(new Date()).map((x) => [x.type, x.value]),
  ) as Record<string, string>
  const mins = +p.hour * 60 + +p.minute
  if (p.weekday === 'Sat' || p.weekday === 'Sun') return 'US markets closed — weekend'
  if (mins >= 570 && mins < 960) return 'US markets open'
  if (mins >= 240 && mins < 570) return 'Pre-market'
  if (mins >= 960 && mins < 1200) return 'After hours'
  return 'US markets closed'
}

/* One marquee copy. legacy renders the list twice into the same track so the
   -50% scroll wraps seamlessly; the second copy is aria-hidden. */
function Quote({ inst, hidden }: { inst: Instrument; hidden: boolean }) {
  return (
    <a
      className={styles.q}
      href="#"
      aria-label={inst.sym}
      {...(hidden ? { 'aria-hidden': true, tabIndex: -1 } : null)}
      data-sym={inst.sym}
    >
      <span className={styles.q__sym}>{inst.sym}</span>
      <span className={styles.q__nums}>
        <span className={styles.q__last} />
        <span className={styles.q__abs} />
        <span className={styles.q__pct} />
      </span>
      <svg
        className={styles.q__spark}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </a>
  )
}

export default function MarketTape() {
  const rootRef = useRef<HTMLElement | null>(null)
  const clockRef = useRef<HTMLSpanElement | null>(null)
  const stateRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    /* Rebuild the legacy registry from the rendered DOM: symbol -> the live
       instrument plus BOTH marquee copies of its node. */
    const registry = new Map<string, { inst: Instrument; nodes: HTMLElement[]; series: number[] }>()
    const all = [...EQUITIES, ...CRYPTO]

    for (const seed of all) {
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>(`[data-sym="${seed.sym}"]`),
      )
      if (!nodes.length) continue
      /* Copy the seed so a Fast Refresh remount starts from the literal values
         again instead of resuming a drifted price. */
      registry.set(seed.sym, { inst: { ...seed }, nodes, series: seedSeries(seed) })
    }

    /* legacy:883-905 — paint() writes text + spark path, and flashes on tick. */
    function paint(sym: string, dir: number) {
      const entry = registry.get(sym)
      if (!entry) return
      const { inst, nodes, series } = entry
      const abs = inst.last - inst.prevClose
      const pct = (abs / inst.prevClose) * 100
      const up = abs >= 0
      const d = sparkPath(series)

      for (const el of nodes) {
        el.classList.toggle(styles['is-up'], up)
        el.classList.toggle(styles['is-down'], !up)
        const lastEl = el.querySelector('.' + styles.q__last)
        const absEl = el.querySelector('.' + styles.q__abs)
        const pctEl = el.querySelector('.' + styles.q__pct)
        const pathEl = el.querySelector('path')
        if (lastEl) lastEl.textContent = fmt(inst.last, inst.dp)
        if (absEl) absEl.textContent = fmtAbs(abs, inst.dp)
        if (pctEl) pctEl.textContent = fmtPct(pct)
        if (pathEl) pathEl.setAttribute('d', d)

        if (dir) {
          el.classList.remove(styles['flash-up'], styles['flash-down'])
          /* Forced reflow — restarts the flash animation when the same node
             ticks twice in a row. legacy:901, load-bearing. */
          void el.offsetWidth
          el.classList.add(dir > 0 ? styles['flash-up'] : styles['flash-down'])
        }
      }
    }

    for (const sym of registry.keys()) paint(sym, 0)

    /* legacy:930-937 — one random instrument re-prices every 950ms. */
    function applyTick(sym: string, price: number) {
      const entry = registry.get(sym)
      if (!entry) return
      const dir = price > entry.inst.last ? 1 : price < entry.inst.last ? -1 : 0
      entry.inst.last = price
      entry.series.push(price)
      entry.series.shift()
      paint(sym, dir)
    }

    const feed = window.setInterval(() => {
      const inst = all[Math.floor(Math.random() * all.length)]
      const entry = registry.get(inst.sym)
      if (!entry) return
      const step = (Math.random() - 0.48) * entry.inst.last * entry.inst.vol
      applyTick(inst.sym, Math.max(entry.inst.last + step, entry.inst.last * 0.5))
    }, 950)

    /* legacy:970-975 */
    function tickClock() {
      if (clockRef.current) clockRef.current.textContent = timeET.format(new Date()) + ' ET'
      if (stateRef.current) stateRef.current.textContent = sessionLabel()
    }
    tickClock()
    const clock = window.setInterval(tickClock, 1000)

    /* legacy:986 — the demo feed's public hook. Kept so anything that poked at
       it from the console still works; removed on unmount. */
    ;(window as unknown as Record<string, unknown>).mktickApplyTick = applyTick

    return () => {
      window.clearInterval(feed)
      window.clearInterval(clock)
      delete (window as unknown as Record<string, unknown>).mktickApplyTick
    }
  }, [])

  return (
    <section id="mktick-root" ref={rootRef}>
      {/* class="mktick-tape" is legacy and INERT — the CSS selector is .tape.
          See the header of MarketTape.module.css. */}
      <div className="mktick-tape" id="mktick-tape">
        <div className={styles.tape__status}>
          <span className={styles.status__live}>
            <span className={styles.dot} />
            Live
          </span>
          <span className={styles.status__sep}>/</span>
          <span id="mktick-state" ref={stateRef}>
            US markets open
          </span>
          <span className={styles.status__sep}>/</span>
          {/* class="status__mktick-clock" is legacy and INERT — selector is
              .status__clock. */}
          <span className="status__mktick-clock" id="mktick-clock" ref={clockRef}>
            --:--:--
          </span>
          <span className={styles.status__right}>
            <span>Quotes delayed 15 min</span>
          </span>
        </div>

        <div className={styles.band} data-band="equities">
          <div className={styles.band__label}>US equities</div>
          <div className={styles.band__viewport}>
            <div
              className={styles.band__track}
              id="mktick-eq"
              style={{ ['--dur' as string]: '78s' }}
            >
              {EQUITIES.map((i) => (
                <Quote key={`a-${i.sym}`} inst={i} hidden={false} />
              ))}
              {EQUITIES.map((i) => (
                <Quote key={`b-${i.sym}`} inst={i} hidden />
              ))}
            </div>
          </div>
        </div>

        <div
          className={`${styles.band} ${styles['band--reverse']}`}
          data-band="crypto"
        >
          <div className={styles.band__label}>Crypto</div>
          <div className={styles.band__viewport}>
            <div
              className={styles.band__track}
              id="mktick-cr"
              style={{ ['--dur' as string]: '92s' }}
            >
              {CRYPTO.map((i) => (
                <Quote key={`a-${i.sym}`} inst={i} hidden={false} />
              ))}
              {CRYPTO.map((i) => (
                <Quote key={`b-${i.sym}`} inst={i} hidden />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
