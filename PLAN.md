# Build Plan (Completed)

Original build plan for the GA4 multi-property analytics dashboard. All phases completed.

## Context

20+ low-traffic sites in Google Analytics. Switching between properties in GA's UI is tedious. This dashboard shows all properties at a glance.

## Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| GA4 client | `google-auth-library` + REST fetch | `@google-analytics/data` pulls 15MB gRPC/protobuf; Netlify has 50MB limit |
| State management | Composables (module-level singletons) | 3 composables, zero boilerplate; Pinia overkill here |
| Password protection | Server-validated + sessionStorage | Personal dashboard, but shouldn't be public |
| Charts | Hand-rolled SVG sparklines | 20+ chart.js instances is too heavy; sparklines are ~20 lines of SVG |
| Caching | localStorage with 6h TTL | GA4 data has 24-48h processing lag; no database needed |
| View modes | Cards + Table toggle | Cards for quick glance, table for sorting/comparing 20+ sites |
| Concurrency | Promise.allSettled in batches of 10 | Stays within GA4 API quota limits |
| End date | `"yesterday"` | Today's data is partial; yesterday is complete |

## GA4 API Gotchas

- Always `.replace(/\\n/g, "\n")` on `GA_PRIVATE_KEY` from env vars
- Property IDs are numeric only (not `UA-` format) — use as `properties/123456789`
- `bounceRate` must be explicitly requested in the metrics array
- Use `endDate: "yesterday"` for complete data (today's data is partial)
- Dimension/metric compatibility matters — don't mix user-scoped with event-scoped
- Rate limit: 10 concurrent requests per property, 200K tokens/property/day

## GA4 REST Endpoint

```
POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
Authorization: Bearer {token}
```

## Verification Checklist

- [x] `npm run dev` → dashboard loads at localhost
- [x] Password gate blocks access, correct password grants entry
- [x] `/api/properties` verifies service account access
- [x] `/api/analytics?days=7d` returns data for all properties
- [x] Date range selector switches between 7/30/90 days
- [x] Each site card shows metrics + sparkline + sources
- [x] Table view sorts by all columns
- [x] Page reload loads from localStorage cache instantly
- [x] Removed property ID → that card shows error, rest render
- [x] Mobile test: 375px width → single column, readable
- [x] `npm run build` → clean build, no TypeScript errors
- [x] Deploy to Netlify with env vars → works in production
