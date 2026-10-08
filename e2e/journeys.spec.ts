// The end-to-end suite, part 2: the role journeys of brief/09-V1-PRODUCT.md section 9, each from a fresh seed (13.14).
// Architect: browse, filter, sort, project fit, the listing, Shared with you, the wish list, geometry, the spec sheet,
// send to the client. Client: approvals. Surveyor and selling owner: folders, access, the decision tree, capture.
import type { Page } from '@playwright/test'
import path from 'node:path'
import { test, expect, P, seed, fresh, go, setPersona, setUpTo, mainText, label, expectNoLotPrivate, expectNoLotPrivateIn, expectNoProjectPrivate, expectArchitectOnly, expectNoHorizontalScroll, expectTouchTargets, assertRoute, download, textOf, workbookText } from './helpers'
import { HARROWDEN_ID, MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID, TIVERNE_ID, itemByTag, lotForItem } from '../src/domain/seed/world'
import { browseListings, listingFor } from '../src/domain/visibility'
import { DEFAULT_ASSUMPTIONS } from '../src/domain/reference/assumptions'
import { filterListings, sortListings } from '../src/domain/engines/browse'
import { NO_FILTERS } from '../src/domain/v1types'
import { LABELS, NOT_AVAILABLE_TO_ROLE } from '../src/domain/reference/labels'

const SHARED_WITH_MERROWGATE = ['L-2R8X5N', 'L-775DW8', 'L-FQK92P', 'L-MNY55K', 'L-WPX5A6']

/** The oracle for "Structure, most carbon avoided" after step 3: the seed's open listings plus TH-01, from the domain engine. */
function structureByCarbon(): string[] {
  const th01 = lotForItem(seed, itemByTag(seed, 'TH-01').id)
  const listings = [...browseListings(seed, DEFAULT_ASSUMPTIONS), listingFor(seed, th01.id, DEFAULT_ASSUMPTIONS)]
  return sortListings(filterListings(listings, { ...NO_FILTERS, typology: 'structure' }), 'carbon').map((l) => l.publicId)
}

/** Opens a leaf of the left rail, expanding its folder first when the folder is closed. */
async function rail(page: Page, folder: string, leaf: string) {
  if (!(await page.getByTestId(leaf).isVisible())) await page.getByTestId(folder).click()
  await page.getByTestId(leaf).click()
}

async function cardIds(page: Page, prefix: string): Promise<string[]> {
  return page.locator(`[data-testid^="${prefix}"]`).evaluateAll((els, p) => els.map((e) => (e.getAttribute('data-testid') ?? '').slice(p.length)), prefix)
}

/** Saves a lot to a project's wish list from its listing page, through the Save popover. */
async function saveTo(page: Page, publicId: string, projectId: string) {
  await go(page, `/market/${publicId}`)
  await page.getByTestId(`save-${publicId}`).click()
  await expect(page.getByTestId('save-menu')).toBeVisible()
  await page.getByTestId(`save-target-${projectId}`).click()
  await expect(page.getByTestId(`save-target-${projectId}`)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('save-menu')).toBeHidden()
  await expect(page.getByTestId(`save-${publicId}`)).toHaveAttribute('data-saved', 'true')
}

