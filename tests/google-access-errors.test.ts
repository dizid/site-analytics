import { describe, it, expect, vi, beforeEach } from 'vitest'

// Signed-in user (session checks are tested elsewhere). The token store is
// faked: 'old-token' is what's stored; asking again with rejectedToken gives
// whatever the test sets in `refreshed` (a string, or an error to throw).
vi.mock('../netlify/functions/lib/auth', () => ({
  JSON_HEADERS: { 'Content-Type': 'application/json' },
  validateSession: async () => ({ sub: 'user-1' }),
}))
let refreshed: string | Error = 'new-token'
const tokenCalls: Array<{ rejectedToken?: string }> = []
vi.mock('../netlify/functions/lib/tokens', () => ({
  getValidAccessToken: async (_userId: string, options: { rejectedToken?: string } = {}) => {
    tokenCalls.push(options)
    if (!options.rejectedToken) return 'old-token'
    if (refreshed instanceof Error) throw refreshed
    return refreshed
  },
  TokenRefreshUnavailableError: class extends Error {},
}))

import analytics from '../netlify/functions/analytics.mts'
import analyticsDetail from '../netlify/functions/analytics-detail.mts'

const googleError = (status: number, message: string, code: string) =>
  Response.json({ error: { code: status, message, status: code } }, { status })
const revoked = () => googleError(401, 'Request had invalid authentication credentials.', 'UNAUTHENTICATED')

/** Fake Google: answers per access token; `deadTokens` get a 401. */
function fakeGoogle(deadTokens: string[], dataAnswer: () => Response = () => Response.json({ rows: [] })) {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    const token = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '') ?? ''
    calls.push(`${token} ${url}`)
    if (deadTokens.includes(token)) return revoked()
    if (url.includes('/accountSummaries')) {
      return Response.json({
        accountSummaries: [{ name: 'a/1', displayName: 'Me', propertySummaries: [{ property: 'properties/1', displayName: 'Site' }] }],
      })
    }
    if (url.includes('/dataStreams')) return Response.json({ dataStreams: [] })
    if (url.includes(':batchRunReports')) return Response.json({ reports: [{}, {}, {}] })
    return dataAnswer()
  }))
  return calls
}

const get = (handler: typeof analytics, path: string) =>
  handler(new Request(`https://statpilot.mom${path}`, { headers: { Authorization: 'Bearer jwt' } }), {} as never)

beforeEach(() => {
  refreshed = 'new-token'
  tokenCalls.length = 0
  vi.unstubAllGlobals()
})

describe('Google refuses the stored access token (user removed access in their Google Account)', () => {
  it('dashboard: gets a fresh token once and loads normally when Google gives one', async () => {
    fakeGoogle(['old-token'])
    const response = await get(analytics, '/api/analytics?days=7d')
    expect(response.status).toBe(200)
    const body = await response.json() as { properties: Array<{ error: string | null }> }
    expect(body.properties).toHaveLength(1)
    expect(body.properties[0].error).toBeNull()
    expect(tokenCalls).toEqual([{}, { rejectedToken: 'old-token' }])
  })

  it('dashboard: says "sign in again" (401) when the grant is revoked, not a raw Google error', async () => {
    refreshed = new Error('Refresh token is invalid or revoked — re-authentication required')
    fakeGoogle(['old-token'])
    const response = await get(analytics, '/api/analytics?days=7d')
    expect(response.status).toBe(401)
    expect((await response.json() as { error: string }).error).toMatch(/sign in again/i)
  })

  it('dashboard: 401 when Google refuses even the fresh token', async () => {
    fakeGoogle(['old-token', 'new-token'])
    const response = await get(analytics, '/api/analytics?days=7d')
    expect(response.status).toBe(401)
  })

  it('detail view: retries with a fresh token', async () => {
    const calls = fakeGoogle(['old-token'])
    const response = await get(analyticsDetail, '/api/analytics-detail?property=properties/1&days=7d')
    expect(response.status).toBe(200)
    expect(calls.filter(c => c.startsWith('new-token'))).toHaveLength(3)
  })
})

describe('detail view errors show what Google said', () => {
  it('usage limit (429) gets a plain message and status 429', async () => {
    fakeGoogle([], () => googleError(429, 'Exhausted property tokens per hour for a project per property.', 'RESOURCE_EXHAUSTED'))
    const response = await get(analyticsDetail, '/api/analytics-detail?property=properties/1&days=7d')
    expect(response.status).toBe(429)
    expect((await response.json() as { error: string }).error).toMatch(/usage limit/)
  })

  it("other Google errors pass Google's own message through (was 'Failed to fetch property details')", async () => {
    fakeGoogle([], () => googleError(403, 'User does not have sufficient permissions for this property.', 'PERMISSION_DENIED'))
    const response = await get(analyticsDetail, '/api/analytics-detail?property=properties/1&days=7d')
    expect(response.status).toBe(502)
    expect((await response.json() as { error: string }).error).toBe(
      'Google Analytics: User does not have sufficient permissions for this property.'
    )
  })
})

describe('dashboard per-property errors', () => {
  it('a property over its usage limit gets the plain message', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes(':batchRunReports')) {
        return googleError(429, 'Exhausted property tokens per hour for a project per property.', 'RESOURCE_EXHAUSTED')
      }
      if (url.includes('/accountSummaries')) {
        return Response.json({
          accountSummaries: [{ name: 'a/1', displayName: 'Me', propertySummaries: [{ property: 'properties/1', displayName: 'Site' }] }],
        })
      }
      return Response.json({ dataStreams: [] })
    }))
    const response = await get(analytics, '/api/analytics?days=7d') // includes the 1 s retry pause
    const body = await response.json() as { properties: Array<{ error: string | null }> }
    expect(body.properties[0].error).toMatch(/usage limit/)
  })
})
