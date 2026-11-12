/**
 * GET /api/analytics?days=7d|30d|90d
 * Header: Authorization: Bearer <jwt>
 *
 * Per-user analytics endpoint:
 * 1. Validates session JWT
 * 2. Gets user's Google access token (transparently refreshes if needed)
 * 3. Auto-discovers user's GA4 properties via Analytics Admin API
 * 4. Fetches trend, totals + traffic sources for each property (one batchRunReports call each)
 * 5. Returns a ReportResponse with all discovered properties
 */

import type { Context } from '@netlify/functions'
import type {
  DateRange,
  PropertyResult,
  ReportResponse,
} from '../../src/types/analytics.js'
import { JSON_HEADERS, validateSession } from './lib/auth.js'
import { getValidAccessToken, TokenRefreshUnavailableError } from './lib/tokens.js'
import {
  parseDaysParam,
  buildOverviewRequests,
  parseMetricsReport,
  parseSourcesReport,
  type GA4ReportResponse,
} from './lib/ga4-report.js'
import { mapWithConcurrency } from './lib/pool.js'

// GA4 Data API base URL
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta/properties'

// GA4 Admin API for property discovery
const ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta'

// Properties loaded at the same time. GA4's limit of 10 concurrent requests is
// per property, and these are all different properties. (Was 3 per batch, one
// batch after another: ~180 properties took about 60 s, Netlify's hard limit
// for this function, and the dashboard came back empty.)
const CONCURRENCY = 8

// One Google call may take at most this long (a hung call would otherwise hold
// the whole response past Netlify's 60 s limit).
const REQUEST_TIMEOUT_MS = 15_000

// After this much time since the request came in, no new property is started;
// the rest get a "not loaded" note. 35 s + one 15 s call stays under 60 s.
const TIME_BUDGET_MS = 35_000

const NOT_LOADED_IN_TIME =
  "Not loaded: this account has more properties than fit in one load. Refresh the page to try again."

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
// GA4 Admin API — property discovery
// ---------------------------------------------------------------------------

interface AdminPropertySummary {
  property: string        // "properties/123456"
  displayName: string
}

interface AdminAccountSummary {
  name: string            // "accountSummaries/123"
  displayName: string
  propertySummaries?: AdminPropertySummary[]
}

interface AdminAccountSummariesResponse {
  accountSummaries?: AdminAccountSummary[]
  nextPageToken?: string
}

interface DiscoveredProperty {
  propertyId: string     // "properties/123456"
  displayName: string
}

/**
 * Calls the GA4 Admin API to discover all properties the user has access to.
 * Handles pagination — iterates until all pages are consumed.
 */
async function discoverProperties(token: string): Promise<DiscoveredProperty[]> {
  const properties: DiscoveredProperty[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`${ADMIN_API_BASE}/accountSummaries`)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(`Admin API accountSummaries failed (${response.status}): ${body}`)
      throw new Error(parseGoogleApiError(body, response.status))
    }

    const data = await response.json() as AdminAccountSummariesResponse

    for (const account of data.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        properties.push({
          propertyId:  prop.property,
          displayName: prop.displayName,
        })
      }
    }

    pageToken = data.nextPageToken
  } while (pageToken)

  return properties
}

// ---------------------------------------------------------------------------
// GA4 Admin API — website URL from data streams
// ---------------------------------------------------------------------------

interface DataStream {
  name: string
  type: 'WEB_DATA_STREAM' | 'ANDROID_APP_DATA_STREAM' | 'IOS_APP_DATA_STREAM'
  webStreamData?: {
    defaultUri: string
    measurementId: string
  }
}

interface DataStreamsResponse {
  dataStreams?: DataStream[]
}

/**
 * Fetches the website URL for a property by finding its first WEB_DATA_STREAM.
 * Returns undefined for app-only properties or on any error — never throws.
 */
async function fetchWebsiteUrl(
  propertyId: string,
  token: string
): Promise<string | undefined> {
  try {
    const id = propertyId.replace(/^properties\//, '')
    const url = `${ADMIN_API_BASE}/properties/${id}/dataStreams`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) return undefined

    const data = await response.json() as DataStreamsResponse
    const webStream = data.dataStreams?.find(s => s.type === 'WEB_DATA_STREAM')
    const uri = webStream?.webStreamData?.defaultUri
    // Shown as a clickable link: only plain web addresses (never javascript: etc.)
    return typeof uri === 'string' && /^https?:\/\//i.test(uri) ? uri : undefined
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// GA4 Data API calls
// ---------------------------------------------------------------------------

interface PropertyReports {
  trend: GA4ReportResponse
  totals: GA4ReportResponse
  sources: GA4ReportResponse
}

// Fetches all overview reports for a single property in ONE batchRunReports
// request (see buildOverviewRequests for what each report contains).
async function fetchPropertyReports(
  propertyId: string,
  days: DateRange,
  token: string
): Promise<PropertyReports> {
  const id = propertyId.replace(/^properties\//, '')
  const url = `${DATA_API_BASE}/${id}:batchRunReports`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests: buildOverviewRequests(days) }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`batchRunReports failed for ${id} (${response.status}): ${body}`)
    throw new Error(parseGoogleApiError(body, response.status))
  }

  const data = await response.json() as { reports?: GA4ReportResponse[] }
  const [trend = {}, totals = {}, sources = {}] = data.reports ?? []
  return { trend, totals, sources }
}

