// The acceptance journeys (BRIEF section 13), through the UI of the production build: Priya saves, sends and
// specifies; Isla approves and requests; Tom accepts a blind request; Dana captures on a phone; Marcus exports the
// compliance workbook; a new practice signs up and starts saving.
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'

const M = 'prj_hp23zk'
const EMAIL = {
  priya: 'priya.nair@studiooriel.example',
  isla: 'isla.brennan@lanternquay.example',
  tom: 'tom.ashby@ostlea.example',
  dana: 'dana.kowalski@tarnbrook.example',
  marcus: 'marcus.lindqvist@halewick.example',
} as const
type Who = keyof typeof EMAIL

/** Fails the test on any page error or console error. */
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

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    const main = document.querySelector('main')
    return Math.max(doc.scrollWidth - doc.clientWidth, main ? main.scrollWidth - main.clientWidth : 0)
  })
}

test('an item goes from the architect to the client, the owner and the consultant', async ({ page }, info) => {
  const errors = watchErrors(page)

  // Priya: one click sign-in from the landing page.
  await page.goto('/')
  await page.getByRole('link', { name: /sign in/i }).first().click()
  await page.waitForURL('**/signin**')
  await page.getByTestId(`sample-${EMAIL.priya}`).click()
  await page.waitForURL('**/app/home')

  // Discover, open the material, save it to Merrowgate Wharf and see its fit.
  await page.getByTestId('nav-discover').click()
  await page.getByTestId('card-L-9F4CQQ').getByRole('link').first().click()
  await page.waitForURL('**/app/discover/L-9F4CQQ**')
  await page.getByTestId('material-save').click()
  await page.getByTestId(`save-target-${M}`).click()
  await expect(page.getByText('Saved to Merrowgate Wharf').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('fit-text')).toContainText('Merrowgate Wharf')

  // The DXF.
  const [dxf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-dxf').click()])
  const dxfPath = info.outputPath(dxf.suggestedFilename())
  await dxf.saveAs(dxfPath)
  const dxfText = fs.readFileSync(dxfPath, 'utf8')
  expect(dxfText).toContain('SECTION')
  expect(dxfText).toContain('EOF')
  expect(dxfText).not.toMatch(/prototype/i)

  // Send it to the client with a message.
  await page.goto(`/app/projects/${M}/shortlist`)
  await page.getByTestId('select-L-9F4CQQ').click({ force: true })
  await page.getByTestId('send-to-client').click()
  await page.getByTestId('send-message').fill('Secondary beams from an owner in Central London. In time for the start on site.')
  await page.getByTestId('confirm-send').click()
  await expect(page.getByText('to Lantern Quay Developments').first()).toBeVisible()

  // Export the specification.
  await page.goto(`/app/projects/${M}/specification`)
  const [spec] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-spec').click()])
  expect(spec.suggestedFilename()).toMatch(/\.xlsx$/)

  // Isla sees the notification, approves and requests a reservation.
  await switchTo(page, 'isla')
  await page.getByTestId('notifications-button').click()
  await expect(page.getByTestId('notifications-popover').getByText('Merrowgate Wharf').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto(`/app/projects/${M}/approvals`)
  await page.getByTestId('approve-L-9F4CQQ').click()
  await page.getByTestId('decision-note').fill('Approved. Please confirm testing before delivery.')
  await page.getByTestId('decision-confirm').click()
  await expect(page.getByTestId('decided-L-9F4CQQ')).toBeVisible()
  await page.goto(`/app/projects/${M}/reservations`)
  await page.getByTestId('request-L-9F4CQQ').click()
  await page.getByTestId('request-message').fill('All 48 beams, delivered in two loads.')
  await page.getByTestId('request-send').click()
  await expect(page.getByTestId('reservation-L-9F4CQQ').getByTestId('reservation-status')).toBeVisible()

  // Tom sees a blind request and accepts it; then he sees the buyer.
  await switchTo(page, 'tom')
  await page.goto('/app/requests')
  const card = page.locator('[data-testid^="request-TH-"]').filter({ hasText: 'UB 457' }).first()
  await expect(card.getByTestId('blind-buyer')).toBeVisible()
  await expect(card).not.toContainText('Lantern Quay')
  await expect(card).not.toContainText('Isla')
  const tag = (await card.getAttribute('data-testid'))!.replace('request-', '')
  await page.getByTestId(`accept-${tag}`).click()
  await page.getByTestId('decide-confirm').click()
  await page.getByRole('radio', { name: /Decided/ }).click()
  await expect(page.getByTestId('known-buyer').filter({ hasText: 'Lantern Quay Developments' }).first()).toBeVisible()

  // Isla then sees the seller.
  await switchTo(page, 'isla')
  await page.goto(`/app/projects/${M}/reservations`)
  await expect(page.getByTestId('reservation-L-9F4CQQ').getByTestId('seller-contact')).toContainText('Ostlea Estates')

  // Dana captures an item on a phone, with a photo.
  const photo = await page.screenshot({ clip: { x: 0, y: 0, width: 320, height: 240 } })
  await switchTo(page, 'dana')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/buildings/bld_zad898/capture')
  await page.getByTestId('capture-text').fill('12 no. UB 305x165x40, 6.0 m long, bolted connections, level 2 north bay')
  await page.getByTestId('capture-condition').getByText(/^A/).first().click()
  await page.getByTestId('capture-photo').setInputFiles({ name: 'beam.png', mimeType: 'image/png', buffer: photo })
  expect(await horizontalOverflow(page)).toBe(0)
  await page.getByTestId('capture-save').click()
  await expect(page.getByText(/TH-12 captured/).first()).toBeVisible()
  // Saving opens the new item in the inventory.
  await expect(page.getByTestId('item-sheet')).toContainText('TH-12')
  await page.getByTestId('item-sheet-close').click()
  await expect(page.getByTestId('item-sheet')).toBeHidden()

  // Tom sees it in Inventory and in his notifications.
  await switchTo(page, 'tom')
  await page.goto('/app/buildings/bld_zad898/inventory')
  await expect(page.getByTestId('row-TH-12')).toBeVisible()
  await page.goto('/app/notifications')
  await expect(page.getByText('Dana Kowalski captured TH-12 at Tiverne House')).toBeVisible()

  // Marcus opens Carbon and Compliance and exports the workbook.
  await switchTo(page, 'marcus')
  await page.goto(`/app/projects/${M}/carbon`)
  await expect(page.getByTestId('project-carbon')).toBeVisible()
  await page.goto(`/app/projects/${M}/compliance`)
  const [workbook] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-compliance').click()])
  expect(workbook.suggestedFilename()).toMatch(/compliance.*\.xlsx$/)

  expect(errors).toEqual([])
})

test('a new practice signs up, creates a project and saves a material', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/signup')
  await page.getByTestId('signup-name').fill('Jo Park')
  await page.getByTestId('signup-email').fill('jo.park@parkstudio.example')
  await page.locator('input[type=password]').fill('sandbox-pass')
  await page.getByTestId('signup-continue').click()
  await page.getByTestId('signup-org').fill('Park Studio')
  await page.getByTestId('signup-submit').click()
  await page.waitForURL('**/app/home**')
  await page.getByTestId('project-name').fill('Corbel Yard')
  await page.getByTestId('project-client-name').fill('Quillon Homes')
  await page.getByTestId('project-start').fill('2027-09-06')
  await page.getByTestId('create-project').click()
  await page.waitForURL('**/app/projects/prj_*')
  await page.goto('/app/discover')
  await page.getByTestId('card-L-A945G6').hover()
  await page.getByTestId('save-L-A945G6').click()
  await page.locator('[data-testid^="save-target-prj_"]').first().click()
  await expect(page.getByText('Saved to Corbel Yard').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('Discover and Capture fit a phone', async ({ page }) => {
  const errors = watchErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await signInWithCard(page, 'priya')
  for (const path of ['/app/discover', '/app/discover?tab=shared', '/app/discover/L-9F4CQQ']) {
    await page.goto(path)
    await expect(page.locator('main')).not.toBeEmpty()
    expect(await horizontalOverflow(page), path).toBe(0)
  }
  await page.getByTestId('account-menu').click()
  await page.getByTestId('sign-out').click()
  await page.waitForURL('**/signin**')
  await signInWithCard(page, 'dana')
  for (const path of ['/app/buildings/bld_zad898/capture', '/app/buildings/bld_m5tq8r/capture']) {
    await page.goto(path)
    await expect(page.getByTestId('capture-text')).toBeVisible()
    expect(await horizontalOverflow(page), path).toBe(0)
  }
  expect(errors).toEqual([])
})
