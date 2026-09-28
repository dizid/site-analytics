/**
 * useAnalyticsData.ts
 * Main data composable — orchestrates fetching, caching, sorting, and view state.
 * Module-level singleton so state is shared across all components that call this.
 *
 * Cache keys are namespaced by user ID so different Google accounts never
 * see each other's cached data: `ga4:<userId>:<dateRange>`.
 */

import { ref, computed, watch, readonly } from 'vue'
import type { ComputedRef } from 'vue'
import type {
  PeriodTotals,
  PropertyResult,
  PropertyDetail,
  SortColumn,
  SortDirection,
  ViewMode,
} from '../types/analytics'
import { api } from '../lib/api'
import { useCache, CACHE_TTL_6H, CACHE_TTL_24H } from './useCache'
import { useDateRange } from './useDateRange'
import { useAuth } from './useAuth'
import { aggregateTotals, comparablePrevious } from '../lib/compare'

const VIEWMODE_STORAGE_KEY = 'ga4:viewMode'

// Bump the version when the cached data shape or meaning changes, so old
// entries are ignored instead of served stale (v2: deduplicated users,
// v3: previous-period totals). Must stay under `ga4:` so logout still wipes it.
const CACHE_PREFIX = 'ga4:v3'

// ---------------------------------------------------------------------------
// Singleton state — declared outside the function so all callers share it
// ---------------------------------------------------------------------------

const properties = ref<PropertyResult[]>([])
const isLoading = ref(false)
// True while cached data is shown and a background refetch is in flight
const isRefreshing = ref(false)
const error = ref<string | null>(null)
const lastFetchedAt = ref<string | null>(null)

// Restore persisted view mode from localStorage, default to 'cards'
const storedViewMode = localStorage.getItem(VIEWMODE_STORAGE_KEY)
const viewMode = ref<ViewMode>(
  storedViewMode === 'table' || storedViewMode === 'cards'
    ? storedViewMode
    : 'cards',
)

const sortColumn = ref<SortColumn>('sessions')
const sortDirection = ref<SortDirection>('desc')

// Detail view state
const selectedProperty = ref<PropertyResult | null>(null)
const propertyDetail = ref<PropertyDetail | null>(null)
const isDetailLoading = ref(false)
const detailError = ref<string | null>(null)

// Grab shared instances (these are singletons themselves)
const cache = useCache()
const { dateRange } = useDateRange()
const { getUserId } = useAuth()

// ---------------------------------------------------------------------------
// Cache key helpers
// ---------------------------------------------------------------------------

/**
 * Returns the namespaced cache key for the current user + date range.
 * Falls back to a generic key if the user ID is unavailable (shouldn't happen
 * in practice since analytics is only fetched while authenticated).
 */
function getCacheKey(): string {
  const userId = getUserId()
  return userId ? `${CACHE_PREFIX}:${userId}:${dateRange.value}` : `${CACHE_PREFIX}:${dateRange.value}`
}

/**
 * On first use, remove any legacy un-namespaced cache entries from the old
 * password-auth system (e.g. `ga4:7d`, `ga4:30d`, `ga4:90d`) so they don't
 * waste localStorage space or cause confusion.
 */
function cleanLegacyCacheKeys(): void {
  const legacy = ['ga4:7d', 'ga4:30d', 'ga4:90d']
  legacy.forEach((key) => localStorage.removeItem(key))
}

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const sortedProperties: ComputedRef<PropertyResult[]> = computed(() => {
  return [...properties.value].sort((a, b) => {
    const col = sortColumn.value
    const dir = sortDirection.value === 'asc' ? 1 : -1

    if (col === 'name') {
      // Alphabetical sort by displayName
      return a.displayName.localeCompare(b.displayName) * dir
    }

    // Metric sort — null metrics (errored properties) always go to the bottom
    const aVal = a.metrics?.[col] ?? null
    const bVal = b.metrics?.[col] ?? null

    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1   // a sinks to bottom regardless of direction
    if (bVal === null) return -1  // b sinks to bottom regardless of direction

    return (aVal - bVal) * dir
  })
})

const successCount: ComputedRef<number> = computed(
  () => properties.value.filter((p) => p.metrics !== null).length,
)

