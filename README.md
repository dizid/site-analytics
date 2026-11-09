# StatPilot — GA4 Multi-Property Analytics Dashboard

A single-page GA4 analytics dashboard built with Vue 3. Sign in with Google, and see every GA4 property your account can access in one place — no more switching properties in the GA4 UI.

Multi-user: each visitor authenticates with their own Google account and sees only *their* properties. No shared password, no service account, no database.

Production: **https://statpilot.mom**

## Features

- **Google sign-in** — OAuth 2.0 authorization code flow, `analytics.readonly` scope
- **Per-user property discovery** — properties auto-discovered from the signed-in user's own GA4 account
- **Multi-property overview** — sessions, active users, new users, pageviews, bounce rate, avg. duration for all properties at once
- **Aggregate KPIs** — portfolio-wide totals above the property list
- **Two view modes** — responsive card grid or dense sortable table
- **Per-property detail** — top pages, device breakdown, top countries
- **SVG sparklines** — hand-rolled trend lines per property (no chart library)
- **Traffic sources** — top channel groups per property
- **Date range selector** — 7d / 30d / 90d with instant switching
- **Sortable columns** — sort by any metric, ascending or descending
- **Smart caching** — localStorage with 6-hour TTL, namespaced per user; loads instantly on revisit
- **Mobile-first** — responsive grid, dark mode, glass morphism UI
- **Static marketing pages** — landing page, `/privacy`, `/terms`, and a build-time generated `/blog`
- **Lightweight** — no Pinia, no router, no chart library, no gRPC

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, TypeScript, Composition API (`<script setup>`) |
| Styling | Tailwind CSS 4 (`@theme {}` tokens in `src/style.css`) |
| Build | Vite 7 + `@netlify/vite-plugin` |
| Backend | Netlify Functions (serverless, `.mts`) |
| Sessions | `jose` — HS256 JWT, 24h expiry |
| Token storage | Netlify Blobs (Google refresh tokens, keyed by Google user ID) |
| GA4 auth | Google OAuth 2.0 per user (no service account, no `google-auth-library`) |
| GA4 Data | REST API (`analyticsdata.googleapis.com/v1beta`) |
| Blog | `marked`, generated at build time by `scripts/build-blog.mjs` |
| Hosting | Netlify |

## Architecture

```
Browser (Vue 3 SPA)
  ├── LandingPage ──GET /api/oauth/authorize──▶ Netlify Function ──▶ Google consent screen
  │                                                                         │
  │◀── redirect to /#token=<jwt> ── GET /api/oauth/callback?code= ──────────┘
  │      (validates state cookie, exchanges code, stores refresh token in Blobs, mints JWT)
  │
  └── Dashboard ──GET /api/analytics?days=7d──▶ Netlify Function
                 ──GET /api/analytics-detail?property=...──▶  │
                                                              ├── verifySessionJwt (jose)
                                                              ├── getValidAccessToken (Blobs → refresh if near expiry)
                                                              └── GA4 runReport fan-out (batches of 10)
  ↕ localStorage (JWT + analytics cache, 6h TTL, namespaced by user ID)
```

**Key design decisions:**

| Decision | Choice | Why |
|----------|--------|-----|
| GA4 auth | Google OAuth per user, not a service account | A service account can only see properties explicitly shared with it; each user must see their own |
| Sessions | `jose` HS256 JWT, 24h | Zero-config, ~40KB, no gRPC; `google-auth-library` was removed as dead weight |
| Refresh tokens | Netlify Blobs, server-side only | Tokens never reach the browser |
| Session transport | URL fragment → localStorage | Fragments are never sent to the server or written to access logs |
| GA4 client | REST fetch, no `@google-analytics/data` | The gRPC/protobuf SDK pulls ~15MB; Netlify functions have a 50MB bundle limit |
| State | Composables (module-level singletons) | 4 composables, zero boilerplate; Pinia overkill for this scope |
| Charts | Hand-rolled SVG sparklines | 20+ chart.js instances is heavy; sparklines are ~20 lines of SVG math |
| Caching | localStorage with 6h TTL | GA4 data has 24-48h processing lag; no database needed |
| Concurrency | Batched fan-out in groups of 10 | Stays within GA4 API quota limits |
| End date | `"yesterday"` | Today's data is partial; yesterday is complete |

## Prerequisites

1. A **Google Cloud project** with these APIs enabled:
   - Google Analytics Data API
   - Google Analytics Admin API
2. An **OAuth 2.0 client** (Web application) with authorized redirect URIs:
   - `https://<your-domain>/api/oauth/callback`
   - `http://localhost:5173/api/oauth/callback`
3. An **OAuth consent screen** configured with the scopes `openid`, `email`, `profile`, `analytics.readonly`

See `CLAUDE.md` for the current GCP project ID, OAuth client name, and the exact redirect URI list.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/dizid/site-analytics.git
cd site-analytics
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `JWT_SECRET` | Random 64-char hex string (`openssl rand -hex 32`) |
| `SITE_URL` | Base URL, no trailing slash (e.g. `http://localhost:5173`) |
| `ALLOWED_EMAILS` | Comma-separated email allowlist; empty = allow any authenticated user |

