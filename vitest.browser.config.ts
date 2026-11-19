import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config'

// Runs the same specs in real browsers: `npm run test:browser`
// Needs the browsers once: `npx playwright install chromium firefox webkit`
export default mergeConfig(baseConfig, defineConfig({
  // `server.deps.inline` only applies to Node. In the browser Vite pre-bundles
  // dependencies, which would bake the published zeed-dom into @tiptap/html and
  // bypass the alias in vitest.config.ts.
  optimizeDeps: {
    exclude: ['@tiptap/html'],
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
}))
