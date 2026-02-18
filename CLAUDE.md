# Site Analytics Dashboard

GA4 multi-property analytics dashboard. Shows all sites at a glance.

## Stack

- Vue 3 + TypeScript (Composition API, `<script setup>`)
- Vite 7 + @netlify/vite-plugin
- Tailwind CSS 4 (`@theme {}` in src/style.css)
- Netlify Functions (.mts, serverless)
- google-auth-library + GA4 REST API (no gRPC SDK)

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
- **No database** — localStorage cache with 6h TTL
- **No gRPC** — REST fetch to GA4 Data API (keeps bundle < 50MB Netlify limit)

## Key Files

### Backend (Netlify Functions)
- `netlify/functions/analytics.mts` — GET /api/analytics — main GA4 data endpoint (batched runReport)
- `netlify/functions/auth.mts` — POST /api/auth — password verification (constant-time compare)
- `netlify/functions/properties.mts` — GET /api/properties — property discovery utility
- `netlify/functions/lib/auth.ts` — shared auth utilities: password validation, Google Auth token

### Frontend (Vue 3)
- `src/App.vue` — root component: PasswordGate or Dashboard based on auth state
- `src/composables/useAnalyticsData.ts` — main data composable (fetch, cache, sort, view state)
- `src/composables/useAuth.ts` — login/logout, sessionStorage persistence
- `src/composables/useCache.ts` — generic localStorage TTL cache
- `src/composables/useDateRange.ts` — reactive 7d/30d/90d selection
- `src/lib/api.ts` — fetch wrapper with password header + typed API methods
- `src/lib/formatters.ts` — number, bounce rate, duration formatting
- `src/types/analytics.ts` — all shared TypeScript interfaces

### Components
- `SiteCard.vue` — glass morphism card per property
- `SiteTable.vue` — dense sortable table view
- `DashboardHeader.vue` — title, date pills, view toggle, refresh, logout
- `DateRangePicker.vue` — 7d / 30d / 90d pill selector
- `Sparkline.vue` — SVG trend line
- `StatBadge.vue` — single metric display
- `PasswordGate.vue` — full-screen glass card login
- `LoadingSkeleton.vue` — pulse skeleton cards during loading
- `ErrorBanner.vue` — error display with retry button

## Environment Variables

```
DASHBOARD_PASSWORD    # Password for dashboard access
GA_CLIENT_EMAIL       # Google service account email
GA_PRIVATE_KEY        # Service account private key (with \n escapes)
GA_PROPERTY_IDS       # Comma-separated GA4 property IDs (e.g. properties/123,properties/456)
GA_PROPERTY_NAMES     # Comma-separated display names (same order as IDs, optional)
```

## API Endpoints

- `POST /api/auth` — body `{ password }`, returns `{ success: true }` or 401
- `GET /api/analytics?days=7d|30d|90d` — header `x-dashboard-password`, returns ReportResponse
- `GET /api/properties` — header `x-dashboard-password`, returns PropertyInfo[]

## Conventions

- TypeScript strict mode
- No console.log in production (console.error for server-side logging only)
- Secrets in .env only, never hardcoded
- Mobile-first, dark mode default
- Glass morphism UI pattern (bg-white/5 backdrop-blur-sm border-white/10)
- Tailwind CSS 4 with `@theme {}` tokens in src/style.css
- Composables use module-level singletons (state declared outside the exported function)
- GA4 endDate is always `"yesterday"` (today's data is partial)
- GA4 private key: always `.replace(/\\n/g, "\n")` from env vars

## Data Flow

1. User enters password → POST /api/auth → password stored in sessionStorage
2. App fetches GET /api/analytics?days=7d with x-dashboard-password header
3. Netlify Function authenticates with Google via service account
4. Fans out REST requests to GA4 runReport per property (batches of 10)
5. Each property gets two reports: metrics+trend and traffic sources
6. Response cached in localStorage with 6h TTL
7. On revisit: loads from cache instantly, no API call needed
