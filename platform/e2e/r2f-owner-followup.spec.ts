// Audit of 16 October 2026, owner package, after the adversarial review. An owner asked to confirm a building he
// already has confirms it into his own record, leaving one Corbel Yard; the controls the review measured below 44 px
// at phone width now meet it.
import { expect, test, type Page } from '@playwright/test'

const AMBREY = 'bld_ab3m8r'
const TIVERNE = 'bld_zad898'
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

async function addCorbel(page: Page, opts: { askTom?: boolean; surveyor?: string }) {
  await page.goto('/app/buildings?new=1')
  await page.getByTestId('nb-name').fill('Corbel Yard')
  await page.getByTestId('nb-address').fill('9 Lantry Street, London E1')
  await page.getByTestId('nb-region').selectOption('Inner London East')
  if (opts.askTom) await page.getByTestId('nb-owner-email').fill(EMAIL.tom)
  if (opts.surveyor) await page.getByTestId('nb-surveyor').selectOption({ label: opts.surveyor })
  await page.getByTestId('new-building-save').click()
  await page.waitForURL(/\/app\/buildings\/bld_[a-z0-9]+$/)
  return page.url().split('/').pop()!
}

test('an owner asked to confirm a building he already has confirms it into his own record', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'dana')
  // Dana adds Corbel Yard, captures an item and asks Tom to confirm it.
  const mine = await addCorbel(page, { askTom: true })
  await page.goto(`/app/buildings/${mine}/capture`)
  await page.getByTestId('capture-text').fill('12 no. UB 305x165x40, 6.0 m long, bolted connections, level 2 north bay')
  await page.getByTestId('capture-condition').getByText(/^A/).first().click()
  await page.getByTestId('capture-save').click()
  await expect(page.getByText(/CY-01 captured/).first()).toBeVisible()

  // Tom adds his own Corbel Yard with Tarnbrook as surveyor, then answers the request.
  await switchTo(page, 'tom')
  const toms = await addCorbel(page, { surveyor: 'Tarnbrook Deconstruction' })
  await page.goto('/app/requests?tab=buildings')
  await expect(page.getByTestId(`claim-duplicate-${mine}`)).toContainText('You already have Corbel Yard with Tarnbrook Deconstruction as surveyor.')
  await expect(page.getByTestId(`claim-confirm-${mine}`)).toHaveText(/Add as a separate building/)
  await page.getByTestId(`claim-confirm-into-${mine}`).click()
  await page.waitForURL(`**/app/buildings/${toms}`)
  await expect(page.getByText('Corbel Yard confirmed').first()).toBeVisible()
  await expect(page.getByText('1 item added to your Corbel Yard.').first()).toBeVisible()
  await expect(page.locator('[data-testid^="nav-building-"]').filter({ hasText: /^Corbel Yard$/ })).toHaveCount(1)
  await page.goto(`/app/buildings/${toms}/inventory`)
  await expect(page.getByText('CY-01').first()).toBeVisible()

  // Dana is told where her item went, and has one Corbel Yard to capture in.
  await switchTo(page, 'dana')
  await page.goto('/app/notifications')
  await expect(page.getByText('They already had it as Corbel Yard, so your 1 item moved there.').first()).toBeVisible()
  await page.goto('/app/capture')
  await expect(page.getByTestId('capture-building').locator('option', { hasText: 'Corbel Yard' })).toHaveCount(1)
  expect(errors).toEqual([])
})

test('the new building controls are 44 px tall at phone width', async ({ page }) => {
  const errors = watchErrors(page)
  await signInWithCard(page, 'dana')
  // Harrowden Court is an open appointment, so Ambrey House offers Move into an appointment.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/app/buildings/${AMBREY}`)
  for (const id of ['move-into-appointment', 'contractor-invite-open']) {
    const box = await page.getByTestId(id).boundingBox()
    expect(box, id).not.toBeNull()
    expect(box!.height, id).toBeGreaterThanOrEqual(44)
  }
  await page.getByTestId('contractor-invite-open').click()
  for (const id of ['contractor-invite-send']) expect((await page.getByTestId(id).boundingBox())!.height, id).toBeGreaterThanOrEqual(44)
  await page.goto(`/app/buildings/${TIVERNE}/testing`)
  expect((await page.getByTestId('testing-view').first().boundingBox())!.height).toBeGreaterThanOrEqual(44)
  expect(errors).toEqual([])
})
