// The waste and reuse workbook for a demolition engagement (adapted from the demo's exports). Donor side: the
// engagement's own bill only. Formulas carry their cached results.
import type { Destination } from '../../domain/types'
import { LABELS } from '../../domain/reference/labels'
import { CERTIFICATION_ROWS } from '../../domain/reference/policy'
import { FAMILIES } from '../../domain/reference/families'
import { destinationLabel, streamLabel } from '../../domain/reference/wasteCodes'
import type { FamilyId } from '../../domain/types'
import * as f from '../../domain/format'
import type { WasteView } from '../../store/selectors/consultant'
import { aimLabel, OUTPUT_CAVEAT } from '../../store/selectors/roles-views'
import { assumptionsSheet, caveat, FMT, formula, header, newWorkbook, quote, workbookBuffer } from '../compliance/exports'

const CONFIDENCE_LABELS = { high: 'High', medium: 'Medium', low: 'Needs review', edited: 'Edited' } as const

const REPORTED: { id: Destination; column: string }[] = [
  { id: 'reused_on_site', column: 'Reused on site (%)' },
  { id: 'reused_off_site', column: 'Reused off site (%)' },
  { id: 'recycled_on_site', column: 'Recycled on site (%)' },
  { id: 'recycled_off_site', column: 'Recycled off site (%)' },
  { id: 'landfill', column: 'To landfill (%)' },
  { id: 'recovered', column: 'To other management (%)' },
]

