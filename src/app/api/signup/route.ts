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
import { isPlanKey, type PlanKey } from '@/lib/pricing'
import { attributionFrom, clamped, createCheckoutSession, siteUrl } from '@/lib/checkout-session'
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
 * Find the Customer for this email, or make one. CREATE/LINK STRIPE CUSTOMER.
 *
 * search() is the documented way to do this, but it is EVENTUALLY consistent
 * ("do not use in read-after-write flows") — a customer created seconds ago is
 * not indexed yet, so someone who abandons checkout and immediately retries
 * would get a second Customer and a split billing history. list({ email }) is
 * an exact-match, immediately-consistent lookup, so it runs as the fallback
 * before we conclude there is nobody there.
 */
async function findOrCreateCustomer(
  stripe: Stripe,
  email: string,
  name: string,
  plan: PlanKey,
): Promise<Stripe.Customer> {
  const found = await stripe.customers.search({
    query: `email:'${quoteForSearch(email)}'`,
    limit: 1,
  })
  if (found.data[0]) return found.data[0]

  const listed = await stripe.customers.list({ email, limit: 1 })
  if (listed.data[0]) return listed.data[0]

  return stripe.customers.create({ email, name, metadata: { plan } })
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
  const name = clamped(b?.name, NAME_MAX)
  if (!name) {
    return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 })
  }

  const rawEmail = typeof b?.email === 'string' ? b.email.trim().toLowerCase() : ''
  if (!rawEmail || rawEmail.length > EMAIL_MAX || !EMAIL_RE.test(rawEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  const email = rawEmail

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

  /* ---- b. CREATE/LINK STRIPE CUSTOMER -------------------------------- */
  let customer: Stripe.Customer
  try {
    customer = await findOrCreateCustomer(stripe, email, name, plan)
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
    customerId: customer.id,
    crmCustomerId,
    name,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  /* ---- e. -------------------------------------------------------------- */
  return NextResponse.json({ url: result.url, sessionId: result.sessionId })
}