test('architect: browse, Shared with you, wish list, geometry, spec sheet and send to the client', async ({ page, entry }, testInfo) => {
  test.setTimeout(180_000)
  await fresh(page, entry)
  // Steps 1 to 3 through the demo script panel: Tom has published TH-01 as L-9F4CQQ. Step 4 opens Browse as Priya.
  await setUpTo(page, 4)
  await expect(page.getByTestId('persona-switcher')).toHaveValue(P.priya)
  await expect(page).toHaveURL(/#\/market$/)
  assertRoute(page)

  // Rail: the marketplace above the projects; no deal entries.
  for (const id of ['nav-browse', 'nav-shared', 'nav-saved', `nav-project-${MERROWGATE_ID}`, `nav-project-${SALLOW_ID}`, `nav-project-${FERRYMOOR_ID}`, 'nav-new-project']) await expect(page.getByTestId(id)).toBeVisible()
  await expectArchitectOnly(page)

  // Browse: the card's visual and band, Structure, most carbon avoided, then the fit against Merrowgate Wharf.
  const card = page.getByTestId('browse-card-L-9F4CQQ')
  await expect(card).toBeVisible()
  await expect(card.locator('svg, img').first()).toBeVisible()
  await expect(page.getByTestId('band-L-9F4CQQ')).toHaveAttribute('data-band', 'high')
  await expect(page.getByTestId('band-L-9F4CQQ')).toContainText('High')
  await expectNoLotPrivate(page)
  await page.getByTestId('typology-structure').click()
  await expect(page.getByTestId('typology-structure')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('browse-sort').selectOption('carbon')
  const expected = structureByCarbon()
  expect(expected).toContain('L-9F4CQQ')
  await expect.poll(() => cardIds(page, 'browse-card-')).toEqual(expected)
  await page.getByTestId('project-picker').selectOption(MERROWGATE_ID)
  await expect(page.locator('[data-testid^="fit-"]')).toHaveCount(expected.length)
  await expect(page.getByTestId('fit-L-9F4CQQ')).toHaveText('Available in time')
  await expect(page.getByTestId('fit-L-9F4CQQ')).toHaveAttribute('data-fit', 'in_time')
  await label(page, 'L38')
  await expectNoLotPrivate(page)

  // The listing: drawing, quantity, mass, carbon, band and fit; the picker still reads Merrowgate Wharf.
  await card.locator('a').first().click()
  await expect(page).toHaveURL(/#\/market\/L-9F4CQQ$/)
  assertRoute(page)
  await expect(page.getByTestId('listing-project-picker')).toHaveValue(MERROWGATE_ID)
  await expect(page.getByTestId('listing-drawing').locator('svg').first()).toBeVisible()
  await expect(page.getByTestId('listing-visual')).toBeVisible()
  await expect(page.getByTestId('label-L36')).toHaveText(LABELS.L36)
  await expect(page.getByTestId('listing-title')).toHaveText('UB 457x191x67, 7.5 m')
  await expect(page.getByTestId('listing-quantity')).toHaveText('48 pieces')
  await expect(page.getByTestId('listing-mass')).toHaveText('24.16 t')
  await expect(page.getByTestId('listing-carbon')).toHaveText('41.0 tCO2e')
  await expect(page.getByTestId('listing-band')).toHaveAttribute('data-band', 'high')
  await expect(page.getByTestId('listing-band')).toContainText('High')
  await label(page, 'L37')
  await expect(page.getByTestId('listing-strip')).toBeVisible()
  await expect(page.getByTestId('listing-fit')).toHaveText('Available in time')
  await label(page, 'L38')
  await expect(page.getByTestId('listing-price')).toHaveText('£715 to £825 per tonne')
  await expect(page.getByTestId('listing-availability')).toHaveText('Available from Q1 2027')
  await label(page, 'L42')
  await label(page, 'L35')
  await expect(page.getByTestId('label-L25')).toHaveCount(0)
  await expect(page.getByTestId('reserve-steel')).toHaveCount(0)
  await expectNoLotPrivate(page)
  await expectArchitectOnly(page)

  // Shared with you: the terms for Merrowgate Wharf, then the five lots Tom shared, each tagged in confidence.
  await page.getByTestId('nav-shared').click()
  await expect(page).toHaveURL(/#\/market\/shared$/)
  const group = page.getByTestId(`shared-group-${MERROWGATE_ID}`)
  await expect(group).toContainText('Shared with this project by the owner, in confidence')
  await expect(group.getByTestId('label-L6')).toHaveText(LABELS.L6)
  await expect(page.locator(`[data-testid^="shared-card-${MERROWGATE_ID}-"]`)).toHaveCount(0)
  await page.getByTestId(`open-terms-${MERROWGATE_ID}`).click()
  await expect(page.getByTestId('terms-dialog').getByTestId('label-L7')).toHaveText(LABELS.L7)
  await page.getByTestId('accept-terms').click()
  await expect(page.getByTestId(`terms-accepted-${MERROWGATE_ID}`)).toBeVisible()
  expect((await cardIds(page, `shared-card-${MERROWGATE_ID}-`)).sort()).toEqual(SHARED_WITH_MERROWGATE)
  for (const id of SHARED_WITH_MERROWGATE) await expect(page.getByTestId(`shared-card-${MERROWGATE_ID}-${id}`).getByTestId('label-L27')).toHaveText(LABELS.L27)
  await expect(page.getByTestId(`shared-card-${MERROWGATE_ID}-L-9F4CQQ`)).toHaveCount(0)
  await expectNoLotPrivate(page)
  await expectArchitectOnly(page)

  // Save L-9F4CQQ to Merrowgate Wharf, then read the wish list.
  await saveTo(page, 'L-9F4CQQ', MERROWGATE_ID)
  await rail(page, `nav-project-${MERROWGATE_ID}`, `nav-${MERROWGATE_ID}-wishlist`)
  await expect(page).toHaveURL(new RegExp(`#/projects/${MERROWGATE_ID}/wishlist$`))
  assertRoute(page)
  await expect(page.getByTestId('wishlist-project-name')).toHaveText('Merrowgate Wharf')
  await label(page, 'L40')
  const row = page.getByTestId('wish-row-L-9F4CQQ')
  await expect(row).toHaveAttribute('data-status', 'pending')
  await expect(row.getByTestId('wish-status')).toHaveText('Pending')
  await expect(row.getByTestId('wish-quantity')).toHaveText('48 pieces')
  await expect(row.getByTestId('wish-availability')).toHaveText('Available from Q1 2027')
  await expect(row.getByTestId('wish-fit')).toHaveText('Available in time')
  await expect(row.getByTestId('wish-storage')).toHaveText('13 months of storage until the start')
  await expect(row.getByTestId('wish-band')).toHaveAttribute('data-band', 'high')
  await expect(row.getByTestId('wish-avoided')).toHaveText('41.0 tCO2e')
  await expect(page.getByTestId('wish-total-count')).toHaveText('1')
  await expect(page.getByTestId('wish-total-mass')).toContainText('24.16')
  await expect(page.getByTestId('wish-total-avoided')).toContainText('41.0')
  await label(page, 'L37')
  await label(page, 'L38')
  await label(page, 'L42')
  await expectNoLotPrivate(page)
  await expectArchitectOnly(page)

  // Geometry: a DXF with 12 vertices and an OBJ, each with L20 and L42 and no lot private string (P10).
  const dxf = await download(page, () => row.getByTestId('wish-dxf').click(), testInfo.outputDir)
  expect(dxf.name).toBe('L-9F4CQQ-UB-457x191x67.dxf')
  const dxfText = await textOf(dxf.file)
  expect(dxfText).toContain(LABELS.L20)
  expect(dxfText).toContain(LABELS.L42)
  expect(dxfText.split('\n').filter((l) => l === 'VERTEX')).toHaveLength(12)
  expectNoLotPrivateIn(dxf.name + '\n' + dxfText, 'DXF')
  const obj = await download(page, () => row.getByTestId('wish-obj').click(), testInfo.outputDir)
  expect(obj.name).toBe('L-9F4CQQ-UB-457x191x67.obj')
  const objText = await textOf(obj.file)
  expect(objText).toContain(LABELS.L20)
  expect(objText).toContain(LABELS.L42)
  expect(objText.split('\n').filter((l) => l.startsWith('v '))).toHaveLength(24)
  expectNoLotPrivateIn(obj.name + '\n' + objText, 'OBJ')

  // The draft spec sheet and its workbook (P10, L39).
  await page.getByTestId('wishlist-open-spec').click()
  await expect(page).toHaveURL(new RegExp(`#/projects/${MERROWGATE_ID}/spec$`))
  await expect(page.getByTestId('spec-download')).toBeDisabled()
  await page.getByTestId('spec-toggle-draft').click()
  await expect(page.getByTestId('spec-block-L-9F4CQQ')).toBeVisible()
  await label(page, 'L39')
  await label(page, 'L20')
  await expectNoLotPrivate(page)
  await expectArchitectOnly(page)
  const spec = await download(page, () => page.getByTestId('spec-download').click(), testInfo.outputDir)
  expect(spec.name).toBe('merrowgate-wharf-specification-2026-10-07.xlsx')
  {
    const { text } = await workbookText(spec.file)
    expect(text).toContain('L-9F4CQQ')
    expect(text).toContain('UB 457x191x67')
    expect(text).toContain(LABELS.L39)
    expect(text).toContain(LABELS.L20)
    expectNoLotPrivateIn(spec.name + '\n' + text, 'spec workbook')
  }

  // Send to the client.
  await rail(page, `nav-project-${MERROWGATE_ID}`, `nav-${MERROWGATE_ID}-wishlist`)
  await page.getByTestId('wishlist-send').click()
  await expect(page.getByTestId('wishlist-flash')).toHaveText('Sent to Lantern Quay Developments for a decision on each item.')
  await expect(page.getByTestId('wish-row-L-9F4CQQ')).toHaveAttribute('data-status', 'sent')
  await expect(page.getByTestId('wish-row-L-9F4CQQ').getByTestId('wish-status')).toHaveText('Sent to client')
  await expect(page.getByTestId('wishlist-send')).toBeDisabled()

  // Match schedule is version 2 for the architect.
  // The rail entry is greyed with the V2 tag; it still opens the panel.
  const v2 = page.getByTestId(`nav-${MERROWGATE_ID}-match`)
  await expect(v2).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByTestId(`nav-${MERROWGATE_ID}-match-v2`)).toHaveText('V2')
  await go(page, `/projects/${MERROWGATE_ID}/match`)
  await expect(page.getByTestId('match-v2')).toBeVisible()
  await label(page, 'L35')
  await expect(page.getByTestId('load-sample-schedule')).toHaveCount(0)

  // P11, P3 and P7 on every architect route.
  for (const route of ['/market', '/market/shared', '/saved', '/projects/new', '/market/L-9F4CQQ', '/market/L-WPX5A6', ...[MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID].flatMap((id) => [`/projects/${id}`, `/projects/${id}/wishlist`, `/projects/${id}/spec`, `/projects/${id}/match`])]) {
    await go(page, route)
    await expect(page.locator('main h1').first()).toBeVisible()
    assertRoute(page)
    await expectNoLotPrivate(page)
    await expectArchitectOnly(page)
  }

  // The surveyor's photo, once the owner ticks it public, leads the card and sits beside the drawing (6.2, 13.10).
  const th01Item = itemByTag(seed, 'TH-01').id
  await setPersona(page, P.tom)
  await go(page, `/buildings/${TIVERNE_ID}/listings`)
  await page.getByTestId('select-lot-TH-01').click()
  await page.getByTestId(`photo-public-${th01Item}-pho_th01-tick`).check()
  await setPersona(page, P.priya)
  await go(page, '/market')
  await expect(page.getByTestId('browse-card-L-9F4CQQ').locator('img[data-visual="photo"]')).toBeVisible()
  await go(page, '/market/L-9F4CQQ')
  await expect(page.locator('img[data-testid="listing-visual"][data-visual="photo"]')).toBeVisible()
  await expect(page.getByTestId('listing-drawing').locator('svg').first()).toBeVisible()
  await expect(page.getByTestId('label-L36')).toHaveCount(0)
  await expectNoLotPrivate(page)
})

test('client: Isla approves the item, the architect sees it approved and the spec sheet lists it', async ({ page, entry }) => {
  test.setTimeout(120_000)
  await fresh(page, entry)
  await setUpTo(page, 4)
  await saveTo(page, 'L-9F4CQQ', MERROWGATE_ID)
  await go(page, `/projects/${MERROWGATE_ID}/wishlist`)
  await page.getByTestId('wishlist-send').click()
  await expect(page.getByTestId('wish-row-L-9F4CQQ')).toHaveAttribute('data-status', 'sent')

  // Isla opens Merrowgate Wharf, Approvals.
  await setPersona(page, P.isla)
  await expect(page).toHaveURL(new RegExp(`#/projects/${MERROWGATE_ID}/approvals$`))
  assertRoute(page)
  await expect(page.getByTestId('approvals-count-sent')).toContainText('1')
  const card = page.getByTestId('approval-card-L-9F4CQQ')
  await expect(card.getByTestId('approval-quantity')).toContainText('48 pieces')
  await expect(card.getByTestId('approval-quantity')).toContainText('24.16 t')
  await expect(card.getByTestId('approval-fit')).toHaveText('Available in time')
  await expect(card.getByTestId('approval-avoided')).toContainText('41.0 tCO2e')
  await expect(card.getByTestId('approval-price')).toHaveText('£715 to £825 per tonne')
  await expect(card.getByTestId('approval-band')).toHaveAttribute('data-band', 'high')
  await expect(page.getByTestId(`nav-${MERROWGATE_ID}-deals`)).toBeVisible()
  await expectNoLotPrivate(page)
  await page.getByTestId('approval-note-L-9F4CQQ').fill('Approved for the level 2 transfer beams.')
  await page.getByTestId('approve-L-9F4CQQ').click()
  const approved = page.getByTestId('approved-row-L-9F4CQQ')
  await expect(approved.getByTestId('approval-decision')).toHaveText('Approved on 7 October 2026')
  await expect(approved.getByTestId('approval-decision-note')).toContainText('Approved for the level 2 transfer beams.')
  await expect(page.getByTestId('approvals-count-sent')).toContainText('0')
  await expect(page.getByTestId('approvals-count-approved')).toContainText('1')
  await expect(page.getByTestId('approvals-match-link')).toHaveAttribute('href', `#/projects/${MERROWGATE_ID}/match`)
  await expectNoLotPrivate(page)

  // The architect sees it approved, with the client's note, and cannot remove it.
  await setPersona(page, P.priya)
  await go(page, `/projects/${MERROWGATE_ID}/wishlist`)
  const row = page.getByTestId('wish-row-L-9F4CQQ')
  await expect(row).toHaveAttribute('data-status', 'approved')
  await expect(row.getByTestId('wish-status')).toHaveText('Approved')
  await expect(row.getByTestId('wish-decision')).toContainText('Approved by the client on 7 October 2026.')
  await expect(row.getByTestId('wish-decision')).toContainText('Approved for the level 2 transfer beams.')
  await expect(row.getByTestId('wish-remove')).toHaveCount(0)
  await expectArchitectOnly(page)
  // The spec sheet, approved by default, lists it.
  await go(page, `/projects/${MERROWGATE_ID}/spec`)
  await expect(page.getByTestId('spec-sheet')).toHaveAttribute('data-which', 'approved')
  await expect(page.getByTestId('spec-group-approved').getByTestId('spec-block-L-9F4CQQ')).toBeVisible()
  await expect(page.getByTestId('spec-download')).toBeEnabled()
  await expectNoLotPrivate(page)

  // The consultant's wish list review: one approved item and its carbon, read only.
  await setPersona(page, P.marcus)
  await go(page, `/projects/${MERROWGATE_ID}/review`)
  await expect(page.getByTestId('review-row-L-9F4CQQ')).toBeVisible()
  await expect(page.getByTestId('review-L-9F4CQQ-carbon')).toContainText('41.0')
  await expect(page.getByTestId('review-read-only')).toBeVisible()
  await expectNoLotPrivate(page)
})

test('surveyor and selling owner: folders, Harrowden Court out of reach for Tom, the decision tree, capture at 390 px', async ({ page, entry }) => {
  test.setTimeout(120_000)
  await fresh(page, entry)

  // Dana sees both clients, each with its building.
  await setPersona(page, P.dana)
  const brackwater = Object.values(seed.orgs).find((o) => o.name === 'Brackwater Estates')!
  const ostlea = Object.values(seed.orgs).find((o) => o.name === 'Ostlea Estates')!
  await expect(page.getByTestId(`nav-client-${ostlea.id}`)).toBeVisible()
  await expect(page.getByTestId(`nav-client-${brackwater.id}`)).toBeVisible()
  await expect(page.getByTestId(`nav-building-${TIVERNE_ID}`)).toHaveText('Tiverne House')
  await page.getByTestId(`nav-client-${brackwater.id}`).click()
  await expect(page.getByTestId(`nav-building-${HARROWDEN_ID}`)).toHaveText('Harrowden Court')
  await rail(page, `nav-building-${HARROWDEN_ID}`, `nav-${HARROWDEN_ID}-inventory`)
  await expect(page).toHaveURL(new RegExp(`#/buildings/${HARROWDEN_ID}/inventory$`))
  assertRoute(page)
  await expect(page.getByTestId('inventory-building')).toHaveText('Harrowden Court')
  await expect(page.getByTestId('inventory-client')).toHaveText('Brackwater Estates')
  const rows = page.locator('[data-testid^="inventory-row-"]')
  await expect(rows).toHaveCount(3)
  expect((await cardIds(page, 'inventory-row-')).sort()).toEqual(['HC-01', 'HC-02', 'HC-03'])
  for (const tag of ['HC-01', 'HC-02', 'HC-03']) await expect(page.getByTestId(`inventory-expected-${tag}`)).toHaveText('August 2027')
  await label(page, 'L43')
  expect(await mainText(page)).not.toContain('Tiverne House')

  // Tom owns Tiverne House only: Harrowden Court is not in his rail and not reachable by URL.
  await setPersona(page, P.tom)
  await expect(page.getByTestId('rail')).toContainText('Tiverne House')
  await expect(page.getByTestId('rail')).not.toContainText('Harrowden Court')
  await expect(page.getByTestId(`nav-building-${HARROWDEN_ID}`)).toHaveCount(0)
  for (const screen of ['inventory', 'capture', 'priority', 'listings', `inventory/${itemByTag(seed, 'HC-01').id}`]) {
    await go(page, `/buildings/${HARROWDEN_ID}/${screen}`)
    await expect(page.getByTestId('not-available')).toBeVisible()
    await expect(page.locator('main h1')).toHaveText(NOT_AVAILABLE_TO_ROLE)
    const text = await mainText(page)
    for (const s of ['Harrowden Court', 'Brackwater Estates', 'HC-01']) expect(text).not.toContain(s)
  }

  // Tom's priority: the route column reads the decision tree, with the legend and L41.
  await go(page, `/buildings/${TIVERNE_ID}/priority`)
  await expect(page.locator('[data-testid^="priority-row-"]')).toHaveCount(11)
  const routes = await page.locator('[data-testid^="priority-route-"]').allTextContents()
  expect(routes).toHaveLength(11)
  for (const r of routes) expect(['Reuse', 'Downcycle', 'Recycle']).toContain(r.trim())
  await expect(page.getByTestId('priority-route-TH-01')).toHaveText('Reuse')
  await expect(page.getByTestId('priority-route-TH-09')).toHaveText('Downcycle')
  await expect(page.getByTestId('priority-route-TH-10')).toHaveText('Downcycle')
  await expect(page.getByTestId('priority-reason-TH-09')).toContainText('Recycle rather than recover')
  for (const step of ['reuse', 'upcycle', 'downcycle', 'recycle', 'scrap']) await expect(page.getByTestId(`legend-${step}`)).toBeVisible()
  await expect(page.getByTestId('legend-count-upcycle')).toHaveText('Not assigned')
  await expect(page.getByTestId('legend-count-scrap')).toHaveText('Not assigned')
  await label(page, 'L41')
  await expectNoProjectPrivate(page)

  // Listings and visibility: the owner's three options and the blind sharing list.
  await go(page, `/buildings/${TIVERNE_ID}/listings`)
  await page.getByTestId('select-lot-TH-01').click()
  const options = await page.getByTestId('publish-visibility').locator('option').allTextContents()
  expect(options).toEqual(['Private', 'Shared privately with selected projects', 'Published to the marketplace'])
  await expect(page.getByTestId(`share-row-${MERROWGATE_ID}`)).toBeVisible()
  await expectNoProjectPrivate(page)

  // Dana captures at 390 px: the building and client named, the expected availability field with L43, 44 px targets.
  await page.setViewportSize({ width: 390, height: 844 })
  await setPersona(page, P.dana)
  await go(page, `/buildings/${TIVERNE_ID}/capture`)
  await expect(page.getByTestId('capture-building')).toContainText('Tiverne House')
  await expect(page.getByTestId('capture-client')).toHaveText('Ostlea Estates')
  await expect(page.getByTestId('capture-expected-month')).toBeVisible()
  await expect(page.getByTestId('capture-expected-month')).toHaveValue('1')
  await expect(page.getByTestId('capture-expected-year')).toHaveValue('2027')
  await label(page, 'L43')
  await expectNoHorizontalScroll(page)
  await expectTouchTargets(page)
  await page.getByTestId('capture-text').fill('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
  await page.getByTestId('capture-assist').click()
  await page.getByTestId('capture-condition-A').click()
  await page.getByTestId('capture-photo').setInputFiles(path.resolve('e2e/fixtures/sample-photo.jpg'))
  await expect(page.getByTestId('capture-photos')).toBeVisible()
  await page.getByTestId('capture-expected-month').selectOption('3')
  await page.getByTestId('capture-save').click()
  await expect(page.getByTestId('saved-tag')).toHaveText('TH-12')
  await expect(page.getByTestId('saved-expected')).toHaveText('March 2027')
  await go(page, `/buildings/${TIVERNE_ID}/inventory`)
  await expect(page.getByTestId('inventory-expected-TH-12')).toHaveText('March 2027')
  await label(page, 'L43')
})
