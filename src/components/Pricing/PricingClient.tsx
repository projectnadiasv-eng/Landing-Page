'use client'

/* ============================================================================
   Block 09's markup and behaviour.  legacy/index.html 4670-4828.

   What replaces what:

   - legacy LINKS{} pointed signal/pro at HighLevel /preview/ funnel URLs and
     desk at '#'. CLAUDE.md lists those funnel links as a pre-launch blocker
     ("HighLevel checkout URLs ... being replaced by Stripe"). The CTAs are now
     ordinary links to /signup?plan=<key>, which creates the account and the
     Stripe Customer BEFORE checkout (src/app/api/signup/route.ts).
   - NEW_TAB = false is preserved: same tab, no target="_blank".
   - ALL THREE tiers are wired, Desk included — its legacy href="#" is gone.
     Whether a tier can actually be bought is still an env-var fact
     (STRIPE_PRICE_*), but it is now enforced one step later, on /signup, which
     can say "not available yet" instead of silently doing nothing.
   - checkout_started moved to the signup form, where the Stripe session id is
     actually returned. tier_clicked still fires here, unchanged.
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

import { useEffect, useRef } from 'react'
import { useInViewReveal } from '@/hooks/useInViewReveal'
import type { PlanKey } from '@/lib/pricing'
import { track, firstTouchUtm } from '@/lib/spro-analytics'
import styles from './Pricing.module.css'

export default function PricingClient() {
  const rootRef = useInViewReveal<HTMLElement>(styles['p-in'], '.' + styles['p-rv'])
  const pricingViewedRef = useRef(false)

  /* pricing_viewed — a single dedicated observer rather than widening
     useInViewReveal's contract, which fires per-item and is shared by four
     other blocks. CLAUDE.md's own ethos: never widen a shared hook mid-port. */
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (pricingViewedRef.current) return
        if (entries.some((e) => e.isIntersecting)) {
          pricingViewedRef.current = true
          track('pricing_viewed')
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [rootRef])

  /* The CTA is a real href, so a middle-click or cmd-click still opens
     /signup in a new tab and the funnel event still fires. The handler only
     takes over an ordinary left-click, and only to carry the campaign that
     brought the visitor here across a full page load — first-touch UTM lives
     in memory in spro-analytics and would be lost otherwise. */
  function onTierClick(plan: PlanKey, e: React.MouseEvent<HTMLAnchorElement>) {
    track('tier_clicked', plan)

    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const utm = firstTouchUtm()
    if (!utm) return

    e.preventDefault()
    const url = new URL(e.currentTarget.getAttribute('href') ?? '/signup', window.location.origin)
    if (utm.source) url.searchParams.set('utm_source', utm.source)
    if (utm.medium) url.searchParams.set('utm_medium', utm.medium)
    if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign)
    /* NEW_TAB = false — same tab. */
    window.location.href = url.pathname + url.search
  }

  const ctaProps = (plan: PlanKey) => ({
    href: `/signup?plan=${plan}`,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => onTierClick(plan, e),
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

      <p className={`${styles['p-foot']} ${styles['p-rv']}`}>Compare both plans in full <a data-plan="compare" href="#">below</a></p>

      </div>
    </section>


  )
}