const errorCount: ComputedRef<number> = computed(
  () => properties.value.filter((p) => p.error !== null).length,
)

const totalSessions: ComputedRef<number> = computed(() =>
  properties.value.reduce((sum, p) => sum + (p.metrics?.sessions ?? 0), 0),
)

// Total active users across all properties
const totalUsers: ComputedRef<number> = computed(() =>
  properties.value.reduce((sum, p) => sum + (p.metrics?.activeUsers ?? 0), 0),
)

// Session-weighted average bounce rate across all properties
const avgBounceRate: ComputedRef<number> = computed(() => {
  const valid = properties.value.filter(p => p.metrics)
  if (valid.length === 0) return 0
  const sessions = valid.reduce((s, p) => s + p.metrics!.sessions, 0)
  if (sessions === 0) return 0
  return valid.reduce((s, p) => s + (p.metrics!.bounceRate * p.metrics!.sessions), 0) / sessions
})

// Session-weighted average session duration across all properties
const avgDuration: ComputedRef<number> = computed(() => {
  const valid = properties.value.filter(p => p.metrics)
  if (valid.length === 0) return 0
  const sessions = valid.reduce((s, p) => s + p.metrics!.sessions, 0)
  if (sessions === 0) return 0
  return valid.reduce((s, p) => s + (p.metrics!.averageSessionDuration * p.metrics!.sessions), 0) / sessions
})

