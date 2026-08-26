/* ============================================================================
   POST /api/funnel — same-origin proxy to project_nadia's Signal Pro funnel
   collector.

   The browser never talks to project_nadia's /api/spro/collect directly.
   This route exists so the shared secret (SIGNAL_PRO_LANDING_SECRET) never
   reaches a client bundle — the browser posts here, unauthenticated (this
   route needs no auth of its own; it is same-origin and the thing it forwards
   to is what actually decides whether to accept the write), and this route
   attaches the Bearer token server-side before forwarding.

   Best-effort only. A funnel event is directional marketing data, not a
   record of money changing hands (that is the webhook's job, with its own
   retry contract) — so this always returns 204 quickly and never surfaces a
   forwarding failure to the browser. A dropped pricing_viewed event is a
   slightly less accurate report next month, not a lost customer.
   ========================================================================= */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 64 * 1024
const ACCEPTED = new Response(null, { status: 204 })

export async function POST(req: Request) {
  const raw = await req.text()
  if (!raw || Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return ACCEPTED

  const base = process.env.SIGNAL_PRO_CRM_URL
  const secret = process.env.SIGNAL_PRO_LANDING_SECRET
  if (!base || !base.trim() || !secret || !secret.trim()) return ACCEPTED

  try {
    await fetch(`${base.trim().replace(/\/$/, '')}/api/spro/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret.trim()}`,
      },
      body: raw,
      /* Fire-and-forget from the caller's perspective, but the fetch itself
         still needs to complete before this function returns — Vercel does
         not guarantee anything queued after the response ships. */
    })
  } catch (err) {
    console.error('[funnel] forward to CRM failed:', err)
  }

  return ACCEPTED
}
