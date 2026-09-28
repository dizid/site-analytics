/**
 * Period-over-period comparison helpers.
 * Pure functions — shared by cards, detail view, KPIs, and unit tests.
 */

import type { PeriodTotals } from '../types/analytics'

/** How a delta is expressed: relative % change, or absolute percentage points (for rates). */
export type DeltaMode = 'percent' | 'points'

/**
 * Returns the previous period only when a comparison is meaningful:
 * it must exist and have had at least one session (else every change is ∞).
 */
export function comparablePrevious(
  previous: PeriodTotals | undefined | null,
): PeriodTotals | null {
  return previous && previous.sessions > 0 ? previous : null
}

/**
 * Change from previous to current.
 * - 'percent': relative change in % (100 → 150 = 50)
 * - 'points':  absolute change of a 0–1 rate in percentage points (0.40 → 0.45 = 5)
 * Returns null when no meaningful comparison exists.
 */
export function computeDelta(current: number, previous: number, mode: DeltaMode): number | null {
  if (!isFinite(current) || !isFinite(previous)) return null
  if (mode === 'points') return (current - previous) * 100
  if (previous <= 0) return null
  return ((current - previous) / previous) * 100
}

/** Formats a delta for display: "+12%", "−3.5 pts", "0%". */
export function formatDelta(delta: number, mode: DeltaMode): string {
  const rounded = mode === 'points' || Math.abs(delta) < 10
    ? Math.round(delta * 10) / 10
    : Math.round(delta)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  const unit = mode === 'points' ? ' pts' : '%'
  return `${sign}${Math.abs(rounded)}${unit}`
}

/** Weighted (by sessions) aggregate of several periods — used for portfolio KPIs. */
export function aggregateTotals(periods: PeriodTotals[]): PeriodTotals {
  const sessions = periods.reduce((s, p) => s + p.sessions, 0)
  const weighted = (key: 'bounceRate' | 'averageSessionDuration'): number =>
    sessions > 0 ? periods.reduce((s, p) => s + p[key] * p.sessions, 0) / sessions : 0

  return {
    sessions,
    activeUsers: periods.reduce((s, p) => s + p.activeUsers, 0),
    newUsers: periods.reduce((s, p) => s + p.newUsers, 0),
    screenPageViews: periods.reduce((s, p) => s + p.screenPageViews, 0),
    bounceRate: weighted('bounceRate'),
    averageSessionDuration: weighted('averageSessionDuration'),
  }
}
