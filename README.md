# Meme’d Campaign Payout Tracker

A creator marketplace MVP for running view-based campaigns. Brands publish a platform, budget, and payout milestones. Creators browse live campaigns, submit Instagram or YouTube post links, and see current simulated payouts as views change. The tracker records payout accounting; it does not transfer money.

## Project checklist

- [x] Brand and creator signup/login with cookie sessions
- [x] Campaign creation, browsing, status controls, and brand statistics
- [x] One submission per creator and campaign
- [x] Absolute milestone payouts and incremental budget affordability
- [x] Transactional submission payout plus campaign budget accounting
- [x] Responsive public, brand, and creator experiences
- [x] Pure payout unit tests
- [x] Environment examples and deployment configuration
- [x] API integration and transaction concurrency test suite
- [ ] Live MongoDB/Vercel/EC2 deployment (credentials and domain not provided)

## Architecture

```text
frontend/  Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS 4
backend/   Express 5 + TypeScript + Mongoose + MongoDB
deployment/nginx/  Example reverse proxy for api.yourdomain.com
```

`User` has a `brand` or `creator` role. A `Campaign` belongs to one brand. `Submission` is the join record between a creator and campaign; it stores one post URL, view count, and current payout. There are no redundant campaign/user membership arrays.

### Monetary and milestone rules

- Milestones are absolute payout levels, not additive rewards. At 75,000 views with 10k → ₹500, 50k → ₹2,000, and 100k → ₹5,000, the target is ₹2,000.
- When views rise, the tracker chooses the highest eligible payout upgrade whose incremental cost fits the campaign’s remaining budget. If the upgrade is unaffordable, it preserves the existing payout.
- When views fall, payout is recalculated and any reduction is released back to the campaign budget. Repeated view updates have zero budget delta.
- Each creator can submit one post per campaign. The API checks this within the campaign transaction, which serializes concurrent submissions to the same campaign.
- Campaign `spentBudget` is adjusted in the same MongoDB transaction as the submission payout. The campaign version and prior spent amount are part of the conditional update, and transaction conflicts are retried by MongoDB’s transaction helper.
- Live campaigns with no remaining budget are omitted from browsing and cannot accept submissions. Paused campaigns stay paused when budget is released.

## Prerequisites

- Node.js 20 or newer
- pnpm 11 (the workspace package manager)
- MongoDB Atlas or a local MongoDB replica set (transactions require replica-set or sharded topology)

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and set distinct random access and refresh secrets (at least 32 characters each). Set `MONGODB_URI` to a replica-set URI and `FRONTEND_ORIGIN=http://localhost:3000`. Keep `COOKIE_DOMAIN` empty for localhost. The backend binds to `127.0.0.1` by default so it stays behind NGINX.
2. Copy `frontend/.env.example` to `frontend/.env.local`. The default API URL is `http://localhost:4000`.
3. Install each app’s packages: `pnpm --dir backend install` and `pnpm --dir frontend install`.
4. Start MongoDB, then run `pnpm dev:backend` and `pnpm dev:frontend` in separate terminals.
5. Open `http://localhost:3000` and create a brand or creator account.

Useful commands:

```sh
pnpm dev:backend
pnpm dev:frontend
pnpm build:backend
pnpm build:frontend
pnpm test:backend
```

The backend validates its required configuration at startup. Never commit `.env` files or put server secrets in `NEXT_PUBLIC_*` variables. The frontend’s only public setting is `NEXT_PUBLIC_API_URL`.

### MongoDB transactions

For a local replica set, start `mongod` with `--replSet rs0`, connect with `mongosh`, then run `rs.initiate()`. Use a URI such as `mongodb://127.0.0.1:27017/memed?replicaSet=rs0`. A standalone MongoDB instance will reject the payout transaction. Atlas shared and dedicated clusters support replica-set transactions; allow only the backend’s egress IPs in the Atlas network access list and require database authentication/TLS.

The API integration tests use `mongodb-memory-server` with a single-node replica set; on a fresh machine it downloads a MongoDB binary on the first test run.

## Authentication, cookies, and CSRF

