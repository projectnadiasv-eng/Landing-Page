'use client'

/* ============================================================================
   The post-checkout handoff (R4) — the last step this repo owns.

   Stripe redirects here on success_url: /?checkout=success&session_id=...
   (see src/lib/checkout-session.ts). The customer's next move is AUTHENTICATE
   CUSTOMER in the signal-pro webapp, with the SAME email they just paid with,
   so this overlay's whole job is to name that email and hand them the door.

   It used to run a 10-second countdown back to the homepage. That was the
   wrong ending: it dropped a paying customer back onto a marketing page with
   no idea where the product lived.

   Reads the query string via window.location, not next/navigation's
   useSearchParams — that hook requires a Suspense boundary around any client
   component that calls it, which would mean either wrapping page.tsx (owned
   by the orchestrator, see docs/OWNERSHIP.md) or adding a Suspense fallback
   that flashes on every load. Reading location directly in an effect avoids
   both for a value that is only ever needed after mount anyway.

   The email is NOT taken from the URL. It comes from
   GET /api/checkout/session?id=..., which asks Stripe. A session that Stripe
   has not marked paid yet answers 404, so this polls — delayed payment methods
   settle asynchronously (the webhook handles the same case) and a bank debit
   can land here before the money has.

   Still NOT the source of truth for a completed purchase: anyone can paste
   this URL, and the poll only reveals an email to whoever already holds the
   session id. src/app/api/webhook/route.ts is the only place a purchase is
   recorded. This component is UI.
   ========================================================================= */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './CheckoutSuccess.module.css'

/* Poll cadence and budget for a session that is not paid yet. */
const POLL_MS = 3_000
const POLL_BUDGET_MS = 60_000

/* Configuration, not code — see constraints: billing management is Stripe's
   hosted Customer Portal and its login link is a URL someone pastes into the
   environment. Both are NEXT_PUBLIC_ because they are destinations for the
   browser, and neither is a secret. */
const APP_URL = process.env.NEXT_PUBLIC_SIGNAL_PRO_APP_URL
const PORTAL_URL = process.env.NEXT_PUBLIC_STRIPE_PORTAL_LOGIN_URL

type Confirmation = { email: string; plan: string | null }

export default function CheckoutSuccess() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null)
  /* Stops polling: either the budget ran out, or there was no session id to
     ask about. Either way we stop saying "confirming" and hand over anyway —
     the payment is Stripe's business by then, not this overlay's. */
  const [gaveUp, setGaveUp] = useState(false)
  const leavingRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') !== 'success') return
    const id = params.get('session_id')
    setSessionId(id && id.startsWith('cs_') ? id : null)
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    if (!sessionId) {
      /* Nothing to ask Stripe about — an old link, or success_url edited by
         hand. Show the generic confirmation rather than spinning forever. */
      setGaveUp(true)
      return
    }

    let cancelled = false
    let timer: number | undefined
    const deadline = Date.now() + POLL_BUDGET_MS

    const poll = async () => {
      try {
        const res = await fetch(`/api/checkout/session?id=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        })
        if (cancelled) return
        if (res.ok) {
          const data = (await res.json()) as Confirmation
          if (!cancelled && data.email) {
            setConfirmed(data)
            return
          }
        } else if (res.status === 503) {
          /* Checkout is not configured in this environment. Permanent for the
             life of this page load — retrying 20 times changes nothing. */
          setGaveUp(true)
          return
        }
      } catch {
        /* Network blip — fall through to the retry below. */
      }
      if (cancelled) return
      if (Date.now() >= deadline) {
        setGaveUp(true)
        return
      }
      timer = window.setTimeout(poll, POLL_MS)
    }

    void poll()

    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [visible, sessionId])

  if (!visible) return null

  const dismiss = () => {
    if (leavingRef.current) return
    leavingRef.current = true
    /* replace, not push — the success URL must not become a back-button
       destination. router.replace is a client-side navigation and does not
       unmount this component on its own, so the overlay is hidden explicitly. */
    setVisible(false)
    router.replace('/')
  }

  /* Three states, and they are NOT interchangeable:
       pending      — Stripe has not called it paid yet, so we do not know.
       confirmed    — Stripe says paid; the webhook has the same event and is
                      writing entitlement.
       unconfirmed  — the 60s budget expired, or there was no session id to
                      ask about. We still do not know, and saying otherwise
                      would be a lie about money. */
  const state: 'pending' | 'confirmed' | 'unconfirmed' = confirmed
    ? 'confirmed'
    : gaveUp
      ? 'unconfirmed'
      : 'pending'

  const ARIA_LABEL = {
    pending: 'Confirming your payment',
    confirmed: 'Payment confirmed',
    unconfirmed: 'Payment not confirmed yet',
  } as const

  return (
    <div
      className={styles.overlay}
      role="alertdialog"
      aria-live="polite"
      aria-label={ARIA_LABEL[state]}
    >
      <div className={styles.card}>
        {/* A tick means "confirmed". Showing one next to "we couldn't confirm
            your payment" would undo the copy, so the other two states get a
            clock instead. */}
        <div className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
            {state === 'confirmed' ? (
              <path d="M7.5 12.5l2.8 2.8 6.2-6.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M12 6.5V12l3.5 2.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>

        {state === 'pending' ? (
          <>
            <h1 className={styles.title}>We&rsquo;re confirming your payment&hellip;</h1>
            <p className={styles.sub}>
              This usually takes a few seconds. You can leave this page open — a receipt is on
              its way to your inbox either way.
            </p>
          </>
        ) : null}

        {state === 'confirmed' && confirmed ? (
          <>
            <h1 className={styles.title}>Payment confirmed</h1>
            <p className={styles.sub}>
              We&rsquo;ve emailed a sign-in link to <b className={styles.email}>{confirmed.email}</b> — open it
              to enter Signal Pro. No password needed.
            </p>
          </>
        ) : null}

        {state === 'unconfirmed' ? (
          <>
            <h1 className={styles.title}>We couldn&rsquo;t confirm your payment yet</h1>
            <p className={styles.sub}>
              Check your email for a receipt. If it arrived, your subscription is active — sign
              in with the email you paid with. If it did not, nothing was charged.
            </p>
          </>
        ) : null}

        <div className={styles.actions}>
          {/* Only once Stripe has confirmed. While pending, the webhook has not
              written entitlement yet, so this button would send a customer to
              an app that is about to turn them away. */}
          {APP_URL && state === 'confirmed' && confirmed ? (
            /* The CRM's welcome email already carries a Supabase magic link for
               this email — that's the actual sign-in path. This button is the
               fallback for "I lost the email": /login?email=... asks the app to
               send a fresh one, one click, no password prompt in between. */
            <a
              className={styles.primaryBtn}
              href={`${APP_URL}/login?email=${encodeURIComponent(confirmed.email)}`}
            >
              Open Signal Pro
            </a>
          ) : null}

          {APP_URL && state === 'unconfirmed' ? (
            <a className={styles.primaryBtn} href={APP_URL}>
              Sign in to Signal Pro
            </a>
          ) : null}

          {PORTAL_URL ? (
            <a className={styles.secondaryBtn} href={PORTAL_URL} rel="noopener">
              Manage billing
            </a>
          ) : null}

          <button type="button" className={styles.secondaryBtn} onClick={dismiss}>
            Back to site
          </button>
        </div>
      </div>
    </div>
  )
}
