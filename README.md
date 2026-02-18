# Site Analytics Dashboard

A single-page GA4 multi-property analytics dashboard built with Vue 3. View all your Google Analytics properties at a glance — no more switching between properties in the GA4 UI.

Password-protected, serverless, deployable on Netlify in minutes.

## Features

- **Multi-property overview** — see sessions, users, pageviews, bounce rate, and avg. duration for all your sites in one place
- **Two view modes** — responsive card grid or dense sortable table
- **SVG sparklines** — hand-rolled trend lines per property (no chart library)
- **Traffic sources** — top 5 channel groups per property
- **Date range selector** — 7d / 30d / 90d with instant switching
- **Sortable columns** — sort by any metric, ascending or descending
- **Smart caching** — localStorage with 6-hour TTL; loads instantly on revisit
- **Password protection** — server-validated with constant-time comparison and brute-force delay
- **Mobile-first** — responsive grid, dark mode, glass morphism UI
- **Lightweight** — zero runtime dependencies beyond Vue; no gRPC, no Pinia, no chart.js, no router

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, TypeScript, Composition API (`<script setup>`) |
| Styling | Tailwind CSS 4 (`@theme {}` tokens) |
| Build | Vite 7 |
| Backend | Netlify Functions (serverless, `.mts`) |
| GA4 Auth | `google-auth-library` (service account) |
| GA4 Data | REST API (`analyticsdata.googleapis.com/v1beta`) |
| Hosting | Netlify |

## Architecture

```
Browser (Vue 3 SPA)
  ├── PasswordGate ──POST /api/auth──▶ validates DASHBOARD_PASSWORD env var
  └── Dashboard ─────GET /api/analytics?days=7d──▶ Netlify Function
                                                    ├── google-auth-library (service account → Bearer token)
                                                    └── REST fetch → GA4 Data API v1beta (per-property runReport)
                                                        ↕ Promise.allSettled (batches of 10)
  ↕ localStorage cache (6h TTL)
```

**Key design decisions:**

| Decision | Choice | Why |
|----------|--------|-----|
| GA4 client | `google-auth-library` + REST | `@google-analytics/data` pulls 15MB gRPC/protobuf; Netlify has 50MB limit |
| State | Composables (module-level singletons) | 3 composables, zero boilerplate; Pinia overkill for this scope |
| Charts | Hand-rolled SVG sparklines | 20+ chart.js instances is heavy; sparklines are ~20 lines of SVG math |
| Caching | localStorage with 6h TTL | GA4 data has 24-48h processing lag; no database needed |
| Concurrency | Promise.allSettled in batches of 10 | Stays within GA4 API quota limits |
| End date | `"yesterday"` | Today's data is partial; yesterday is complete |

## Prerequisites

1. A **Google Cloud project** with these APIs enabled:
   - Google Analytics Data API
   - Google Analytics Admin API
2. A **service account** with a JSON key
3. The service account added as **Viewer** in GA4 (Admin → Account Access Management, at the account level)

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

Edit `.env` with your values:

```bash
DASHBOARD_PASSWORD=your-secret-password
GA_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GA_PROPERTY_IDS=properties/123456789,properties/987654321
GA_PROPERTY_NAMES=My Site,Another Site
```

### 3. Discover your property IDs

If you don't know your GA4 property IDs, start the dev server and use the discovery endpoint:

```bash
npm run dev
# Then in another terminal:
curl -H "x-dashboard-password: your-secret-password" http://localhost:8888/api/properties
```

This returns all properties accessible to your service account. Copy the IDs into `GA_PROPERTY_IDS`.

### 4. Run locally

```bash
npm run dev
```

Opens at `http://localhost:8888`. The `@netlify/vite-plugin` emulates Netlify Functions locally — no need for `netlify dev`.

### 5. Deploy to Netlify

1. Push to GitHub
2. Connect the repo in Netlify
3. Set the 5 environment variables in Netlify dashboard (Site settings → Environment variables)
4. Deploy — build command and publish directory are configured in `netlify.toml`

