'use client'

/* ============================================================================
   The post-checkout confirmation overlay.

   Stripe redirects here on success_url: /?checkout=success&session_id=...
   (see src/app/api/checkout/route.ts). Before this component existed, that
   redirect landed the customer back on the plain homepage with zero visible
   confirmation — technically correct, invisible in practice.

   Reads the query string via window.location, not next/navigation's
   useSearchParams — that hook requires a Suspense boundary around any client
   component that calls it, which would mean either wrapping page.tsx (owned
   by the orchestrator, see docs/OWNERSHIP.md) or adding a Suspense fallback
   that flashes on every load. Reading location directly in an effect avoids
   both for a value that is only ever needed after mount anyway.

   NOT the source of truth for a completed purchase. Anyone can load this URL
   by pasting it — session_id proves nothing here, it is never verified
   against Stripe from the client. src/app/api/webhook/route.ts (gated on
   payment_status === 'paid') is the only place a purchase is actually
   recorded. This component is UI only.
   ========================================================================= */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './CheckoutSuccess.module.css'

const HOLD_SECONDS = 10

export default function CheckoutSuccess() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(HOLD_SECONDS)
  const leavingRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return

    const leave = () => {
      if (leavingRef.current) return
      leavingRef.current = true
      /* replace, not push — the success URL must not become a back-button
         destination. router.replace is a client-side navigation and does not
         unmount this component on its own, so the overlay itself is hidden
         explicitly — otherwise it would sit on screen indefinitely at "0s"
         after the redirect already happened. */
      setVisible(false)
      router.replace('/')
    }

    const tick = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tick)
          leave()
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => window.clearInterval(tick)
  }, [visible, router])

  if (!visible) return null

  return (
    <div className={styles.overlay} role="alertdialog" aria-live="polite" aria-label="Payment confirmed">
      <div className={styles.card}>
        <div className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7.5 12.5l2.8 2.8 6.2-6.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className={styles.title}>You&rsquo;re in.</h1>
        <p className={styles.sub}>Your subscription is active. A receipt is on its way to your inbox.</p>

        <div className={styles.footRow}>
          <span className={styles.tagLine} />
          <button
            type="button"
            className={styles.continueBtn}
            onClick={() => {
              leavingRef.current = true
              setVisible(false)
              router.replace('/')
            }}
          >
            Continue now
          </button>
          <span className={styles.tagLine} />
        </div>

        <p className={styles.countdown}>
          Redirecting to home in {secondsLeft}s&hellip;
        </p>
      </div>
    </div>
  )
}
