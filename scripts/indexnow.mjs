#!/usr/bin/env node
/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver...) that pages are new or
 * changed. Bing's index also feeds ChatGPT search and Copilot. Run after a production
 * deploy that adds or changes pages:
 *
 *   npm run indexnow                               every URL in the live sitemap
 *   npm run indexnow -- /blog/some-post /reading   only these pages
 *
 * The key is public by design: IndexNow verifies ownership by fetching
 * public/<KEY>.txt from the site, so the script first checks that file is live
 * (i.e. the deploy carrying it has gone out). Same setup as firehorse.info, wuxingzodiac.me and dizid.com.
 */
const HOST = 'statpilot.mom'
const KEY = '87ccd8ce9a2249fa84889e943460b3c0'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`
const BATCH_SIZE = 10_000 // IndexNow's maximum per request

/** Paths or full URLs from the command line, else every <loc> in the live sitemap */
async function urlsToSubmit() {
  const args = process.argv.slice(2)
  if (args.length > 0) {
    return args.map(arg => (arg.startsWith('http') ? arg : `https://${HOST}${arg.startsWith('/') ? '' : '/'}${arg}`))
  }
  const response = await fetch(`https://${HOST}/sitemap.xml`)
  if (!response.ok) throw new Error(`indexnow: sitemap answered HTTP ${response.status}`)
  const sitemap = await response.text()
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
}

const urlList = await urlsToSubmit()
if (urlList.length === 0) throw new Error('indexnow: no URLs to submit')
for (const url of urlList) {
  if (new URL(url).host !== HOST) throw new Error(`indexnow: ${url} is not on ${HOST}`)
}

const keyFile = await fetch(KEY_LOCATION)
if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
  throw new Error(`indexnow: ${KEY_LOCATION} isn't live yet (HTTP ${keyFile.status}). Deploy first.`)
}

for (let start = 0; start < urlList.length; start += BATCH_SIZE) {
  const batch = urlList.slice(start, start + BATCH_SIZE)
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batch }),
  })
  // 200 = accepted, 202 = accepted and the key is still being verified
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`indexnow: HTTP ${response.status} ${await response.text()}`)
  }
  console.log(`indexnow: submitted ${batch.length} URLs (HTTP ${response.status})`)
}
