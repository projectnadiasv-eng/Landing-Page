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

   The EVENT SET, though, is not a stub. Every branch below is one a
   subscription integration genuinely needs, so that wiring real fulfilment
   later means filling in the TODOs rather than working out which events
   matter. Subscribe to exactly these in the Dashboard.
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
    /* ---- fulfilment -----------------------------------------------------
       BOTH of these must grant access, and both must be gated on
       payment_status. A card pays immediately and only fires .completed; a
       delayed method (bank debits, vouchers) fires .completed while still
       UNPAID and settles later via .async_payment_succeeded. Granting on
       .completed alone hands out access to unpaid signups. */
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object
      if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
        /* TODO(accounts): grant access for session.metadata.plan here. */
        console.log(
          `[webhook] ${event.type} PAID — plan=${session.metadata?.plan ?? '?'} session=${session.id}`,
        )
      } else {
        console.log(`[webhook] ${event.type} pending — payment_status=${session.payment_status}`)
      }
      break
    }
    case 'checkout.session.async_payment_failed':
      console.log(`[webhook] async payment failed — session=${event.data.object.id}`)
      break

    /* ---- subscription lifecycle ------------------------------------------
       Renewals, dunning and cancellations all happen long after checkout and
       are invisible to anything that only reads the success page. An
       integration without these is not finished. */
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      /* TODO(accounts): sync entitlement to subscription.status. */
      console.log(`[webhook] ${event.type} — status=${event.data.object.status}`)
      break
    case 'invoice.paid':
      /* Renewal succeeded — extend access. */
      console.log(`[webhook] invoice.paid — invoice=${event.data.object.id}`)
      break
    case 'invoice.payment_failed':
      /* Dunning has started. Stripe retries on its own schedule; access should
         follow the subscription status, not this event alone. */
      console.log(`[webhook] invoice.payment_failed — invoice=${event.data.object.id}`)
      break

    default:
      console.log(`[webhook] unhandled event ${event.type}`)
  }

  /* 200 quickly, or Stripe retries. */
  return NextResponse.json({ received: true })
}
