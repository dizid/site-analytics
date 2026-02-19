# Dashboard Redesign Spec

Design reference created from Google Stitch export. This document is the implementation spec for restyling the StatPilot multi-property analytics dashboard.

**Scope:** Restyle the existing single-page dashboard using the Stitch design language. No router, no new API endpoints, same composable architecture.

**Out of scope (future work):** Master-detail pages (drilling into a single property), real-time data, per-page breakdowns, geography/world map, 24h/custom date ranges. These require new API endpoints.

---

## 1. Design System

### Colors

| Token | Current Value | New Value | Usage |
|-------|--------------|-----------|-------|
| `--color-accent` | `#6366f1` (indigo) | `#137fec` (blue) | Primary CTA, active states, sparklines, links |
| `--color-accent-hover` | `#4f46e5` | `#1171d4` | Button hover |
| `--color-surface` | `#0f172a` | `#0a0f14` | Page background |
| `--color-surface-card` | `rgba(255,255,255,0.05)` | `#161c24` | Card backgrounds (solid, not glass) |
| `--color-surface-card-hover` | `rgba(255,255,255,0.08)` | `#1c2430` | Card hover |
| `--color-border` | `rgba(255,255,255,0.1)` | `rgba(148,163,184,0.08)` | Card/section borders |
| `--color-border-hover` | `rgba(255,255,255,0.2)` | `rgba(148,163,184,0.15)` | Hover borders |
| `--color-text-primary` | `#f8fafc` | `#f8fafc` | No change |
| `--color-text-secondary` | `#94a3b8` | `#94a3b8` | No change |
| `--color-text-muted` | `#64748b` | `#64748b` | No change |
| `--color-success` | `#22c55e` | `#22c55e` | No change |
| `--color-danger` | `#ef4444` | `#ef4444` | No change |

### Typography

- **Font:** Inter (Google Fonts), weights 400, 500, 600, 700, 800
- **Import:** `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`
- **Body:** `font-family: 'Inter', system-ui, -apple-system, sans-serif;`
- **Headings:** `font-bold` to `font-extrabold` depending on hierarchy
- **Labels:** `text-[10px] font-bold uppercase tracking-wider` for metric labels
- **Values:** `text-lg font-bold` to `text-2xl font-bold` for metric values

### Card Pattern

**Before (glass morphism):**
```
bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5
hover:bg-white/[0.08] hover:border-white/20
```

**After (solid dark cards):**
```
bg-surface-card border border-border rounded-2xl p-5 shadow-sm
hover:bg-surface-card-hover hover:border-border-hover
```

Key change: Moving from translucent glass to solid dark cards. This is cleaner and performs better (no backdrop-blur).

### Border Radius
- Cards: `rounded-2xl` (1.25rem)
- Inner elements (metric boxes, pills): `rounded-xl` (0.75rem)
- Buttons, inputs: `rounded-lg` (0.5rem) or `rounded-full` for circle buttons
- Progress bars: `rounded-full`

### Spacing
- Page padding: `px-5` on mobile, `px-6 sm:px-8` on desktop
- Card padding: `p-5`
- Card gaps: `space-y-4` (vertical stack)
- Inner metric grids: `gap-4`
- Max width: `max-w-md mx-auto` on mobile, `max-w-7xl` on desktop

---

## 2. Theme Token Changes

