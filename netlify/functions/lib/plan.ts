/**
 * Pure helpers for the free vs paid split. No network or env access — unit-testable.
 *
 * Free: the user's FREE_PROPERTY_LIMIT busiest sites in full; every other site
 * is listed by name only (no numbers reach the browser). Paid (one-time
 * Stripe payment): everything.
 */

import type { LockedProperty, PropertyResult } from '../../../src/types/analytics.js'
import { FREE_PROPERTY_LIMIT } from '../../../src/lib/pricing.js'

export type Tier = 'free' | 'pro'

export interface FreeSplit {
  visible: PropertyResult[]
  locked: LockedProperty[]
}

/** Sessions for ranking; properties that failed to load rank last. */
function rankSessions(property: PropertyResult): number {
  return property.metrics && !property.error ? property.metrics.sessions : -1
}

/**
 * Keeps the busiest `limit` properties (by sessions in the requested period;
 * ties alphabetical) and reduces the rest to their names.
 */
export function applyFreeLimit(properties: PropertyResult[], limit = FREE_PROPERTY_LIMIT): FreeSplit {
  const ranked = [...properties].sort((a, b) =>
    rankSessions(b) - rankSessions(a) || a.displayName.localeCompare(b.displayName))
  return {
    visible: ranked.slice(0, limit),
    locked:  ranked.slice(limit)
      .map(({ displayName, websiteUrl }) => ({ displayName, ...(websiteUrl ? { websiteUrl } : {}) }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),
  }
}

/**
 * The Payment Link for this user. client_reference_id carries the Google user
 * ID so the webhook knows whom to upgrade (Stripe allows [A-Za-z0-9_-], ≤200).
 * Returns null when payments aren't configured or the ID doesn't fit.
 */
export function buildUpgradeUrl(paymentLinkUrl: string | undefined, userId: string): string | null {
  if (!paymentLinkUrl || !/^[A-Za-z0-9_-]{1,200}$/.test(userId)) return null
  try {
    const url = new URL(paymentLinkUrl)
    url.searchParams.set('client_reference_id', userId)
    return url.toString()
  } catch {
    return null
  }
}

/**
 * The paywall only switches on once a Payment Link is configured — until then
 * everyone keeps seeing all sites (the app behaves exactly as before).
 */
export function paymentsEnabled(paymentLinkUrl: string | undefined): boolean {
  return Boolean(paymentLinkUrl?.trim())
}
