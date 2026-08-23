/* ============================================================================
   POST /api/checkout  -> { url } for a Stripe Checkout Session.

   CLAUDE.md: checkout is MONTHLY SUBSCRIPTIONS, and NEW_TAB = false, so the
   client navigates the current tab to the returned url.

   The plan key is the ONLY thing accepted from the browser. Prices are never
   sent by the client — a client that could name its own amount could name $0.
   The key is looked up in the server-side catalogue and rejected if unknown.
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

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const plan = (body as { plan?: unknown } | null)?.plan
  if (!isPlanKey(plan)) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
  }

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
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      /* Stripe substitutes the real id into {CHECKOUT_SESSION_ID}. */
      success_url: `${base}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?checkout=cancelled#sppricing-root`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: { plan },
      subscription_data: { metadata: { plan } },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe returned no checkout URL.' }, { status: 502 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    /* Never leak the Stripe error body to the browser — it can echo config
       details. Log server-side, return something a human can act on. */
    console.error('[checkout] Stripe session create failed:', err)
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 })
  }
}
