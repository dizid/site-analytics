# Site Analytics Dashboard

Multi-user GA4 analytics dashboard with Google OAuth. Each user sees their own GA4 properties.

## Stack

- Vue 3 + TypeScript (Composition API, `<script setup>`)
- Vite 7 + @netlify/vite-plugin
- Tailwind CSS 4 (`@theme {}` in src/style.css)
- Netlify Functions (.mts, serverless)
- jose (JWT signing/verification)
- Netlify Blobs (server-side token storage)
- GA4 REST API (no gRPC SDK, no google-auth-library)

## Commands

```bash
npm run dev      # Local dev (Vite + Netlify Functions emulation via @netlify/vite-plugin)
npm run build    # TypeScript check (vue-tsc) + Vite production build
npm run preview  # Preview production build locally
```

Do NOT use `netlify dev` — the `@netlify/vite-plugin` handles function emulation.
Do NOT add Vite proxy for `/api` routes — the plugin handles this.

## Architecture

- **No router** — single page app
- **No Pinia** — composables with module-level singletons
- **No chart library** — hand-rolled SVG sparklines
- **No database** — Netlify Blobs for tokens, localStorage cache for analytics data
- **No gRPC** — REST fetch to GA4 Data API (keeps bundle < 50MB Netlify limit)
- **Google OAuth** — authorization code flow with `analytics.readonly` scope
- **Per-user GA4 access** — each user's own Google credentials, properties auto-discovered

## Key Files

### Backend (Netlify Functions)
- `netlify/functions/analytics.mts` — GET /api/analytics — per-user GA4 data with auto-discovery
- `netlify/functions/oauth-authorize.mts` — GET /api/oauth/authorize — redirect to Google OAuth
- `netlify/functions/oauth-callback.mts` — GET /api/oauth/callback — exchange code, mint JWT
- `netlify/functions/oauth-logout.mts` — POST /api/oauth/logout — revoke tokens, cleanup
- `netlify/functions/lib/auth.ts` — validateSession() (JWT), checkAllowedEmail()
- `netlify/functions/lib/jwt.ts` — mintSessionJwt(), verifySessionJwt() using jose
- `netlify/functions/lib/tokens.ts` — Netlify Blobs storage, Google token exchange/refresh

### Frontend (Vue 3)
- `src/App.vue` — root component: LoginScreen or Dashboard based on auth state
- `src/composables/useAnalyticsData.ts` — main data composable (fetch, cache, sort, view state)
- `src/composables/useAuth.ts` — OAuth JWT flow, localStorage persistence, user info
- `src/composables/useCache.ts` — generic localStorage TTL cache
- `src/composables/useDateRange.ts` — reactive 7d/30d/90d selection
- `src/lib/api.ts` — fetch wrapper with Bearer token + typed API methods
- `src/lib/formatters.ts` — number, bounce rate, duration formatting
- `src/types/analytics.ts` — all shared TypeScript interfaces (incl. UserInfo)

### Components
- `SiteCard.vue` — glass morphism card per property
- `SiteTable.vue` — dense sortable table view
- `DashboardHeader.vue` — title, date pills, view toggle, refresh, user avatar + logout
- `DateRangePicker.vue` — 7d / 30d / 90d pill selector
- `Sparkline.vue` — SVG trend line
- `StatBadge.vue` — single metric display
- `LoginScreen.vue` — Google sign-in button (glass morphism)
- `LoadingSkeleton.vue` — pulse skeleton cards during loading
- `ErrorBanner.vue` — error display with retry button

## Environment Variables

```
GOOGLE_CLIENT_ID      # Google OAuth 2.0 client ID
GOOGLE_CLIENT_SECRET  # Google OAuth 2.0 client secret
JWT_SECRET            # Random 64-char hex string (openssl rand -hex 32)
SITE_URL              # Base URL, no trailing slash (e.g. https://statpilot.mom)
ALLOWED_EMAILS        # Comma-separated email allowlist (empty = allow all authenticated users)
```

## API Endpoints

- `GET /api/oauth/authorize` — redirects to Google OAuth consent screen
- `GET /api/oauth/callback?code=&state=` — exchanges code, stores tokens, mints JWT, redirects to `/#token=<jwt>`
- `POST /api/oauth/logout` — header `Authorization: Bearer <jwt>`, revokes tokens
- `GET /api/analytics?days=7d|30d|90d` — header `Authorization: Bearer <jwt>`, returns ReportResponse

## Conventions

- TypeScript strict mode
- No console.log in production (console.error for server-side logging only)
- Secrets in .env only, never hardcoded
- Mobile-first, dark mode default
- Glass morphism UI pattern (bg-white/5 backdrop-blur-sm border-white/10)
- Tailwind CSS 4 with `@theme {}` tokens in src/style.css
- Composables use module-level singletons (state declared outside the exported function)
- GA4 endDate is always `"yesterday"` (today's data is partial)
- JWT signed with HS256, 24h expiry
- Google tokens stored server-side in Netlify Blobs (keyed by Google user ID)
- CSRF protection via httpOnly state cookie during OAuth flow

## Auth Flow

1. User clicks "Sign in with Google" → GET /api/oauth/authorize
2. Server sets CSRF state cookie, redirects to Google OAuth
3. User grants email + analytics.readonly permissions
4. Google redirects to /api/oauth/callback with authorization code
5. Server validates state, exchanges code for tokens, checks email allowlist
6. Stores refresh token in Netlify Blobs, mints 24h JWT
7. Redirects to /#token=<jwt> (fragment — never sent to server/logs)
8. Frontend reads hash, stores JWT in localStorage, clears hash

## Data Flow

1. Frontend sends GET /api/analytics with Authorization: Bearer <jwt>
2. Server validates JWT → gets user ID → reads refresh token from Netlify Blobs
3. Refreshes Google access token if expired (5-min buffer)
4. Auto-discovers user's GA4 properties via Admin API (accountSummaries)
5. Fans out REST requests to GA4 runReport per property (batches of 10)
6. Each property gets two reports: metrics+trend and traffic sources
7. Response cached in localStorage with 6h TTL (namespaced by user ID)

## GCP Setup

- Project: `fluid-b6251`
- OAuth consent screen: External, Testing mode
- Required APIs: Google Analytics Data API, Google Analytics Admin API
- OAuth scopes: openid, email, profile, analytics.readonly
- Redirect URIs: `{SITE_URL}/api/oauth/callback`
