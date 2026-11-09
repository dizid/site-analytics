import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyStripeSignature, parsePurchase } from '../netlify/functions/lib/stripe-webhook'

const SECRET = 'whsec_test_secret'
const NOW = 1_762_000_000

/** Builds a Stripe-Signature header the way Stripe does. */
function sign(body: string, timestamp = NOW, secret = SECRET): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

describe('verifyStripeSignature', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' })

  it('accepts a correctly signed body', () => {
    expect(verifyStripeSignature(body, sign(body), SECRET, NOW)).toBe(true)
  })

  it('accepts when any of several v1 signatures matches (secret rotation)', () => {
    const header = `t=${NOW},v1=${'0'.repeat(64)},${sign(body).split(',')[1]}`
    expect(verifyStripeSignature(body, header, SECRET, NOW)).toBe(true)
  })

  it('rejects a changed body, a wrong secret, or a missing header', () => {
    expect(verifyStripeSignature(`${body} `, sign(body), SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(body, sign(body, NOW, 'whsec_other'), SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(body, null, SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(body, sign(body), '', NOW)).toBe(false)
  })

  it('rejects old or future timestamps (replay protection, 5 minutes)', () => {
    expect(verifyStripeSignature(body, sign(body, NOW - 301), SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(body, sign(body, NOW + 301), SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(body, sign(body, NOW - 299), SECRET, NOW)).toBe(true)
  })

  it('rejects malformed headers', () => {
    expect(verifyStripeSignature(body, 'garbage', SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(body, `t=${NOW}`, SECRET, NOW)).toBe(false)
    expect(verifyStripeSignature(body, `t=abc,v1=${'a'.repeat(64)}`, SECRET, NOW)).toBe(false)
  })
})

describe('parsePurchase', () => {
  const LINK = 'plink_statpilot'
  const event = (overrides: Record<string, unknown> = {}, type = 'checkout.session.completed') => ({
    type,
    data: {
      object: {
        id: 'cs_live_1',
        payment_link: LINK,
        payment_status: 'paid',
        client_reference_id: '1234567890',
        customer_details: { email: ' Buyer@Example.com ' },
        amount_total: 1900,
        currency: 'usd',
        ...overrides,
      },
    },
  })

  it('reads who paid from a completed StatPilot checkout', () => {
    expect(parsePurchase(event(), LINK)).toEqual({
      userId: '1234567890',
      email: 'buyer@example.com',
      checkoutSessionId: 'cs_live_1',
      amountTotal: 1900,
      currency: 'usd',
    })
  })

  it('also accepts a delayed payment that succeeded later', () => {
    expect(parsePurchase(event({}, 'checkout.session.async_payment_succeeded'), LINK)).not.toBeNull()
  })

  it('ignores checkouts of other products on the same Stripe account', () => {
    expect(parsePurchase(event({ payment_link: 'plink_foreground' }), LINK)).toBeNull()
    expect(parsePurchase(event({ payment_link: null }), LINK)).toBeNull()
  })

  it('ignores unpaid checkouts and other event types', () => {
    expect(parsePurchase(event({ payment_status: 'unpaid' }), LINK)).toBeNull()
    expect(parsePurchase(event({}, 'checkout.session.expired'), LINK)).toBeNull()
    expect(parsePurchase({}, LINK)).toBeNull()
  })

  it('falls back to the email when the link was opened without a user ID', () => {
    expect(parsePurchase(event({ client_reference_id: null }), LINK)?.userId).toBeNull()
    expect(parsePurchase(event({ client_reference_id: null, customer_details: null }), LINK)).toBeNull()
  })

  it('never matches when the Payment Link ID is not configured', () => {
    expect(parsePurchase(event({ payment_link: '' }), '')).toBeNull()
  })
})
