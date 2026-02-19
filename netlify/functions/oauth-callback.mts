/**
 * GET /api/oauth/callback
 *
 * Google OAuth callback handler:
 * 1. Validates CSRF state cookie
 * 2. Exchanges authorization code for tokens
 * 3. Decodes id_token to get user info
 * 4. Checks email against allowlist
 * 5. Stores tokens in Netlify Blobs
 * 6. Mints a session JWT
 * 7. Redirects to /#token=<jwt> (fragment never sent to server/logs)
 */

import type { Context } from '@netlify/functions'
import { exchangeCodeForTokens, storeUserTokens } from './lib/tokens.js'
import { mintSessionJwt } from './lib/jwt.js'
import { checkAllowedEmail } from './lib/auth.js'

// ---------------------------------------------------------------------------
// Cookie parsing helper
// ---------------------------------------------------------------------------

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=')
      return [key.trim(), rest.join('=').trim()]
    })
  )
}

// ---------------------------------------------------------------------------
// id_token payload decoder
// ---------------------------------------------------------------------------

interface GoogleIdTokenPayload {
  sub: string
  email: string
  name: string
  picture: string
  email_verified?: boolean
}

/**
 * Decodes the JWT payload from Google's id_token.
 * We do NOT verify the signature here — the token came from Google's token
 * endpoint over HTTPS with our client secret, so it's already authenticated.
 */
function decodeIdToken(idToken: string): GoogleIdTokenPayload {
  const parts = idToken.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid id_token format')
  }

  // Base64url decode the payload (middle segment)
  const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = payloadBase64 + '=='.slice(0, (4 - payloadBase64.length % 4) % 4)
  const json = Buffer.from(padded, 'base64').toString('utf-8')

  return JSON.parse(json) as GoogleIdTokenPayload
}

// ---------------------------------------------------------------------------
// Clear-state cookie helper (used whether auth succeeds or fails)
// ---------------------------------------------------------------------------

function clearStateCookie(isProduction: boolean): string {
  const parts = [
    'oauth_state=',
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0', // expire immediately
  ]
  if (isProduction) parts.push('Secure')
  return parts.join('; ')
}

// ---------------------------------------------------------------------------
// HTML redirect helper — @netlify/vite-plugin strips Location and Set-Cookie
// headers from function responses in dev mode, so we use HTML redirects.
// ---------------------------------------------------------------------------

function htmlRedirect(url: string, clearCookie: string): Response {
  const html = `<!DOCTYPE html><html><head>
<meta http-equiv="refresh" content="0;url=${url}">
</head><body><script>
document.cookie="oauth_state=;path=/;max-age=0";
window.location.href="${url}";
</script>Redirecting…</body></html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type':  'text/html; charset=utf-8',
      'Set-Cookie':    clearCookie,
      'Cache-Control': 'no-store',
    },
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

// GET /api/oauth/callback?code=xxx&state=yyy
export default async (request: Request, _context: Context): Promise<Response> => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const siteUrl = process.env.SITE_URL?.replace(/\/+$/, '')
  if (!siteUrl) {
    console.error('SITE_URL environment variable is not configured')
    return new Response('Internal server error', { status: 500 })
  }

  const isProduction = process.env.NODE_ENV === 'production' || siteUrl.startsWith('https://')
  const url          = new URL(request.url)
  const clearCookie  = clearStateCookie(isProduction)

  // ------------------------------------------------------------------
  // Handle user-denied consent (Google sends ?error=access_denied)
  // ------------------------------------------------------------------
  if (url.searchParams.get('error')) {
    return htmlRedirect(`${siteUrl}/#error=access_denied`, clearCookie)
  }

  // ------------------------------------------------------------------
  // CSRF state validation
  // ------------------------------------------------------------------
  const code  = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return htmlRedirect(`${siteUrl}/#error=invalid_callback`, clearCookie)
  }

  const cookies       = parseCookies(request.headers.get('Cookie'))
  const storedState   = cookies['oauth_state']

  if (!storedState || storedState !== state) {
    console.error('OAuth CSRF state mismatch — possible CSRF attack or expired cookie')
    return htmlRedirect(`${siteUrl}/#error=state_mismatch`, clearCookie)
  }

  // ------------------------------------------------------------------
  // Exchange code for tokens
  // ------------------------------------------------------------------
  const redirectUri = `${siteUrl}/api/oauth/callback`

  let tokenResponse: Awaited<ReturnType<typeof exchangeCodeForTokens>>
  try {
    tokenResponse = await exchangeCodeForTokens(code, redirectUri)
  } catch (err) {
    console.error('Token exchange error:', err)
    return htmlRedirect(`${siteUrl}/#error=token_exchange_failed`, clearCookie)
  }

  // ------------------------------------------------------------------
  // Decode user info from id_token
  // ------------------------------------------------------------------
  if (!tokenResponse.id_token) {
    console.error('Google token response missing id_token')
    return htmlRedirect(`${siteUrl}/#error=missing_id_token`, clearCookie)
  }

  let userInfo: GoogleIdTokenPayload
  try {
    userInfo = decodeIdToken(tokenResponse.id_token)
  } catch (err) {
    console.error('Failed to decode id_token:', err)
    return htmlRedirect(`${siteUrl}/#error=invalid_id_token`, clearCookie)
  }

  const { sub, email, name, picture } = userInfo

  if (!sub || !email) {
    console.error('id_token payload missing required fields (sub, email)')
    return htmlRedirect(`${siteUrl}/#error=invalid_user_info`, clearCookie)
  }

  // ------------------------------------------------------------------
  // Email allowlist check
  // ------------------------------------------------------------------
  if (!checkAllowedEmail(email)) {
    console.error(`OAuth login rejected — email not in allowlist: ${email}`)
    return htmlRedirect(`${siteUrl}/#error=not_authorized`, clearCookie)
  }

  // ------------------------------------------------------------------
  // Store tokens + mint session JWT
  // ------------------------------------------------------------------
  if (!tokenResponse.refresh_token) {
    // This should not happen because we set prompt=consent + access_type=offline,
    // but guard against it to avoid storing incomplete state
    console.error('Google token response missing refresh_token')
    return htmlRedirect(`${siteUrl}/#error=missing_refresh_token`, clearCookie)
  }

  try {
    await storeUserTokens(sub, {
      refreshToken:         tokenResponse.refresh_token,
      accessToken:          tokenResponse.access_token,
      // Google's expires_in is in seconds — convert to Unix ms
      accessTokenExpiresAt: Date.now() + tokenResponse.expires_in * 1000,
      email,
      name:    name ?? email,
      picture: picture ?? '',
    })
  } catch (err) {
    console.error('Failed to store user tokens:', err)
    return htmlRedirect(`${siteUrl}/#error=storage_failed`, clearCookie)
  }

  let sessionJwt: string
  try {
    sessionJwt = await mintSessionJwt({ sub, email, name: name ?? email, picture: picture ?? '' })
  } catch (err) {
    console.error('Failed to mint session JWT:', err)
    return htmlRedirect(`${siteUrl}/#error=jwt_failed`, clearCookie)
  }

  // Success — redirect with JWT in URL fragment (never logged, never sent to server)
  return htmlRedirect(`${siteUrl}/#token=${sessionJwt}`, clearCookie)
}
