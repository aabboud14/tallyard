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

  // The programme leads the new project's overview: its chart starts in the top 60 percent of a laptop screen, and
  // on a phone the today line and the stage row are on the first screen (recording audit, note 19).
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
  // One Edit programme on the page, and Keep these dates beside it on the programme card.
  await expect(page.getByRole('button', { name: 'Edit programme' })).toHaveCount(1)
  await expect(page.getByTestId('programme-card').getByTestId('keep-programme')).toBeVisible()
  // Each stage band names its stage and dates on hover (note 17).
  await page.locator('[data-part="stage-band"][data-state="current"]').hover()
  await expect(page.getByRole('tooltip')).toContainText('Stage 2, Concept Design, ')
  await page.mouse.move(0, 0)
  // Today's stage names itself on its band at every width, inside the plot (follow-up to note 17).
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const name = page.locator('[data-part="stage-band"][data-state="current"] [data-part="stage-name"]')
    await expect(name, `current stage name at ${width}`).toBeVisible()
    await expect(name).toHaveText('Concept Design')
    const plot = (await page.getByTestId('programme-chart').locator('[data-part="plot"]').boundingBox())!
    const box = (await name.boundingBox())!
    expect(box.x, `current stage name at ${width}`).toBeGreaterThanOrEqual(plot.x)
    expect(box.x + box.width, `current stage name at ${width}`).toBeLessThanOrEqual(plot.x + plot.width)
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
