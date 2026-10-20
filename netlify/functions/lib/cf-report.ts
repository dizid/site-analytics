/**
 * Pure Cloudflare Web Analytics (RUM) helpers: date ranges, GraphQL request
 * shapes, and response parsing. No network or env access — unit-testable.
 *
 * Dataset: rumPageloadEventsAdaptiveGroups (rows = groups of page loads).
 *   count      = pageviews
 *   sum.visits = visits (page loads whose referrer is another site, or none)
 *
 * Account limits (GraphQL `settings` node): one query node may span at most
 * 93 days and data is kept for 184 days. 90d + previous 90d = 180 days back,
 * so it fits, but the current and previous period must be separate nodes.
 */

import type {
  DateRange,
  DailyMetric,
  PeriodTotals,
  PropertyResult,
  PropertyDetail,
} from '../../../src/types/analytics.js'

// ---------------------------------------------------------------------------
// Date ranges (UTC calendar days — Cloudflare's `date` dimension is UTC)
// ---------------------------------------------------------------------------

/** Inclusive YYYY-MM-DD range. */
export interface CFDateRange {
  start: string
  end: string
}

const RANGE_DAYS: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90 }

const DAY_MS = 24 * 60 * 60 * 1000

/** The UTC date `offset` days from now's UTC date, as YYYY-MM-DD. */
function utcDay(now: Date, offset: number): string {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)
  return new Date(day).toISOString().slice(0, 10)
}

/** Current period: the N full days ending yesterday (today is partial), like GA4. */
export function buildCfDateRange(days: DateRange, now = new Date()): CFDateRange {
  const n = RANGE_DAYS[days]
  return { start: utcDay(now, -n), end: utcDay(now, -1) }
}

/** The equally long period immediately before the current one. */
export function buildCfPreviousDateRange(days: DateRange, now = new Date()): CFDateRange {
  const n = RANGE_DAYS[days]
  return { start: utcDay(now, -2 * n), end: utcDay(now, -n - 1) }
}

/** Every date in the range, in order — used to zero-fill the sparkline. */
export function listDates(range: CFDateRange): string[] {
  const dates: string[] = []
  const end = Date.parse(`${range.end}T00:00:00Z`)
  for (let t = Date.parse(`${range.start}T00:00:00Z`); t <= end; t += DAY_MS) {
    dates.push(new Date(t).toISOString().slice(0, 10))
  }
  return dates
}

// ---------------------------------------------------------------------------
// Access + config
// ---------------------------------------------------------------------------

/**
 * The Cloudflare data is the owner's own account, so only CF_OWNER_EMAIL may
 * see it. Case-insensitive. An unset owner email means nobody does.
 */
export function isCloudflareOwner(email: string, ownerEmail: string | undefined): boolean {
  const owner = (ownerEmail ?? '').trim().toLowerCase()
  return owner !== '' && email.trim().toLowerCase() === owner
}

/** One-line hint for the owner naming the missing env vars; null when configured. */
export function missingConfigNotice(token: string | undefined, accountId: string | undefined): string | null {
  const missing = [
    token ? null : 'CLOUDFLARE_API_TOKEN',
    accountId ? null : 'CLOUDFLARE_ACCOUNT_ID',
  ].filter((name): name is string => name !== null)
  if (missing.length === 0) return null
  return `Cloudflare Web Analytics not connected — set ${missing.join(' and ')} in the Netlify env vars.`
}

// ---------------------------------------------------------------------------
// Property IDs — "cloudflare:<siteTag>" keeps them distinct from GA4's "properties/123"
// ---------------------------------------------------------------------------

const PROPERTY_PREFIX = 'cloudflare:'

export function cfPropertyId(siteTag: string): string {
  return `${PROPERTY_PREFIX}${siteTag}`
}

/** Accepts "cloudflare:<siteTag>" or a bare site tag. Returns null when malformed. */
export function parseSiteParam(raw: string | null): string | null {
  if (!raw) return null
  const tag = raw.startsWith(PROPERTY_PREFIX) ? raw.slice(PROPERTY_PREFIX.length) : raw
  return /^[A-Za-z0-9_-]{1,64}$/.test(tag) ? tag : null
}

// ---------------------------------------------------------------------------
// GraphQL request shapes
// ---------------------------------------------------------------------------

const FILTER_TYPE = 'AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject'

/** Filter for one period (optionally one site). `bot: 0` drops known bots, as GA4 does. */
export function buildFilter(range: CFDateRange, siteTag?: string): object {
  return {
    AND: [
      { date_geq: range.start, date_leq: range.end },
      { bot: 0 },
      ...(siteTag ? [{ siteTag }] : []),
    ],
  }
}

/**
 * Overview for ALL sites in one request, grouped by site:
 * - current / previous: totals per site + host (host names the site when the
 *   REST site list is unavailable)
 * - daily: visits per site per day (sparkline)
 */
