// Google refuses its sign-in inside apps' built-in browsers (Google's
// "disallowed_useragent" policy for embedded webviews): someone who opens a
// StatPilot link from the LinkedIn, Facebook or Instagram app and taps
// "Sign in with Google" gets a Google error page instead of a sign-in.
// The landing page uses this to explain how to open the page in a real browser.
// Same as ClientPilot T-0494; StatPilot T-0515, Nov 12 2026.

export interface InAppBrowser {
  // App name for the message, or null when the app can't be told apart.
  appName: string | null
  platform: 'ios' | 'android' | 'other'
}

// Known in-app browsers that are webviews (Google blocks sign-in in these).
// X/Twitter is left out on purpose: its links open in Safari's own view on
// iPhone and Chrome Custom Tabs on Android, where Google sign-in works.
const KNOWN_APPS: Array<[RegExp, string]> = [
  [/LinkedInApp/i, 'LinkedIn'],
  [/FBAN|FBAV|FB_IAB|FBIOS/, 'Facebook'],
  [/Instagram/i, 'Instagram'],
  [/MicroMessenger/i, 'WeChat'],
  [/\bLine\//, 'LINE'],
  [/Snapchat/i, 'Snapchat'],
  [/BytedanceWebview|musical_ly|TikTok/i, 'TikTok'],
]

export function detectInAppBrowser(userAgent: string, standalone = false): InAppBrowser | null {
  const ua = userAgent || ''
  const isIos = /iPhone|iPad|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const platform: InAppBrowser['platform'] = isIos ? 'ios' : isAndroid ? 'android' : 'other'

  for (const [pattern, appName] of KNOWN_APPS) {
    if (pattern.test(ua)) return { appName, platform }
  }
  // Android's system WebView marks itself with "; wv)".
  if (isAndroid && /;\s?wv\)/.test(ua)) return { appName: null, platform }
  // iPhone webviews (WKWebView) leave out the "Safari/" token that Safari,
  // Safari's in-app view, Chrome and Firefox for iOS all send. A web app
  // added to the home screen also lacks it, so skip that case.
  if (isIos && /AppleWebKit/.test(ua) && !/Safari\//.test(ua) && !standalone) {
    return { appName: null, platform }
  }
  return null
}

// Android: an intent link opens the same page in Chrome from most in-app
// browsers. Returns null on other platforms.
export function chromeIntentUrl(pageUrl: string, platform: InAppBrowser['platform']): string | null {
  if (platform !== 'android') return null
  try {
    const url = new URL(pageUrl)
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`
  } catch {
    return null
  }
}
