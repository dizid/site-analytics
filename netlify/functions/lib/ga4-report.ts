/**
 * Pure GA4 Data API helpers for the overview report: date ranges, request
 * shapes, and response parsing. No network or env access — unit-testable.
 */

import type {
  DateRange,
  DailyMetric,
  TrafficSource,
  PeriodTotals,
  PropertyMetrics,
} from '../../../src/types/analytics.js'

// ---------------------------------------------------------------------------
// Date ranges
// ---------------------------------------------------------------------------

export interface GA4DateRange {
  startDate: string
  endDate: string
  name?: string
}

// Number of full days in each range. endDate is always "yesterday" because
// today's data is partial, so "7d" = the 7 days from 7daysAgo to 1daysAgo.
const RANGE_DAYS: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90 }

/** Maps our DateRange type to GA4 API date strings for the current period. */
export function buildDateRange(days: DateRange): GA4DateRange {
  return { startDate: `${RANGE_DAYS[days]}daysAgo`, endDate: 'yesterday' }
}

/**
 * The equally long period immediately before the current one.
 * 7d → 14daysAgo..8daysAgo, 30d → 60daysAgo..31daysAgo, 90d → 180daysAgo..91daysAgo.
 */
export function buildPreviousDateRange(days: DateRange): GA4DateRange {
  const n = RANGE_DAYS[days]
  return { startDate: `${n * 2}daysAgo`, endDate: `${n + 1}daysAgo` }
}

/** Parses the ?days= query param. Falls back to '7d' for unknown values. */
export function parseDaysParam(url: URL): DateRange {
  const raw = url.searchParams.get('days') ?? '7d'
  if (raw === '7d' || raw === '30d' || raw === '90d') return raw
  return '7d'
}

// ---------------------------------------------------------------------------
// GA4 response types
// ---------------------------------------------------------------------------

interface GA4Value {
  value: string
}

export interface GA4Row {
  dimensionValues?: GA4Value[]
  metricValues?: GA4Value[]
}

export interface GA4ReportResponse {
  rows?: GA4Row[]
}

// ---------------------------------------------------------------------------
// Request shapes
// ---------------------------------------------------------------------------

/** The six overview metrics, in the order parseTotals expects them. */
export const OVERVIEW_METRICS = [
  { name: 'sessions' },
  { name: 'activeUsers' },
  { name: 'newUsers' },
  { name: 'screenPageViews' },
  { name: 'bounceRate' },
  { name: 'averageSessionDuration' },
]

// Names for the two periods in the totals request. With more than one date
// range, GA4 adds a dateRange dimension to each row carrying this name.
export const CURRENT_RANGE_NAME = 'current'
export const PREVIOUS_RANGE_NAME = 'previous'

/**
 * Builds the three runReport requests for one property's overview, sent
 * together in a single batchRunReports call:
 * 0. trend   — overview metrics per day (sparkline)
 * 1. totals  — overview metrics for current + previous period, no dimensions.
 *              Needed because activeUsers is not additive across days
 *              (a visitor on 3 days is 1 user, not 3).
 * 2. sources — top 5 channels by sessions
 */
export function buildOverviewRequests(days: DateRange): object[] {
  const current = buildDateRange(days)
  const currentRanges = [current]

  return [
    {
      dateRanges: currentRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    },
    {
      dateRanges: [
        { ...current, name: CURRENT_RANGE_NAME },
        { ...buildPreviousDateRange(days), name: PREVIOUS_RANGE_NAME },
      ],
      metrics: OVERVIEW_METRICS,
    },
    {
      dateRanges: currentRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 5,
    },
  ]
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function num(row: GA4Row | undefined, i: number): number {
  return parseFloat(row?.metricValues?.[i]?.value ?? '0') || 0
}

/** Converts one totals row (OVERVIEW_METRICS order) to PeriodTotals. Missing row = all zeros. */
function parseTotalsRow(row: GA4Row | undefined): PeriodTotals {
  return {
    sessions:               Math.round(num(row, 0)),
    activeUsers:            Math.round(num(row, 1)),
    newUsers:               Math.round(num(row, 2)),
    screenPageViews:        Math.round(num(row, 3)),
    bounceRate:             num(row, 4),
    averageSessionDuration: num(row, 5),
  }
}

/**
 * Parses the trend + totals reports into PropertyMetrics.
 * Headline numbers come from the dimensionless totals report, so GA4 computes
 * them exactly as its own UI does (deduplicated users, true bounce rate, etc.).
 */
export function parseMetricsReport(
  trendData: GA4ReportResponse,
  totalsData: GA4ReportResponse,
): PropertyMetrics {
  const trend: DailyMetric[] = (trendData.rows ?? []).map((row) => {
    // date dimension comes back as YYYYMMDD — convert to YYYY-MM-DD
    const rawDate = row.dimensionValues?.[0]?.value ?? ''
    const date = rawDate.length === 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : rawDate
    return {
      date,
      sessions: Math.round(num(row, 0)),
      activeUsers: Math.round(num(row, 1)),
    }
  })

  // GA4 omits rows for periods with no data, so look each period up by name
  const rows = totalsData.rows ?? []
  const findPeriod = (name: string) =>
    rows.find((r) => r.dimensionValues?.[0]?.value === name)

  return {
    ...parseTotalsRow(findPeriod(CURRENT_RANGE_NAME)),
    previous: parseTotalsRow(findPeriod(PREVIOUS_RANGE_NAME)),
    trend,
  }
}

/** Parses the traffic sources report into TrafficSource[]. */
export function parseSourcesReport(data: GA4ReportResponse): TrafficSource[] {
  return (data.rows ?? []).map((row) => ({
    channel:  row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: Math.round(num(row, 0)),
  }))
}
