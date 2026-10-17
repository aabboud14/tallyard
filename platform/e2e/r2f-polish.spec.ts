// The last polish before the platform goes back to the partner (feedback/r2f-polish.md), in the built app at 390,
// 1024 and 1440 px: the consultant's overview leads with his own section; every stage band keeps its words inside
// itself and the today marker crosses no axis label; the donor building card keeps its drawing in its own column;
// the testing request sheet keeps its titles readable; Help's topics are all in view on a phone; and a tap leaves no
// tooltip open in the drawer.
import { expect, test, type Page } from '@playwright/test'

const EMAIL = {
  priya: 'priya.nair@studiooriel.example',
  tom: 'tom.ashby@ostlea.example',
  marcus: 'marcus.lindqvist@halewick.example',
} as const
const MERROWGATE = 'prj_hp23zk'
const TIVERNE = 'bld_zad898'

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

/** Every stage band's words inside its band, the today marker clear of the axis labels, and no overlay over a band. */
async function expectChartClean(page: Page, label: string) {
  const report = await page.getByTestId('programme-chart').evaluate((chart) => {
    const out: string[] = []
    const box = (e: Element) => e.getBoundingClientRect()
    for (const band of chart.querySelectorAll<HTMLElement>('[data-part="stage-band"]')) {
      const b = box(band)
      if (b.width === 0) continue
      const t = band.querySelector('[data-part="stage-text"]')
      if (!t) continue
      const r = box(t)
      if (r.width > 0 && (r.left < b.left - 0.5 || r.right > b.right + 0.5)) out.push(`stage ${band.textContent} text ${Math.round(r.left)} to ${Math.round(r.right)} outside its band ${Math.round(b.left)} to ${Math.round(b.right)}`)
      // The pointer at a band's middle reaches that band, never words or a marker drawn over it.
      if (b.width >= 4) {
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
        if (!hit || hit.closest('[data-part="stage-band"]') !== band) out.push(`the pointer at stage ${band.textContent} reaches ${hit?.outerHTML.slice(0, 80)}`)
      }
    }
    const marker = chart.querySelector('[data-part="today-marker"]')
    const line = chart.querySelector('[data-part="today"]')
    if (marker && line) {
      const m = box(marker)
      const l = box(line)
      for (const tick of chart.querySelectorAll('[data-part="tick-label"]')) {
        const k = box(tick)
        if (k.width === 0) continue
        if (k.bottom > l.top + 0.5 && k.right > l.left && k.left < l.right) out.push(`the today line runs through the axis label ${tick.textContent}`)
        if (k.bottom > m.top + 0.5 && k.right > m.left && k.left < m.right) out.push(`the today marker covers the axis label ${tick.textContent}`)
      }
      const drawn = Array.from(chart.querySelectorAll('[data-part="stage-band"]')).map(box).filter((r) => r.width > 0)
      if (drawn.length > 0 && m.bottom > Math.min(...drawn.map((r) => r.top)) + 0.5) out.push('the today marker runs into the stage lane')
    }
    return out
  })
  expect(report, label).toEqual([])
}

test("the consultant's overview leads with his own section, and the programme follows (note 42)", async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'marcus')
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height })
    await page.goto(`/app/projects/${MERROWGATE}`)
    await expect(page.getByTestId('consultant-overview')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    const own = (await page.getByTestId('consultant-overview').boundingBox())!
    const programme = (await page.getByTestId('programme-card').boundingBox())!
    expect(own.y, `consultant section at ${width}`).toBeLessThan(height * 0.6)
    expect(programme.y, `programme after the consultant section at ${width}`).toBeGreaterThan(own.y + own.height - 1)
    expect(await horizontalOverflow(page), `${width} px`).toBe(0)
  }
  expect(errors).toEqual([])
})

test('stage bands keep their words inside themselves and the today marker crosses no label (note 17)', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.goto('/app/projects/new')
  await page.getByTestId('project-name').fill('Corbel Yard')
  await page.getByTestId('project-start').fill('2027-09-06')
  await page.getByTestId('create-project').click()
  await page.waitForURL('**/app/projects/prj_*')
  const corbel = new URL(page.url()).pathname
  for (const path of [`/app/projects/${MERROWGATE}`, corbel]) {
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      await expect(page.getByTestId('programme-chart')).toBeVisible()
      await expect(page.locator('[data-part="today-stage"]')).toHaveText('Today: stage 2, Concept Design')
      await expect(page.locator('[data-part="today-marker"]')).toHaveText('Today')
      await expectChartClean(page, `${path} at ${width}`)
      // From today too.
      await page.getByTestId('programme-card').getByText('From today', { exact: true }).click()
      await expectChartClean(page, `${path} from today at ${width}`)
      await page.getByTestId('programme-card').getByText('Whole programme', { exact: true }).click()
      expect(await horizontalOverflow(page), `${path} at ${width}`).toBe(0)
    }
  }
  // The band after today's stage takes the pointer: its own tooltip opens on hover.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(corbel)
  const next = page.locator('[data-part="stage-band"][data-state="current"] ~ [data-part="stage-band"]').first()
  await next.hover()
  await expect(page.getByRole('tooltip')).toContainText('Stage 3, Spatial Coordination, ')
  expect(errors).toEqual([])
})

