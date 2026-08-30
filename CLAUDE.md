# Signal Pro — landing page

## What this repo is

Today: **one file.** `index.html` is 5,091 lines / 454 KB and contains the entire
marketing one-pager — markup, 11 `<style>` tags, 10 `<script>` tags, and 10 unique
images inlined as base64 data URIs. It was reassembled by hand from ten HighLevel
funnel "Custom HTML/JavaScript" blocks. There is no `package.json`, no framework and
no dependencies — `npm install` exits `ENOENT`. Every script is inline vanilla JS.

Target: a **Next.js 16 App Router app deployed on Vercel**, rendering a page that is
visually and behaviourally indistinguishable from today's, plus Stripe checkout.

## The one rule

**Fidelity outranks everything.** The migrated page must match the current page in
content, layout, styling, scroll/animation behaviour and every deeplink. A change
that improves the code but shifts a pixel is a regression. When code quality and
visual parity conflict, parity wins — raise the conflict rather than resolving it
silently.

The frozen `index.html` is the parity baseline. Do not edit it, and do not delete it.

---

## Current structure — the ten blocks

Each block is delimited in `index.html` by `<!-- ===== blockNN.html ===== -->` and is
self-contained: its own `<style>`, markup, and one IIFE `<script>`. Line ranges verified.

| # | Namespace | Root id | Style | Markup | Script | What it is |
|---|---|---|---|---|---|---|
| 01 | `sploader` | `#sploader` | 36–139 | 17–34 | 141–173 | Cream splash preloader; self-removes |
| 02 | `sehx2` | `#sehx2-root` | 180–434 | 435–498 | 499–691 | Scroll-expand hero video card + sticky nav |
| 03 | `mktick` | `#mktick-root` | 699–800 | 801–828 | 829–1000 | Dual-row market ticker marquee |
| 04 | `vslsec` | `#spvsl-root` | 1007–1148 | 1149–1168 | 1169–1299 | Short-film player, lazy-loaded |
| 05 | `sp3q` | `#sp3q-root` | 1306–1579 | 1580–1627 | 1628–1682 | "Three questions" editorial |
| 06 | **none** | **none** | 1687–2185 | 2186–2521 | 2522–2771 | Phone-mockup carousel + AI chat sim |
| 07 | `si` | `#si-root` | 2776–3137 | 3138–3207 | 3208–3979 | Social intelligence, X + Reddit feeds |
| 08 | `spct` | `#splive-root` | 3986–4280 | 4281–4303 | 4304–4498 | Congressional trading cards |
| 09 | `sppr` | `#sppricing-root` | 4505–4668 | 4669–4742 | 4743–4828 | Pricing — $27 / $47 / $97 |
| 10 | `spft` | `#spft-root` | 4835–4980 | 4981–5043 | 5044–5088 | Footer |

Blocks 01–05 and 07–10 namespace their CSS to a root element. **Block 06 does not** —
see hazards below.

No external JS libraries. No analytics, no tracking pixels, no iframes, no third-party
embeds. The X and Reddit "feeds" are hardcoded JS data, not real embeds. The page makes
**zero** network requests after load — no `fetch`, no `XMLHttpRequest`, no WebSocket.

---

## Target structure

```
app/
  layout.tsx            fonts via next/font; pins background #FAF0E9
  page.tsx              composes the ten section components in order
  api/
    checkout/route.ts   creates a Stripe Checkout Session (server-only)
    webhook/route.ts    Stripe webhook, signature-verified (raw body)
components/
  <block>/              one dir per block: Component.tsx + Component.module.css
lib/                    shared data modules (ticker series, feed corpus, CARDS…)
public/
  images/               the 10 extracted portraits/posters
  videos/               hero video + short film, both local
tests/parity/           Playwright screenshot-diff harness
.claude/agents/         committed reviewer subagents
index.html              FROZEN — parity baseline, never served
```

Next.js takes over the repo root (no subdirectory) so Vercel's zero-config build works
against the existing GitHub remote `projectnadiasv-eng/Landing-Page`.

---

## Migration hazards — read before touching a block

### SSR will crash on this
- Block 06 uses **bare, unprefixed** `matchMedia`, `innerWidth`, `getComputedStyle`,
  `addEventListener` at module scope (lines 2523, 2537, 2540–2541, 2552, 2609–2617).
  There is no `window.` to grep for. `ReferenceError` on the server.
- Nearly every block calls `document.getElementById` at parse time, mostly unguarded.

### Hydration mismatches
15 `Math.random()` sites (867, 956–957, 2663–2664, 2768–2769, 3744, 3806–3808,
3855–3865) and time-dependent renders (`new Date()` at 971/980/5050, `Intl.DateTimeFormat`
pinned to `America/New_York` at 963–968, `performance.now()` at 2641/2646).

