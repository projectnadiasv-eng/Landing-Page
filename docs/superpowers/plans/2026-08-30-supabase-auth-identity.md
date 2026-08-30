# Signal Pro — one identity: Supabase Auth everywhere, Timbal invisible

Decision (Davin, 2026-08-30, on Nadia's direction): the customer must never see Timbal. After
paying and signing up, their account, login and session are **Supabase Auth** on project_nadia's
Supabase project (`mnradzkwiawohvxqiech`). Timbal stays as backend infrastructure only (knowledge
base, workforce agents, hosting) behind a server credential.

This **supersedes** the "no shared `auth.users` row" line in project_nadia's CLAUDE.md and signal-pro's
AGENTS.md: sharing `auth.users` is now deliberate and is the identity join. The CRM tables
(`spro_*`) and the entitlement HTTP contract are unchanged — the app still asks project_nadia
`GET /api/spro/entitlement?email=` with `SIGNAL_PRO_APP_SECRET`.

Customer journey after this plan:
```
signup (name+email) → auth.users row created (no email yet) → Stripe Checkout → paid
→ webhook → CRM active → welcome email carrying a Supabase magic link ("Open Signal Pro")
→ click → app.signal-pro.co/auth/callback → session → app (entitled)
Later logins: app.signal-pro.co/login → email → Supabase OTP email → callback → app
```

## Repos and branches

| Repo | Branch | Base |
|---|---|---|
| project_nadia (`C:\Users\Davin\Documents\Projects\project_nadia`) | `feat/spro-auth-provisioning` | main @ 0a6cd2a |
| signal-pro (`C:\Users\Davin\Documents\Projects\signal-pro`) | `feat/supabase-auth` | main @ f3f02c9 |
| Landing-Page (`C:\Users\Davin\Documents\Projects\Landing-Page`) | `feat/signin-link-copy` | main @ 7d18ac4 |

Each repo's CLAUDE.md / AGENTS.md binds its task except where this plan overrides it (the shared
`auth.users` line). The Supabase project's Auth URL config already has Site URL `https://nadia-sv.com`
and redirect allowlist `https://app.signal-pro.co/**`, `http://localhost:3737/**` (set by Davin).

## Global constraints (binding on every task)

- **Identity join key stays the email**, lower-cased + trimmed, everywhere. `auth.users.email` is
  the same string the CRM keys on.
- **Timbal never appears to the customer**: no Timbal login page, no Timbal token in the browser,
  no `*.timbal.ai` URL reachable from the UI, no Timbal wording in user-facing copy. The API talks
  to Timbal with a **server** credential only.
- **Keys**: browser gets only the Supabase URL + **anon/publishable** key. `SUPABASE_SERVICE_ROLE_KEY`
  exists only in project_nadia's server code (admin client). `SIGNAL_PRO_APP_SECRET`,
  `TIMBAL_PROJECT_SECRET` / `TIMBAL_API_KEY` never reach a bundle. Report key presence as
  `PRESENT, len=N`, never values.
- **Entitlement unchanged**: `api/src/lib/entitlement.ts` keeps calling project_nadia by email; only
  its email *source* changes (Supabase session instead of Timbal session).
- **Two-hosts rule** in signal-pro UI (desktop :3737 / mobile :3838 share hooks, not markup).
- **Fail closed on protected routes, fail open on nothing new**: an unauthenticated request to a
  protected API route is 401; public paths are an explicit allowlist.
