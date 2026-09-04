'use client'

/*
 * Block 08 — Congressional trading cards.
 * Ported from legacy/index.html:3982-4498 (ns: spct ids / c- classes).
 *
 * WHAT MOVED, AND WHY
 *
 * 1. The legacy script built the entire grid by assigning a concatenated HTML
 *    string to #spct-grid.innerHTML (4386-4470). That is now real JSX driven by
 *    CARDS in ./Congress.data. The esc() helper (4353-4357) is gone — React
 *    escapes text nodes itself. No dangerouslySetInnerHTML.
 *
 * 2. CARDS is fully deterministic — no Math.random, no Date, no measurement —
 *    so the cards are rendered during SSR instead of reproducing the legacy
 *    empty <div id="spct-grid"></div>. The SERVED HTML therefore differs from
 *    legacy (it carries the eight <article>s); the RENDERED page is identical,
 *    which is what the parity harness measures.
 *
 * 3. spctSurface() (4309-4332) and its 500ms/1500ms timers are DELETED. It was
 *    a HighLevel wrapper scrubber that walked up 40 ancestors forcing
 *    background:transparent and wrote background:#FAF0E9!important onto
 *    documentElement/body. The background is pinned in globals.css now.
 *
 * 4. #spct-stamp (4291) is the literal string "today". No JavaScript in the
 *    legacy file ever touches that id — it stays a literal.
 */

import { useEffect } from 'react'
import { useInViewReveal } from '@/hooks/useInViewReveal'
import { CARDS, CTA_URL, type Card } from './Congress.data'
import styles from './Congress.module.css'

/** legacy:4359-4365 — verbatim. */
function initials(n: string): string {
  const parts = String(n).replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}

/**
 * legacy:4367-4384 — the maths is byte-for-byte the legacy maths, including
 * toFixed(2), the 0..100 clamp and the ' L' path separator. Only the return
 * shape changed: an HTML string became JSX.
 */
