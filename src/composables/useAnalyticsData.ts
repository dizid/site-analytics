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
  PropertyResult,
  SortColumn,
  SortDirection,
  ViewMode,
} from '../types/analytics'
import { api } from '../lib/api'
import { useCache, CACHE_TTL_6H } from './useCache'
import { useDateRange } from './useDateRange'
import { useAuth } from './useAuth'

const VIEWMODE_STORAGE_KEY = 'ga4:viewMode'

// ---------------------------------------------------------------------------
// Singleton state — declared outside the function so all callers share it
// ---------------------------------------------------------------------------

const properties = ref<PropertyResult[]>([])
const isLoading = ref(false)
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
  return userId ? `ga4:${userId}:${dateRange.value}` : `ga4:${dateRange.value}`
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

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

// Monotonic counter to discard stale responses from superseded requests
let fetchId = 0

async function fetchReport(force = false): Promise<void> {
  // Remove old un-namespaced cache entries from the password-auth era
  cleanLegacyCacheKeys()

  const cacheKey = getCacheKey()

  // Return cached data when available and not forcing a refresh
  if (!force) {
    const cached = cache.get<{ properties: PropertyResult[]; generatedAt: string }>(cacheKey)
    if (cached !== null) {
      properties.value = cached.properties
      lastFetchedAt.value = cached.generatedAt
      return
    }
  }

  const myFetchId = ++fetchId
  isLoading.value = true
  error.value = null

  try {
    const response = await api.getReport(dateRange.value)

    // Discard if a newer fetch was triggered while we were awaiting
    if (myFetchId !== fetchId) return

    // Persist to cache with 6-hour TTL, namespaced by user ID
    cache.set(
      cacheKey,
      { properties: response.properties, generatedAt: response.generatedAt },
      CACHE_TTL_6H,
    )

    properties.value = response.properties
    lastFetchedAt.value = response.generatedAt
  } catch (err) {
    // Discard errors from superseded requests
    if (myFetchId !== fetchId) return

    error.value =
      err instanceof Error
        ? err.message
        : 'Failed to load analytics data. Please try again.'
  } finally {
    // Only clear loading if this is still the latest request
    if (myFetchId === fetchId) {
      isLoading.value = false
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

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

// Re-fetch whenever the user changes the date range
watch(dateRange, () => {
  fetchReport()
})

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAnalyticsData() {
  return {
    // State (readonly to prevent accidental external mutation)
    properties: readonly(properties),
    isLoading: readonly(isLoading),
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

    // Actions
    fetchReport,
    setViewMode,
    setSortColumn,
    refresh,
  }
}
