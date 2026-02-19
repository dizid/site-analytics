/**
 * GET /api/analytics-detail?property=properties/123&days=7d|30d|90d
 * Header: Authorization: Bearer <jwt>
 *
 * Per-property detail endpoint:
 * 1. Validates session JWT
 * 2. Gets user's Google access token (transparently refreshes if needed)
 * 3. Fires 3 parallel GA4 runReport calls (pages, devices, countries)
 * 4. Returns a DetailResponse with parsed results
 */

import type { Context } from '@netlify/functions'
import type {
  DateRange,
  PageStats,
  DeviceBreakdown,
  CountryStats,
  DetailResponse,
} from '../../src/types/analytics.js'
import { JSON_HEADERS, validateSession } from './lib/auth.js'
import { getValidAccessToken } from './lib/tokens.js'

// GA4 Data API base URL (uses full property resource name)
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

// ---------------------------------------------------------------------------
// Google API error parsing
// ---------------------------------------------------------------------------

/** Extracts a human-readable error message from Google's JSON error response body. */
function parseGoogleApiError(body: string, status: number): string {
  try {
    const err = JSON.parse(body)
    const message = err.error?.message || err.error?.status
    if (message) return message
  } catch { /* body wasn't JSON */ }
  return `GA4 API request failed (status ${status})`
}

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

interface GA4DateRange {
  startDate: string
  endDate: string
}

function buildDateRange(days: DateRange): GA4DateRange {
  const map: Record<DateRange, GA4DateRange> = {
    '7d':  { startDate: '7daysAgo',  endDate: 'yesterday' },
    '30d': { startDate: '30daysAgo', endDate: 'yesterday' },
    '90d': { startDate: '90daysAgo', endDate: 'yesterday' },
  }
  return map[days]
}

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
// GA4 Data API calls
// ---------------------------------------------------------------------------

async function fetchReport(
  propertyId: string,
  dateRange: GA4DateRange,
  token: string,
  body: Record<string, unknown>
): Promise<GA4ReportResponse> {
  const url = `${DATA_API_BASE}/${propertyId}:runReport`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      ...body,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`Detail report failed for ${propertyId} (${response.status}): ${text}`)
    throw new Error(parseGoogleApiError(text, response.status))
  }

  return response.json()
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function parsePagesReport(data: GA4ReportResponse): PageStats[] {
  return (data.rows ?? []).map((row) => ({
    pagePath:  row.dimensionValues[0]?.value ?? '/',
    pageviews: Math.round(parseFloat(row.metricValues[0]?.value ?? '0')),
    bounceRate: parseFloat(row.metricValues[1]?.value ?? '0'),
  }))
}

function parseDevicesReport(data: GA4ReportResponse): DeviceBreakdown[] {
  return (data.rows ?? []).map((row) => ({
    device:   row.dimensionValues[0]?.value ?? 'Unknown',
    sessions: Math.round(parseFloat(row.metricValues[0]?.value ?? '0')),
  }))
}

function parseCountriesReport(data: GA4ReportResponse): CountryStats[] {
  return (data.rows ?? []).map((row) => ({
    country:  row.dimensionValues[0]?.value ?? 'Unknown',
    sessions: Math.round(parseFloat(row.metricValues[0]?.value ?? '0')),
  }))
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

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

  // Validate session JWT
  const session = await validateSession(request)
  if (session instanceof Response) return session

  // Parse query params
  const url = new URL(request.url)
  const propertyId = url.searchParams.get('property')
  const days = parseDaysParam(url)

  if (!propertyId) {
    return new Response(
      JSON.stringify({ error: 'Missing required query param: property' }),
      { status: 400, headers: JSON_HEADERS }
    )
  }

  const dateRange = buildDateRange(days)

  try {
    // Get the user's Google access token (auto-refreshes if near expiry)
    let token: string
    try {
      token = await getValidAccessToken(session.sub)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Failed to get valid access token for user ${session.sub}:`, err)
      return new Response(
        JSON.stringify({ error: `Session expired — please sign in again (${detail})` }),
        { status: 401, headers: JSON_HEADERS }
      )
    }

    // Fire 3 parallel GA4 runReport calls
    const [pagesData, devicesData, countriesData] = await Promise.all([
      // Report 1 — Top Pages
      fetchReport(propertyId, dateRange, token, {
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'bounceRate' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
      // Report 2 — Device Breakdown
      fetchReport(propertyId, dateRange, token, {
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
      // Report 3 — Top Countries
      fetchReport(propertyId, dateRange, token, {
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
    ])

    const result: DetailResponse = {
      generatedAt: new Date().toISOString(),
      dateRange: days,
      detail: {
        propertyId,
        pages: parsePagesReport(pagesData),
        devices: parseDevicesReport(devicesData),
        countries: parseCountriesReport(countriesData),
      },
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: JSON_HEADERS }
    )
  } catch (err) {
    console.error('Analytics detail endpoint error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch property details' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }
}
