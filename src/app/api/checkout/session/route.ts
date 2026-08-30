/* ============================================================================
   GET /api/checkout/session?id=cs_… -> { email, plan }

   The post-checkout handoff. Stripe's success_url carries the session id back
   to the homepage; CheckoutSuccess.tsx asks this route who that session
   belongs to so it can say "sign in with <email>" instead of a generic
   thank-you.

   WHAT IT DELIBERATELY DOES NOT RETURN: anything else on the Session. The
   response is exactly { email, plan } — no customer id, no subscription id,
   no amounts, no metadata. A session id is unguessable but it is not a
   credential, and it sits in the browser history and any referrer header, so
   this endpoint is treated as public-ish and told to say as little as
   possible.

   404 for not-found AND for unpaid, on purpose: the caller only ever asks
   "can I greet this customer yet?", and a 404 is the honest answer to both.
   An unpaid session becomes paid later (delayed payment methods settle
   asynchronously — see the webhook), which is why the caller retries.

   This is NOT the fulfilment path. src/app/api/webhook/route.ts, gated on
   payment_status and signature-verified, is the only place a purchase is
   recorded. This route is UI data.
   ========================================================================= */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { isPlanKey } from '@/lib/pricing'

export const runtime = 'nodejs'
/* Never cache: the answer changes the moment the payment settles. */
export const dynamic = 'force-dynamic'

const NOT_FOUND = { error: 'No confirmed session.' }

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id || !id.startsWith('cs_') || id.length > 200) {
    return NextResponse.json({ error: 'Missing session id.' }, { status: 400 })
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Checkout is not configured yet.' }, { status: 503 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(id)
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return NextResponse.json(NOT_FOUND, { status: 404 })
    }
    const email = session.customer_details?.email
    if (!email) return NextResponse.json(NOT_FOUND, { status: 404 })

    const plan = session.metadata?.plan
    return NextResponse.json({ email, plan: isPlanKey(plan) ? plan : null })
  } catch (err) {
    /* A bad id is a Stripe 404, which the SDK throws. Anything else is logged
       and still answered with a 404 — the browser gets one shape either way. */
    console.error('[checkout/session] retrieve failed:', err)
    return NextResponse.json(NOT_FOUND, { status: 404 })
  }
}