// Portfolio totals for the previous period, for % change on the KPIs.
// Null unless every loaded property has previous-period data to compare.
const previousAggregate: ComputedRef<PeriodTotals | null> = computed(() => {
  const previous = properties.value
    .filter((p) => p.metrics)
    .map((p) => p.metrics!.previous)
  if (previous.length === 0 || previous.some((p) => !p)) return null
  return comparablePrevious(aggregateTotals(previous as PeriodTotals[]))
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

// Monotonic counter to discard stale responses from superseded requests
let fetchId = 0

// Cached reports younger than this are shown without a background refetch.
const CACHE_FRESH_MS = 60 * 60 * 1000

/**
 * A cached report is fresh when it is under an hour old AND from today —
 * GA4 ranges end "yesterday", so yesterday's cache covers a shifted window.
 */
function isFresh(cachedAt: number): boolean {
  const age = Date.now() - cachedAt
  return age < CACHE_FRESH_MS && new Date(cachedAt).toDateString() === new Date().toDateString()
}

/**
 * In the detail view the overview comes from selectedProperty, so point it at
 * the matching object in the latest report (keeps it in sync after refreshes).
 */
function syncSelectedProperty(): void {
  const current = selectedProperty.value
  if (!current) return
  const fresh = properties.value.find((p) => p.propertyId === current.propertyId)
  if (fresh) selectedProperty.value = fresh
}

type CachedReport = { properties: PropertyResult[]; generatedAt: string }

/**
 * Loads the report for the current date range (stale-while-revalidate):
 * - fresh cache  → show it, done
 * - stale cache  → show it immediately, refetch silently in the background
 * - no cache     → clear the list (skeletons, never the previous range's
 *                  numbers under the new range's label) and fetch
 * - force        → keep current data visible, fetch with loading state
 */
async function fetchReport(force = false): Promise<void> {
  // Remove old un-namespaced cache entries from the password-auth era
  cleanLegacyCacheKeys()

  const cacheKey = getCacheKey()
  // Every call supersedes earlier in-flight requests — including cache hits,
  // so a slow response for another range can't overwrite what's shown now.
  const myFetchId = ++fetchId
  let background = false

  if (!force) {
    const cached = cache.getEntry<CachedReport>(cacheKey)
    if (cached !== null) {
      properties.value = cached.data.properties
      lastFetchedAt.value = cached.data.generatedAt
      syncSelectedProperty()
      error.value = null
      isLoading.value = false
      if (isFresh(cached.cachedAt)) {
        isRefreshing.value = false
        return
      }
      background = true
    } else {
      properties.value = []
    }
  }

  if (background) {
    isRefreshing.value = true
    isLoading.value = false
  } else {
    isLoading.value = true
    isRefreshing.value = false
    error.value = null
  }

  try {
    const response = await api.getReport(dateRange.value)

    // Cache even if superseded — the key belongs to the range it was fetched for
    cache.set(
      cacheKey,
      { properties: response.properties, generatedAt: response.generatedAt },
      CACHE_TTL_24H,
    )

    // Discard if a newer fetch was triggered while we were awaiting
    if (myFetchId !== fetchId) return

    properties.value = response.properties
    lastFetchedAt.value = response.generatedAt
    syncSelectedProperty()
  } catch (err) {
    // Discard errors from superseded requests; background failures stay
    // silent because the (under 24h old) cached data is still on screen
    if (myFetchId !== fetchId || background) return

    error.value =
      err instanceof Error
        ? err.message
        : 'Failed to load analytics data. Please try again.'
  } finally {
    // Only clear loading if this is still the latest request
    if (myFetchId === fetchId) {
      isLoading.value = false
      isRefreshing.value = false
    }
  }
}

function setViewMode(mode: ViewMode): void {
  viewMode.value = mode
  localStorage.setItem(VIEWMODE_STORAGE_KEY, mode)
}

function setSortColumn(column: SortColumn): void {
  if (column === sortColumn.value) {
    // Toggle direction when the user clicks the already-active column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    // Name sorts ascending by default; metrics sort descending (highest first)
    sortDirection.value = column === 'name' ? 'asc' : 'desc'
  }
}

async function refresh(): Promise<void> {
  return fetchReport(true)
}

// Monotonic counter to discard stale detail responses (e.g. rapid range switching)
let detailFetchId = 0

async function selectProperty(property: PropertyResult): Promise<void> {
  const myDetailFetchId = ++detailFetchId
  selectedProperty.value = property
  propertyDetail.value = null
  detailError.value = null
  isDetailLoading.value = true

  const userId = getUserId()
  const cacheKey = `${CACHE_PREFIX}:detail:${userId}:${property.propertyId}:${dateRange.value}`

  const cached = cache.get<PropertyDetail>(cacheKey)
  if (cached) {
    propertyDetail.value = cached
    isDetailLoading.value = false
    return
  }

  try {
    const response = await api.getPropertyDetail(property.propertyId, dateRange.value)
    cache.set(cacheKey, response.detail, CACHE_TTL_6H)
    if (myDetailFetchId !== detailFetchId) return
    propertyDetail.value = response.detail
  } catch (err) {
    if (myDetailFetchId !== detailFetchId) return
    detailError.value = err instanceof Error ? err.message : 'Failed to load details'
  } finally {
    if (myDetailFetchId === detailFetchId) {
      isDetailLoading.value = false
    }
  }
}

/** Re-requests the detail breakdowns for the open property (after an error). */
async function retryDetail(): Promise<void> {
  if (selectedProperty.value) await selectProperty(selectedProperty.value)
}

function deselectProperty(): void {
  selectedProperty.value = null
  propertyDetail.value = null
  detailError.value = null
}

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

// Re-fetch whenever the user changes the date range. fetchReport re-points
// selectedProperty at the new range's data; then reload the detail breakdowns.
watch(dateRange, async () => {
  await fetchReport()
  if (selectedProperty.value) {
    selectProperty(selectedProperty.value)
  }
})

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAnalyticsData() {
  return {
    // State (readonly to prevent accidental external mutation)
    properties: readonly(properties),
    isLoading: readonly(isLoading),
    isRefreshing: readonly(isRefreshing),
    error: readonly(error),
    lastFetchedAt: readonly(lastFetchedAt),
    viewMode: readonly(viewMode),
    sortColumn: readonly(sortColumn),
    sortDirection: readonly(sortDirection),

    // Computed
    sortedProperties,
    successCount,
    errorCount,
    totalSessions,
    totalUsers: readonly(totalUsers),
    avgBounceRate: readonly(avgBounceRate),
    avgDuration: readonly(avgDuration),
    previousAggregate,

    // Detail view state
    selectedProperty: readonly(selectedProperty),
    propertyDetail: readonly(propertyDetail),
    isDetailLoading: readonly(isDetailLoading),
    detailError: readonly(detailError),

    // Actions
    fetchReport,
    setViewMode,
    setSortColumn,
    refresh,
    selectProperty,
    retryDetail,
    deselectProperty,
  }
}
