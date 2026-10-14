# Meme’d frontend

This is the Next.js 16 App Router client for the Meme’d Campaign Payout Tracker. The full project setup, backend API, cookie/CSRF design, MongoDB transaction notes, and deployment guide are in the workspace-root [`README.md`](../README.md).

## Run locally

```sh
cp .env.example .env.local
pnpm install
pnpm dev
```

Set `NEXT_PUBLIC_API_URL` to the running Express API origin (default `http://localhost:4000`). Start the backend and a MongoDB replica set separately.

## Check

```sh
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Auth forms and dashboards are Client Components. The page entry points and layout remain Server Components; `proxy.ts` checks for an access-cookie presence for dashboard navigation, while Express remains the source of authorization truth.
