/**
 * POST /api/oauth/logout
 *
 * Revokes the user's Google refresh token and clears stored tokens.
 * The frontend is responsible for clearing the JWT from localStorage.
 */

import type { Context } from '@netlify/functions'
import { JSON_HEADERS } from './lib/auth.js'
import { sessionUserIdForLogout } from './lib/jwt.js'
import { deleteUserTokens } from './lib/tokens.js'

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

  // Signed session token -> user ID. Unlike other endpoints, an expired
  // session and the allowlist are not checked: signing out must always be able
  // to delete the stored tokens (a 24 h+ old tab used to get a 401 and keep them).
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  let userId: string
  try {
    if (!token) throw new Error('missing token')
    userId = await sessionUserIdForLogout(token)
  } catch {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }

  // No Google revoke here: revoking cancels the grant for the whole Google
  // Cloud project, which also signed the user out on their other devices and in
  // the other app that shares this project. Logging out deletes StatPilot's
  // stored tokens (what the privacy page promises); people can remove the
  // grant itself under their Google Account's third-party access.

  // Delete stored tokens from Netlify Blobs
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