export const OVERVIEW_QUERY = `query StatPilotOverview($accountTag: string!, $current: ${FILTER_TYPE}!, $previous: ${FILTER_TYPE}!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      current: rumPageloadEventsAdaptiveGroups(filter: $current, limit: 1000, orderBy: [count_DESC]) {
        count
        sum { visits }
        dimensions { siteTag requestHost }
      }
      previous: rumPageloadEventsAdaptiveGroups(filter: $previous, limit: 1000, orderBy: [count_DESC]) {
        count
        sum { visits }
        dimensions { siteTag requestHost }
      }
      daily: rumPageloadEventsAdaptiveGroups(filter: $current, limit: 10000, orderBy: [date_ASC]) {
        sum { visits }
        dimensions { siteTag date }
      }
    }
  }
}`

export function buildOverviewVariables(accountTag: string, days: DateRange, now = new Date()) {
  return {
    accountTag,
    current: buildFilter(buildCfDateRange(days, now)),
    previous: buildFilter(buildCfPreviousDateRange(days, now)),
  }
}

/** One site's breakdowns for the current period. Referrers over-fetch: own-host rows get dropped. */
export const DETAIL_QUERY = `query StatPilotDetail($accountTag: string!, $filter: ${FILTER_TYPE}!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      pages: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 10, orderBy: [count_DESC]) {
        count
        dimensions { requestPath }
      }
      referrers: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 20, orderBy: [sum_visits_DESC]) {
        sum { visits }
        dimensions { refererHost }
      }
      countries: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 10, orderBy: [sum_visits_DESC]) {
        sum { visits }
        dimensions { countryName }
      }
      devices: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 10, orderBy: [sum_visits_DESC]) {
        sum { visits }
        dimensions { deviceType }
      }
    }
  }
}`

export function buildDetailVariables(accountTag: string, siteTag: string, days: DateRange, now = new Date()) {
  return { accountTag, filter: buildFilter(buildCfDateRange(days, now), siteTag) }
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface CFGroup {
  count?: number
  sum?: { visits?: number }
  dimensions?: {
    siteTag?: string
    requestHost?: string
    date?: string
    requestPath?: string
    refererHost?: string
    countryName?: string
    deviceType?: string
  }
}

export interface CFOverviewAccount {
  current?: CFGroup[]
  previous?: CFGroup[]
  daily?: CFGroup[]
}

export interface CFDetailAccount {
  pages?: CFGroup[]
  referrers?: CFGroup[]
  countries?: CFGroup[]
  devices?: CFGroup[]
}

export interface CFGraphQLResponse<T> {
  data?: { viewer?: { accounts?: T[] } } | null
  errors?: Array<{ message?: string }> | null
}

/** One entry of GET /accounts/{id}/rum/site_info/list. site_token is never read. */
export interface CFSiteInfo {
  site_tag?: string
  host?: string
  ruleset?: { zone_name?: string }
  rules?: Array<{ host?: string }>
}

export interface CFSite {
  siteTag: string
  host: string | null
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/** Readable message from a Cloudflare error body (REST or GraphQL shape). */
export function parseCfApiError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as { errors?: Array<{ message?: string }> }
    const message = parsed.errors?.find((e) => e.message)?.message
    if (message) return `Cloudflare API: ${message}`
  } catch { /* body wasn't JSON */ }
  return `Cloudflare API request failed (status ${status})`
}

/** Returns the queried account node, or throws with Cloudflare's own error message. */
export function extractAccount<T>(response: CFGraphQLResponse<T>): T {
  if (response.errors?.length) {
    const message = response.errors.find((e) => e.message)?.message ?? 'unknown GraphQL error'
    throw new Error(`Cloudflare API: ${message}`)
  }
  const account = response.data?.viewer?.accounts?.[0]
  if (!account) throw new Error('Cloudflare API: account not found — check CLOUDFLARE_ACCOUNT_ID')
  return account
}

/**
 * Parses the REST site list. Manual (JS snippet) sites carry their host at the
 * top level; proxied ones in their rules or zone.
 */
export function parseSiteList(result: CFSiteInfo[] | null | undefined): CFSite[] {
  return (result ?? [])
    .filter((site): site is CFSiteInfo & { site_tag: string } => Boolean(site.site_tag))
    .map((site) => ({
      siteTag: site.site_tag,
      host: site.host || site.rules?.find((r) => r.host)?.host || site.ruleset?.zone_name || null,
    }))
}

interface SiteTotals {
  pageviews: number
  visits: number
  /** Pageviews per request host — a site tag can see several (www, apex, previews). */
  hosts: Map<string, number>
}

