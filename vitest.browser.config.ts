import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config'

// Runs the same specs in real browsers: `npm run test:browser`
// Needs the browsers once: `npx playwright install chromium firefox webkit`
export default mergeConfig(baseConfig, defineConfig({
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
