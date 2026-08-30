/* ============================================================================
   Block 09 — pricing.  legacy/index.html 4501-4828.

   A thin server wrapper over the interactive half. It used to resolve which
   tiers were buyable (a server fact — it depends on STRIPE_PRICE_* env vars,
   which must never reach the browser as values) and pass three booleans down.
   That moved: the CTAs are now plain links to /signup, and /signup is where
   an unconfigured tier is reported as "not available yet".

   The wrapper stays because src/app/page.tsx imports it and page.tsx is
   off-limits — see docs/OWNERSHIP.md.
   ========================================================================= */

import PricingClient from './PricingClient'

export default function Pricing() {
  return <PricingClient />
}