## Commands

```bash
npm run dev      # Local dev server with Netlify Functions emulation
npm run build    # TypeScript check + production build
npm run preview  # Preview the production build locally
```

## Project Structure

```
site-analytics/
├── index.html                          # Entry point
├── vite.config.ts                      # Vite + Vue + Tailwind + Netlify plugins
├── netlify.toml                        # Build/deploy config + security headers
├── .env.example                        # Required environment variables
│
├── src/
│   ├── main.ts                         # Vue app bootstrap
│   ├── App.vue                         # Root — PasswordGate or Dashboard
│   ├── style.css                       # Tailwind CSS 4 @theme tokens
│   │
│   ├── types/
│   │   └── analytics.ts                # All shared TypeScript interfaces
│   │
│   ├── composables/
│   │   ├── useAuth.ts                  # Login/logout, sessionStorage persistence
│   │   ├── useDateRange.ts             # Reactive 7d/30d/90d selection
│   │   ├── useAnalyticsData.ts         # Fetch, cache, sort, view state orchestration
│   │   └── useCache.ts                 # Generic localStorage cache with TTL
│   │
│   ├── lib/
│   │   ├── api.ts                      # Fetch wrapper with password header + typed methods
│   │   └── formatters.ts               # Number, bounce rate, duration formatting
│   │
│   └── components/
│       ├── PasswordGate.vue            # Full-screen glass card login
│       ├── DashboardHeader.vue         # Title, date pills, view toggle, refresh, logout
│       ├── DateRangePicker.vue         # 7d / 30d / 90d pill selector
│       ├── SiteCard.vue                # Glass morphism card per property
│       ├── SiteTable.vue               # Dense sortable table view
│       ├── Sparkline.vue               # SVG trend line component
│       ├── StatBadge.vue               # Single metric display
│       ├── LoadingSkeleton.vue         # Pulse skeleton cards during loading
│       └── ErrorBanner.vue             # Error display with retry button
│
└── netlify/
    └── functions/
        ├── lib/
        │   └── auth.ts                 # Shared: password validation, Google Auth token
        ├── auth.mts                    # POST /api/auth — password verification
        ├── analytics.mts               # GET /api/analytics — main GA4 data endpoint
        └── properties.mts              # GET /api/properties — property discovery utility
```

## API Endpoints

### `POST /api/auth`

Validates the dashboard password.

- **Body:** `{ "password": "string" }`
- **Returns:** `{ "success": true }` or `401`

### `GET /api/analytics?days=7d|30d|90d`

Fetches aggregated GA4 data for all configured properties.

- **Header:** `x-dashboard-password: <password>`
- **Returns:** `ReportResponse` — array of property results with metrics, sparkline trend data, and top traffic sources

### `GET /api/properties`

Lists all GA4 properties accessible to the service account (setup utility).

- **Header:** `x-dashboard-password: <password>`
- **Returns:** `PropertyInfo[]` — array of `{ propertyId, displayName }`

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

## Security

- Password validated server-side with **constant-time comparison** (prevents timing attacks)
- Failed login attempts have a **1-second delay** (brute-force mitigation)
- Password sent via `x-dashboard-password` header on every API call
- Session stored in `sessionStorage` (cleared on tab close)
- Security headers configured in `netlify.toml`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- No CORS headers (same-origin on Netlify)

## Caching

- On load: check localStorage cache → if fresh (< 6 hours), render instantly with zero API calls
- If stale or missing: fetch from API, store in cache
- Manual "Refresh" button bypasses cache
- Date range change loads that range's cache (or fetches if missing)
- Cache key pattern: `ga4:${dateRange}` (e.g., `ga4:7d`)

## Error Handling

- **Single property fails** — that card shows an error state, all other properties render normally
- **All properties fail** — global error banner with retry button
- **Auth error (401)** — clears session and redirects to password gate
- **Missing env vars** — descriptive error logged server-side, generic error returned to client
- **Stale requests** — monotonic fetch counter discards responses from superseded requests

## License

Private project.