- **Commits**: conventional, on the feature branch, trailers
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_014x9tkpbp7B8KH4L3HpdvfU`. Never commit to main.
  Never push. Never run `supabase db push` (the controller applies migrations).
- **Typecheck/tests before reporting**: project_nadia `pnpm typecheck` + `pnpm lint`; signal-pro
  `bun test` for touched files + `bun x tsc --noEmit` in `api/` and `ui/` + eslint in `ui/`;
  Landing-Page `pnpm typecheck` + `pnpm build`.

## Rulings made while planning

- **API auth = Supabase JWT verified per request** via `supabase.auth.getUser(jwt)` with the anon
  key (network call, cached per token for 60 s), not local JWKS/HS256 verification — survives key
  rotation and needs no JWT secret in the app.
- **Timbal client in the API runs in `authMode: "legacy"`** (pinned explicitly even though
  `TIMBAL_PROJECT_ID` is set), so `timbal` is server-scoped with `TIMBAL_PROJECT_SECRET` /
  `TIMBAL_API_KEY`. Task 2 must verify in the SDK source that legacy mode yields a usable
  server-scoped client for `timbal.query` / workforce calls and report exactly what it found.
- **Assistant ("Ask Signal") goes through our API**, authenticated by the Supabase token, using the
  existing `api/src/routes/workforce.ts` (`listWorkforces`, `callWorkforce`, `streamWorkforce`). If
  `@timbal-ai/timbal-react`'s chat components cannot be pointed at our API without a Timbal token
  in the browser, replace the chat surface with a minimal in-house chat over those routes. Losing
  the assistant is not acceptable; a plainer assistant is.
- **Account is created at signup, before payment** (`auth.admin.createUser`, `email_confirm: true`,
  no email sent) — this is the spec's CREATE SIGNAL PRO ACCOUNT step. Leads can therefore log in
  and see the no-subscription panel; that is fine.
- **First login is the welcome email's magic link** (`auth.admin.generateLink` type `magiclink`,
  `redirectTo` = `${SIGNAL_PRO_APP_URL}/auth/callback`), sent by project_nadia via Resend. Later
  logins use the app's `/login` with `signInWithOtp`, which sends through **Supabase Auth's SMTP**
  — operator item: configure custom SMTP (Resend) in Supabase Auth settings before launch, the
  built-in SMTP is rate-limited to a handful per hour.
- **Sign-up page on the landing site keeps collecting name + email** (already built); no password
  anywhere in the product.

---

## Task 1 — project_nadia: provision the Supabase Auth user and mint the first-login link

**Repo:** project_nadia, branch `feat/spro-auth-provisioning`. Read first: `apps/web/src/app/api/spro/fulfill/route.ts` (current signup / checkout_completed / welcome flow), `apps/web/src/lib/newsletter/spro-welcome.ts`, `apps/web/src/lib/spro-links.ts`, `packages/supabase/src/admin.ts` (admin client), migrations `20260830000000_spro_signup_admin_rbac.sql` and `20260830010000_spro_welcome_sent.sql`, `20260727000000` (`handle_new_user` trigger → `profiles`), CLAUDE.md (Supabase conventions, never echo secrets, migration timestamp check).

Build:
1. Migration `supabase/migrations/20260830020000_spro_auth_user.sql`: `alter table public.spro_customers add column if not exists auth_user_id uuid references auth.users(id) on delete set null;` + unique index on it (partial, where not null) + header comment stating the shared-identity decision and that `auth_user_id` is set by the fulfil route, never by the RPC. Hand-edit `packages/supabase/src/database.types.ts` for the column (the controller will regenerate after push).
2. `apps/web/src/lib/spro-auth.ts` (server-only): `ensureAuthUser({ email, name })` → uses the admin client: look up by email (`auth.admin.listUsers` is paginated — prefer a direct `createUser` and treat the "already registered" error as success, then resolve the id via `auth.admin.getUserById`/list by email; document which and why), `createUser({ email, email_confirm: true, user_metadata: { full_name: name } })`. Returns `{ id, created: boolean }`. Idempotent. `mintFirstLoginLink({ email, redirectTo })` → `auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })` → returns `properties.action_link` (string) or null on failure (logged). Use Context7 to confirm the exact supabase-js 2.110 signatures and whether `magiclink` requires an existing user (call `ensureAuthUser` first regardless).
3. `fulfill/route.ts`: on `kind: 'signup'` after the RPC → `ensureAuthUser` → update `spro_customers.auth_user_id` (admin client, by id). On `kind: 'checkout_completed'` → `ensureAuthUser` (covers buyers who came through the old anonymous `/api/checkout`) → set `auth_user_id` → mint the magic link with `redirectTo = ${SIGNAL_PRO_APP_URL}/auth/callback` → pass it into the welcome email as `signInUrl`; if minting fails, fall back to `${SIGNAL_PRO_APP_URL}/login` and log. Auth-user failures must **not** fail the fulfilment response (same rule as email).
4. `spro-welcome.ts`: primary button "Open Signal Pro" → `signInUrl`; copy: "This link signs you in — no password needed. It expires in 1 hour; after that use the sign-in page and we'll email you a fresh one." Keep the billing-portal paragraph. Update the dry-run script/assertions.
5. `GET /api/spro/entitlement` unchanged. Add `auth_user_id` to `spro_customer_360` **only if** trivial (append column, `create or replace view`); otherwise skip and say so.
6. SQL test `supabase/tests/spro-auth-user.sql`: column exists, FK to `auth.users`, partial unique index; setting `auth_user_id` on a row works via service role. (Cannot execute on this machine — say so.)
7. `.env.example`/CLAUDE.md: document the shared-identity decision (3–6 lines replacing the "no shared auth.users" sentence) and the SMTP operator item.

## Task 2 — signal-pro API: Supabase session replaces Timbal session

**Repo:** signal-pro, branch `feat/supabase-auth`, directory `api/`. Read first: `AGENTS.md` (Cross-repo, Entitlement + RBAC), `api/src/index.ts`, `api/src/lib/entitlement.ts`, `api/src/lib/usage-emit.ts`, `api/src/routes/session.ts`, `community.ts` (`viewer()`), `companies.ts`, `education.ts` (their `getSession` sites), `api/src/routes/workforce.ts`, `api/src/routes/entitlement.me.test.ts`, and the SDK: `api/node_modules/@timbal-ai/timbal-sdk/README.md` §timbalAuth (legacy vs platform, `authMode`) and `dist/elysia/index.esm.js` around lines 3440–3700 (what `timbal`/`session` are in legacy mode).

Build:
1. Pin `timbalAuth({ authMode: "legacy", publicPaths: [...] })` and verify (cite lines) that in legacy mode the injected `timbal` is server-scoped using `TIMBAL_PROJECT_SECRET`/`TIMBAL_API_KEY` and that no Timbal login route gates anything. If legacy mode does **not** give a working server client, construct one explicitly (`new Timbal({...})` as `scheduler` already does at `index.ts:37`) and decorate it as `timbal`; report which path you took.
2. `api/src/lib/auth.ts`: Elysia plugin `supabaseAuth({ publicPaths })` — `derive` reads `Authorization: Bearer <jwt>`, calls `createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(jwt)` (add `@supabase/supabase-js` to `api/`), caches `{jwt → user}` for 60 s (Map + TTL, same idiom as `entitlement.ts`), injects `session: { user_id, user_email (lower/trim), user_name } | null`. A protected path with no/invalid token → 401 JSON `{ error: 'Unauthorized' }` via `beforeHandle`. Public paths: healthcheck, `/config`, the channel webhook paths already in `CHANNELS_PUBLIC_PATHS`, `/community/x/status`, `/entitlement/me` is **protected** (it needs a session). Missing env → the plugin throws at startup in production (`NODE_ENV=production`) and warns+bypasses in dev without `SUPABASE_URL` (so local dev keeps working like legacy mode did) — document this.
3. Replace every `timbal.getSession()` (session.ts, community.ts `viewer()`, companies.ts, education.ts, entitlement.ts `sessionEmail`) and `sessionEmail(timbal)` in `index.ts`'s `onAfterResponse` with the injected `session`. Keep the exported function names so callers don't churn (`sessionEmail(session)`); `/me` returns the same shape as before plus nothing Timbal-specific.
4. `api/src/routes/workforce.ts`: confirm it works with the server-scoped client and is protected by the Supabase session (it is the assistant's backend now). If it streams, keep streaming.
5. Tests: `api/src/lib/auth.test.ts` with a stub Supabase `GET /auth/v1/user` server (port 0): valid token → session injected; invalid → 401 on a protected route; public path passes without a token; cache hit avoids a second upstream call. Update `entitlement.me.test.ts` to send a Supabase bearer against the stub instead of a Timbal session stub.
6. `api/.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, note `TIMBAL_PROJECT_SECRET`/`TIMBAL_API_KEY` is now the only Timbal credential and is server-only. `AGENTS.md`: rewrite the Entitlement + RBAC "session" paragraph and the Cross-repo section (shared `auth.users` is deliberate; Timbal invisible), ≤ 25 lines changed.