/** Sums rows per site tag (a site has one row per host). */
function totalsBySite(rows: CFGroup[] | undefined): Map<string, SiteTotals> {
  const bySite = new Map<string, SiteTotals>()
  for (const row of rows ?? []) {
    const tag = row.dimensions?.siteTag
    if (!tag) continue
    const totals = bySite.get(tag) ?? { pageviews: 0, visits: 0, hosts: new Map<string, number>() }
    const count = row.count ?? 0
    totals.pageviews += count
    totals.visits += row.sum?.visits ?? 0
    const host = row.dimensions?.requestHost
    if (host) totals.hosts.set(host, (totals.hosts.get(host) ?? 0) + count)
    bySite.set(tag, totals)
  }
  return bySite
}

/** The host with the most pageviews (ties: alphabetical), or null. */
function busiestHost(totals: SiteTotals | undefined): string | null {
  let best: [string, number] | null = null
  for (const entry of totals?.hosts ?? []) {
    if (!best || entry[1] > best[1] || (entry[1] === best[1] && entry[0] < best[0])) best = entry
  }
  return best?.[0] ?? null
}

/**
 * Maps Cloudflare onto the shared columns: visits → sessions,
 * pageviews → screenPageViews. The GA4-only metrics are 0 placeholders
 * (the frontend shows "–" for them, see hasMetric()).
 */
function toPeriodTotals(totals: SiteTotals | undefined): PeriodTotals {
  return {
    sessions:               totals?.visits ?? 0,
    screenPageViews:        totals?.pageviews ?? 0,
    activeUsers:            0,
    newUsers:               0,
    bounceRate:             0,
    averageSessionDuration: 0,
  }
}

/**
 * One PropertyResult per Cloudflare site, sorted by name.
 * `sites` is the REST site list (also includes sites without traffic). It is
 * null when the token can't list sites (no "Account Settings: Read"); then
 * every site with traffic in either period is shown, named after its busiest host.
 */
export function buildCloudflareProperties(
  account: CFOverviewAccount,
  currentRange: CFDateRange,
  sites: CFSite[] | null,
): PropertyResult[] {
  const current = totalsBySite(account.current)
  const previous = totalsBySite(account.previous)

  // siteTag → date → visits
  const dailyBySite = new Map<string, Map<string, number>>()
  for (const row of account.daily ?? []) {
    const tag = row.dimensions?.siteTag
    const date = row.dimensions?.date
    if (!tag || !date) continue
    const days = dailyBySite.get(tag) ?? new Map<string, number>()
    days.set(date, (days.get(date) ?? 0) + (row.sum?.visits ?? 0))
    dailyBySite.set(tag, days)
  }

  const siteList: CFSite[] = sites
    ?? [...new Set([...current.keys(), ...previous.keys()])].map((siteTag) => ({ siteTag, host: null }))
  const dates = listDates(currentRange)

  return siteList
    .map(({ siteTag, host }): PropertyResult => {
      const name = host ?? busiestHost(current.get(siteTag)) ?? busiestHost(previous.get(siteTag))
      const days = dailyBySite.get(siteTag)
      const trend: DailyMetric[] = dates.map((date) => ({
        date,
        sessions:    days?.get(date) ?? 0,
        activeUsers: 0,
      }))
      return {
        propertyId:  cfPropertyId(siteTag),
        displayName: name ?? siteTag,
        websiteUrl:  name ? `https://${name}` : undefined,
        source:      'cloudflare',
        metrics: {
          ...toPeriodTotals(current.get(siteTag)),
          previous: toPeriodTotals(previous.get(siteTag)),
          trend,
        },
        sources: [],
        error:   null,
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** Cloudflare returns ISO codes ("TH"); show names ("Thailand") like GA4 does. */
export function countryLabel(code: string | undefined): string {
  if (!code) return 'Unknown'
  if (!/^[A-Z]{2}$/.test(code)) return code
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

const visitsOf = (row: CFGroup): number => row.sum?.visits ?? 0

/** Parses the detail query into the shared PropertyDetail shape (visits → sessions). */
export function parseCfDetail(account: CFDetailAccount, siteTag: string): PropertyDetail {
  return {
    propertyId: cfPropertyId(siteTag),
    pages: (account.pages ?? []).map((row) => ({
      pagePath:  row.dimensions?.requestPath || '/',
      pageviews: row.count ?? 0,
    })),
    // Internal navigation has the site's own host as referrer but adds no
    // visits, so rows with 0 visits are the site itself — drop them.
    referrers: (account.referrers ?? [])
      .filter((row) => visitsOf(row) > 0)
      .slice(0, 10)
      .map((row) => ({
        referrer: row.dimensions?.refererHost || '(direct)',
        sessions: visitsOf(row),
      })),
    countries: (account.countries ?? [])
      .filter((row) => visitsOf(row) > 0)
      .map((row) => ({
        country:  countryLabel(row.dimensions?.countryName),
        sessions: visitsOf(row),
      })),
    devices: (account.devices ?? [])
      .filter((row) => visitsOf(row) > 0)
      .map((row) => ({
        device:   row.dimensions?.deviceType || 'unknown',
        sessions: visitsOf(row),
      })),
  }
}
