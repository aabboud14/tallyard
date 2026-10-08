// End-to-end journeys (BRIEF section 13) against the production build, served with an SPA fallback.
import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'

/** The pre-installed Chromium, when PLAYWRIGHT_BROWSERS_PATH points at a folder that holds one. */
function findChromium(): string | undefined {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root) return undefined
  for (const c of ['chromium-1194/chrome-linux/chrome', 'chromium/chrome-linux/chrome']) {
    const p = path.join(root, c)
    if (existsSync(p)) return p
  }
  return undefined
}
const executablePath = findChromium()
const PORT = 4175

export default defineConfig({
  testDir: 'e2e',
  testMatch: /\.spec\.ts$/,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    acceptDownloads: true,
    launchOptions: executablePath ? { executablePath } : {},
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
