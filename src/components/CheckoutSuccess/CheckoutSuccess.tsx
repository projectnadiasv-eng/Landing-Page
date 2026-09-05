'use client'

/* ============================================================================
   The post-checkout handoff — the last step this repo owns.

   Stripe redirects here on success_url: /?checkout=success&session_id=...
   (see src/lib/checkout-session.ts). Since 2026-09-05 this overlay does not ask
   the customer to do anything: once Stripe confirms the payment it calls
   POST /api/handoff and navigates the browser to the url that comes back, which
   signs them into the app. The overlay is what they see for the second or two
   in between, and the fallback for when the shortcut cannot be taken.

   It used to run a 10-second countdown back to the homepage, and before that a
   button asking them to go and find a sign-in email. Both were the wrong ending
   for someone who has just paid.

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
/* Trailing slash stripped once here — APP_URL is used both bare (the
   unconfirmed state's href) and as a path base (`${APP_URL}/login?...`
   below), and a trailing slash in the env var would double up to `//login`. */
const APP_URL = process.env.NEXT_PUBLIC_SIGNAL_PRO_APP_URL?.replace(/\/+$/, '')
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
  /* The automatic sign-in has been tried and could not be taken. Distinct from
     `gaveUp`: the payment IS confirmed, only the shortcut is missing, so the
     copy is the confirmed one with a button rather than the uncertain one. */
  const [handoffFailed, setHandoffFailed] = useState(false)
  const handoffRef = useRef(false)
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

  /*
   * The automatic sign-in. Runs once, the moment Stripe has confirmed the
   * payment, and takes the browser out of this page entirely.
   *
   * Ordered AFTER confirmation rather than fired alongside the first poll,
   * because /api/handoff writes the customer's entitlement before it mints a
   * login and a session id can only ever be exchanged ONCE — spending it on an
   * unpaid session would burn the customer's single attempt. `confirmed` is the
   * signal that Stripe has said yes, so this effect keys on it.
   *
   * ## One shot, and no cancellation flag
   *
   * `handoffRef` guards the one attempt, because React StrictMode double-invokes
   * effects in development and a second request would be refused as
   * 'already_used' — turning a working sign-in into the fallback, in development
   * only, which is the worst place to introduce a difference from production.
   *
   * There is deliberately NO `cancelled` flag on the pending request, and this
   * is the same trap signal-pro's AuthCallback documents at length. StrictMode's
   * teardown runs BETWEEN the two invocations, so a flag set in cleanup would
   * abandon the one real attempt while the second invocation returned early at
   * the ref guard — and the overlay would sit on "Taking you into Signal Pro…"
   * forever, in development, having done nothing. Letting the response land is
   * harmless: the two things it can do are navigate away and set one state flag.
   *
   * location.replace, not assign: the success URL must not be a back-button
   * destination, and neither must this page be one from inside the app.
   */
  useEffect(() => {
    if (!confirmed || !sessionId) return
    if (handoffRef.current) return
    handoffRef.current = true

    void (async () => {
      try {
        const res = await fetch('/api/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
          cache: 'no-store',
        })
        if (res.ok) {
          const data = (await res.json()) as { url?: string }
          if (data.url) {
            /* Stops `dismiss` from racing the navigation away. */
            leavingRef.current = true
            window.location.replace(data.url)
            return
          }
        }
      } catch {
        /* Network blip. Not retried: the one attempt is spent either way, and
           the fallback below is a working sign-in rather than a dead end. */
      }
      setHandoffFailed(true)
    })()
  }, [confirmed, sessionId])

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

  /* Four states, and they are NOT interchangeable:
       pending      — Stripe has not called it paid yet, so we do not know.
       signing_in   — Stripe says paid and the automatic sign-in is in flight.
                      The ordinary ending: this state is normally visible for
                      about a second and then the browser leaves for the app.
       confirmed    — paid, but the sign-in could not be taken. The payment is
                      not in doubt; only the shortcut is missing, so this is the
                      confirmed copy plus a button, NOT an apology about money.
       unconfirmed  — the 60s budget expired, or there was no session id to
                      ask about. We still do not know, and saying otherwise
                      would be a lie about money. */
  const state: 'pending' | 'signing_in' | 'confirmed' | 'unconfirmed' = confirmed
    ? handoffFailed
      ? 'confirmed'
      : 'signing_in'
    : gaveUp
      ? 'unconfirmed'
      : 'pending'

  const ARIA_LABEL = {
    pending: 'Confirming your payment',
    signing_in: 'Signing you in',
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
        {/* A tick means "the money arrived", which is true in both of the paid
            states. Showing one next to "we couldn't confirm your payment" would
            undo the copy, so the two uncertain states get a clock instead. */}
        <div className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
            {state === 'confirmed' || state === 'signing_in' ? (
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

        {state === 'signing_in' ? (
          <>
            <h1 className={styles.title}>Payment confirmed</h1>
            <p className={styles.sub}>
              Taking you into Signal Pro&hellip; you&rsquo;ll be signed in automatically.
            </p>
          </>
        ) : null}

        {state === 'confirmed' && confirmed ? (
          <>
            <h1 className={styles.title}>Payment confirmed</h1>
            <p className={styles.sub}>
              We couldn&rsquo;t sign you in automatically. Open Signal Pro below and we&rsquo;ll
              email a one-click link to <b className={styles.email}>{confirmed.email}</b> — the
              address you paid with. No password needed.
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
            /* Only in the fallback state — on the ordinary path the browser has
               already left for the app and nobody sees this. The welcome email
               no longer carries a sign-in token (project_nadia mints exactly one
               link, in /api/spro/handoff, and a second minter would invalidate
               it), so this button is the recovery path: /login?email=... asks
               the app to send a fresh link, one click, no password prompt. */
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

          {/* Nothing to offer while the sign-in is in flight. The browser is
              about to leave, and controls that appear for a second and then
              vanish under a navigation read as a glitch — worse, "Back to site"
              is a way to lose the redirect by clicking it. */}
          {PORTAL_URL && state !== 'signing_in' ? (
            <a className={styles.secondaryBtn} href={PORTAL_URL} rel="noopener">
              Manage billing
            </a>
          ) : null}

          {state !== 'signing_in' ? (
            <button type="button" className={styles.secondaryBtn} onClick={dismiss}>
              Back to site
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
