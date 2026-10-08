// The compliance workbook (adapted from the demo's exports). Every figure comes worked out from the store's
// workbook model; formulas carry their cached results so the file reads the same before Excel recalculates.
import type ExcelJS from 'exceljs'
import { PRODUCT_NAME } from '../../domain/constants'
import { DEFAULT_ASSUMPTIONS as A, parameterRows } from '../../domain/reference/assumptions'
import { V1_PARAMETER_ROWS } from '../../domain/reference/v1assumptions'
import { nowIso } from '../../sandbox/clock'
import type { ComplianceWorkbookModel } from '../../store/selectors/roles-views'

export type Workbook = ExcelJS.Workbook
type Worksheet = ExcelJS.Worksheet

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export const FMT = { percent2: '0.00%', money: '#,##0.00', moneyWhole: '#,##0', mass1: '#,##0.0', mass2: '#,##0.00', carbon2: '#,##0.00', number: '#,##0.00' }

export async function newWorkbook(title: string): Promise<Workbook> {
  const { default: Excel } = await import('exceljs')
  const wb = new Excel.Workbook()
  wb.creator = PRODUCT_NAME
  wb.title = title
  const now = new Date(nowIso())
  wb.created = now
  wb.modified = now
  return wb
}

export function formula(text: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula: text, result, date1904: false }
}

