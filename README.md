# FinStack Admin

The staff dashboard for [FinStack](https://github.com/Fabulouscode/finstack), the open-source fintech backend. Support, risk and finance staff see what's happening across the platform without writing API calls.

**Status:** the first version is complete: every screen on the [roadmap](#roadmap) is built.

## What it does

| Section | What staff can see | What they can do (if their role allows) |
| --- | --- | --- |
| **Overview** | What needs attention, money owed to wallet holders per currency, users and organizations | Jump straight to stuck payouts, refunds, reconciliation items or failed webhooks |
| **Payments** | Every payment, with filters; each with its timeline, conversion, fees and refunds | Refund (in full or part) and release held money early, both behind a confirmation |
| **Refunds** · **Payouts** | Every refund and payout; payouts with their masked bank account and failure reason | Retry a stuck refund; re-check a stuck payout with the provider (neither ever sends money twice) |
| **Users** · **Organizations** | Search; profile, wallets, memberships and recent payments | Suspend and reactivate; change a staff member's role; freeze and unfreeze wallets |
| **Audit log** | Every sensitive action, who took it, why, and from where | Filter by action, actor or target |
| **Reconciliation** | Mismatches between FinStack, the providers and the ledger, in plain words, side by side | Mark resolved with a note |
| **Webhooks** | Provider webhooks that failed, and the background queues | Replay one after fixing the cause (it can never credit twice) |

- **Staff only.** Customer accounts are refused at sign-in.
- **Roles decide what shows.** Each section and button appears only if the signed-in person's FinStack role allows it (asked of FinStack through `GET /v1/admin/me`). FinStack enforces every action itself as well.
- **Consequential actions ask first.** Suspensions, freezes and role changes need a reason, recorded in FinStack's audit log. Money-moving actions also need an explicit acknowledgement, and each refund form carries its own idempotency key, so a double-submitted refund is one refund.

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
- [x] Overview, with links to what needs attention
- [x] Payments, refunds and payouts: lists and details
- [x] Users, organizations and wallets: search, details, suspend, reactivate, freeze, roles
- [x] Audit log
- [x] Reconciliation items and failed webhooks: resolve and replay
- [x] Money-moving actions behind confirmation: refunds and early release of held money

Ideas for later: exporting lists to CSV, saved filters, and a dark theme.

## License

[MIT](./LICENSE)
