/**
 * useCache.ts
 * Generic localStorage cache with per-entry TTL.
 * Module-level singleton — all composable calls share one implementation.
 */

/** 6-hour TTL constant, exported for reuse across composables. */
export const CACHE_TTL_6H = 6 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T
  cachedAt: number
  ttlMs: number
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function get<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (raw === null) return null

  let entry: CacheEntry<T>

  try {
    entry = JSON.parse(raw) as CacheEntry<T>
  } catch {
    // Corrupt entry — remove it and return null
    localStorage.removeItem(key)
    return null
  }

  // Validate the shape minimally before trusting it
  if (
    typeof entry.cachedAt !== 'number' ||
    typeof entry.ttlMs !== 'number'
  ) {
    localStorage.removeItem(key)
    return null
  }

  if (Date.now() - entry.cachedAt > entry.ttlMs) {
    // Expired — clean up and signal a miss
    localStorage.removeItem(key)
    return null
  }

  return entry.data
}

function set<T>(key: string, data: T, ttlMs: number): void {
  const entry: CacheEntry<T> = {
    data,
    cachedAt: Date.now(),
    ttlMs,
  }
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Storage quota exceeded or private-browsing restriction — fail silently
  }
}

function invalidate(key: string): void {
  localStorage.removeItem(key)
}

/**
 * Returns true when the entry is missing, expired, or corrupt.
 * Does NOT remove the entry — call `invalidate` if you want to clear it.
 */
function isStale(key: string): boolean {
  const raw = localStorage.getItem(key)
  if (raw === null) return true

  let entry: CacheEntry<unknown>
  try {
    entry = JSON.parse(raw) as CacheEntry<unknown>
  } catch {
    return true
  }

  if (typeof entry.cachedAt !== 'number' || typeof entry.ttlMs !== 'number') {
    return true
  }

  return Date.now() - entry.cachedAt > entry.ttlMs
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export interface Cache {
  get<T>(key: string): T | null
  set<T>(key: string, data: T, ttlMs: number): void
  invalidate(key: string): void
  isStale(key: string): boolean
}

export function useCache(): Cache {
  return { get, set, invalidate, isStale }
}
