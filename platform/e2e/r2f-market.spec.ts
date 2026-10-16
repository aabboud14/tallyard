// Recording audit follow-up, Marketplace and navigation (feedback/r2f-market.md), through the production build:
// the home's "{n} new materials fit" link lands on the New for {project} row with its materials in view on a
// desktop and a phone; following it does not change what the Marketplace opens on next time; the strip jumps to
// the row; the sidebar names its project order; the architect's specification has no guide price.
import { expect, test, type Page } from '@playwright/test'

const M = 'prj_hp23zk'
const EMAIL = { priya: 'priya.nair@studiooriel.example', isla: 'isla.brennan@lanternquay.example' } as const

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`)
  })
  return errors
}

async function signIn(page: Page, who: keyof typeof EMAIL) {
  await page.goto('/signin')
  await page.getByTestId(`sample-${EMAIL[who]}`).click()
  await page.waitForURL('**/app/home')
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    const main = document.querySelector('main')
    return Math.max(doc.scrollWidth - doc.clientWidth, main ? main.scrollWidth - main.clientWidth : 0)
  })
}

/** The row's heading clears the sticky bars, and at least one of its materials is in view. */
async function expectRowInView(page: Page, label: string) {
  const row = page.getByTestId('new-for-projects')
  await expect(row, label).toBeInViewport()
  await expect(row.locator('[data-testid^="new-card-"]').first(), label).toBeInViewport()
  const covered = await page.evaluate(() => {
    const h = document.getElementById('new-for-projects-h')!.getBoundingClientRect()
    let bottom = 0
    for (const el of document.querySelectorAll<HTMLElement>('[data-testid="top-bar"], [data-testid="discover-toolbar"]')) {
      if (getComputedStyle(el).position !== 'sticky') continue
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom)
    }
    return { heading: h.top, bars: bottom }
  })
  expect(covered.heading, `${label}: heading below the sticky bars`).toBeGreaterThanOrEqual(covered.bars)
}

for (const size of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`the home link lands on the new materials for the project at ${size.width} px, for that visit only`, async ({ page }) => {
    const errors = watchErrors(page)
    await page.setViewportSize(size)
    await signIn(page, 'priya')
    await page.getByTestId(`home-new-fits-${M}`).click()
    await page.waitForURL(`**/app/marketplace?project=${M}#new-for-projects`)
    await expect(page.getByTestId('checking-bar')).toContainText('Checking against Merrowgate Wharf')
    await expect(page.getByTestId('new-for-projects')).toContainText('New for Merrowgate Wharf')
    await expectRowInView(page, `${size.width} from the home`)
    expect(await horizontalOverflow(page)).toBe(0)

    // Back at the top, the strip's link jumps to the row again.
    await page.evaluate(() => {
      window.scrollTo(0, 0)
      document.querySelector('main')?.scrollTo(0, 0)
    })
    await expect(page.getByTestId('new-for-projects-jump')).toBeInViewport()
    await expect(page.getByTestId('new-for-projects-jump')).toHaveAccessibleName(/^\d+ new for Merrowgate Wharf$/)
    await page.getByTestId('new-for-projects-jump').click()
    await expectRowInView(page, `${size.width} from the strip`)

    // The Marketplace from the sidebar opens on No project: the link did not choose one for next time.
    if (size.width < 1024) {
      await page.getByTestId('open-menu').click()
      await page.getByTestId('nav-drawer').getByTestId('nav-marketplace').click()
    } else await page.getByTestId('nav-marketplace').click()
    await page.waitForURL('**/app/marketplace')
    await expect(page.getByTestId('checking-bar')).toHaveAttribute('data-state', 'prompt')
    await expect(page.getByTestId('category-structure')).not.toContainText('Merrowgate Wharf')
    await expect(page.getByTestId('category-folders').getByTestId('new-for-projects-jump')).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('the sidebar says how projects are ordered, and the architect specification has no guide price', async ({ page, browser }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  const menu = page.getByTestId('nav-projects-menu')
  await expect(menu).toHaveText('A to Z')
  await menu.click()
  await page.getByTestId('nav-order-client').click()
  await expect(menu).toHaveText('By client')
  await menu.click()
  await page.getByTestId('nav-order-name').click()
  await expect(menu).toHaveText('A to Z')

  for (const mode of ['approved', 'draft']) {
    await page.goto(`/app/projects/${M}/specification?mode=${mode}`)
    await expect(page.getByTestId('spec-paper')).toBeVisible()
    await expect(page.getByTestId('spec-paper')).not.toContainText('Guide price')
    await expect(page.getByTestId('spec-paper')).not.toContainText('Market signal')
    await expect(page.getByTestId('spec-paper')).not.toContainText('£')
  }
  // The client, in a browser of her own, keeps the guide price.
  const other = await browser.newContext()
  const isla = await other.newPage()
  await signIn(isla, 'isla')
  await isla.goto(`/app/projects/${M}/specification?mode=approved`)
  await expect(isla.getByTestId('spec-paper')).toContainText('Guide price')
  await other.close()
  expect(errors).toEqual([])
})
