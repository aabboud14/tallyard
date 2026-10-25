// Round 2 look fixes (review of the round 2 build), against the production build: keyboard focus draws a ring on
// the sidebar and shell controls, the phone drawer's targets are 44 px, the Marketplace row reaches every new
// material the home counts, the bar keeps the current page whole at 1024 px, overlays have no blur, and the
// client home shares the Recent activity panel.
import { expect, test, type Locator, type Page } from '@playwright/test'

const M = 'prj_hp23zk'
const EMAIL = {
  priya: 'priya.nair@studiooriel.example',
  isla: 'isla.brennan@lanternquay.example',
} as const

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`)
  })
  return errors
}

async function signInWithCard(page: Page, who: keyof typeof EMAIL) {
  await page.goto('/signin')
  await page.getByTestId(`sample-${EMAIL[who]}`).click()
  await page.waitForURL('**/app/home')
}

/** Presses Tab until the locator has keyboard focus, then reads its outline. */
async function tabTo(page: Page, target: Locator, max = 80): Promise<{ style: string; width: string }> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((el) => el === document.activeElement)) {
      return target.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { style: cs.outlineStyle, width: cs.outlineWidth }
      })
    }
  }
  throw new Error(`Tab never reached ${target}`)
}

test('keyboard focus draws a visible ring on the sidebar, the project menu, Recent activity and the account menu', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'priya')
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  for (const id of ['nav-home', 'nav-marketplace', 'nav-projects-menu', 'account-menu', 'activity-toggle']) {
    await page.goto('/app/home')
    await expect(page.getByTestId('activity-toggle')).toBeVisible()
    const ring = await tabTo(page, page.getByTestId(id))
    expect(ring.style, id).toBe('solid')
    expect(parseFloat(ring.width), id).toBeGreaterThanOrEqual(2)
  }
  expect(errors).toEqual([])
})

test('the phone drawer has 44 px targets: rows, folder chevrons, section titles, the project menu and the chip clear', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'priya')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('open-menu').click()
  const drawer = page.getByTestId('nav-drawer')
  const sizes = async (loc: Locator) => {
    const n = await loc.count()
    const out: { w: number; h: number }[] = []
    for (let i = 0; i < n; i++) {
      const b = await loc.nth(i).boundingBox()
      if (b) out.push({ w: b.width, h: b.height })
    }
    return out
  }
  for (const b of await sizes(drawer.locator('nav a[data-testid^="nav-"]'))) expect(b.h).toBeGreaterThanOrEqual(44)
  for (const b of await sizes(drawer.locator('nav button[aria-label^="Expand"], nav button[aria-label^="Collapse"]'))) {
    expect(b.w).toBeGreaterThanOrEqual(44)
    expect(b.h).toBeGreaterThanOrEqual(44)
  }
  const menu = (await drawer.getByTestId('nav-projects-menu').boundingBox())!
  expect([menu.width >= 44, menu.height >= 44]).toEqual([true, true])
  const title = (await drawer.getByRole('link', { name: /^Projects/ }).boundingBox())!
  expect(title.height).toBeGreaterThanOrEqual(44)
  await drawer.getByTestId('nav-projects-menu').click()
  await page.getByRole('menuitemradio', { name: /Lantern Quay Developments/ }).click()
  const clear = (await drawer.getByTestId('nav-client-filter-clear').boundingBox())!
  expect([clear.width >= 44, clear.height >= 44]).toEqual([true, true])
  await drawer.getByTestId('nav-client-filter-clear').click()
  expect(errors).toEqual([])
})

test('the Marketplace row reaches every new material the home counts for a project', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'priya')
  const link = page.getByTestId(`home-new-fits-${M}`)
  const n = Number(((await link.textContent()) ?? '').match(/(\d+) new/)![1])
  await link.click()
  await page.waitForURL(`**/app/marketplace?project=${M}#new-for-projects`)
  const row = page.getByTestId('new-for-projects')
  await expect(row).toBeVisible()
  const cards = row.locator('[data-testid^="new-card-"]')
  if (n > 4) {
    await expect(cards).toHaveCount(4)
    await expect(row.getByTestId('new-for-projects-more')).toHaveText(`Show all ${n}`)
    await row.getByTestId('new-for-projects-more').click()
    await expect(cards).toHaveCount(n)
    await expect(row.getByTestId('new-for-projects-more')).toHaveText('Show fewer')
  } else {
    await expect(cards).toHaveCount(n)
  }
  expect(errors).toEqual([])
})

test('at 1024 px the bar keeps the current page whole and puts search behind an icon; overlays have no blur', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'priya')
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto(`/app/projects/${M}/shortlist`)
  const current = page.locator('[data-testid="top-bar"] [aria-current="page"]')
  await expect(current).toBeVisible()
  const fits = await current.evaluate((el) => el.scrollWidth <= el.clientWidth)
  expect(fits).toBe(true)
  await expect(page.getByTestId('search-trigger')).toBeHidden()
  await page.getByRole('button', { name: 'Search' }).click()
  const blur = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).some((el) => getComputedStyle(el).backdropFilter !== 'none'))
  expect(blur).toBe(false)
  await page.keyboard.press('Escape')
  // The shortlist names the sent state the way the home does.
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('main')).toContainText('Waiting for approval')
  await expect(page.locator('main')).not.toContainText('Sent to client')
  expect(errors).toEqual([])
})

test('the client home shares the Recent activity panel, collapsed, and its phone tiles keep their words', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'isla')
  await expect(page.getByTestId('activity-panel')).toBeVisible()
  await expect(page.getByTestId('activity-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('activity-panel')).toContainText(/\d+ updates?\. Latest, /)
  await expect(page.getByTestId('client-metric-reuse')).toContainText('aim 25%')
  await expect(page.getByTestId('client-metric-reuse')).toContainText('Recycled content off target')
  expect(errors).toEqual([])
})
