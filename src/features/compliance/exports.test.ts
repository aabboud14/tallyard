// Workbook tests (01 section 7 item 6, 04 section 4 P6): re-open each file and compare cells, never bytes.
import { describe, it, expect, beforeAll } from 'vitest'
import ExcelJS from 'exceljs'
import { writeFile, readFile, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { useStore } from '../../store/store'
import { runDemoSteps } from '../../store/demo'
import { buildComplianceWorkbook, buildWasteWorkbook, complianceFileName, wasteFileName } from './exports'
import { LABELS } from '../../domain/reference/labels'
import { PRODUCT_NAME } from '../../domain/constants'
import { dateFormats } from '../../domain/dates'
import { CERTIFICATION_ROWS } from '../../domain/reference/policy'
import { parameterRows } from '../../domain/reference/assumptions'
import * as f from '../../domain/format'

type CellText = { sheet: string; address: string; column: number; header: string; text: string }

function cellTexts(cell: ExcelJS.Cell): string[] {
  const v = cell.value
  if (v === null || v === undefined) return []
  if (typeof v === 'object') {
    if ('formula' in v) return [String(v.formula), v.result === undefined || v.result === null ? '' : String(v.result)]
    if ('richText' in v) return [v.richText.map((r) => r.text).join('')]
    if ('text' in v) return [String(v.text)]
    if (v instanceof Date) return [v.toISOString()]
    return [JSON.stringify(v)]
  }
  return [String(v)]
}

/** Every string in the workbook: cells (values, formulas and cached results), sheet names, creator and title. */
function allTexts(wb: ExcelJS.Workbook): CellText[] {
  const out: CellText[] = []
  out.push({ sheet: '', address: 'creator', column: 0, header: '', text: wb.creator ?? '' })
  out.push({ sheet: '', address: 'title', column: 0, header: '', text: wb.title ?? '' })
  wb.eachSheet((ws) => {
    out.push({ sheet: ws.name, address: 'name', column: 0, header: '', text: ws.name })
    const headers: string[] = []
    ws.getRow(1).eachCell((c, col) => {
      headers[col] = cellTexts(c).join(' ')
    })
    ws.eachRow((row) => {
      row.eachCell((cell, col) => {
        for (const t of cellTexts(cell)) out.push({ sheet: ws.name, address: cell.address, column: col, header: headers[col] ?? '', text: t })
      })
    })
  })
  return out
}

function sheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const ws = wb.getWorksheet(name)
  if (!ws) throw new Error('Missing sheet ' + name)
  return ws
}

/** The value cell (column B) of the Summary row whose label starts with the text. */
function summaryCell(wb: ExcelJS.Workbook, label: string): ExcelJS.Cell {
  const ws = sheet(wb, 'Summary')
  let found: ExcelJS.Cell | null = null
  ws.eachRow((row) => {
    const a = row.getCell(1).value
    if (!found && typeof a === 'string' && a.startsWith(label)) found = row.getCell(2)
  })
  if (!found) throw new Error('No Summary row ' + label)
  return found
}

function formulaOf(cell: ExcelJS.Cell): { formula: string; result: number } {
  const v = cell.value
  expect(v, `${cell.worksheet.name}!${cell.address} should hold a formula`).toBeTypeOf('object')
  expect(v).toHaveProperty('formula')
  const fv = v as ExcelJS.CellFormulaValue
  // The file holds <v>0</v> for a zero result, but the ExcelJS reader drops a zero cached value on load.
  const result = fv.result === undefined ? 0 : fv.result
  expect(typeof result, `${cell.worksheet.name}!${cell.address} should carry a cached result`).toBe('number')
  return { formula: fv.formula, result: result as number }
}

function lastRowWhere(ws: ExcelJS.Worksheet, column: number, text: string): ExcelJS.Row {
  let found: ExcelJS.Row | null = null
  ws.eachRow((row) => {
    if (row.getCell(column).value === text) found = row
  })
  if (!found) throw new Error(`No row with ${text} in ${ws.name}`)
  return found
}

