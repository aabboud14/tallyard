// Round 2 Marketplace and material page, through the production build: category folders with a history entry,
// the checking strip with fit counts, the availability month slider, the 3D view turned by dragging, the IFC
// download, the guide price for the client only, and the phone layouts without sideways scroll.
import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'

const M = 'prj_hp23zk'
const EMAIL = { priya: 'priya.nair@studiooriel.example', isla: 'isla.brennan@lanternquay.example', marcus: 'marcus.lindqvist@halewick.example' } as const

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

test('an architect browses by category, checks a project, filters by month and opens a material in 3D', async ({ page }, info) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.getByTestId('nav-marketplace').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Marketplace' })).toBeVisible()
  await expect(page.getByTestId('category-structure')).toBeVisible()
  await expect(page.getByTestId('new-for-projects')).toBeVisible()
  await expect(page.getByTestId('checking-bar')).toContainText('Check materials against a project')

  // Check against Merrowgate Wharf from the strip.
  await page.getByTestId('checking-choose').click()
  await page.getByTestId(`pick-${M}`).click()
  await expect(page.getByTestId('checking-bar')).toContainText('Checking against Merrowgate Wharf')
  await expect(page.getByTestId('fit-summary')).toContainText('in time')
  await expect(page.getByTestId('category-structure')).toContainText('in time for Merrowgate Wharf')

  // A folder is a history entry; Back returns to the folders.
  await page.getByTestId('category-envelope').click()
  await page.waitForURL('**type=envelope**')
  await expect(page.getByTestId('folder-header')).toContainText('Envelope')
  await expect(page.getByTestId('discover-grid').locator('[data-testid^="card-"]')).toHaveCount(5)
  await page.goBack()
  await expect(page.getByTestId('category-folders')).toBeVisible()

  // The availability month slider.
  await page.getByTestId('filters-button').click()
  const slider = page.getByTestId('availability-slider')
  await slider.focus()
  await page.keyboard.press('Home')
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('availability-selected')).toHaveText(/^By the end of /)
  await expect(page).toHaveURL(/by=\d{4}-\d{2}-\d{2}/)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('active-filters')).toContainText('By the end of')
  await page.getByTestId('active-filters').getByRole('button', { name: /Remove filter/ }).first().click()
  await expect(page.getByTestId('category-folders')).toBeVisible()

  // The material page: 3D first, no price for the architect, turn it by dragging.
  await page.getByTestId('card-L-9F4CQQ').getByRole('link').first().click()
  await page.waitForURL('**/app/marketplace/L-9F4CQQ**')
  await expect(page.getByTestId('gallery-stage')).toHaveAttribute('data-kind', 'model')
  await expect(page.getByTestId('guide-price')).toHaveCount(0)
  await expect(page.getByTestId('seller-line')).toHaveCount(0)
  await expect(page.getByTestId('fit-text')).toContainText('Merrowgate Wharf')
  const viewer = page.getByTestId('model-viewer')
  const before = await viewer.getAttribute('data-yaw')
  const box = (await viewer.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect(viewer).not.toHaveAttribute('data-yaw', before!)
  await page.getByTestId('model-length').click()
  await expect(page.getByTestId('model-length')).toHaveText('Show close up')

  // The Revit-compatible IFC file.
  const [ifc] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-ifc').click()])
  const ifcPath = info.outputPath(ifc.suggestedFilename())
  await ifc.saveAs(ifcPath)
  const text = fs.readFileSync(ifcPath, 'utf8')
  expect(ifc.suggestedFilename()).toMatch(/\.ifc$/)
  expect(text.startsWith('ISO-10303-21;')).toBe(true)
  expect(text).toContain('IFCBEAM(')
  expect(text).not.toMatch(/prototype/i)
  expect(errors).toEqual([])
})

test('the client keeps the guide price and the seller details', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'isla')
  await page.goto('/app/marketplace/L-9F4CQQ')
  await expect(page.getByTestId('guide-price')).toContainText('per tonne')
  await expect(page.getByTestId('seller-line')).toContainText('Listed by a donor building owner')
  await page.goto('/app/marketplace')
  await page.getByTestId('sort-menu').click()
  await expect(page.getByRole('menuitemradio', { name: /Lowest guide price/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('the Marketplace, a folder, the Filters sheet, a material and Saved fit a phone', async ({ page }) => {
  const errors = watchErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'priya')
  for (const path of ['/app/marketplace', `/app/marketplace?project=${M}`, '/app/marketplace?type=structure', '/app/marketplace/L-9F4CQQ', '/app/marketplace/L-A945G6', '/app/saved']) {
    await page.goto(path)
    await expect(page.locator('main')).not.toBeEmpty()
    expect(await horizontalOverflow(page), path).toBe(0)
  }
  await page.goto('/app/marketplace?type=structure')
  await page.getByTestId('filters-button').click()
  await expect(page.getByTestId('filters-sheet')).toBeVisible()
  await expect(page.getByTestId('availability-slider')).toBeVisible()
  expect(await horizontalOverflow(page)).toBe(0)
  // Touch targets on the phone layout.
  await page.keyboard.press('Escape')
  // The project chosen earlier through the address is remembered, so the strip is checking against it.
  await page.goto('/app/marketplace')
  await expect(page.getByTestId('checking-bar')).toHaveAttribute('data-state', 'checking')
  for (const id of ['checking-change', 'checking-clear-compact']) expect((await page.getByTestId(id).boundingBox())!.height, id).toBeGreaterThanOrEqual(44)
  await page.getByTestId('checking-clear-compact').click()
  await expect(page.getByTestId('checking-bar')).toHaveAttribute('data-state', 'prompt')
  const choose = await page.getByTestId('checking-choose').boundingBox()
  expect(choose!.height).toBeGreaterThanOrEqual(44)
  const row = await page.getByTestId('category-row-structure').boundingBox()
  expect(row!.height).toBeGreaterThanOrEqual(44)
  expect(errors).toEqual([])
})