### 3. Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`. `@netlify/vite-plugin` emulates Netlify Functions and the `netlify.toml` redirects inside Vite's dev server.

> Do **not** run `netlify dev`, and do **not** add a Vite proxy for `/api` routes — the plugin handles both.

### 4. Deploy to Netlify

1. Push to GitHub
2. Connect the repo in Netlify
3. Set the 5 environment variables in the Netlify dashboard (Site settings → Environment variables)
4. Deploy — build command, publish directory, and functions directory are configured in `netlify.toml`

After changing any environment variable, redeploy: functions don't pick up changes until the next deploy.

### Optional: Cloudflare Web Analytics

Cloudflare Web Analytics sites can be shown next to the GA4 properties, with a "GA4" / "Cloudflare" source badge. The data comes from one Cloudflare account, so only `CF_OWNER_EMAIL` sees it; every other user gets the normal GA4-only dashboard. Leave the variables unset to turn it off.

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with **Account → Account Analytics → Read**. Add **Account → Account Settings → Read** to also list sites that have no traffic yet. Server-side only |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CF_OWNER_EMAIL` | The Google account email allowed to see the Cloudflare data |

- `GET /api/cloudflare?days=7d|30d|90d` (`Authorization: Bearer <jwt>`): all sites, with current + previous period and a daily trend
- `GET /api/cloudflare?site=<id>&days=7d|30d|90d`: one site's top pages, referrers, countries and devices
- Cloudflare visits are shown as sessions, pageviews as pageviews; users, new users, bounce rate and duration show "–". GA4 and Cloudflare totals are kept in separate KPI rows, and a hostname that exists in both is shown as a side-by-side pair (never summed)
- When the owner is signed in and a variable is missing, the dashboard shows a one-line hint

## Commands

```bash
npm run dev      # Local dev server with Netlify Functions emulation
npm run build    # TypeScript check (vue-tsc) + production build + blog generation
npm run preview  # Preview the production build locally
```

## Project Structure

```
site-analytics/
├── index.html                          # Entry point
├── vite.config.ts                      # Vite + Vue + Tailwind + Netlify plugins
├── netlify.toml                        # Build/deploy config, /api redirects, security headers
├── .env.example                        # Required environment variables
│
├── src/
│   ├── main.ts                         # Vue app bootstrap
│   ├── App.vue                         # Root — LandingPage or Dashboard based on auth state
│   ├── style.css                       # Tailwind CSS 4 @theme tokens
│   │
│   ├── types/
│   │   └── analytics.ts                # All shared TypeScript interfaces (incl. UserInfo)
│   │
│   ├── composables/
│   │   ├── useAuth.ts                  # OAuth JWT flow, localStorage persistence, user info
│   │   ├── useAnalyticsData.ts         # Fetch, cache, sort, detail view orchestration
│   │   ├── useCache.ts                 # Generic localStorage cache with TTL
│   │   └── useDateRange.ts             # Reactive 7d/30d/90d selection
│   │
│   ├── lib/
│   │   ├── api.ts                      # Fetch wrapper with Bearer token + typed methods
│   │   └── formatters.ts               # Number, bounce rate, duration formatting
│   │
│   └── components/
│       ├── LandingPage.vue             # Signed-out marketing landing page
│       ├── DashboardHeader.vue         # Title, date pills, view toggle, refresh, avatar, logout
│       ├── AggregateKPIs.vue           # Portfolio-wide totals
│       ├── DateRangePicker.vue         # 7d / 30d / 90d pill selector
│       ├── SiteCard.vue                # Glass morphism card per property
│       ├── SiteTable.vue               # Dense sortable table view
│       ├── PropertyDetail.vue          # Single-property breakdown (pages, devices, countries)
│       ├── Sparkline.vue               # SVG trend line component
│       ├── StatBadge.vue               # Single metric display
│       ├── LoadingSkeleton.vue         # Pulse skeleton cards during loading
│       ├── ErrorBanner.vue             # Error display with retry button
│       └── AppFooter.vue               # Footer with privacy/terms links
│
├── netlify/
│   └── functions/
│       ├── lib/
│       │   ├── auth.ts                 # validateSession() (JWT), checkAllowedEmail()
│       │   ├── jwt.ts                  # mintSessionJwt(), verifySessionJwt() via jose
│       │   └── tokens.ts               # Netlify Blobs storage, Google token exchange/refresh
│       ├── analytics.mts               # GET /api/analytics
│       ├── analytics-detail.mts        # GET /api/analytics-detail
│       ├── oauth-authorize.mts         # GET /api/oauth/authorize
│       ├── oauth-callback.mts          # GET /api/oauth/callback
│       └── oauth-logout.mts            # POST /api/oauth/logout
│
├── scripts/
│   └── build-blog.mjs                  # content/blog/*.md → dist/blog/ (run by npm run build)
│
├── content/
│   ├── blog/                           # Markdown blog posts with YAML frontmatter
│   ├── social/                         # Social post copy
│   └── *.md                            # Launch posts, email sequences, pricing copy
│
└── public/
    ├── privacy.html                    # /privacy (required for Google OAuth verification)
    ├── terms.html                      # /terms
    ├── robots.txt, sitemap.xml         # Crawler metadata
    └── favicon.svg, og-image.png       # Brand assets
