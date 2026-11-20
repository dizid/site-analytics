import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// useAuth reads the URL and storage when the module loads (browser only), so
// each test sets up a fake browser tab, then imports a fresh copy of it.

class MemoryStorage {
  private items = new Map<string, string>()
  get length() { return this.items.size }
  key(i: number) { return [...this.items.keys()][i] ?? null }
  getItem(k: string) { return this.items.get(k) ?? null }
  setItem(k: string, v: string) { this.items.set(k, String(v)) }
  removeItem(k: string) { this.items.delete(k) }
  clear() { this.items.clear() }
}

let local: MemoryStorage
let session: MemoryStorage
let location: { hash: string; pathname: string; href: string }

/** A JWT-shaped string (unsigned: the browser only decodes it for display). */
function fakeJwt(email: string, expiresInSeconds = 3600) {
  const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  return `${b64url({ alg: 'HS256' })}.${b64url({ sub: email, email, name: email, picture: '', exp })}.sig`
}

/** Opens statpilot.mom in the fake tab with the given hash and loads useAuth. */
async function openTab(hash: string) {
  location.hash = hash
  vi.resetModules()
  const mod = await import('../src/composables/useAuth')
  return mod
}

beforeEach(() => {
  local = new MemoryStorage()
  session = new MemoryStorage()
  location = { hash: '', pathname: '/', href: 'https://statpilot.mom/' }
  vi.stubEnv('SSR', false)
  vi.stubGlobal('localStorage', local)
  vi.stubGlobal('sessionStorage', session)
  vi.stubGlobal('history', { replaceState: () => { location.hash = '' } })
  vi.stubGlobal('window', { location })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('sign-in token in the URL (#token=)', () => {
  it('signs in when this tab started the sign-in', async () => {
    // The visitor pressed "Sign in with Google" in this tab...
    const first = await openTab('')
    first.useAuth().login()
    expect(session.getItem(first.LOGIN_PENDING_KEY)).not.toBeNull()

    // ...and Google sends them back with their token
    const token = fakeJwt('owner@example.com')
    const { useAuth } = await openTab(`#token=${token}`)
    expect(useAuth().isAuthenticated.value).toBe(true)
    expect(useAuth().user.value?.email).toBe('owner@example.com')
    expect(local.getItem('ga4:session-jwt')).toBe(token)
    expect(location.hash).toBe('') // token removed from the address bar
  })

  it("ignores a shared link with someone else's token (no sign-in started here)", async () => {
    const { useAuth } = await openTab(`#token=${fakeJwt('attacker@example.com')}`)
    expect(useAuth().isAuthenticated.value).toBe(false)
    expect(local.getItem('ga4:session-jwt')).toBeNull()
    expect(useAuth().error.value).toMatch(/wasn't started in this browser tab/)
    expect(location.hash).toBe('')
  })

  it("keeps a signed-in visitor's own session when they open such a link", async () => {
    const own = fakeJwt('me@example.com')
    local.setItem('ga4:session-jwt', own)
    const { useAuth } = await openTab(`#token=${fakeJwt('attacker@example.com')}`)
    expect(useAuth().isAuthenticated.value).toBe(true)
    expect(useAuth().user.value?.email).toBe('me@example.com')
    expect(local.getItem('ga4:session-jwt')).toBe(own)
  })

  it('refuses a token when the sign-in was started over 15 minutes ago', async () => {
    const { LOGIN_PENDING_KEY } = await openTab('')
    session.setItem(LOGIN_PENDING_KEY, String(Date.now() - 16 * 60 * 1000))
    const { useAuth } = await openTab(`#token=${fakeJwt('owner@example.com')}`)
    expect(useAuth().isAuthenticated.value).toBe(false)
  })

  it('accepts the sign-in mark only once', async () => {
    const first = await openTab('')
    first.useAuth().login()
    await openTab(`#token=${fakeJwt('owner@example.com')}`)
    local.clear()
    const { useAuth } = await openTab(`#token=${fakeJwt('attacker@example.com')}`)
    expect(useAuth().isAuthenticated.value).toBe(false)
  })
})
