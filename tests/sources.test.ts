import { describe, it, expect } from 'vitest'
import {
  sourceOf,
  hasMetric,
  metricOrNull,
  displayMetric,
  hostKey,
  pairByHost,
  pairStartIds,
  MISSING_METRIC,
} from '../src/lib/sources'
import type { DataSource, PeriodTotals } from '../src/types/analytics'

const totals: PeriodTotals = {
  sessions: 15, activeUsers: 0, newUsers: 0, screenPageViews: 36, bounceRate: 0, averageSessionDuration: 0,
}

describe('metric availability', () => {
  const ga4 = { source: 'ga4' as const, metrics: { ...totals, activeUsers: 11, bounceRate: 0 } }
  const cf = { source: 'cloudflare' as const, metrics: totals }

  it('treats a property without a source as GA4', () => {
    expect(sourceOf({})).toBe('ga4')
    expect(sourceOf(cf)).toBe('cloudflare')
  })

  it('Cloudflare only has sessions (visits) and pageviews', () => {
    expect(hasMetric(cf, 'sessions')).toBe(true)
    expect(hasMetric(cf, 'screenPageViews')).toBe(true)
    for (const m of ['activeUsers', 'newUsers', 'bounceRate', 'averageSessionDuration'] as const) {
      expect(hasMetric(cf, m)).toBe(false)
    }
    expect(hasMetric(ga4, 'bounceRate')).toBe(true)
  })

  it('returns null for unmeasured metrics instead of the 0 placeholder', () => {
    expect(metricOrNull(cf, 'activeUsers')).toBeNull()
    expect(metricOrNull(cf, 'sessions')).toBe(15)
    expect(metricOrNull(ga4, 'bounceRate')).toBe(0) // a real GA4 0 stays 0
    expect(metricOrNull({ metrics: null }, 'sessions')).toBeNull()
  })

  it('shows "–" for unmeasured metrics, not 0', () => {
    expect(displayMetric(cf, 'bounceRate', String)).toBe(MISSING_METRIC)
    expect(displayMetric(cf, 'screenPageViews', String)).toBe('36')
    expect(displayMetric(ga4, 'activeUsers', String)).toBe('11')
  })
})

describe('hostKey', () => {
  it('normalises URLs and bare hosts to a comparable hostname', () => {
    expect(hostKey('https://www.Foreground.info/')).toBe('foreground.info')
    expect(hostKey('http://foreground.info/pricing?x=1')).toBe('foreground.info')
    expect(hostKey('foreground.info')).toBe('foreground.info')
    expect(hostKey('https://blog.foreground.info')).toBe('blog.foreground.info')
  })

  it('returns null without a usable host', () => {
    expect(hostKey(undefined)).toBeNull()
    expect(hostKey('')).toBeNull()
    expect(hostKey('https://')).toBeNull()
  })
})

describe('pairByHost', () => {
  const p = (id: string, websiteUrl?: string, source?: DataSource) => ({ id, websiteUrl, source })
  const ids = (list: Array<{ id: string }>) => list.map((x) => x.id)

  it('moves a Cloudflare site next to the GA4 property with the same host, GA4 first', () => {
    const sorted = [
      p('cf-foreground', 'https://foreground.info', 'cloudflare'),
      p('ga-other', 'https://other.com'),
      p('ga-foreground', 'https://www.foreground.info/'),
    ]
    expect(ids(pairByHost(sorted))).toEqual(['ga-foreground', 'cf-foreground', 'ga-other'])
  })

  it('places the pair where its best-ranked member was', () => {
    const sorted = [
      p('ga-a', 'https://a.com'),
      p('ga-b', 'https://b.com'),
      p('cf-c', 'https://c.com', 'cloudflare'),
      p('ga-c', 'https://c.com'),
    ]
    expect(ids(pairByHost(sorted))).toEqual(['ga-a', 'ga-b', 'ga-c', 'cf-c'])
  })

  it('keeps the order untouched when nothing is shared', () => {
    const sorted = [p('ga-b', 'https://b.com'), p('cf-a', 'https://a.com', 'cloudflare'), p('ga-x')]
    expect(ids(pairByHost(sorted))).toEqual(['ga-b', 'cf-a', 'ga-x'])
  })

  it('does not regroup GA4-only duplicates (no Cloudflare site on that host)', () => {
    const sorted = [p('ga-1', 'https://dup.com'), p('ga-2', 'https://x.com'), p('ga-3', 'https://dup.com')]
    expect(ids(pairByHost(sorted))).toEqual(['ga-1', 'ga-2', 'ga-3'])
  })

  it('never drops or duplicates entries', () => {
    const sorted = [
      p('cf-a', 'https://a.com', 'cloudflare'),
      p('ga-a1', 'https://a.com'),
      p('ga-b'),
      p('ga-a2', 'https://www.a.com'),
    ]
    const result = pairByHost(sorted)
    expect(ids(result)).toEqual(['ga-a1', 'ga-a2', 'cf-a', 'ga-b'])
    expect(result).toHaveLength(sorted.length)
  })
})

describe('pairStartIds', () => {
  const p = (propertyId: string, websiteUrl?: string, source?: DataSource) => ({ propertyId, websiteUrl, source })

  it('marks the first entry of each GA4 + Cloudflare pair', () => {
    const paired = pairByHost([
      p('ga-x', 'https://x.com'),
      p('ga-a', 'https://a.com'),
      p('cf-a', 'https://a.com', 'cloudflare'),
      p('cf-solo', 'https://solo.com', 'cloudflare'),
    ])
    expect([...pairStartIds(paired)]).toEqual(['ga-a'])
  })

  it('handles groups of more than two (two GA4 properties on one host)', () => {
    const paired = pairByHost([
      p('cf-a', 'https://a.com', 'cloudflare'),
      p('ga-a1', 'https://a.com'),
      p('ga-a2', 'https://www.a.com'),
    ])
    expect([...pairStartIds(paired)]).toEqual(['ga-a1'])
  })

  it('marks nothing without shared hosts', () => {
    expect(pairStartIds([p('ga-a', 'https://a.com'), p('cf-b', 'https://b.com', 'cloudflare'), p('ga-c')]).size).toBe(0)
  })
})
