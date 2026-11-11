/**
 * Build-time prerender of the signed-out landing page.
 * Runs after `vite build` (see package.json "build"): renders LandingPage +
 * AppFooter with Vue's server renderer and puts the HTML inside
 * dist/index.html's empty <div id="app"></div>.
 *
 * Why: the app has no router or SSR, so the served HTML had 1 character of
 * text; crawlers that don't run JavaScript saw an empty page. Browsers still
 * mount the app normally (main.ts), which swaps in identical live markup.
 * Signed-in visitors never see the prerendered copy: an inline script in
 * index.html hides [data-prerendered] when a session is stored.
 *
 * Fails the build if the render breaks, so a regression can't ship silently.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

const INDEX_FILE = 'dist/index.html'
const EMPTY_APP = '<div id="app"></div>'
// The landing page is ~9k characters of markup; far less means the render broke
const MIN_HTML_LENGTH = 2000

// The landing page's pricing section lists monthly plans ($19/mo, $49/mo) that
// can't be bought yet (no checkout on main; the pro-tier branch replaces them with
// a one-time Pro). While it lists per-month prices, leave it out of the copy that
// crawlers read, so AI answers don't quote plans nobody can buy. Browsers still
// show it once the app mounts; a section without "/mo" is kept automatically.
const PRICING_SECTION_RE = /<section\b[^>]*aria-labelledby="pricing-heading"[^>]*>[\s\S]*?<\/section>/

/** Drop the pricing section from the prerendered HTML while it shows unbuyable monthly plans. */
function withoutUnbuyablePlans(html) {
  const pricingSection = html.match(PRICING_SECTION_RE)
  if (!pricingSection || !pricingSection[0].includes('/mo')) return html
  return html.replace(pricingSection[0], '')
}

const vite = await createServer({
  configFile: false, // skip the app config (Netlify emulation, Tailwind): only SFC compilation is needed
  plugins: [vue()],
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] }, // no browser dependency scan: we only render on the server
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { renderLanding } = await vite.ssrLoadModule('/src/prerender-entry.ts')
  const landingHtml = withoutUnbuyablePlans(await renderLanding())
  if (landingHtml.length < MIN_HTML_LENGTH) {
    throw new Error(`prerendered landing page is only ${landingHtml.length} characters`)
  }

  const indexHtml = await readFile(INDEX_FILE, 'utf8')
  if (!indexHtml.includes(EMPTY_APP)) {
    throw new Error(`${INDEX_FILE} has no empty ${EMPTY_APP} to fill`)
  }

  await writeFile(INDEX_FILE, indexHtml.replace(EMPTY_APP, `<div id="app">${landingHtml}</div>`))
  console.log(`  Prerendered landing page into ${INDEX_FILE} (${landingHtml.length} chars)`)
} finally {
  await vite.close()
}
