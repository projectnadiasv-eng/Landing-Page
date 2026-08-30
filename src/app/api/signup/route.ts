/* ============================================================================
   POST /api/signup -> { url, sessionId }

   The account funnel, in the client's own order:

     SELECT PLAN  ........ /signup?plan=…, the form
     CREATE SIGNAL PRO ACCOUNT
     CREATE/LINK STRIPE CUSTOMER ... step b below
     CREATE USER IN DATABASE ...... step c below (project_nadia's CRM)
     STRIPE CHECKOUT .............. step d below

   Ordering note: the Stripe Customer is created BEFORE the CRM row even though
   the client's diagram lists the database first, because the CRM row carries
   stripeCustomerId — the id has to exist to be stored. The CRM is still the
   gate: a failure there is a 502 and no Checkout Session is created, so we
   never take money for an account that was never written down.

   Everything fails loudly. There is no "carry on and hope the webhook fixes
   it" path: the webhook only ever fires for a session this route decided to
   create.

   Identity join key is the LOWER-CASED, TRIMMED email, in all three repos.
   ========================================================================= */

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { postToCrm } from '@/lib/crm'
import { PLANS, isPlanKey, priceIdFor, type PlanKey } from '@/lib/pricing'
import { attributionFrom, createCheckoutSession, siteUrl } from '@/lib/checkout-session'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

const NAME_MAX = 200
/* RFC 5321's limit on a forward path. Anything longer is not a real address. */
const EMAIL_MAX = 320

/* Deliberately loose. A stricter regex rejects valid addresses (plus-tags,
   quoted locals, new TLDs) far more often than it catches a typo, and the
   only thing that actually proves an address exists is mail arriving at it —
   Stripe's receipt. This rejects the shapes that are certainly wrong. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Stripe Search Query Language: backslash escapes inside a quoted literal. */
function quoteForSearch(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * Look for an existing Customer under either casing of the address.
 *
 * customers.list's `email` filter is an exact, CASE-SENSITIVE match, and the
 * still-live anonymous /api/checkout lets Stripe create Customers with whatever
 * casing the buyer typed at the hosted page. Searching only the lower-cased
 * form would miss "Alex@Example.com" and mint a duplicate.
 *
 * Both lookups run per casing, lower-cased first, so the normalised address —
 * the identity join key in all three repos — always wins when both exist.
 * search() is tried first because it is the documented lookup, but it is
 * EVENTUALLY consistent ("do not use in read-after-write flows"), so list() —
 * exact-match and immediately consistent — backs it up before we conclude
 * there is nobody there.
 */
async function findExistingCustomer(
  stripe: Stripe,
  candidates: readonly string[],
): Promise<Stripe.Customer | null> {
  for (const candidate of candidates) {
    const found = await stripe.customers.search({
      query: `email:'${quoteForSearch(candidate)}'`,
      limit: 1,
    })
    if (found.data[0]) return found.data[0]

    const listed = await stripe.customers.list({ email: candidate, limit: 1 })
    if (listed.data[0]) return listed.data[0]
  }
  return null
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const b = body as Record<string, unknown> | null

  /* ---- a. validate --------------------------------------------------- */
  const name = typeof b?.name === 'string' ? b.name.trim() : ''
  if (!name || name.length > NAME_MAX) {
    /* Rejected, not truncated: a name is the customer's, not ours to edit,
       and the form already caps the field at the same length. */
    return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 })
  }

  /* `email` — lower-cased and trimmed — is the identity join key in all three
     repos and the only form written anywhere. `typedEmail` keeps the casing the
     customer actually typed, used ONLY to find a Stripe Customer that an
     earlier, case-preserving flow may have created under it. */
  const typedEmail = typeof b?.email === 'string' ? b.email.trim() : ''
  const email = typedEmail.toLowerCase()
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const plan = b?.plan
  if (!isPlanKey(plan)) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
  }

  const attribution = attributionFrom(b)

  const stripe = getStripe()
  if (!stripe) {
    /* Same contract as /api/checkout: 503, and BEFORE anything is written
       anywhere. Nothing is broken, checkout is simply not switched on in this
       environment yet. */
    return NextResponse.json({ error: 'Checkout is not configured yet.' }, { status: 503 })
  }

  /* Both "can this be sold?" questions are answered here, before ANY side
     effect. createCheckoutSession asks about the price again — it has to, it
     also serves the anonymous /api/checkout — but by then this route has
     already created a Stripe Customer and a permanent CRM account row. With
     STRIPE_PRICE_DESK unset (the documented default) that turned every Desk
     signup into junk in two systems plus an error on screen. Same message
     /api/checkout has always used. */
  if (!priceIdFor(plan)) {
    return NextResponse.json(
      { error: `The ${PLANS[plan].name} tier is not available yet.` },
      { status: 503 },
    )
  }

  /* ---- b. CREATE/LINK STRIPE CUSTOMER -------------------------------- */
  let customer: Stripe.Customer
  /* Whether WE made it this request decides how the Checkout Session is bound.
     See the security note in src/lib/checkout-session.ts. */
  let customerIsOurs: boolean
  try {
    const candidates = email === typedEmail ? [email] : [email, typedEmail]
    const existing = await findExistingCustomer(stripe, candidates)
    if (existing) {
      customer = existing
      customerIsOurs = false
    } else {
      customer = await stripe.customers.create({ email, name, metadata: { plan } })
      customerIsOurs = true
    }
  } catch (err) {
    console.error('[signup] Stripe customer lookup/create failed:', err)
    return NextResponse.json({ error: 'Could not create your account.' }, { status: 502 })
  }

  /* ---- c. CREATE USER IN DATABASE ------------------------------------ */
  const crm = await postToCrm({
    kind: 'signup',
    email,
    name,
    stripeCustomerId: customer.id,
    utm: {
      source: attribution.utmSource,
      medium: attribution.utmMedium,
      campaign: attribution.utmCampaign,
    },
    referrer: attribution.referrer,
  })
  if (!crm.ok) {
    /* 502, and no Checkout Session. Do not sell a subscription to an account
       row that does not exist — the webhook would later have nothing to
       attach the payment to. */
    console.error('[signup] CRM signup failed:', crm.reason)
    return NextResponse.json(
      { error: 'Could not create your account. Please try again in a moment.' },
      { status: 502 },
    )
  }
  const crmCustomerId = typeof crm.data.customerId === 'string' ? crm.data.customerId : undefined
  if (!crmCustomerId) {
    console.warn('[signup] CRM returned no customerId; session will carry no client_reference_id')
  }

  /* ---- d. STRIPE CHECKOUT -------------------------------------------- */
  const result = await createCheckoutSession(stripe, {
    plan,
    baseUrl: siteUrl(req),
    attribution,
    /* Bind ONLY a customer we just created; otherwise lock the email and let
       Stripe link at completion. src/lib/checkout-session.ts explains why. */
    ...(customerIsOurs ? { customerId: customer.id } : { customerEmail: email }),
    crmCustomerId,
    name,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  /* ---- e. the browser navigates the current tab to url; sessionId is for
     its own checkout_started funnel event. ------------------------------- */
  return NextResponse.json({ url: result.url, sessionId: result.sessionId })
}
