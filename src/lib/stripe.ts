/* ============================================================================
   Server-only Stripe client.

   CLAUDE.md, "Secrets": STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must never
   appear in a client component, in a NEXT_PUBLIC_* var, or in the repo. This
   module is imported only by route handlers, which never reach the browser.

   It is built lazily so that a missing key is a clear 503 from the one request
   that needed it, rather than a crash at module load that takes the whole page
   down. A marketing page whose checkout is not configured yet should still
   render.

   STRIPE_SECRET_KEY should hold a RESTRICTED key (rk_...), not a secret key
   (sk_...). Stripe's own guidance is to prefer a RAK with least privilege
   everywhere it will work; this integration needs only:
     Checkout Sessions  write   (create; and read, for /api/checkout/session)
     Prices             read
     Subscriptions      read
     Customers          read    (customers.search / customers.list by email)
     Customers          write   (customers.create)
   Customers read+write were added when /api/signup started creating and
   linking the Stripe Customer before checkout. A key issued for the earlier,
   anonymous flow does NOT carry them and will fail that route with a
   permissions error — re-issue it rather than widening it to an sk_.
   A leaked rk_ scoped like that cannot issue refunds or read your payouts.
   The env var keeps its name because .env.example already fixes it.

   The apiVersion is pinned rather than floating. An unpinned client silently
   follows whatever version the account is set to, so a Dashboard change could
   alter response shapes underneath this code with no deploy. 22.5.0 pins the
   same version, so this is a no-op today and a guard later.
   ========================================================================= */

import 'server-only'
import Stripe from 'stripe'

let client: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !key.trim()) return null
  if (!client) client = new Stripe(key.trim(), { apiVersion: '2026-07-29.dahlia' })
  return client
}

/** Presence only — never the value. CLAUDE.md: "report presence as PRESENT, len=N". */
export function secretStatus(name: string): string {
  const v = process.env[name]
  return v && v.trim() ? `PRESENT, len=${v.trim().length}` : 'MISSING'
}
