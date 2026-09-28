import { describe, it, expect } from 'vitest'
import { aggregateTotals, comparablePrevious, computeDelta, formatDelta } from '../src/lib/compare'
import type { PeriodTotals } from '../src/types/analytics'

const period = (overrides: Partial<PeriodTotals>): PeriodTotals => ({
  sessions: 0, activeUsers: 0, newUsers: 0, screenPageViews: 0,
  bounceRate: 0, averageSessionDuration: 0, ...overrides,
})

describe('computeDelta', () => {
  it('computes relative percent change', () => {
    expect(computeDelta(150, 100, 'percent')).toBe(50)
    expect(computeDelta(75, 100, 'percent')).toBe(-25)
  })

  it('returns null when the previous value is zero (no meaningful %)', () => {
    expect(computeDelta(10, 0, 'percent')).toBeNull()
  })

  it('computes percentage points for rates', () => {
    expect(computeDelta(0.45, 0.4, 'points')).toBeCloseTo(5)
  })
})

describe('formatDelta', () => {
  it('formats signs, rounding and units', () => {
    expect(formatDelta(50, 'percent')).toBe('+50%')
    expect(formatDelta(-3.46, 'percent')).toBe('−3.5%')
    expect(formatDelta(12.6, 'percent')).toBe('+13%')
    expect(formatDelta(0.01, 'percent')).toBe('0%')
    expect(formatDelta(-2.04, 'points')).toBe('−2 pts')
  })
})

describe('comparablePrevious', () => {
  it('only allows a comparison when the previous period had sessions', () => {
    expect(comparablePrevious(undefined)).toBeNull()
    expect(comparablePrevious(period({ sessions: 0 }))).toBeNull()
    expect(comparablePrevious(period({ sessions: 3 }))?.sessions).toBe(3)
  })
})

describe('aggregateTotals', () => {
  it('sums counts and session-weights rates', () => {
    const total = aggregateTotals([
      period({ sessions: 100, activeUsers: 80, bounceRate: 0.5, averageSessionDuration: 60 }),
      period({ sessions: 300, activeUsers: 200, bounceRate: 0.3, averageSessionDuration: 120 }),
    ])
    expect(total.sessions).toBe(400)
    expect(total.activeUsers).toBe(280)
    expect(total.bounceRate).toBeCloseTo(0.35)
    expect(total.averageSessionDuration).toBeCloseTo(105)
  })

  it('returns zero rates when there are no sessions', () => {
    expect(aggregateTotals([]).bounceRate).toBe(0)
  })
})
