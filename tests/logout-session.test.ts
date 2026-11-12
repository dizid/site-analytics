import { describe, it, expect, beforeAll } from 'vitest'
import { SignJWT } from 'jose'
import { mintSessionJwt, sessionUserIdForLogout, verifySessionJwt } from '../netlify/functions/lib/jwt'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET)

async function expiredToken(sub: string, key = secret()) {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ email: 'a@b.c', name: 'A', picture: '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt(now - 2 * 86400)
    .setExpirationTime(now - 86400)
    .sign(key)
}

describe('sessionUserIdForLogout', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'test-secret-for-logout' })

  it('returns the user id of a valid session', async () => {
    expect(await sessionUserIdForLogout(await mintSessionJwt({ sub: 'u1', email: 'a@b.c', name: 'A', picture: '' }))).toBe('u1')
  })

  it('accepts an expired session (a tab left open over 24 h can still sign out)', async () => {
    const token = await expiredToken('u2')
    await expect(verifySessionJwt(token)).rejects.toThrow() // other endpoints still refuse it
    expect(await sessionUserIdForLogout(token)).toBe('u2')
  })

  it('refuses a token signed with another key, expired or not', async () => {
    const forged = await expiredToken('victim', new TextEncoder().encode('not-the-secret'))
    await expect(sessionUserIdForLogout(forged)).rejects.toThrow()
    await expect(sessionUserIdForLogout('not.a.jwt')).rejects.toThrow()
  })
})
