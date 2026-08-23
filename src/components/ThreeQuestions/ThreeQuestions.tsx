'use client'

import { useEffect, useRef } from 'react'
import styles from './ThreeQuestions.module.css'

/**
 * Block 05 — "three questions" (legacy/index.html 1302–1682, ns: sp3q).
 *
 * The reveal is deliberately NOT the shared useInViewReveal hook: this block's
 * IntersectionObserver uses threshold 0.15 / rootMargin '0px 0px -50px 0px'
 * (the hook's are 0.12 / -40px), and — decisively — the legacy script writes no
 * inline transitionDelay at all. The stagger here lives in CSS
 * (`.q-col:nth-child(n).q-in{transition-delay:…}` inside the min-width:901px
 * block). The shared hook always writes `el.style.transitionDelay`, and an
 * inline delay outranks those stylesheet rules, which would flatten the
 * desktop stagger. Fidelity wins, so the observer is reproduced locally.
 *
 * Note `q-in` does double duty, exactly as in the legacy file: it is both the
 * max-width:1240px container class and the reveal-state class. Every revealed
 * .q-rv element therefore also picks up the container padding/margin rules.
 * That is existing behaviour — preserved, not fixed.
 */
export default function ThreeQuestions() {
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const items = Array.from(
      root.querySelectorAll<HTMLElement>(`.${styles['q-rv']}`),
    )

    if (!('IntersectionObserver' in window)) {
      root.classList.add(styles['q-nojs'])
      return () => {
        root.classList.remove(styles['q-nojs'])
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles['q-in'])
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    )
    items.forEach((el) => io.observe(el))

    const fallback = window.setTimeout(() => {
      items.forEach((el) => {
        if (!el.classList.contains(styles['q-in'])) {
          const r = el.getBoundingClientRect()
          if (r.top < (window.innerHeight || 800) && r.bottom > 0) {
            el.classList.add(styles['q-in'])
          }
        }
      })
    }, 2000)

    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])

  return (
    <section
      ref={rootRef}
      id="sp3q-root"
      aria-label="Three questions answered"
    >
      <div className={styles['q-in']}>

        <div className={styles['q-head']}>
          <div className="q-head-t">
            <span className={`${styles['q-eyebrow']} ${styles['q-rv']}`}>All Signal. Zero Noise.</span>
            <h2 className={`${styles['q-h']} ${styles['q-rv']}`}>3 questions answered <em>before you finish your coffee.</em></h2>
          </div>

          <figure className={`${styles['q-shot']} ${styles['q-rv']}`}>
            <img src="/img/three-questions.jpg"
                 alt="Signal Pro" loading="lazy" decoding="async" />
          </figure>
        </div>
        <div className={`${styles['q-grid']} ${styles['q-rv']}`}>
          <div className={`${styles['q-col']} ${styles['q-rv']}`}>
            <span className={styles['q-num']}>Question one</span>
            <h3 className={styles['q-q']}>Is this business actually healthy?</h3>
            <p className={styles['q-p']}>In under 2 minutes, see the financial signals that reveal whether a business is getting stronger, getting weaker, or hiding problems beneath the headline numbers.</p>
            <span className={styles['q-tag']}><i></i>Company health</span>
          </div>

          <div className={`${styles['q-col']} ${styles['q-rv']}`}>
            <span className={styles['q-num']}>Question two</span>
            <h3 className={styles['q-q']}>Who is buying, and who is leaving?</h3>
            <p className={styles['q-p']}>Follow the people with the most insight: company insiders, institutional investors, politicians, and members of Congress.</p>
            <span className={styles['q-tag']}><i></i>Insider and congress activity</span>
          </div>

          <div className={`${styles['q-col']} ${styles['q-rv']}`}>
            <span className={styles['q-num']}>Question three</span>
            <h3 className={styles['q-q']}>Why did that just happen?</h3>
            <p className={styles['q-p']}>Signal Pro connects financial statements, filings, market data, news, and thousands of sources, turning endless information into actionable decisions.</p>
            <span className={styles['q-tag']}><i></i>Connected sources</span>
          </div>
        </div>

        <div className={`${styles['q-close']} ${styles['q-rv']}`}>
          <span className={styles['q-mark']} aria-hidden="true">
            <svg viewBox="0 0 100 100" fill="none"><path d="M44.8 22.9H55.2V44.8H76.7V55.2A21.7 21.7 0 0 0 55.2 76.9H44.8V55.2H23.2V44.8A21.7 21.7 0 0 0 44.8 22.9Z" fill="#FAF0E9"/></svg>
          </span>
          <p className={styles['q-close-t']}>Not another dashboard of ratios and headlines. <b>Signal Pro tells you what matters, what changed, and why.</b></p>
        </div>

      </div>
    </section>
  )
}
