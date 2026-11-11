/**
 * prerender-entry.ts
 * Build-time only: scripts/prerender-landing.mjs loads this through Vite's SSR
 * loader and writes the result into dist/index.html, so crawlers that don't run
 * JavaScript (AI answer engines, link previews) see the landing page text.
 * The browser bundle never imports this file; main.ts mounts App.vue as usual,
 * which replaces the prerendered markup with the live app.
 */

import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import LandingPage from './components/LandingPage.vue'
import AppFooter from './components/AppFooter.vue'

/** Attribute on the prerendered root; index.html hides it for signed-in visitors. */
export const PRERENDER_ATTR = 'data-prerendered'

/**
 * Render the signed-out view to an HTML string.
 * Same markup as App.vue's `v-else-if="!isAuthenticated"` branch — keep the two in step.
 */
export async function renderLanding(): Promise<string> {
  const app = createSSRApp({
    render: () =>
      h('div', { class: 'min-h-screen flex flex-col', [PRERENDER_ATTR]: '' }, [
        h(LandingPage, { class: 'flex-1' }),
        h(AppFooter),
      ]),
  })
  return renderToString(app)
}
