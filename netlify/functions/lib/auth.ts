/**
 * Shared auth utilities for Netlify Functions.
 * JWT-based session validation. Password auth and service account have been removed.
 */

// Load .env for local dev — no-op when env vars are set in production (Netlify dashboard)
import 'dotenv/config'

import { verifySessionJwt, type JwtPayload } from './jwt.js'

// Response headers — no CORS needed (same-origin on Netlify)
export const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
}

// ---------------------------------------------------------------------------
// Session validation
// ---------------------------------------------------------------------------

/**
 * Reads the `Authorization: Bearer <token>` header, verifies the JWT signature
 * and expiry, and returns the typed payload.
 *
 * Returns a ready-to-send 401 Response if the token is missing or invalid —
 * callers should do: `if (session instanceof Response) return session`
 */
export async function validateSession(request: Request): Promise<JwtPayload | Response> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }

  try {
    const payload = await verifySessionJwt(token)
    return payload
  } catch (err) {
    // Token is expired, tampered, or otherwise invalid
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }
}

// ---------------------------------------------------------------------------
// Email allowlist
// ---------------------------------------------------------------------------

/**
 * Checks whether the given email is allowed to access the dashboard.
 * If the `ALLOWED_EMAILS` env var is empty or unset, all authenticated users
 * are allowed (useful for a personal dashboard).
 */
export function checkAllowedEmail(email: string): boolean {
  const allowedEnv = process.env.ALLOWED_EMAILS ?? ''
  if (!allowedEnv.trim()) {
    // No allowlist configured — allow all authenticated users
    return true
  }

  const allowedList = allowedEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return allowedList.includes(email.toLowerCase())
}