Signup, login, refresh, logout, and session retrieval are handled by Express. Passwords use bcrypt. The access JWT lasts seven days; the refresh JWT lasts 30 days and is rotated on each refresh. The server stores only a SHA-256 digest of the current refresh token, which revokes a token after rotation or logout. JWTs are only in HttpOnly cookies and are never returned in JSON.

The access cookie uses `Path=/`. The refresh cookie uses `Path=/api/auth`, so it is sent to both `/api/auth/refresh` and `/api/auth/logout`. In production both use `Secure`, `SameSite=Lax`, and an environment-driven `COOKIE_DOMAIN` such as `yourdomain.com` with no scheme or port. This parent-domain cookie is necessary for `app.yourdomain.com` to send the access cookie to `api.yourdomain.com`. `SameSite=Lax` is suitable for sibling subdomains under the same schemeful site; the API still requires credentialed CORS with the exact configured `FRONTEND_ORIGIN`.

State-changing requests require a double-submit CSRF cookie/header pair (`memed_csrf` and `X-CSRF-Token`) and reject a mismatched Origin when present. The browser API client uses `credentials: include`, requests the CSRF token, attempts refresh once after a 401, then retries the original request once. The restricted refresh cookie path does not reach the frontend’s page route; the browser calls the API refresh endpoint directly, where the cookie path matches. The server-side `getServerSession()` forwards the access cookie explicitly because server-side `fetch` has no browser cookie jar. Next.js 16 `proxy.ts` is not used for session refresh; backend authorization remains authoritative.

For unrelated hosting-provider domains, parent-domain cookies cannot be shared; use custom subdomains under one domain as configured here. Localhost uses host-only, non-Secure cookies over HTTP.

## API reference

All JSON endpoints are under `/api`. Auth endpoints set cookies and return public user information, never tokens.

| Method and path | Access | Purpose |
|---|---|---|
| `GET /api/auth/csrf` | Public | Set/return a CSRF token for the browser header |
| `POST /api/auth/signup` | Public | `{ name, email, password, role: "brand" | "creator" }` |
| `POST /api/auth/login` | Public | `{ email, password }` |
| `POST /api/auth/refresh` | Refresh cookie | Rotate refresh session and issue new access cookie |
| `POST /api/auth/logout` | Refresh cookie when present | Revoke current refresh session and clear cookies |
| `GET /api/auth/me` | Access cookie | Return the current public user |
| `POST /api/campaigns` | Brand | `{ name, platform, totalBudget, milestones: [{ views, payout }] }` |
| `GET /api/campaigns?page=1&limit=12` | Public | Paginated live campaigns with budget available |
| `GET /api/campaigns/mine` | Brand | All campaigns belonging to the signed-in brand, including paused campaigns |
| `GET /api/campaigns/:id` | Public live campaign | Public campaign detail |
| `GET /api/campaigns/:id/stats` | Owning brand | Campaign plus associated submissions |
| `PATCH /api/campaigns/:id/status` | Owning brand | `{ status: "live" | "paused" }` |
| `POST /api/campaigns/:id/submissions` | Creator | `{ postUrl }` matching the campaign platform |
| `GET /api/submissions/mine` | Creator | Own submissions and sum of current payouts |
| `PATCH /api/submissions/:id/views` | Public simulation endpoint | `{ views: nonnegative integer }`; atomically updates payout accounting |

Example:

```sh
curl -X POST http://localhost:4000/api/campaigns \
  -H 'Content-Type: application/json' -H 'X-CSRF-Token: <csrf-cookie-value>' \
  --cookie 'memed_access=<cookie>; memed_csrf=<csrf-cookie-value>' \
  -d '{"name":"Summer creators","platform":"instagram","totalBudget":20000,"milestones":[{"views":10000,"payout":500},{"views":50000,"payout":2000},{"views":100000,"payout":5000}]}'
```

Creators see campaign name, platform, total budget, remaining budget, milestones, status, and creation date. They cannot see brand contact details or private campaign submissions. Brands use the ownership-checked stats endpoint. Instagram accepts `instagram.com` post/reel links; YouTube accepts `youtube.com` and `youtu.be` URLs. URL validation checks HTTPS and host only; it does not verify that a post exists or belongs to the submitting creator.

