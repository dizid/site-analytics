import type { Context } from '@netlify/functions'
import type {
  DateRange,
  DailyMetric,
  TrafficSource,
  PropertyMetrics,
  PropertyResult,
  ReportResponse,
} from '../../src/types/analytics.js'
import { JSON_HEADERS, validateAuth, getAccessToken } from './lib/auth.js'

// GA4 Data API base URL
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta/properties'

// Maximum properties per batch to stay within GA4 rate limits
const BATCH_SIZE = 10

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

interface GA4DateRange {
  startDate: string
  endDate: string
}

// Maps our DateRange type to GA4 API date strings
function buildDateRange(days: DateRange): GA4DateRange {
  const map: Record<DateRange, GA4DateRange> = {
    '7d':  { startDate: '7daysAgo',  endDate: 'yesterday' },
    '30d': { startDate: '30daysAgo', endDate: 'yesterday' },
    '90d': { startDate: '90daysAgo', endDate: 'yesterday' },
  }
  return map[days]
}

// Parses the ?days= query param. Falls back to '7d' for unknown values.
function parseDaysParam(url: URL): DateRange {
  const raw = url.searchParams.get('days') ?? '7d'
  if (raw === '7d' || raw === '30d' || raw === '90d') return raw
  return '7d'
}

// ---------------------------------------------------------------------------
// GA4 response parsing types
// ---------------------------------------------------------------------------

interface GA4DimensionValue {
  value: string
}

interface GA4MetricValue {
  value: string
}

interface GA4Row {
  dimensionValues: GA4DimensionValue[]
  metricValues: GA4MetricValue[]
}

interface GA4ReportResponse {
  rows?: GA4Row[]
}

// ---------------------------------------------------------------------------
// GA4 API calls
// ---------------------------------------------------------------------------

// Fetches the metrics + daily trend report for a single property.
// Metrics returned in order: sessions, activeUsers, newUsers,
// screenPageViews, bounceRate, averageSessionDuration
async function fetchMetricsReport(
  propertyId: string,
  dateRange: GA4DateRange,
  token: string
): Promise<GA4ReportResponse> {
  // Strip "properties/" prefix if present to build the URL, then add it back
  const id = propertyId.replace(/^properties\//, '')
  const url = `${DATA_API_BASE}/${id}:runReport`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Metrics report failed for ${id} (${response.status}): ${body}`)
    throw new Error(`GA4 API request failed (status ${response.status})`)
  }

  return response.json()
}

// Fetches the top-5 traffic sources report for a single property.
async function fetchSourcesReport(
  propertyId: string,
  dateRange: GA4DateRange,
  token: string
): Promise<GA4ReportResponse> {
  const id = propertyId.replace(/^properties\//, '')
  const url = `${DATA_API_BASE}/${id}:runReport`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 5,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Sources report failed for ${id} (${response.status}): ${body}`)
    throw new Error(`GA4 API request failed (status ${response.status})`)
  }

  return response.json()
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

// Parses the metrics report into PropertyMetrics.
// Totals are summed across all date rows; bounceRate and averageSessionDuration
// are weighted by sessions (not averaged by day count).
function parseMetricsReport(data: GA4ReportResponse): PropertyMetrics {
  const rows = data.rows ?? []

  let sessions = 0
  let activeUsers = 0
  let newUsers = 0
  let screenPageViews = 0
  let bounceRateWeightedSum = 0
  let avgSessionDurationWeightedSum = 0
  const trend: DailyMetric[] = []

  for (const row of rows) {
    const mv = row.metricValues
    const rowSessions    = parseFloat(mv[0]?.value ?? '0')
    const rowActiveUsers = parseFloat(mv[1]?.value ?? '0')
    const rowNewUsers    = parseFloat(mv[2]?.value ?? '0')
    const rowPageViews   = parseFloat(mv[3]?.value ?? '0')
    const rowBounceRate  = parseFloat(mv[4]?.value ?? '0')
    const rowAvgDuration = parseFloat(mv[5]?.value ?? '0')

    sessions           += rowSessions
    activeUsers        += rowActiveUsers
    newUsers           += rowNewUsers
    screenPageViews    += rowPageViews

    // Weight by sessions so high-traffic days dominate the average
    bounceRateWeightedSum         += rowBounceRate * rowSessions
    avgSessionDurationWeightedSum += rowAvgDuration * rowSessions

    // date dimension comes back as YYYYMMDD — convert to YYYY-MM-DD
    const rawDate = row.dimensionValues[0]?.value ?? ''
    const date = rawDate.length === 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : rawDate

    trend.push({
      date,
      sessions: Math.round(rowSessions),
      activeUsers: Math.round(rowActiveUsers),
    })
  }

  return {
    sessions:               Math.round(sessions),
    activeUsers:            Math.round(activeUsers),
    newUsers:               Math.round(newUsers),
    screenPageViews:        Math.round(screenPageViews),
    bounceRate:             sessions > 0 ? bounceRateWeightedSum / sessions : 0,
    averageSessionDuration: sessions > 0 ? avgSessionDurationWeightedSum / sessions : 0,
    trend,
  }
}

