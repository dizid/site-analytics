/**
 * Token storage (Netlify Blobs) + Google OAuth token operations.
 * All Google API calls use raw fetch() — no SDK, consistent with the rest of the project.
 */

import { getStore } from '@netlify/blobs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredTokens {
  refreshToken: string
  accessToken: string
  /** Unix milliseconds */
  accessTokenExpiresAt: number
  email: string
  name: string
  picture: string
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  id_token?: string
  token_type: string
  /** Space-separated scopes the user actually granted (Google lets users untick some) */
  scope?: string
}

/** Google said the refresh token is no longer valid (revoked or expired): sign in again. */
export class RefreshRevokedError extends Error {}

/** Google or the network didn't answer properly: try again later, keep the tokens. */
export class TokenRefreshUnavailableError extends Error {}

// ---------------------------------------------------------------------------
// Netlify Blobs helpers
// ---------------------------------------------------------------------------

function getUserTokenStore() {
  // Strong consistency: with the default, a read within ~60 s of a write could
  // return the old tokens (e.g. right after signing in again), and a failed
  // refresh of those old tokens then deleted the fresh ones.
  return getStore({ name: 'user-tokens', consistency: 'strong' })
}

/** Persists all token data for a user, keyed by their Google sub (user ID). */
export async function storeUserTokens(userId: string, data: StoredTokens): Promise<void> {
  const store = getUserTokenStore()
  await store.setJSON(userId, data)
}

/** Retrieves stored tokens for a user. Returns null if not found. */
export async function getUserTokens(userId: string): Promise<StoredTokens | null> {
  const store = getUserTokenStore()
  try {
    const data = await store.get(userId, { type: 'json' })
    return (data as StoredTokens) ?? null
  } catch {
    // Blob not found or store access failed — treat as unauthenticated
    return null
  }
}

/** Removes stored tokens (on logout or auth failure). */
export async function deleteUserTokens(userId: string): Promise<void> {
  const store = getUserTokenStore()
  await store.delete(userId)
}

// ---------------------------------------------------------------------------
// Google OAuth token exchange
// ---------------------------------------------------------------------------

function getGoogleCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable is not configured')
  }
  return { clientId, clientSecret }
}

/**
 * Exchanges an OAuth authorization code for tokens.
 * Called once during the OAuth callback flow.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleCredentials()

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Google token exchange failed (${response.status}): ${body}`)
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  return response.json() as Promise<GoogleTokenResponse>
}

/**
 * Uses the stored refresh token to get a new access token from Google.
 * Returns the new access token and its expiry timestamp (Unix ms).
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const { clientId, clientSecret } = getGoogleCredentials()

  let response: Response
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    })
  } catch (err) {
    throw new TokenRefreshUnavailableError(`Token refresh request failed: ${err instanceof Error ? err.message : 'network error'}`)
  }

  if (!response.ok) {
    const body = await response.text()
    console.error(`Google token refresh failed (${response.status}): ${body}`)
    // Only "invalid_grant" means the refresh token itself is dead; 5xx/429 and
    // other errors are temporary and must not log the user out
    let errorCode = ''
    try {
      errorCode = (JSON.parse(body) as { error?: string }).error ?? ''
    } catch {
      // not JSON
    }
    if (response.status === 400 && errorCode === 'invalid_grant') {
      throw new RefreshRevokedError('Refresh token is invalid or revoked')
    }
    throw new TokenRefreshUnavailableError(`Token refresh failed: ${response.status}`)
  }

  const data = await response.json() as GoogleTokenResponse
  const expiresAt = Date.now() + data.expires_in * 1000

  return { accessToken: data.access_token, expiresAt }
}

// ---------------------------------------------------------------------------
// Token lifecycle management
// ---------------------------------------------------------------------------

/** 5-minute buffer — refresh before expiry to avoid race conditions */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

/**
 * Returns a valid Google access token for the user.
 * Transparently refreshes if the stored token is within 5 minutes of expiry.
 * Updates Netlify Blobs after a refresh so subsequent calls get the new token.
 * Throws if the user has no stored tokens or the refresh token is revoked.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const stored = await getUserTokens(userId)

  if (!stored) {
    throw new Error('No stored tokens for user — re-authentication required')
  }

  // Return early if the stored access token is still fresh
  const isStillValid = stored.accessTokenExpiresAt - EXPIRY_BUFFER_MS > Date.now()
  if (isStillValid) {
    return stored.accessToken
  }

  // Refresh the access token
  let refreshResult: { accessToken: string; expiresAt: number }
  try {
    refreshResult = await refreshAccessToken(stored.refreshToken)
  } catch (err) {
    if (err instanceof RefreshRevokedError) {
      // Delete only if the stored token is still the one Google just refused
      // (the user may have signed in again in the meantime)
      const current = await getUserTokens(userId)
      if (current?.refreshToken === stored.refreshToken) {
        await deleteUserTokens(userId)
      }
      throw new Error('Refresh token is invalid or revoked — re-authentication required')
    }
    // Temporary problem: keep the tokens, let the caller say "try again"
    throw err instanceof TokenRefreshUnavailableError ? err : new TokenRefreshUnavailableError('Token refresh failed')
  }

  // Persist the new access token (refresh token stays the same)
  const updated: StoredTokens = {
    ...stored,
    accessToken:          refreshResult.accessToken,
    accessTokenExpiresAt: refreshResult.expiresAt,
  }
  await storeUserTokens(userId, updated)

  return refreshResult.accessToken
}
