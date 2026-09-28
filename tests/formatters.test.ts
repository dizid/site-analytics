import { describe, it, expect } from 'vitest'
import { formatBounceRate, formatDuration } from '../src/lib/formatters'

describe('formatBounceRate', () => {
  it('converts a 0–1 rate to a percentage and clamps bad data', () => {
    expect(formatBounceRate(0.4375)).toBe('43.8%')
    expect(formatBounceRate(1.7)).toBe('100.0%')
    expect(formatBounceRate(-1)).toBe('0.0%')
  })
})

describe('formatDuration', () => {
  it('formats seconds as m:ss', () => {
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(59.6)).toBe('1:00')
    expect(formatDuration(NaN)).toBe('0:00')
  })
})
