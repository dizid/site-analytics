import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// The callback's Google token exchange and token storage are replaced, so the
// test runs the real handler without network or Netlify Blobs.
vi.mock('../netlify/functions/lib/tokens.js', () => ({
  exchangeCodeForTokens: vi.fn(),
  storeUserTokens: vi.fn(),
}))

import callback from '../netlify/functions/oauth-callback.mts'
import { exchangeCodeForTokens, storeUserTokens } from '../netlify/functions/lib/tokens.js'
import { isVerifiedEmail } from '../netlify/functions/lib/auth'

/** An unsigned Google-style id_token with the given payload (the callback only decodes it). */
function idToken(payload: Record<string, unknown>): string {
  const part = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  return `${part({ alg: 'RS256' })}.${part(payload)}.sig`
}

function googleAnswer(emailVerified: unknown) {
  return {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'openid email profile https://www.googleapis.com/auth/analytics.readonly',
    id_token: idToken({ sub: 'google-user-1', email: 'owner@example.com', name: 'Owner', picture: '', email_verified: emailVerified }),
  }
}

/** Runs the callback as Google's redirect back with a matching CSRF state cookie. */
async function runCallback(): Promise<string> {
  const request = new Request('https://statpilot.mom/api/oauth/callback?code=abc&state=s1', {
    headers: { Cookie: 'oauth_state=s1' },
  })
  const response = await callback(request, {} as never)
  return response.text()
}

describe('isVerifiedEmail', () => {
  it('accepts only an explicit yes from Google', () => {
    expect(isVerifiedEmail(true)).toBe(true)
    expect(isVerifiedEmail('true')).toBe(true)
    expect(isVerifiedEmail(false)).toBe(false)
    expect(isVerifiedEmail('false')).toBe(false)
    expect(isVerifiedEmail(undefined)).toBe(false)
    expect(isVerifiedEmail(1)).toBe(false)
  })
})

describe('OAuth callback: verified email only', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-for-callback'
    process.env.ALLOWED_EMAILS = ''
  })
  beforeEach(() => {
    vi.mocked(exchangeCodeForTokens).mockReset()
    vi.mocked(storeUserTokens).mockReset()
  })

  it('signs in a Google account whose email Google verified', async () => {
    vi.mocked(exchangeCodeForTokens).mockResolvedValue(googleAnswer(true))
    const html = await runCallback()
    expect(html).toContain('https://statpilot.mom/#token=')
    expect(storeUserTokens).toHaveBeenCalledOnce()
  })

  it.each([false, undefined])('refuses email_verified=%s: no tokens stored, no session', async (value) => {
    vi.mocked(exchangeCodeForTokens).mockResolvedValue(googleAnswer(value))
    const html = await runCallback()
    expect(html).toContain('https://statpilot.mom/#error=email_unverified')
    expect(html).not.toContain('#token=')
    expect(storeUserTokens).not.toHaveBeenCalled()
  })
})
