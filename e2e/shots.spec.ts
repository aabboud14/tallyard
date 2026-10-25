// npm run shots: the version 1.0 screens (brief/09-V1-PRODUCT.md sections 3, 6 and 9) into docs/screens/.
// Part A replays steps 1 to 3 and walks the architect, client and consultant through a wish list. Part B replays the
// twelve demo steps and captures the deal, compliance and operator screens.
import type { Page } from '@playwright/test'
import { test, expect, P, fresh, go, setPersona, setUpTo } from './helpers'
import { TIVERNE_ID, HARROWDEN_ID, MERROWGATE_ID, DURNLEY_ID } from '../src/domain/seed/world'

const out = (name: string) => `docs/screens/${name}.png`

async function shot(page: Page, name: string, persona: string | null, route: string, before?: () => Promise<void>) {
  if (persona) await setPersona(page, persona)
  await go(page, route)
  await page.waitForSelector('main h1')
  if (before) await before()
  await page.screenshot({ path: out(name), fullPage: true })
}

async function save(page: Page, publicId: string, projectId: string) {
  await go(page, `/market/${publicId}`)
  await page.getByTestId(`save-${publicId}`).click()
  await page.getByTestId(`save-target-${projectId}`).click()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId(`save-${publicId}`)).toHaveAttribute('data-saved', 'true')
}

test('screenshots of the version 1.0 screens', async ({ page, entry }) => {
  test.setTimeout(300_000)
  await fresh(page, entry)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: out('01-landing'), fullPage: true })

  // Part A. Steps 1 to 3, then the architect's wish list through to the client's approval.
  await setUpTo(page, 4)
  await shot(page, '02-inventory', P.tom, `/buildings/${TIVERNE_ID}/inventory`)
  await shot(page, '03-priority-decision-tree', P.tom, `/buildings/${TIVERNE_ID}/priority`)
  await shot(page, '04-listings-and-visibility', P.tom, `/buildings/${TIVERNE_ID}/listings`, async () => {
    await page.getByTestId('select-lot-TH-01').click()
  })
  await shot(page, '05-surveyor-harrowden-court', P.dana, `/buildings/${HARROWDEN_ID}/inventory`)
  await shot(page, '06-browse', P.priya, '/market', async () => {
    await page.getByTestId('project-picker').selectOption(MERROWGATE_ID)
  })
  await shot(page, '07-listing-L-9F4CQQ', null, '/market/L-9F4CQQ')
  await shot(page, '08-shared-with-you', null, '/market/shared', async () => {
    await page.getByTestId(`open-terms-${MERROWGATE_ID}`).click()
    await page.getByTestId('accept-terms').click()
    await expect(page.getByTestId(`terms-accepted-${MERROWGATE_ID}`)).toBeVisible()
  })
  await save(page, 'L-9F4CQQ', MERROWGATE_ID)
  await save(page, 'L-FQK92P', MERROWGATE_ID)
  await save(page, 'L-Q23X7N', MERROWGATE_ID)
  await shot(page, '09-wishlist-pending', null, `/projects/${MERROWGATE_ID}/wishlist`)
  await shot(page, '10-spec-sheet-draft', null, `/projects/${MERROWGATE_ID}/spec`, async () => {
    await page.getByTestId('spec-toggle-draft').click()
  })
  await shot(page, '11-match-schedule-version-2', null, `/projects/${MERROWGATE_ID}/match`)
  await shot(page, '12-saved', null, '/saved')
  await shot(page, '13-new-project', null, '/projects/new')
  await go(page, `/projects/${MERROWGATE_ID}/wishlist`)
  await page.getByTestId('wishlist-send').click()
  await shot(page, '14-approvals', P.isla, `/projects/${MERROWGATE_ID}/approvals`)
  await page.getByTestId('approve-L-9F4CQQ').click()
  await page.getByTestId('approve-L-FQK92P').click()
  await page.getByTestId('approval-note-L-Q23X7N').fill('Not for this scheme.')
  await page.getByTestId('decline-L-Q23X7N').click()
  await page.screenshot({ path: out('15-approvals-decided'), fullPage: true })
  await shot(page, '16-wishlist-decided', P.priya, `/projects/${MERROWGATE_ID}/wishlist`)
  await shot(page, '17-spec-sheet-approved', null, `/projects/${MERROWGATE_ID}/spec`)
  await shot(page, '18-wishlist-review', P.marcus, `/projects/${MERROWGATE_ID}/review`)

  // Phone width: capture, browse with the filter sheet, a listing, the wish list.
  await page.setViewportSize({ width: 390, height: 844 })
  await setPersona(page, P.dana)
  await go(page, `/buildings/${TIVERNE_ID}/capture`)
  await page.getByTestId('capture-text').fill('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
  await page.getByTestId('capture-assist').click()
  await page.screenshot({ path: out('19-capture-390'), fullPage: true })
  await shot(page, '20-browse-390', P.priya, '/market')
  await page.getByTestId('open-more-filters').click()
  await page.screenshot({ path: out('21-browse-filters-390') })
  await page.keyboard.press('Escape')
  await shot(page, '22-listing-390', null, '/market/L-9F4CQQ')
  await shot(page, '23-wishlist-390', null, `/projects/${MERROWGATE_ID}/wishlist`)

  // Part B. The twelve demo steps, then the client's deal screens, compliance and the operator.
  await page.setViewportSize({ width: 1440, height: 900 })
  await setUpTo(page, 12)
  await shot(page, '24-match-schedule-client', P.isla, `/projects/${MERROWGATE_ID}/match`)
  await shot(page, '25-reuse-plan-package', null, `/projects/${MERROWGATE_ID}/plan`)
  // The thread on its own: a full page shot after scrolling would catch the sticky rail half way down.
  await page.getByTestId('negotiation-panel').screenshot({ path: out('26-negotiation-thread') })
  await shot(page, '27-deals-custody', null, `/projects/${MERROWGATE_ID}/deals`)
  await shot(page, '28-offers-and-deals', P.tom, '/offers')
  await shot(page, '29-project-compliance', P.marcus, `/projects/${MERROWGATE_ID}/compliance`)
  await shot(page, '30-waste-dashboard', null, `/engagements/${DURNLEY_ID}/waste`)
  await shot(page, '31-ledger', P.operator, '/operator/ledger')
  await shot(page, '32-model-comparison', null, '/operator/models')
  await shot(page, '33-assumptions', null, '/assumptions')
  await shot(page, '34-about', null, '/about')
})
