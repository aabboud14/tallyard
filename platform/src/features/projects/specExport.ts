// The specification as a spreadsheet: one sheet with the schedule's title, the project line, the architect's
// header note and the caveats, then one row per clause with every public field and the architect's note. Built
// from the specification view only, so it carries public listing fields and the practice's own words.
import type { SpecificationView } from '../../store/selectors/shortlist'
import { PRODUCT_NAME } from '../../domain/constants'

export type SpecTable = { columns: string[]; rows: string[][] }

/** The schedule as a table: Clause, Status, every field in the order it first appears, then the note. */
export function specTable(view: Pick<SpecificationView, 'clauses'>): SpecTable {
  const labels: string[] = []
  for (const c of view.clauses) for (const r of c.rows) if (!labels.includes(r.label)) labels.push(r.label)
  const columns = ['Clause', 'Status', ...labels, "Architect's note"]
  const rows = view.clauses.map((c, i) => {
    const byLabel = new Map(c.rows.map((r) => [r.label, r.value]))
    return [String(i + 1), c.reserved ? `${c.statusLabel}, reserved` : c.statusLabel, ...labels.map((l) => byLabel.get(l) ?? ''), c.note]
  })
  return { columns, rows }
}

/** The lines above the table: title, project line, which materials, the header note, then each caveat. */
export function specHeadLines(view: Pick<SpecificationView, 'sheet' | 'mode' | 'headerNote'>): { title: string; lines: string[]; caveats: string[] } {
  const which = view.mode === 'approved' ? 'Approved materials.' : 'Draft: every material not declined, approved first.'
  return { title: view.sheet.title, lines: [view.sheet.projectLine, which, ...(view.headerNote ? [view.headerNote] : [])], caveats: view.sheet.caveats }
}

function utcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** The workbook as bytes. ExcelJS loads only when someone exports. */
export async function buildSpecWorkbook(view: SpecificationView, today: string): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = PRODUCT_NAME
  wb.title = view.sheet.title
  wb.created = utcDate(today)
  wb.modified = utcDate(today)
  const ws = wb.addWorksheet(view.mode === 'approved' ? 'Specification' : 'Draft specification')
  const head = specHeadLines(view)
  const table = specTable(view)
  ws.columns = table.columns.map((c, i) => ({ width: i === 0 ? 8 : i === 1 ? 16 : c === "Architect's note" ? 48 : Math.min(40, Math.max(14, c.length + 6)) }))
  ws.addRow([head.title]).font = { bold: true, size: 14 }
  for (const l of head.lines) ws.addRow([l])
  for (const c of head.caveats) ws.addRow([c]).font = { italic: true, color: { argb: 'FF57534E' } }
  ws.addRow([])
  const header = ws.addRow(table.columns)
  header.font = { bold: true }
  header.eachCell((cell) => {
    cell.border = { bottom: { style: 'thin' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F4' } }
  })
  ws.views = [{ state: 'frozen', ySplit: header.number }]
  if (table.rows.length === 0) ws.addRow(['No materials in this schedule yet.'])
  for (const r of table.rows) ws.addRow(r).alignment = { vertical: 'top', wrapText: true }
  const out = await wb.xlsx.writeBuffer()
  if (out instanceof ArrayBuffer) return out
  const v = out as ArrayBufferView
  return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
