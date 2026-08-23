'use client'

import { useEffect, useRef } from 'react'
import { useInViewReveal } from '@/hooks/useInViewReveal'
import styles from './Footer.module.css'

/**
 * Block 10 — Signal Pro footer (ns: spft).
 * Ported from legacy/index.html 4831-5088.
 *
 * The legacy script did three things:
 *   1. wrote the real year into #spft-year (which already ships the literal 2026),
 *   2. ran a "surface scrubber" up 40 ancestors zeroing margins — DELETED as dead,
 *   3. revealed .ft-rv via IntersectionObserver (threshold 0.1, rootMargin
 *      '0px 0px -30px 0px', i*70ms stagger, 2000ms fallback).
 */
export default function Footer() {
  const rootRef = useInViewReveal<HTMLElement>(styles['ft-in'], `.${styles['ft-rv']}`, {
    threshold: 0.1,
    rootMargin: '0px 0px -30px 0px',
    stagger: 70,
    fallbackMs: 2000,
  })

  // legacy 5049: y.textContent = new Date().getFullYear()
  // The literal 2026 below is what the legacy HTML ships; never compute during render.
  const yearRef = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    if (yearRef.current) yearRef.current.textContent = String(new Date().getFullYear())
  }, [])

  return (
    <footer id="spft-root" ref={rootRef} aria-label="Footer">
      <div className={styles['ft-in']}>

        <div className={`${styles['ft-top']} ${styles['ft-rv']}`}>
          <div>
            <a className={styles['ft-lock']} href="#sehx2-root" aria-label="Signal Pro">
              <span className={styles['ft-mark']} aria-hidden="true">
                <svg viewBox="0 0 100 100" fill="none"><path d="M44.8 22.9H55.2V44.8H76.7V55.2A21.7 21.7 0 0 0 55.2 76.9H44.8V55.2H23.2V44.8A21.7 21.7 0 0 0 44.8 22.9Z" fill="#2B2018"/></svg>
              </span>
              <span className={styles['ft-word']}>Signal<i>Pro</i></span>
            </a>
            <p className={styles['ft-blurb']}>Wall Street intelligence, built for everyday investors. Filings, flows and sentiment in one place.</p>
          </div>

          <div className={styles['ft-cta-wrap']}>
            <span className={styles['ft-cta-lab']}>Start free</span>
            <a className={styles['ft-cta']} href="https://nadia-sv.com/app" target="_blank" rel="noopener">Unlock full access
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
        </div>

        <div className={`${styles['ft-legal']} ${styles['ft-rv']}`}>
          <p>Signal Pro is a research and education platform. Nothing on this site is investment, financial, legal or tax advice, and nothing here is a recommendation to buy or sell any security or digital asset. Past performance does not indicate future results.</p>
          <p>Congressional and insider trading figures are drawn from public disclosures filed under the STOCK Act and with the SEC. Filings are periodic and may lag the trades they describe. Market and on-chain data may be delayed. Verify anything you act on against the original filing.</p>
        </div>

        <div className={`${styles['ft-bar']} ${styles['ft-rv']}`}>
          <span>&copy; <span id="spft-year" ref={yearRef}>2026</span> Signal Pro. All rights reserved.</span>
          <div className={styles['ft-social']}>
            {/* REPLACE both hrefs with the real profiles */}
            <a href="https://nadia-sv.com/app" target="_blank" rel="noopener" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z"/></svg>
            </a>
            <a href="https://nadia-sv.com/app" target="_blank" rel="noopener" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.75-1.95C21.4 8.75 22 11 22 14.1V21h-4v-6.1c0-1.45-.03-3.3-2.05-3.3-2.05 0-2.37 1.57-2.37 3.2V21h-3.9V9Z"/></svg>
            </a>
          </div>
          <div>
            <a href="https://nadia-sv.com/app" target="_blank" rel="noopener">Privacy</a>
            {'\u00A0\u00B7\u00A0'}
            <a href="https://nadia-sv.com/app" target="_blank" rel="noopener">Terms</a>
            {'\u00A0\u00B7\u00A0'}
            <a href="https://nadia-sv.com/app" target="_blank" rel="noopener">Disclosures</a>
          </div>
        </div>

        <div className={`${styles['ft-made']} ${styles['ft-rv']}`}>
          <a href="https://www.instagram.com/mybrandr/" target="_blank" rel="noopener"
             aria-label="Made by Brandr, opens Instagram in a new tab">
            <span>Made by</span><b>Brandr</b>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5.2"/>
              <circle cx="12" cy="12" r="4.1"/>
              <circle className={styles['ft-made-dot']} cx="17.3" cy="6.7" r="1.15"/>
            </svg>
          </a>
        </div>

      </div>
    </footer>
  )
}
