import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend<{ entry: string }>({
  // oxlint-disable-next-line no-empty-pattern
  entry: async ({}, use, testInfo) => {
    await use(testInfo.project.metadata.entry as string)
  },
  page: async ({ page }, use, testInfo) => {
    if (testInfo.project.name === 'single-file') {
      page.on('request', (req) => {
        const url = req.url()
        if (!/^(file:|data:|blob:)/.test(url)) {
          throw new Error('Network request in the single-file build: ' + url)
        }
      })
    }
    await use(page)
  },
})

export { expect }

export async function open(page: Page, entry: string, hash = '/') {
  await page.goto(entry + '#' + hash)
}
