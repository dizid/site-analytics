import { describe, it, expect } from 'vitest'
import {
  buildDateRange,
  buildPreviousDateRange,
  buildOverviewRequests,
  parseDaysParam,
  parseMetricsReport,
  parseSourcesReport,
  type GA4ReportResponse,
} from '../netlify/functions/lib/ga4-report'

/** Parses "NdaysAgo" / "yesterday" into a number of days ago. */
function daysAgo(value: string): number {
  if (value === 'yesterday') return 1
  const match = /^(\d+)daysAgo$/.exec(value)
  if (!match) throw new Error(`unexpected GA4 date: ${value}`)
  return Number(match[1])
}

/** Builds a totals row in OVERVIEW_METRICS order, tagged with its date range name. */
function totalsRow(name: string, values: number[]) {
  return {
    dimensionValues: [{ value: name }],
    metricValues: values.map((v) => ({ value: String(v) })),
  }
}

describe('date ranges', () => {
  it.each([['7d', 7], ['30d', 30], ['90d', 90]] as const)(
    '%s covers exactly %i full days ending yesterday',
    (range, days) => {
      const r = buildDateRange(range)
      expect(r.endDate).toBe('yesterday')
      expect(daysAgo(r.startDate) - daysAgo(r.endDate) + 1).toBe(days)
    },
  )

  it.each([['7d', 7], ['30d', 30], ['90d', 90]] as const)(
    'previous period for %s is equally long and directly before the current one',
    (range, days) => {
      const current = buildDateRange(range)
      const previous = buildPreviousDateRange(range)
      expect(daysAgo(previous.startDate) - daysAgo(previous.endDate) + 1).toBe(days)
      // No gap and no overlap between the periods
      expect(daysAgo(previous.endDate)).toBe(daysAgo(current.startDate) + 1)
    },
  )

  it('parses the days param and falls back to 7d', () => {
    expect(parseDaysParam(new URL('https://x/api?days=30d'))).toBe('30d')
    expect(parseDaysParam(new URL('https://x/api?days=90d'))).toBe('90d')
    expect(parseDaysParam(new URL('https://x/api?days=365d'))).toBe('7d')
    expect(parseDaysParam(new URL('https://x/api'))).toBe('7d')
  })

  it('different ranges produce different requests (weekly ≠ monthly)', () => {
    expect(JSON.stringify(buildOverviewRequests('7d')))
      .not.toBe(JSON.stringify(buildOverviewRequests('30d')))
  })
})

describe('buildOverviewRequests', () => {
  it('asks for trend, current+previous totals, and top-5 sources', () => {
    const [trend, totals, sources] = buildOverviewRequests('30d') as Array<Record<string, unknown>>
    expect(trend).toMatchObject({ dimensions: [{ name: 'date' }] })
    expect(totals).not.toHaveProperty('dimensions')
    expect(totals.dateRanges).toEqual([
      { startDate: '30daysAgo', endDate: 'yesterday', name: 'current' },
      { startDate: '60daysAgo', endDate: '31daysAgo', name: 'previous' },
    ])
    expect(sources).toMatchObject({ limit: 5 })
  })
})

describe('parseMetricsReport', () => {
  // A visitor who came on both days shows up in each day's activeUsers,
  // but GA4's range total counts them once.
  const trend: GA4ReportResponse = {
    rows: [
      { dimensionValues: [{ value: '20260920' }], metricValues: [{ value: '10' }, { value: '8' }] },
      { dimensionValues: [{ value: '20260921' }], metricValues: [{ value: '6' }, { value: '5' }] },
    ],
  }
  const totals: GA4ReportResponse = {
    // Row order is not guaranteed — previous first on purpose
    rows: [
      totalsRow('previous', [12, 9, 4, 30, 0.6, 50]),
      totalsRow('current', [16, 11, 7, 40, 0.4375, 92.5]),
    ],
  }

  it('uses GA4 totals for headline numbers, not sums of daily rows', () => {
    const m = parseMetricsReport(trend, totals)
    expect(m.activeUsers).toBe(11) // not 8 + 5 = 13
    expect(m.sessions).toBe(16)
    expect(m.newUsers).toBe(7)
    expect(m.screenPageViews).toBe(40)
    expect(m.bounceRate).toBeCloseTo(0.4375)
    expect(m.averageSessionDuration).toBeCloseTo(92.5)
  })

  it('matches periods by name, regardless of row order', () => {
    const m = parseMetricsReport(trend, totals)
    expect(m.previous).toEqual({
      sessions: 12, activeUsers: 9, newUsers: 4, screenPageViews: 30,
      bounceRate: 0.6, averageSessionDuration: 50,
    })
  })

  it('builds the daily trend with ISO dates', () => {
    expect(parseMetricsReport(trend, totals).trend).toEqual([
      { date: '2026-09-20', sessions: 10, activeUsers: 8 },
      { date: '2026-09-21', sessions: 6, activeUsers: 5 },
    ])
  })

  it('treats a missing period (GA4 omits empty rows) as all zeros', () => {
    const m = parseMetricsReport(trend, { rows: [totalsRow('current', [16, 11, 7, 40, 0.5, 60])] })
    expect(m.sessions).toBe(16)
    expect(m.previous?.sessions).toBe(0)
  })

  it('handles a property with no data at all', () => {
    const m = parseMetricsReport({}, {})
    expect(m).toMatchObject({ sessions: 0, activeUsers: 0, bounceRate: 0, trend: [] })
  })
})

describe('parseSourcesReport', () => {
  it('maps channel rows', () => {
    expect(parseSourcesReport({
      rows: [
        { dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '42' }] },
        { dimensionValues: [{ value: 'Direct' }], metricValues: [{ value: '7' }] },
      ],
    })).toEqual([
      { channel: 'Organic Search', sessions: 42 },
      { channel: 'Direct', sessions: 7 },
    ])
  })

  it('returns an empty list when there are no rows', () => {
    expect(parseSourcesReport({})).toEqual([])
  })
})