The simulated view endpoint intentionally has no role restriction to match the assignment. It still validates identifiers, JSON shape, integer/nonnegative bounds (up to 10 billion views), and performs transactional accounting. It must not be exposed as a trusted production platform-ingestion route; real ingestion needs a signed platform integration or internal authenticated service.

## Deployment

Deployment has not been performed. Replace every placeholder with actual domain, IP, account, and secret values before following these steps.

### Vercel frontend

1. Push the repository to a public GitHub repository when ready; the assignment requires public visibility. Repository visibility has not been changed here.
2. Import it into Vercel and set the project root directory to `frontend`.
3. Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` in Vercel’s production environment, deploy, and add `app.yourdomain.com` as a custom domain.
4. Confirm browser requests include credentials, API responses allow exactly `https://app.yourdomain.com`, and both auth cookies are present with the configured parent domain and Secure flag.

### EC2 API and NGINX

Build and launch with a process manager from `backend/`:

```sh
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production node dist/server.js
# Or: pm2 start dist/server.js --name memed-api
```

Set production environment values via a root-owned environment file or systemd `EnvironmentFile`; do not store secrets in the repository. Configure `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=4000`, the Atlas `MONGODB_URI`, distinct JWT secrets, `FRONTEND_ORIGIN=https://app.yourdomain.com`, and `COOKIE_DOMAIN=yourdomain.com`. Restrict the EC2 security group to SSH from trusted addresses and HTTP/HTTPS for certificate issuance and web traffic. Do not expose MongoDB.

An example reverse proxy is in [`deployment/nginx/memed-api.conf`](deployment/nginx/memed-api.conf). Point `api.yourdomain.com` at the EC2 public IP (an A record, or a CNAME to a stable DNS name). Run Certbot after DNS resolves, then use its HTTPS NGINX setup and renewal timer. Verify renewal with `certbot renew --dry-run`, check `systemctl status nginx`/`pm2 status`, and inspect service logs with `journalctl` or `pm2 logs`.

DNS records depend on Vercel’s domain instructions: commonly an apex or subdomain CNAME/A record for `app.yourdomain.com`, plus `api.yourdomain.com A <EC2_PUBLIC_IP>`. Use the actual values supplied by the hosting accounts, not these placeholders.

## Known limitations and security notes

- Role selection is open at signup for this assignment; a production marketplace should verify or invite brands.
- Simulated view updates are public, as required by the assignment. Do not treat their values as authoritative in production.
- Payouts are current accounting entries only. There is no withdrawal, settlement, tax, or transfer workflow.
- Refresh rotation is single-session per user: a new login replaces the stored refresh digest and revokes any prior device session.
- The UI exposes view simulation for demonstrating the assignment flow; real view counts require trusted ingestion.
- URL host validation cannot guarantee content ownership or platform policy compliance.
- The replica-set integration suite exercises authentication/roles, ownership, submission creation, repeated view updates, budget release, concurrency, and the campaign-spend reconciliation invariant.

## Scaling note: 10,000 creators

The stateless API can scale horizontally behind the NGINX/ALB layer once cookie signing secrets and `COOKIE_DOMAIN` are identical across instances. Keep connection pools bounded per instance so the aggregate pool does not exceed Atlas limits. Campaign browsing is a read-heavy path: the existing `{ status, createdAt }` and platform indexes support the current query; add compound indexes based on measured filters and sort patterns. Cache public campaign card data briefly at the edge or in Redis, with invalidation on campaign creation/status changes and budget changes. This cache is only a browsing optimization: the API must always read authoritative campaign and submission state inside a transaction before accepting a submission or awarding payout.

View ingestion should move to a signed webhook or internal queue. A queue can smooth bursts and let workers batch or serialize work by campaign. Popular campaigns create write contention because every payout competes on the same budget document. Keep the atomic campaign budget update as the authority; monitor transaction retries, latency, and abort rates. If contention becomes material, partitioning accounting by campaign or using a carefully designed reservation ledger may help, but the invariant that committed submissions and campaign spend agree must remain enforced. Add idempotency keys for external event delivery, rate limits per creator/IP, anomaly flags for rapid view spikes, and a reconciliation job that sums current submission payouts against campaign `spentBudget`. Do not use cached budget values to approve an award. Add observability for queue depth, MongoDB pool saturation, API 4xx/5xx rates, and transaction conflicts before optimizing further.
