// The two XLSX exports (04 section 5.8). ExcelJS never calculates, so every formula carries its cached result.
// The compliance workbook is buyer side: it reads the public projection and the project's own records only.
import ExcelJS from 'exceljs'
import type { World, Destination, FamilyId } from '../../domain/types'
import { DEMO_TODAY, PRODUCT_NAME } from '../../domain/constants'
import { LABELS, TEST_STATUS_LABELS, SOURCE_TYPE_LABELS } from '../../domain/reference/labels'
import { CERTIFICATION_ROWS, RIBA_STAGES } from '../../domain/reference/policy'
import { parameterRows, DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { FAMILIES } from '../../domain/reference/families'
import { streamLabel, destinationLabel } from '../../domain/reference/wasteCodes'
import { BILL_LINE_NAMES, MERROWGATE_ID, DURNLEY_ID } from '../../domain/seed/world'
import { complianceView, wasteView, buyerDeals } from '../../store/selectors'
import { unresolvedNotice } from '../../domain/engines/waste'
import * as f from '../../domain/format'

type Workbook = ExcelJS.Workbook
type Worksheet = ExcelJS.Worksheet

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const FMT = { percent2: '0.00%', percent1: '0.0%', money: '#,##0.00', moneyWhole: '#,##0', mass2: '#,##0.00', mass1: '#,##0.0', carbon4: '0.0000', number: '#,##0.00' }

const CONFIDENCE_LABELS = { high: 'High', medium: 'Medium', low: 'Needs review', edited: 'Edited' } as const

/** A file name from the project or engagement name and the demo date. */
function fileName(name: string, kind: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}-${kind}-${DEMO_TODAY}.xlsx`
}

export function complianceFileName(world: World, projectId: string = MERROWGATE_ID): string {
  return fileName(world.projects[projectId].name, 'compliance')
}

export function wasteFileName(world: World, engagementId: string = DURNLEY_ID): string {
  return fileName(world.engagements[engagementId].name, 'waste-and-reuse')
}

function demoDate(): Date {
  const [y, m, d] = DEMO_TODAY.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function newWorkbook(title: string): Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = PRODUCT_NAME
  wb.title = title
  wb.created = demoDate()
  wb.modified = demoDate()
  return wb
}

function formula(formulaText: string, result: number | string): ExcelJS.CellFormulaValue {
  return { formula: formulaText, result, date1904: false }
}

function header(ws: Worksheet, labels: string[], widths: number[]): void {
  ws.columns = labels.map((_, i) => ({ width: widths[i] ?? 18 }))
  const row = ws.addRow(labels)
  row.font = { bold: true }
}

function caveat(ws: Worksheet): void {
  ws.addRow([])
  ws.addRow([LABELS.L20])
}

function quote(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`
}

function assumptionsSheet(wb: Workbook): void {
  const ws = wb.addWorksheet('Assumptions')
  header(ws, ['Parameter', 'Value', 'Unit', 'Source', 'Status'], [48, 40, 24, 60, 12])
  for (const p of parameterRows(A)) ws.addRow([`${p.group}: ${p.label}`, p.value, p.unit, p.source, p.status])
  caveat(ws)
}

function certificationSheet(wb: Workbook, workbook: 'compliance' | 'waste'): void {
  const ws = wb.addWorksheet('Certification mapping')
  header(ws, ['Scheme and requirement', 'What the workbook provides', 'Note'], [80, 50, 90])
  for (const r of CERTIFICATION_ROWS.filter((x) => x.workbook === workbook)) ws.addRow([r.requirement, r.provides, LABELS.L19])
  caveat(ws)
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0)
}