async function reopen(buffer: ArrayBuffer, name: string, dir: string): Promise<ExcelJS.Workbook> {
  const file = path.join(dir, name)
  await writeFile(file, Buffer.from(buffer))
  const wb = new ExcelJS.Workbook()
  const bytes = await readFile(file)
  await wb.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ExcelJS.Buffer)
  return wb
}

const LOT_PRIVATE = ['Tiverne House', 'Garnet Row', 'EC2', 'City of London', 'Ostlea Estates', 'Corvane Insurance', 'Meridale Partners', 'TH-01', 'Tom Ashby', 'Dana Kowalski', 'Tarnbrook Deconstruction', ...dateFormats('2027-01-04'), ...dateFormats('2027-01-25'), ...dateFormats('2027-04-30')]
const HANDOVER = dateFormats('2027-03-15')
const PROJECT_PRIVATE = ['Merrowgate Wharf', 'Lantern Quay Developments', 'Studio Oriel', 'Priya Nair', 'E16', 'Newham', ...dateFormats('2028-04-03')]

describe('workbooks after the demo path, steps 1 to 11', () => {
  let compliance: ExcelJS.Workbook
  let waste: ExcelJS.Workbook
  let complianceName: string
  let wasteName: string

  beforeAll(async () => {
    await runDemoSteps(1, 11)
    const world = useStore.getState().world
    const dir = await mkdtemp(path.join(os.tmpdir(), 'tallyard-exports-'))
    complianceName = complianceFileName(world)
    wasteName = wasteFileName(world)
    compliance = await reopen(await buildComplianceWorkbook(world), complianceName, dir)
    waste = await reopen(await buildWasteWorkbook(world), wasteName, dir)
  }, 60_000)

  it('file names use the project or engagement name and the demo date', () => {
    expect(complianceName).toBe('merrowgate-wharf-compliance-2026-10-07.xlsx')
    expect(wasteName).toBe('durnley-house-waste-and-reuse-2026-10-07.xlsx')
  })

  it('document properties: creator and title only, dates from the demo date', () => {
    for (const wb of [compliance, waste]) {
      expect(wb.creator).toBe(PRODUCT_NAME)
      expect(wb.title).toBeTruthy()
      // ExcelJS always writes a lastModifiedBy property; it is left at the library default.
      expect(['', 'Unknown']).toContain(wb.lastModifiedBy ?? '')
      expect(wb.created.toISOString().slice(0, 10)).toBe('2026-10-07')
      expect(wb.modified.toISOString().slice(0, 10)).toBe('2026-10-07')
    }
    expect(compliance.title).toBe('Merrowgate Wharf compliance')
    expect(waste.title).toBe('Durnley House waste and reuse')
  })

  it('compliance workbook: the six sheets and the headline cells', () => {
    expect(compliance.worksheets.map((w) => w.name)).toEqual(['Summary', 'Bill of materials', 'Reused items', 'Embodied carbon', 'Certification mapping', 'Assumptions'])
    const secured = formulaOf(summaryCell(compliance, 'Reused and recycled content by value, secured'))
    expect(secured.result * 100).toBeCloseTo(20.0593, 4)
    expect(secured.formula).toContain("'Bill of materials'!")
    const without = formulaOf(summaryCell(compliance, 'Without reuse'))
    expect(without.result * 100).toBeCloseTo(17.6208, 4)
    const avoided = formulaOf(summaryCell(compliance, 'Upfront carbon avoided'))
    expect(avoided.result).toBeCloseTo(87.0921, 4)
    expect(avoided.formula).toContain("'Embodied carbon'!")
    const mass = formulaOf(summaryCell(compliance, 'Reclaimed material secured'))
    expect(mass.result).toBeCloseTo(126.956, 4)
    expect(f.massT(mass.result)).toBe('126.96 t')
    expect(mass.formula).toContain("'Reused items'!")
    expect(summaryCell(compliance, 'GIA').value).toBe(16500)
    expect(summaryCell(compliance, 'Status').value).toBe(LABELS.L17)
    expect(summaryCell(compliance, 'Policy basis').value).toBe(LABELS.L16)
  })

  it('compliance workbook: bill of materials lines and totals row by formula', () => {
    const ws = sheet(compliance, 'Bill of materials')
    expect(ws.getRow(1).values).toEqual([undefined, 'Line', 'Building element', 'Building layer', 'Mass (t)', 'Intensity (kg per m2 GIA)', 'Material value (£, excluding labour)', 'Recycled share of new material', 'Reused content (% by value)', 'Recycled content (% by value)', 'Reused and recycled value (£)'])
    const steel = lastRowWhere(ws, 1, 'Structural steel sections')
    expect(steel.getCell(6).value).toBe(1150000)
    expect(steel.getCell(7).value).toBe(0.25)
    expect(steel.getCell(8).value as number).toBeCloseTo(23.18976 / 1150, 6)
    const recycled = formulaOf(steel.getCell(9))
    expect(recycled.formula).toMatch(/^\(1-H\d+\)\*G\d+$/)
    expect(recycled.result).toBeCloseTo((1 - 23.18976 / 1150) * 0.25, 6)
    const value = formulaOf(steel.getCell(10))
    expect(value.formula).toMatch(/^F\d+\*\(H\d+\+I\d+\)$/)
    const intensity = formulaOf(steel.getCell(5))
    expect(intensity.result).toBeCloseTo((1150 * 1000) / 16500, 4)
    const stone = lastRowWhere(ws, 1, 'Stone cladding')
    expect(stone.getCell(8).value).toBe(1)
    const totals = lastRowWhere(ws, 1, 'Total')
    const totalMass = formulaOf(totals.getCell(4))
    expect(totalMass.formula).toBe('SUM(D2:D13)')
    expect(totalMass.result).toBeCloseTo(19658.9, 4)
    const totalValue = formulaOf(totals.getCell(6))
    expect(totalValue.result).toBe(11680600)
    const totalReused = formulaOf(totals.getCell(10))
    expect(totalReused.formula).toBe('SUM(J2:J13)')
    expect(totalReused.result).toBeCloseTo(2343052.32, 2)
    expect(formulaOf(totals.getCell(9)).result * 100).toBeCloseTo(20.0593, 4)
  })

  it('compliance workbook: reused items carry the public projection and the provenance label', () => {
    const ws = sheet(compliance, 'Reused items')
    expect(ws.getRow(1).values).toEqual([undefined, 'Public ID', 'Family', 'Description', 'Quantity', 'Unit', 'Mass (t)', 'Condition', 'Test status', 'Source type', 'Region', 'Provenance', 'Deal status', 'Handover date', 'Avoided carbon A1-A4 (tCO2e)'])
    const ids = [2, 3, 4].map((r) => ws.getRow(r).getCell(1).value)
    expect(ids).toEqual(['L-R8Q33F', 'L-5APGJ7', 'L-9F4CQQ'])
    const steel = ws.getRow(4)
    expect(steel.getCell(3).value).toBe('UB 457x191x67, 7.5 m')
    expect(steel.getCell(4).value).toBe(48)
    expect(steel.getCell(5).value).toBe('pieces')
    expect(steel.getCell(6).value as number).toBeCloseTo(24.156, 4)
    expect(steel.getCell(10).value).toBe('Central London')
    expect(steel.getCell(11).value).toBe(LABELS.L23)
    expect(steel.getCell(12).value).toBe('Confirmed')
    expect(steel.getCell(13).value).toBe('15 March 2027')
    expect(ws.getRow(2).getCell(4).value).toBe(520)
    expect(ws.getRow(3).getCell(4).value).toBe(3800)
    expect(ws.getRow(2).getCell(6).value).toBe(57.2)
    expect(ws.getRow(3).getCell(6).value).toBe(45.6)
  })

  it('compliance workbook: embodied carbon per item with the avoided and percent formulas and a total', () => {
    const ws = sheet(compliance, 'Embodied carbon')
    for (const r of [2, 3, 4]) {
      const avoided = formulaOf(ws.getRow(r).getCell(11))
      expect(avoided.formula).toBe(`(E${r}+F${r})-(I${r}+J${r})`)
      const parts = [5, 6, 9, 10].map((c) => ws.getRow(r).getCell(c).value as number)
      expect(avoided.result).toBeCloseTo(parts[0] + parts[1] - parts[2] - parts[3], 3)
      expect(formulaOf(ws.getRow(r).getCell(12)).formula).toBe(`K${r}/(E${r}+F${r})`)
    }
    const total = formulaOf(lastRowWhere(ws, 1, 'Total').getCell(11))
    expect(total.formula).toBe('SUM(K2:K4)')
    expect(total.result).toBeCloseTo(87.0921, 4)
    const texts = allTexts(compliance).filter((t) => t.sheet === 'Embodied carbon').map((t) => t.text)
    expect(texts).toContain(LABELS.L11)
  })

  it('compliance workbook: certification mapping rows, assumptions and the fixed labels on every sheet', () => {
    const texts = allTexts(compliance)
    for (const ws of compliance.worksheets) expect(texts.filter((t) => t.sheet === ws.name).map((t) => t.text), ws.name).toContain(LABELS.L20)
    expect(texts.filter((t) => t.sheet === 'Summary').map((t) => t.text)).toContain(LABELS.L16)
    const mapping = sheet(compliance, 'Certification mapping')
    const rows = CERTIFICATION_ROWS.filter((r) => r.workbook === 'compliance')
    rows.forEach((r, i) => {
      const row = mapping.getRow(2 + i)
      expect(row.getCell(1).value).toBe(r.requirement)
      expect(row.getCell(2).value).toBe(r.provides)
      expect(row.getCell(3).value).toBe(LABELS.L19)
    })
    const assumptions = sheet(compliance, 'Assumptions')
    expect(assumptions.getRow(1).values).toEqual([undefined, 'Parameter', 'Value', 'Unit', 'Source', 'Status'])
    const params = parameterRows()
    expect(assumptions.getRow(1 + params.length).getCell(5).value).toBe(params[params.length - 1].status)
  })

  it('P6: the compliance workbook holds no lot private string, and the handover date only in its own column', () => {
    const texts = allTexts(compliance)
    for (const s of [...LOT_PRIVATE, 'Durnley House', 'Pellory Estates']) {
      const hits = texts.filter((t) => t.text.includes(s))
      expect(hits, `"${s}" found in ${hits.map((h) => `${h.sheet}!${h.address}`).join(', ')}`).toEqual([])
    }
    for (const s of HANDOVER) {
      const hits = texts.filter((t) => t.text.includes(s))
      for (const h of hits) expect(h.header, `"${s}" at ${h.sheet}!${h.address}`).toBe('Handover date')
    }
    expect(texts.some((t) => t.header === 'Handover date' && t.text === '15 March 2027')).toBe(true)
    expect(complianceName).not.toMatch(/Tiverne|TH-01|Ostlea|Durnley|Pellory/i)
    expect(texts.some((t) => /\b(bld|itm)_[A-Za-z0-9]{6}\b/.test(t.text))).toBe(false)
  })

  it('waste workbook: the six sheets and the headline cells after the row 20 edit', () => {
    expect(waste.worksheets.map((w) => w.name)).toEqual(['Summary', 'Arisings', 'Recycling and waste reporting', 'Reuse carbon', 'Certification mapping', 'Assumptions'])
    const diversion = formulaOf(summaryCell(waste, 'Diversion from landfill'))
    expect(diversion.result * 100).toBeCloseTo(97.42845, 4)
    expect(diversion.formula).toContain("'Recycling and waste reporting'!")
    const reuse = formulaOf(summaryCell(waste, 'Reuse rate'))
    expect(reuse.result * 100).toBeCloseTo(3.09115, 4)
    const landfill = formulaOf(summaryCell(waste, 'Sent to landfill'))
    expect(landfill.result).toBeCloseTo(292.0, 4)
    expect(formulaOf(summaryCell(waste, 'Demolition waste counted')).result).toBeCloseTo(11355.0, 4)
    expect(formulaOf(summaryCell(waste, 'Components reused off site')).result).toBeCloseTo(351.0, 4)
    expect(formulaOf(summaryCell(waste, 'Recycled on site')).result).toBeCloseTo(1200.0, 4)
    expect(formulaOf(summaryCell(waste, 'Tonnes per m2 GIA')).result).toBeCloseTo(0.71867, 4)
    const hazardous = formulaOf(summaryCell(waste, 'Hazardous waste'))
    expect(hazardous.formula).toMatch(/^SUMIF\('Arisings'!K2:K21,"Yes",'Arisings'!I2:I21\)$/)
    expect(hazardous.result).toBeCloseTo(14.2, 4)
    expect(formulaOf(summaryCell(waste, 'Potential carbon benefit')).result).toBeCloseTo(461.42909, 4)
    expect(summaryCell(waste, 'Stated total on the bill').value).toBeCloseTo(11369.2, 4)
    const sum = formulaOf(summaryCell(waste, 'Sum of all rows read'))
    expect(sum.formula).toBe("SUM('Arisings'!I2:I21)")
    expect(sum.result).toBeCloseTo(11369.2, 4)
    expect(summaryCell(waste, 'Stated total check').value).toBe('Stated total 11,369.2 t matches the rows')
    expect(summaryCell(waste, 'Rows read').value).toBe(20)
    expect(summaryCell(waste, 'Rows skipped').value).toBe('2 title rows and 1 total row skipped')
    expect(formulaOf(summaryCell(waste, 'Rows awaiting review')).result).toBe(0)
    expect(summaryCell(waste, 'Status').value).toBe(LABELS.L18)
    expect(summaryCell(waste, 'Policy basis').value).toBe(LABELS.L16)
    expect(summaryCell(waste, 'GIA').value).toBe(15800)
  })

  it('waste workbook: arisings keep the original text beside the normalised values', () => {
    const ws = sheet(waste, 'Arisings')
    expect(ws.getRow(1).values).toEqual([undefined, 'Row', 'Original description', 'Original code', 'Original quantity', 'Original unit', 'Original route', 'Stream', 'EWC code', 'Tonnes', 'Destination', 'Hazardous', 'Confidence'])
    const r5 = ws.getRow(6)
    expect(r5.getCell(1).value).toBe(5)
    expect(r5.getCell(4).value).toBe('212400')
    expect(r5.getCell(5).value).toBe('kg')
    expect(r5.getCell(7).value).toBe('Iron and steel')
    expect(r5.getCell(9).value).toBeCloseTo(212.4, 6)
    expect(r5.getCell(10).value).toBe('Reused off site')
    expect(r5.getCell(12).value).toBe('Medium')
    const r2 = ws.getRow(3)
    expect(r2.getCell(3).value).toBe('170101')
    expect(r2.getCell(8).value).toBe('17 01 01')
    expect(r2.getCell(10).value).toBe('Recycled on site')
    const r19 = ws.getRow(20)
    expect(r19.getCell(11).value).toBe('Yes')
    expect(r19.getCell(12).value).toBe('High')
    const r20 = ws.getRow(21)
    expect(r20.getCell(7).value).toBe('Mixed construction and demolition waste')
    expect(r20.getCell(10).value).toBe('Landfill')
    expect(r20.getCell(12).value).toBe('Edited')
  })

  it('waste workbook: recycling and waste reporting fills the demolition row by formula', () => {
    const ws = sheet(waste, 'Recycling and waste reporting')
    expect(ws.getRow(1).values).toEqual([undefined, 'Waste type', 'Overall waste (t)', 'Tonnes per m2 GIA', 'Reused on site (%)', 'Reused off site (%)', 'Recycled on site (%)', 'Recycled off site (%)', 'To landfill (%)', 'To other management (%)'])
    expect(ws.getRow(2).getCell(1).value).toBe('Excavation waste')
    expect(ws.getRow(2).getCell(2).value).toBe('Not in this bill')
    expect(ws.getRow(4).getCell(2).value).toBe('Not in this bill')
    expect(ws.getRow(5).getCell(2).value).toBe('Not in this bill')
    const d = ws.getRow(3)
    expect(d.getCell(1).value).toBe('Demolition waste')
    const overall = formulaOf(d.getCell(2))
    expect(overall.result).toBeCloseTo(11355.0, 4)
    expect(formulaOf(d.getCell(3)).result).toBeCloseTo(0.71867, 4)
    const expected = [0, 3.0911, 10.568, 82.686, 2.5716, 1.0832]
    expected.forEach((pct, i) => {
      const cell = formulaOf(d.getCell(4 + i))
      expect(cell.formula).toMatch(/^B\d+\/B\d+$/)
      expect(cell.result * 100).toBeCloseTo(pct, 3)
    })
    const helperTotal = lastRowWhere(ws, 1, 'Total counted, non-hazardous')
    const total = formulaOf(helperTotal.getCell(2))
    expect(total.formula).toMatch(/^SUM\(B\d+:B\d+\)$/)
    expect(total.result).toBeCloseTo(11355.0, 4)
    expect(lastRowWhere(ws, 1, 'Landfill').getCell(2).value).toBeCloseTo(292.0, 4)
  })

  it('waste workbook: reuse carbon rows with the benefit formula, a total and the module D label', () => {
    const ws = sheet(waste, 'Reuse carbon')
    const rows = [2, 3, 4, 5, 6].map((r) => ws.getRow(r))
    expect(rows.map((r) => r.getCell(1).value)).toEqual([4, 5, 8, 10, 14])
    const expected = [7.6544, 358.956, 63.90909, 3.78, 27.1296]
    rows.forEach((r, i) => {
      const b = formulaOf(r.getCell(9))
      expect(b.result).toBeCloseTo(expected[i], 4)
      expect(b.formula).toMatch(/^(D\d+\*\(G\d+-H\d+\)|E\d+\*\(G\d+-H\d+\)\/1000)$/)
    })
    expect(rows[2].getCell(5).value as number).toBeCloseTo(345.4545, 3)
    expect(rows[4].getCell(5).value as number).toBeCloseTo(864, 3)
    const total = formulaOf(lastRowWhere(ws, 1, 'Total').getCell(9))
    expect(total.formula).toBe('SUM(I2:I6)')
    expect(total.result).toBeCloseTo(461.42909, 4)
    expect(allTexts(waste).filter((t) => t.sheet === 'Reuse carbon').map((t) => t.text)).toContain(LABELS.L13)
  })

  it('waste workbook: certification mapping rows and the fixed labels on every sheet', () => {
    const texts = allTexts(waste)
    for (const ws of waste.worksheets) expect(texts.filter((t) => t.sheet === ws.name).map((t) => t.text), ws.name).toContain(LABELS.L20)
    expect(texts.filter((t) => t.sheet === 'Summary').map((t) => t.text)).toContain(LABELS.L16)
    const mapping = sheet(waste, 'Certification mapping')
    const rows = CERTIFICATION_ROWS.filter((r) => r.workbook === 'waste')
    expect(rows).toHaveLength(4)
    rows.forEach((r, i) => {
      const row = mapping.getRow(2 + i)
      expect(row.getCell(1).value).toBe(r.requirement)
      expect(row.getCell(3).value).toBe(LABELS.L19)
    })
  })

  it('P6: the waste workbook holds no Merrowgate Wharf project string', () => {
    const texts = allTexts(waste)
    for (const s of PROJECT_PRIVATE) {
      const hits = texts.filter((t) => t.text.includes(s))
      expect(hits, `"${s}" found in ${hits.map((h) => `${h.sheet}!${h.address}`).join(', ')}`).toEqual([])
    }
    expect(wasteName).not.toMatch(/Merrowgate|Lantern/i)
  })

  it('no em or en dash in either workbook', () => {
    const dashes = new RegExp('[' + String.fromCharCode(0x2013) + String.fromCharCode(0x2014) + ']')
    for (const wb of [compliance, waste]) {
      for (const t of allTexts(wb)) expect(t.text, `${t.sheet}!${t.address}`).not.toMatch(dashes)
    }
  })
})
