// The spec sheet workbook (brief/09-V1-PRODUCT.md sections 5.6 and 13.14): re-open the file and compare cells,
// never bytes. P10: no cell, sheet name, property or file name carries a private string of any lot.
import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import type { World } from '../../domain/types'
import { createSeed, itemByTag, lotForItem, PERSONA_IDS as P, MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID } from '../../domain/seed/world'
import { PRODUCT_NAME } from '../../domain/constants'
import { EMPTY_STATE, LABELS } from '../../domain/reference/labels'
import { dateFormats } from '../../domain/dates'
import { lotPrivateStrings, projectPrivateStrings, INTERNAL_ID } from '../../domain/privacy/privateStrings'
import { publishLot } from '../../store/actions'
import { acceptProjectTerms, decideWish, saveToWishlist, sendWishlist } from '../../store/v1actions'
import { specSheetView, wishlistView } from '../../store/v1selectors'
import { buildSpecWorkbook, specFileName, SPEC_HEAD_ROWS } from './specExport'

const TH01 = 'L-9F4CQQ'
const OPEN_STEEL = 'L-NHZ32R'
const STONE = 'L-Q23X7N'
const BRICK = 'L-A945G6'
const SHARED = ['L-WPX5A6', 'L-MNY55K', 'L-2R8X5N']

function must(r: { world: World; error: string | null }): World {
  expect(r.error).toBeNull()
  return r.world
}

/** Merrowgate Wharf with items in every state: shared lots in confidence and open lots, approved, declined, sent and pending. */
function busyWorld(): World {
  let w = createSeed()
  const th01 = lotForItem(w, itemByTag(w, 'TH-01').id).id
  w = publishLot(w, th01, { visibility: 'open', ask: 800, reserve: 730 })
  w = must(acceptProjectTerms(w, P.priya, MERROWGATE_ID))
  for (const id of [TH01, SHARED[0], SHARED[1], STONE]) w = must(saveToWishlist(w, P.priya, id, MERROWGATE_ID))
  w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
  const items = wishlistView(w, P.priya, MERROWGATE_ID)!.rows.map((r) => r.item)
  const id = (publicId: string) => items.find((i) => i.publicId === publicId)!.id
  w = must(decideWish(w, P.isla, MERROWGATE_ID, id(TH01), 'approved', 'Good for the frame'))
  w = must(decideWish(w, P.isla, MERROWGATE_ID, id(SHARED[0]), 'approved', ''))
  w = must(decideWish(w, P.isla, MERROWGATE_ID, id(STONE), 'declined', 'Not this facade'))
  for (const pid of [OPEN_STEEL, BRICK, SHARED[2]]) w = must(saveToWishlist(w, P.priya, pid, MERROWGATE_ID))
  return w
}

async function reopen(buffer: ArrayBuffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  return wb
}

