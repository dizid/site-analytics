import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so tests don't load the Netlify/Tailwind/Vue
// plugins — the unit tests cover pure TypeScript only.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
