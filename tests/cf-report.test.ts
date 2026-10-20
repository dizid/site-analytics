import { describe, it, expect } from 'vitest'
import {
  buildCfDateRange,
  buildCfPreviousDateRange,
  listDates,
  isCloudflareOwner,
  missingConfigNotice,
  cfPropertyId,
  parseSiteParam,
  buildFilter,
  buildOverviewVariables,
  buildDetailVariables,
  parseCfApiError,
  extractAccount,
  parseSiteList,
  buildCloudflareProperties,
  countryLabel,
  parseCfDetail,
  type CFOverviewAccount,
} from '../netlify/functions/lib/cf-report'

// Fixed clock: late on 2026-10-20 UTC (already the 21st in Bangkok)
const NOW = new Date('2026-10-20T23:30:00Z')

const DAY_MS = 24 * 60 * 60 * 1000
const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`)
const spanDays = (r: { start: string; end: string }) => (toMs(r.end) - toMs(r.start)) / DAY_MS + 1

describe('date ranges', () => {
  it.each([['7d', 7], ['30d', 30], ['90d', 90]] as const)(
    '%s covers exactly %i full UTC days ending yesterday',
    (range, days) => {
      const r = buildCfDateRange(range, NOW)
      expect(r.end).toBe('2026-10-19')
      expect(spanDays(r)).toBe(days)
    },
  )

  it.each([['7d', 7], ['30d', 30], ['90d', 90]] as const)(
    'previous period for %s is equally long and directly before the current one',
    (range, days) => {
      const current = buildCfDateRange(range, NOW)
      const previous = buildCfPreviousDateRange(range, NOW)
      expect(spanDays(previous)).toBe(days)
      expect(toMs(current.start) - toMs(previous.end)).toBe(DAY_MS)
    },
  )

  it('stays within the account limits (93-day node span, 184 days retention)', () => {
    const previous90 = buildCfPreviousDateRange('90d', NOW)
    expect(spanDays(previous90)).toBeLessThanOrEqual(93)
    expect((NOW.getTime() - toMs(previous90.start)) / DAY_MS).toBeLessThan(184)
  })

  it('uses UTC dates, not the local timezone', () => {
    expect(buildCfDateRange('7d', new Date('2026-01-01T00:30:00Z')))
      .toEqual({ start: '2025-12-25', end: '2025-12-31' })
  })

  it('lists every date of a range in order', () => {
    expect(listDates({ start: '2026-02-27', end: '2026-03-02' }))
      .toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
  })
})

describe('owner check and config', () => {
  it('only matches the configured owner email, case-insensitively', () => {
    expect(isCloudflareOwner('Owner@Example.com', ' owner@example.com ')).toBe(true)
    expect(isCloudflareOwner('someone@example.com', 'owner@example.com')).toBe(false)
  })

  it('lets nobody in when CF_OWNER_EMAIL is unset or empty', () => {
    expect(isCloudflareOwner('owner@example.com', undefined)).toBe(false)
    expect(isCloudflareOwner('', '')).toBe(false)
  })

  it('names the missing env vars, or returns null when configured', () => {
    expect(missingConfigNotice(undefined, 'acc')).toContain('CLOUDFLARE_API_TOKEN')
    expect(missingConfigNotice(undefined, undefined)).toContain('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID')
    expect(missingConfigNotice('tok', 'acc')).toBeNull()
  })
})

describe('property ids', () => {
  it('round-trips a site tag through the property id', () => {
    const tag = '0123456789abcdef0123456789abcdef'
    expect(parseSiteParam(cfPropertyId(tag))).toBe(tag)
    expect(parseSiteParam(tag)).toBe(tag)
  })

  it('rejects missing or malformed site params', () => {
    expect(parseSiteParam(null)).toBeNull()
    expect(parseSiteParam('')).toBeNull()
    expect(parseSiteParam('cloudflare:')).toBeNull()
    expect(parseSiteParam('abc"}{evil')).toBeNull()
  })
})

describe('request shapes', () => {
  it('filters one period, excludes bots, and optionally one site', () => {
    const range = { start: '2026-10-13', end: '2026-10-19' }
    expect(buildFilter(range)).toEqual({
      AND: [{ date_geq: '2026-10-13', date_leq: '2026-10-19' }, { bot: 0 }],
    })
    expect(buildFilter(range, 'abc')).toEqual({
      AND: [{ date_geq: '2026-10-13', date_leq: '2026-10-19' }, { bot: 0 }, { siteTag: 'abc' }],
    })
  })

  it('overview asks for the current and previous period separately', () => {
    const vars = buildOverviewVariables('acc', '30d', NOW)
    expect(vars.accountTag).toBe('acc')
    expect(vars.current).toEqual(buildFilter({ start: '2026-09-20', end: '2026-10-19' }))
    expect(vars.previous).toEqual(buildFilter({ start: '2026-08-21', end: '2026-09-19' }))
  })

  it('detail filters on the site and the current period', () => {
    expect(buildDetailVariables('acc', 'abc', '7d', NOW).filter)
      .toEqual(buildFilter({ start: '2026-10-13', end: '2026-10-19' }, 'abc'))
  })
})

describe('errors', () => {
  it('pulls the message out of a Cloudflare error body', () => {
    const body = JSON.stringify({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] })
    expect(parseCfApiError(body, 403)).toBe('Cloudflare API: Authentication error')
    expect(parseCfApiError('<html>', 502)).toBe('Cloudflare API request failed (status 502)')
  })

  it('throws GraphQL errors with their message', () => {
    expect(() => extractAccount({ data: null, errors: [{ message: 'not authorized for that account' }] }))
      .toThrow('Cloudflare API: not authorized for that account')
  })

  it('throws when the account node is missing', () => {
    expect(() => extractAccount({ data: { viewer: { accounts: [] } }, errors: null }))
      .toThrow('CLOUDFLARE_ACCOUNT_ID')
  })

  it('returns the account node on success', () => {
    expect(extractAccount({ data: { viewer: { accounts: [{ current: [] }] } }, errors: null }))
      .toEqual({ current: [] })
  })
})

describe('parseSiteList', () => {
  it('reads site tag and host, falling back to rules and zone, never the site token', () => {
    const sites = parseSiteList([
      { site_tag: 'a', host: 'foreground.info', site_token: 'secret' } as never,
      { site_tag: 'b', rules: [{}, { host: 'rule.example' }] },
      { site_tag: 'c', ruleset: { zone_name: 'zone.example' } },
      { site_tag: 'd' },
      { host: 'no-tag.example' },
    ])
    expect(sites).toEqual([
      { siteTag: 'a', host: 'foreground.info' },
      { siteTag: 'b', host: 'rule.example' },
      { siteTag: 'c', host: 'zone.example' },
      { siteTag: 'd', host: null },
    ])
    expect(JSON.stringify(sites)).not.toContain('secret')
  })

  it('handles an empty or missing result', () => {
    expect(parseSiteList(null)).toEqual([])
    expect(parseSiteList([])).toEqual([])
  })
})

describe('buildCloudflareProperties', () => {
  const range = { start: '2026-10-17', end: '2026-10-19' }

  // Site A: two hosts (apex + www); site B: only had traffic in the previous period
  const account: CFOverviewAccount = {
    current: [
      { count: 30, sum: { visits: 12 }, dimensions: { siteTag: 'A', requestHost: 'foreground.info' } },
      { count: 6, sum: { visits: 3 }, dimensions: { siteTag: 'A', requestHost: 'www.foreground.info' } },
    ],
    previous: [
      { count: 20, sum: { visits: 10 }, dimensions: { siteTag: 'A', requestHost: 'foreground.info' } },
      { count: 4, sum: { visits: 2 }, dimensions: { siteTag: 'B', requestHost: 'old.example' } },
    ],
    daily: [
      { sum: { visits: 9 }, dimensions: { siteTag: 'A', date: '2026-10-17' } },
      { sum: { visits: 6 }, dimensions: { siteTag: 'A', date: '2026-10-19' } },
    ],
  }

  it('sums hosts per site and maps visits → sessions, pageviews → screenPageViews', () => {
    const [a] = buildCloudflareProperties(account, range, null)
    expect(a).toMatchObject({
      propertyId: 'cloudflare:A',
      displayName: 'foreground.info',
      websiteUrl: 'https://foreground.info',
      source: 'cloudflare',
      sources: [],
      error: null,
    })
    expect(a?.metrics).toMatchObject({ sessions: 15, screenPageViews: 36 })
    expect(a?.metrics?.previous).toMatchObject({ sessions: 10, screenPageViews: 20 })
  })

  it('leaves the GA4-only metrics at 0 (shown as "–" in the UI)', () => {
    const [a] = buildCloudflareProperties(account, range, null)
    expect(a?.metrics).toMatchObject({ activeUsers: 0, newUsers: 0, bounceRate: 0, averageSessionDuration: 0 })
  })

  it('zero-fills the daily trend for days without visits', () => {
    const [a] = buildCloudflareProperties(account, range, null)
    expect(a?.metrics?.trend).toEqual([
      { date: '2026-10-17', sessions: 9, activeUsers: 0 },
      { date: '2026-10-18', sessions: 0, activeUsers: 0 },
      { date: '2026-10-19', sessions: 6, activeUsers: 0 },
    ])
  })

  it('without a site list, shows every site seen in either period', () => {
    const props = buildCloudflareProperties(account, range, null)
    expect(props.map((p) => p.displayName)).toEqual(['foreground.info', 'old.example'])
    expect(props[1]?.metrics).toMatchObject({ sessions: 0, screenPageViews: 0 })
    expect(props[1]?.metrics?.previous?.sessions).toBe(2)
  })

  it('with a site list, uses its hosts and includes sites without traffic', () => {
    const props = buildCloudflareProperties(account, range, [
      { siteTag: 'A', host: 'foreground.info' },
      { siteTag: 'Z', host: 'brand-new.example' },
    ])
    expect(props.map((p) => p.propertyId)).toEqual(['cloudflare:Z', 'cloudflare:A'])
    expect(props[0]?.metrics?.sessions).toBe(0)
    expect(props[0]?.metrics?.trend).toHaveLength(3)
  })

  it('falls back to the site tag when no host is known', () => {
    const [p] = buildCloudflareProperties({}, range, [{ siteTag: 'T', host: null }])
    expect(p?.displayName).toBe('T')
    expect(p?.websiteUrl).toBeUndefined()
  })

  it('returns an empty list when there is no data and no site list', () => {
    expect(buildCloudflareProperties({}, range, null)).toEqual([])
  })
})

describe('parseCfDetail', () => {
  it('maps pages, referrers, countries and devices', () => {
    const detail = parseCfDetail({
      pages: [
        { count: 40, dimensions: { requestPath: '/' } },
        { count: 7, dimensions: { requestPath: '/pricing' } },
      ],
      referrers: [
        { sum: { visits: 9 }, dimensions: { refererHost: '' } },
        { sum: { visits: 4 }, dimensions: { refererHost: 'www.google.com' } },
        { sum: { visits: 0 }, dimensions: { refererHost: 'foreground.info' } },
      ],
      countries: [{ sum: { visits: 8 }, dimensions: { countryName: 'TH' } }],
      devices: [
        { sum: { visits: 10 }, dimensions: { deviceType: 'mobile' } },
        { sum: { visits: 3 }, dimensions: { deviceType: 'desktop' } },
      ],
    }, 'A')

    expect(detail).toEqual({
      propertyId: 'cloudflare:A',
      pages: [
        { pagePath: '/', pageviews: 40 },
        { pagePath: '/pricing', pageviews: 7 },
      ],
      // Own host (0 visits = internal navigation) is dropped; empty = direct
      referrers: [
        { referrer: '(direct)', sessions: 9 },
        { referrer: 'www.google.com', sessions: 4 },
      ],
      countries: [{ country: 'Thailand', sessions: 8 }],
      devices: [
        { device: 'mobile', sessions: 10 },
        { device: 'desktop', sessions: 3 },
      ],
    })
  })

  it('has no bounce rate on pages (Cloudflare does not measure it)', () => {
    const detail = parseCfDetail({ pages: [{ count: 1, dimensions: { requestPath: '/a' } }] }, 'A')
    expect(detail.pages[0]).not.toHaveProperty('bounceRate')
  })

  it('handles a site with no data', () => {
    expect(parseCfDetail({}, 'A')).toEqual({
      propertyId: 'cloudflare:A', pages: [], referrers: [], countries: [], devices: [],
    })
  })
})

describe('countryLabel', () => {
  it('turns ISO codes into names and keeps anything else as-is', () => {
    expect(countryLabel('US')).toBe('United States')
    expect(countryLabel('NL')).toBe('Netherlands')
    expect(countryLabel('Thailand')).toBe('Thailand')
    expect(countryLabel(undefined)).toBe('Unknown')
    expect(countryLabel('')).toBe('Unknown')
  })
})