test("Tom's new project chart keeps every band's words inside the plot at 390 (note 17)", async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'tom')
  await page.goto('/app/buildings?new=project')
  await page.getByTestId('nb-name').fill('Wexcombe House')
  await page.getByTestId('nb-region').selectOption('Central London')
  await page.getByTestId('nb-local-authority').selectOption('Camden')
  await page.getByTestId('nb-project-type').selectOption('office')
  await page.getByTestId('nb-start').fill('2027-09-20')
  await page.getByTestId('new-building-save').click()
  await page.waitForURL('**/app/projects/prj_*')
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByTestId('programme-chart')).toBeVisible()
    await expectChartClean(page, `Wexcombe House at ${width}`)
    const plot = (await page.locator('[data-part="plot"]').boundingBox())!
    for (const text of await page.locator('[data-part="stage-text"]').all()) {
      const b = await text.boundingBox()
      if (!b || b.width === 0) continue
      expect(b.x + b.width, `stage text inside the plot at ${width}`).toBeLessThanOrEqual(plot.x + plot.width + 0.5)
    }
  }
  expect(errors).toEqual([])
})

test("Tom's donor building card keeps its drawing in its own column (note 8)", async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'tom')
  for (const width of [1024, 1280, 1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/app/home')
    const card = page.getByTestId(`home-building-${TIVERNE}`)
    await expect(card).toBeVisible()
    const drawing = (await card.locator('[data-kind="illustration"]').first().boundingBox())!
    const title = (await card.getByRole('link', { name: 'Tiverne House' }).boundingBox())!
    const address = (await card.getByText('14 Garnet Row, London EC2').boundingBox())!
    if (width >= 640) {
      expect(drawing.x + drawing.width, `drawing beside the text at ${width}`).toBeLessThanOrEqual(title.x)
      expect(drawing.x + drawing.width, `drawing beside the address at ${width}`).toBeLessThanOrEqual(address.x)
    } else {
      expect(drawing.y + drawing.height, `drawing above the text at ${width}`).toBeLessThanOrEqual(title.y)
    }
    expect(await horizontalOverflow(page), `${width} px`).toBe(0)
  }
  expect(errors).toEqual([])
})

test('the testing request sheet keeps each item title readable beside a long location (note 9)', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'tom')
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/app/buildings/${TIVERNE}/testing`)
    await page.getByTestId('testing-view').first().click()
    const items = page.getByTestId('testing-sheet-items')
    await expect(items).toContainText('TH-05')
    for (const tag of ['TH-03', 'TH-05']) {
      const row = items.locator('li').filter({ hasText: tag })
      const title = (await row.locator('span').nth(1).boundingBox())!
      if (width >= 640) expect(title.width, `${tag} title at ${width}`).toBeGreaterThanOrEqual(192)
      // At most two lines of title, never one word per line.
      expect(title.height, `${tag} title at ${width}`).toBeLessThanOrEqual(48)
    }
    await page.keyboard.press('Escape')
  }
  expect(errors).toEqual([])
})

test("every Help topic stays in view on a phone, the first one too (note 16)", async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.setViewportSize({ width: 390, height: 844 })
  for (const topic of ['getting-started', 'methodology', 'version-2', 'updated']) {
    await page.goto(`/app/help/${topic}`)
    await expect(page.getByTestId(`help-${topic}`)).toHaveAttribute('aria-current', 'page')
    for (const t of ['getting-started', 'methodology', 'version-2', 'updated']) {
      const b = (await page.getByTestId(`help-${t}`).boundingBox())!
      expect(b.x, `${t} on ${topic}`).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width, `${t} on ${topic}`).toBeLessThanOrEqual(390)
      expect(b.height, `${t} on ${topic}`).toBeGreaterThanOrEqual(44)
    }
    expect(await horizontalOverflow(page), topic).toBe(0)
  }
  expect(errors).toEqual([])
})

test('a tap on the sidebar sort control leaves no tooltip over the drawer (note 15)', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London' })
  const page = await context.newPage()
  const errors = watchErrors(page)
  await page.goto('/signin')
  await page.getByTestId(`sample-${EMAIL.priya}`).tap()
  await page.waitForURL('**/app/home')
  await page.getByTestId('open-menu').tap()
  const sort = page.getByTestId('nav-drawer').getByTestId('nav-projects-menu')
  await sort.tap()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.getByTestId('nav-order-recent').tap()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await page.waitForTimeout(600)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await sort.tap()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  expect(errors).toEqual([])
  await context.close()
})
