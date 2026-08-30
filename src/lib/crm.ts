/* ============================================================================
   The one client for project_nadia's Signal Pro CRM.

   CLAUDE.md, "Cross-repo": this repo talks to project_nadia only over HTTP
   with a shared secret (SIGNAL_PRO_LANDING_SECRET), never a shared database,
   and always as normalised JSON — project_nadia does not depend on the Stripe
   SDK and must not need it to receive an event this repo already verified.

   Two callers, one route (POST /api/spro/fulfill), different kinds:
     src/app/api/signup/route.ts   kind: 'signup'          — CREATE USER IN DATABASE
     src/app/api/webhook/route.ts  kind: 'checkout_completed' | 'checkout_abandoned'
                                         | 'subscription_updated'
                                         | 'invoice_paid' | 'invoice_failed'

   The secret is read here and nowhere else, so there is exactly one place to
   audit that it never reaches a client bundle. Never throws — every caller has
   its own contract for what a CRM failure means (Stripe retry vs. 502 to the
   browser) and needs to decide that itself.
   ========================================================================= */

export type CrmResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: string }

export async function postToCrm(payload: Record<string, unknown>): Promise<CrmResult> {
  const base = process.env.SIGNAL_PRO_CRM_URL
  const secret = process.env.SIGNAL_PRO_LANDING_SECRET
  if (!base || !base.trim() || !secret || !secret.trim()) {
    return { ok: false, reason: 'SIGNAL_PRO_CRM_URL / SIGNAL_PRO_LANDING_SECRET not configured' }
  }

  let res: Response
  try {
    res = await fetch(`${base.trim().replace(/\/$/, '')}/api/spro/fulfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret.trim()}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return { ok: false, reason: `unreachable: ${String(err)}` }
  }

  if (!res.ok) {
    /* Read the body for the log line, but never surface it to a browser — it
       is another service's error text. */
    return { ok: false, reason: `rejected: ${res.status} ${await res.text().catch(() => '')}` }
  }

  try {
    const data: unknown = await res.json()
    return { ok: true, data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {} }
  } catch {
    /* A 200 with an unparseable body still means the write landed. */
    return { ok: true, data: {} }
  }
}