export function header(ws: Worksheet, labels: string[], widths: number[]): void {
  ws.columns = labels.map((_, i) => ({ width: widths[i] ?? 18 }))
  const row = ws.addRow(labels)
  row.font = { bold: true }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F4' } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

export function caveat(ws: Worksheet, text: string): void {
  ws.addRow([])
  const r = ws.addRow([text])
  r.font = { italic: true, color: { argb: 'FF78716C' } }
}

export function quote(sheet: string): string {
  return `'${sheet.replace(/'/g, "''")}'`
}

export function assumptionsSheet(wb: Workbook, caveatText: string): void {
  const ws = wb.addWorksheet('Assumptions')
  header(ws, ['Group', 'Parameter', 'Value', 'Unit', 'Source', 'Status'], [28, 36, 40, 22, 60, 12])
  for (const p of [...parameterRows(A), ...V1_PARAMETER_ROWS]) ws.addRow([p.group, p.label, p.value, p.unit, p.source, p.status])
  caveat(ws, caveatText)
}

function toArrayBuffer(out: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (out instanceof ArrayBuffer) return out
  const view = out as ArrayBufferView
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

export async function workbookBuffer(wb: Workbook): Promise<ArrayBuffer> {
  return toArrayBuffer(await wb.xlsx.writeBuffer())
}

/** Confirmed and reserved rows of a column on the reused items sheet. */
function securedSum(sheet: string, col: string, first: number, last: number): string {
  const status = `${sheet}!E${first}:E${last}`
  const values = `${sheet}!${col}${first}:${col}${last}`
  return `SUMIF(${status},"Confirmed",${values})+SUMIF(${status},"Reserved",${values})`
}

/** The project's compliance workbook: summary, bill of materials, reused items, certification mapping, assumptions. */
export async function buildComplianceWorkbook(m: ComplianceWorkbookModel): Promise<ArrayBuffer> {
  const wb = await newWorkbook(m.title)
  const SUMMARY = 'Summary'
  const BOM = 'Bill of materials'
  const ITEMS = 'Reused items'
  const bomFirst = 2
  const bomLast = bomFirst + Math.max(m.bom.length, 1) - 1
  const bomTotal = bomLast + 1
  const itemsFirst = 2
  const itemsLast = itemsFirst + Math.max(m.items.length, 1) - 1
  const giaCell = `${quote(SUMMARY)}!$B$5`

  const summary = wb.addWorksheet(SUMMARY)
  summary.columns = [{ width: 52 }, { width: 72 }]
  summary.addRow(['Project', m.projectName])
  summary.addRow(['Client', m.clientName])
  summary.addRow(['Stage', m.stageText])
  summary.addRow(['Status', m.status])
  summary.addRow(['GIA (m2)', m.giaM2])
  summary.addRow(['Policy basis', m.policy])
  summary.addRow([])
  if (m.bom.length > 0) {
    const secured = summary.addRow(['Reused and recycled content by value, secured', formula(`${quote(BOM)}!J${bomTotal}/${quote(BOM)}!F${bomTotal}`, m.securedPercent)])
    secured.getCell(2).numFmt = FMT.percent2
    summary.addRow(['With approved materials not yet reserved', m.withApprovedPercent]).getCell(2).numFmt = FMT.percent2
    summary.addRow(['Without reuse', m.withoutReuse]).getCell(2).numFmt = FMT.percent2
    summary.addRow(['Aim', m.aimText]).getCell(2).alignment = { wrapText: true }
  } else {
    summary.addRow(['Reused and recycled content by value', 'No bill of materials for this project yet'])
  }
  const ir = quote(ITEMS)
  summary.addRow(['Upfront carbon avoided against buying new, A1-A4, secured (tCO2e)', formula(securedSum(ir, 'H', itemsFirst, itemsLast), m.avoidedT)]).getCell(2).numFmt = FMT.carbon2
  summary.addRow(['Reclaimed material secured (t)', formula(securedSum(ir, 'D', itemsFirst, itemsLast), m.reclaimedMassT)]).getCell(2).numFmt = FMT.mass2
  summary.addRow([])
  for (const t of m.methods) summary.addRow(['Method', t]).getCell(2).alignment = { wrapText: true }
  caveat(summary, m.caveat)

  const bom = wb.addWorksheet(BOM)
  header(bom, ['Line', 'Building element', 'Building layer', 'Mass (t)', 'Intensity (kg per m2 GIA)', 'Material value (£, excluding labour)', 'Recycled share of new material', 'Reused content (% by value)', 'Recycled content (% by value)', 'Reused and recycled value (£)'], [40, 34, 16, 12, 22, 28, 22, 22, 22, 26])
  m.bom.forEach((l, i) => {
    const r = bomFirst + i
    const row = bom.addRow([l.name, l.element, l.layer, l.massT, formula(`D${r}*1000/${giaCell}`, l.intensity), l.valueGbp, l.recycledShare, l.reusedPercent, formula(`(1-H${r})*G${r}`, l.recycledPercent), formula(`F${r}*(H${r}+I${r})`, l.reusedAndRecycledValue)])
    row.getCell(4).numFmt = FMT.mass1
    row.getCell(5).numFmt = FMT.number
    row.getCell(6).numFmt = FMT.moneyWhole
    for (const c of [7, 8, 9]) row.getCell(c).numFmt = FMT.percent2
    row.getCell(10).numFmt = FMT.money
  })
  if (m.bom.length === 0) bom.addRow(['No bill of materials for this project yet'])
  else {
    const t = m.bomTotals
    const totals = bom.addRow(['Total', '', '', formula(`SUM(D${bomFirst}:D${bomLast})`, t.massT), formula(`D${bomTotal}*1000/${giaCell}`, t.intensity), formula(`SUM(F${bomFirst}:F${bomLast})`, t.valueGbp), '', '', formula(`J${bomTotal}/F${bomTotal}`, t.percent), formula(`SUM(J${bomFirst}:J${bomLast})`, t.reusedAndRecycledValue)])
    totals.font = { bold: true }
    totals.getCell(4).numFmt = FMT.mass1
    totals.getCell(5).numFmt = FMT.number
    totals.getCell(6).numFmt = FMT.moneyWhole
    totals.getCell(9).numFmt = FMT.percent2
    totals.getCell(10).numFmt = FMT.money
  }
  caveat(bom, m.methods[0])

  const items = wb.addWorksheet(ITEMS)
  header(items, ['Public ID', 'Description', 'Quantity', 'Mass (t)', 'Status', 'Date', 'Basis', 'Avoided carbon A1-A4 (tCO2e)'], [12, 40, 24, 12, 12, 14, 18, 28])
  for (const it of m.items) {
    const row = items.addRow([it.publicId, it.description, it.quantityLabel, it.massT, it.status, it.date ?? '', it.source === 'earlier deal' ? 'Earlier deal' : it.source === 'reservation' ? 'Reservation' : 'Client approval', it.avoidedT])
    row.getCell(4).numFmt = FMT.mass2
    row.getCell(8).numFmt = FMT.carbon2
  }
  if (m.items.length === 0) items.addRow(['No reused items yet'])
  caveat(items, m.caveat)

  const cert = wb.addWorksheet('Certification mapping')
  header(cert, ['Scheme and requirement', 'What the workbook provides', 'Note'], [80, 50, 90])
  for (const c of m.certification) cert.addRow([c.requirement, c.provides, c.note])
  caveat(cert, m.caveat)

  assumptionsSheet(wb, m.caveat)
  return workbookBuffer(wb)
}

/** Browser only: hands the file to the browser as a download. */
export function downloadFile(buffer: ArrayBuffer, name: string, mime = XLSX_MIME): void {
  const blob = new Blob([buffer], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
