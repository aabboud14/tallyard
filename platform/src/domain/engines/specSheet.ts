// Specification schedule from public listings only (brief/09-V1-PRODUCT.md section 5.6).
// The listing text helpers live here so the marketplace, the wish list and the exports share one wording.
import type { PublicListing, Spec } from '../types'
import type { SpecBlock, SpecRow, SpecSheet, TimelineFit, WishStatus } from '../v1types'
import { FAMILIES } from '../reference/families'
import { facilityById } from '../reference/assumptions'
import { GRADE_UNKNOWN, LABELS, SIGNAL_LABELS, TEST_STATUS_LABELS, TYPOLOGY_LABELS } from '../reference/labels'
import { formatDate } from '../dates'
import * as f from '../format'
import { typologyOf } from './typology'
import { sustainabilityBand } from './band'

export function availabilityText(l: PublicListing): string {
  return l.availability.kind === 'now' ? 'Available now' : `Available from ${l.availability.label}`
}

export function quantityText(l: PublicListing): string {
  if (l.quantity.pieces !== null && l.family === 'steel_section') return f.quantity(l.quantity.pieces, 'pieces')
  if (l.family === 'curtain_wall') return `${f.quantity(l.quantity.pieces ?? 0, 'panels')} (${f.quantity(l.quantity.value, 'm2')})`
  return f.quantity(l.quantity.value, l.quantity.unit)
}

export function priceRangeText(l: PublicListing): string {
  return `${f.priceOnly(l.price.low, l.family)} to ${f.unitPrice(l.price.high, l.family)}`
}

/** A free-text record value in sentence case: the first letter capitalised, the rest as recorded. */
function sentence(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1)
}

/** The recorded fields of a spec, labelled for display. Free-text values read in sentence case. */
export function specFieldRows(s: Spec): { label: string; value: string }[] {
  switch (s.family) {
    case 'steel_section':
      return [
        { label: 'Designation', value: s.designation },
        { label: 'Length', value: `${s.lengthM.toFixed(1)} m` },
      ]
    case 'curtain_wall':
      return [
        { label: 'System', value: sentence(s.system) },
        { label: 'Panel', value: `${s.panelWidthM} m by ${s.panelHeightM} m` },
      ]
    case 'precast_cladding':
      return [{ label: 'Thickness', value: `${s.thicknessMm} mm` }]
    case 'stone_cladding':
      return [
        { label: 'Stone', value: sentence(s.stone) },
        { label: 'Thickness', value: `${s.thicknessMm} mm` },
      ]
    case 'clay_brick':
      return [
        { label: 'Type', value: sentence(s.brickType) },
        { label: 'Mortar', value: sentence(s.mortar) },
      ]
    case 'raised_floor':
      return [{ label: 'Panel size', value: `${s.panelSize} mm` }]
    case 'timber_joist':
      return [{ label: 'Species', value: sentence(s.species) }]
  }
}

export function gradeText(l: PublicListing): string {
  return l.grade && l.grade !== 'unknown' ? l.grade : GRADE_UNKNOWN
}

/** 41.0 tCO2e, 96.8% of new, A1-A4; or L14 when nothing is claimed. */
export function avoidedCarbonText(l: PublicListing): string {
  if (l.carbon === null) return LABELS.L14
  // A sold listing has no share (0 over 0 in memory, null once stored), so the share is left out.
  const share = typeof l.carbon.percent === 'number' && Number.isFinite(l.carbon.percent) ? `, ${f.percent(l.carbon.percent)} of new` : ''
  return `${f.carbon(l.carbon.avoidedT)}${share}, A1-A4`
}

export const SPEC_SECTIONS = ['Identity', 'Material and dimensions', 'Quantity', 'Condition and testing', 'Availability and location', 'Sustainability', 'Price'] as const

export function specSheetRows(l: PublicListing, fit: TimelineFit | null): SpecRow[] {
  const rows: SpecRow[] = []
  const add = (section: (typeof SPEC_SECTIONS)[number], label: string, value: string) => rows.push({ section, label, value })
  add('Identity', 'Public ID', l.publicId)
  add('Identity', 'Title', l.title)
  add('Identity', 'Typology', TYPOLOGY_LABELS[typologyOf(l.family)])
  add('Identity', 'Family', FAMILIES[l.family].label)
  for (const r of specFieldRows(l.spec)) add('Material and dimensions', r.label, r.value)
  add('Quantity', 'Quantity', quantityText(l))
  add('Quantity', 'Mass', f.massT(l.massT))
  add('Condition and testing', 'Condition', l.condition)
  add('Condition and testing', 'Test status', TEST_STATUS_LABELS[l.testStatus])
  if (l.family === 'steel_section') add('Condition and testing', 'Grade', gradeText(l))
  add('Availability and location', 'Availability', availabilityText(l))
  if (fit) {
    add('Availability and location', 'Timeline check', fit.text)
    if (fit.storageMonths !== null) add('Availability and location', 'Storage until the start', f.months(fit.storageMonths))
  }
  add('Availability and location', 'Location', l.location.label)
  add('Availability and location', 'Collection point', l.collectionHubId ? facilityById(l.collectionHubId).name : 'From the source site')
  add('Sustainability', 'Avoided carbon', avoidedCarbonText(l))
  add('Sustainability', 'Sustainability band', sustainabilityBand(l.carbon).word)
  add('Price', 'Guide price', priceRangeText(l))
  add('Price', 'Market signal', SIGNAL_LABELS[l.price.signal])
  return rows
}

export type SpecSheetProject = { name: string; typeLabel: string; startDate: string }
export type SpecSheetItem = { listing: PublicListing; fit: TimelineFit | null; status: WishStatus }

function byPublicId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** The schedule: approved items first, then the rest, each by public ID. Listings no longer available are left out. */
export function specSheet(project: SpecSheetProject, items: SpecSheetItem[]): SpecSheet {
  const kept = items.filter((i) => i.listing.status === 'Available')
  const sorted = [...kept].sort((a, b) => Number(b.status === 'approved') - Number(a.status === 'approved') || byPublicId(a.listing.publicId, b.listing.publicId))
  const blocks: SpecBlock[] = sorted.map((i) => ({ publicId: i.listing.publicId, title: i.listing.title, status: i.status, rows: specSheetRows(i.listing, i.fit) }))
  const caveats: string[] = [LABELS.L39, LABELS.L20]
  if (kept.some((i) => i.listing.family === 'steel_section')) caveats.push(LABELS.L4)
  // R4: every block shows avoided carbon, the band and the market signal, so their labels travel with the sheet.
  if (kept.length > 0) {
    caveats.push(LABELS.L11, LABELS.L37)
    if (kept.some((i) => i.fit !== null)) caveats.push(LABELS.L38)
    caveats.push(LABELS.L10)
  }
  return {
    title: `Specification schedule, ${project.name}`,
    projectLine: `${project.typeLabel} project. Materials needed on site from ${formatDate(project.startDate)}.`,
    caveats,
    blocks,
  }
}
