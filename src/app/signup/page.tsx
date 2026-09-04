/* ============================================================================
   /signup — CREATE SIGNAL PRO ACCOUNT.

   A server component so the plan catalogue stays server-side: src/lib/pricing.ts
   reads STRIPE_PRICE_* to answer priceIdFor(), and importing it into a client
   component would drag that lookup into the browser bundle. The client half
   receives plain display data (name, price) and nothing else.

   NO TIER PICKER (2026-09-04). There is one plan, so there is nothing to
   choose: the form shows what you are buying and collects a name and an email.
   The step in the funnel's own diagram used to be SELECT PLAN -> CREATE
   ACCOUNT; it is now just CREATE ACCOUNT.

   ?plan= IS REDIRECTED, NOT ABSORBED. Every link that ever pointed here
   carried one — the pricing CTAs did, and so does anything a visitor
   bookmarked or a campaign published. The old code silently fell back to
   `pro` for an unrecognised value, which was fine while a picker was on
   screen to show the result. With the picker gone there would be nothing to
   reveal the substitution, so a `?plan=` of ANY value now 307s to the
   canonical /signup instead.

   Other query params survive the redirect. PricingClient re-attaches
   first-touch utm_source/medium/campaign to the CTA href precisely because
   they would otherwise be lost across the page load, and dropping them here
   would defeat that — the CRM would stop seeing which campaign paid for the
   signup. Only `plan` is stripped.

   Whether the plan can actually be bought is still an env-var fact. It is
   enforced in POST /api/signup, which answers 503 "The Signal Pro tier is not
   available yet."
   ========================================================================= */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PLANS, ONLY_PLAN } from '@/lib/pricing'
import SignupForm from '@/components/Signup/SignupForm'

export const metadata: Metadata = {
  title: 'Create your account | Signal Pro',
  description: 'Create your Signal Pro account.',
  /* A funnel step, not a landing page — it duplicates the pricing block's
     content and has no business ranking above it. */
  robots: { index: false, follow: true },
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  if (params.plan !== undefined) {
    /* Rebuild the query string without `plan`. next/navigation's redirect()
       answers 307 from a server component — a temporary redirect, which is
       what this is: the URL is wrong for today's catalogue, not wrong
       forever. A 308 would be cached by the browser and would outlive any
       future decision to reintroduce a second plan. */
    const rest = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (key === 'plan' || value === undefined) continue
      for (const v of Array.isArray(value) ? value : [value]) rest.append(key, v)
    }
    const qs = rest.toString()
    redirect(qs ? `/signup?${qs}` : '/signup')
  }

  return <SignupForm planName={PLANS[ONLY_PLAN].name} planPrice={PLANS[ONLY_PLAN].display} />
}
