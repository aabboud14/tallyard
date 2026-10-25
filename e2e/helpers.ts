import { test as base, expect, type Page } from '@playwright/test'
import ExcelJS from 'exceljs'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { createSeed } from '../src/domain/seed/world'
import { lotPrivateStrings, projectPrivateStrings, INTERNAL_ID } from '../src/domain/privacy/privateStrings'
import { dateFormats } from '../src/domain/dates'
import { LABELS } from '../src/domain/reference/labels'

export const test = base.extend<{ entry: string }>({
  // oxlint-disable-next-line no-empty-pattern
  entry: async ({}, use, testInfo) => {
    await use(testInfo.project.metadata.entry as string)
  },
  page: async ({ page }, use, testInfo) => {
    if (testInfo.project.name === 'single-file') {
      page.on('request', (req) => {
        const url = req.url()
        if (!/^(file:|data:|blob:)/.test(url)) {
          throw new Error('Network request in the single-file build: ' + url)
        }
      })
    }
    await use(page)
  },
})

export { expect }

export const P = { tom: 'per_tom', dana: 'per_dana', priya: 'per_priya', isla: 'per_isla', marcus: 'per_marcus', operator: 'per_operator' }

export const seed = createSeed()

function allLotPrivateStrings(): string[] {
  const out = new Set<string>()
  for (const lot of Object.values(seed.lots)) {
    const item = seed.items[lot.itemId]
    for (const s of lotPrivateStrings(lot, item, seed.buildings[item.buildingId], seed)) out.add(s)
  }
  out.add('TH-12')
  for (const s of dateFormats('2027-01-25')) out.add(s)
  return [...out]
}

/** Every lot private string in the seed, plus the step 1 tag and its expected date (04 section 4, 09 section 13.3). */
export const LOT_PRIVATE = allLotPrivateStrings()
/** Exchanged after confirmation (04 section 3, rule 3) for the two parties to the deal, plus the tested date derived from the handover (rule 15). */
export const EXCHANGED = ['Ostlea Estates', 'Tom Ashby', ...dateFormats('2027-03-15'), ...dateFormats('2027-03-29')]
/** The private strings of one project, or of every project in the seed. */
export const projectPrivate = (projectId: string) => projectPrivateStrings(seed.projects[projectId], seed)
export const ALL_PROJECT_PRIVATE = [...new Set(Object.keys(seed.projects).flatMap(projectPrivate))]

export async function open(page: Page, entry: string, hash = '/') {
  await page.goto(entry + '#' + hash)
  await page.waitForSelector('main')
}

export async function go(page: Page, hash: string) {
  await page.evaluate((h) => {
    window.location.hash = h
  }, hash)
  await page.waitForSelector('main')
}

export async function setPersona(page: Page, id: string) {
  await page.getByTestId('persona-switcher').selectOption(id)
}

/** "Set up to here" for step n through the demo script panel: replays steps 1 to n - 1, then opens step n. */
export async function setUpTo(page: Page, n: number) {
  await page.getByTestId('open-demo-script').click()
  await page.getByTestId(`demo-setup-${n}`).click()
  await expect(page.getByTestId('demo-script-panel')).toBeHidden({ timeout: 60_000 })
}

export async function resetDemo(page: Page) {
  await page.getByTestId('reset-demo').click()
  await expect(page.getByTestId('persona-card-per_tom')).toBeVisible()
}

/** A fresh seed: open the app, reset the demo data, and land on the role picker. */
export async function fresh(page: Page, entry: string) {
  await open(page, entry)
  await resetDemo(page)
}

export async function mainText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const main = document.querySelector('main')!
    const links = [...main.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '').filter((h) => !/^(data:|blob:)/.test(h))
    return main.textContent + '\n' + links.join('\n')
  })
}

export const label = (page: Page, id: keyof typeof LABELS) => expect(page.getByTestId(`label-${id}`).first()).toContainText(LABELS[id])

/**
 * The private string as a pattern. A string that starts or ends with a digit must not touch another digit there, so the
 * private date "1 Mar 2027" is not read inside the public quarter end "31 Mar 2027". Every other character must match.
 */
export function privatePattern(s: string): RegExp {
  const body = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp((/^\d/.test(s) ? '(?<!\\d)' : '') + body + (/\d$/.test(s) ? '(?!\\d)' : ''))
}

