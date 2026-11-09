/**
 * Paid accounts and free-plan site picks, in Netlify Blobs.
 *
 * Store "entitlements":
 *   user/<googleUserId>  → Entitlement (written by the Stripe webhook)
 *   email/<email>        → Entitlement (fallback when checkout had no user ID)
 * Store "free-sets":
 *   <googleUserId>       → property IDs the free plan currently shows in full
 *                          (written by /api/analytics, read by /api/analytics-detail)
 *
 * Refunds are revoked by hand: `netlify blobs:delete entitlements user/<id>` (and email/<email>).
 */

import { getStore } from '@netlify/blobs'
import type { Purchase } from './stripe-webhook.js'
import type { Tier } from './plan.js'

export interface Entitlement {
  tier: 'pro'
  paidAt: string
  checkoutSessionId: string
  email: string | null
  amountTotal: number | null
  currency: string | null
}

const userKey = (userId: string) => `user/${userId}`
const emailKey = (email: string) => `email/${email.trim().toLowerCase()}`

async function readEntitlement(key: string): Promise<Entitlement | null> {
  try {
    return (await getStore('entitlements').get(key, { type: 'json' })) as Entitlement | null
  } catch {
    return null
  }
}

/**
 * The user's plan. A purchase matched only by email is copied to the user ID
 * so later lookups are one read.
 */
export async function getTier(userId: string, email: string): Promise<Tier> {
  if (await readEntitlement(userKey(userId))) return 'pro'

  const byEmail = email ? await readEntitlement(emailKey(email)) : null
  if (!byEmail) return 'free'

  try {
    await getStore('entitlements').setJSON(userKey(userId), byEmail)
  } catch (err) {
    console.error(`Copying entitlement to user ${userId} failed:`, err)
  }
  return 'pro'
}

/** Records a paid purchase under the user ID and the checkout email (whichever exist). */
export async function grantPro(purchase: Purchase): Promise<void> {
  const entitlement: Entitlement = {
    tier:              'pro',
    paidAt:            new Date().toISOString(),
    checkoutSessionId: purchase.checkoutSessionId,
    email:             purchase.email,
    amountTotal:       purchase.amountTotal,
    currency:          purchase.currency,
  }
  const store = getStore('entitlements')
  const writes: Promise<unknown>[] = []
  if (purchase.userId) writes.push(store.setJSON(userKey(purchase.userId), entitlement))
  if (purchase.email) writes.push(store.setJSON(emailKey(purchase.email), entitlement))
  await Promise.all(writes)
}

/** Remembers which sites the free plan shows in full (the detail view checks it). */
export async function saveFreeSet(userId: string, propertyIds: string[]): Promise<void> {
  try {
    await getStore('free-sets').setJSON(userId, propertyIds)
  } catch (err) {
    console.error(`Saving free set for ${userId} failed:`, err)
  }
}

/** Called on logout. Never throws (logout must not fail on it). */
export async function deleteFreeSet(userId: string): Promise<void> {
  try {
    await getStore('free-sets').delete(userId)
  } catch (err) {
    console.error(`Deleting free set for ${userId} failed:`, err)
  }
}

export async function getFreeSet(userId: string): Promise<string[]> {
  try {
    const ids = await getStore('free-sets').get(userId, { type: 'json' })
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}
