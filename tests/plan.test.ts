import { describe, it, expect } from 'vitest'
import { applyFreeLimit, buildUpgradeUrl, paymentsEnabled } from '../netlify/functions/lib/plan'
import type { PropertyResult } from '../src/types/analytics'

const site = (displayName: string, sessions: number | null, error: string | null = null): PropertyResult => ({
  propertyId: `properties/${displayName}`,
  displayName,
  websiteUrl: `https://${displayName}`,
  metrics: sessions === null ? null : {
    sessions, activeUsers: 0, newUsers: 0, screenPageViews: 0, bounceRate: 0, averageSessionDuration: 0, trend: [],
  },
  sources: [],
  error,
})

describe('applyFreeLimit', () => {
  it('keeps the 3 busiest sites in full and lists the rest by name only', () => {
    const { visible, locked } = applyFreeLimit([
      site('a.com', 10), site('b.com', 500), site('c.com', 40), site('d.com', 90), site('e.com', 0),
    ])
    expect(visible.map((p) => p.displayName)).toEqual(['b.com', 'd.com', 'c.com'])
    expect(locked).toEqual([
      { displayName: 'a.com', websiteUrl: 'https://a.com' },
      { displayName: 'e.com', websiteUrl: 'https://e.com' },
    ])
  })

  it('never sends numbers for locked sites', () => {
    const { locked } = applyFreeLimit([site('a.com', 1), site('b.com', 2), site('c.com', 3), site('d.com', 4)])
    expect(JSON.stringify(locked)).not.toContain('sessions')
    expect(Object.keys(locked[0] ?? {})).toEqual(['displayName', 'websiteUrl'])
  })

  it('ranks sites that failed to load last, ties alphabetically', () => {
    const { visible } = applyFreeLimit([
      site('broken.com', null, 'PERMISSION_DENIED'), site('z.com', 5), site('m.com', 5), site('q.com', 0),
    ])
    expect(visible.map((p) => p.displayName)).toEqual(['m.com', 'z.com', 'q.com'])
  })

  it('locks nothing for 3 sites or fewer', () => {
    const { visible, locked } = applyFreeLimit([site('a.com', 1), site('b.com', 2)])
    expect(visible).toHaveLength(2)
    expect(locked).toEqual([])
  })

  it('leaves out websiteUrl when a site has none', () => {
    const app = { ...site('app', 0), websiteUrl: undefined }
    const { locked } = applyFreeLimit([site('a', 3), site('b', 2), site('c', 1), app])
    expect(locked).toEqual([{ displayName: 'app' }])
  })
})

describe('buildUpgradeUrl', () => {
  const link = 'https://buy.stripe.com/test_abc123'

  it('adds the Google user ID as client_reference_id', () => {
    expect(buildUpgradeUrl(link, '1234567890')).toBe(`${link}?client_reference_id=1234567890`)
  })

  it('returns null without a link, with a bad link, or with an ID Stripe would reject', () => {
    expect(buildUpgradeUrl(undefined, '123')).toBeNull()
    expect(buildUpgradeUrl('not a url', '123')).toBeNull()
    expect(buildUpgradeUrl(link, 'a b@c')).toBeNull()
    expect(buildUpgradeUrl(link, '')).toBeNull()
  })
})

describe('paymentsEnabled', () => {
  it('is off until a Payment Link is configured', () => {
    expect(paymentsEnabled(undefined)).toBe(false)
    expect(paymentsEnabled('  ')).toBe(false)
    expect(paymentsEnabled('https://buy.stripe.com/x')).toBe(true)
  })
})
