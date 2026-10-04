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
  await page.waitForSelector('main')
}

export async function go(page: Page, hash: string) {
  await page.evaluate((h) => {
    window.location.hash = h
  }, hash)
  await page.waitForSelector('main')
}

export async function setPersona(page: Page, id: string) {
  await page.getByTestId('persona-switcher').selectOption(id)
}

/** "Set up to here" for step n through the demo script panel. */
export async function setUpTo(page: Page, n: number) {
  await page.getByTestId('open-demo-script').click()
  await page.getByTestId(`demo-setup-${n}`).click()
  await expect(page.getByTestId('demo-script-panel')).toBeHidden({ timeout: 60_000 })
}

export async function resetDemo(page: Page) {
  await page.getByTestId('reset-demo').click()
  await expect(page.getByTestId('persona-card-per_tom')).toBeVisible()
}

export async function mainText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const main = document.querySelector('main')!
    const links = [...main.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '').filter((h) => !/^(data:|blob:)/.test(h))
    return main.textContent + '\n' + links.join('\n')
  })
}

export async function expectNoHorizontalScroll(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  expect(r.sw, `page scrolls horizontally: ${r.sw} > ${r.iw}`).toBeLessThanOrEqual(r.iw)
}

export function assertRoute(page: Page) {
  const h = page.url().split('#')[1] ?? ''
  for (const s of ['TH-', 'Tiverne', 'Merrowgate', 'Durnley', 'Ostlea', 'Lantern']) expect(h, 'route carries a private name: ' + h).not.toContain(s)
}