/** P3: buyer-side rendered content holds no lot private string and no internal ID. */
export async function expectNoLotPrivate(page: Page, allowExchanged = false) {
  const text = await mainText(page)
  for (const s of LOT_PRIVATE) {
    if (allowExchanged && EXCHANGED.includes(s)) continue
    expect(text, `buyer-side content leaks "${s}"`).not.toMatch(privatePattern(s))
  }
  expect(text).not.toMatch(INTERNAL_ID)
}

/** P4: seller-side rendered content holds none of the given project private strings. */
export async function expectNoProjectPrivate(page: Page, strings: string[] = ALL_PROJECT_PRIVATE) {
  const text = await mainText(page)
  for (const s of strings) expect(text, `seller-side content leaks "${s}"`).not.toMatch(privatePattern(s))
}

/** P11 (09 section 13.14): no deal, offer, mandate or negotiation control and no such words, anywhere on the page. */
export async function expectArchitectOnly(page: Page) {
  const found = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid') ?? '').filter((id) => /negotiat|mandate|buyer-approve|offer|deal/i.test(id))
    const text = document.body.innerText
    const words = ['Negotiation', 'Mandate', 'Deals'].filter((w) => text.includes(w))
    return { ids, words }
  })
  expect(found.ids, 'architect route holds a deal control').toEqual([])
  expect(found.words, 'architect route holds deal words').toEqual([])
}

export async function expectNoHorizontalScroll(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  expect(r.sw, `page scrolls horizontally: ${r.sw} > ${r.iw}`).toBeLessThanOrEqual(r.iw)
}

/** Every visible control on the page is at least 44 px tall. A checkbox or radio counts by its label. */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll('button, input, select, textarea, [role="button"]')) {
      const h = el as HTMLElement
      const style = getComputedStyle(h)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      const input = h as HTMLInputElement
      const target = input.type === 'checkbox' || input.type === 'radio' ? (h.closest('label') ?? h) : h
      const r = target.getBoundingClientRect()
      if (r.width <= 1 || r.height <= 1) continue
      if (r.height < 44) out.push(`${h.tagName} ${h.id || h.dataset.testid || h.textContent?.trim().slice(0, 30) || ''} ${r.height}`)
    }
    return out
  })
  expect(small, 'touch targets under 44 px').toEqual([])
}

const PRIVATE_IN_ROUTE = ['TH-', 'HC-', 'OS-', 'Tiverne', 'Harrowden', 'Merrowgate', 'Sallow', 'Ferrymoor', 'Durnley', 'Ostlea', 'Brackwater', 'Pellory', 'Quillon', 'Lantern']

/** P7: routes carry opaque IDs only. */
export function assertRoute(page: Page) {
  const h = decodeURIComponent(page.url().split('#')[1] ?? '')
  for (const s of PRIVATE_IN_ROUTE) expect(h, 'route carries a private name: ' + h).not.toContain(s)
}

/** Clicks the trigger, saves the download into the test's output folder, and returns its name and path. */
export async function download(page: Page, trigger: () => Promise<void>, outputDir: string): Promise<{ name: string; file: string }> {
  const wait = page.waitForEvent('download')
  await trigger()
  const d = await wait
  const name = d.suggestedFilename()
  const file = path.join(outputDir, name)
  await d.saveAs(file)
  return { name, file }
}

export async function textOf(file: string): Promise<string> {
  return readFile(file, 'utf8')
}

/** Every cell, sheet name and document property of a workbook, as one string. */
export async function workbookText(file: string): Promise<{ text: string; sheets: string[] }> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  const all: string[] = [wb.creator ?? '', wb.title ?? '', wb.subject ?? '', wb.description ?? '', wb.keywords ?? '', wb.lastModifiedBy ?? '', wb.company ?? '']
  wb.eachSheet((ws) => {
    all.push(ws.name)
    ws.eachRow((row) => row.eachCell((c) => all.push(String(c.text ?? ''))))
  })
  return { text: all.join('\n'), sheets: wb.worksheets.map((w) => w.name) }
}

/** P10: a file the architect downloads holds no lot private string and no internal ID. */
export function expectNoLotPrivateIn(text: string, what: string) {
  for (const s of LOT_PRIVATE) expect(text, `${what} leaks "${s}"`).not.toMatch(privatePattern(s))
  expect(text).not.toMatch(INTERNAL_ID)
}
