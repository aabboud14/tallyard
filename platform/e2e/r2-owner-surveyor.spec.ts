// Round 2 journeys for donor buildings and surveyors (owner-surveyor design 14.4.11): the surveyor adds a building on
// a phone and the owner confirms it; share links opened and revoked; an owner's new project with an architect; a
// deconstruction contractor's dates applied by the owner; the granular structure.
import { expect, test, type Page } from '@playwright/test'

const TIVERNE = 'bld_zad898'
const SALLOW = 'prj_k2r8sw'
const EMAIL = {
  priya: 'priya.nair@studiooriel.example',
  tom: 'tom.ashby@ostlea.example',
  dana: 'dana.kowalski@tarnbrook.example',
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

async function switchTo(page: Page, who: Who) {
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByTestId('account-menu').click()
  await page.getByTestId('switch-account').hover()
  await page.getByTestId(`switch-${EMAIL[who]}`).click()
  await page.waitForURL('**/app/home')
}

async function signOut(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app/home')
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

test('a surveyor adds a building on a phone and its owner confirms it', async ({ page }) => {
  const errors = watchErrors(page)
  const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  await signInWithCard(page, 'dana')
  await page.setViewportSize({ width: 390, height: 844 })

  // Capture from the sidebar, then add the building there.
  await page.getByTestId('open-menu').click()
  await page.getByTestId('nav-drawer').getByTestId('nav-capture').click()
  await page.waitForURL('**/app/capture**')
  await page.getByTestId('capture-add-building-phone').click()
  await page.getByTestId('nb-name').fill('Corbel Yard')
  await page.getByTestId('nb-address').fill('9 Corbel Lane, London SE1')
  await page.getByTestId('nb-region').selectOption('Central London')
  await page.getByTestId('nb-owner-email').fill('tom.ashby@ostlea.example')
  await page.getByTestId('new-building-save').click()
  await expect(page.getByTestId('capture-building')).toContainText('Corbel Yard')
  expect(await horizontalOverflow(page)).toBe(0)

  // Capture an item with a photo.
  await page.getByTestId('capture-text').fill('12 no. UB 305x165x40, 6.0 m long, bolted connections, level 2 north bay')
  await page.getByTestId('capture-condition').getByText(/^A/).first().click()
  await page.getByTestId('capture-photo').setInputFiles({ name: 'beam.png', mimeType: 'image/png', buffer: photo })
  await page.getByTestId('capture-save').click()
  await expect(page.getByText(/CY-01 captured/).first()).toBeVisible()
  await expect(page.getByText('Private to your firm until the owner confirms the building.').first()).toBeVisible()

  // The building waits for its owner.
  await page.goto('/app/buildings')
  await expect(page.getByTestId('unlinked-buildings')).toContainText('Corbel Yard')
  await expect(page.getByTestId('unlinked-buildings')).toContainText('Waiting for the owner')
  expect(await horizontalOverflow(page)).toBe(0)

  // Tom sees the request and confirms it.
  await switchTo(page, 'tom')
  await expect(page.getByTestId('unread-count')).toBeVisible()
  await page.getByTestId('notifications-button').click()
  await expect(page.getByTestId('notifications-popover')).toContainText('Tarnbrook Deconstruction surveyed a building for you')
  await page.keyboard.press('Escape')
  await page.goto('/app/requests?tab=buildings')
  const card = page.locator('[data-testid^="claim-bld_"]').filter({ hasText: 'Corbel Yard' })
  await card.locator('[data-testid^="claim-confirm-"]').click()
  await page.waitForURL('**/app/buildings/bld_*')
  await expect(page.getByTestId('sidebar')).toContainText('Corbel Yard')
  await page.getByTestId('tab-inventory').click()
  await expect(page.getByTestId('row-CY-01')).toBeVisible()
  expect(errors).toEqual([])
})

test('a share link opens to an architect and stops working once revoked', async ({ page, context }) => {
  const errors = watchErrors(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await signInWithCard(page, 'tom')
  await page.goto(`/app/buildings/${TIVERNE}/sharing`)
  await page.getByTestId('create-link').click()
  await page.getByTestId('link-label').fill('Steel for the podium enquiry')
  await page.getByTestId('link-lot-TH-02').click()
  await page.getByTestId('link-lot-TH-03').click()
  await page.getByTestId('create-link-save').click()
  const row = page.locator('[data-testid^="link-lnk_"]').filter({ hasText: 'Steel for the podium enquiry' })
  await expect(row).toContainText('2 lots')
  await expect(row).toContainText('Not opened yet')
  const linkId = ((await row.getAttribute('data-testid')) ?? '').replace('link-', '')
  await page.getByTestId(`copy-${linkId}`).click()
  await expect(page.getByText('Link copied').first()).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain(`/app/links/${linkId}`)

  // Priya opens it, accepts the terms and saves TH-03 to Sallow Court.
  await switchTo(page, 'priya')
  await page.goto(`/app/links/${linkId}`)
  await page.getByTestId('link-accept').click()
  const cards = page.getByTestId('link-cards').locator('[data-testid^="card-L-"]')
  await expect(cards).toHaveCount(2)
  await expect(page.getByTestId('link-page')).not.toContainText('Steel for the podium enquiry')
  const th03 = ((await cards.nth(1).getAttribute('data-testid')) ?? '').replace('card-', '')
  await cards.nth(1).hover()
  await page.getByTestId(`save-${th03}`).click()
  await page.getByTestId(`save-target-${SALLOW}`).click()
  await expect(page.getByText('Saved to Sallow Court').first()).toBeVisible()

  // Tom sees one architecture practice opened it, and revokes it.
  await switchTo(page, 'tom')
  await page.goto(`/app/buildings/${TIVERNE}/sharing`)
  await expect(row).toContainText('Opened by 1 organisation (architecture practice)')
  await expect(page.getByTestId('share-links')).not.toContainText('Studio Oriel')
  await page.getByTestId(`revoke-${linkId}`).click()
  await page.getByTestId('revoke-confirm').click()
  await expect(row.getByTestId('link-status')).toHaveText('Revoked')

  await switchTo(page, 'priya')
  await page.goto(`/app/links/${linkId}`)
  await expect(page.getByText('This link is no longer active')).toBeVisible()
  expect(errors).toEqual([])
})

test('an owner adds a new project with an architect, who sees it in their projects', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'tom')
  await page.goto('/app/buildings')
  await page.getByTestId('add-new-project').click()
  await page.getByRole('radio', { name: /New project/ }).click()
  await page.getByTestId('nb-name').fill('Wexcombe House')
  await page.getByTestId('nb-region').selectOption('Central London')
  await page.getByTestId('nb-local-authority').selectOption('Camden')
  await page.getByTestId('nb-project-type').selectOption('office')
  await page.getByTestId('nb-start').fill('2027-09-20')
  await page.getByTestId('nb-architect').selectOption({ label: 'Studio Oriel' })
  await page.getByTestId('new-building-save').click()
  await page.waitForURL('**/app/projects/prj_*')
  await expect(page.getByTestId('sidebar')).toContainText('New projects')
  await expect(page.getByTestId('sidebar')).toContainText('Wexcombe House')
  await page.goto('/app/buildings')
  await expect(page.getByTestId('new-projects')).toContainText('Wexcombe House')
  await expect(page.getByTestId('new-projects')).toContainText('Studio Oriel')

  await switchTo(page, 'priya')
  await page.goto('/app/projects')
  await expect(page.getByText('Wexcombe House').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('a deconstruction contractor sets a date and the owner applies it', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/signup')
  await page.getByTestId('signup-name').fill('Lee Shaw')
  await page.getByTestId('signup-email').fill('lee.shaw@shawsurveys.example')
  await page.locator('input[type=password]').fill('sandbox-pass')
  await page.getByTestId('signup-continue').click()
  await page.getByTestId('signup-org').fill('Shaw Surveys')
  await page.getByRole('radio', { name: /Surveying or deconstruction firm/ }).click()
  await page.getByTestId('signup-submit').click()
  await page.waitForURL('**/app/home**')
  await signOut(page)

  await signInWithCard(page, 'tom')
  await page.goto(`/app/buildings/${TIVERNE}`)
  await page.getByTestId('contractor-select').selectOption({ label: 'Shaw Surveys' })
  await page.getByTestId('contractor-save').click()
  await expect(page.getByTestId('contractor-card')).toContainText('Shaw Surveys')
  await signOut(page)

  await page.getByTestId('signin-email').fill('lee.shaw@shawsurveys.example')
  await page.locator('input[type=password]').fill('sandbox-pass')
  await page.getByTestId('signin-submit').click()
  await page.waitForURL('**/app/home**')
  await page.goto(`/app/buildings/${TIVERNE}/availability`)
  // TH-07 still carries the month the previous contractor gave; Lee changes it.
  await page.getByTestId('avail-TH-07-month').selectOption('6')
  await page.getByTestId('save-dates').click()
  await expect(page.getByText('1 date saved').first()).toBeVisible()
  await signOut(page)

  await signInWithCard(page, 'tom')
  await page.goto(`/app/buildings/${TIVERNE}/inventory`)
  await expect(page.getByTestId('row-TH-07')).toContainText('June')
  await page.getByTestId('apply-contractor-dates').click()
  await expect(page.getByText(/dates? applied/).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('the owner records the structure and the overview summary follows', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'tom')
  await page.goto(`/app/buildings/${TIVERNE}`)
  await expect(page.getByTestId('structure-card')).not.toContainText('timber roof')
  await page.getByTestId('structure-edit').click()
  await page.getByTestId('structure-material-roof').selectOption('timber')
  await page.getByTestId('structure-save').click()
  await expect(page.getByTestId('structure-card')).toContainText('timber roof')
  expect(errors).toEqual([])
})

test("an owner's new project without an architect asks for one, then appoints one from the overview", async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'tom')
  await page.goto('/app/buildings')
  await page.getByTestId('add-new-project').click()
  await page.getByRole('radio', { name: /New project/ }).click()
  await page.getByTestId('nb-name').fill('Wexcombe House')
  await page.getByTestId('nb-region').selectOption('Central London')
  await page.getByTestId('nb-local-authority').selectOption('Camden')
  await page.getByTestId('nb-project-type').selectOption('office')
  await page.getByTestId('nb-start').fill('2027-09-20')
  await page.getByTestId('new-building-save').click()
  await page.waitForURL('**/app/projects/prj_*')
  const base = new URL(page.url()).pathname
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${base}/team`)
    await expect(page.getByTestId('team-appoint-architect')).toBeVisible()
    await expect(page.getByTestId('project-team')).not.toContainText('No one from has joined')
    expect(await horizontalOverflow(page)).toBe(0)
    await page.goto(base)
    await expect(page.getByTestId('appoint-architect-card')).toBeVisible()
    await expect(page.getByTestId('project-details')).toContainText('Not appointed yet')
    await expect(page.getByTestId('next-steps')).toContainText('Appoint an architect to start sourcing')
    expect(await horizontalOverflow(page)).toBe(0)
  }
  await page.getByTestId('appoint-architect-card-select').selectOption({ label: 'Studio Oriel' })
  await page.getByTestId('appoint-architect-card-save').click()
  await expect(page.getByText('Architect appointed').first()).toBeVisible()
  await expect(page.getByTestId('appoint-architect-card')).toHaveCount(0)
  await expect(page.getByTestId('project-details')).toContainText('Studio Oriel')
  expect(errors).toEqual([])
})

test('the owner inventory fits without horizontal scroll at 1024, 1280 and 1440, contractor dates included', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'tom')
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/app/buildings/${TIVERNE}/inventory`)
    await expect(page.getByTestId('inventory-table')).toBeVisible()
    expect(await horizontalOverflow(page)).toBe(0)
    const tableOverflow = await page.getByTestId('inventory-table').evaluate((t) => t.scrollWidth - (t.parentElement?.clientWidth ?? t.scrollWidth))
    expect(tableOverflow).toBeLessThanOrEqual(0)
    // The contractor's month stays on screen: its own column on wide screens, under Expected otherwise.
    await expect(page.getByTestId('row-TH-07')).toContainText('March 2027')
    if (width < 1400) await expect(page.getByTestId('row-TH-07-contractor')).toBeVisible()
    else await expect(page.getByTestId('inventory-table').getByRole('columnheader', { name: 'Contractor' })).toBeVisible()
  }
  expect(errors).toEqual([])
})
