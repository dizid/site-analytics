/**
 * Pure Stripe webhook helpers: signature check and event parsing.
 * No Stripe SDK and no Stripe API key — only the endpoint's signing secret.
 * See https://docs.stripe.com/webhooks#verify-manually
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

/** Stripe's default: reject events signed more than 5 minutes ago (replay protection). */
const TOLERANCE_SECONDS = 300

/**
 * Verifies a `Stripe-Signature` header (`t=<unix>,v1=<hex>[,v1=…]`) against
 * the raw request body. Returns false on any mismatch, missing part, or a
 * timestamp outside the tolerance.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!header || !secret) return false

  const parts = header.split(',').map((part) => part.trim().split('='))
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1])
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value ?? '')
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false

  const expected = Buffer.from(
    createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex'),
  )
  return signatures.some((signature) => {
    const given = Buffer.from(signature)
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

/** Who paid, from a completed StatPilot checkout. */
export interface Purchase {
  /** Google user ID from the Payment Link's client_reference_id (null if opened without it). */
  userId: string | null
  /** Email entered at checkout, lowercased — fallback match when userId is missing. */
  email: string | null
  checkoutSessionId: string
  amountTotal: number | null
  currency: string | null
}

interface CheckoutSessionObject {
  id?: string
  payment_link?: string | null
  payment_status?: string
  client_reference_id?: string | null
  customer_details?: { email?: string | null } | null
  amount_total?: number | null
  currency?: string | null
}

interface StripeEvent {
  type?: string
  data?: { object?: CheckoutSessionObject }
}

// Card payments are paid at completion; delayed methods report success later
const PAID_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])

/**
 * Returns the purchase for a paid checkout of OUR Payment Link, else null.
 * The Stripe account also serves other Dizid products, so every other
 * checkout (or unpaid one) is ignored.
 */
export function parsePurchase(event: StripeEvent, paymentLinkId: string): Purchase | null {
  const session = event.data?.object
  if (!event.type || !PAID_EVENTS.has(event.type) || !session?.id) return null
  if (!paymentLinkId || session.payment_link !== paymentLinkId) return null
  if (session.payment_status !== 'paid') return null

  const email = session.customer_details?.email?.trim().toLowerCase() || null
  const userId = session.client_reference_id?.trim() || null
  if (!userId && !email) return null

  return {
    userId,
    email,
    checkoutSessionId: session.id,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
  }
}
