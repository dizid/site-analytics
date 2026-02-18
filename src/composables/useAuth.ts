/**
 * useAuth.ts
 * Password-gate state for the dashboard.
 * Module-level singleton — all components share the same reactive state.
 */

import { ref, readonly } from 'vue'
import { api } from '../lib/api'

const SESSION_KEY = 'dashboard-password'

// ---------------------------------------------------------------------------
// Singleton state — declared outside the function so all callers share it
// ---------------------------------------------------------------------------

const isAuthenticated = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Initialise from existing session — if the key is present the user already
// logged in during this browser session, so we skip the login screen.
if (sessionStorage.getItem(SESSION_KEY) !== null) {
  isAuthenticated.value = true
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function login(password: string): Promise<boolean> {
  isLoading.value = true
  error.value = null

  try {
    // Temporarily store the password so apiFetch can include it in the header
    // for the auth request itself — the server needs it to validate.
    sessionStorage.setItem(SESSION_KEY, password)

    const result = await api.login(password)

    if (result.success) {
      // Password already stored above; mark as authenticated.
      isAuthenticated.value = true
      return true
    } else {
      // Server said no — clear the tentative storage entry
      sessionStorage.removeItem(SESSION_KEY)
      error.value = 'Incorrect password. Please try again.'
      return false
    }
  } catch (err) {
    sessionStorage.removeItem(SESSION_KEY)
    error.value =
      err instanceof Error ? err.message : 'Login failed. Please try again.'
    return false
  } finally {
    isLoading.value = false
  }
}

function logout(): void {
  sessionStorage.removeItem(SESSION_KEY)
  isAuthenticated.value = false
  error.value = null
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useAuth() {
  return {
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    error: readonly(error),
    login,
    logout,
  }
}
