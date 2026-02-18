/**
 * Shared auth utilities for Netlify Functions.
 * Single source of truth for password validation and Google Auth token generation.
 */

// Load .env for local dev — no-op when env vars are set in production (Netlify dashboard)
import 'dotenv/config'

import { timingSafeEqual } from 'node:crypto'
import { GoogleAuth } from 'google-auth-library'

// Response headers — no CORS needed (same-origin on Netlify)
export const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
}

// ---------------------------------------------------------------------------
// Constant-time string comparison
// ---------------------------------------------------------------------------

/**
 * Compare two strings in constant time to prevent timing attacks.
 * Uses crypto.timingSafeEqual under the hood.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  if (bufA.length !== bufB.length) {
    // Burn equivalent CPU time so the length difference isn't observable
    timingSafeEqual(bufA, bufA)
    return false
  }

  return timingSafeEqual(bufA, bufB)
}

// ---------------------------------------------------------------------------
// Dashboard password validation
// ---------------------------------------------------------------------------

/**
 * Validates the x-dashboard-password header against DASHBOARD_PASSWORD env var.
 * Returns null on success, or a Response to send immediately on failure.
 */
export function validateAuth(request: Request): Response | null {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD
  if (!dashboardPassword) {
    console.error('DASHBOARD_PASSWORD environment variable is not configured')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  const provided = request.headers.get('x-dashboard-password')
  if (!provided || !constantTimeCompare(provided, dashboardPassword)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Google Auth token
// ---------------------------------------------------------------------------

/**
 * Builds a GoogleAuth client from service account env vars and returns a
 * Bearer token scoped for GA4 readonly access.
 */
export async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GA_CLIENT_EMAIL
  const privateKey = process.env.GA_PRIVATE_KEY

  if (!clientEmail || !privateKey) {
    throw new Error('Missing GA service account credentials')
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      // Env vars store \n as literal backslash-n — convert to real newlines
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })

  const client = await auth.getClient()
  const tokenResponse = await client.getAccessToken()

  if (!tokenResponse.token) {
    throw new Error('Failed to obtain access token from Google Auth')
  }

  return tokenResponse.token
}
