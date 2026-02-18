/**
 * Shared formatting utilities for analytics metrics.
 * Used by SiteCard, SiteTable, and any future metric display components.
 */

/** Format a number with locale-specific thousand separators. */
export function formatNumber(n: number): string {
  return n.toLocaleString()
}

/**
 * Convert bounce rate (0–1 decimal from GA4) to a "XX.X%" string.
 * Clamps to 0–1 range as a safety guard against bad data.
 */
export function formatBounceRate(rate: number): string {
  const clamped = Math.min(1, Math.max(0, rate))
  return `${(clamped * 100).toFixed(1)}%`
}

/**
 * Convert total seconds to mm:ss string.
 * Handles NaN, negative, and non-finite values gracefully.
 * Example: 125 -> "2:05"
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const totalSecs = Math.round(seconds)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