// Parses the traffic sources report into TrafficSource[].
function parseSourcesReport(data: GA4ReportResponse): TrafficSource[] {
  return (data.rows ?? []).map((row) => ({
    channel:  row.dimensionValues[0]?.value ?? 'Unknown',
    sessions: Math.round(parseFloat(row.metricValues[0]?.value ?? '0')),
  }))
}

// ---------------------------------------------------------------------------
// Per-property fetch orchestration
// ---------------------------------------------------------------------------

// Fetches both reports for a single property and assembles a PropertyResult.
// On any error the property is returned with metrics: null and an error message
// so that one failing property doesn't break the entire response.
async function fetchProperty(
  propertyId: string,
  displayName: string,
  dateRange: GA4DateRange,
  token: string
): Promise<PropertyResult> {
  try {
    const [metricsData, sourcesData] = await Promise.all([
      fetchMetricsReport(propertyId, dateRange, token),
      fetchSourcesReport(propertyId, dateRange, token),
    ])

    return {
      propertyId,
      displayName,
      metrics: parseMetricsReport(metricsData),
      sources: parseSourcesReport(sourcesData),
      error:   null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      propertyId,
      displayName,
      metrics: null,
      sources: [],
      error:   message,
    }
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

// GET /api/analytics?days=7d|30d|90d
// Header: x-dashboard-password
// Env:    GA_PROPERTY_IDS  — comma-separated, e.g. "properties/123,properties/456"
//         GA_PROPERTY_NAMES — comma-separated display names (same order, optional)
// Returns: ReportResponse
export default async (request: Request, _context: Context): Promise<Response> => {
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: JSON_HEADERS })
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: JSON_HEADERS }
    )
  }

  // Validate password header
  const authError = validateAuth(request)
  if (authError) return authError

  // Read and validate property IDs from env
  const propertyIdsEnv = process.env.GA_PROPERTY_IDS
  if (!propertyIdsEnv) {
    console.error('GA_PROPERTY_IDS environment variable is not configured')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  const propertyIds = propertyIdsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (propertyIds.length === 0) {
    console.error('GA_PROPERTY_IDS is empty after parsing')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  // Build display name map — falls back to propertyId when name not provided
  const propertyNamesEnv = process.env.GA_PROPERTY_NAMES ?? ''
  const propertyNames = propertyNamesEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const displayNameFor = (index: number, id: string): string =>
    propertyNames[index]?.length > 0 ? propertyNames[index] : id

  // Parse query params
  const url = new URL(request.url)
  const days = parseDaysParam(url)
  const dateRange = buildDateRange(days)

  try {
    const token = await getAccessToken()
    const results: PropertyResult[] = []

    // Fan out across all properties in batches of BATCH_SIZE to respect rate limits
    for (let i = 0; i < propertyIds.length; i += BATCH_SIZE) {
      const batch = propertyIds.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map((id, batchIndex) =>
          fetchProperty(
            id,
            displayNameFor(i + batchIndex, id),
            dateRange,
            token
          )
        )
      )

      // allSettled guarantees we get a result for every property.
      // fetchProperty already catches its own errors and returns a PropertyResult,
      // so 'rejected' only happens if fetchProperty itself throws unexpectedly.
      for (const [index, result] of batchResults.entries()) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          // Defensive fallback — fetchProperty should never reject
          const id = batch[index] ?? 'unknown'
          results.push({
            propertyId:  id,
            displayName: displayNameFor(i + index, id),
            metrics:     null,
            sources:     [],
            error:       result.reason instanceof Error
              ? result.reason.message
              : 'Unexpected error',
          })
        }
      }
    }

    const report: ReportResponse = {
      generatedAt: new Date().toISOString(),
      dateRange:   days,
      properties:  results,
    }

    return new Response(
      JSON.stringify(report),
      { status: 200, headers: JSON_HEADERS }
    )
  } catch (err) {
    console.error('Analytics endpoint error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch analytics data' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }
}
