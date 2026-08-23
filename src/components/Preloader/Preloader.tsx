'use client'

/*
 * Block 01 — the cream splash preloader.
 * Ported from legacy/index.html 15-173 (markup 17-34, style 36-139, script 141-173).
 *
 * Rendered INLINE as the first child of <body> (page.tsx renders it first), NOT
 * through a portal: a portal only mounts after hydration, so the served HTML
 * would carry no splash and the page would flash fully-scrollable at the most
 * visible moment of the load.
 *
 * Deleted as dead / React-hostile:
 *   - legacy:146  the reparent to document.body. It existed only because
 *     HighLevel nested the block. appendChild on a React-owned node throws.
 *   - legacy:162  parentNode.removeChild(preloader). Visibility is driven by
 *     state instead: `hidden` adds .splo-hide, then `removed` unmounts.
 *
 * The scroll lock toggles the literal global class 'splo-locked' on <html> and
 * <body> (legacy:149-150 / 159-160). Those two rules live in globals.css, so the
 * string is intentionally NOT hashed. It is removed in the effect teardown too,
 * so an unmount can never leave the page permanently unscrollable.
 */

import { useEffect, useRef, useState } from 'react'
import styles from './Preloader.module.css'

const LOCK_CLASS = 'splo-locked'

export default function Preloader() {
  const [hidden, setHidden] = useState(false)
  const [removed, setRemoved] = useState(false)
  // legacy:170 guards the 6000ms safety net on classList.contains('splo-hide').
  // A ref reproduces that check without racing React's state batching.
  const hiddenRef = useRef(false)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    // legacy:148-151
    body.classList.add(LOCK_CLASS)
    html.classList.add(LOCK_CLASS)

    // legacy:152-153 — read the media query HERE, never during render.
    let HOLD_MS = 2400
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      HOLD_MS = 800
    }

    let holdTimer = 0
    let transitionTimer = 0
    let safetyTimer = 0

    // legacy:154-164
    const hide = () => {
      if (hiddenRef.current) return
      hiddenRef.current = true
      setHidden(true)
      transitionTimer = window.setTimeout(() => {
        body.classList.remove(LOCK_CLASS)
        html.classList.remove(LOCK_CLASS)
        setRemoved(true)
      }, 800)
    }

    // legacy:165
    const start = () => {
      holdTimer = window.setTimeout(hide, HOLD_MS)
    }

    // legacy:166-168 — the legacy script is inline in <body>, so it always sees
    // readyState 'loading' and defers the hold until DOMContentLoaded.
    let deferred = false
    if (document.readyState === 'loading') {
      deferred = true
      document.addEventListener('DOMContentLoaded', start)
    } else {
      start()
    }

    // legacy:169-171 — the safety net, timed from script execution, not from start().
    safetyTimer = window.setTimeout(hide, 6000)

    return () => {
      if (deferred) document.removeEventListener('DOMContentLoaded', start)
      window.clearTimeout(holdTimer)
      window.clearTimeout(transitionTimer)
      window.clearTimeout(safetyTimer)
      body.classList.remove(LOCK_CLASS)
      html.classList.remove(LOCK_CLASS)
    }
  }, [])

  if (removed) return null

  return (
    <div
      id="sploader"
      className={hidden ? `${styles.sploader} ${styles['splo-hide']}` : styles.sploader}
      aria-hidden={hidden ? 'true' : 'false'}
    >
      <div className={styles['splo-stage']}>
        <div className={styles['splo-mark']} aria-hidden="true">
          <svg viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="22.5" fill="#2B2018" />
            <path
              d="M44.8 22.9H55.2V44.8H76.7V55.2A21.7 21.7 0 0 0 55.2 76.9H44.8V55.2H23.2V44.8A21.7 21.7 0 0 0 44.8 22.9Z"
              fill="#FAF0E9"
            />
          </svg>
        </div>
        <div className={styles['splo-text-wrap']}>
          <span className={styles['splo-text']}>
            SIGNAL<span className={styles['splo-pro']}>PRO</span>
          </span>
        </div>
        <div className={styles['splo-tagline']}>
          <span className={styles['splo-tag-line']}></span>
          <span className={styles['splo-tag-word']}>All signal. Zero noise.</span>
          <span className={styles['splo-tag-line']}></span>
        </div>
      </div>
    </div>
  )
}