```

## API Endpoints

All endpoints are same-origin Netlify Functions, reachable through the redirects in `netlify.toml`.

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/oauth/authorize` | GET | — | Sets an httpOnly CSRF state cookie, redirects to the Google consent screen |
| `/api/oauth/callback` | GET | state cookie | Validates state, exchanges code, stores refresh token, mints JWT, redirects to `/#token=<jwt>` |
| `/api/oauth/logout` | POST | `Bearer` | Revokes Google tokens, deletes the server-side token record |
| `/api/analytics` | GET | `Bearer` | Auto-discovers properties, returns metrics + sparkline trend + traffic sources for all of them |
| `/api/analytics-detail` | GET | `Bearer` | Per-property: top 10 pages, device breakdown, top 10 countries |

`/api/analytics?days=` and `/api/analytics-detail?days=` accept `7d`, `30d`, or `90d`. Invalid values fall back to `7d`.

## Auth Flow

1. User clicks **Sign in with Google** → `GET /api/oauth/authorize`
2. Server sets an httpOnly CSRF state cookie and redirects to Google
3. User grants `openid`, `email`, `profile`, `analytics.readonly`
4. Google redirects to `/api/oauth/callback?code=...&state=...`
5. Server validates state, exchanges the code for tokens, and checks the email allowlist
6. The refresh token is stored in Netlify Blobs (keyed by Google user ID); a 24h JWT is minted
7. Server redirects to `/#token=<jwt>` — a fragment, so it is never sent to the server or written to logs
8. Frontend reads the hash, stores the JWT in localStorage, and clears the hash from the URL bar

The client decodes the JWT payload **for display only** (name, email, avatar, local expiry check). The server re-verifies the signature on every API call — client-decoded claims are never trusted for authorization.

Unauthorized users are redirected back with `/#error=not_authorized` rather than receiving a raw 401 page.
## Metrics Displayed

| Metric | GA4 API Name | Display Format |
|--------|-------------|----------------|
| Sessions | `sessions` | Formatted number |
| Active Users | `activeUsers` | Formatted number |
| New Users | `newUsers` | Formatted number |
| Pageviews | `screenPageViews` | Formatted number |
| Bounce Rate | `bounceRate` | Percentage (XX.X%) |
| Avg Duration | `averageSessionDuration` | mm:ss |
| Trend | daily `sessions` | SVG sparkline |
| Top Sources | `sessionDefaultChannelGroup` | Text badges |
| Top Pages | `pagePath` + `screenPageViews` | Detail view list |
| Devices | `deviceCategory` | Detail view breakdown |
| Countries | `country` | Detail view list |

## Security

- JWT signature **verified server-side on every request** (`jose`, HS256, 24h expiry)
- Google refresh tokens stored **server-side only** (Netlify Blobs) — never exposed to the browser
- CSRF protection via an httpOnly `state` cookie during the OAuth flow
- Optional email allowlist (`ALLOWED_EMAILS`); empty means any authenticated Google user
- Read-only scope (`analytics.readonly`) — the app cannot modify any GA4 data
- Security headers configured in `netlify.toml`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- No CORS headers — same-origin only
- Secrets live in `.env` locally and Netlify env vars in production, never in source
- No `console.log` in production code; `console.error` for server-side logging only

## Caching

- On load: check localStorage cache → if fresh (< 6 hours), render instantly with zero API calls
- If stale or missing: fetch from API, store in cache
- Manual **Refresh** button bypasses cache
- Cache keys are namespaced per user (`ga4:<userId>:<dateRange>`) and cleared on logout
- Date range change loads that range's cache (or fetches if missing)

## Error Handling

- **Single property fails** — that card shows an error state, all other properties render normally
- **All properties fail** — global error banner with retry button
- **Auth error (401)** — clears the local session and forces re-login
- **Expired Google token** — transparently refreshed; if the refresh fails, the user is asked to sign in again
- **Missing env vars** — descriptive error logged server-side, generic error returned to the client
- **Stale requests** — monotonic fetch counter discards responses from superseded requests

## Documentation Map

| File | Contents |
|------|----------|
| `CLAUDE.md` | Working instructions, architecture summary, conventions, deployment facts |
| `README.md` | This file — setup, architecture, API reference |
| `GOOGLE.md` | Step-by-step guide to exiting OAuth "Testing" mode (verification submission) |
| `todo.md` | Open issue: shared OAuth client branding across Dizid apps |
| `PLAN.md`, `planB.md` | Product planning |
| `dev.md` | Local-only credentials and GCP identifiers (gitignored) |

## License

Private project. All rights reserved.
