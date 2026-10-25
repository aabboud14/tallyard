// Round 2, project setup and timeline: a new project waits for the client to accept. Priya creates Corbel Yard for
// Lantern Quay Developments, sees the setup checklist, the link banner and the programme; Isla accepts it on Project
// requests; the overview fits a phone; Priya is told.
import { expect, test, type Page } from '@playwright/test'

const EMAIL = { priya: 'priya.nair@studiooriel.example', isla: 'isla.brennan@lanternquay.example', tom: 'tom.ashby@ostlea.example' } as const

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

/**
 * The programme leads a new project's overview: its chart starts in the top 60 percent of a laptop screen, and on a
 * phone the today line and the stage row are on the first screen (recording audit, note 19). Used for the
 * architect's new project and, since the polish, for an owner's New project with no architect.
 */
async function expectChartOnFirstScreen(page: Page) {
  for (const [width, height, limit] of [
    [1280, 800, 0.6 * 800],
    [1024, 768, 0.6 * 768],
    [1440, 900, 0.6 * 900],
    [390, 844, 700],
  ] as const) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => window.scrollTo(0, 0))
    const chart = await page.getByTestId('programme-chart').boundingBox()
    expect(chart!.y, `programme chart top at ${width} by ${height}`).toBeLessThanOrEqual(limit)
    const band = await page.locator('[data-part="stage-band"][data-state="current"]').boundingBox()
    expect(band!.y + band!.height, `current stage band at ${width} by ${height}`).toBeLessThanOrEqual(height)
    const today = await page.locator('[data-part="today"]').boundingBox()
    expect(today!.y, `today line at ${width} by ${height}`).toBeLessThan(height)
    expect(await horizontalOverflow(page), `${width} px`).toBe(0)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
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

  // The programme leads the new project's overview (note 19).
  await expectChartOnFirstScreen(page)
  // One Edit programme on the page, and Keep these dates beside it on the programme card.
  await expect(page.getByRole('button', { name: 'Edit programme' })).toHaveCount(1)
  await expect(page.getByTestId('programme-card').getByTestId('keep-programme')).toBeVisible()
  // Each stage band names its stage and dates on hover (note 17).
  await page.locator('[data-part="stage-band"][data-state="current"]').hover()
  await expect(page.getByRole('tooltip')).toContainText('Stage 2, Concept Design, ')
  await page.mouse.move(0, 0)
  // Today's stage is named in full on the line above the plot at every width, and its band's own words stay inside
  // the band and the plot (follow-up to note 17, changed in the polish: the name no longer runs over other bands).
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('[data-part="today-stage"]'), `today's stage at ${width}`).toHaveText('Today: stage 2, Concept Design')
    const band = (await page.locator('[data-part="stage-band"][data-state="current"]').boundingBox())!
    const text = (await page.locator('[data-part="stage-band"][data-state="current"] [data-part="stage-text"]').boundingBox())!
    const plot = (await page.getByTestId('programme-chart').locator('[data-part="plot"]').boundingBox())!
    expect(text.x, `current stage text at ${width}`).toBeGreaterThanOrEqual(Math.max(band.x, plot.x) - 0.5)
    expect(text.x + text.width, `current stage text at ${width}`).toBeLessThanOrEqual(Math.min(band.x + band.width, plot.x + plot.width) + 0.5)
    // A key under the lane names every stage drawn.
    await expect(page.locator('[data-part="stage-key"]:visible')).toContainText('Spatial Coordination')
  }
  // Each band takes keyboard focus and names itself and its dates; on a phone a tap opens the same words.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.locator('[data-part="stage-band"][data-state="current"]').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('[data-part="stage-band"]:focus')).toHaveAttribute('aria-label', /^Stage 3, Spatial Coordination, /)
  await expect(page.getByRole('tooltip')).toContainText('Stage 3, Spatial Coordination, ')
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('[data-part="stage-band"][data-state="current"]').click()
  await expect(page.getByTestId('stage-panel')).toContainText('Stage 2, Concept Design')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('stage-panel')).toHaveCount(0)
  await page.setViewportSize({ width: 1440, height: 900 })

  // Confirming the suggested dates moves the checklist on.
  await page.getByTestId('keep-programme').click()
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

test('a short project labels its programme in months, never quarters', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.goto('/app/projects/new')
  await page.getByTestId('project-name').fill('Small refurb')
  await page.getByTestId('project-start').fill('2027-03-01')
  await page.getByTestId('project-completion').fill('2027-09-01')
  await page.getByTestId('create-project').click()
  await page.waitForURL('**/app/projects/prj_*')
  const card = page.getByTestId('programme-card')
  await expect(page.getByTestId('programme-chart')).toBeVisible()
  for (const range of ['Whole programme', 'From today']) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await card.getByText(range, { exact: true }).click()
    await expect(card).toHaveAttribute('data-range', range === 'From today' ? 'ahead' : 'whole')
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(card).not.toContainText(/Q[1-4] 20/)
      // The labels on show never overlap one another.
      const boxes = await page.locator('[data-part="tick-label"]').evaluateAll((els) =>
        els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => {
          const r = e.getBoundingClientRect()
          return { text: e.textContent, left: r.left, right: r.right }
        }),
      )
      expect(boxes.length, `${range} at ${width}`).toBeGreaterThan(1)
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].left, `${boxes[i - 1].text} then ${boxes[i].text}, ${range} at ${width}`).toBeGreaterThanOrEqual(boxes[i - 1].right)
      expect(await horizontalOverflow(page), `${range} at ${width}`).toBe(0)
    }
  }
  // Ferrymoor Yard from today at 1024 px: 'Jan 2027' wins over the first month, which the left edge names, so every
  // year on the axis is named and 'Jul' never reads as July 2026 (follow-up to note 14).
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/app/projects/prj_x6dq3n')
  await page.getByTestId('programme-card').getByText('From today', { exact: true }).click()
  await expect(page.getByTestId('programme-card')).toHaveAttribute('data-range', 'ahead')
  const shown = await page.locator('[data-part="tick-label"]').evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent))
  expect(shown).toEqual(['Jan 2027', 'Jul', 'Jan 2028', 'Jul'])
  await expect(page.locator('[data-part="start-label"]')).toHaveText('Oct 2026')
  expect(errors).toEqual([])
})

test("an owner's New project with no architect leads with its programme too", async ({ page }) => {
  const errors = watchErrors(page)
  // Tom adds Wexcombe House as a New project and appoints no architect yet (polish, note 19).
  await signIn(page, 'tom')
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
  await expect(page.getByTestId('programme-chart')).toBeVisible()
  await expect(page.getByTestId('appoint-architect-card')).toBeVisible()
  // The same limits as the architect's new project, and the appoint card follows the programme.
  await expectChartOnFirstScreen(page)
  const programme = (await page.getByTestId('programme-card').boundingBox())!
  const appoint = (await page.getByTestId('appoint-architect-card').boundingBox())!
  expect(appoint.y).toBeGreaterThan(programme.y + programme.height - 1)
  expect(errors).toEqual([])
})
