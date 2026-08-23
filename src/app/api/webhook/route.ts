/* ============================================================================
   POST /api/webhook — Stripe webhook, signature-verified.

   CLAUDE.md: "The webhook route needs the RAW request body for signature
   verification." req.text() gives exactly the bytes Stripe signed; parsing to
   JSON first and re-serialising would change whitespace and key order and every
   signature would fail. Do not "tidy" this into req.json().

   The handler is intentionally thin. There is no database and no account system
   in this repo yet (CLAUDE.md roadmap: "accounts + dashboard" is later), so
   events are verified and logged rather than acted on. That is the honest
   stopping point — a fake fulfilment path would be worse than none.
   ========================================================================= */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
/* Never cache a webhook. */
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !secret || !secret.trim()) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  const raw = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret.trim())
  } catch (err) {
    /* A failed signature means the payload is not from Stripe, or the secret is
       wrong. Either way: do not process it. */
    console.error('[webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      /* TODO(accounts): grant/revoke access here once there is somewhere to
         record it. Deliberately not faked. */
      console.log(`[webhook] ${event.type} — id=${event.id}`)
      break
    default:
      console.log(`[webhook] unhandled event ${event.type}`)
  }

  /* 200 quickly, or Stripe retries. */
  return NextResponse.json({ received: true })
}
