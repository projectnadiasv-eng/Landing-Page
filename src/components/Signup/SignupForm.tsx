'use client'

/* ============================================================================
   CREATE SIGNAL PRO ACCOUNT — the one step between the pricing CTA and Stripe.

   Posts to /api/signup, which creates/links the Stripe Customer, writes the
   account row to project_nadia's CRM, and only then builds the Checkout
   Session. Nothing here decides anything: the plan key is the only thing sent
   that affects money, and the server re-validates it against its own
   catalogue.

   NO TIER PICKER (2026-09-04). There is one plan, so the radio fieldset is
   gone and a read-only summary of what is being bought takes its place. The
   plan key is still POSTed — ONLY_PLAN, from the server-side catalogue via
   /signup — rather than dropped from the request: /api/signup validates it
   with isPlanKey() and a body without one is a 400. Sending it keeps this
   form honest about what it is buying and keeps the second plan, if there is
   ever one, a matter of passing a different key.

   checkout_started fires HERE rather than on the pricing CTA, because this is
   the first point where a real Stripe session id exists to tag it with.
   tier_clicked still fires on the pricing page — see PricingClient.tsx.

   NEW_TAB = false, as everywhere else in this repo: the successful path
   navigates the current tab to the Stripe url.
   ========================================================================= */

import { useState } from 'react'
import { ONLY_PLAN } from '@/lib/pricing'
import { track, flush, firstTouchUtm } from '@/lib/spro-analytics'
import styles from './Signup.module.css'

/**
 * document.referrer, but only when it is another site. After a click from the
 * pricing block the referrer is this same site, and recording that would fill
 * the CRM's referrer column with our own homepage instead of the campaign or
 * search that actually brought the customer in.
 */
function externalReferrer(): string | undefined {
  const raw = document.referrer
  if (!raw) return undefined
  try {
    if (new URL(raw).host === window.location.host) return undefined
    return raw
  } catch {
    return undefined
  }
}

export default function SignupForm({
  planName,
  planPrice,
}: {
  planName: string
  planPrice: string
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  /* Honeypot. A human never sees this field; a form-filling bot does. The
     server answers a filled one with a success shape and does nothing. */
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      const utm = firstTouchUtm()
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          plan: ONLY_PLAN,
          website,
          ...(utm?.source ? { utm_source: utm.source } : {}),
          ...(utm?.medium ? { utm_medium: utm.medium } : {}),
          ...(utm?.campaign ? { utm_campaign: utm.campaign } : {}),
          referrer: externalReferrer(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        url?: string
        sessionId?: string
        error?: string
      }
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start checkout.')
        setBusy(false)
        return
      }
      track('checkout_started', data.sessionId)
      flush()
      /* NEW_TAB = false — same tab. */
      window.location.href = data.url
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <main id="spsu-root" className={styles.root}>
      <div className={styles.card}>
        <a className={styles.wordmark} href="/">Signal&nbsp;Pro</a>

        <h1 className={styles.h}>Create your account</h1>
        <p className={styles.sub}>
          One step before payment. We use your email to sign you in to Signal Pro and to send
          your receipts.
        </p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.field}>
            <span className={styles.label}>Full name</span>
            <input
              className={styles.input}
              type="text"
              name="name"
              autoComplete="name"
              maxLength={200}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              maxLength={320}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          {/* Honeypot — off-screen, unreachable by tab, never autofilled.
              aria-hidden so a screen reader does not announce it either. */}
          <div className={styles.hp} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {/* What you are buying, stated — not chosen. Kept in the form rather
              than moved up into the intro so it sits directly above the button
              that charges for it. */}
          <div className={styles.plan}>
            <span className={styles.planName}>{planName}</span>
            <span className={styles.planPrice}>
              <b>{planPrice}</b>
              <small>per month</small>
            </span>
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <button className={styles.submit} type="submit" disabled={busy} aria-busy={busy}>
            {busy ? 'Starting checkout…' : 'Continue to payment'}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <p className={styles.fine}>
            Monthly subscription. Cancel whenever you like.
          </p>
        </form>
      </div>
    </main>
  )
}