function text(cell: ExcelJS.Cell): string {
  const v = cell.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function rowValues(ws: ExcelJS.Worksheet, n: number): string[] {
  const out: string[] = []
  ws.getRow(n).eachCell({ includeEmpty: true }, (c, col) => {
    out[col - 1] = text(c)
  })
  return out
}

/** Every string in the workbook: cells, sheet names, creator and title. */
function allTexts(wb: ExcelJS.Workbook): string[] {
  const out = [wb.creator ?? '', wb.title ?? '']
  wb.eachSheet((ws) => {
    out.push(ws.name)
    ws.eachRow((row) => row.eachCell((c) => out.push(text(c))))
  })
  return out.filter((s) => s.length > 0)
}

/** The header row: the first row whose second cell is "Public ID". */
function headerRow(ws: ExcelJS.Worksheet): number {
  for (let n = 1; n <= ws.rowCount; n++) if (text(ws.getRow(n).getCell(2)) === 'Public ID') return n
  throw new Error('No header row on ' + ws.name)
}

describe('spec sheet workbook', () => {
  it('names the file from the project and the demo date', () => {
    expect(specFileName('Merrowgate Wharf')).toBe('merrowgate-wharf-specification-2026-10-07.xlsx')
    expect(specFileName("St. Anne's Yard (phase 2)")).toBe('st-anne-s-yard-phase-2-specification-2026-10-07.xlsx')
  })

  it('writes the approved sheet with the caveats first, a header row and one row per approved item', async () => {
    const w = busyWorld()
    const sheet = specSheetView(w, P.priya, MERROWGATE_ID, 'approved')!
    const wb = await reopen(await buildSpecWorkbook(sheet, 'approved'))
    expect(wb.creator).toBe(PRODUCT_NAME)
    expect(wb.title).toBe('Specification schedule, Merrowgate Wharf')
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Approved'])
    const ws = wb.getWorksheet('Approved')!
    expect(text(ws.getCell(`A${SPEC_HEAD_ROWS.title}`))).toBe('Specification schedule, Merrowgate Wharf')
    expect(text(ws.getCell(`A${SPEC_HEAD_ROWS.projectLine}`))).toBe('Office project. Materials needed on site from 3 April 2028.')
    expect(text(ws.getCell(`A${SPEC_HEAD_ROWS.state}`))).toBe('Approved by the client.')
    const caveats = sheet.caveats.map((_, i) => text(ws.getCell(`A${SPEC_HEAD_ROWS.firstCaveat + i}`)))
    expect(caveats).toEqual(sheet.caveats)
    expect(caveats).toContain(LABELS.L39)
    expect(caveats).toContain(LABELS.L20)

    const h = headerRow(ws)
    expect(h).toBe(SPEC_HEAD_ROWS.firstCaveat + sheet.caveats.length + 1)
    const head = rowValues(ws, h)
    expect(head.slice(0, 5)).toEqual(['Status', 'Public ID', 'Title', 'Typology', 'Family'])
    for (const col of ['Quantity', 'Mass', 'Condition', 'Availability', 'Timeline check', 'Avoided carbon', 'Sustainability band', 'Guide price']) expect(head).toContain(col)

    const body = [h + 1, h + 2].map((n) => rowValues(ws, n))
    expect(body.map((r) => r[1])).toEqual([TH01, SHARED[0]])
    expect(body.every((r) => r[0] === 'Approved')).toBe(true)
    expect(ws.rowCount).toBe(h + 2)
    // Each value sits under its own header: the spec sheet rows of the first block, cell by cell.
    const first = sheet.blocks[0]
    for (const r of first.rows) expect(body[0][head.indexOf(r.label)], r.label).toBe(r.value)
  })

  it('writes the draft as one sheet per state with the same columns, and leaves declined items out', async () => {
    const w = busyWorld()
    const sheet = specSheetView(w, P.priya, MERROWGATE_ID, 'draft')!
    const wb = await reopen(await buildSpecWorkbook(sheet, 'draft'))
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Approved', 'Sent to client', 'Pending'])
    const ids = (name: string) => {
      const ws = wb.getWorksheet(name)!
      const h = headerRow(ws)
      const out: string[] = []
      for (let n = h + 1; n <= ws.rowCount; n++) out.push(text(ws.getRow(n).getCell(2)))
      return out
    }
    expect(ids('Approved')).toEqual([TH01, SHARED[0]])
    expect(ids('Sent to client')).toEqual([SHARED[1]])
    expect(ids('Pending')).toEqual([BRICK, OPEN_STEEL, SHARED[2]].sort())
    expect(allTexts(wb).some((t) => t.includes(STONE))).toBe(false)
    const heads = wb.worksheets.map((ws) => rowValues(ws, headerRow(ws)).join('|'))
    expect(new Set(heads).size).toBe(1)
    expect(text(wb.getWorksheet('Pending')!.getCell(`A${SPEC_HEAD_ROWS.state}`))).toBe('Draft: not yet sent to the client.')
  })

  it('says nothing is here yet on an empty sheet', async () => {
    const sheet = specSheetView(createSeed(), P.priya, MERROWGATE_ID, 'approved')!
    const wb = await reopen(await buildSpecWorkbook(sheet, 'approved'))
    const ws = wb.getWorksheet('Approved')!
    expect(rowValues(ws, ws.rowCount)).toEqual([EMPTY_STATE])
  })

  it('P10: no private string of any lot, no internal ID, and nothing of other projects or of this project beyond its project line', async () => {
    const w = busyWorld()
    for (const which of ['approved', 'draft'] as const) {
      const sheet = specSheetView(w, P.priya, MERROWGATE_ID, which)!
      const wb = await reopen(await buildSpecWorkbook(sheet, which))
      const texts = [...allTexts(wb), specFileName(w.projects[MERROWGATE_ID].name)]
      const forbidden: string[] = []
      for (const lot of Object.values(w.lots)) {
        const item = w.items[lot.itemId]
        forbidden.push(...lotPrivateStrings(lot, item, w.buildings[item.buildingId], w))
      }
      for (const pid of [SALLOW_ID, FERRYMOOR_ID]) forbidden.push(...projectPrivateStrings(w.projects[pid], w).filter((s) => s !== 'Studio Oriel' && s !== 'Halewick Sustainability' && s !== 'Priya Nair'))
      const own = w.projects[MERROWGATE_ID]
      const allowed = new Set([own.name, ...dateFormats(own.startDate)])
      forbidden.push(...projectPrivateStrings(own, w).filter((s) => !allowed.has(s)))
      expect(forbidden.length).toBeGreaterThan(20)
      for (const t of texts) {
        for (const s of forbidden) expect(t.includes(s), `${which}: "${s}" in "${t}"`).toBe(false)
        expect(t, which).not.toMatch(INTERNAL_ID)
      }
    }
  })
})
