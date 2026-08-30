/* ============================================================================
   The plan catalogue. CLAUDE.md: "Tiers — all three wired, including the
   currently-dead $97 Signal Desk", and checkout is MONTHLY SUBSCRIPTIONS.

   The displayed prices live in the markup (legacy block 09) and are NOT the
   source of truth for what gets charged — Stripe is. What Stripe charges comes
   from the Price object named by the env var below. If the two ever disagree,
   the page is lying to the customer, so keep them in step deliberately.
   ========================================================================= */

export type PlanKey = 'signal' | 'pro' | 'desk'

export const PLANS: Record<PlanKey, { name: string; display: string; env: string }> = {
  signal: { name: 'Signal', display: '$27', env: 'STRIPE_PRICE_SIGNAL' },
  pro: { name: 'Signal Pro', display: '$47', env: 'STRIPE_PRICE_PRO' },
  desk: { name: 'Signal Desk', display: '$97', env: 'STRIPE_PRICE_DESK' },
}

export const isPlanKey = (v: unknown): v is PlanKey =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(PLANS, v)

/** The Stripe Price id for a plan, or null when the tier is not live yet. */
export function priceIdFor(plan: PlanKey): string | null {
  const id = process.env[PLANS[plan].env]
  return id && id.trim() ? id.trim() : null
}
