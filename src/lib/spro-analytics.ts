/* ============================================================================
   The website-funnel tracker (Phase 3 of the Signal Pro CRM plan).

   A trimmed port of project_nadia's apps/web/src/lib/analytics/client.ts —
   same privacy posture (GPC/DNT honoured, opaque localStorage ids, no IP, no
   fingerprint) and the same sendBeacon-batch-flush idiom, but a much
   narrower event vocabulary. The newsletter's tracker measures an editorial
   site: scroll depth, click delegation, outbound links, per-page engagement
   time across many routes. Landing-Page is one route with one job — walk a
   visitor to a completed checkout — so this only tracks the steps in that
   funnel: pageview, pricing_viewed, tier_clicked, checkout_started.
   checkout_completed / checkout_abandoned are NOT tracked from here on
   purpose: those are written server-side by the webhook, from the
   Stripe-verified event, never from a client beacon that anyone could forge.

   Posts to this repo's own /api/funnel, which forwards server-side to
   project_nadia with the shared secret attached — the browser never holds
   that secret or calls project_nadia directly.
   ========================================================================= */

const VISITOR_KEY = 'signalpro.visitor'
const SESSION_KEY = 'signalpro.session'
const SESSION_SEEN = 'signalpro.session.seen'

const SESSION_IDLE_MS = 30 * 60_000
const FLUSH_INTERVAL_MS = 10_000
const FLUSH_AT_EVENTS = 20

const LIMITS = { keyLength: 64, pathLength: 300, targetLength: 120 } as const

export type FunnelEventType = 'pageview' | 'pricing_viewed' | 'tier_clicked' | 'checkout_started'

type QueuedEvent = {
  type: FunnelEventType
  path: string
  target?: string
  at: string
}

type Utm = { source?: string; medium?: string; campaign?: string }

let queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let sessionCtx: { key: string; entryPath: string; referrerHost?: string; utm?: Utm } | null = null

function hasOptedOut(): boolean {
  if (typeof window === 'undefined') return true
  const nav = window.navigator as Navigator & { globalPrivacyControl?: boolean }
  if (nav.globalPrivacyControl === true) return true
  if (nav.doNotTrack === '1' || (window as { doNotTrack?: string }).doNotTrack === '1') return true
  return false
}

function randomId(): string {
  const c = window.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function readOrCreate(key: string): string | null {
  try {
    const existing = window.localStorage.getItem(key)
    if (existing && existing.length <= LIMITS.keyLength) return existing
    const created = randomId()
    window.localStorage.setItem(key, created)
    return created
  } catch {
    return null
  }
}

function sessionId(): string | null {
  try {
    const now = Date.now()
    const seen = Number(window.localStorage.getItem(SESSION_SEEN) ?? 0)
    const existing = window.localStorage.getItem(SESSION_KEY)
    const fresh = !existing || !Number.isFinite(seen) || now - seen > SESSION_IDLE_MS
    const id = fresh ? randomId() : existing
    if (fresh) window.localStorage.setItem(SESSION_KEY, id)
    window.localStorage.setItem(SESSION_SEEN, String(now))
    return id
  } catch {
    return null
  }
}

function referrerHost(): string | undefined {
  const raw = document.referrer
  if (!raw) return undefined
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '')
    if (host === window.location.hostname.replace(/^www\./, '')) return undefined
    return host.slice(0, LIMITS.targetLength)
  } catch {
    return undefined
  }
}

/** Read once, from the URL that landed the visitor here — never re-read on a
    later flush, or a second-page click loses the campaign that brought them. */
export function firstTouchUtm(): Utm | undefined {
  const p = new URLSearchParams(window.location.search)
  const value: Utm = {}
  const source = p.get('utm_source')
  const medium = p.get('utm_medium')
  const campaign = p.get('utm_campaign')
  if (source) value.source = source.slice(0, LIMITS.targetLength)
  if (medium) value.medium = medium.slice(0, LIMITS.targetLength)
  if (campaign) value.campaign = campaign.slice(0, LIMITS.targetLength)
  return Object.keys(value).length ? value : undefined
}

function currentPath(): string {
  return window.location.pathname.slice(0, LIMITS.pathLength) || '/'
}

function context() {
  const key = sessionId()
  if (!key) return null
  if (sessionCtx && sessionCtx.key === key) return sessionCtx
  sessionCtx = {
    key,
    entryPath: currentPath(),
    referrerHost: referrerHost(),
    utm: firstTouchUtm(),
  }
  return sessionCtx
}

function device(): 'mobile' | 'tablet' | 'desktop' {
  const w = window.innerWidth
  if (w < 640) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export function track(type: FunnelEventType, target?: string): void {
  if (hasOptedOut()) return
  queue.push({
    type,
    path: currentPath(),
    ...(target ? { target: target.slice(0, LIMITS.targetLength) } : {}),
    at: new Date().toISOString(),
  })
  if (queue.length >= FLUSH_AT_EVENTS) flush()
}

export function flush(): void {
  if (!queue.length || hasOptedOut()) return

  const events = queue
  queue = []

  const visitor = readOrCreate(VISITOR_KEY)
  const ctx = context()
  if (!visitor || !ctx) return

  const payload = {
    visitor,
    session: ctx.key,
    path: ctx.entryPath,
    ...(ctx.referrerHost ? { referrerHost: ctx.referrerHost } : {}),
    ...(ctx.utm ? { utm: ctx.utm } : {}),
    device: device(),
    events,
  }

  const body = JSON.stringify(payload)
  const url = '/api/funnel'

  if (typeof navigator.sendBeacon === 'function') {
    const ok = navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }))
    if (ok) return
  }
  void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(
    () => undefined,
  )
}

/** Fires the initial pageview and starts the periodic/pagehide flush. Call
    once, from a client component mounted near the root. Idempotent-ish via
    the returned cleanup — call it on unmount so a dev-mode double-mount
    does not leave two intervals running. */
export function initFunnelTracking(): () => void {
  if (typeof window === 'undefined' || hasOptedOut()) return () => undefined

  track('pageview')

  const onHide = () => flush()
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)

  return () => {
    window.removeEventListener('pagehide', onHide)
    if (flushTimer) clearInterval(flushTimer)
    flushTimer = null
  }
}
