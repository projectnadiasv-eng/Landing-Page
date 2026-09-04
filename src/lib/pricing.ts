/* ============================================================================
   The plan catalogue. Checkout is MONTHLY SUBSCRIPTIONS.

   ONE PLAN, as of the 2026-09-04 pricing change. The three-tier ladder
   ($27 Signal / $47 Signal Pro / $97 Signal Desk) that CLAUDE.md and legacy
   block 09 describe is collapsed to its middle rung: the Signal Pro
   subscription at $47 carries access to everything in the app, and the tiers
   either side are retired. This file is the source of truth for that
   decision — CLAUDE.md's "all three wired" line and the legacy markup are
   historical from here on.

   NOTHING WAS RE-PRICED. The $47 Price object in Stripe is untouched and
   STRIPE_PRICE_PRO still points at it; two tiers were removed from around it.

   The displayed price lives in the markup (legacy block 09) and is NOT the
   source of truth for what gets charged — Stripe is. What Stripe charges comes
   from the Price object named by the env var below. If the two ever disagree,
   the page is lying to the customer, so keep them in step deliberately.
   ========================================================================= */

export type PlanKey = 'pro'

export const PLANS: Record<PlanKey, { name: string; display: string; env: string }> = {
  pro: { name: 'Signal Pro', display: '$47', env: 'STRIPE_PRICE_PRO' },
}

/**
 * Keys that were sellable before the single-plan change and are not any more.
 *
 * They exist for two reasons, both of which are live concerns:
 *
 * 1. A subscription bought under the old ladder carries
 *    `metadata.plan = 'signal' | 'desk'` for its whole life, and Stripe
 *    replays that metadata on every renewal invoice. The webhook must keep
 *    translating it — see CRM_TIER in src/app/api/webhook/route.ts. There IS
 *    such a subscription today (a live $27 `plan: 'signal'` one), so this is
 *    not defensive programming for a hypothetical.
 * 2. /signup recognises a stale `?plan=` from an old link or bookmark and
 *    redirects to the canonical URL instead of quietly serving something the
 *    visitor did not ask for.
 *
 * Nothing may be BOUGHT under them: they are absent from PLANS, so
 * `isPlanKey()` rejects them and every entry point answers 400.
 */
export type RetiredPlanKey = 'signal' | 'desk'

export const RETIRED_PLAN_KEYS: readonly RetiredPlanKey[] = ['signal', 'desk']

export const isPlanKey = (v: unknown): v is PlanKey =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(PLANS, v)

/**
 * The only plan there is.
 *
 * Every caller that used to choose a plan now names this constant, so "which
 * plan is this?" has exactly one answer and adding a second plan later means
 * finding this symbol rather than grepping for the string 'pro'.
 */
export const ONLY_PLAN: PlanKey = 'pro'

/** The Stripe Price id for a plan, or null when checkout is not configured. */
export function priceIdFor(plan: PlanKey): string | null {
  const id = process.env[PLANS[plan].env]
  return id && id.trim() ? id.trim() : null
}
