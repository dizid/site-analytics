import type { Context } from '@netlify/functions'
import { JSON_HEADERS, constantTimeCompare } from './lib/auth.js'

// Minimum delay on failed login attempts to slow brute force
const FAILURE_DELAY_MS = 1000

// POST /api/auth
// Body: { password: string }
// Returns: { success: true } | { error: string }
export default async (request: Request, _context: Context): Promise<Response> => {
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: JSON_HEADERS })
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: JSON_HEADERS }
    )
  }

  // Ensure the env var is configured
  const dashboardPassword = process.env.DASHBOARD_PASSWORD
  if (!dashboardPassword) {
    console.error('DASHBOARD_PASSWORD environment variable is not configured')
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  // Parse and validate request body
  let body: { password?: unknown }
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: JSON_HEADERS }
    )
  }

  if (typeof body.password !== 'string' || body.password.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid password field' }),
      { status: 400, headers: JSON_HEADERS }
    )
  }

  // Constant-time comparison to avoid timing attacks
  if (!constantTimeCompare(body.password, dashboardPassword)) {
    // Delay failed attempts to slow brute force
    await new Promise(resolve => setTimeout(resolve, FAILURE_DELAY_MS))
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: JSON_HEADERS }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: JSON_HEADERS }
  )
}
