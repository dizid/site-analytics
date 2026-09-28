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
import { getValidAccessToken } from './lib/tokens.js'
import {
  parseDaysParam,
  buildOverviewRequests,
  parseMetricsReport,
  parseSourcesReport,
  type GA4ReportResponse,
} from './lib/ga4-report.js'

// GA4 Data API base URL
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta/properties'

// GA4 Admin API for property discovery
const ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta'

// Maximum properties per batch to stay within GA4 rate limits
const BATCH_SIZE = 3

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
    })

    if (!response.ok) return undefined

    const data = await response.json() as DataStreamsResponse
    const webStream = data.dataStreams?.find(s => s.type === 'WEB_DATA_STREAM')
    return webStream?.webStreamData?.defaultUri
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

    const results: PropertyResult[] = []

    // Fan out across all properties in batches of BATCH_SIZE to respect rate limits
    for (let i = 0; i < properties.length; i += BATCH_SIZE) {
      const batch = properties.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(({ propertyId, displayName }) =>
          fetchProperty(propertyId, displayName, days, token)
        )
      )

      // allSettled guarantees a result for every property.
      // fetchProperty catches its own errors and returns a PropertyResult,
      // so 'rejected' only happens if fetchProperty itself throws unexpectedly.
      for (const [index, result] of batchResults.entries()) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          // Defensive fallback — fetchProperty should never reject
          const { propertyId, displayName } = batch[index] ?? { propertyId: 'unknown', displayName: 'unknown' }
          results.push({
            propertyId,
            displayName,
            metrics: null,
            sources: [],
            error:   result.reason instanceof Error
              ? result.reason.message
              : 'Unexpected error',
          })
        }
      }
    }

    // Retry failed properties once after a short delay (handles transient rate-limit rejections).
    // Skip permanent errors — permission issues (UNAUTHENTICATED, PERMISSION_DENIED) won't resolve on retry.
    const permanentErrors = ['UNAUTHENTICATED', 'PERMISSION_DENIED', 'insufficient permissions']
    const failedIndices = results
      .map((r, i) => {
        if (!r.error) return -1
        if (permanentErrors.some(pe => r.error!.toLowerCase().includes(pe.toLowerCase()))) return -1
        return i
      })
      .filter(i => i !== -1)

    if (failedIndices.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      for (let i = 0; i < failedIndices.length; i += BATCH_SIZE) {
        const retryBatch = failedIndices.slice(i, i + BATCH_SIZE)
        const retryResults = await Promise.allSettled(
          retryBatch.map(idx => {
            const { propertyId, displayName } = properties[idx]
            return fetchProperty(propertyId, displayName, days, token)
          })
        )
        for (const [j, result] of retryResults.entries()) {
          if (result.status === 'fulfilled' && result.value.error === null) {
            results[retryBatch[j]] = result.value
          }
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
