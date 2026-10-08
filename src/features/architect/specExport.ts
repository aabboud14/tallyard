// The spec sheet workbook (brief/09-V1-PRODUCT.md sections 3.3, 5.6 and 13.14). It writes what specSheetView
// returns and nothing else, so it carries public listing fields and the architect's own project line only.
import ExcelJS from 'exceljs'
import type { SpecSheet } from '../../domain/v1types'
import { DEMO_TODAY, PRODUCT_NAME } from '../../domain/constants'
import { EMPTY_STATE } from '../../domain/reference/labels'
import { specCells, specColumns, specGroups, type SpecWhich } from '../../store/views/architectProject'

/** merrowgate-wharf-specification-2026-10-07.xlsx */
export function specFileName(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'project'}-specification-${DEMO_TODAY}.xlsx`
}

function demoDate(): Date {
  const [y, m, d] = DEMO_TODAY.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Rows above the table on every sheet: the title, the project line, the state line, then each caveat. */
export const SPEC_HEAD_ROWS = { title: 1, projectLine: 2, state: 3, firstCaveat: 4 } as const

/**
 * One sheet per state (Approved; for the draft also Sent to client and Pending), each with the caveats in the
 * first rows, then a header row and one row per item. Every sheet has the same columns.
 */
export async function buildSpecWorkbook(sheet: SpecSheet, which: SpecWhich): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = PRODUCT_NAME
  wb.title = sheet.title
  wb.created = demoDate()
  wb.modified = demoDate()

  const columns = specColumns(sheet.blocks)
  const labels = ['Status', ...columns.map((c) => c.label)]
  for (const g of specGroups(sheet, which)) {
    const ws = wb.addWorksheet(g.label)
    ws.columns = labels.map((l, i) => ({ width: i === 0 ? 16 : Math.min(44, Math.max(14, l.length + 4)) }))
    ws.addRow([sheet.title]).font = { bold: true, size: 13 }
    ws.addRow([sheet.projectLine])
    ws.addRow([g.line])
    for (const c of sheet.caveats) ws.addRow([c]).font = { italic: true }
    ws.addRow([])
    const head = ws.addRow(labels)
    head.font = { bold: true }
    head.eachCell((cell) => {
      cell.border = { bottom: { style: 'thin' } }
    })
    ws.views = [{ state: 'frozen', ySplit: head.number }]
    if (g.blocks.length === 0) ws.addRow([EMPTY_STATE])
    for (const b of g.blocks) ws.addRow([g.label, ...specCells(b, columns)]).alignment = { vertical: 'top', wrapText: true }
  }
  return toArrayBuffer(await wb.xlsx.writeBuffer())
}

function toArrayBuffer(out: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (out instanceof ArrayBuffer) return out
  const view = out as ArrayBufferView
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}
