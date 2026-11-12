import { describe, it, expect, vi, beforeEach } from 'vitest'

// Signed-in user with a valid Google token (auth and token storage are tested elsewhere)
vi.mock('../netlify/functions/lib/auth', () => ({
  JSON_HEADERS: { 'Content-Type': 'application/json' },
  validateSession: async () => ({ sub: 'user-1' }),
}))
vi.mock('../netlify/functions/lib/tokens', () => ({
  getValidAccessToken: async () => 'google-token',
  TokenRefreshUnavailableError: class extends Error {},
}))

import handler from '../netlify/functions/analytics.mts'

const PROPERTY_COUNT = 40
let inFlight = 0
let maxInFlight = 0

/** Fake Google APIs: one account with PROPERTY_COUNT properties, each call takes ~5 ms. */
function fakeGoogle() {
  return vi.fn(async (input: string | URL) => {
    const url = String(input)
    if (url.includes('/accountSummaries')) {
      return Response.json({
        accountSummaries: [{
          name: 'accountSummaries/1',
          displayName: 'Agency',
          propertySummaries: Array.from({ length: PROPERTY_COUNT }, (_, i) => ({
            property: `properties/${1000 + i}`,
            displayName: `Client site ${i}`,
          })),
        }],
      })
    }
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise(resolve => setTimeout(resolve, 5))
    inFlight--
    if (url.includes('/dataStreams')) {
      const id = url.match(/properties\/(\d+)/)?.[1]
      return Response.json({
        dataStreams: [{ name: 's', type: 'WEB_DATA_STREAM', webStreamData: { defaultUri: `https://site${id}.example`, measurementId: 'G-1' } }],
      })
    }
    // batchRunReports: empty reports are valid (a property with no traffic)
    return Response.json({ reports: [{}, {}, {}] })
  })
}

describe('GET /api/analytics with many properties', () => {
  beforeEach(() => {
    inFlight = 0
    maxInFlight = 0
    vi.stubGlobal('fetch', fakeGoogle())
  })

  it('loads every property, in discovery order, several at a time', async () => {
    const response = await handler(
      new Request('https://statpilot.mom/api/analytics?days=7d', { headers: { Authorization: 'Bearer jwt' } }),
      {} as never
    )
    expect(response.status).toBe(200)
    const body = await response.json() as { properties: { propertyId: string; websiteUrl?: string; error: string | null }[] }

    expect(body.properties).toHaveLength(PROPERTY_COUNT)
    expect(body.properties.map(p => p.propertyId)).toEqual(
      Array.from({ length: PROPERTY_COUNT }, (_, i) => `properties/${1000 + i}`)
    )
    expect(body.properties.every(p => p.error === null)).toBe(true)
    expect(body.properties[7].websiteUrl).toBe('https://site1007.example')

    // 8 properties at a time, 2 Google calls each (reports + website URL)
    expect(maxInFlight).toBeGreaterThan(6)
    expect(maxInFlight).toBeLessThanOrEqual(16)
  })
})
