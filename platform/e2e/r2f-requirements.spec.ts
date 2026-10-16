// Location-based requirements across the software (recording audit of 16 October 2026, notes 20, 41, C1 and C7):
// Priya finds Merton without knowing its region and leaves the requirements closed, and the overview says the
// suggestions are tracked; Marcus sees the BREEAM item at risk on his home and follows it; Tom tracks Carbon Options
// on Tiverne House before it comes down. Each screen fits a phone.
import { expect, test, type Page } from '@playwright/test'

const M = 'prj_hp23zk'
const TIVERNE = 'bld_zad898'
const EMAIL = { priya: 'priya.nair@studiooriel.example', marcus: 'marcus.lindqvist@halewick.example', tom: 'tom.ashby@ostlea.example' } as const

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

test('the architect picks a borough without knowing its region, and the suggestions are tracked', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.goto('/app/projects/new')
  await page.getByTestId('project-name').fill('Corbel Yard')
  await page.getByTestId('project-start').fill('2027-09-06')
  await page.getByTestId('project-local-authority').selectOption('Merton')
  await expect(page.getByTestId('project-region')).toHaveValue('Outer London West')
  await expect(page.getByTestId('project-requirements-summary')).toContainText('apply to Merton, Outer London West')
  await page.getByTestId('create-project').click()
  await page.waitForURL('**/app/projects/prj_*')
  await expect(page.getByTestId('requirements-card')).toContainText('suggested for Merton, Outer London West')
  await expect(page.getByTestId('requirements-suggested-note')).toContainText('are tracked')
  await page.getByTestId('requirements-open').click()
  await page.waitForURL('**/requirements')
  await expect(page.getByTestId('requirements-tab-choose')).toHaveText('Review requirements')
  await expect(page.getByTestId('requirement-la-merton')).toContainText('Not yet summarised')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await horizontalOverflow(page)).toBe(0)
  expect(errors).toEqual([])
})

test('the consultant sees a requirement at risk on his home and opens it', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'marcus')
  const card = page.getByTestId(`consultant-project-${M}`)
  await expect(card.getByTestId(`consultant-requirements-${M}`)).toContainText('1 at risk')
  await expect(card.getByTestId(`consultant-location-${M}`)).toHaveText('Newham, Inner London East')
  await expect(card.getByRole('link', { name: 'Requirements', exact: true })).toHaveAttribute('href', `/app/projects/${M}/requirements`)
  await card.getByTestId(`consultant-at-risk-${M}-breeam-nc`).click()
  await page.waitForURL(`**/app/projects/${M}/requirements*`)
  await expect(page.getByTestId('requirement-breeam-nc')).toHaveAttribute('data-status', 'at_risk')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/home')
  await expect(page.getByTestId(`consultant-requirements-${M}`)).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)
  expect(errors).toEqual([])
})

test('the owner tracks Carbon Options on Tiverne House before it comes down', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'tom')
  await expect(page.getByTestId(`home-building-requirements-${TIVERNE}`)).toContainText('1 at risk')
  await page.getByTestId(`home-building-requirements-${TIVERNE}`).click()
  await page.waitForURL(`**/app/buildings/${TIVERNE}/requirements`)
  await expect(page.getByTestId('building-requirement-la-city-of-london-carbon-options')).toContainText('Carbon Options guidance')
  await expect(page.getByTestId('building-requirement-la-city-of-london-carbon-options')).toHaveAttribute('data-status', 'evidence_ready')
  await page.getByTestId('building-requirement-status-dem-notice').selectOption('in_progress')
  await expect(page.getByTestId('building-requirement-dem-notice')).toHaveAttribute('data-status', 'in_progress')
  await expect(page.getByTestId('building-requirements-summary')).toContainText('1 of 4 ready')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await horizontalOverflow(page)).toBe(0)
  expect(errors).toEqual([])
})
