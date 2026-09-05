/* ============================================================================
   POST /api/handoff -> { url }

   Automatic sign-in. The last step of the funnel and the reason a paying
   customer no longer has to open their inbox: CheckoutSuccess.tsx calls this
   the moment Stripe confirms the payment, and navigates the browser to the url
   it returns, which lands inside the app already signed in.

   THE URL IS A BEARER CREDENTIAL. It signs its holder in as the customer. It is
   never logged here, and the response carries `no-store` so nothing on the way
   back to the browser keeps a copy.

   ## What authorises a login

   One thing, and it is checked here rather than trusted: Stripe says this
   checkout session is `complete` and paid. That is the same gate
   /api/checkout/session applies before it will even name the customer's email,
   and it is applied server-side against Stripe's API — not against anything the
   browser said.

   A session id is unguessable, but it is NOT a credential: it rides in the
   success URL, so it sits in browser history and in any referrer header. So the
   proof is good exactly once, and project_nadia enforces that — it records the
   session id and refuses a second handoff for it, forever. Someone who later
   recovers a session id from a shared machine gets `already_used`, not a
   session. That check lives there rather than here because it has to be atomic
   against a database, and this route has no database.

   ## Why fulfilment is pushed from here too

   Because the alternative is a race this route would lose about as often as it
   won. Entitlement is written when Stripe's webhook reaches /api/webhook, and
   the browser's return from Checkout is not ordered against that delivery — so
   a customer could arrive in the app a second before their subscription row
   existed and be shown the no-subscription panel they just paid to never see.

   Pushing the same normalised `checkout_completed` event from here removes the
   ordering question entirely: by the time the login url is minted, the CRM has
   already been told. It is safe to send twice because the CRM's apply is an
   idempotent upsert and its welcome email is claimed exactly once — this is the
   ordinary case there, not an exotic one, since Stripe redelivers events by
   design.

   ## Failure is never fatal

   Every failure path answers non-200 and the overlay stays put, telling the
   customer to use the email. Nothing here can cost them access: their money is
   Stripe's business, their entitlement is the webhook's, and this route is a
   shortcut past an inbox.
   ========================================================================= */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { postToCrm } from '@/lib/crm'
import { crmTierFor } from '@/lib/pricing'
import { requestLoginUrl } from '@/lib/handoff'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
/* The answer changes the moment the payment settles, and the body is a
   credential. Never cached, at any layer. */
export const dynamic = 'force-dynamic'

/* Best-effort and per-instance, exactly like /api/signup's — Vercel Firewall is
   the real control. Ten is generous for the one legitimate pattern (a customer
   whose first attempt raced the payment settling, retrying a few times) and far
   below anything worth calling an attack. Note that a session id can only ever
   be exchanged ONCE regardless, so this limiter is protecting Stripe's API quota
   and our own function budget, not the login itself. */
const RATE_LIMIT = { limit: 10, windowMs: 10 * 60_000 }

const SESSION_ID_MAX = 200

/* The overlay reads `retry` to decide whether to keep polling or to give up and
   show the sign-in copy. Two different 404s, and the customer sees a different
   page for each:
     retry: true   — Stripe has not called it paid YET. Delayed payment methods
                     settle asynchronously; the money may still be coming.
     retry: false  — a decided refusal. No amount of asking again changes it. */
function notReady() {
  return NextResponse.json({ error: 'No confirmed session.', retry: true }, { status: 404 })
}

export async function POST(req: Request) {
  const ip = clientIp(req)
  const gate = rateLimit(`handoff:${ip}`, RATE_LIMIT)
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'Too many attempts.', retry: false },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', retry: false }, { status: 400 })
  }
  const b = body as Record<string, unknown> | null

  const sessionId = typeof b?.sessionId === 'string' ? b.sessionId.trim() : ''
  if (!sessionId || !sessionId.startsWith('cs_') || sessionId.length > SESSION_ID_MAX) {
    return NextResponse.json({ error: 'Missing session id.', retry: false }, { status: 400 })
  }

  const stripe = getStripe()
  if (!stripe) {
    /* Permanent for the life of this page load — retrying changes nothing. */
    return NextResponse.json(
      { error: 'Checkout is not configured yet.', retry: false },
      { status: 503 },
    )
  }

  /* ---- a. does Stripe say this is paid? ------------------------------- */
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (err) {
    /* A bad id is a Stripe 404, which the SDK throws. Logged and answered as
       "not ready" — the browser gets one shape for every id it cannot use, and
       the poll gives up on its own budget rather than on our say-so. */
    console.error('[handoff] session retrieve failed:', err)
    return notReady()
  }

  /* status AND payment_status, the same pair /api/checkout/session checks and
     for the same reason: a session configured for a trial, or with payment
     collection 'if_required', can read 'no_payment_required' while it is still
     OPEN and the customer has not finished. */
  const finished = session.status === 'complete'
  const settled =
    session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
  if (!finished || !settled) return notReady()

  const email = session.customer_details?.email
  if (!email) return notReady()

  /* ---- b. write entitlement before anyone is redirected --------------- */
  const tier = crmTierFor(session.metadata?.plan)
  if (!tier) {
    /* The webhook treats this as a 500 so Stripe retries. Here there is nobody
       to retry to: the plan metadata on a completed session will never change.
       Refuse the shortcut and let the webhook's own branch do the shouting. */
    console.error(
      `[handoff] paid session has no recognisable plan — plan=${session.metadata?.plan ?? '?'} session=${session.id}`,
    )
    return NextResponse.json({ error: 'Could not sign you in.', retry: false }, { status: 502 })
  }

  const fulfilment = await postToCrm({
    kind: 'checkout_completed',
    email,
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
  if (!fulfilment.ok) {
    /* Not fatal to the customer: Stripe's webhook carries the same event under
       a retry schedule, so their entitlement still lands. What is lost is the
       ordering guarantee this push exists to provide, so do NOT go on to mint a
       login — signing them into an app that is about to turn them away is worse
       than the overlay. */
    console.error('[handoff] fulfilment push failed:', fulfilment.reason)
    return NextResponse.json({ error: 'Could not sign you in.', retry: false }, { status: 502 })
  }

  /* ---- c. mint the login ---------------------------------------------- */
  const handoff = await requestLoginUrl({
    /* Lower-cased and trimmed — the identity join key in all three repos, and
       the only form the CRM ever keyed a row on. Stripe's customer_details
       carries whatever casing the buyer typed on the hosted page. */
    email: email.trim().toLowerCase(),
    stripeSessionId: sessionId,
  })
  if (!handoff.ok) {
    /* Every reason is logged with its machine-readable code and none of them
       reaches the browser. The customer sees the overlay's sign-in copy. */
    console.error(`[handoff] no login url — session=${session.id} ${handoff.reason}`)
    return NextResponse.json({ error: 'Could not sign you in.', retry: false }, { status: 502 })
  }

  /* The url is NOT logged, here or anywhere. */
  return NextResponse.json({ url: handoff.url }, { headers: { 'cache-control': 'no-store' } })
}
