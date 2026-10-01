# FinStack Admin

The staff dashboard for [FinStack](https://github.com/Fabulouscode/finstack), the open-source fintech backend. Support, risk and finance staff see what's happening across the platform without writing API calls.

**Status:** early. Sign-in, the overview, payments and payment details are built; more screens are on the way (see [Roadmap](#roadmap)).

## What it does

- **Overview:** what needs attention (payouts and refunds still processing, open reconciliation items, failed webhooks), what's owed to wallet holders per currency, and users and organizations by status.
- **Payments:** every payment across the platform, newest first, filterable by status and provider. Each opens a page with its details, timeline and refunds (including why a refund failed).
- **Staff only:** customer accounts are refused at sign-in. What each person can see follows their FinStack role (`support`, `risk`, `finance`, `admin`), enforced by FinStack itself.

## How it's built

The dashboard is a [Next.js](https://nextjs.org) app that talks to FinStack only through its public API, with the same permissions, audit logs and rate limits as any other client. It has no database of its own and no special access.

### Sign-in and sessions (backend for frontend)

```
Browser ──cookie──▶ Dashboard server (Next.js) ──Bearer token──▶ FinStack API
```

- The dashboard's server signs in to FinStack and keeps the tokens in a session cookie that is **encrypted** (JWE, AES-256-GCM), **httpOnly** (JavaScript can't read it), `SameSite=Lax`, and `Secure` in production. FinStack tokens never reach the browser.
- Sessions end after `SESSION_MAX_AGE_HOURS` (8 by default), whatever the activity. Signing out also revokes the session at FinStack.
- **Refresh tokens are never reused.** FinStack rotates refresh tokens and treats reuse of an old one as theft. The request proxy (`src/proxy.ts`) refreshes access tokens shortly before they expire. Concurrent requests share one refresh, and requests still carrying the old token get its result (`src/lib/session/refresh.ts`). This is held in memory, so it's correct for **one dashboard server**. To run several, use sticky sessions or move that state to a shared store.
- Every page also checks the session itself (`src/lib/dal.ts`), so access never depends on the proxy alone. Server Actions check the request's origin.

### The FinStack client

Types are generated from FinStack's OpenAPI document, kept in `finstack-openapi.json`, so the dashboard only calls endpoints that exist, with the right parameters. To update after a FinStack release:

```bash
cp ../finstack/openapi.json finstack-openapi.json   # or download it from the release
npm run api:types
```

CI checks that the generated types match the committed document.

## Running it

You need a running FinStack (see its README) with at least one staff account. To make an account staff:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Then:

```bash
npm install
cp .env.example .env.local      # set FINSTACK_API_URL and SESSION_SECRET
npm run dev                     # http://localhost:3000, or: npm run dev -- -p 3100
```

If FinStack also runs on port 3000, start one of them on another port.

| Command | |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` · `npm run typecheck` | Checks |
| `npm run build` · `npm start` | Production build and server |
| `npm run api:types` | Regenerate FinStack's API types |

## Roadmap

- [x] Staff sign-in, sessions and refresh
- [x] Overview
- [x] Payments list
- [x] Payment details: timeline, conversion, fees and refunds
- [ ] Refund and payout details, with retry and sync actions
- [ ] Refunds and payouts lists
- [ ] Users and organizations: search, details, suspend and reactivate
- [ ] Audit log
- [ ] Reconciliation items and failed webhooks
- [ ] Money-moving actions (refunds, releases) behind confirmation

## License

[MIT](./LICENSE)
