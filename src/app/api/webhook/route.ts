/* ============================================================================
   POST /api/webhook — Stripe webhook, signature-verified.

   CLAUDE.md: "The webhook route needs the RAW request body for signature
   verification." req.text() gives exactly the bytes Stripe signed; parsing to
   JSON first and re-serialising would change whitespace and key order and every
   signature would fail. Do not "tidy" this into req.json().

   Fulfilment forwards to project_nadia's Signal Pro CRM (a separate repo,
   nadia-sv.com) via a Bearer-authenticated route, /api/spro/fulfill. This repo
   sends normalised JSON, never a raw Stripe event object — project_nadia does
   not depend on the Stripe SDK and should not need to just to receive a
   webhook this repo already verified.

   Retry contract: the PAID branches (checkout completed, invoice paid/failed)
   return a non-200 status if forwarding to the CRM fails, so Stripe's own
   retry schedule covers a project_nadia outage rather than the event being
   silently lost — this represents real money changing hands. Every other
   branch keeps the original "200 quickly, or Stripe retries" contract,
   because there is nothing downstream for them to lose if this repo just
   logs and moves on.
   ========================================================================= */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { postToCrm } from '@/lib/crm'
import type { PlanKey, RetiredPlanKey } from '@/lib/pricing'

export const runtime = 'nodejs'
/* Never cache a webhook. */
export const dynamic = 'force-dynamic'

/* The one place a Landing-Page plan key becomes the CRM's tier enum. Kept as a
   single map rather than repeated per-branch, per CLAUDE.md's own instinct
   for this kind of cross-repo translation — one wrong place to update beats
   three.

   IT MAPS THE RETIRED KEYS TOO, AND MUST KEEP DOING SO. Only `pro` can be
   bought since the single-plan change, but a subscription sold under the old
   ladder carries metadata.plan = 'signal' | 'desk' for its whole life and
   Stripe replays that metadata on every renewal invoice. There is a live
   `plan: 'signal'` subscription on the $27 price right now, so this is a
   real customer's monthly renewal, not a hypothetical.

   crmTierFor() therefore reads THIS MAP, not PLANS. It used to gate on
   `plan in PLANS`, which silently coupled "can this be sold" to "can this be
   fulfilled" — shrinking the catalogue would have made that renewal fall
   through to the "missing tier" branch below, return 500 to Stripe, exhaust
   the retry schedule and drop the customer out of fulfilment with nothing
   but a log line. The two questions are separate and are now asked
   separately. */
const CRM_TIER: Record<PlanKey | RetiredPlanKey, 'signal' | 'signal_pro' | 'signal_desk'> = {
  pro: 'signal_pro',
  signal: 'signal',
  desk: 'signal_desk',
}

function crmTierFor(plan: unknown): 'signal' | 'signal_pro' | 'signal_desk' | null {
  if (typeof plan !== 'string') return null
  return Object.prototype.hasOwnProperty.call(CRM_TIER, plan)
    ? CRM_TIER[plan as PlanKey | RetiredPlanKey]
    : null
}

/**
 * Forward one normalised fulfilment event to project_nadia's Signal Pro CRM.
 * Returns true on success. Never throws — the caller decides what a failure
 * means for its own Stripe-retry contract. The transport, the URL and the
 * shared secret live in src/lib/crm.ts, shared with /api/signup.
 */
async function forwardToCrm(payload: Record<string, unknown>): Promise<boolean> {
  const result = await postToCrm(payload)
  if (!result.ok) {
    console.error('[webhook] CRM fulfilment failed:', payload.kind, result.reason)
    return false
  }
  return true
}

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
        const tier = crmTierFor(session.metadata?.plan)
        const email = session.customer_details?.email
        if (!tier || !email) {
          console.error(
            `[webhook] ${event.type} paid but missing tier/email — plan=${session.metadata?.plan ?? '?'} session=${session.id}`,
          )
          return NextResponse.json({ error: 'Missing tier or email' }, { status: 500 })
        }

        const ok = await forwardToCrm({
          kind: 'checkout_completed',
          email,
          /* Task 1's CRM fills a null customer name from this. Checkout
             collects it (customer_update.name = 'auto' on the signup path),
             so it is the freshest name the customer has given us. */
          name: session.customer_details?.name ?? undefined,
          tier,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          utm: {
            source: session.metadata?.utm_source,
            medium: session.metadata?.utm_medium,
            campaign: session.metadata?.utm_campaign,
          },
          referrer: session.metadata?.referrer,
        })
        if (!ok) {
          /* Non-200 so Stripe retries — a paid signup must not be silently
             dropped because the CRM was unreachable for a moment. */
          return NextResponse.json({ error: 'CRM fulfilment failed' }, { status: 502 })
        }
        console.log(`[webhook] ${event.type} PAID — tier=${tier} session=${session.id}`)
      } else {
        console.log(`[webhook] ${event.type} pending — payment_status=${session.payment_status}`)
      }
      break
    }
    case 'checkout.session.async_payment_failed':
      console.log(`[webhook] async payment failed — session=${event.data.object.id}`)
      break
    case 'checkout.session.expired': {
      /* Stripe's own abandonment signal (24h default expiry) — cleaner than
         inferring it from a timeout this repo would have to track itself.
         Not fulfilment-critical: nothing was ever granted, so this stays on
         the original "log and 200" contract rather than forcing a retry. */
      const session = event.data.object
      await forwardToCrm({ kind: 'checkout_abandoned', stripeSessionId: session.id })
      console.log(`[webhook] checkout.session.expired — session=${session.id}`)
      break
    }

    /* ---- subscription lifecycle ------------------------------------------
       Renewals, dunning and cancellations all happen long after checkout and
       are invisible to anything that only reads the success page. An
       integration without these is not finished.

       A Stripe Subscription object carries no email — only a customer id —
       so these forward as 'subscription_updated', which the CRM applies as
       an update against the row checkout_completed already created, keyed on
       stripe_subscription_id alone. */
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const tier = crmTierFor(subscription.metadata?.plan)
      await forwardToCrm({
        kind: 'subscription_updated',
        stripeSubscriptionId: subscription.id,
        tier,
        status: subscription.status,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : undefined,
      })
      /* Not gated on the forward's success: customer.subscription.created
         fires alongside checkout.session.completed for the same signup, and
         that event already carries the retry contract for the thing that
         actually matters — granting access. A missed sync here self-heals on
         the next subscription event. */
      console.log(`[webhook] ${event.type} — status=${subscription.status}`)
      break
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object
      /* API version 2026-07-29.dahlia moved this under parent.subscription_details —
         invoice.subscription no longer exists directly on the object. */
      const subRef = invoice.parent?.subscription_details?.subscription
      const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id
      let ok = true
      if (subscriptionId) {
        ok = await forwardToCrm({
          kind: event.type === 'invoice.paid' ? 'invoice_paid' : 'invoice_failed',
          stripeSubscriptionId: subscriptionId,
          stripeInvoiceId: invoice.id,
          amountCents: invoice.amount_paid ?? invoice.amount_due,
          currency: invoice.currency,
        })
      }
      if (!ok) {
        return NextResponse.json({ error: 'CRM fulfilment failed' }, { status: 502 })
      }
      console.log(`[webhook] ${event.type} — invoice=${invoice.id}`)
      break
    }

    default:
      console.log(`[webhook] unhandled event ${event.type}`)
  }

  /* 200 quickly, or Stripe retries. */
  return NextResponse.json({ received: true })
}
