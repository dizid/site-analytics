/**
 * The user's Google access token for a data function, or the Response to send
 * when there is none. Shared by analytics and analytics-detail so both answer
 * the same way.
 */

import { JSON_HEADERS } from './auth.js'
import { getValidAccessToken, TokenRefreshUnavailableError } from './tokens.js'

/**
 * Returns a valid access token, or a ready-to-send Response:
 * - 503 "try again" when Google or the token store is temporarily unreachable
 *   (the stored tokens are kept)
 * - 401 "sign in again" when there are no usable tokens (none stored, or
 *   Google says the grant is revoked; the frontend then shows the landing page)
 *
 * Pass `rejectedToken` after Google refused a token with a 401, to get a
 * freshly refreshed one instead of the same token again.
 */
export async function accessTokenOrResponse(
  userId: string,
  rejectedToken?: string,
): Promise<string | Response> {
  try {
    return await getValidAccessToken(userId, rejectedToken ? { rejectedToken } : {})
  } catch (err) {
    if (err instanceof TokenRefreshUnavailableError) {
      console.error('Google token refresh temporarily unavailable:', err.message)
      return new Response(
        JSON.stringify({ error: "Couldn't reach your Google connection right now. Please try again in a minute." }),
        { status: 503, headers: JSON_HEADERS }
      )
    }
    const detail = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Failed to get valid access token for user ${userId}:`, err)
    return new Response(
      JSON.stringify({ error: `Session expired — please sign in again (${detail})` }),
      { status: 401, headers: JSON_HEADERS }
    )
  }
}