**File:** `src/style.css`

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@theme {
  --color-accent: #137fec;
  --color-accent-hover: #1171d4;
  --color-surface: #0a0f14;
  --color-surface-card: #161c24;
  --color-surface-card-hover: #1c2430;
  --color-border: rgba(148, 163, 184, 0.08);
  --color-border-hover: rgba(148, 163, 184, 0.15);
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-success: #22c55e;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 3. Dashboard Layout — Properties Overview

This is the main (and only) authenticated screen. Based on Stitch screen 4 (Multi-Property Dashboard).

### Layout Structure (top to bottom)

```
┌─────────────────────────────────┐
│ HEADER (sticky)                 │
│ "Properties"    [search] [user] │
│ "N connected sites"             │
├─────────────────────────────────┤
│ DATE RANGE PILLS                │
│ [ 7d ] [ 30d ] [ 90d ]         │
├─────────────────────────────────┤
│ AGGREGATE KPI GRID (2x2)       │
│ ┌──────────┐ ┌──────────┐      │
│ │ Sessions │ │ Users    │      │
│ │ 124.5k   │ │ 89.2k   │      │
│ └──────────┘ └──────────┘      │
│ ┌──────────┐ ┌──────────┐      │
│ │ Bounce % │ │ Avg Dur  │      │
│ │ 42.1%    │ │ 2m 45s   │      │
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│ PROPERTY CARDS (vertical stack) │
│ ┌───────────────────────────┐   │
│ │ [icon] Site Name  ▊▊▊▊▊ │   │
│ │        domain.com        │   │
│ │ Users: 24.8k  Sess: 31k │   │
│ └───────────────────────────┘   │
│ ┌───────────────────────────┐   │
│ │ [icon] Site Name  ▊▊▊▊▊ │   │
│ │        ...               │   │
│ └───────────────────────────┘   │
│ ...                             │
├─────────────────────────────────┤
│ FOOTER                          │
└─────────────────────────────────┘
```

### Header

**File:** `src/components/DashboardHeader.vue`

```html
<header class="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl px-5 pb-4 pt-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Properties</h1>
      <p class="text-sm text-text-secondary font-medium">{{ successCount }} connected sites</p>
    </div>
    <div class="flex items-center gap-3">
      <!-- View toggle (cards/table) -->
      <button class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-card">
        <svg><!-- cards or table icon --></svg>
      </button>
      <!-- Refresh -->
      <button class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-card">
        <svg><!-- refresh icon, animate-spin when loading --></svg>
      </button>
      <!-- User avatar + logout -->
      <button class="w-10 h-10 rounded-full overflow-hidden">
        <img :src="user.picture" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>
</header>
```

### Date Range Pills

**File:** `src/components/DateRangePicker.vue`

Full-width pill bar instead of inline pills:

```html
<div class="px-5 py-4">
  <div class="flex bg-surface-card p-1 rounded-xl">
    <button
      v-for="option in ['7d', '30d', '90d']"
      :class="[
        'flex-1 py-2 text-sm font-semibold rounded-lg transition-all',
        modelValue === option
          ? 'bg-surface-card-hover text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      ]"
      @click="$emit('update:modelValue', option)"
    >
      {{ option }}
    </button>
  </div>
</div>
```

### Aggregate KPI Grid

**NEW File:** `src/components/AggregateKPIs.vue`

2x2 grid showing cross-property totals. Data comes from new computed values in `useAnalyticsData.ts`.

```html
<div class="grid grid-cols-2 gap-3 px-5 mb-6">
  <!-- Total Sessions -->
  <div class="bg-surface-card p-4 rounded-xl border border-border">
    <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
      Total Sessions
    </p>
    <h3 class="text-2xl font-bold">{{ formatNumber(totalSessions) }}</h3>
    <div class="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div class="bg-accent h-full rounded-full" :style="{ width: '70%' }"></div>
    </div>
  </div>

  <!-- Total Users -->
  <div class="bg-surface-card p-4 rounded-xl border border-border">
    <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
      Total Users
    </p>
    <h3 class="text-2xl font-bold">{{ formatNumber(totalUsers) }}</h3>
    <div class="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div class="bg-accent h-full rounded-full" :style="{ width: '55%' }"></div>
    </div>
  </div>

  <!-- Avg Bounce Rate -->
  <div class="bg-surface-card p-4 rounded-xl border border-border">
    <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
      Bounce Rate
    </p>
    <h3 class="text-2xl font-bold">{{ formatBounceRate(avgBounceRate) }}</h3>
    <div class="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div class="bg-accent h-full rounded-full" :style="{ width: `${avgBounceRate * 100}%` }"></div>
    </div>
  </div>

  <!-- Avg Duration -->
  <div class="bg-surface-card p-4 rounded-xl border border-border">
    <p class="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
      Avg Session
    </p>
    <h3 class="text-2xl font-bold">{{ formatDuration(avgDuration) }}</h3>
    <div class="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div class="bg-accent h-full rounded-full" :style="{ width: '65%' }"></div>
    </div>
  </div>
</div>
```

Props: `totalSessions`, `totalUsers`, `avgBounceRate`, `avgDuration`, `isLoading`

### Property Cards (Card View)

**File:** `src/components/SiteCard.vue` — major restyle

Each card layout based on Stitch screen 4:

```
┌─────────────────────────────────────┐
│ [colored icon] Property Name  ▊▊▊▊ │  <- icon + name + sparkline
│                domain.com           │  <- website URL
├─────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐   │
│ │ TOTAL USERS │  │ SESSIONS    │   │  <- 2-col metric grid
│ │ 24.8k       │  │ 31.2k       │   │
│ └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

```html
<div class="bg-surface-card p-5 rounded-2xl shadow-sm border border-border">
  <!-- Top: icon + name + sparkline -->
  <div class="flex justify-between items-start mb-4">
    <div class="flex items-center gap-3">
      <!-- Colored icon -->
      <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
        <svg class="w-5 h-5 text-accent"><!-- globe/language icon --></svg>
      </div>
      <div>
        <h2 class="font-bold text-[15px] leading-tight">{{ property.displayName }}</h2>
        <p class="text-[11px] text-text-muted uppercase font-bold tracking-wider">
          {{ property.websiteUrl || property.propertyId }}
        </p>
      </div>
    </div>
    <!-- Mini sparkline (top-right) -->
    <div class="w-12 h-6">
      <Sparkline :data="trendData" color="#137fec" />
    </div>
  </div>

  <!-- Bottom: 2-col metrics -->
  <div class="grid grid-cols-2 gap-4">
    <div class="bg-white/[0.03] p-3 rounded-xl">
      <p class="text-[10px] text-text-secondary font-bold uppercase mb-1">Total Users</p>
      <span class="text-lg font-bold">{{ formatNumber(property.metrics.activeUsers) }}</span>
    </div>
    <div class="bg-white/[0.03] p-3 rounded-xl">
      <p class="text-[10px] text-text-secondary font-bold uppercase mb-1">Sessions</p>
      <span class="text-lg font-bold">{{ formatNumber(property.metrics.sessions) }}</span>
    </div>
  </div>
</div>
```

**Error card:** Same card shell but with `opacity-60`, hide metrics grid, show error message in `text-danger`.

**Card icon colors:** Cycle through a set of colors per card index:
```typescript
const iconColors = ['blue', 'purple', 'emerald', 'orange', 'rose', 'cyan']
// bg-blue-500/10 + text-blue-500, bg-purple-500/10 + text-purple-500, etc.
```

### Property List (Table View)

**File:** `src/components/SiteTable.vue` — restyle

Based on Stitch screen 5 (All Properties List). Cleaner, more compact rows:

```html
<div class="space-y-2 px-5">
  <div
    v-for="property in properties"
    class="flex items-center justify-between bg-surface-card rounded-xl p-4 border border-border"
  >
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
        <svg class="w-4 h-4 text-accent"><!-- icon --></svg>
      </div>
      <div>
        <h3 class="text-sm font-semibold">{{ property.displayName }}</h3>
        <p class="text-[10px] text-text-muted uppercase tracking-wider">
          {{ property.websiteUrl || property.propertyId }}
        </p>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <div class="text-right">
        <p class="text-sm font-bold">{{ formatNumber(property.metrics?.sessions ?? 0) }}</p>
        <p class="text-[10px] text-text-muted">sessions</p>
      </div>
      <div class="w-12 h-6">
        <Sparkline :data="trendData" color="#137fec" />
      </div>
    </div>
  </div>
</div>
```

---

## 4. Component Changes Summary

| Component | Action | Key Changes |
|-----------|--------|-------------|
| `src/style.css` | Modify | New color tokens, Inter font import |
| `src/App.vue` | Modify | Add AggregateKPIs section, adjust layout spacing |
| `src/components/DashboardHeader.vue` | Restyle | "Properties" title, circle buttons, simpler layout |
| `src/components/DateRangePicker.vue` | Restyle | Full-width pill bar with bg-surface-card container |
| `src/components/SiteCard.vue` | Major restyle | Icon + name + sparkline top, 2-col metrics bottom, solid cards |
| `src/components/SiteTable.vue` | Restyle | Compact row cards instead of traditional table |
| `src/components/StatBadge.vue` | Restyle | Uppercase labels, larger values |
| `src/components/Sparkline.vue` | Minor | Update default color from `#6366f1` to `#137fec` |
| `src/components/LoadingSkeleton.vue` | Restyle | Match new card shape (icon + name + 2-col metrics) |
| `src/components/ErrorBanner.vue` | Restyle | Match new color scheme |
| `src/components/LandingPage.vue` | Restyle | Update accent colors from indigo to blue |
| `src/components/AppFooter.vue` | Minor | No major changes needed |
| **NEW: `src/components/AggregateKPIs.vue`** | Create | 2x2 grid: total sessions, total users, avg bounce, avg duration |

---

## 5. New Computed Values

**File:** `src/composables/useAnalyticsData.ts`

Add these computed values alongside existing `totalSessions`, `successCount`, `errorCount`:

```typescript
// Total active users across all properties
const totalUsers = computed(() =>
  properties.value.reduce((sum, p) => sum + (p.metrics?.activeUsers ?? 0), 0)
)

// Session-weighted average bounce rate across all properties
const avgBounceRate = computed(() => {
  const valid = properties.value.filter(p => p.metrics)
  if (valid.length === 0) return 0
  const sessions = valid.reduce((s, p) => s + p.metrics!.sessions, 0)
  if (sessions === 0) return 0
  return valid.reduce((s, p) => s + (p.metrics!.bounceRate * p.metrics!.sessions), 0) / sessions
})

// Session-weighted average session duration across all properties
const avgDuration = computed(() => {
  const valid = properties.value.filter(p => p.metrics)
  if (valid.length === 0) return 0
  const sessions = valid.reduce((s, p) => s + p.metrics!.sessions, 0)
  if (sessions === 0) return 0
  return valid.reduce((s, p) => s + (p.metrics!.averageSessionDuration * p.metrics!.sessions), 0) / sessions
})
```

Export these from the `useAnalyticsData()` return object.

---

## 6. Data Mapping

| Design Element | Data Source | Available? |
|---------------|------------|-----------|
| Property name | `PropertyResult.displayName` | Yes |
| Domain/URL | `PropertyResult.websiteUrl` | Yes (optional) |
| Sessions per property | `PropertyMetrics.sessions` | Yes |
| Users per property | `PropertyMetrics.activeUsers` | Yes |
| New users | `PropertyMetrics.newUsers` | Yes |
| Pageviews | `PropertyMetrics.screenPageViews` | Yes |
| Bounce rate | `PropertyMetrics.bounceRate` (0-1 float) | Yes |
| Avg duration | `PropertyMetrics.averageSessionDuration` (seconds) | Yes |
| Sparkline trend | `PropertyMetrics.trend[]` (daily sessions array) | Yes |
| Traffic sources | `PropertyResult.sources[]` (top 5 channels + counts) | Yes |
| Aggregate total sessions | Sum computed across all properties | Yes (new computed) |
| Aggregate total users | Sum computed | Yes (new computed) |
| Aggregate avg bounce | Session-weighted average computed | Yes (new computed) |
| Aggregate avg duration | Session-weighted average computed | Yes (new computed) |
| Change % badges | Need previous period comparison | **No** — omit or show "--" |
| Per-page data | Requires new API endpoint | **No** — future work |
| Real-time visitors | Requires GA4 Realtime API | **No** — future work |
| Geography/world map | Requires GA4 geo dimension | **No** — future work |
| 24h / Custom date ranges | API only supports 7d/30d/90d | **No** — future work |

---

## 7. What's NOT Changing

- **No router** — stays single-page
- **No new API endpoints** — same `GET /api/analytics?days=7d|30d|90d`
- **No bottom navigation** — single page doesn't need it
- **Same composable architecture** — module-level singletons
- **Same data flow** — fetch -> cache (localStorage, 6h TTL) -> sort -> render
- **Same auth flow** — Google OAuth -> JWT -> Bearer token
- **Same Sparkline.vue** — SVG polyline, just update default color

---

## 8. Implementation Order

1. Update `src/style.css` — new theme tokens + Inter font import
2. Add aggregate computed values to `src/composables/useAnalyticsData.ts`
3. Create `src/components/AggregateKPIs.vue`
4. Restyle `src/components/DashboardHeader.vue`
5. Restyle `src/components/DateRangePicker.vue`
6. Restyle `src/components/SiteCard.vue` (major change)
7. Restyle `src/components/SiteTable.vue`
8. Update `src/App.vue` layout (add AggregateKPIs, adjust grid)
9. Restyle `src/components/LoadingSkeleton.vue`
10. Restyle `src/components/ErrorBanner.vue` + `StatBadge.vue`
11. Restyle `src/components/LandingPage.vue` (accent colors)
12. Test mobile + desktop, verify all data renders

---

## 9. Existing File Reference

These are the key files to read before implementing:

### Frontend
- `src/style.css` — Tailwind CSS 4 theme tokens
- `src/App.vue` — Root layout (auth gate + dashboard shell)
- `src/composables/useAnalyticsData.ts` — Data composable (fetch, cache, sort, state)
- `src/composables/useAuth.ts` — Auth state (JWT, user info)
- `src/composables/useDateRange.ts` — Reactive date range selection
- `src/lib/api.ts` — Fetch wrapper with Bearer token
- `src/lib/formatters.ts` — `formatNumber()`, `formatBounceRate()`, `formatDuration()`
- `src/types/analytics.ts` — All TypeScript interfaces

### Components
- `src/components/DashboardHeader.vue` — Sticky header with controls
- `src/components/DateRangePicker.vue` — 7d/30d/90d pills
- `src/components/SiteCard.vue` — Property card (main restyle target)
- `src/components/SiteTable.vue` — Table view
- `src/components/StatBadge.vue` — Label + value display
- `src/components/Sparkline.vue` — SVG trend line
- `src/components/LoadingSkeleton.vue` — Loading placeholder
- `src/components/ErrorBanner.vue` — Error display with retry
- `src/components/LandingPage.vue` — Login/marketing page
- `src/components/AppFooter.vue` — Footer links

---

## 10. Stitch Design Reference (HTML)

The following HTML was exported from Google Stitch. It contains 5 screens. The most relevant are screens 1 (Overview) and 4 (Multi-Property Cards). Use these as visual reference for colors, spacing, typography, and layout patterns.

### Screen 1: Analytics Overview Dashboard

Key elements to adopt: KPI grid (2x2), date pill bar, card styling.

```html
<!-- Analytics Overview Dashboard -->
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
  <!-- Header -->
  <header class="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 pt-10 pb-4">
    <div class="flex items-center justify-between max-w-md mx-auto">
      <div class="flex items-center gap-3">
        <div class="bg-primary/20 p-2 rounded-lg">
          <span class="material-symbols-outlined text-primary">insights</span>
        </div>
        <div>
          <h1 class="text-lg font-bold leading-tight">Analytics</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">Site Analytics Project</p>
        </div>
      </div>
    </div>
  </header>

  <!-- Date Selector -->
  <div class="px-4 py-4">
    <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
      <button class="flex-1 py-2 text-sm font-semibold rounded-lg text-slate-500">24h</button>
      <button class="flex-1 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm">7d</button>
      <button class="flex-1 py-2 text-sm font-semibold rounded-lg text-slate-500">30d</button>
      <button class="flex-1 py-2 text-sm font-semibold rounded-lg text-slate-500">Custom</button>
    </div>
  </div>

  <!-- KPI Grid -->
  <div class="grid grid-cols-2 gap-3 px-4 mb-6">
    <div class="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
      <div class="flex justify-between items-start mb-2">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Visits</p>
        <span class="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+12%</span>
      </div>
      <h3 class="text-2xl font-bold">124.5k</h3>
      <div class="mt-3 h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div class="bg-primary h-full w-[70%]"></div>
      </div>
    </div>
    <!-- ... more KPI cards -->
  </div>
</body>
```

### Screen 4: Multi-Property Dashboard Overview

Key elements to adopt: Property card layout with icon + sparkline, 2-col metrics grid, card styling.

```html
<!-- Multi-Property Dashboard -->
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
  <!-- Header -->
  <header class="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl px-5 pb-4">
    <div class="max-w-md mx-auto flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Properties</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">8 connected sites</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-slate-800/50">
          <span class="material-symbols-outlined text-[22px]">search</span>
        </button>
        <button class="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white">
          <span class="material-symbols-outlined text-[22px]">add</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Property Cards -->
  <main class="flex-1 max-w-md mx-auto w-full px-5 pb-32">
    <div class="space-y-4 pt-2">
      <!-- Property Card -->
      <div class="bg-white dark:bg-card-dark p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50">
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <span class="material-symbols-outlined text-blue-500">language</span>
            </div>
            <div>
              <h2 class="font-bold text-[15px] leading-tight">Main E-commerce Store</h2>
              <p class="text-[11px] text-slate-400 uppercase font-bold tracking-wider">shop-main.com</p>
            </div>
          </div>
          <!-- Sparkline (bar style) -->
          <div class="sparkline-container">
            <div class="w-1 bg-primary/20 h-[40%] rounded-full"></div>
            <div class="w-1 bg-primary/40 h-[60%] rounded-full"></div>
            <div class="w-1 bg-primary/30 h-[45%] rounded-full"></div>
            <div class="w-1 bg-primary/60 h-[75%] rounded-full"></div>
            <div class="w-1 bg-primary h-[100%] rounded-full"></div>
            <div class="w-1 bg-primary/70 h-[65%] rounded-full"></div>
          </div>
        </div>
        <!-- 2-col metrics -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <p class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Total Users</p>
            <div class="flex items-baseline gap-2">
              <span class="text-lg font-bold">24.8k</span>
              <span class="text-[10px] font-bold text-emerald-500">+12%</span>
            </div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <p class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Sessions</p>
            <div class="flex items-baseline gap-2">
              <span class="text-lg font-bold">31.2k</span>
              <span class="text-[10px] font-bold text-emerald-500">+8%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</body>
```

### Screen 5: All Properties List View

Key elements to adopt: Compact list row with property name + metrics + sparkline.

```html
<!-- Properties List -->
<header class="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 ios-blur px-4 pt-10 pb-4">
  <div class="flex items-center justify-between mb-4">
    <span class="text-xs font-semibold text-primary uppercase tracking-widest">Aggregator</span>
    <div class="flex gap-3">
      <button class="text-slate-500"><span class="material-symbols-outlined">search</span></button>
      <button class="text-slate-500"><span class="material-symbols-outlined">tune</span></button>
    </div>
  </div>
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-extrabold tracking-tight">Properties</h1>
    <div class="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1">
      <span class="text-xs font-bold text-slate-600 dark:text-slate-300">12 Total</span>
    </div>
  </div>
</header>

<!-- Stats summary -->
<section class="grid grid-cols-2 gap-3 px-4 py-4">
  <div class="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Active</p>
    <span class="text-2xl font-bold">4,812</span>
  </div>
  <!-- ... -->
</section>

<!-- Property rows -->
<div class="space-y-2 px-4">
  <div class="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl p-4 border border-border shadow-sm">
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-accent text-lg">language</span>
      </div>
      <div class="min-w-0">
        <h3 class="text-sm font-semibold truncate">launchpilot.marketing</h3>
        <p class="text-[10px] text-text-muted uppercase">Web App</p>
      </div>
    </div>
    <div class="flex items-center gap-3 shrink-0">
      <span class="text-sm font-bold">1,240</span>
      <div class="w-16 h-6"><!-- sparkline --></div>
    </div>
  </div>
</div>
```

### Screens NOT Implemented (Future Reference)

**Screen 2 (Real-time):** Requires GA4 Realtime API — not available in current backend.
**Screen 3 (Content/Pages):** Requires per-page GA4 dimension queries — not in current API.

These screens are preserved here for future implementation when the backend is extended.
