/* ============================================================================
   Block 09 — pricing.  legacy/index.html 4501-4828.

   This file is a SERVER component on purpose. Which tiers can be bought is a
   server fact (it depends on STRIPE_PRICE_* env vars, which must never reach
   the browser as values), so it is resolved here and passed down as three
   booleans. Only the interactive half is a client component.

   Doing it this way keeps src/app/page.tsx untouched — it still just imports
   Pricing — which matters because docs/OWNERSHIP.md puts page.tsx off-limits.
   ========================================================================= */

import { livePlans } from '@/lib/pricing'
import PricingClient from './PricingClient'

export default function Pricing() {
  return <PricingClient live={livePlans()} />
}
