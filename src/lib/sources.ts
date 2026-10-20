/**
 * Helpers for showing GA4 properties and Cloudflare Web Analytics sites in one
 * list. Pure functions — shared by the composable, components, and unit tests.
 */

import type { DataSource, PeriodTotals } from '../types/analytics'

export type MetricKey = keyof PeriodTotals

// Cloudflare only measures visits (shown as sessions) and pageviews
const CLOUDFLARE_METRICS: ReadonlySet<MetricKey> = new Set<MetricKey>(['sessions', 'screenPageViews'])

/** Shown instead of a number the property's source doesn't measure. */
export const MISSING_METRIC = '–'

interface Sourced {
  source?: DataSource
}

interface WithMetrics extends Sourced {
  metrics: Readonly<PeriodTotals> | null
}

/** A property without a source is GA4 (also covers reports cached before Cloudflare). */
export function sourceOf(property: Sourced): DataSource {
  return property.source ?? 'ga4'
}

/** False for metrics the property's source doesn't measure (e.g. users on Cloudflare). */
export function hasMetric(property: Sourced, metric: MetricKey): boolean {
  return sourceOf(property) !== 'cloudflare' || CLOUDFLARE_METRICS.has(metric)
}

/** The metric's value, or null when not loaded or not measured by the source. */
export function metricOrNull(property: WithMetrics, metric: MetricKey): number | null {
  if (!property.metrics || !hasMetric(property, metric)) return null
  return property.metrics[metric]
}

/** Formatted metric, or "–" when it isn't available. */
export function displayMetric(
  property: WithMetrics,
  metric: MetricKey,
  format: (value: number) => string,
): string {
  const value = metricOrNull(property, metric)
  return value === null ? MISSING_METRIC : format(value)
}

/** "https://www.Example.com/path" → "example.com". Null when there is no usable host. */
export function hostKey(url: string | undefined): string | null {
  if (!url) return null
  try {
    const host = new URL(url.includes('://') ? url : `https://${url}`).hostname
    return host.toLowerCase().replace(/^www\./, '').replace(/\.$/, '') || null
  } catch {
    return null
  }
}

/**
 * Keeps the sort order, but moves properties that share a hostname with a
 * Cloudflare site next to it (GA4 first, then Cloudflare), so both can be
 * compared during a migration. Each group sits where its best-ranked member
 * was. Values are never summed.
 */
export function pairByHost<T extends Sourced & { websiteUrl?: string }>(sorted: readonly T[]): T[] {
  const cloudflareHosts = new Set<string>()
  for (const property of sorted) {
    const key = sourceOf(property) === 'cloudflare' ? hostKey(property.websiteUrl) : null
    if (key) cloudflareHosts.add(key)
  }
  if (cloudflareHosts.size === 0) return [...sorted]

  // Members of each shared-host group, in sort order
  const groups = new Map<string, T[]>()
  for (const property of sorted) {
    const key = hostKey(property.websiteUrl)
    if (key && cloudflareHosts.has(key)) groups.set(key, [...(groups.get(key) ?? []), property])
  }

  const result: T[] = []
  const placed = new Set<string>()
  for (const property of sorted) {
    const key = hostKey(property.websiteUrl)
    const group = key ? groups.get(key) : undefined
    if (!key || !group) {
      result.push(property)
      continue
    }
    if (placed.has(key)) continue
    placed.add(key)
    result.push(
      ...group.filter((p) => sourceOf(p) !== 'cloudflare'),
      ...group.filter((p) => sourceOf(p) === 'cloudflare'),
    )
  }
  return result
}

/**
 * IDs of the first entry of each shared-host group in a pairByHost() list
 * (a GA4 property followed by its Cloudflare site). The card grid starts a
 * new row there, so a pair sits side by side instead of wrapping diagonally.
 */
export function pairStartIds<T extends Sourced & { websiteUrl?: string; propertyId: string }>(
  paired: readonly T[],
): Set<string> {
  const starts = new Set<string>()
  paired.forEach((property, i) => {
    const key = hostKey(property.websiteUrl)
    // Only look at the first entry of each run of consecutive same-host entries
    if (!key || (i > 0 && hostKey(paired[i - 1]?.websiteUrl) === key)) return

    let end = i + 1
    while (end < paired.length && hostKey(paired[end]?.websiteUrl) === key) end++
    const run = paired.slice(i, end)

    if (run.length > 1 && run.some((p) => sourceOf(p) === 'cloudflare')) starts.add(property.propertyId)
  })
  return starts
}
