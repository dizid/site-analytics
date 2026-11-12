import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory stand-in for the Netlify Blobs store
const blobs = new Map<string, unknown>()
vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    setJSON: async (k: string, v: unknown) => { blobs.set(k, v) },
    get: async (k: string) => blobs.get(k) ?? null,
    delete: async (k: string) => { blobs.delete(k) },
  }),
}))

import { getValidAccessToken, TokenRefreshUnavailableError } from '../netlify/functions/lib/tokens'

const expired = { refreshToken: 'r1', accessToken: 'old', accessTokenExpiresAt: 0, email: 'a@b.c', name: 'A', picture: '' }

function googleAnswers(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

describe('getValidAccessToken', () => {
  beforeEach(() => {
    blobs.clear()
    process.env.GOOGLE_CLIENT_ID = 'id'
    process.env.GOOGLE_CLIENT_SECRET = 'secret'
    vi.unstubAllGlobals()
  })

  it('refreshes and stores a new access token', async () => {
    blobs.set('u1', { ...expired })
    googleAnswers(200, { access_token: 'new', expires_in: 3600, token_type: 'Bearer' })
    await expect(getValidAccessToken('u1')).resolves.toBe('new')
    expect((blobs.get('u1') as { accessToken: string }).accessToken).toBe('new')
  })

  it('keeps the stored tokens when Google has a temporary problem (5xx), and says so', async () => {
    blobs.set('u1', { ...expired })
    googleAnswers(503, { error: 'backend_error' })
    await expect(getValidAccessToken('u1')).rejects.toBeInstanceOf(TokenRefreshUnavailableError)
    expect(blobs.has('u1')).toBe(true)
  })

  it('keeps the stored tokens when the network fails', async () => {
    blobs.set('u1', { ...expired })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(getValidAccessToken('u1')).rejects.toBeInstanceOf(TokenRefreshUnavailableError)
    expect(blobs.has('u1')).toBe(true)
  })

  it('deletes the tokens when Google says invalid_grant (revoked)', async () => {
    blobs.set('u1', { ...expired })
    googleAnswers(400, { error: 'invalid_grant' })
    await expect(getValidAccessToken('u1')).rejects.toThrow(/re-authentication required/)
    expect(blobs.has('u1')).toBe(false)
  })

  it('does not delete tokens saved by a newer sign-in in the meantime', async () => {
    blobs.set('u1', { ...expired })
    vi.stubGlobal('fetch', vi.fn(async () => {
      // the user signs in again while the old token is being refused
      blobs.set('u1', { ...expired, refreshToken: 'r2', accessToken: 'fresh', accessTokenExpiresAt: Date.now() + 3600_000 })
      return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
    }))
    await expect(getValidAccessToken('u1')).rejects.toThrow()
    expect((blobs.get('u1') as { refreshToken: string }).refreshToken).toBe('r2')
  })
})
