/**
 * POST /api/stripe-webhook — Stripe calls this after a checkout.
 *
 * 1. Verifies the Stripe-Signature header with STRIPE_WEBHOOK_SECRET
 * 2. Keeps only paid checkouts of StatPilot's Payment Link (STRIPE_PAYMENT_LINK_ID);
 *    the Stripe account also serves other products, those events get a plain 200
 * 3. Marks the buyer as paid in Netlify Blobs (by Google user ID and email)
 *
 * Env (server-side only): STRIPE_WEBHOOK_SECRET, STRIPE_PAYMENT_LINK_ID.
 * No Stripe API key is needed or used.
 */

import type { Context } from '@netlify/functions'
import { JSON_HEADERS } from './lib/auth.js'
import { verifyStripeSignature, parsePurchase } from './lib/stripe-webhook.js'
import { grantPro } from './lib/entitlements.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export default async (request: Request, _context: Context): Promise<Response> => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const paymentLinkId = process.env.STRIPE_PAYMENT_LINK_ID?.trim()
  if (!secret || !paymentLinkId) {
    console.error('Stripe webhook called but STRIPE_WEBHOOK_SECRET or STRIPE_PAYMENT_LINK_ID is not set')
    // 503 makes Stripe retry, so nothing is lost once the env vars are set
    return jsonResponse({ error: 'Payments not configured' }, 503)
  }

  // The signature covers the exact raw body, so read it before any parsing
  const rawBody = await request.text()
  if (!verifyStripeSignature(rawBody, request.headers.get('Stripe-Signature'), secret)) {
    return jsonResponse({ error: 'Invalid signature' }, 400)
  }

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const purchase = parsePurchase(event as Parameters<typeof parsePurchase>[0], paymentLinkId)
  if (!purchase) return jsonResponse({ received: true, ignored: true })

  try {
    await grantPro(purchase)
  } catch (err) {
    console.error(`Granting pro for checkout ${purchase.checkoutSessionId} failed:`, err)
    // 500 → Stripe retries the event
    return jsonResponse({ error: 'Could not record purchase' }, 500)
  }
  return jsonResponse({ received: true })
}