export async function buildWasteWorkbook(v: WasteView): Promise<ArrayBuffer> {
  const e = v.engagement
  const wb = await newWorkbook(`${e.name} waste and reuse`)
  const SUMMARY = 'Summary'
  const ARISINGS = 'Arisings'
  const REPORTING = 'Recycling and waste reporting'
  const REUSE = 'Reuse carbon'
  const rows = v.bill?.rows ?? []
  const aFirst = 2
  const aLast = aFirst + Math.max(rows.length, 1) - 1
  const giaCell = `${quote(SUMMARY)}!$B$3`
  const demolitionRow = 3
  const helperFirst = 9
  const helperLast = helperFirst + REPORTED.length - 1
  const helperTotal = helperLast + 1
  const benefitRows = v.benefit?.rows ?? []
  const rFirst = 2
  const rLast = rFirst + Math.max(benefitRows.length, 1) - 1
  const rTotal = rLast + 1
  const rep = quote(REPORTING)
  const ar = quote(ARISINGS)

  const summary = wb.addWorksheet(SUMMARY)
  summary.columns = [{ width: 48 }, { width: 72 }]
  summary.addRow(['Engagement', `${e.name} (for ${e.ownerName})`])
  summary.addRow(['Building', `${e.buildingName}. ${e.period}`])
  summary.addRow(['GIA (m2)', e.giaM2])
  summary.addRow(['Status', LABELS.L18])
  summary.addRow(['Policy basis', LABELS.L16])
  summary.addRow([])
  const line = (label: string, value: string | number | ReturnType<typeof formula>, numFmt?: string) => {
    const row = summary.addRow([label, value])
    if (numFmt) row.getCell(2).numFmt = numFmt
  }
  if (v.bill && v.rates && v.benefit) {
    const r = v.rates
    line('Demolition waste counted, non-hazardous (t)', formula(`${rep}!B${demolitionRow}`, r.totalNonHaz), FMT.mass1)
    line('Diversion from landfill', formula(`1-${rep}!H${demolitionRow}`, r.diversionRate), FMT.percent2)
    line('Aim', `${aimLabel(v.diversionTarget)} of demolition waste diverted from landfill (London Plan 2021 Policy SI 7)`)
    line('Reuse rate', formula(`${rep}!D${demolitionRow}+${rep}!E${demolitionRow}`, r.reuseRate), FMT.percent2)
    line('Components reused off site (t)', formula(`${rep}!B${helperFirst + 1}`, r.byDestination.reused_off_site), FMT.mass1)
    line('Recycled on site (t)', formula(`${rep}!B${helperFirst + 2}`, r.byDestination.recycled_on_site), FMT.mass1)
    line('Sent to landfill (t)', formula(`${rep}!B${helperFirst + 4}`, r.byDestination.landfill), FMT.mass1)
    line('Tonnes per m2 GIA', formula(`${rep}!C${demolitionRow}`, r.tonnesPerM2), '0.00')
    line('Hazardous waste, reported separately (t)', formula(`SUMIF(${ar}!K${aFirst}:K${aLast},"Yes",${ar}!I${aFirst}:I${aLast})`, r.hazardousT), FMT.mass1)
    line('Excavation waste, listed separately (t)', r.excavationT, FMT.mass1)
    line('Potential carbon benefit of reuse (tCO2e)', formula(`${quote(REUSE)}!I${rTotal}`, v.benefit.total), FMT.carbon2)
    summary.addRow([])
    line('Stated total on the bill (t)', v.bill.statedTotal ?? 'None', FMT.mass1)
    line('Sum of all rows read (t)', formula(`SUM(${ar}!I${aFirst}:I${aLast})`, v.sum ?? 0), FMT.mass1)
    line('Stated total check', v.bill.statedTotal === null ? 'No stated total on the bill' : v.bill.statedTotalMatches ? `Stated total ${f.massWaste(v.bill.statedTotal)} matches the rows` : `Stated total ${f.massWaste(v.bill.statedTotal)} does not match the rows (${f.massWaste(v.sum ?? 0)})`)
    line('Rows read', rows.length)
    line('Rows skipped', `${v.bill.titleRows} title rows and ${v.bill.totalRows} total row skipped`)
    line('Rows awaiting review', formula(`COUNTIF(${ar}!L${aFirst}:L${aLast},"${CONFIDENCE_LABELS.low}")`, r.unresolved.count))
    if (v.unresolvedText) line('Review notice', v.unresolvedText)
  } else {
    summary.addRow(['Bill', 'No bill has been imported'])
  }
  summary.addRow([])
  summary.addRow(['Carbon method', LABELS.L13])
  caveat(summary, OUTPUT_CAVEAT)

  const arisings = wb.addWorksheet(ARISINGS)
  header(arisings, ['Row', 'Original description', 'Original code', 'Original quantity', 'Original unit', 'Original route', 'Stream', 'EWC code', 'Tonnes', 'Destination', 'Hazardous', 'Confidence'], [6, 40, 14, 16, 12, 34, 34, 12, 12, 40, 12, 14])
  for (const r of rows) {
    const row = arisings.addRow([r.row, r.original.description, r.original.code, r.original.quantity, r.original.unit, r.original.route, streamLabel(r.stream), r.code ?? '', r.tonnes ?? '', destinationLabel(r.destination), r.hazardous || r.destination === 'hazardous_disposal' ? 'Yes' : 'No', CONFIDENCE_LABELS[r.confidence]])
    row.getCell(9).numFmt = FMT.mass1
  }
  if (rows.length === 0) arisings.addRow(['No bill has been imported'])
  caveat(arisings, OUTPUT_CAVEAT)

  const reporting = wb.addWorksheet(REPORTING)
  header(reporting, ['Waste type', 'Overall waste (t)', 'Tonnes per m2 GIA', ...REPORTED.map((d) => d.column)], [22, 18, 18, 18, 18, 18, 18, 16, 22])
  reporting.addRow(['Excavation waste', 'Not in this bill'])
  if (v.rates) {
    const r = v.rates
    const demolition = reporting.addRow(['Demolition waste', formula(`B${helperTotal}`, r.totalNonHaz), formula(`B${demolitionRow}/${giaCell}`, r.tonnesPerM2), ...REPORTED.map((d, i) => formula(`B${helperFirst + i}/B${helperTotal}`, r.shares[d.id]))])
    demolition.getCell(2).numFmt = FMT.mass1
    demolition.getCell(3).numFmt = '0.00'
    for (let i = 0; i < REPORTED.length; i++) demolition.getCell(4 + i).numFmt = FMT.percent2
  } else {
    reporting.addRow(['Demolition waste', 'Not in this bill'])
  }
  reporting.addRow(['Construction waste', 'Not in this bill'])
  reporting.addRow(['Municipal waste', 'Not in this bill'])
  reporting.addRow([])
  reporting.addRow([])
  reporting.addRow(['Demolition waste by destination (t), counted rows only']).font = { bold: true }
  for (const d of REPORTED) reporting.addRow([destinationLabel(d.id), v.rates ? v.rates.byDestination[d.id] : 0]).getCell(2).numFmt = FMT.mass1
  const total = reporting.addRow(['Total counted, non-hazardous', formula(`SUM(B${helperFirst}:B${helperLast})`, v.rates ? v.rates.totalNonHaz : 0)])
  total.font = { bold: true }
  total.getCell(2).numFmt = FMT.mass1
  reporting.addRow([])
  reporting.addRow(['Counted rows are resolved, not hazardous and not excavation. Hazardous waste is reported separately on the Summary sheet.'])
  caveat(reporting, OUTPUT_CAVEAT)

  const reuse = wb.addWorksheet(REUSE)
  header(reuse, ['Row', 'Stream', 'Family', 'Tonnes', 'Quantity', 'Basis', 'Factor new', 'Factor reuse', 'Potential benefit (tCO2e)'], [6, 30, 28, 12, 14, 24, 12, 12, 24])
  benefitRows.forEach((b, i) => {
    const r = rFirst + i
    const basis = b.basis === 't' ? 'tonnes, tCO2e per tonne' : 'm2, kgCO2e per m2'
    const text = b.basis === 't' ? `D${r}*(G${r}-H${r})` : `E${r}*(G${r}-H${r})/1000`
    const row = reuse.addRow([b.row, streamLabel(b.stream), FAMILIES[b.family as FamilyId]?.label ?? b.family, b.tonnes, b.quantity, basis, b.factorNew, b.factorReuse, formula(text, b.benefit)])
    row.getCell(4).numFmt = FMT.mass1
    row.getCell(5).numFmt = FMT.number
    row.getCell(9).numFmt = FMT.carbon2
  })
  if (benefitRows.length === 0) reuse.addRow(['No rows reused off site'])
  const rt = reuse.addRow(['Total', '', '', '', '', '', '', '', formula(`SUM(I${rFirst}:I${rLast})`, v.benefit ? v.benefit.total : 0)])
  rt.font = { bold: true }
  rt.getCell(9).numFmt = FMT.carbon2
  reuse.addRow([])
  reuse.addRow([LABELS.L13])
  caveat(reuse, OUTPUT_CAVEAT)

  const cert = wb.addWorksheet('Certification mapping')
  header(cert, ['Scheme and requirement', 'What the workbook provides', 'Note'], [80, 50, 90])
  for (const c of CERTIFICATION_ROWS.filter((x) => x.workbook === 'waste')) cert.addRow([c.requirement, c.provides, LABELS.L19])
  caveat(cert, OUTPUT_CAVEAT)

  assumptionsSheet(wb, OUTPUT_CAVEAT)
  return workbookBuffer(wb)
}
