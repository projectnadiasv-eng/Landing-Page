/* ============================================================================
   POST /api/checkout  -> { url, sessionId } for a Stripe Checkout Session.

   ANONYMOUS checkout — no account, no Stripe Customer, no CRM row. The pricing
   CTAs no longer call this: they go to /signup, which creates the account first
   and then builds the same session with a customer attached (see
   src/app/api/signup/route.ts). This route is kept working unchanged for
   anything that still points at it — old links, saved curl commands, anything
   outside this repo.

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

   sessionId is returned alongside url so the caller can tag its own
   checkout_started funnel event with the real Stripe session id before the
   redirect.
   ========================================================================= */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { isPlanKey } from '@/lib/pricing'
import { attributionFrom, createCheckoutSession, siteUrl } from '@/lib/checkout-session'

export const runtime = 'nodejs'

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

  const stripe = getStripe()
  if (!stripe) {
    /* Key not configured. 503 rather than 500: nothing is broken, checkout is
       simply not switched on in this environment yet. */
    return NextResponse.json(
      { error: 'Checkout is not configured yet.' },
      { status: 503 },
    )
  }

  const result = await createCheckoutSession(stripe, {
    plan,
    baseUrl: siteUrl(req),
    attribution: attributionFrom(b),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ url: result.url, sessionId: result.sessionId })
}
