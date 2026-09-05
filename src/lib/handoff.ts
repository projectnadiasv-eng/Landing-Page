/* ============================================================================
   The client for project_nadia's automatic sign-in route.

   One caller: src/app/api/handoff/route.ts, the post-checkout handoff. It is a
   separate module from src/lib/crm.ts for the same reason that file gives for
   itself — the secret is read HERE AND NOWHERE ELSE, so there is exactly one
   place to audit that it never reaches a client bundle.

   SIGNAL_PRO_HANDOFF_SECRET is deliberately not SIGNAL_PRO_LANDING_SECRET.
   That one authorises writing CRM rows; this one authorises minting a working
   session for a customer's account. Sharing a value would mean a leak of the
   fulfilment credential — which is presented on every signup and every webhook
   delivery — could be turned into an account takeover. Two values, two blast
   radii, and either can be rotated without touching the other.

   THE URL THIS RETURNS IS A BEARER CREDENTIAL. It signs its holder in as the
   customer. It is never logged, never persisted, and the route that receives it
   passes it straight to the browser under `no-store`.

   Never throws. The caller has its own contract for what a failure means (show
   the confirmation overlay instead), and a person is waiting on the response.
   ========================================================================= */

import 'server-only'

export type HandoffResult =
  | { ok: true; url: string }
  /** `reason` is project_nadia's machine-readable refusal, for our logs only. */
  | { ok: false; reason: string }

/**
 * How long project_nadia gets before the handoff is abandoned.
 *
 * The bound matters more than the number, and this one has a person watching a
 * spinner on the other end of it. The CRM route's own worst case is 15 s
 * (`maxDuration` there), but it only approaches that during an outage — the
 * ordinary path is two indexed reads, one insert and one GoTrue call. 10 s is
 * comfortably above that and below the point where a customer decides the page
 * is broken and reloads it, which would spend their one-time session id.
 */
const HANDOFF_TIMEOUT_MS = 10_000

export async function requestLoginUrl(input: {
  email: string
  stripeSessionId: string
}): Promise<HandoffResult> {
  const base = process.env.SIGNAL_PRO_CRM_URL
  const secret = process.env.SIGNAL_PRO_HANDOFF_SECRET
  if (!base || !base.trim() || !secret || !secret.trim()) {
    return { ok: false, reason: 'SIGNAL_PRO_CRM_URL / SIGNAL_PRO_HANDOFF_SECRET not configured' }
  }

  let res: Response
  try {
    res = await fetch(`${base.trim().replace(/\/$/, '')}/api/spro/handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret.trim()}`,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(HANDOFF_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (err) {
    /* Includes the timeout above. The customer has still paid and their
       entitlement has still been written — only the shortcut is missing. */
    return { ok: false, reason: `unreachable: ${String(err)}` }
  }

  if (!res.ok) {
    /* project_nadia answers a refusal as { reason }. Read it for the log line —
       'already_used' and 'no_subscription' mean very different things to whoever
       is debugging — but never surface it to the browser: it is another
       service's vocabulary and the customer can do nothing with it. */
    const body: unknown = await res.json().catch(() => null)
    const reason =
      body && typeof body === 'object' && typeof (body as { reason?: unknown }).reason === 'string'
        ? (body as { reason: string }).reason
        : 'unknown'
    return { ok: false, reason: `refused: ${res.status} ${reason}` }
  }

  const body: unknown = await res.json().catch(() => null)
  const url =
    body && typeof body === 'object' && typeof (body as { url?: unknown }).url === 'string'
      ? (body as { url: string }).url
      : ''

  /* A 200 with no url is a contract violation rather than a refusal, but it
     costs the customer the same thing, so it is reported the same way. */
  if (!url) return { ok: false, reason: 'no url in a 200 response' }

  return { ok: true, url }
}
