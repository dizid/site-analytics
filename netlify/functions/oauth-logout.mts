/**
 * POST /api/oauth/logout
 *
 * Revokes the user's Google refresh token and clears stored tokens.
 * The frontend is responsible for clearing the JWT from localStorage.
 */

import type { Context } from '@netlify/functions'
import { JSON_HEADERS, validateSession } from './lib/auth.js'
import { getUserTokens, deleteUserTokens } from './lib/tokens.js'

// POST /api/oauth/logout
// Header: Authorization: Bearer <jwt>
export default async (request: Request, _context: Context): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: JSON_HEADERS })
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: JSON_HEADERS }
    )
  }

  // Validate session JWT — get user ID
  const session = await validateSession(request)
  if (session instanceof Response) return session

  const userId = session.sub

  // Retrieve stored tokens to get the refresh token for revocation
  const stored = await getUserTokens(userId)

  if (stored?.refreshToken) {
    // Revoke the refresh token with Google — best effort, don't fail logout if this errors
    try {
      const revokeResponse = await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(stored.refreshToken)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )

      if (!revokeResponse.ok) {
        // Not fatal — token may already be revoked or expired
        console.error(`Google token revocation returned ${revokeResponse.status} — continuing logout`)
      }
    } catch (err) {
      console.error('Google token revocation request failed (non-fatal):', err)
    }
  }

  // Delete stored tokens from Netlify Blobs regardless of revocation result
  try {
    await deleteUserTokens(userId)
  } catch (err) {
    console.error('Failed to delete user tokens from store:', err)
    // Return 500 so the frontend knows something went wrong server-side
    return new Response(
      JSON.stringify({ error: 'Logout failed — please try again' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: JSON_HEADERS }
  )
}
