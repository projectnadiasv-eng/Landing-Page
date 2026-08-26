# Deploying, and switching checkout on

Two independent things: putting the site on your domain, and making the
Pricing buttons charge money. The site deploys and works fine with checkout
switched off — the CTAs just stay dead, exactly as the $97 tier does today.

Everything here is done **by you, in your own accounts**. Claude does not
handle API keys.

---

## 1. Stripe — build the catalogue

You have an account but no products yet.

### Create three Products, not one

One Product **per tier**. Do not put three Prices on a single Product.
Checkout and every invoice line shows the *Product* name, so three tiers
sharing one Product means three identical-looking line items and customers who
cannot tell what they bought.

In the Stripe Dashboard → **Product catalogue** → *Add product*, three times:

| Product name | Price | Billing period |
|---|---|---|
| Signal | 27.00 USD | Monthly, recurring |
| Signal Pro | 47.00 USD | Monthly, recurring |
| Signal Desk | 97.00 USD | Monthly, recurring |

Each one must be **recurring / monthly**, not one-time. The app creates
`mode: 'subscription'` sessions and a one-time Price will be rejected.

Copy each Price id — they look like `price_1Q...`. Not the product id
(`prod_...`); the Price id is the one under the pricing row.

### Create a restricted key, not a secret key

**Developers → API keys → Create restricted key.** Give it only:

| Permission | Access |
|---|---|
| Checkout Sessions | Write |
| Prices | Read |
| Subscriptions | Read |

Everything else: None. The result starts `rk_live_...`.

Use a restricted key rather than the `sk_live_...` secret key. A leaked `rk_`
scoped like the table above cannot issue refunds, read your payouts, or touch
your customers. A leaked `sk_` can do all three. The env var is still named
`STRIPE_SECRET_KEY` — that is just its name, the value should be the `rk_`.

Start in **test mode** (`rk_test_...`, `price_...` from test mode) and switch
to live once you have seen a test purchase work end to end.

---

## 2. Vercel — deploy

```
vercel login          # your account, your browser
vercel link           # attach this repo to a Vercel project
```

Then add the environment variables. Do this in the **Vercel dashboard**, under
Settings → Environment Variables, and tick **Sensitive** for the two secrets —
a sensitive variable is write-only, so the value never appears in logs or in
the UI again, not even to you.

| Name | Value | Sensitive |
|---|---|---|
| `STRIPE_SECRET_KEY` | your `rk_...` | **yes** |
| `STRIPE_WEBHOOK_SECRET` | your `whsec_...` (from step 3) | **yes** |
| `STRIPE_PRICE_SIGNAL` | `price_...` for $27 | no |
| `STRIPE_PRICE_PRO` | `price_...` for $47 | no |
| `STRIPE_PRICE_DESK` | `price_...` for $97 | no |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` | no |
| `SIGNAL_PRO_CRM_URL` | `https://nadia-sv.com` | no |
| `SIGNAL_PRO_LANDING_SECRET` | shared secret (see below) | **yes** |

`STRIPE_PRICE_DESK` is optional. Leave it unset and the Signal Desk button
stays a dead `#` link, which is what the site does today — the tier is visible
but not yet sellable. Setting it is what switches that tier on.

Deploy: `vercel --prod`, or just push to `main` once the repo is linked.

---

## 3. Stripe webhook

Only possible once the site has a public URL.

**Developers → Webhooks → Add endpoint**, pointing at:

```
https://yourdomain.com/api/webhook
```

Subscribe to exactly these eight events — they are the ones
`src/app/api/webhook/route.ts` branches on:

```
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` and redeploy.

**What the webhook does today:** verifies the signature, then forwards a
normalised (non-Stripe-shaped) event to project_nadia's Signal Pro CRM at
`SIGNAL_PRO_CRM_URL` — a separate repo (`nadia-sv.com`), authenticated with
`SIGNAL_PRO_LANDING_SECRET` (generate with `openssl rand -hex 32`, distinct
from every other secret on this page; the matching value must also be set as
`SIGNAL_PRO_LANDING_SECRET` on the project_nadia/`nadia-web` Vercel project).
The CRM tables (`spro_customers`/`spro_subscriptions`/`spro_invoices`) are the
actual grant of record; this repo never touches a database of its own. Do not
treat the checkout success page as fulfilment — a customer can close the tab
before it loads, and delayed payment methods settle minutes or days later.
Paid-checkout and invoice branches return a non-200 status if the CRM forward
fails, on purpose, so Stripe's own retry schedule covers a project_nadia
outage rather than the event being silently lost.

---

## 4. The domain

In Vercel: project → **Settings → Domains → Add**. Enter the domain.

Vercel then shows the **exact** DNS records to create at your registrar. Use
what it shows you rather than records copied from a guide — they differ by
setup. The usual shape is an `A` record for the apex (`yourdomain.com`) and a
`CNAME` for `www`.

Add those records at your registrar, then wait. DNS propagation is usually
minutes but can take up to 48 hours. Vercel issues the HTTPS certificate on
its own once the records resolve.

Then set `NEXT_PUBLIC_SITE_URL` to `https://yourdomain.com` and redeploy, so
Stripe returns customers to the right place after paying.

---

## 5. Test before going live

With test-mode keys, use card `4242 4242 4242 4242`, any future expiry, any
CVC. Confirm: the button opens Stripe, paying returns you to the site, and the
webhook shows a delivered `checkout.session.completed` in the Dashboard.

Only then swap the test key and test price ids for live ones.

---

## Still outstanding

- **Sales tax.** If you sell to US or EU customers you will likely need to
  collect tax. Stripe Tax handles it, but it collects nothing until you have an
  active *registration* in each jurisdiction — enabling the setting alone is
  the most common mistake. See Stripe's "Collect taxes for recurring payments".
- **Cancellation and plan changes.** There is nowhere for a customer to cancel
  or switch tier. Stripe's Customer Portal gives you that hosted, and is the
  usual next step after checkout works.
- **The pre-launch blockers in CLAUDE.md** still stand — simulated prices
  labelled "Live", unsourced figures attached to named politicians, and legal
  links pointing at a placeholder. Those are content problems, not code, and
  taking payments raises the stakes on all three.
