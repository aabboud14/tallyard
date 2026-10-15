// Round 2 dashboards and the sidebar, against the production build: every home fits a phone, a laptop and a
// desktop with Recent activity collapsed; the sidebar's project menu orders and filters the folders; the architect
// follows a project's new materials into the Marketplace; a new practice sees its welcome; the surveyor's Capture
// leads to the standalone page.
import { expect, test, type Page } from '@playwright/test'

const M = 'prj_hp23zk'
const EMAIL = {
  priya: 'priya.nair@studiooriel.example',
  isla: 'isla.brennan@lanternquay.example',
  tom: 'tom.ashby@ostlea.example',
  dana: 'dana.kowalski@tarnbrook.example',
  marcus: 'marcus.lindqvist@halewick.example',
} as const
type Who = keyof typeof EMAIL

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`)
  })
  return errors
}

async function signInWithCard(page: Page, who: Who) {
  await page.goto('/signin')
  await page.getByTestId(`sample-${EMAIL[who]}`).click()
  await page.waitForURL('**/app/home')
}

async function signOutNow(page: Page) {
  await page.getByTestId('account-menu').click()
  await page.getByTestId('sign-out').click()
  await page.waitForURL('**/signin**')
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    const main = document.querySelector('main')
    return Math.max(doc.scrollWidth - doc.clientWidth, main ? main.scrollWidth - main.clientWidth : 0)
  })
}

test('every dashboard fits phone, laptop and desktop, with Recent activity collapsed', async ({ page }) => {
  const errors = watchErrors(page)
  for (const who of ['priya', 'tom', 'dana', 'marcus', 'isla'] as const) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signInWithCard(page, who)
    for (const width of [390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/app/home')
      await expect(page.locator('main')).not.toBeEmpty()
      // The client home's tiles keep their own ids; every home shares the one Recent activity panel.
      if (who === 'isla') await expect(page.getByTestId('client-metrics').locator('[data-testid^="client-metric-"]')).toHaveCount(4)
      else await expect(page.getByTestId('home-stats').locator('[data-testid^="metric-"]')).toHaveCount(4)
      const panel = page.getByTestId('activity-panel')
      await expect(panel).toBeVisible()
      await expect(page.getByTestId('activity-toggle')).toHaveAttribute('aria-expanded', 'false')
      expect(await horizontalOverflow(page), `${who} at ${width}`).toBe(0)
    }
    await signOutNow(page)
  }
  expect(errors).toEqual([])
})

test('the sidebar orders projects by client and filters to one, on a desktop and in the phone drawer', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'priya')
  await expect(page.getByTestId(`nav-project-${M}`)).toBeVisible()
  await page.getByTestId('nav-projects-menu').click()
  await page.getByTestId('nav-order-client').click()
  await expect(page.locator('[data-testid^="nav-group-"]')).toHaveCount(3)
  await expect(page.locator('[data-testid^="nav-group-"]').first()).toHaveText('Lantern Quay Developments')

  await page.getByTestId('nav-projects-menu').click()
  await page.getByRole('menuitemradio', { name: /Lantern Quay Developments/ }).click()
  await expect(page.getByTestId('nav-client-filter')).toContainText('2 more hidden')
  await expect(page.getByTestId(`nav-project-${M}`)).toBeVisible()
  await expect(page.getByTestId('nav-project-prj_k2r8sw')).toHaveCount(0)

  // The choice is kept for the person across a reload.
  await page.reload()
  await expect(page.getByTestId('nav-client-filter')).toBeVisible()
  await page.getByTestId('nav-client-filter-clear').click()
  await expect(page.getByTestId('nav-client-filter')).toHaveCount(0)
  await expect(page.getByTestId('nav-project-prj_k2r8sw')).toBeVisible()

  // On a phone the menu is in the drawer, with a 36 px button.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('open-menu').click()
  const drawer = page.getByTestId('nav-drawer')
  const trigger = drawer.getByTestId('nav-projects-menu')
  const box = (await trigger.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(36)
  expect(box.height).toBeGreaterThanOrEqual(36)
  await trigger.click()
  await page.getByTestId('nav-order-name').click()
  await expect(drawer.locator('[data-testid^="nav-group-"]')).toHaveCount(0)
  expect(await horizontalOverflow(page)).toBe(0)
  expect(errors).toEqual([])
})

test('the architect follows a project to the new materials that fit it, and opens Recent activity', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'priya')
  await expect(page.getByTestId('waiting-for-approval')).toBeVisible()
  await expect(page.getByTestId('new-for-projects')).toHaveCount(0)
  await page.getByTestId('activity-toggle').click()
  await expect(page.getByTestId('activity-feed')).toBeVisible()
  await page.getByTestId(`home-new-fits-${M}`).click()
  await page.waitForURL(`**/app/marketplace?project=${M}`)
  await expect(page.getByTestId('discover-grid')).toBeVisible()
  // The panel stays open when the person comes back.
  await page.goto('/app/home')
  await expect(page.getByTestId('activity-feed')).toBeVisible()
  expect(errors).toEqual([])
})

test('a new practice gets the welcome, and the surveyor captures from the home', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/signup')
  await page.getByTestId('signup-name').fill('Ada Quell')
  await page.getByTestId('signup-email').fill('ada.quell@quellstudio.example')
  await page.locator('input[type=password]').fill('sandbox-pass')
  await page.getByTestId('signup-continue').click()
  await page.getByTestId('signup-org').fill('Quell Studio')
  await page.getByTestId('signup-submit').click()
  await page.waitForURL('**/app/home**')
  // The first project dialog opens on arrival; closing it leaves the welcome.
  await expect(page.getByTestId('project-name')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('project-name')).toHaveCount(0)
  await expect(page.getByTestId('architect-welcome')).toBeVisible()
  await expect(page.getByTestId('architect-welcome')).toContainText('Send your shortlist for approval')
  await signOutNow(page)

  await signInWithCard(page, 'dana')
  await page.getByTestId('home-capture').click()
  await page.waitForURL('**/app/capture**')
  expect(errors).toEqual([])
})
