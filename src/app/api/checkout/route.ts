/* ============================================================================
   POST /api/checkout  -> { url, sessionId } for a Stripe Checkout Session.

   CLAUDE.md: checkout is MONTHLY SUBSCRIPTIONS, and NEW_TAB = false, so the
   client navigates the current tab to the returned url.

   The plan key is the ONLY thing accepted from the browser. Prices are never
   sent by the client — a client that could name its own amount could name $0.
   The key is looked up in the server-side catalogue and rejected if unknown.

   payment_method_types is deliberately ABSENT. Stripe's guidance is explicit:
   omit it entirely so dynamic payment methods apply and the eligible set is
   controlled from the Dashboard. Hardcoding ['card'] would lock out every other
   method and cost conversion. Do not add it back.

   utm_source/utm_medium/utm_campaign/referrer are optional, client-supplied
   attribution — captured once on first visit (see src/lib/spro-analytics.ts)
   and threaded through as session + subscription metadata. The webhook reads
   them back off the completed event and forwards them to project_nadia's CRM
   (Signal Pro CRM plan, Phase 1/2/3). They are display data, not trusted
   input, so they are clamped to a sane length rather than validated — a
   client could lie about its own attribution and the worst case is a wrong
   number in a marketing report, not a security issue.

   sessionId is returned alongside url so the client can tag its own
   checkout_started funnel event with the real Stripe session id before the
   redirect (see PricingClient.tsx).
   ========================================================================= */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { isPlanKey, PLANS, priceIdFor } from '@/lib/pricing'

export const runtime = 'nodejs'

function siteUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured && configured.trim()) return configured.trim().replace(/\/$/, '')
  /* Fall back to the request's own origin so preview deployments work without
     per-environment configuration. */
  return new URL(req.url).origin
}

/* Trim and cap length. Attribution strings are never validated against a
   known set — UTM values are free text by convention — so the only defence
   worth having is against someone pasting a novel into the field. */
function clamped(v: unknown, max = 200): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  if (!t) return undefined
  return t.slice(0, max)
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = body as Record<string, unknown> | null
  const plan = b?.plan
  if (!isPlanKey(plan)) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
  }

  const utmSource = clamped(b?.utm_source)
  const utmMedium = clamped(b?.utm_medium)
  const utmCampaign = clamped(b?.utm_campaign)
  const referrer = clamped(b?.referrer, 500)

  const stripe = getStripe()
  if (!stripe) {
    /* Key not configured. 503 rather than 500: nothing is broken, checkout is
       simply not switched on in this environment yet. */
    return NextResponse.json(
      { error: 'Checkout is not configured yet.' },
      { status: 503 },
    )
  }

  const price = priceIdFor(plan)
  if (!price) {
    return NextResponse.json(
      { error: `The ${PLANS[plan].name} tier is not available yet.` },
      { status: 503 },
    )
  }

  const base = siteUrl(req)
  const metadata: Record<string, string> = { plan }
  if (utmSource) metadata.utm_source = utmSource
  if (utmMedium) metadata.utm_medium = utmMedium
  if (utmCampaign) metadata.utm_campaign = utmCampaign
  if (referrer) metadata.referrer = referrer

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      /* Stripe substitutes the real id into {CHECKOUT_SESSION_ID}. */
      success_url: `${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?checkout=cancelled#sppricing-root`,
      allow_promotion_codes: true,
      /* Tags every session so these three tiers can be compared in the
         Dashboard's checkout reporting. Stripe asks for a random 8-letter
         suffix; it must stay CONSTANT to keep the history joined up. */
      integration_identifier: 'signalpro-pricing-inqngrik',
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { metadata },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe returned no checkout URL.' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    /* Never leak the Stripe error body to the browser — it can echo config
       details. Log server-side, return something a human can act on. */
    console.error('[checkout] Stripe session create failed:', err)
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 })
  }
}
