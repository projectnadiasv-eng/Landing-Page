/* ============================================================================
   Server-only Stripe client.

   CLAUDE.md, "Secrets": STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must never
   appear in a client component, in a NEXT_PUBLIC_* var, or in the repo. This
   module is imported only by route handlers, which never reach the browser.

   It is built lazily so that a missing key is a clear 503 from the one request
   that needed it, rather than a crash at module load that takes the whole page
   down. A marketing page whose checkout is not configured yet should still
   render.
   ========================================================================= */

import Stripe from 'stripe'

let client: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !key.trim()) return null
  if (!client) client = new Stripe(key.trim())
  return client
}

/** Presence only — never the value. CLAUDE.md: "report presence as PRESENT, len=N". */
export function secretStatus(name: string): string {
  const v = process.env[name]
  return v && v.trim() ? `PRESENT, len=${v.trim().length}` : 'MISSING'
}
