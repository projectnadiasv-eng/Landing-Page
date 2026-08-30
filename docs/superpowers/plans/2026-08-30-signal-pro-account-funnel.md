# Signal Pro — account-first funnel, welcome email, admin users, RBAC

Spec: `C:\Users\Davin\Downloads\Untitled document.pdf` (client's flow + 8 requirements).
Transcribed here so every task can cite it:

```
LANDING PAGE → SELECT PLAN → CREATE SIGNAL PRO ACCOUNT → CREATE USER IN DATABASE
→ CREATE/LINK STRIPE CUSTOMER → STRIPE CHECKOUT → PAYMENT → STRIPE WEBHOOK
→ UPDATE DATABASE → ACTIVATE SUBSCRIPTION → UPDATE CRM → SEND WELCOME EMAIL
→ AUTHENTICATE CUSTOMER → SIGNAL PRO APP → UNLOCK PAID FEATURES
```
Requirements:
R1 Users in CRM (subscription tier / date / full name / email / #months subscribing)
R2 Stripe billing portal on CRM
R3 Confirm whether the app supports registration + login via magic links
R4 Ensure paid users can access the application after completing checkout
R5 Restricted admin users page if the platform does not already provide user visibility
R6 Limit the users page to super administrators
R7 Connect Stripe status with the application so access reflects subscription payments
R8 Use Stripe's Billing Portal for subscription management instead of building billing UI

## Repos and branches

| Repo | Path | Branch |
|---|---|---|
| Landing-Page (signal-pro.co, Next.js 16, Vercel) | `C:\Users\Davin\Documents\Projects\Landing-Page` | `feat/account-funnel` |
| project_nadia (nadia-sv.com, CRM, Next.js 16 monorepo, Supabase) | `C:\Users\Davin\Documents\Projects\project_nadia` | `feat/spro-users-admin` |
| signal-pro (the product, Timbal/Elysia/Bun) | `C:\Users\Davin\Documents\Projects\signal-pro` | `feat/entitlement-ux` |

Each repo's own `CLAUDE.md` (signal-pro: `AGENTS.md`) binds its task. Read it before editing.

## Global constraints (binding on every task)

- **Identity join key is the customer's email**, lower-cased and trimmed, in all three repos.
- **Two shared secrets, never crossed**: `SIGNAL_PRO_LANDING_SECRET` (Landing-Page → project_nadia), `SIGNAL_PRO_APP_SECRET` (signal-pro → project_nadia). No new cross-repo secret in this plan.
- **Stripe SDK exists only in Landing-Page.** project_nadia and signal-pro never import Stripe. Billing management is Stripe's hosted Customer Portal (R8): the hosted **portal login link** URL is configuration (`STRIPE_PORTAL_LOGIN_URL`), not code.
- **Tier enums**: Landing-Page `PlanKey` `'signal'|'pro'|'desk'` is mapped to CRM tier `'signal'|'signal_pro'|'signal_desk'` in exactly one place (Landing-Page webhook `CRM_TIER`). Any new Landing-Page → CRM call that carries a tier uses the same map.
- **Never echo a secret value** in any output; report `PRESENT, len=N`.
- **Landing-Page fidelity rule**: the one-pager's existing markup/CSS/behaviour must not change except where a task says so explicitly. New pages are new routes.
- **project_nadia migrations**: new file in `supabase/migrations/`, timestamp `20260830HHMMSS` (verify free with `ls supabase/migrations | grep 20260830`), never edit an applied one. Staff-gated writes are `security definer` functions that check the role **inside** the function. Prove with `supabase/tests/run.sh` where a Postgres binary exists; on this Windows machine there is none and Docker is down — so write the SQL test file regardless and state clearly that it was not executed. Do **not** run `db push`.
- **Commits**: conventional, one per logical step, on the repo's feature branch. Never commit to `main`. Never push.
- **Typecheck before reporting**: Landing-Page `pnpm tsc --noEmit` (or `pnpm build`), project_nadia `pnpm typecheck` (expect errors ONLY for symbols added by an unapplied migration — list them), signal-pro `cd api && bun x tsc --noEmit` / `cd ui && bun x tsc --noEmit` if configured.

## Rulings made while planning (spec vs. what exists)

- "CREATE SIGNAL PRO ACCOUNT" = the CRM customer identity (email + full name), created before checkout. The product login itself is Timbal-managed; the customer signs in to the app with the same email at AUTHENTICATE CUSTOMER. Task 5 checks whether Timbal exposes an API to pre-create/invite that user and uses it if so.
- "Super administrator" = `profiles.role = 'admin'`. `editor` is staff but not super-admin. No new role value.
- "Stripe billing portal on CRM" = per-customer Stripe Dashboard deep link + the hosted Customer Portal login link, surfaced in the admin users page. No portal-session route (would need a Stripe key outside Landing-Page).

---

## Task 1 — project_nadia: CRM contract for account-first signup, RBAC, admin CRUD

**Repo:** project_nadia. **Files:** new migration `supabase/migrations/20260830000000_spro_signup_admin_rbac.sql`, new test `supabase/tests/spro-signup-admin-rbac.sql`, `apps/web/src/app/api/spro/fulfill/route.ts`, `packages/supabase/src/database.types.ts` (hand-add the new RPC/view types if `pnpm db:types` cannot run — it needs `--linked` and the migration is unapplied; state which you did).

Read first: `supabase/migrations/20260826000000_spro_customers_subscriptions.sql`, `20260826010000_spro_fulfilment_fix_subscription_updates.sql`, `20260827000000_spro_dashboards.sql`, `supabase/migrations/20260728030000_newsletter_crm.sql` (is_staff), the existing `supabase/tests/spro-crm-fulfilment.sql`, and `apps/web/src/app/api/spro/fulfill/route.ts`.

Migration must:
1. `create or replace function public.is_admin() returns boolean` — `security definer`, `stable`, true iff `profiles.role = 'admin'` for `auth.uid()`. Same shape as `is_staff()`.
2. Replace every `spro_*` **select** RLS policy that uses `is_staff()` with `is_admin()` (R6: editors lose sight of customers). Drop + recreate the policies by their existing names.
3. Extend `spro_apply_fulfilment_event(payload jsonb)`:
   - New `kind = 'signup'`: upsert `spro_customers` by email with `name` (required, trimmed), `utm_*`, `referrer`; `account_status` stays `'lead'` if new, unchanged if existing; `stripe_customer_id` set if payload carries `stripeCustomerId` and column is null. Returns the customer `id` (uuid) in the function's result the same way existing kinds return theirs — read the current return shape and keep it.
   - `kind = 'checkout_completed'`: additionally store `name` when the payload carries it and the row's `name` is null.
4. `create or replace function public.spro_admin_update_customer(customer_id uuid, patch jsonb) returns public.spro_customers` — `security definer`, checks `is_admin()` inside the body (raise `insufficient_privilege` otherwise), allows only keys `name`, `company`, `account_status` (must be one of the check-constraint values), ignores anything else, bumps `updated_at`. Grant execute to `authenticated`.
5. Recreate view `spro_customer_360` adding `months_subscribed integer` = whole months from the customer's **earliest** `spro_subscriptions.created_at` to `now()` (0 if none), and `full_name` (alias of `spro_customers.name`), `subscribed_at` (that earliest created_at). Keep every existing column and name.
6. Comment at the top explaining R1/R6 and that `is_admin()` is the super-admin axis.

Test file `supabase/tests/spro-signup-admin-rbac.sql` (same harness conventions as `spro-crm-fulfilment.sql`): (a) signup kind creates a lead with name; (b) a second signup for the same email does not downgrade an `active` customer; (c) checkout_completed fills a null name but never overwrites; (d) `spro_admin_update_customer` raises for an `editor`, succeeds for an `admin`, rejects an invalid `account_status`; (e) an `editor` JWT selects zero rows from `spro_customers`, an `admin` selects them; (f) `months_subscribed` is 0 for a lead and ≥1 for a subscription created 40 days ago. Note in the report whether it was executed (see Global constraints).

`fulfill/route.ts`: accept `kind: 'signup'` with `{ email, name, utm?, referrer?, stripeCustomerId? }` (validate name non-empty ≤200 chars), pass through to the RPC, return `{ ok: true, customerId }`. Keep the Bearer check exactly as is.

Report: migration + test paths, typecheck result with the expected-unapplied-symbol list, commits.

## Task 2 — Landing-Page: sign-up page → Stripe customer → checkout, and the post-checkout handoff

**Repo:** Landing-Page. Read first: `CLAUDE.md`, `src/app/api/checkout/route.ts`, `src/app/api/webhook/route.ts`, `src/lib/pricing.ts`, `src/lib/stripe.ts`, the pricing client component (`grep -rn checkout_started src/components`), `src/components/CheckoutSuccess/CheckoutSuccess.tsx`, `.env.example`.

Build:
1. **`/signup` page** (`src/app/signup/page.tsx` + a client form component under `src/components/Signup/` with its own CSS module). Query `?plan=signal|pro|desk` (invalid → default `pro`, show the tier selector anyway). Fields: full name, email, plan (radio, the three tiers with the prices from `PLANS`). Visual language: reuse the pricing block's tokens (cream `#FAF0E9`, the same font stack) so it reads as the same site; keep it a single centred card, mobile-first. No changes to the one-pager's components except item 3.
2. **`POST /api/signup`** (`src/app/api/signup/route.ts`, `runtime = 'nodejs'`): body `{ name, email, plan, utm_source?, utm_medium?, utm_campaign?, referrer? }`. Steps, in order, each failing loudly with a JSON error and correct status:
   a. validate (name 1–200 chars, email RFC-ish, plan via `isPlanKey`), lower-case+trim email;
   b. Stripe: find customer by email (`stripe.customers.search({ query: "email:'…'" })`), else `customers.create({ email, name, metadata: { plan } })` — this is CREATE/LINK STRIPE CUSTOMER;
   c. CRM: `POST ${SIGNAL_PRO_CRM_URL}/api/spro/fulfill` with Bearer `SIGNAL_PRO_LANDING_SECRET`, `{ kind: 'signup', email, name, stripeCustomerId, utm: {...}, referrer }` — this is CREATE USER IN DATABASE. A CRM failure is a 502 (do not proceed to checkout without the account row);
   d. Checkout Session exactly as `/api/checkout` builds it today (reuse by extracting a shared helper in `src/lib/checkout-session.ts`; `/api/checkout` must keep working unchanged for anything that still calls it) **plus** `customer: <id>`, `client_reference_id: <spro customerId from step c>`, `customer_update: { name: 'auto', address: 'auto' }`, and `name` in `metadata`;
   e. return `{ url, sessionId }`.
   Also forward `customer_details.name` in the webhook's `checkout_completed` payload to the CRM (`name` field), so Task 1's "fill null name" path gets data.
3. **Tier click → signup.** In the pricing client, the tier CTA navigates to `/signup?plan=<key>` (same tab, `NEW_TAB = false` rule) instead of calling `/api/checkout` directly. Keep the `tier_clicked` funnel event exactly as is; move `checkout_started` to fire from the signup form on successful `/api/signup` (with the returned `sessionId`). Desk's currently dead `href="#"` becomes the same signup link — the spec wires all three tiers.
4. **Post-checkout handoff (R4).** `GET /api/checkout/session?id=cs_…` returns `{ email, plan }` only (fetched server-side from Stripe; 404 if not found or unpaid). `CheckoutSuccess.tsx`: replace the 10 s countdown with: "Payment confirmed — sign in to Signal Pro with **{email}**" and a primary button to `NEXT_PUBLIC_SIGNAL_PRO_APP_URL` (add to `.env.example`; production already has `SIGNAL_PRO_APP_URL` — note in the report that Vercel needs the `NEXT_PUBLIC_` variant added), plus a secondary "Manage billing" link to `NEXT_PUBLIC_STRIPE_PORTAL_LOGIN_URL` if set. Keep the overlay styling; a still-pending session shows "We're confirming your payment…" and retries the endpoint every 3 s for up to 60 s.
5. `.env.example`: add `NEXT_PUBLIC_SIGNAL_PRO_APP_URL`, `NEXT_PUBLIC_STRIPE_PORTAL_LOGIN_URL`. `CLAUDE.md`: update the Cross-repo section with the signup step and the two new routes (3–6 lines, no rewrite).

Tests: whatever harness exists (check `package.json`); at minimum `pnpm tsc --noEmit` and `pnpm build` clean. Manual proof in the report: `curl -X POST localhost:3000/api/signup` with a bad plan → 400, missing name → 400 (Stripe key absent locally → the route must return 503 "not configured" before touching the CRM, same as `/api/checkout`).

## Task 3 — project_nadia: welcome email on activation

**Repo:** project_nadia. Read first: `apps/web/src/lib/newsletter/waitlist-welcome.ts`, `apps/web/src/app/app/actions.ts` (how it sends), the Resend provider under `apps/web/src/lib/newsletter/providers/`, `apps/web/src/app/api/spro/fulfill/route.ts`, `apps/web/.env.example`.

Build: when `fulfill` processes `kind: 'checkout_completed'` successfully, send **one** welcome email via the existing Resend transactional path from `TRANSACTIONAL_FROM_EMAIL`. Content (plain + minimal HTML, brand voice per CLAUDE.md, no marketing fluff): tier name, "Sign in to Signal Pro with this email address" + button to `SIGNAL_PRO_APP_URL`, "Manage your subscription" → `STRIPE_PORTAL_LOGIN_URL`, reply-to `NEWSLETTER_REPLY_TO`. Idempotent: record `welcome_sent_at timestamptz` on `spro_customers` (add to Task 1's migration file if Task 1 has not been applied yet — it has not; append a second migration `20260830010000_spro_welcome_sent.sql` instead so the two stay reviewable), send only when null, set it after a successful send. A send failure logs and does **not** fail the fulfilment response (Stripe must not retry a paid event because email was down). Add `SIGNAL_PRO_APP_URL`, `STRIPE_PORTAL_LOGIN_URL` to `.env.example` with one-line comments. Unit-test the template function (pure) if a TS test harness exists; otherwise a script under `apps/web/scripts/` that renders it to stdout, and show its output in the report.

## Task 4 — project_nadia: super-admin users page with CRUD and Stripe links

**Repo:** project_nadia. Read first: `apps/web/src/app/admin/signal-pro/page.tsx`, the admin layout/gating (`apps/web/src/app/admin/layout.tsx`, `src/proxy.ts`), an existing admin table page with row actions (`apps/web/src/app/admin/waitlist/page.tsx` or subscribers), brand rules in CLAUDE.md (mono eyebrows, `shadow-raise`, radius scale, three grounds).

Build `apps/web/src/app/admin/signal-pro/users/page.tsx` (+ `actions.ts` server actions, + a client row-editor component):
- Gate: server-side check `is_admin()` (RPC or `profiles.role === 'admin'`) → non-admins get the same 404/redirect the admin uses for unauthenticated users. Add a nav link from `/admin/signal-pro` visible only to admins.
- Table from `spro_customer_360`, columns in this order (R1): Full name · Email · Tier · Status · Subscribed since (date) · Months subscribing · Last active · Stripe. Sortable by tier/status/subscribed-since; search box on name/email (client-side is fine at this size).
- Stripe column (R2/R8): "Open in Stripe" → `https://dashboard.stripe.com/customers/{stripe_customer_id}` (new tab), and a "Customer portal" link → `STRIPE_PORTAL_LOGIN_URL` (env, server-read, rendered as `NEXT_PUBLIC`-free prop). Hide either when its value is missing.
- Row edit (CRUD scope = update only, by ruling): inline edit for name, company, account_status (select of the constraint values) → server action → `spro_admin_update_customer` RPC. Errors surface inline. No delete button.
- Empty state and a one-line note "Subscription state comes from Stripe; edit only identity fields here."
Typecheck as in Global constraints.

## Task 5 — signal-pro: entitlement gating completed, no-entitlement UX, Timbal account check

**Repo:** signal-pro. Read first: `AGENTS.md` (Cross-repo + Entitlement sections), `api/src/lib/entitlement.ts`, `api/src/lib/gate.ts`, `api/src/lib/entitlement-tiers.ts`, `api/src/index.ts`, `api/src/routes/markets.ts`, whichever routes serve Congress cards and X/Reddit intel (`grep -rn "congress\|x-search\|reddit" api/src/routes`), `ui/AGENTS.md` (`SessionProvider`/`AuthGuard`), `node_modules/@timbal-ai/timbal-sdk` (its README/types for auth + user management).

Build:
1. R7: add `beforeHandle: requireTier(...)` to the Congress and X/Reddit intel routes with the tiers the pricing page promises (`ui/src/lib/pricing.ts` is the feature matrix; cite the line). Gating stays behind `ENABLE_ENTITLEMENT_GATING` as today.
2. R4 UX: a `GET /api/entitlement/me` route returning `{ email, tier, status, currentPeriodEnd, cancelAtPeriodEnd }` (null tier when none) — the session email must always be returned so the UI can say which address is signed in. UI: when a gated call returns 403 **or** `/me` reports null tier, render a `NoEntitlement` panel (shared kit component, desktop + mobile per the two-host rule): "Signed in as {email}. No active Signal Pro subscription is linked to this address." with buttons "Get Signal Pro" → `VITE_LANDING_URL` (`.env.example`, default `https://signal-pro.co/signup`) and "Manage billing" → `VITE_STRIPE_PORTAL_LOGIN_URL`. Do not fake data for unentitled users; the panel replaces the gated section's content only.
3. R3: **Investigate, then report** — does Timbal auth support magic-link sign-in and registration, and does the SDK expose a server-side "create/invite user by email" call? Read the SDK in `node_modules` and any docs it ships. If an invite/create API exists, add `POST /api/account/provision` (Bearer `SIGNAL_PRO_APP_SECRET`… no — that secret is signal-pro → nadia; this route would be called by nobody yet) — **do not add a route**; instead write the finding to `docs/timbal-auth-findings.md` with exact function names/signatures found, and state what Landing-Page or project_nadia would need to call. The report's first line must answer R3 in one sentence.
4. Update `AGENTS.md`'s "Currently wired" paragraph and the env example with the two new `VITE_` vars.

Tests: Elysia route test for `/api/entitlement/me` following `community.post.test.ts` (listen on port 0). `bun test` results in the report.

---

## Final review

One code-reviewer pass per repo over `git diff main...HEAD`, most capable model, with this file's Global constraints and the spec's R1–R8 as the lens. Then `superpowers:finishing-a-development-branch` — options are presented to Davin; nothing is merged or pushed by the agents.