/** Buyer side: public projection data and the project's own records. No lot private strings. */
export async function buildComplianceWorkbook(world: World, projectId: string = MERROWGATE_ID): Promise<ArrayBuffer> {
  const c = complianceView(world, projectId)
  const p = c.project
  const wb = newWorkbook(`${p.name} compliance`)
  const SUMMARY = 'Summary'
  const BOM = 'Bill of materials'
  const ITEMS = 'Reused items'
  const CARBON = 'Embodied carbon'

  // Row layout, shared by the formulas below.
  const bomFirst = 2
  const bomLast = bomFirst + p.billOfMaterials.length - 1
  const bomTotal = bomLast + 1
  const giaCell = `${quote(SUMMARY)}!$B$4`
  const items = c.reusedItems
  const deals = buyerDeals(world, projectId)
  const itemsFirst = 2
  const itemsLast = itemsFirst + Math.max(items.length, 1) - 1
  const carbonRows = items.filter((i) => i.carbon !== null)
  const carbonFirst = 2
  const carbonLast = carbonFirst + Math.max(carbonRows.length, 1) - 1
  const carbonTotal = carbonLast + 1

  // Summary
  const summary = wb.addWorksheet(SUMMARY)
  summary.columns = [{ width: 44 }, { width: 70 }]
  summary.addRow(['Project', p.name])
  summary.addRow(['Stage', `RIBA Stage ${p.ribaStage}, ${RIBA_STAGES[p.ribaStage]}`])
  summary.addRow(['Status', LABELS.L17])
  summary.addRow(['GIA (m2)', p.giaM2])
  summary.addRow(['Policy basis', LABELS.L16])
  summary.addRow([])
  const secured = summary.addRow(['Reused and recycled content by value, secured', formula(`${quote(BOM)}!J${bomTotal}/${quote(BOM)}!F${bomTotal}`, c.secured.percent)])
  secured.getCell(2).numFmt = FMT.percent2
  const without = summary.addRow(['Without reuse', formula(`SUMPRODUCT(${quote(BOM)}!F${bomFirst}:F${bomLast},${quote(BOM)}!G${bomFirst}:G${bomLast})/${quote(BOM)}!F${bomTotal}`, c.secured.withoutReuse)])
  without.getCell(2).numFmt = FMT.percent2
  const aim = summary.addRow(['Aim', `At least ${f.number(A.contentAim * 100)}% reused or recycled content by value (Circular Economy Statement guidance, 2022)`])
  aim.getCell(2).alignment = { wrapText: true }
  const avoided = summary.addRow(['Upfront carbon avoided against buying new, A1-A4 (tCO2e)', formula(`${quote(CARBON)}!K${carbonTotal}`, c.avoidedT)])
  avoided.getCell(2).numFmt = FMT.carbon4
  const mass = summary.addRow(['Reclaimed material secured (t)', formula(`SUM(${quote(ITEMS)}!F${itemsFirst}:F${itemsLast})`, c.reclaimedMassT)])
  mass.getCell(2).numFmt = FMT.mass2
  summary.addRow([])
  summary.addRow(['Method', LABELS.L15])
  summary.addRow(['Carbon method', LABELS.L11])
  caveat(summary)

  // Bill of materials
  const bom = wb.addWorksheet(BOM)
  header(bom, ['Line', 'Building element', 'Building layer', 'Mass (t)', 'Intensity (kg per m2 GIA)', 'Material value (£, excluding labour)', 'Recycled share of new material', 'Reused content (% by value)', 'Recycled content (% by value)', 'Reused and recycled value (£)'], [40, 34, 16, 12, 22, 28, 22, 22, 22, 26])
  c.secured.lines.forEach((l, i) => {
    const r = bomFirst + i
    const row = bom.addRow([
      BILL_LINE_NAMES[l.line.id] ?? l.line.id,
      l.line.element,
      l.line.layer,
      l.line.massT,
      formula(`D${r}*1000/${giaCell}`, (l.line.massT * 1000) / p.giaM2),
      l.line.valueGbp,
      l.line.recycledShare,
      l.reusedPercent,
      formula(`(1-H${r})*G${r}`, l.recycledPercent),
      formula(`F${r}*(H${r}+I${r})`, l.reusedAndRecycledValue),
    ])
    row.getCell(4).numFmt = FMT.mass1
    row.getCell(5).numFmt = FMT.number
    row.getCell(6).numFmt = FMT.moneyWhole
    row.getCell(7).numFmt = FMT.percent2
    row.getCell(8).numFmt = FMT.percent2
    row.getCell(9).numFmt = FMT.percent2
    row.getCell(10).numFmt = FMT.money
  })
  const totalMass = sum(p.billOfMaterials.map((l) => l.massT))
  const totals = bom.addRow(['Total', '', '', formula(`SUM(D${bomFirst}:D${bomLast})`, totalMass), formula(`D${bomTotal}*1000/${giaCell}`, (totalMass * 1000) / p.giaM2), formula(`SUM(F${bomFirst}:F${bomLast})`, c.secured.totalValue), '', '', formula(`J${bomTotal}/F${bomTotal}`, c.secured.percent), formula(`SUM(J${bomFirst}:J${bomLast})`, sum(c.secured.lines.map((l) => l.reusedAndRecycledValue)))])
  totals.font = { bold: true }
  totals.getCell(4).numFmt = FMT.mass1
  totals.getCell(5).numFmt = FMT.number
  totals.getCell(6).numFmt = FMT.moneyWhole
  totals.getCell(9).numFmt = FMT.percent2
  totals.getCell(10).numFmt = FMT.money
  bom.addRow([])
  bom.addRow([LABELS.L15])
  caveat(bom)

  // Reused items
  const its = wb.addWorksheet(ITEMS)
  header(its, ['Public ID', 'Family', 'Description', 'Quantity', 'Unit', 'Mass (t)', 'Condition', 'Test status', 'Source type', 'Region', 'Provenance', 'Deal status', 'Handover date', 'Avoided carbon A1-A4 (tCO2e)'], [12, 24, 36, 10, 10, 10, 10, 12, 14, 20, 36, 12, 18, 26])
  for (const it of items) {
    const seeded = p.seededDeals.find((s) => s.publicId === it.publicId) ?? null
    const family: FamilyId | null = seeded ? seeded.family : (it.listing?.family ?? null)
    const fam = family ? FAMILIES[family] : null
    const deal = seeded ? null : (deals.find((d) => d.lotPublicId === it.publicId) ?? null)
    const quantity = seeded ? seeded.quantityUnits : (deal?.pieces ?? null)
    const unit = seeded ? (fam?.unitPlural ?? '') : 'pieces'
    const row = its.addRow([
      it.publicId,
      fam?.label ?? '',
      it.description,
      quantity ?? it.quantityLabel,
      unit,
      it.massT,
      it.listing?.condition ?? '',
      it.listing ? TEST_STATUS_LABELS[it.listing.testStatus] : '',
      it.listing ? SOURCE_TYPE_LABELS[it.listing.sourceType] : '',
      it.listing?.location.label ?? '',
      LABELS.L23,
      it.status,
      f.date(it.handoverDate),
      it.avoidedT,
    ])
    row.getCell(6).numFmt = FMT.mass2
    row.getCell(14).numFmt = FMT.carbon4
  }
  if (items.length === 0) its.addRow(['No reused items yet'])
  caveat(its)

  // Embodied carbon
  const carbon = wb.addWorksheet(CARBON)
  header(carbon, ['Public ID', 'Baseline quantity', 'Basis', 'Factor new', 'A1-A3 new (tCO2e)', 'A4 new (tCO2e)', 'Reclaimed quantity', 'Factor reuse', 'A1-A3 reuse (tCO2e)', 'A4 reuse (tCO2e)', 'Avoided (tCO2e)', 'Percent of new'], [12, 18, 18, 12, 18, 16, 20, 12, 20, 18, 16, 14])
  carbonRows.forEach((it, i) => {
    const r = carbonFirst + i
    const k = it.carbon!
    const basis = k.basis === 't' ? 'tonnes, tCO2e per tonne' : 'm2, kgCO2e per m2'
    const newTotal = k.a13New + k.a4New
    const row = carbon.addRow([it.publicId, k.baselineQty, basis, k.factorNew, k.a13New, k.a4New, k.reuseQty, k.factorReuse, k.a13Reuse, k.a4Reuse, formula(`(E${r}+F${r})-(I${r}+J${r})`, it.avoidedT), formula(`K${r}/(E${r}+F${r})`, newTotal > 0 ? it.avoidedT / newTotal : 0)])
    for (const col of [2, 5, 6, 7, 9, 10, 11]) row.getCell(col).numFmt = FMT.carbon4
    row.getCell(12).numFmt = FMT.percent1
  })
  if (carbonRows.length === 0) carbon.addRow(['No reused items yet'])
  const carbonTotals = carbon.addRow(['Total', '', '', '', '', '', '', '', '', '', formula(`SUM(K${carbonFirst}:K${carbonLast})`, c.avoidedT), ''])
  carbonTotals.font = { bold: true }
  carbonTotals.getCell(11).numFmt = FMT.carbon4
  carbon.addRow([])
  carbon.addRow([LABELS.L11])
  carbon.addRow([LABELS.L12])
  caveat(carbon)

  certificationSheet(wb, 'compliance')
  assumptionsSheet(wb)
  return toArrayBuffer(await wb.xlsx.writeBuffer())
}

