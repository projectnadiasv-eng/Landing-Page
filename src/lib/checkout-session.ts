/* ============================================================================
   The one place a Stripe Checkout Session is built.

   Two routes create sessions and they must create the SAME session:

     POST /api/checkout  — anonymous. The original path, kept working
                           unchanged for anything that still calls it.
     POST /api/signup    — the account funnel. Same session PLUS the customer
                           it belongs to (CREATE/LINK STRIPE CUSTOMER) and the
                           CRM row it was created against.

   Everything the two share lives here, so "exactly as /api/checkout builds it
   today" is enforced by there being one builder rather than by two files
   staying in sync by hand.

   payment_method_types is deliberately ABSENT — see the note in
   src/app/api/checkout/route.ts. Do not add it back.

   Failures come back as a discriminated result rather than a thrown error:
   both callers need to map them onto their own status codes, and a Stripe
   error body must never reach the browser (it can echo config details).
   ========================================================================= */

import type Stripe from 'stripe'
import { PLANS, priceIdFor, type PlanKey } from '@/lib/pricing'

/** Optional, client-supplied attribution. Display data, never trusted input. */
export type Attribution = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
}

export type CheckoutSessionInput = {
  plan: PlanKey
  /** Origin the customer came from, no trailing slash. See siteUrl(). */
  baseUrl: string
  attribution: Attribution
  /** Existing Stripe Customer to bill. Only /api/signup has one. */
  customerId?: string
  /** The CRM's own customer uuid, echoed back on the session for joining. */
  crmCustomerId?: string
  /** Full name as given at signup, carried in metadata for the CRM. */
  name?: string
}

export type CheckoutSessionResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; status: 502 | 503; error: string }

/**
 * The site's own origin. NEXT_PUBLIC_SITE_URL when configured, otherwise the
 * request's origin so preview deployments work without per-environment config.
 */
export function siteUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured && configured.trim()) return configured.trim().replace(/\/$/, '')
  return new URL(req.url).origin
}

/**
 * Trim and cap length. Attribution strings are never validated against a
 * known set — UTM values are free text by convention — so the only defence
 * worth having is against someone pasting a novel into the field.
 */
export function clamped(v: unknown, max = 200): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  if (!t) return undefined
  return t.slice(0, max)
}

/** Pull the four attribution fields off a parsed JSON body. */
export function attributionFrom(b: Record<string, unknown> | null | undefined): Attribution {
  return {
    utmSource: clamped(b?.utm_source),
    utmMedium: clamped(b?.utm_medium),
    utmCampaign: clamped(b?.utm_campaign),
    referrer: clamped(b?.referrer, 500),
  }
}

export async function createCheckoutSession(
  stripe: Stripe,
  input: CheckoutSessionInput,
): Promise<CheckoutSessionResult> {
  const price = priceIdFor(input.plan)
  if (!price) {
    return {
      ok: false,
      status: 503,
      error: `The ${PLANS[input.plan].name} tier is not available yet.`,
    }
  }

  const metadata: Record<string, string> = { plan: input.plan }
  if (input.name) metadata.name = input.name
  if (input.attribution.utmSource) metadata.utm_source = input.attribution.utmSource
  if (input.attribution.utmMedium) metadata.utm_medium = input.attribution.utmMedium
  if (input.attribution.utmCampaign) metadata.utm_campaign = input.attribution.utmCampaign
  if (input.attribution.referrer) metadata.referrer = input.attribution.referrer

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    /* Stripe substitutes the real id into {CHECKOUT_SESSION_ID}. */
    success_url: `${input.baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.baseUrl}/?checkout=cancelled#sppricing-root`,
    allow_promotion_codes: true,
    /* Tags every session so these three tiers can be compared in the
       Dashboard's checkout reporting. Stripe asks for a random 8-letter
       suffix; it must stay CONSTANT to keep the history joined up. */
    integration_identifier: 'signalpro-pricing-inqngrik',
    billing_address_collection: 'auto',
    metadata,
    subscription_data: { metadata },
  }

  if (input.customerId) {
    params.customer = input.customerId
    /* Only legal alongside `customer`. Without it Checkout collects a name and
       address and then throws both away, leaving the Customer we just created
       permanently blank. */
    params.customer_update = { name: 'auto', address: 'auto' }
  }
  if (input.crmCustomerId) params.client_reference_id = input.crmCustomerId

  try {
    const session = await stripe.checkout.sessions.create(params)
    if (!session.url) {
      return { ok: false, status: 502, error: 'Stripe returned no checkout URL.' }
    }
    return { ok: true, url: session.url, sessionId: session.id }
  } catch (err) {
    /* Never leak the Stripe error body to the browser — it can echo config
       details. Log server-side, return something a human can act on. */
    console.error('[checkout-session] Stripe session create failed:', err)
    return { ok: false, status: 502, error: 'Could not start checkout.' }
  }
}