## Task 3 — signal-pro UI: Supabase login, callback, session, authFetch, assistant proxy

**Repo:** signal-pro, branch `feat/supabase-auth` (on top of Task 2), directory `ui/`. Read first: `ui/AGENTS.md`, `ui/src/design/DESIGN.md`, `ui/src/App.tsx` (SessionProvider/AuthGuard at 129–138, 209–211), `ui/src/config.ts`, `ui/src/lib/use-entitlement.ts` (`useOptionalSession`), every `authFetch` import (15 files — `grep -rn 'authFetch' ui/src`), `ui/src/components/app/signal-assistant.tsx`, `ui/src/components/blocks/assistant.tsx`, `embedded-chat.tsx`, `ui/src/components/chat/*`, `ui/src/lib/device-target.ts`, `ui/src/components/app/whale-shell.tsx` and `components/mobile/mobile-shell` (where sign-out goes), and `@timbal-ai/timbal-react`'s exports for `SessionProvider`/`AuthGuard`/`authFetch`/`useWorkforces`/chat (`ui/node_modules/@timbal-ai/timbal-react/dist/*.d.ts`) to learn whether its chat components accept a custom base URL + fetch.

Build:
1. `ui/src/lib/supabase.ts`: browser client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (add `@supabase/supabase-js`), PKCE flow, `persistSession: true`.
2. `ui/src/lib/auth.tsx`: `SessionProvider` (subscribes to `onAuthStateChange`, exposes `{ session, user, email, loading, signOut }`), `useSession()`, `useOptionalSession()` (same names the codebase already uses), `AuthGuard` (renders children when a session exists; otherwise redirects to `/login?next=<path>`; while loading, the existing skeleton), and `authFetch(url, init)` that attaches `Authorization: Bearer <access_token>` and, on 401, refreshes once via `supabase.auth.refreshSession()` and retries once. Switch all 15 imports from `@timbal-ai/timbal-react` to `@/lib/auth` (a codemod-style sed is fine; verify with grep that no `@timbal-ai/timbal-react` auth import remains — `authFetch`, `useOptionalSession`, `SessionProvider`, `AuthGuard`).
3. Pages: `/login` — one field (email), house design, states: idle → sending → "Check {email} for your sign-in link" (with resend after 60 s) → error; uses `signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback?next=…`, shouldCreateUser: true } })`. Accept `?email=` to prefill (Landing-Page passes it). `/auth/callback` — handles both PKCE (`?code=` → `exchangeCodeForSession`) and implicit hash tokens (`#access_token=…` → `setSession`), then navigates to `next` or `/`; on error shows a short message with a link back to `/login`. Both routes are **public** (outside `AuthGuard`) and rendered on both hosts; `device-target.ts` must leave `/auth/callback` alone (a redirect mid-callback loses the code — add it to whatever exemption list exists, or exempt paths starting with `/auth/`).
4. Sign-out: an item in the desktop shell's user area and the mobile shell's menu → `signOut()` → `/login`. Show the signed-in email where the shell shows identity today (`useSession().email`).
5. `config.ts`: `isAuthEnabled = Boolean(import.meta.env.VITE_SUPABASE_URL)`; `VITE_TIMBAL_PROJECT_ID` no longer gates auth (keep it only if something non-auth still needs it — say what).
6. **Assistant**: make "Ask Signal" work with no Timbal token in the browser. Preferred: point the Timbal chat components at our API (`/api/workforce…`) with our `authFetch` if the library exposes a base-URL/fetch override (cite the `.d.ts`). Otherwise: a minimal in-house chat panel (input, streamed reply, thread kept in memory for the session) over the API's workforce routes, replacing `signal-assistant.tsx`'s dependency on `useWorkforces`/Timbal chat. Either way, grep proves no `@timbal-ai/timbal-react` runtime import that performs auth or reaches `*.timbal.ai` from the browser remains; the studio/gallery surfaces may keep their imports only if they are dev-only and off by default (`isStudioSidebarEnabled`, `isGalleryEnabled`) — state it.
7. `ui/.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; remove the `VITE_TIMBAL_PROJECT_ID` "enables auth" line. `ui/AGENTS.md`: auth section rewritten (≤ 20 lines).
8. Verification: `bun x tsc --noEmit`, eslint, `bun run build`; run the dev UI against a stubbed API or the real local API with `SUPABASE_URL` set to the real project and a real magic link to Davin's own email is **allowed** (it only sends one email) — if you do, say so and delete nothing. Screenshots of `/login` (desktop + mobile) via the repo's device preview if available.

## Task 4 — Landing-Page: hand the buyer to the sign-in link, not to a login wall

**Repo:** Landing-Page, branch `feat/signin-link-copy`. Read first: `src/components/CheckoutSuccess/CheckoutSuccess.tsx`, `src/app/api/checkout/session/route.ts`, `.env.example`, CLAUDE.md.

Build: in the confirmed state, copy becomes: heading "Payment confirmed", body "We've emailed a sign-in link to **{email}** — open it to enter Signal Pro. No password needed." Primary button "Open Signal Pro" → `${NEXT_PUBLIC_SIGNAL_PRO_APP_URL}/login?email=${encodeURIComponent(email)}` (so a buyer who lost the email can request a fresh link with one click). Secondary "Manage billing" unchanged. Pending/unconfirmed states unchanged. No other files. `pnpm typecheck` + `pnpm build`.

---

## Final review
One code-reviewer pass per repo (most capable model) with this file's constraints and the customer journey as the lens; special attention to: any Timbal surface reachable by a customer; token handling in the browser; 401 vs fail-open; the magic-link redirect allowlist matching what the code sends. Then the controller applies the migration, sets env (Timbal env is Nadia's side), and reports.
