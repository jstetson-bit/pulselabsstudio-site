# Store setup — the accounts only Jason can open

The store code is built and tested (see CHANGELOG v0.5). It stays "opening soon" until these exist. Claude does
everything after each step; Jason only does the sign-ups and hands over the keys named below.

## 1. Supabase (accounts, verification email, cart, orders, keys) — free plan
1. supabase.com → sign up → New project "pulselabs-store" (region: US East). Save the database password somewhere safe.
2. Hand Claude: Project URL and the **anon public** key (Project Settings → API). These two are public by design.
3. Claude then: runs `supabase/migrations/001_store.sql`, sets Auth → URL configuration (site
   `https://pulselabsstudio.com`, redirect `https://pulselabsstudio.com/account.html`), deploys the payment webhook,
   and stores the secrets. For those, Claude needs a Supabase **access token** (Account → Access Tokens) once.

## 2. Resend (so verification emails arrive, from your own address)
Supabase's built-in email sends only 2 emails an hour from a generic address and often lands in spam.
1. resend.com → sign up → Domains → add `pulselabsstudio.com` → it shows DNS records → add them where the domain
   is registered (Claude walks through it with screenshots of that registrar's screens).
2. Hand Claude a Resend API key. Claude connects it as Supabase's SMTP, sender `support@pulselabsstudio.com`.

## 3. Paddle (payments, PayPal, tax, receipts, refunds, saved payment details) — the reseller of record
1. paddle.com → sign up for Paddle Billing as Pulse National LLC. Paddle checks the business and reviews the
   website before it can take payments: the site needs Terms, a Refund policy and Privacy (Claude drafts the first
   two for you to read; not legal advice).
2. Start in the **sandbox** (sandbox-vendors.paddle.com) so we can test with fake cards first.
3. Hand Claude: the client-side token (Developer tools → Authentication), and after Claude gives you the webhook
   address, the notification secret.
4. Prices: you decide each product's site price (at or under its Play price) and any bundles; Claude creates them
   in Paddle and the catalog.

## 4. Pulse keys (Claude, no account needed)
`node store/keys/make-keypair.mjs` once: the private half goes only into Supabase secrets, the public half into
`store-config.js` and into every app (`store/keys/PulseKey.java` for Android, `store/keys/PulseKey.cs` for Windows).

## Before taking real money
- Check Google Play's current rules on selling unlock keys outside Play for apps also sold on Play (US rules changed
  after the Epic case). Claude researches this before launch.
- Play promo codes (500 per quarter per app) cover buyers who want the purchase on their Play account.
