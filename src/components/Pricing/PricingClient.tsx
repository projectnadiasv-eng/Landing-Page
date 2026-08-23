'use client'

/* ============================================================================
   Block 09's markup and behaviour.  legacy/index.html 4670-4828.

   What replaces what:

   - legacy LINKS{} pointed signal/pro at HighLevel /preview/ funnel URLs and
     desk at '#'. CLAUDE.md lists those funnel links as a pre-launch blocker
     ("HighLevel checkout URLs ... being replaced by Stripe"). The CTAs now POST
     the plan key to /api/checkout and follow the Session url.
   - NEW_TAB = false is preserved: same tab, no target="_blank".
   - A tier with no STRIPE_PRICE_* configured keeps href="#" and does nothing,
     which is exactly what Desk does today. .env.example asks for that by name.
   - legacy:4779-4801 spprSurface() — the ancestor background/margin scrubber —
     is NOT ported. HighLevel wrapper machinery, no analogue here.
   - The compare link keeps href="#spsignup-root". That target does not exist,
     so it stays dead. CLAUDE.md: "The dead links stay dead. Reviving one is a
     product decision, not a migration step."

   The reveal uses the shared useInViewReveal hook, which already encodes this
   block's exact values (70ms stagger, threshold .12, -40px rootMargin, 2000ms
   fallback) — it was written from legacy:4807-4826 among others.

   NOTE the .p-in quirk: it is both the layout container and the reveal class.
   See Pricing.module.css. Do not separate them.
   ========================================================================= */

import { useState } from 'react'
import { useInViewReveal } from '@/hooks/useInViewReveal'
import type { PlanKey } from '@/lib/pricing'
import styles from './Pricing.module.css'

export default function PricingClient({ live }: { live: Record<PlanKey, boolean> }) {
  const rootRef = useInViewReveal<HTMLElement>(styles['p-in'], '.' + styles['p-rv'])
  const [busy, setBusy] = useState<PlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout(plan: PlanKey, e: React.MouseEvent) {
    if (!live[plan]) return /* dead link, exactly as today */
    e.preventDefault()
    if (busy) return
    setBusy(plan)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start checkout.')
        setBusy(null)
        return
      }
      /* NEW_TAB = false — same tab. */
      window.location.href = data.url
    } catch {
      setError('Could not reach checkout. Check your connection and try again.')
      setBusy(null)
    }
  }

  const ctaProps = (plan: PlanKey) => ({
    href: '#',
    rel: 'noopener' as const,
    'aria-busy': busy === plan,
    onClick: (e: React.MouseEvent) => startCheckout(plan, e),
  })

  return (
    <section id="sppricing-root" ref={rootRef} aria-label="Pricing">
      <div className={styles['p-in']}>

        <div className={styles['p-head']}>
          <span className={`${styles['p-eyebrow']} ${styles['p-rv']}`}>Pricing</span>
          <h2 className={`${styles['p-h']} ${styles['p-rv']}`}>Start with the depth <em>that fits you.</em></h2>
          <p className={`${styles['p-sub']} ${styles['p-rv']}`}>Change plan whenever you like. Cancel whenever you like.</p>
        </div>

        <div className={styles['p-grid']}>

          <article className={`${styles['p-card']} ${styles['p-rv']}`}>
            <h3 className={styles['p-name']}>Signal</h3>
            <p className={styles['p-for']}>Read a company, follow the room, learn the vocabulary.</p>

            <div className={styles['p-price']}><b>$27</b><span>per month</span></div>

            <ul className={styles['p-list']}>
              <li><i></i><span><b>Community</b><small>X and Reddit</small></span></li>
              <li><i></i><span><b>Companies</b><small>Two layers, numbers and meaning</small></span></li>
              <li><i></i><span><b>Education Center</b><small>Lessons under two minutes</small></span></li>
            </ul>

            <a className={`${styles['p-cta']} ${styles.ghost}`} data-plan="signal" {...ctaProps('signal')}>Get Signal
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </article>

          <article className={`${styles['p-card']} ${styles['is-lead']} ${styles['p-rv']}`}>
            <span className={styles['p-flag']}>Most popular</span>
            <h3 className={styles['p-name']}>Signal Pro</h3>
            <p className={styles['p-for']}>Everything above, plus the flows most people never see.</p>

            <div className={styles['p-price']}><b>$47</b><span>per month</span></div>

            <ul className={styles['p-list']}>
              <li><i></i><span><b>Everything in Signal</b><small>All three desks</small></span></li>
              <li><i></i><span><b>Congress</b><small>Form 4 and 13F filings</small></span></li>
              <li><i></i><span><b>Crypto</b><small>21 sources, on-chain and derivatives</small></span></li>
              <li><i></i><span><b>Signal Pro AI</b><small>Filings, flows and posts in one answer</small></span></li>
            </ul>

            <a className={`${styles['p-cta']} ${styles.solid}`} data-plan="pro" {...ctaProps('pro')}>Get Signal Pro
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </article>

          <article className={`${styles['p-card']} ${styles['p-rv']}`}>
            <span className={styles['p-flag']}>Most complete</span>
            <h3 className={styles['p-name']}>Signal Desk</h3>
            <p className={styles['p-for']}>For people acting on this daily, not weekly.</p>

            <div className={styles['p-price']}><b>$97</b><span>per month</span></div>

            <ul className={styles['p-list']}>
              <li><i></i><span><b>Everything in Signal Pro</b><small>All desks and AI</small></span></li>
              <li><i></i><span><b>Real-time alerts</b><small>Filings and flows as they land</small></span></li>
              <li><i></i><span><b>Portfolio tracking</b><small>Your holdings, watched continuously</small></span></li>
              <li><i></i><span><b>Data export</b><small>CSV and API access</small></span></li>
            </ul>

            <a className={`${styles['p-cta']} ${styles.solid}`} data-plan="desk" {...ctaProps('desk')}>Get Signal Desk
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </article>

        </div>

        {error ? (
          <p className={styles['p-foot']} role="alert">
            {error}
          </p>
        ) : null}

      <p className={`${styles['p-foot']} ${styles['p-rv']}`}>Compare both plans in full <a data-plan="compare" href="#">below</a></p>

      </div>
    </section>


  )
}
