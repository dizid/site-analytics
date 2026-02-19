/**
 * api.ts
 * Fetch wrapper that injects the Authorization: Bearer <jwt> header on every request.
 * On 401, clears the JWT from localStorage and reloads so the login screen shows.
 */

import { useAuth } from '../composables/useAuth'
import type { DateRange, ReportResponse, DetailResponse } from '../types/analytics'

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const { getToken } = useAuth()
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Only attach Authorization if we have a token
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Allow callers to override headers if needed
    ...(options.headers as Record<string, string> | undefined),
  }

  const response = await fetch(endpoint, { ...options, headers })

  // JWT rejected or expired — clear local session and force re-login
  if (response.status === 401) {
    localStorage.removeItem('ga4:session-jwt')
    window.location.reload()
    // Unreachable after reload, but keeps TypeScript happy
    throw new Error('Unauthorized — session expired')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error((body as { error?: string }).error ?? `API error ${response.status}`)
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Typed API methods
// ---------------------------------------------------------------------------

export const api = {
  /**
   * Fetch the GA4 report for all properties auto-discovered for the authenticated user.
   * @param days One of '7d' | '30d' | '90d'
   */
  getReport(days: DateRange): Promise<ReportResponse> {
    return apiFetch<ReportResponse>(`/api/analytics?days=${days}`)
  },

  getPropertyDetail(propertyId: string, days: DateRange): Promise<DetailResponse> {
    return apiFetch<DetailResponse>(
      `/api/analytics-detail?property=${encodeURIComponent(propertyId)}&days=${days}`
    )
  },
}
