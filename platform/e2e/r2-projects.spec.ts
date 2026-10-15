// Round 2, project setup and timeline: a new project waits for the client to accept. Priya creates Corbel Yard for
// Lantern Quay Developments, sees the setup checklist, the link banner and the programme; Isla accepts it on Project
// requests; the overview fits a phone; Priya is told.
import { expect, test, type Page } from '@playwright/test'

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

async function signOut(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.keyboard.press('Escape')
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

test('a new project waits for the client to accept', async ({ page }) => {
  const errors = watchErrors(page)

  // Priya creates Corbel Yard for Lantern Quay Developments.
  await signIn(page, 'priya')
  await page.goto('/app/projects/new')
  await page.getByTestId('project-name').fill('Corbel Yard')
  await expect(page.getByTestId('project-client')).toHaveValue(/.+/)
  await expect(page.getByTestId('project-client').locator('option:checked')).toHaveText('Lantern Quay Developments')
  await page.getByTestId('project-start').fill('2027-09-06')
  await page.getByTestId('create-project').click()
  await page.waitForURL('**/app/projects/prj_*')
  const id = page.url().split('/').pop()!.split('?')[0]
  await expect(page.getByTestId('client-link-banner')).toContainText('Waiting for Lantern Quay Developments')
  await expect(page.getByTestId('project-setup')).toBeVisible()
  await expect(page.getByTestId('programme-chart')).toBeVisible()
  await expect(page.getByTestId('programme-suggested')).toBeVisible()

  // Confirming the suggested dates moves the checklist on.
  await page.getByTestId('setup-secondary-programme').click()
  await expect(page.getByTestId('setup-step-programme')).toHaveAttribute('data-state', 'done')

  // Isla has a request waiting, accepts it, and then has the project.
  await signOut(page)
  await signIn(page, 'isla')
  await expect(page.getByTestId('nav-project-requests')).toContainText('1')
  await page.getByTestId('nav-project-requests').click()
  await page.waitForURL('**/app/projects/requests')
  await expect(page.getByTestId(`link-request-${id}`)).toContainText('Studio Oriel wants to add you as client')
  await page.getByTestId(`accept-link-${id}`).click()
  await expect(page.getByTestId('link-requests-empty')).toBeVisible()
  await expect(page.getByTestId('sidebar')).toContainText('Corbel Yard')
  await expect(page.getByTestId('nav-project-requests')).toHaveCount(0)
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('programme-chart')).toBeVisible()
  await expect(page.getByTestId('client-link-banner')).toHaveCount(0)

  // The overview fits a phone.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('programme-chart')).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)

  // Priya is told, and her overview no longer waits.
  await signOut(page)
  await signIn(page, 'priya')
  await page.getByTestId('notifications-button').click()
  await expect(page.getByTestId('notifications-popover').getByText('Lantern Quay Developments accepted Corbel Yard').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('programme-chart')).toBeVisible()
  await expect(page.getByTestId('client-link-banner')).toHaveCount(0)
  await expect(page.getByTestId('setup-step-client')).toHaveAttribute('data-state', 'done')

  // The phone overview and requests page for the architect fit too.
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of [`/app/projects/${id}`, '/app/projects', '/app/help/methodology']) {
    await page.goto(path)
    await expect(page.locator('main')).not.toBeEmpty()
    expect(await horizontalOverflow(page), path).toBe(0)
  }

  expect(errors).toEqual([])
})
