// Audit of 16 October 2026, owner package: the journeys the audit found missing. A surveyor's early captures move into
// the owner's appointment; what is asked of a testing company is visible to both sides; an owner browses the
// marketplace and adds a new project from it.
import { expect, test, type Page } from '@playwright/test'

const TIVERNE = 'bld_zad898'
const AMBREY = 'bld_ab3m8r'
const EMAIL = {
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

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    const main = document.querySelector('main')
    return Math.max(doc.scrollWidth - doc.clientWidth, main ? main.scrollWidth - main.clientWidth : 0)
  })
}

test('a surveyor moves what she captured early into the building its owner then appointed her to', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'dana')

  // Dana adds Corbel Yard herself and captures an item, before any appointment.
  await page.goto('/app/buildings?new=1')
  await page.getByTestId('nb-name').fill('Corbel Yard')
  await page.getByTestId('nb-address').fill('9 Lantry Street, London E1')
  await page.getByTestId('nb-region').selectOption('Inner London East')
  await page.getByTestId('new-building-save').click()
  await page.waitForURL(/\/app\/buildings\/bld_[a-z0-9]+$/)
  const mine = page.url().split('/').pop()!
  await page.goto(`/app/buildings/${mine}/capture`)
  await page.getByTestId('capture-text').fill('12 no. UB 305x165x40, 6.0 m long, bolted connections, level 2 north bay')
  await page.getByTestId('capture-condition').getByText(/^A/).first().click()
  await page.getByTestId('capture-save').click()
  await expect(page.getByText(/CY-01 captured/).first()).toBeVisible()

  // Tom adds the same building in the normal way and appoints Tarnbrook.
  await switchTo(page, 'tom')
  await page.goto('/app/buildings?new=1')
  await page.getByTestId('nb-name').fill('Corbel Yard')
  await page.getByTestId('nb-address').fill('9 Lantry Street, London E1')
  await page.getByTestId('nb-region').selectOption('Inner London East')
  await page.getByTestId('nb-surveyor').selectOption({ label: 'Tarnbrook Deconstruction' })
  await page.getByTestId('new-building-save').click()
  await page.waitForURL(/\/app\/buildings\/bld_[a-z0-9]+$/)
  const toms = page.url().split('/').pop()!
  expect(toms).not.toBe(mine)

  // Dana is asked on her home, and moves the items in.
  await switchTo(page, 'dana')
  const callout = page.getByTestId(`merge-callout-${mine}`)
  await expect(callout).toContainText('You added Corbel Yard yourself before Ostlea Estates appointed you. Move its 1 captured item here?')
  await page.getByTestId(`merge-move-${mine}`).click()
  await page.waitForURL(`**/app/buildings/${toms}`)
  await expect(page.getByText('1 item moved to Corbel Yard').first()).toBeVisible()
  await page.goto('/app/capture')
  await expect(page.getByTestId('capture-building').locator('option', { hasText: 'Corbel Yard' })).toHaveCount(1)

  // Tom sees the item in his inventory, and was told.
  await switchTo(page, 'tom')
  await page.goto(`/app/buildings/${toms}/inventory`)
  await expect(page.getByText('CY-01').first()).toBeVisible()
  await page.goto('/app/notifications')
  await expect(page.getByText('Tarnbrook Deconstruction added 1 item to Corbel Yard').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('both sides see what was asked of the testing company, and no owner is promised on an unlinked building', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'dana')

  // On Ambrey House nobody owns it yet: the dialog says nobody is told.
  await page.goto(`/app/buildings/${AMBREY}/testing`)
  await page.getByTestId('request-testing').first().click()
  await expect(page.getByTestId('testing-footnote')).toHaveText('Nothing is sent in the sandbox. The request is recorded here.')
  await page.keyboard.press('Escape')

  // On Tiverne House Dana sends a request with a message and a date.
  await page.goto(`/app/buildings/${TIVERNE}/testing`)
  await page.getByTestId('request-testing').first().click()
  await expect(page.getByTestId('testing-footnote')).toContainText('Ostlea Estates is told')
  await page.getByTestId('testing-item-TH-02').click()
  await page.getByTestId('testing-service-steel_hardness').click()
  await page.getByTestId('testing-company').getByText('Calverd Inspection').click()
  await page.getByLabel('Preferred from').fill('2026-10-20')
  await page.getByLabel('Message').fill('Levels 3 and 4 only, please.')
  await page.getByTestId('testing-send').click()
  await expect(page.getByText('Request to Calverd Inspection recorded').first()).toBeVisible()
  const card = page.locator('[data-testid^="testing-tst_"]').first()
  await expect(card.getByTestId('testing-message')).toContainText('Levels 3 and 4 only, please.')
  await expect(card.getByTestId('testing-preferred')).toContainText('Preferred from 20 October 2026')
  await card.getByTestId('testing-view').click()
  await expect(page.getByTestId('testing-sheet')).toContainText('Request to Calverd Inspection')
  await expect(page.getByTestId('testing-sheet-message')).toContainText('Levels 3 and 4 only, please.')
  const download = page.waitForEvent('download')
  await page.getByTestId('testing-sheet-download').click()
  expect((await download).suggestedFilename()).toMatch(/^testing-request-tiverne-house-.*\.txt$/)

  // Tom sees the same request and message.
  await switchTo(page, 'tom')
  await page.goto(`/app/buildings/${TIVERNE}/testing`)
  const toms = page.locator('[data-testid^="testing-tst_"]').filter({ hasText: 'Calverd Inspection' }).first()
  await expect(toms.getByTestId('testing-message')).toContainText('Levels 3 and 4 only, please.')
  await toms.getByTestId('testing-view').click()
  await expect(page.getByTestId('testing-sheet')).toContainText('Dana Kowalski, Tarnbrook Deconstruction')
  expect(errors).toEqual([])
})

test('an owner browses the marketplace and adds a new project from it, at phone width too', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'tom')
  await page.getByTestId('nav-marketplace').first().click()
  await page.waitForURL('**/app/marketplace**')
  await expect(page.getByTestId('owner-build-strip')).toContainText('Building something too?')
  await expect(page.getByText('You do not have access')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await horizontalOverflow(page)).toBe(0)
  await page.getByTestId('owner-build-add').click()
  await page.waitForURL('**/app/buildings?new=project')
  await expect(page.getByTestId('new-building-save')).toHaveText(/Add new project/)
  await expect(page.getByRole('radio', { name: /New project/ })).toHaveAttribute('aria-checked', 'true')
  expect(errors).toEqual([])
})
