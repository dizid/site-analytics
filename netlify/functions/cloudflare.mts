/**
 * GET /api/cloudflare?days=7d|30d|90d             → CloudflareReportResponse (all sites)
 * GET /api/cloudflare?site=<id>&days=7d|30d|90d   → DetailResponse (one site)
 * Header: Authorization: Bearer <jwt>
 *
 * Cloudflare Web Analytics for the owner's own Cloudflare account:
 * 1. Validates the session JWT. Only CF_OWNER_EMAIL gets data — everyone else
 *    gets an empty list (not an error), so their dashboard stays GA4-only
 * 2. Lists the account's Web Analytics sites (REST). Needs "Account Settings:
 *    Read" on the token; without it, sites are taken from the traffic data
 * 3. ONE GraphQL call for all sites: totals for current + previous period and
 *    a daily series, asked in weekly chunks to avoid sampling (see lib/cf-report.ts)
 *
 * Env (server-side only): CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CF_OWNER_EMAIL.
 * Missing token/account → empty list plus a one-line hint for the owner.
 */

import type { Context } from '@netlify/functions'
import type {
  CloudflareReportResponse,
  DateRange,
  DetailResponse,
} from '../../src/types/analytics.js'
import { JSON_HEADERS, checkAllowedEmail, validateSession } from './lib/auth.js'
import { parseDaysParam } from './lib/ga4-report.js'
import {
  buildOverviewRequest,
  buildDetailRequests,
  mergeOverviewChunks,
  mergeDetailChunks,
  buildCfDateRange,
  buildCloudflareProperties,
  parseCfDetail,
  parseSiteList,
  parseSiteParam,
  parseCfApiError,
  extractAccount,
  isCloudflareOwner,
  missingConfigNotice,
  type CFChunkedAccount,
  type CFGraphQLRequest,
  type CFGraphQLResponse,
  type CFSite,
  type CFSiteInfo,
} from './lib/cf-report.js'

const API_BASE = 'https://api.cloudflare.com/client/v4'

// Safety cap on site-list pagination (100 sites per page)
const MAX_SITE_PAGES = 10

interface CloudflareConfig {
  token: string
  accountId: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function readConfig(): CloudflareConfig | null {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  return token && accountId ? { token, accountId } : null
}

// ---------------------------------------------------------------------------
// Cloudflare API calls
// ---------------------------------------------------------------------------

/** POSTs a GraphQL request and returns the account node. Throws with Cloudflare's message. */
async function queryAccount<T>(config: CloudflareConfig, request: CFGraphQLRequest): Promise<T> {
  const response = await fetch(`${API_BASE}/graphql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const body = await response.text()
  if (!response.ok) {
    console.error(`Cloudflare GraphQL failed (${response.status}): ${body}`)
    throw new Error(parseCfApiError(body, response.status))
  }

  const parsed = JSON.parse(body) as CFGraphQLResponse<T>
  if (parsed.errors?.length) {
    console.error('Cloudflare GraphQL errors:', JSON.stringify(parsed.errors))
  }
  return extractAccount(parsed)
}

/**
 * Lists the account's Web Analytics sites. Returns null when the token may not
 * list them (it needs "Account Settings: Read") or the call fails — the caller
 * then falls back to the sites seen in the traffic data. Never throws.
 */
async function fetchSiteList(config: CloudflareConfig): Promise<CFSite[] | null> {
  try {
    const sites: CFSite[] = []
    const accountId = encodeURIComponent(config.accountId)

    for (let page = 1; page <= MAX_SITE_PAGES; page++) {
      const response = await fetch(
        `${API_BASE}/accounts/${accountId}/rum/site_info/list?per_page=100&page=${page}`,
        { headers: { Authorization: `Bearer ${config.token}` } },
      )
      if (!response.ok) return null

      const data = await response.json() as {
        success?: boolean
        result?: CFSiteInfo[]
        result_info?: { total_pages?: number }
      }
      if (!data.success) return null

      sites.push(...parseSiteList(data.result))
      if (page >= (data.result_info?.total_pages ?? 1)) break
    }
    return sites
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** All sites: per-site totals, previous period, and daily trend. */
async function handleOverview(isOwner: boolean, days: DateRange): Promise<Response> {
  const report = (fields: Partial<CloudflareReportResponse> = {}): CloudflareReportResponse => ({
    generatedAt: new Date().toISOString(),
    dateRange:   days,
    properties:  [],
    notice:      null,
    ...fields,
  })

  // Not the owner: empty list, no hint — their dashboard stays exactly GA4-only
  if (!isOwner) return jsonResponse(report())

  const config = readConfig()
  if (!config) {
    return jsonResponse(report({
      notice: missingConfigNotice(process.env.CLOUDFLARE_API_TOKEN, process.env.CLOUDFLARE_ACCOUNT_ID),
    }))
  }

  try {
    const now = new Date()
    const [sites, account] = await Promise.all([
      fetchSiteList(config),
      queryAccount<CFChunkedAccount>(config, buildOverviewRequest(config.accountId, days, now)),
    ])

    const properties = buildCloudflareProperties(mergeOverviewChunks(account), buildCfDateRange(days, now), sites)

    return jsonResponse(report({
      properties,
      notice: properties.length === 0
        ? 'Cloudflare connected, but no Web Analytics page views recorded in this period yet.'
        : null,
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Cloudflare overview failed:', err)
    return jsonResponse({ error: message }, 502)
  }
}

/** One site: top pages, referrers, countries, devices. */
async function handleDetail(
  isOwner: boolean,
  siteParam: string,
  days: DateRange,
): Promise<Response> {
  if (!isOwner) return jsonResponse({ error: 'Not found' }, 404)

  const siteTag = parseSiteParam(siteParam)
  if (!siteTag) return jsonResponse({ error: 'Invalid query param: site' }, 400)

  const config = readConfig()
  if (!config) {
    const notice = missingConfigNotice(process.env.CLOUDFLARE_API_TOKEN, process.env.CLOUDFLARE_ACCOUNT_ID)
    return jsonResponse({ error: notice }, 503)
  }

  try {
    // One request per breakdown (Cloudflare caps nodes per request); aliases don't overlap
    const accounts = await Promise.all(
      buildDetailRequests(config.accountId, siteTag, days)
        .map((request) => queryAccount<CFChunkedAccount>(config, request)),
    )
    const account: CFChunkedAccount = Object.assign({}, ...accounts)

    const result: DetailResponse = {
      generatedAt: new Date().toISOString(),
      dateRange:   days,
      detail:      parseCfDetail(mergeDetailChunks(account), siteTag),
    }
    return jsonResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Cloudflare detail failed for ${siteTag}:`, err)
    return jsonResponse({ error: message }, 502)
  }
}

// GET /api/cloudflare?days=7d|30d|90d[&site=<id>]
// Header: Authorization: Bearer <jwt>
export default async (request: Request, _context: Context): Promise<Response> => {
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: JSON_HEADERS })
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // Validate session JWT
  const session = await validateSession(request)
  if (session instanceof Response) return session

  const url = new URL(request.url)
  const days = parseDaysParam(url)
  const siteParam = url.searchParams.get('site')

  const isOwner = checkAllowedEmail(session.email)
    && isCloudflareOwner(session.email, process.env.CF_OWNER_EMAIL)

  return siteParam === null
    ? handleOverview(isOwner, days)
    : handleDetail(isOwner, siteParam, days)
}
