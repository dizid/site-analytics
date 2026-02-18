import type { Context } from '@netlify/functions'
import type { PropertyInfo } from '../../src/types/analytics.js'
import { JSON_HEADERS, validateAuth, getAccessToken } from './lib/auth.js'

// GA4 Admin API endpoint for listing account summaries (includes all properties)
const ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta'

// Safety cap to prevent infinite pagination loops
const MAX_PAGES = 50

// GA4 Admin API response shape for accountSummaries
interface AccountSummary {
  name: string
  displayName: string
  propertySummaries?: Array<{
    property: string       // e.g. "properties/123456789"
    displayName: string
  }>
}

interface AccountSummariesResponse {
  accountSummaries?: AccountSummary[]
  nextPageToken?: string
}

// Fetches all pages of accountSummaries from the GA4 Admin API and
// returns a flat list of { propertyId, displayName }.
async function fetchAllProperties(token: string): Promise<PropertyInfo[]> {
  const properties: PropertyInfo[] = []
  let pageToken: string | undefined
  let pageCount = 0

  do {
    if (++pageCount > MAX_PAGES) {
      throw new Error(`Exceeded ${MAX_PAGES} pages fetching GA4 properties — possible API loop`)
    }

    const url = new URL(`${ADMIN_API_BASE}/accountSummaries`)
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`GA4 Admin API error ${response.status}: ${errorBody}`)
      throw new Error(`GA4 Admin API request failed (status ${response.status})`)
    }

    const data: AccountSummariesResponse = await response.json()

    for (const account of data.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        // prop.property is "properties/123456789" — we store the full resource name
        properties.push({
          propertyId: prop.property,
          displayName: prop.displayName,
        })
      }
    }

    pageToken = data.nextPageToken
  } while (pageToken)

  return properties
}

// GET /api/properties
// Header: x-dashboard-password
// Returns: PropertyInfo[] — all GA4 properties accessible to the service account
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

  try {
    const token = await getAccessToken()
    const properties = await fetchAllProperties(token)

    return new Response(
      JSON.stringify(properties),
      { status: 200, headers: JSON_HEADERS }
    )
  } catch (err) {
    console.error('Properties endpoint error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch properties' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }
}