const REPORTED: { id: Destination; column: string }[] = [
  { id: 'reused_on_site', column: 'Reused on site (%)' },
  { id: 'reused_off_site', column: 'Reused off site (%)' },
  { id: 'recycled_on_site', column: 'Recycled on site (%)' },
  { id: 'recycled_off_site', column: 'Recycled off site (%)' },
  { id: 'landfill', column: 'To landfill (%)' },
  { id: 'recovered', column: 'To other management (%)' },
]

/** Donor side: the engagement's own bill. Nothing from the Merrowgate Wharf project. */
export async function buildWasteWorkbook(world: World, engagementId: string = DURNLEY_ID): Promise<ArrayBuffer> {
  const e = world.engagements[engagementId]
  const v = wasteView(world, engagementId)
  const wb = newWorkbook(`${e.name} waste and reuse`)
  const SUMMARY = 'Summary'
  const ARISINGS = 'Arisings'
  const REPORTING = 'Recycling and waste reporting'
  const REUSE = 'Reuse carbon'
  const rows = e.bill?.rows ?? []
  const arisingsFirst = 2
  const arisingsLast = arisingsFirst + Math.max(rows.length, 1) - 1
  const giaCell = `${quote(SUMMARY)}!$B$3`
  // Reporting sheet layout: header row 1, four waste rows 2 to 5, helper block from row 8.
  const demolitionRow = 3
  const helperTitle = 8
  const helperFirst = helperTitle + 1
  const helperLast = helperFirst + REPORTED.length - 1
  const helperTotal = helperLast + 1
  const benefitRows = v ? v.benefit.rows : []
  const reuseFirst = 2
  const reuseLast = reuseFirst + Math.max(benefitRows.length, 1) - 1
  const reuseTotal = reuseLast + 1

  // Summary
  const summary = wb.addWorksheet(SUMMARY)
  summary.columns = [{ width: 44 }, { width: 70 }]
  summary.addRow(['Engagement', `${e.name} (for ${world.orgs[e.ownerOrgId].name})`])
  summary.addRow(['Building', `${e.buildingName}. ${e.period}`])
  summary.addRow(['GIA (m2)', e.giaM2])
  summary.addRow(['Status', LABELS.L18])
  summary.addRow(['Policy basis', LABELS.L16])
  summary.addRow([])
  if (v) {
    const r = v.rates
    const rep = quote(REPORTING)
    const ar = quote(ARISINGS)
    const line = (label: string, value: ExcelJS.CellValue, numFmt?: string) => {
      const row = summary.addRow([label, value])
      if (numFmt) row.getCell(2).numFmt = numFmt
    }
    line('Demolition waste counted, non-hazardous (t)', formula(`${rep}!B${demolitionRow}`, r.totalNonHaz), FMT.mass1)
    line('Diversion from landfill', formula(`1-${rep}!H${demolitionRow}`, r.diversionRate), FMT.percent2)
    line('Aim', `At least ${f.number(A.diversionTarget * 100)}% of demolition waste diverted from landfill (London Plan 2021 Policy SI 7)`)
    line('Reuse rate', formula(`${rep}!D${demolitionRow}+${rep}!E${demolitionRow}`, r.reuseRate), FMT.percent2)
    line('Components reused off site (t)', formula(`${rep}!B${helperFirst + 1}`, r.byDestination.reused_off_site), FMT.mass1)
    line('Recycled on site (t)', formula(`${rep}!B${helperFirst + 2}`, r.byDestination.recycled_on_site), FMT.mass1)
    line('Sent to landfill (t)', formula(`${rep}!B${helperFirst + 4}`, r.byDestination.landfill), FMT.mass1)
    line('Tonnes per m2 GIA', formula(`${rep}!C${demolitionRow}`, r.tonnesPerM2), '0.00')
    line('Hazardous waste, reported separately (t)', formula(`SUMIF(${ar}!K${arisingsFirst}:K${arisingsLast},"Yes",${ar}!I${arisingsFirst}:I${arisingsLast})`, r.hazardousT), FMT.mass1)
    line('Excavation waste, listed separately (t)', r.excavationT, FMT.mass1)
    line('Potential carbon benefit of reuse (tCO2e)', formula(`${quote(REUSE)}!I${reuseTotal}`, v.benefit.total), FMT.carbon4)
    summary.addRow([])
    line('Stated total on the bill (t)', v.statedTotal ?? 'None', FMT.mass1)
    line('Sum of all rows read (t)', formula(`SUM(${ar}!I${arisingsFirst}:I${arisingsLast})`, v.sum), FMT.mass1)
    line('Stated total check', v.statedTotal === null ? 'No stated total on the bill' : v.statedTotalMatches ? `Stated total ${f.massWaste(v.statedTotal)} matches the rows` : `Stated total ${f.massWaste(v.statedTotal)} does not match the rows (${f.massWaste(v.sum)})`)
    line('Rows read', v.rowsRead)
    line('Rows skipped', `${v.titleRows} title rows and ${v.totalRows} total row skipped`)
    line('Rows awaiting review', formula(`COUNTIF(${ar}!L${arisingsFirst}:L${arisingsLast},"${CONFIDENCE_LABELS.low}")`, r.unresolved.count))
    const notice = unresolvedNotice(r.unresolved)
    if (notice) line('Review notice', notice)
  } else {
    summary.addRow(['Bill', 'No bill has been imported'])
  }
  summary.addRow([])
  summary.addRow(['Carbon method', LABELS.L13])
  caveat(summary)

  // Arisings
  const ar = wb.addWorksheet(ARISINGS)
  header(ar, ['Row', 'Original description', 'Original code', 'Original quantity', 'Original unit', 'Original route', 'Stream', 'EWC code', 'Tonnes', 'Destination', 'Hazardous', 'Confidence'], [6, 40, 14, 16, 12, 34, 34, 12, 12, 40, 12, 14])
  for (const r of rows) {
    const row = ar.addRow([r.row, r.original.description, r.original.code, r.original.quantity, r.original.unit, r.original.route, streamLabel(r.stream), r.code ?? '', r.tonnes ?? '', destinationLabel(r.destination), r.hazardous || r.destination === 'hazardous_disposal' ? 'Yes' : 'No', CONFIDENCE_LABELS[r.confidence]])
    row.getCell(9).numFmt = FMT.mass1
  }
  if (rows.length === 0) ar.addRow(['No bill has been imported'])
  caveat(ar)

  // Recycling and waste reporting
  const rep = wb.addWorksheet(REPORTING)
  header(rep, ['Waste type', 'Overall waste (t)', 'Tonnes per m2 GIA', ...REPORTED.map((d) => d.column)], [22, 18, 18, 18, 18, 18, 18, 16, 22])
  const notInBill = 'Not in this bill'
  rep.addRow(['Excavation waste', notInBill])
  if (v) {
    const r = v.rates
    const demolition = rep.addRow(['Demolition waste', formula(`B${helperTotal}`, r.totalNonHaz), formula(`B${demolitionRow}/${giaCell}`, r.tonnesPerM2), ...REPORTED.map((d, i) => formula(`B${helperFirst + i}/B${helperTotal}`, r.shares[d.id]))])
    demolition.getCell(2).numFmt = FMT.mass1
    demolition.getCell(3).numFmt = '0.00'
    for (let i = 0; i < REPORTED.length; i++) demolition.getCell(4 + i).numFmt = FMT.percent2
  } else {
    rep.addRow(['Demolition waste', notInBill])
  }
  rep.addRow(['Construction waste', notInBill])
  rep.addRow(['Municipal waste', notInBill])
  rep.addRow([])
  rep.addRow([])
  const helperHeading = rep.addRow(['Demolition waste by destination (t), counted rows only'])
  helperHeading.font = { bold: true }
  for (const d of REPORTED) {
    const row = rep.addRow([destinationLabel(d.id), v ? v.rates.byDestination[d.id] : 0])
    row.getCell(2).numFmt = FMT.mass1
  }
  const helperTotalRow = rep.addRow(['Total counted, non-hazardous', formula(`SUM(B${helperFirst}:B${helperLast})`, v ? v.rates.totalNonHaz : 0)])
  helperTotalRow.font = { bold: true }
  helperTotalRow.getCell(2).numFmt = FMT.mass1
  rep.addRow([])
  rep.addRow(['Counted rows are resolved, not hazardous and not excavation. Hazardous waste is reported separately on the Summary sheet.'])
  caveat(rep)

  // Reuse carbon
  const reuse = wb.addWorksheet(REUSE)
  header(reuse, ['Row', 'Stream', 'Family', 'Tonnes', 'Quantity', 'Basis', 'Factor new', 'Factor reuse', 'Potential benefit (tCO2e)'], [6, 30, 28, 12, 14, 24, 12, 12, 24])
  benefitRows.forEach((b, i) => {
    const r = reuseFirst + i
    const basis = b.basis === 't' ? 'tonnes, tCO2e per tonne' : 'm2, kgCO2e per m2'
    const formulaText = b.basis === 't' ? `D${r}*(G${r}-H${r})` : `E${r}*(G${r}-H${r})/1000`
    const row = reuse.addRow([b.row, streamLabel(b.stream), FAMILIES[b.family as FamilyId].label, b.tonnes, b.quantity, basis, b.factorNew, b.factorReuse, formula(formulaText, b.benefit)])
    row.getCell(4).numFmt = FMT.mass1
    row.getCell(5).numFmt = FMT.number
    row.getCell(9).numFmt = FMT.carbon4
  })
  if (benefitRows.length === 0) reuse.addRow(['No rows reused off site'])
  const reuseTotals = reuse.addRow(['Total', '', '', '', '', '', '', '', formula(`SUM(I${reuseFirst}:I${reuseLast})`, v ? v.benefit.total : 0)])
  reuseTotals.font = { bold: true }
  reuseTotals.getCell(9).numFmt = FMT.carbon4
  reuse.addRow([])
  reuse.addRow([LABELS.L13])
  caveat(reuse)

  certificationSheet(wb, 'waste')
  assumptionsSheet(wb)
  return toArrayBuffer(await wb.xlsx.writeBuffer())
}

function toArrayBuffer(out: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (out instanceof ArrayBuffer) return out
  const view = out as ArrayBufferView
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

/** Browser only: hands the workbook to the browser as a download. */
export function downloadWorkbook(buffer: ArrayBuffer, name: string): void {
  const blob = new Blob([buffer], { type: XLSX_MIME })
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