**Preserve the existing shape:** `#mktick-eq`, `#mktick-cr`, `#siX`, `#siRd`, `#siBand`,
`#siChips` and `#spct-grid` all ship **empty** and are filled client-side. `#mktick-clock`
ships the literal `--:--:--`, `#mktick-state` `US markets open`, and `#spft-year` the literal
`2026` (5010) before JS overwrites it (5049). That is the correct SSR pattern — keep it.

`#spct-stamp` (4291) is the literal `today` and **no JavaScript ever touches it** — verified,
the id appears exactly once in the whole file. Nothing to do.

### Nothing is ever cleaned up
There are **zero** `removeEventListener` calls in the entire file. Under React StrictMode
every one of these doubles:
- 7 permanent `setInterval`s: lines 955 (950 ms), 984 (1 s), 2662 (3.4 s), 2767 (2.8 s),
  3970 (60 s), 3972 (6 s), 3973 (11 s)
- 2 `requestAnimationFrame` loops with no teardown: 2577–2585, 2642–2646
- an uncancellable `async function run(){ while(true){ … } }` chat simulator (2721–2746)
- 5 `IntersectionObserver`s never disconnected: 1663, 3962, 4477, 4807, 5067
- ~20 window/document listeners, incl. `wheel`/`touchmove` `{passive:false}` (619–624),
  a global ⌘K hotkey (3921), and drag handlers (2590–2614)

Every port must return a cleanup function from its effect.

### React DOM-ownership conflicts
- **Preloader** reparents itself to `document.body` (146) then `removeChild`s itself (162).
  Delete the reparent as dead — it existed only because HighLevel nested the block — and render
  `#sploader` inline as the first child of `<body>`, driven by state.
  **Do not use a portal.** A portal mounts only after hydration, so the served HTML would carry
  no splash and the page would flash unlocked at the most visible moment of the load. That is a
  fidelity regression, not a fix.
  It also toggles `splo-locked` on `<html>` and `<body>` (149–150). Those two rules target
  html/body, which no CSS module owns — they belong in `globals.css`.
- **Carousel** clones its own DOM children via `cloneNode(true)` and strips ids from the
  clones (2567–2571). Reimplement in React *and keep the id-stripping* — otherwise `#s1`–`#s5`,
  `#typed`, `#nvda`, `#prog`, `#btc`, `#eth`, `#thread` all duplicate and `getElementById`
  silently targets the wrong copy.
- ~11 `innerHTML` write sites; `el.style.zoom` (2547); per-frame `stage.style.transform` (2583).

### Dead code to delete — but carefully
Seven near-identical "surface scrubber" functions (502–516, 989–998, 1174–1196, 1633–1653,
4309–4329, 4779–4797, 5052–5060) walk up to 40 ancestors forcing `background:transparent
!important`, and write `background:#FAF0E9!important` (block 02 writes `#ffffff`) onto
`documentElement`/`body`. They exist only to fight HighLevel's wrapper divs.

They are dead in Next.js — **but deleting them changes which background wins.** Today the
1500 ms `spctSurface` timer wins with `#FAF0E9`. `layout.tsx` must pin `#FAF0E9` explicitly.

Also dead: the `window.top` / iframe `contentDocument` traversal fallbacks (654–660, 1288).

### CSS
Block 06 owns the file's **only** `:root{}` (1688 — `--stage --cream --card --line --taupe
--espresso --green --burg --gold --W --H`), plus `*{box-sizing}` (1709), `html,body{margin:0}`
(1710), `body{}` (1711), `h2.title` (1758) and ~200 generic global classes (`.page .stage
.slot .screen .card .bar .btn .avatar .search .chart .legend .thread .mono .serif .num`…).

**Two of those globals are load-bearing — lift them to `globals.css`, do not delete them:**
- `*{box-sizing:border-box}` (1709) is the **only** unqualified box-sizing reset in the file.
  Block 01 declares none of its own, and `.sploader` is `position:fixed; inset:0; width:100vw;
  height:100vh` with `padding:env(safe-area-inset-*)` — under `content-box` that padding
  overflows the viewport. Every other block scopes its own reset (181, 719, 1024, 1310, 2828,
  3990, 4509, 4839); block 01 free-rides on block 06's.
- `body{}` (1711) carries the document-wide typography default — colour, the SF/Figtree stack,
  `-webkit-font-smoothing`. Lift it minus `background:var(--stage)`.

**Hashing block 06's generic class names is provably safe.** Verified by exact-token scan: not
one of `.page .stage .slot .screen .card .bar .btn .avatar .search .chart .legend .thread .mono
.serif .num .title` is used as a bare token anywhere outside lines 1685–2771. Every superficially
similar name elsewhere is a prefixed variant (`splo-stage`, `vs-card`, `c-card`, `p-card`,
`ft-bar`, `sehx2-btn`, `si-search`, `q-num`, `rd-title`). Same for the `:root` variables.

Generic `@keyframes` that will collide with any CSS library: `pulse`, `up`, `drop`, `bob`,
`blink`, `draw`, `blip`, `chev`, `scroll-left`, `scroll-right`, `flash-up`, `flash-down`.

**CSS Modules caveat:** keyframe names are hashed per-module. An animation referenced from a
different module silently stops working — keep each `@keyframes` in the same module as its
`animation` rule.

---

## Deeplinks — must survive exactly

Nav and footer anchors: `#sehx2-root`, `#spvsl-root`, `#splive-root`, `#sppricing-root`,
`#spfeatures-root`.

