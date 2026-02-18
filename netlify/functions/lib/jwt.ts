/**
 * JWT utilities for session tokens.
 * Uses `jose` (HS256) — zero-config, no gRPC, ~40KB.
 */

import { SignJWT, jwtVerify } from 'jose'

export interface JwtPayload {
  sub: string     // Google user ID
  email: string
  name: string
  picture: string
  iat: number     // issued-at (added by jose)
  exp: number     // expiry (added by jose)
}

// 24-hour session lifetime
const SESSION_TTL = '24h'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not configured')
  return new TextEncoder().encode(secret)
}

/**
 * Signs a 24h HS256 JWT with the given payload claims.
 * Call this after a successful OAuth callback.
 */
export async function mintSessionJwt(
  payload: Pick<JwtPayload, 'sub' | 'email' | 'name' | 'picture'>
): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name, picture: payload.picture })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getJwtSecret())
}

/**
 * Verifies signature and expiry. Returns typed payload on success.
 * Throws if the token is invalid or expired.
 */
export async function verifySessionJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] })

  // jose puts `sub` and standard claims on payload — validate required fields
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.name !== 'string' ||
    typeof payload.picture !== 'string'
  ) {
    throw new Error('JWT payload is missing required fields')
  }

  return {
    sub:     payload.sub,
    email:   payload.email as string,
    name:    payload.name as string,
    picture: payload.picture as string,
    iat:     payload.iat ?? 0,
    exp:     payload.exp ?? 0,
  }
}
