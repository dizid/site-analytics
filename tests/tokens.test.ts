import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory stand-in for the Netlify Blobs store, with ETags and conditional
// writes (onlyIfMatch) like the real one
const blobs = new Map<string, unknown>()
const etags = new Map<string, string>()
let version = 0
const storeFailures = { read: false, write: false }
vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    setJSON: async (k: string, v: unknown, opts?: { onlyIfMatch?: string }) => {
      if (storeFailures.write) throw new Error('blobs write failed')
      if (opts?.onlyIfMatch !== undefined && etags.get(k) !== opts.onlyIfMatch) return { modified: false }
      blobs.set(k, v); etags.set(k, `v${++version}`)
      return { modified: true, etag: etags.get(k) }
    },
    get: async (k: string) => blobs.get(k) ?? null,
    getWithMetadata: async (k: string) => {
      if (storeFailures.read) throw new Error('blobs unavailable')
      return blobs.has(k) ? { data: blobs.get(k), etag: etags.get(k), metadata: {} } : null
    },
    delete: async (k: string) => { blobs.delete(k); etags.delete(k) },
  }),
}))

/** Puts tokens in the fake store the way a sign-in does (with an ETag). */
function seed(k: string, v: unknown) {
  blobs.set(k, v); etags.set(k, `v${++version}`)
}

import { getValidAccessToken, TokenRefreshUnavailableError } from '../netlify/functions/lib/tokens'

const expired = { refreshToken: 'r1', accessToken: 'old', accessTokenExpiresAt: 0 }

function googleAnswers(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

describe('getValidAccessToken', () => {
  beforeEach(() => {
    blobs.clear()
    etags.clear()
    storeFailures.read = false
    storeFailures.write = false
    process.env.GOOGLE_CLIENT_ID = 'id'
    process.env.GOOGLE_CLIENT_SECRET = 'secret'
    vi.unstubAllGlobals()
  })

  it('refreshes and stores a new access token', async () => {
    seed('u1', { ...expired })
    googleAnswers(200, { access_token: 'new', expires_in: 3600, token_type: 'Bearer' })
    await expect(getValidAccessToken('u1')).resolves.toBe('new')
    expect((blobs.get('u1') as { accessToken: string }).accessToken).toBe('new')
  })

  it('keeps the stored tokens when Google has a temporary problem (5xx), and says so', async () => {
    seed('u1', { ...expired })
    googleAnswers(503, { error: 'backend_error' })
    await expect(getValidAccessToken('u1')).rejects.toBeInstanceOf(TokenRefreshUnavailableError)
    expect(blobs.has('u1')).toBe(true)
  })

  it('keeps the stored tokens when the network fails', async () => {
    seed('u1', { ...expired })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(getValidAccessToken('u1')).rejects.toBeInstanceOf(TokenRefreshUnavailableError)
    expect(blobs.has('u1')).toBe(true)
  })

  it('deletes the tokens when Google says invalid_grant (revoked)', async () => {
    seed('u1', { ...expired })
    googleAnswers(400, { error: 'invalid_grant' })
    await expect(getValidAccessToken('u1')).rejects.toThrow(/re-authentication required/)
    expect(blobs.has('u1')).toBe(false)
  })

  it('does not delete tokens saved by a newer sign-in in the meantime', async () => {
    seed('u1', { ...expired })
    vi.stubGlobal('fetch', vi.fn(async () => {
      // the user signs in again while the old token is being refused
      blobs.set('u1', { ...expired, refreshToken: 'r2', accessToken: 'fresh', accessTokenExpiresAt: Date.now() + 3600_000 })
      return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
    }))
    await expect(getValidAccessToken('u1')).rejects.toThrow()
    expect((blobs.get('u1') as { refreshToken: string }).refreshToken).toBe('r2')
  })

  it('does not bring tokens back when the user signs out during a refresh', async () => {
    seed('u1', { ...expired })
    vi.stubGlobal('fetch', vi.fn(async () => {
      blobs.delete('u1'); etags.delete('u1') // sign-out deletes the tokens meanwhile
      return new Response(JSON.stringify({ access_token: 'new', expires_in: 3600, token_type: 'Bearer' }), { status: 200 })
    }))
    await expect(getValidAccessToken('u1')).resolves.toBe('new')
    expect(blobs.has('u1')).toBe(false)
  })

  it('does not overwrite a newer sign-in with the refreshed old tokens', async () => {
    seed('u1', { ...expired })
    vi.stubGlobal('fetch', vi.fn(async () => {
      seed('u1', { ...expired, refreshToken: 'r2', accessToken: 'fresh-login', accessTokenExpiresAt: Date.now() + 3_600_000 })
      return new Response(JSON.stringify({ access_token: 'new', expires_in: 3600, token_type: 'Bearer' }), { status: 200 })
    }))
    await expect(getValidAccessToken('u1')).resolves.toBe('new')
    expect((blobs.get('u1') as { refreshToken: string }).refreshToken).toBe('r2')
  })

  it('says "try again" (and keeps the tokens) when the token store cannot be read', async () => {
    seed('u1', { ...expired })
    storeFailures.read = true
    await expect(getValidAccessToken('u1')).rejects.toBeInstanceOf(TokenRefreshUnavailableError)
    storeFailures.read = false
    expect(blobs.has('u1')).toBe(true)
  })

  it('still returns the fresh token when saving it fails', async () => {
    seed('u1', { ...expired })
    googleAnswers(200, { access_token: 'new', expires_in: 3600, token_type: 'Bearer' })
    storeFailures.write = true
    await expect(getValidAccessToken('u1')).resolves.toBe('new')
  })
})