Outbound: 11 links to `https://nadia-sv.com/app` (X, LinkedIn, Privacy, Terms, Disclosures
included — only the two social ones carry a `REPLACE` comment) and one to
`https://www.instagram.com/mybrandr/`.

### Known-dead links (pre-existing)
- **`#spfeatures-root` has no matching element.** The nav "Features" link is dead today. Its
  fallback chain (628: `['.teaser','.shell__title','#colX','#xfeed']`) matches nothing, and the
  heading-text fallback scans only `h1,h2` while "Social intelligence" sits in a `<p>`.
  Block 06 is the de-facto features section — give it the id during migration.
- **`compare: '#spsignup-root'`** (4749) — no such element. Silently does nothing.

---

## Decisions on record

| Decision | Choice |
|---|---|
| Port strategy | Full React conversion in one pass — components + CSS Modules |
| Checkout | Stripe replaces HighLevel entirely; **monthly subscriptions** |
| Tiers | All three wired, including the currently-dead $97 Signal Desk |
| Consistency tooling | Playwright screenshot diff + `.claude/agents/` reviewers. No custom MCP server |
| Unverified claims | Port verbatim; tracked below as pre-launch blockers |
| Roadmap (later) | Real market-data feed · accounts + dashboard · additional pages |

---

## Assets

- **13 base64 data URIs, 10 unique, ~195 KB — 43% of the file.** Three are exact duplicates
  (445 = 439, a ~52 KB video poster; 4337 = 2299; 4343 = 2343). Extract to `public/images/`
  and dedupe.
- Portrait `<img>`s carry `alt=""` + `onerror="this.style.display='none'"` with a coloured
  initials div behind. **This graceful degradation must survive** any move to `next/image`.
- Two assets still on `assets.cdn.filesafe.space` (HighLevel): a 9.9 MB mp4 (1161) and a
  27 KB jpeg (1591). Both verified reachable — pull them local before the account lapses.
- `videos/signal-pro.mp4` is a **2-byte stub** (`0d0a`); both hero videos are broken today.
  The real file is recoverable from this repo's git history:
  ```
  git cat-file blob 60f7efcbbb4e51b779a2c81bd40219e8170f83f5 > public/videos/signal-pro.mp4
  ```
  Verified: 3,786,750 bytes, valid 20.02 s H.264 MP4.
- **Fonts:** 11 Google Fonts requests for 5 families — Figtree (400/500/600/700/800 +
  italic 400/600), JetBrains Mono (400/500/600/700), IBM Plex Mono (400/500/600), IBM Plex
  Sans (400/500/600/700), Inter (400/500/600/700/800). Collapse into `next/font`.

---

## Secrets

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only — they must never appear in
a client component, in `NEXT_PUBLIC_*`, or in the repo. Only the publishable key may reach
the browser. Never echo a key value; report presence as `PRESENT, len=N`.

The webhook route needs the **raw** request body for signature verification.

---

## Cross-repo: the CRM and the webapp

This page is the top of a three-repo product. Checkout here writes to a CRM in a
sibling repo, and paying customers get access in a second sibling repo — neither
of those is this repo, and this repo talks to both only over HTTP with a shared
secret, never a shared database.

- **Checkout is account-first.** The pricing CTAs link to `/signup?plan=<key>` (all
  three tiers), and `src/app/api/signup/route.ts` creates/links the Stripe Customer,
  POSTs `{ kind: 'signup', email, name, stripeCustomerId, utm, referrer }` to
  `/api/spro/fulfill` — a CRM failure is a 502 and **no** Checkout Session is created —
  then builds the session with `customer` + `client_reference_id`. Afterwards
  `GET /api/checkout/session?id=cs_…` gives the confirmation overlay the email to hand
  to `NEXT_PUBLIC_SIGNAL_PRO_APP_URL`. `src/lib/crm.ts` is the one CRM client, shared
  with the webhook; `src/lib/checkout-session.ts` is the one session builder, shared
  with the still-working anonymous `/api/checkout`.
