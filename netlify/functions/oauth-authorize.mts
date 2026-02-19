/**
 * GET /api/oauth/authorize
 *
 * Initiates Google OAuth flow:
 * 1. Generates a random CSRF state nonce
 * 2. Stores it in an httpOnly cookie (5-min TTL)
 * 3. Redirects the browser to Google's OAuth consent screen
 */

import type { Context } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
// Load .env for local dev — no-op when env vars are set in production (Netlify dashboard)
import 'dotenv/config'

// GET /api/oauth/authorize — no body, no auth required (public entry point)
export default async (request: Request, _context: Context): Promise<Response> => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  // Derive base URL from the request itself so localhost dev doesn't redirect to production
  // (the @netlify/vite-plugin injects remote env vars that override local .env SITE_URL)
  const requestOrigin = new URL(request.url).origin
  const siteUrl = requestOrigin !== 'null' ? requestOrigin : process.env.SITE_URL?.replace(/\/+$/, '')

  if (!clientId || !siteUrl) {
    console.error('GOOGLE_CLIENT_ID or SITE_URL environment variable is not configured')
    return new Response('Internal server error', { status: 500 })
  }

  // 32-byte hex nonce — opaque, cryptographically random CSRF state
  const state = randomBytes(32).toString('hex')

  // Redirect URI must exactly match one of the URIs registered in Google Cloud Console
  const redirectUri = `${siteUrl}/api/oauth/callback`

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id',     clientId)
  googleAuthUrl.searchParams.set('redirect_uri',  redirectUri)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/analytics.readonly',
  ].join(' '))
  googleAuthUrl.searchParams.set('access_type', 'offline')
  // prompt=consent ensures we always receive a refresh token
  googleAuthUrl.searchParams.set('prompt', 'consent')
  googleAuthUrl.searchParams.set('state', state)

  // Store state in an httpOnly cookie to validate on callback (CSRF protection)
  const isProduction = process.env.NODE_ENV === 'production' || siteUrl.startsWith('https://')
  const cookieParts = [
    `oauth_state=${state}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=300', // 5 minutes — enough time to complete the OAuth flow
  ]
  if (isProduction) {
    cookieParts.push('Secure')
  }

  const redirectUrl = googleAuthUrl.toString()

  // HTML redirect with JS cookie fallback — the @netlify/vite-plugin strips
  // all response headers (Location, Set-Cookie) from functions in dev mode.
  // This HTML approach works in both dev and production.
  const html = `<!DOCTYPE html><html><head>
<meta http-equiv="refresh" content="0;url=${redirectUrl}">
</head><body><script>
document.cookie="oauth_state=${state};path=/;max-age=300;samesite=lax";
window.location.href="${redirectUrl}";
</script>Redirecting…</body></html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type':  'text/html; charset=utf-8',
      'Set-Cookie':    cookieParts.join('; '),
      'Cache-Control': 'no-store',
    },
  })
}
