/**
 * Errors from Google's APIs (Analytics Admin + Data API), shared by the
 * analytics and analytics-detail functions.
 */

/** A Google API answered with an error status. `message` is Google's own text. */
export class GoogleApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'GoogleApiError'
  }
}

/** Extracts a human-readable error message from Google's JSON error response body. */
export function parseGoogleApiError(body: string, status: number): string {
  try {
    const err = JSON.parse(body)
    const message = err.error?.message || err.error?.status
    if (message) return message
  } catch { /* body wasn't JSON */ }
  return `GA4 API request failed (status ${status})`
}

/** Reads a failed Google response into a GoogleApiError (keeps the status). */
export async function googleApiErrorFrom(response: Response): Promise<GoogleApiError> {
  const body = await response.text()
  return new GoogleApiError(parseGoogleApiError(body, response.status), response.status)
}

/**
 * True when Google refused the access token itself (401 UNAUTHENTICATED),
 * e.g. the user removed StatPilot under their Google Account's third-party
 * access while our stored access token still had up to an hour to run.
 */
export function isTokenRejected(err: unknown): boolean {
  return err instanceof GoogleApiError && err.status === 401
}

/**
 * User-facing text for Google's per-property quota (HTTP 429 RESOURCE_EXHAUSTED).
 * GA4 has hourly and daily token limits, so no promise of when it's back.
 */
export const QUOTA_MESSAGE =
  "Google Analytics' usage limit for this property is used up for now. Please try again later."
