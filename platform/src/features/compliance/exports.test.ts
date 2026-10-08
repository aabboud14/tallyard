// The compliance and waste workbooks: the sheets, the cached figures, and no seller-private string in the
// consultant's compliance workbook.
import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { DURNLEY_ID, MERROWGATE_ID } from '../../domain/seed/world'
import { lotPrivateStrings } from '../../domain/privacy/privateStrings'
import { SAMPLE_BILL_XLSX_BASE64 } from '../../domain/reference/samples'
import { base64ToArrayBuffer, cellsFromArrayBuffer } from '../../domain/engines/billXlsx'
import { FORBIDDEN } from '../../ui/testing'
import { complianceWorkbookModel } from '../../store/selectors/roles-views'
import { wasteView } from '../../store/selectors/consultant'
import { loadWasteBill } from '../../store/actions/consultant'
import { buildComplianceWorkbook } from './exports'
import { buildWasteWorkbook } from '../waste/exports'

async function read(buffer: ArrayBuffer) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  return wb
}

function texts(wb: ExcelJS.Workbook): string[] {
  const out: string[] = []
  wb.eachSheet((ws) =>
    ws.eachRow((row) =>
      row.eachCell((c) => {
        const v = c.value
        if (typeof v === 'string') out.push(v)
        else if (v && typeof v === 'object' && 'result' in v && typeof v.result === 'string') out.push(v.result)
      }),
    ),
  )
  return out
}

describe('Compliance workbook', () => {
  it('holds the summary, bill of materials, reused items, mapping and assumptions with cached results', async () => {
    const s = fresh()
    const m = complianceWorkbookModel(s, viewer(U.marcus), MERROWGATE_ID)!
    const wb = await read(await buildComplianceWorkbook(m))
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Summary', 'Bill of materials', 'Reused items', 'Certification mapping', 'Assumptions'])
    const summary = wb.getWorksheet('Summary')!
    const secured = summary.getRow(8).getCell(2).value as ExcelJS.CellFormulaValue
    expect(summary.getRow(8).getCell(1).value).toBe('Reused and recycled content by value, secured')
    expect(secured.formula).toContain("'Bill of materials'!J")
    expect(secured.result).toBeCloseTo(m.securedPercent, 12)
    const items = wb.getWorksheet('Reused items')!
    expect(items.rowCount).toBeGreaterThanOrEqual(m.items.length + 1)
    expect(items.getRow(2).getCell(1).value).toBe(m.items[0].publicId)
  })

  it('carries no seller-private string and no forbidden character', async () => {
    const s = fresh()
    const wb = await read(await buildComplianceWorkbook(complianceWorkbookModel(s, viewer(U.marcus), MERROWGATE_ID)!))
    const all = texts(wb).join('\n')
    for (const lot of Object.values(s.world.lots)) {
      const item = s.world.items[lot.itemId]
      for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) expect(all, x).not.toContain(x)
    }
    expect(all).not.toMatch(/[\u2013\u2014]/)
    expect(texts(wb).filter((t) => FORBIDDEN.test(t) && !t.startsWith('='))).toEqual([])
  })
})

describe('Waste workbook', () => {
  it('reports diversion and the reuse carbon from the loaded bill', async () => {
    const s0 = fresh()
    const cells = await cellsFromArrayBuffer(base64ToArrayBuffer(SAMPLE_BILL_XLSX_BASE64))
    const s = must(loadWasteBill(s0, actor(U.marcus), DURNLEY_ID, cells)).state
    const v = wasteView(s, viewer(U.marcus), DURNLEY_ID)!
    const wb = await read(await buildWasteWorkbook(v))
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Summary', 'Arisings', 'Recycling and waste reporting', 'Reuse carbon', 'Certification mapping', 'Assumptions'])
    const diversion = wb.getWorksheet('Summary')!.getRow(8).getCell(2).value as ExcelJS.CellFormulaValue
    expect(diversion.result).toBeCloseTo(v.rates!.diversionRate, 12)
    const helper = wb.getWorksheet('Recycling and waste reporting')!
    expect(helper.getRow(13).getCell(1).value).toBe('Landfill')
    expect(helper.getRow(13).getCell(2).value).toBeCloseTo(v.rates!.byDestination.landfill, 9)
    expect(wb.getWorksheet('Arisings')!.rowCount).toBeGreaterThanOrEqual(v.bill!.rows.length + 1)
  })

  it('says so when no bill is loaded', async () => {
    const v = wasteView(fresh(), viewer(U.marcus), DURNLEY_ID)!
    const wb = await read(await buildWasteWorkbook(v))
    expect(texts(wb)).toContain('No bill has been imported')
  })
})
