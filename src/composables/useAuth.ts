/**
 * useAuth.ts
 * OAuth JWT-based authentication state for the dashboard.
 * Module-level singleton — all components share the same reactive state.
 *
 * Flow:
 * 1. User clicks "Sign in with Google" → redirects to /api/oauth/authorize
 * 2. Google redirects back to /#token=<jwt>
 * 3. This module reads the hash on load, stores JWT in localStorage, clears hash
 * 4. JWT payload contains user info (email, name, picture); decoded client-side for display only
 * 5. Server validates JWT signature on every API call — never trust client-decoded payload for auth
 */

import { ref, readonly } from 'vue'
import type { UserInfo } from '../types/analytics'

const STORAGE_KEY = 'ga4:session-jwt'
/** Set by src/lib/api.ts when the server ends the session, so the landing page can say so */
export const SESSION_ENDED_KEY = 'ga4:session-ended'

// ---------------------------------------------------------------------------
// Singleton state — declared outside the function so all callers share it
// ---------------------------------------------------------------------------

const isAuthenticated = ref(false)
// Start true to prevent flash of login screen before we check localStorage/hash
const isLoading = ref(true)
const user = ref<UserInfo | null>(null)
const error = ref<string | null>(null)

// Initialize immediately on module load (browser only: the build-time
// prerender of the landing page, scripts/prerender-landing.mjs, has no window)
if (!import.meta.env.SSR) initAuth()

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

function initAuth(): void {
  const hash = window.location.hash

  // 1. OAuth callback: fragment contains the JWT from the server redirect
  if (hash.startsWith('#token=')) {
    const token = hash.slice(7)
    localStorage.setItem(STORAGE_KEY, token)
    // Clean the token out of the URL bar without adding to browser history
    history.replaceState(null, '', window.location.pathname)
  }

  // 2. OAuth error: server couldn't authorize the user
  if (hash.startsWith('#error=')) {
    const errorCode = hash.slice(7)
    error.value =
      errorCode === 'not_authorized'
        ? 'Your email is not authorized to access this dashboard.'
        : errorCode === 'missing_scope'
          ? 'StatPilot needs permission to see your Google Analytics data. Sign in again and leave the Google Analytics box ticked.'
          : errorCode === 'state_mismatch'
            ? 'The sign-in took too long or was started in another tab. Please try again.'
            : 'Sign-in was cancelled or failed. Please try again.'
    history.replaceState(null, '', window.location.pathname)
    isLoading.value = false
    return
  }

  // 3. Resume existing session — validate expiry from JWT payload (display only; server re-validates)
  const token = localStorage.getItem(STORAGE_KEY)
  if (token) {
    const payload = decodeJwtPayload(token)
    const exp = typeof payload?.exp === 'number' ? payload.exp : 0
    if (payload && exp * 1000 > Date.now()) {
      isAuthenticated.value = true
      user.value = {
        email: payload.email as string,
        name: payload.name as string,
        picture: payload.picture as string,
      }
    } else {
      // Token expired — clear it so the login screen shows, and say why
      localStorage.removeItem(STORAGE_KEY)
      error.value = 'Your session ended. Please sign in again.'
    }
  }

  // The server ended the session during a request (see src/lib/api.ts)
  try {
    if (sessionStorage.getItem(SESSION_ENDED_KEY)) {
      sessionStorage.removeItem(SESSION_ENDED_KEY)
      if (!isAuthenticated.value) error.value = 'Your session ended. Please sign in again.'
    }
  } catch {
    // storage blocked
  }

  isLoading.value = false
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function login(): void {
  // Redirect to the Netlify Function that kicks off the Google OAuth flow
  window.location.href = '/api/oauth/authorize'
}

async function logout(): Promise<void> {
  // Ask the server to delete the stored Google tokens, and wait for it, so a
  // failure can be shown (it used to be fire-and-forget)
  const token = localStorage.getItem(STORAGE_KEY)
  let serverFailed = false
  if (token) {
    try {
      const response = await fetch('/api/oauth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      serverFailed = !response.ok && response.status !== 401
    } catch {
      serverFailed = true
    }
  }

  // Wipe JWT and all namespaced analytics cache entries
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('ga4:')) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))

  isAuthenticated.value = false
  user.value = null
  error.value = serverFailed
    ? "You're signed out here, but the server couldn't confirm it deleted your Google access. Sign in and out once more, or remove StatPilot under your Google Account's third-party access."
    : null
}

/** Returns the raw JWT string for use in Authorization headers. */
function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

/** Returns the Google user ID (sub claim) for cache namespacing. */
function getUserId(): string | null {
  const token = localStorage.getItem(STORAGE_KEY)
  if (!token) return null
  const payload = decodeJwtPayload(token)
  return (payload?.sub as string | undefined) ?? null
}

// ---------------------------------------------------------------------------
// JWT decode helper (client-side display only — NOT for auth decisions)
// ---------------------------------------------------------------------------

/**
 * Base64url-decodes the JWT payload without cryptographic verification.
 * Used only to extract display info (name, email, picture) and check exp locally.
 * The server always re-validates the signature on every API request.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Base64url → base64 standard; parts[1] is the payload segment (always present after length check)
    const payloadSegment = parts[1] ?? ''
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    // atob gives bytes as Latin-1 characters; decode them as UTF-8 so names
    // with accents ("José") don't show garbled
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAuth() {
  return {
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    user: readonly(user),
    error: readonly(error),
    login,
    logout,
    getToken,
    getUserId,
  }
}