// ---------------------------------------------------------------------------
// Per-property fetch orchestration
// ---------------------------------------------------------------------------

// Fetches all reports for a single property and assembles a PropertyResult.
// On any error the property is returned with metrics: null and an error message
// so that one failing property doesn't break the entire response.
async function fetchProperty(
  propertyId: string,
  displayName: string,
  days: DateRange,
  token: string
): Promise<PropertyResult> {
  try {
    const [reports, websiteUrl] = await Promise.all([
      fetchPropertyReports(propertyId, days, token),
      fetchWebsiteUrl(propertyId, token),
    ])

    return {
      propertyId,
      displayName,
      websiteUrl,
      metrics: parseMetricsReport(reports.trend, reports.totals),
      sources: parseSourcesReport(reports.sources),
      error:   null,
    }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    const message = timedOut
      ? 'Google Analytics took too long for this property. Refresh the page to try again.'
      : err instanceof Error ? err.message : 'Unknown error'
    return {
      propertyId,
      displayName,
      metrics: null,
      sources: [],
      error:   message,
    }
  }
}

/** Result for a property that wasn't started because the time budget ran out. */
function notLoadedInTime(propertyId: string, displayName: string): PropertyResult {
  return { propertyId, displayName, metrics: null, sources: [], error: NOT_LOADED_IN_TIME }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

// GET /api/analytics?days=7d|30d|90d
// Header: Authorization: Bearer <jwt>
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

  // Time budget for the whole request (see TIME_BUDGET_MS)
  const deadline = Date.now() + TIME_BUDGET_MS

  // Validate session JWT
  const session = await validateSession(request)
  if (session instanceof Response) return session

  // Parse query params
  const url      = new URL(request.url)
  const days     = parseDaysParam(url)

  try {
    // Get the user's Google access token (auto-refreshes if near expiry)
    // A 401 from getValidAccessToken means the user needs to re-authenticate
    let token: string
    try {
      token = await getValidAccessToken(session.sub)
    } catch (err) {
      if (err instanceof TokenRefreshUnavailableError) {
        console.error('Google token refresh temporarily unavailable:', err.message)
        return new Response(
          JSON.stringify({ error: "Google didn't respond. Please try again in a minute." }),
          { status: 503, headers: JSON_HEADERS }
        )
      }
      const detail = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Failed to get valid access token for user ${session.sub}:`, err)
      return new Response(
        JSON.stringify({ error: `Session expired — please sign in again (${detail})` }),
        { status: 401, headers: JSON_HEADERS }
      )
    }

    // Auto-discover properties the user has access to in Google Analytics
    let properties: DiscoveredProperty[]
    try {
      properties = await discoverProperties(token)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      console.error('Property discovery failed:', err)
      return new Response(
        JSON.stringify({ error: `Failed to discover GA4 properties: ${detail}` }),
        { status: 502, headers: JSON_HEADERS }
      )
    }

    // No properties found — valid state, return empty list with a clear message
    if (properties.length === 0) {
      const report: ReportResponse = {
        generatedAt: new Date().toISOString(),
        dateRange:   days,
        properties:  [],
      }
      return new Response(
        JSON.stringify(report),
        { status: 200, headers: JSON_HEADERS }
      )
    }

    // Load CONCURRENCY properties at a time. fetchProperty never throws: a
    // failing property comes back with metrics: null and its error message.
    const results = await mapWithConcurrency(
      properties,
      CONCURRENCY,
      ({ propertyId, displayName }) => fetchProperty(propertyId, displayName, days, token),
      { deadline, onSkip: ({ propertyId, displayName }) => notLoadedInTime(propertyId, displayName) }
    )

    // Retry failed properties once after a short delay (handles transient rate-limit rejections),
    // while time is left. Skip permanent errors (UNAUTHENTICATED, PERMISSION_DENIED won't resolve
    // on retry) and properties skipped for time.
    const permanentErrors = ['UNAUTHENTICATED', 'PERMISSION_DENIED', 'insufficient permissions']
    const failedIndices = results
      .map((r, i) => {
        if (!r.error || r.error === NOT_LOADED_IN_TIME) return -1
        if (permanentErrors.some(pe => r.error!.toLowerCase().includes(pe.toLowerCase()))) return -1
        return i
      })
      .filter(i => i !== -1)

    if (failedIndices.length > 0 && Date.now() + 1000 < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const retried = await mapWithConcurrency(
        failedIndices,
        CONCURRENCY,
        (idx) => fetchProperty(properties[idx].propertyId, properties[idx].displayName, days, token),
        { deadline, onSkip: (idx) => results[idx] }
      )
      for (const [j, result] of retried.entries()) {
        if (result.error === null) results[failedIndices[j]] = result
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
