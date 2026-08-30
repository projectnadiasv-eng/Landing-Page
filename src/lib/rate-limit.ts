/* ============================================================================
   A best-effort, in-memory, per-IP request limiter.

   WHAT THIS IS NOT: a real rate limiter. It is a Map in the memory of ONE
   serverless instance. Vercel runs many, they come and go, and a burst spread
   across them multiplies the effective limit by the number of instances. It
   also resets on every cold start.

   It is here because POST /api/signup has real side effects — every accepted
   request creates a Stripe Customer and a permanent CRM lead row — and a
   route like that should not be completely open while the real control is
   being configured. It raises the cost of casual scripted abuse. It does not
   stop a determined attacker.

   THE REAL CONTROL IS AN OPERATOR ITEM: Vercel Firewall rate-limit rules on
   /api/signup, and Vercel BotID on the signup form. Both are configured in
   the Vercel dashboard, not in this repo. See .env.example and CLAUDE.md.

   x-forwarded-for is attacker-controlled in general; on Vercel the platform
   sets it and the FIRST hop is the real client. Locally it can be spoofed
   freely, which is exactly how the limiter is tested. Treat the key as a hint,
   never as identity.
   ========================================================================= */

import 'server-only'

type Bucket = { count: number; resetAt: number }

/* Bounded so a spray of unique spoofed IPs cannot grow this without limit.
   At the cap the whole map is swept of expired entries, and if that frees
   nothing the map is dropped — failing open is correct for a limiter that is
   explicitly best-effort. */
const MAX_KEYS = 10_000

const buckets = new Map<string, Bucket>()

export type RateLimitVerdict =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number }

/** First hop of x-forwarded-for, else x-real-ip, else a shared bucket. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  if (first) return first
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  /* No proxy headers at all — local dev, or a direct hit. One shared bucket
     is better than no limit; it is also why the limit is not set at 1. */
  return 'unknown'
}

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  if (buckets.size >= MAX_KEYS) buckets.clear()
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitVerdict {
  const now = Date.now()
  if (buckets.size >= MAX_KEYS) sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    /* The window does NOT extend on a rejected request — a client that keeps
       hammering still gets in once the original window closes, rather than
       being locked out forever by its own retries. */
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { ok: true }
}
