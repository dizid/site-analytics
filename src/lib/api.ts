/**
 * api.ts
 * Fetch wrapper that injects the dashboard password header on every request.
 * On 401, clears the session and forces a page reload to show the login screen.
 */

import type { DateRange, PropertyInfo, ReportResponse } from '../types/analytics'

const SESSION_KEY = 'dashboard-password'
const PASSWORD_HEADER = 'x-dashboard-password'

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const password = sessionStorage.getItem(SESSION_KEY) ?? ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [PASSWORD_HEADER]: password,
    // Spread any caller-supplied headers so they can override if needed
    ...(options.headers as Record<string, string> | undefined),
  }

  const response = await fetch(endpoint, { ...options, headers })

  // Force re-login when the server rejects the password
  if (response.status === 401) {
    sessionStorage.clear()
    window.location.reload()
    // Unreachable after reload, but satisfies the return type
    throw new Error('Unauthorized — session cleared')
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`API error ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Typed API methods
// ---------------------------------------------------------------------------

export const api = {
  /**
   * Authenticate with the server. Sends the plain-text password in the body
   * so the server can validate and establish what counts as "logged in".
   */
  login(password: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  },

  /**
   * Fetch aggregated GA4 report for all configured properties.
   * @param days  One of '7d' | '30d' | '90d'
   */
  getReport(days: DateRange): Promise<ReportResponse> {
    return apiFetch<ReportResponse>(`/api/analytics?days=${days}`)
  },

  /**
   * Fetch the list of GA4 properties available on the server.
   */
  getProperties(): Promise<PropertyInfo[]> {
    return apiFetch<PropertyInfo[]>('/api/properties')
  },
}
