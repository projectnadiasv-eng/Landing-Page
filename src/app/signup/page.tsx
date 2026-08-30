/* ============================================================================
   /signup — SELECT PLAN -> CREATE SIGNAL PRO ACCOUNT.

   A server component so the plan catalogue stays server-side: src/lib/pricing.ts
   reads STRIPE_PRICE_* to answer priceIdFor(), and importing it into a client
   component would drag that lookup into the browser bundle. The client half
   receives plain display data (key, name, price) and nothing else.

   ?plan=signal|pro|desk preselects a tier. Anything else falls back to `pro`
   — the "Most popular" card — and the selector is shown either way, so a
   visitor who arrived without a plan, or with a mangled one, can still choose.

   Whether a tier can actually be bought is still an env-var fact. It is
   enforced in POST /api/signup, which answers 503 "The <tier> tier is not
   available yet." — the same message /api/checkout has always given.
   ========================================================================= */

import type { Metadata } from 'next'
import { PLANS, isPlanKey, type PlanKey } from '@/lib/pricing'
import SignupForm, { type Tier } from '@/components/Signup/SignupForm'

export const metadata: Metadata = {
  title: 'Create your account | Signal Pro',
  description: 'Create your Signal Pro account and choose your plan.',
  /* A funnel step, not a landing page — it duplicates the pricing block's
     content and has no business ranking above it. */
  robots: { index: false, follow: true },
}

/* Display order, same as the pricing block. */
const ORDER: readonly PlanKey[] = ['signal', 'pro', 'desk']
const DEFAULT_PLAN: PlanKey = 'pro'

const TIERS: Tier[] = ORDER.map((key) => ({
  key,
  name: PLANS[key].name,
  display: PLANS[key].display,
}))

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>
}) {
  const { plan } = await searchParams
  const requested = Array.isArray(plan) ? plan[0] : plan

  return (
    <SignupForm tiers={TIERS} initialPlan={isPlanKey(requested) ? requested : DEFAULT_PLAN} />
  )
}