function spark(series: number[]) {
  const W = 100
  const H = 34
  const n = series.length
  const pts = series.map((v, i) => {
    const x = (i / (n - 1)) * W
    const y = H - (Math.max(0, Math.min(100, v)) / 100) * H
    return x.toFixed(2) + ',' + y.toFixed(2)
  })
  const line = 'M' + pts.join(' L')
  const area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z'
  return (
    <svg
      className={styles['c-spark']}
      viewBox={'0 0 ' + W + ' ' + H}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} fill="rgba(47,107,79,0.14)" />
      <path
        d={line}
        fill="none"
        stroke="#2F6B4F"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** legacy:4388-4443 — the `mid` string, branch for branch, in DOM order. */
function CardMid({ c }: { c: Card }) {
  if (!c.stats && !c.locked) {
    return (
      <>
        <div className={styles['c-profit']}>
          <span className={styles['c-lab']}>Net profit</span>
          <b>{c.profit}</b>
        </div>
        <div className={styles['c-ret']}>
          <div>
            <span className={styles['c-lab']}>Return</span>
            <div className={styles['c-ret-v']}>{c.ret}</div>
          </div>
          {spark(c.trend as number[])}
        </div>
        <div className={styles['c-stats']}>
          <div>
            <span className={styles['c-lab']}>Gross flow</span>
            <b>{c.flow}</b>
          </div>
          <div>
            <span className={styles['c-lab']}>Trades</span>
            <b>{c.trades}</b>
          </div>
        </div>
        <div className={styles['c-top']}>
          <span className={styles['c-key']}>Top</span>
          <span className={styles['c-mark']} aria-hidden="true">
            {c.logo ? (
              <img src={c.logo} alt="" loading="lazy" decoding="async" />
            ) : (
              String(c.tk).charAt(0)
            )}
          </span>
          <span className={styles['c-co']}>{c.co}</span>
          <span className={styles['c-tk']}>{c.tk}</span>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Net profit reads the same on both card shapes — same label, same size,
          same colour token — so the grid does not look like two card designs. */}
      {c.profit ? (
        <div className={styles['c-profit']}>
          <span className={styles['c-lab']}>Net profit</span>
          <b>{c.profit}</b>
        </div>
      ) : null}

      {c.stats ? (
        <div className={styles['c-stats2']}>
          {c.stats.map((s, i) => (
            <div key={i}>
              <b>{s.v}</b>
              <span>{s.k}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* The stats-variant cards had no chart, which made them the only two in
          the grid without one. Full width here rather than the 52% the
          profit-variant uses, because there is no return figure sharing the
          row with it. */}
      {c.trend ? (
        <div className={styles['c-spark-row']}>{spark(c.trend)}</div>
      ) : null}

      {c.stats && c.co ? (
        <div className={styles['c-top']}>
          <span className={styles['c-key']}>{c.topK || 'Top'}</span>
          <span className={styles['c-co']}>{c.co}</span>
          <span className={styles['c-tk']}>{c.tk}</span>
        </div>
      ) : null}

      {c.locked ? (
        <div className={styles['c-locked']}>
          <span className={styles['k']}>{c.locked}</span>
          <span className={styles['v']}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Sign up to see
          </span>
        </div>
      ) : null}
    </>
  )
}

export default function Congress() {
  /*
   * legacy:4472-4497 — the .c-rv IntersectionObserver, threshold 0.12,
   * rootMargin '0px 0px -40px 0px', 2000ms fallback. Shared hook; it returns a
   * teardown that disconnects the observer and clears the fallback timer, which
   * the legacy code never did.
   */
  const rootRef = useInViewReveal<HTMLElement>(
    styles['c-in'],
    '.' + styles['c-rv'],
    { stagger: 55 },
  )

  /*
   * FIDELITY OVERRIDE. This block's stagger is NOT the shared hook's i*70ms —
   * legacy:4493 is `Math.min(k, 8) * 55`, i.e. 55ms steps that CAP at 440ms.
   * With 12 .c-rv elements the last three would otherwise reveal up to 165ms
   * late. This effect runs immediately after the hook's (effects flush in hook
   * declaration order, before any paint) and restores the legacy delays.
   * Pure style writes: nothing to tear down.
   */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const items = root.querySelectorAll<HTMLElement>('.' + styles['c-rv'])
    items.forEach((el, k) => {
      el.style.transitionDelay = Math.min(k, 8) * 55 + 'ms'
    })
  }, [rootRef])

  return (
    <section
      id="splive-root"
      aria-label="Congressional trading"
      ref={rootRef}
    >
      <div className={styles['c-in']}>

        <div className={styles['c-head']}>
          <div>
            <span className={`${styles['c-eyebrow']} ${styles['c-rv']}`}><i className={styles['c-pulse']} aria-hidden="true"></i>Congressional trading</span>
            <h2 className={`${styles['c-h']} ${styles['c-rv']}`}>See the trades <em>Washington files.</em></h2>
            <p className={`${styles['c-sub']} ${styles['c-rv']}`}>Ranked by disclosed net profit, straight from STOCK Act filings.</p>
          </div>
          <div className={`${styles['c-meta']} ${styles['c-rv']}`}>Updated <b id="spct-stamp">today</b></div>
        </div>

        <div className={styles['c-grid']} id="spct-grid">
          {CARDS.map((c, i) => (
            <article
              key={c.name}
              className={
                `${styles['c-card']} ${styles['c-rv']}` +
                (c.top ? ' ' + styles['is-top'] : '')
              }
            >
              <span className={styles['c-rank']}>#{i + 1}</span>
              <div className={styles['c-who']}>
                <span className={styles['c-av']} aria-hidden="true">
                  {c.photo ? (
                    <img src={c.photo} alt="" loading="lazy" decoding="async" />
                  ) : (
                    initials(c.name)
                  )}
                </span>
                <div>
                  <h3 className={styles['c-name']}>{c.name}</h3>
                  <div className={styles['c-tags']}>
                    {c.role ? (
                      <span className={`${styles['c-tag']} ${styles['role']}`}>{c.role}</span>
                    ) : (
                      <>
                        <span className={`${styles['c-tag']} ${styles['seat']}`}>{c.seat}</span>
                        {c.status ? (
                          <span className={`${styles['c-tag']} ${styles['warn']}`}>{c.status}</span>
                        ) : c.conflicts ? (
                          <span className={`${styles['c-tag']} ${styles['warn']}`}>{c.conflicts} conflicts</span>
                        ) : (
                          <span className={`${styles['c-tag']} ${styles['ghost']}`} aria-hidden="true">0 conflicts</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <CardMid c={c} />
              {/* target/rel dropped with the off-site URL — see CTA_URL. */}
              <a className={styles['c-cta']} href={CTA_URL}>
                See their trades
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </article>
          ))}
        </div>

        <div className={styles['c-foot']}>
          <span>Illustrative figures from public filings</span>
          <span>Disclosures are public record</span>
        </div>

      </div>
    </section>
  )
}
