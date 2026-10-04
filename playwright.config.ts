import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'

const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH
function findChromium(): string | undefined {
  if (!browsersPath) return undefined
  const direct = path.join(browsersPath, 'chromium')
  if (existsSync(direct) && !existsSync(path.join(direct, 'chrome-linux'))) return direct
  const candidates = ['chromium-1194/chrome-linux/chrome', 'chromium/chrome-linux/chrome']
  for (const c of candidates) {
    const p = path.join(browsersPath, c)
    if (existsSync(p)) return p
  }
  return undefined
}
const executablePath = findChromium()
const singleFile = 'file://' + path.resolve('dist-single/index.html')

export default defineConfig({
  testDir: 'e2e',
  testMatch: /demo\.spec\.ts|spike\.spec\.ts/,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  reporter: [['list']],
  use: {
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'http',
      use: { baseURL: 'http://localhost:4173/' },
      metadata: { entry: 'http://localhost:4173/' },
    },
    {
      name: 'single-file',
      use: { offline: true },
      metadata: { entry: singleFile },
    },
  ],
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
