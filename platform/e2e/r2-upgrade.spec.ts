// Returning visitors and the build from before round 2, against the production build. A browser that still holds
// the version 1 sandbox gets the round 2 sample data, a notice on the home that links to Help, Updated on
// 16 October, and a line at sign-in for an account made before the update. A tab of the old build left open
// beside the new one keeps writing its own key, and nothing done in the new tab is lost. A tab left open while a
// newer build is deployed offers to reload.
import { expect, test, type Page } from '@playwright/test'

const V1_STATE = 'tallyard-platform-v1-state'
const V2_STATE = 'tallyard-platform-v2-state'
const SESSION = 'tallyard-platform-v1-session'
const PRIYA = 'priya.nair@studiooriel.example'

/** What the 14 October build stored: its own version 1 record. Only its version matters to the new build. */
const V1_RECORD = JSON.stringify({ state: { version: 1, seededOn: '2026-10-14', seq: 40, world: { projects: {}, buildings: {} }, users: {}, notifications: [], activity: [], ui: {} }, version: 1 })

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`)
  })
  return errors
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    const main = document.querySelector('main')
    return Math.max(doc.scrollWidth - doc.clientWidth, main ? main.scrollWidth - main.clientWidth : 0)
  })
}

const read = (page: Page, key: string) => page.evaluate((k) => window.localStorage.getItem(k), key)

test('a returning visitor from before round 2 is told the sandbox was updated, and where to find the changes', async ({ page }) => {
  const errors = watchErrors(page)
  // The browser as the 14 October build left it: its sandbox, and a remembered sign-in to an account made there.
  await page.goto('/signin')
  await page.evaluate(
    ([k, v, s]) => {
      window.localStorage.clear()
      window.localStorage.setItem(k, v)
      window.localStorage.setItem(s, 'usr_m4k2p9')
    },
    [V1_STATE, V1_RECORD, SESSION],
  )

  // The account made in the old sandbox has gone, so the visitor lands on sign-in.
  await page.goto('/app/home')
  await page.waitForURL('**/signin**')
  expect(await read(page, V1_STATE)).toBeNull()
  expect(await read(page, 'tallyard-platform-v2-upgraded')).not.toBeNull()
  // Before any attempt, the page says why, and the dead sign-in is forgotten.
  await expect(page.getByTestId('signin-notice')).toContainText('The sandbox was updated on 16 October. Accounts made before then need to be created again.')
  await expect.poll(() => read(page, SESSION)).toBeNull()

  await page.getByTestId('signin-email').fill('jo@parkstudio.example')
  await page.locator('input[autocomplete="current-password"]').fill('drawings1')
  await page.getByTestId('signin-submit').click()
  await expect(page.getByRole('alert')).toContainText('That email and password do not match.')
  await expect(page.getByTestId('signin-error-hint')).toContainText('The sandbox was updated on 16 October. Accounts made before then need to be created again.')
  await expect(page.getByTestId('signin-upgrade-signup')).toHaveAttribute('href', '/signup')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await horizontalOverflow(page)).toBe(0)
  const signUp = (await page.getByTestId('signin-upgrade-signup').boundingBox())!
  expect(signUp.height).toBeGreaterThanOrEqual(44)
  await page.setViewportSize({ width: 1440, height: 900 })

  // A sample account signs in to the round 2 sandbox, and the home says what happened.
  await page.getByTestId(`sample-${PRIYA}`).click()
  await page.waitForURL('**/app/home')
  const notice = page.getByTestId('upgrade-notice')
  await expect(notice).toContainText('The sandbox was updated on 16 October with the changes from the 14 October review. Anything you changed before then is back to the sample data.')
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(notice).toBeVisible()
    expect(await horizontalOverflow(page), `home at ${width}`).toBe(0)
    if (width === 390) {
      for (const id of ['upgrade-notice-link', 'upgrade-notice-close']) expect((await page.getByTestId(id).boundingBox())!.height, id).toBeGreaterThanOrEqual(44)
    }
  }

  // See what changed lists the round 2 changes, each linked to where it is.
  await page.getByTestId('upgrade-notice-link').click()
  await page.waitForURL('**/app/help/updated')
  await expect(page.getByTestId('what-changed').getByRole('heading', { level: 2 })).toHaveText('Updated on 16 October')
  await expect(page.getByTestId('changes-yours').locator('li')).toHaveCount(7)
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await horizontalOverflow(page), `help at ${width}`).toBe(0)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByTestId('change-link-programme').click()
  await page.waitForURL(/\/app\/projects\/prj_[A-Za-z0-9]+$/)
  await expect(page.getByTestId('programme-chart')).toBeVisible()
  // The checking change has its own link: the Marketplace already checking against the first project.
  await page.goBack()
  await page.waitForURL('**/app/help/updated')
  await expect(page.getByTestId('change-link-checking')).not.toHaveText(await page.getByTestId('change-link-marketplace').innerText())
  await page.getByTestId('change-link-checking').click()
  await page.waitForURL(/\/app\/marketplace\?project=prj_[A-Za-z0-9]+$/)
  await expect(page.getByTestId('checking-bar')).toHaveAttribute('data-state', 'checking')

  // Closing the notice is remembered.
  await page.goto('/app/home')
  await page.getByTestId('upgrade-notice-close').click()
  await expect(notice).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('home-stats')).toBeVisible()
  await expect(notice).toHaveCount(0)
  expect(errors).toEqual([])
})

test('an account made again after the update is not told its earlier work is gone', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/signin')
  await page.evaluate(
    ([k, v]) => {
      window.localStorage.clear()
      window.localStorage.setItem(k, v)
    },
    [V1_STATE, V1_RECORD],
  )
  await page.reload()
  await page.getByTestId('signin-email').fill('jo@parkstudio.example')
  await page.locator('input[autocomplete="current-password"]').fill('drawings1')
  await page.getByTestId('signin-submit').click()
  await page.getByTestId('signin-upgrade-signup').click()
  await page.waitForURL('**/signup')
  await expect(page.getByTestId('signup-email')).toHaveValue('jo@parkstudio.example')
  await page.getByTestId('signup-name').fill('Jo Park')
  await page.locator('input[autocomplete="new-password"]').fill('drawings1')
  await page.getByTestId('signup-continue').click()
  await page.getByTestId('signup-org').fill('Park Studio')
  await page.getByTestId('signup-submit').click()
  await page.waitForURL('**/app/home**')
  await expect(page.getByTestId('architect-home')).toBeVisible()
  await expect(page.getByTestId('upgrade-notice')).toHaveCount(0)
  // With no project yet, the checking change points at the Marketplace to choose one.
  await page.goto('/app/help/updated')
  await expect(page.getByTestId('change-link-checking')).toHaveText('Choose a project to check against')
  await expect(page.getByTestId('change-link-checking')).toHaveAttribute('href', '/app/marketplace')
  // A sample account in the same browser still sees the notice.
  await page.goto('/signin')
  await page.evaluate(() => window.localStorage.removeItem('tallyard-platform-v1-session'))
  await page.evaluate(() => window.sessionStorage.clear())
  await page.goto('/signin')
  await page.getByTestId(`sample-${PRIYA}`).click()
  await page.waitForURL('**/app/home')
  await expect(page.getByTestId('upgrade-notice')).toBeVisible()
  expect(errors).toEqual([])
})

test('a visitor who already opened the round 2 build before this one keeps their work and is told what changed', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/signin')
  await page.evaluate(() => window.localStorage.clear())
  await page.getByTestId(`sample-${PRIYA}`).click()
  await page.waitForURL('**/app/home')
  await page.goto('/app/settings/profile')
  await page.getByTestId('profile-name').fill('Priya Renamed')
  await page.getByTestId('profile-save').click()
  await expect.poll(async () => (await read(page, V2_STATE)) ?? '').toContain('Priya Renamed')

  // The browser as the round 2 build deployed before this fix left it: a version 2 sandbox on the old key.
  await page.evaluate(
    ([oldKey, newKey]) => {
      const v = window.localStorage.getItem(newKey)!
      for (const k of Object.keys(window.localStorage)) if (k.startsWith('tallyard-platform-') && !k.endsWith('-session')) window.localStorage.removeItem(k)
      window.localStorage.setItem(oldKey, v)
    },
    [V1_STATE, V2_STATE],
  )
  await page.goto('/app/home')
  const notice = page.getByTestId('upgrade-notice')
  await expect(notice).toContainText('The sandbox was updated on 16 October with the changes from the 14 October review.')
  await expect(notice).not.toContainText('back to the sample data')
  expect(await read(page, V1_STATE)).toBeNull()
  expect(await read(page, V2_STATE)).toContain('Priya Renamed')
  expect(await read(page, 'tallyard-platform-v2-whatsnew')).not.toBeNull()

  // The close button sits in the notice's top corner at every width, and the text keeps its width.
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await horizontalOverflow(page), `home at ${width}`).toBe(0)
    const box = (await notice.boundingBox())!
    const close = (await page.getByTestId('upgrade-notice-close').boundingBox())!
    expect(box.x + box.width - (close.x + close.width), `close at ${width}`).toBeLessThanOrEqual(8)
    expect(close.y - box.y, `close at ${width}`).toBeLessThanOrEqual(8)
    if (width === 390) expect(close.height).toBeGreaterThanOrEqual(44)
  }
  await page.getByTestId('upgrade-notice-link').click()
  await page.waitForURL('**/app/help/updated')
  await page.goto('/app/settings/profile')
  await expect(page.getByTestId('profile-name')).toHaveValue('Priya Renamed')
  expect(errors).toEqual([])
})

test('a tab of the old build open beside the new one changes nothing in the new one', async ({ page, context }) => {
  const errors = watchErrors(page)
  await page.goto('/signin')
  await page.getByTestId(`sample-${PRIYA}`).click()
  await page.waitForURL('**/app/home')
  await expect(page.getByTestId('upgrade-notice')).toHaveCount(0)
  await page.goto('/app/settings/profile')
  await page.getByTestId('profile-name').fill('Priya Renamed')
  await page.getByTestId('profile-save').click()
  await expect.poll(async () => (await read(page, V2_STATE)) ?? '').toContain('Priya Renamed')

  // The old build, in another tab on the same site, keeps writing its version 1 sandbox to its own key.
  const old = await context.newPage()
  await old.goto('/favicon.svg')
  for (let i = 0; i < 10; i++) {
    await old.evaluate(([k, v]) => window.localStorage.setItem(k, v), [V1_STATE, V1_RECORD.replace('"seq":40', `"seq":${40 + i}`)])
    await old.waitForTimeout(100)
  }
  await page.waitForTimeout(500)
  await expect(page.getByTestId('profile-name')).toHaveValue('Priya Renamed')
  expect(await read(page, V2_STATE)).toContain('Priya Renamed')

  // A reload of the new tab keeps the work, clears the old key and shows no notice, because nothing was lost.
  await page.reload()
  await expect(page.getByTestId('profile-name')).toHaveValue('Priya Renamed')
  expect(await read(page, V1_STATE)).toBeNull()
  await page.goto('/app/home')
  await expect(page.getByTestId('home-stats')).toBeVisible()
  await expect(page.getByTestId('upgrade-notice')).toHaveCount(0)
  await old.close()
  expect(errors).toEqual([])
})

test('a tab left open while a newer build is deployed offers to reload', async ({ page, context }) => {
  const errors = watchErrors(page)
  // Coming back to a tab with the same build still served: nothing to offer.
  const same = await context.newPage()
  await same.goto('/signin')
  await expect(same.getByTestId('signin-page')).toBeVisible()
  await same.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await same.waitForTimeout(500)
  await expect(same.getByTestId('new-version')).toHaveCount(0)
  await same.close()

  // A new deployment: the served index page names another entry script.
  await page.goto('/signin')
  await expect(page.getByTestId('signin-page')).toBeVisible()
  await expect(page.getByTestId('new-version')).toHaveCount(0)
  const html = await (await page.request.get('/')).text()
  const newer = html.replace(/(\/assets\/index-)([A-Za-z0-9_-]+)(\.js)/, '$1Newer0$3')
  expect(newer).not.toBe(html)
  await page.route((url) => url.pathname === '/', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: newer }))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  const bar = page.getByTestId('new-version')
  await expect(bar).toContainText('A new version of Tallyard is available.')
  await expect(page.getByTestId('new-version-reload')).toBeVisible()
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(bar).toBeVisible()
    expect(await horizontalOverflow(page), `bar at ${width}`).toBe(0)
  }
  await page.getByRole('button', { name: 'Not now' }).click()
  await expect(bar).toHaveCount(0)
  expect(errors).toEqual([])
})
