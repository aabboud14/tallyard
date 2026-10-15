// Round 2 journey for the developer and the sustainability consultant (client-consultant design section 11): Isla
// follows cost, carbon and the programme on her home, reviews the circular economy statement from her to-do list,
// sees the cost panel and the reservation summaries, and marks a requirement evidence ready. Marcus gets the
// notifications, overrides a target, works the certification map and edits, sends and downloads the statement.
// At phone width nothing scrolls sideways.
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'

const M = 'prj_hp23zk'
const K = 'prj_w7kq2m'
const EMAIL = {
  isla: 'isla.brennan@lanternquay.example',
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

async function signIn(page: Page, who: Who) {
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

test('the developer reviews and follows the figures; the consultant sets targets, maps credits and sends the statement', async ({ page }, info) => {
  const errors = watchErrors(page)
  await signIn(page, 'isla')

  // Isla's home: four indicative figures, the to-do list and the programme across both projects.
  await expect(page.getByTestId('client-home')).toBeVisible()
  for (const id of ['client-metric-cost', 'client-metric-saving', 'client-metric-carbon', 'client-metric-reuse']) await expect(page.getByTestId(id)).toBeVisible()
  await expect(page.getByTestId('client-metric-cost')).toContainText('Indicative')
  await expect(page.locator('[data-testid^="portfolio-row-"]')).toHaveCount(2)
  await expect(page.getByTestId(`portfolio-row-${K}`)).toContainText('Kilnworth Place')
  await expect(page.getByTestId('sustainability-tracking')).toContainText('BREEAM')
  const review = page.getByTestId(`todo-review_statement-${M}`)
  await expect(review).toContainText('Review the circular economy statement')

  // She opens the review from the to-do, reads the statement and marks it reviewed.
  await review.getByRole('link').click()
  await page.waitForURL(`**/app/projects/${M}/sustainability#statement`)
  await page.getByTestId('statement-review').click()
  const dialog = page.getByTestId('statement-review-dialog')
  await expect(dialog).toContainText('Strategic approach')
  await page.getByTestId('statement-review-note').fill('Please add the brick reuse on the podium.')
  await page.getByTestId('statement-review-confirm').click()
  await expect(page.getByText('Statement reviewed').first()).toBeVisible()
  await expect(page.getByTestId('statement-card-status')).toContainText('Reviewed')
  await page.goto('/app/home')
  await expect(page.getByTestId('client-todo')).toBeVisible()
  await expect(page.getByTestId(`todo-review_statement-${M}`)).toHaveCount(0)

  // Approvals: the totals strip and the cost panel of the material waiting.
  await page.goto(`/app/projects/${M}/approvals`)
  await expect(page.getByTestId('approvals-finance')).toContainText('Waiting for your decision')
  await expect(page.getByTestId('approval-cost-L-2MAC36')).toContainText('Indicative cost if approved')
  await expect(page.getByTestId('approval-cost-L-2MAC36')).toContainText('The same new')

  // Reservations: the cost and carbon cards, and avoided carbon on each reservation.
  await page.goto(`/app/projects/${M}/reservations`)
  await expect(page.getByTestId('reservations-cost')).toContainText('With the seller')
  await expect(page.getByTestId('reservations-carbon')).toContainText('Secured for this project')
  await expect(page.getByTestId('reservation-carbon-L-WPX5A6')).toContainText('Avoided carbon')

  // Requirements: she marks one evidence ready with a note.
  await page.goto(`/app/projects/${M}/requirements`)
  await page.getByTestId('requirement-status-lp-si2').selectOption('evidence_ready')
  await expect(page.getByTestId('requirement-lp-si2')).toHaveAttribute('data-status', 'evidence_ready')
  await page.getByTestId('evidence-open-lp-si2').click()
  await page.getByTestId('evidence-text-lp-si2').fill('Stage 2 assessment accepted by the planning officer.')
  await page.getByTestId('evidence-add-lp-si2').click()
  await expect(page.getByTestId('evidence-lp-si2')).toContainText('Stage 2 assessment accepted by the planning officer.')

  // Marcus gets both notifications.
  await switchTo(page, 'marcus')
  await page.getByTestId('notifications-button').click()
  const popover = page.getByTestId('notifications-popover')
  await expect(popover).toContainText('reviewed the circular economy statement')
  await expect(popover).toContainText('evidence ready')
  await page.keyboard.press('Escape')

  // Goals and targets: content by value to 30%, and the meter reads below the target.
  await page.goto(`/app/projects/${M}/targets`)
  await page.getByTestId('goal-edit-content_by_value').click()
  await page.getByTestId('goal-value').fill('30')
  await page.getByTestId('goal-save').click()
  await expect(page.getByText('Target updated').first()).toBeVisible()
  await expect(page.getByTestId('goal-content_by_value')).toContainText('30%')
  await expect(page.getByTestId('goal-meter-content_by_value')).toHaveAttribute('data-state', 'critical')
  await expect(page.getByTestId('goal-meter-content_by_value')).toContainText('Off target')

  // Certification: on WELL he uses the suggestion on X02, then maps L-NHZ32R to X01 in the grid.
  await page.goto(`/app/projects/${M}/certification`)
  await page.getByTestId('scheme-tab-well').click()
  await page.waitForURL('**/certification?scheme=well')
  await page.getByTestId('credit-suggest-well-x02').click()
  await expect(page.getByTestId('credit-suggest-well-x02')).toHaveCount(0)
  await expect(page.getByTestId('credit-status-well-x02')).toHaveValue('at_risk')
  await page.getByTestId('view-by-item').click()
  const cell = page.getByTestId('matrix-well-x01-L-NHZ32R')
  await expect(cell).toHaveAttribute('data-state', 'unchecked')
  await cell.click()
  await expect(cell).toHaveAttribute('data-state', 'checked')

  // Circular economy: an edit returns the reviewed statement to draft; he sends it again and downloads it.
  await page.goto(`/app/projects/${M}/statement`)
  await expect(page.getByTestId('statement-status')).toContainText('Reviewed')
  await page.getByTestId('statement-edit-next_steps').click()
  await page.getByTestId('statement-text-next_steps').fill('Update the statement at planning with the final bill of materials.')
  await page.getByTestId('statement-save-next_steps').click()
  await expect(page.getByTestId('statement-status')).toContainText('Draft')
  await page.getByTestId('statement-send').click()
  await expect(page.getByTestId('statement-send')).toBeDisabled()
  const [docx] = await Promise.all([page.waitForEvent('download'), page.getByTestId('statement-docx').click()])
  expect(docx.suggestedFilename()).toMatch(/circular-economy-statement.*\.docx$/)
  const docxPath = info.outputPath(docx.suggestedFilename())
  await docx.saveAs(docxPath)
  expect(fs.readFileSync(docxPath).subarray(0, 2).toString()).toBe('PK')

  // At phone width nothing scrolls sideways on Certification and Requirements, nor on the client home.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/app/projects/${M}/certification`)
  await expect(page.getByTestId('certification-page')).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)
  await page.goto(`/app/projects/${M}/requirements`)
  await expect(page.getByTestId('requirements-page')).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)
  await switchTo(page, 'isla')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/home')
  await expect(page.getByTestId('client-home')).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)

  expect(errors).toEqual([])
})
