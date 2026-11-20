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
import { accessTokenOrResponse } from './lib/google-access.js'
import { GoogleApiError, googleApiErrorFrom, isTokenRejected, QUOTA_MESSAGE } from './lib/google-error.js'

// GA4 Data API base URL (uses full property resource name)
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

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
    const err = await googleApiErrorFrom(response)
    console.error(`Detail report failed for ${propertyId} (${err.status}): ${err.message}`)
    throw err
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

  if (!propertyId || !/^properties\/\d+$/.test(propertyId)) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid query param: property' }),
      { status: 400, headers: JSON_HEADERS }
    )
  }

  const dateRange = buildDateRange(days)

  try {
    // Get the user's Google access token (auto-refreshes if near expiry);
    // no usable token = 503 "try again" or 401 "sign in again"
    const tokenOrResponse = await accessTokenOrResponse(session.sub)
    if (tokenOrResponse instanceof Response) return tokenOrResponse

    let reports: [GA4ReportResponse, GA4ReportResponse, GA4ReportResponse]
    try {
      reports = await fetchDetailReports(propertyId, dateRange, tokenOrResponse)
    } catch (err) {
      if (!isTokenRejected(err)) throw err
      // Google refused a token we thought was valid (e.g. the user removed
      // StatPilot's access in their Google Account): refresh once and retry.
      // A revoked grant fails the refresh → tokens deleted → 401 sign in again.
      const retryToken = await accessTokenOrResponse(session.sub, tokenOrResponse)
      if (retryToken instanceof Response) return retryToken
      reports = await fetchDetailReports(propertyId, dateRange, retryToken)
    }
    const [pagesData, devicesData, countriesData] = reports

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
    return detailErrorResponse(err)
  }
}

/**
 * Error answer for the detail view. Google's own message is shown (it used to
 * be hidden behind "Failed to fetch property details"), with plain words for
 * the usage limit (429) and for a sign-in Google no longer accepts (401).
 */
function detailErrorResponse(err: unknown): Response {
  if (err instanceof GoogleApiError) {
    if (err.status === 401) {
      return new Response(
        JSON.stringify({ error: 'Google no longer accepts your sign-in. Please sign in again.' }),
        { status: 401, headers: JSON_HEADERS }
      )
    }
    const quotaReached = err.status === 429
    return new Response(
      JSON.stringify({ error: quotaReached ? QUOTA_MESSAGE : `Google Analytics: ${err.message}` }),
      { status: quotaReached ? 429 : 502, headers: JSON_HEADERS }
    )
  }
  return new Response(
    JSON.stringify({ error: 'Failed to fetch property details' }),
    { status: 500, headers: JSON_HEADERS }
  )
}

/** The 3 detail reports (top pages, devices, countries), fetched in parallel. */
function fetchDetailReports(
  propertyId: string,
  dateRange: GA4DateRange,
  token: string
): Promise<[GA4ReportResponse, GA4ReportResponse, GA4ReportResponse]> {
  return Promise.all([
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
}