- **`project_nadia`** (Nadia SV's newsletter/admin platform, `nadia-sv.com`) hosts
  the CRM. `src/app/api/webhook/route.ts` forwards every Stripe fulfilment event to
  `${SIGNAL_PRO_CRM_URL}/api/spro/fulfill` (Bearer `SIGNAL_PRO_LANDING_SECRET`),
  which upserts into project_nadia's `spro_customers`/`spro_subscriptions`/
  `spro_invoices` tables — **not** that repo's unrelated `subscriptions` table
  ("Briefs Pro", a different product's paid tier; do not conflate them). The admin
  dashboard for this data lives at `nadia-sv.com/admin/signal-pro`. Funnel events
  (`pricing_viewed`, `tier_clicked`, `checkout_started`) are proxied through this
  repo's own `src/app/api/funnel/route.ts`, which attaches the shared secret
  server-side — the browser never talks to project_nadia directly.
- **`signal-pro`** (the actual product webapp, Timbal/Elysia/Bun — not Vercel) is
  where a paying customer lands post-checkout. It has no Stripe dependency of its
  own; it reads entitlement from project_nadia's `/api/spro/entitlement` (Bearer
  `SIGNAL_PRO_APP_SECRET`) and gates routes by tier accordingly. This repo never
  talks to signal-pro directly.
- **Two distinct shared secrets**, never reused across callers:
  `SIGNAL_PRO_LANDING_SECRET` (this repo → project_nadia, both fulfilment and
  funnel) and `SIGNAL_PRO_APP_SECRET` (signal-pro → project_nadia only — this repo
  never holds it).
- Canonical tier enum is signal-pro's `'signal' | 'signal_pro' | 'signal_desk'`.
  This repo's own `PlanKey` (`'signal' | 'pro' | 'desk'`) is translated to it at
  exactly one point — the webhook, via the `CRM_TIER` map — never anywhere else.

---

## Pre-launch blockers

Carried across verbatim by decision. Not fixed. Do not let these ship unaddressed:

1. **Market prices are simulated.** `startDemoFeed()` (955) random-walks hardcoded values
   while the UI is labelled "Live" and "Quotes delayed 15 min". `window.mktickApplyTick(symbol,
   price)` is the hook for a real feed.
2. **Named people carry unsourced figures.** The congress cards and phone mockup attach
   specific profit totals and "conflicts" counts to real, identifiable politicians with no
   cited source.
3. Legal links (Privacy / Terms / Disclosures) all point at `https://nadia-sv.com/app`.
4. HighLevel checkout URLs are `/preview/` funnel links — being replaced by Stripe.

---

## Deliberately weird — do not "fix" these

- **`.p-in` does double duty in block 09.** It is both the max-width container
  (`#sppricing-root .p-in{max-width:1280px;margin:0 auto}`, 4535) *and* the reveal-state class
  the IntersectionObserver adds (`classList.add('p-in')`, 4810). Every revealed `.p-rv` element
  therefore silently inherits `max-width:1280px;margin:0 auto`. Splitting them changes layout.
- **The dead links stay dead.** `#spfeatures-root`, `#spsignup-root`, and Desk's `href="#"` all
  reproduce today's behaviour. Reviving one is a product decision, not a migration step.
- **`alt=""` on the portraits** is correct — they are decorative, the name is adjacent text.
- **The ⌘K listener (3921)** hijacks the browser's own shortcut. Existing behaviour; preserve it.
- **The 2000 ms IntersectionObserver fallbacks** (1673, 4489, 4819, 5079) are real behaviour, not
  defensive cruft — dropping them changes what is visible on a fast scroll.
- **`NEW_TAB = false`** — checkout opens in the same tab. No `target="_blank"`.

## Commands

> **Status: none of these exist yet.** The Next.js app has not been scaffolded.
> Today the only way to view the page is to serve the repo root statically.

```bash
pnpm dev                  # Next.js dev server
pnpm build && pnpm start  # production build
pnpm test:parity          # Playwright screenshot diff vs frozen index.html
pnpm test:parity:update   # re-baseline (only with a reviewed visual diff)

# serve the frozen baseline for comparison
python3 -m http.server 8000 --bind 127.0.0.1
```

## Conventions

- One directory per block under `components/`, named for the block's namespace.
- Section components are `'use client'` only where they need browser APIs; keep static
  markup in server components where a block allows it.
- Every effect that starts a timer, loop, listener or observer returns a cleanup function.
- Never widen a block's scope while porting it. Port, verify parity, then improve.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
