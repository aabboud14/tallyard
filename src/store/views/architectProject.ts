// Pure helpers for the architect's project screens: the wish list, the spec sheet and the new project form
// (brief/09-V1-PRODUCT.md sections 3.3, 5.6, 5.8 and 13.4 to 13.6). The screens format what these return.
import type { PublicListing, World } from '../../domain/types'
import type { SpecBlock, SpecRow, SpecSheet, TimelineFit, WishStatus } from '../../domain/v1types'
import { LABELS, WISH_STATUS_LABELS, type LabelId } from '../../domain/reference/labels'
import { REGIONS } from '../../domain/reference/assumptions'
import { SPEC_SECTIONS } from '../../domain/engines/specSheet'
import { dxfFor, objFor } from '../../domain/engines/geometry'
import * as f from '../../domain/format'
import { V1_ERRORS, type NewProjectInput } from '../v1actions'
import { architectProjects, type WishRow } from '../v1selectors'

// ---------- Wish list ----------

export type WishTab = 'all' | WishStatus

export const WISH_TABS: WishTab[] = ['all', 'pending', 'sent', 'approved', 'declined']

export const WISH_TAB_LABELS: Record<WishTab, string> = { all: 'All', ...WISH_STATUS_LABELS }

/** Rows on the list by state, every row counted, including rows that no longer show figures. */
export function wishTabCounts(rows: WishRow[]): Record<WishTab, number> {
  const out: Record<WishTab, number> = { all: rows.length, pending: 0, sent: 0, approved: 0, declined: 0 }
  for (const r of rows) out[r.item.status] += 1
  return out
}

export function rowsForTab(rows: WishRow[], tab: WishTab): WishRow[] {
  return tab === 'all' ? rows : rows.filter((r) => r.item.status === tab)
}

/** "7 months of storage until the start", or null when the lot arrives late or the fit is unknown. */
export function storageLine(fit: TimelineFit | null): string | null {
  if (!fit || fit.storageMonths === null) return null
  if (fit.storageMonths === 0) return 'No storage before the start'
  return `${f.months(fit.storageMonths)} of storage until the start`
}

/** The avoided carbon figure for a row, or the band word when nothing is claimed. */
export function avoidedLine(listing: PublicListing): { value: string; claimed: boolean } {
  if (listing.carbon === null) return { value: 'Not claimed', claimed: false }
  return { value: f.carbon(listing.carbon.avoidedT), claimed: true }
}

export type GeometryKinds = { dxf: boolean; obj: boolean; reason: string | null }

/** Which geometry files a listing can produce, and why not when it cannot. */
export function geometryKinds(listing: PublicListing): GeometryKinds {
  const dxf = dxfFor(listing)
  const obj = objFor(listing)
  return { dxf: dxf.kind === 'file', obj: obj.kind === 'file', reason: dxf.kind === 'unavailable' ? dxf.reason : obj.kind === 'unavailable' ? obj.reason : null }
}

// ---------- Spec sheet ----------

export type SpecWhich = 'approved' | 'draft'

export type SpecGroup = { status: WishStatus; label: string; line: string; draft: boolean; blocks: SpecBlock[] }

const GROUP_ORDER: WishStatus[] = ['approved', 'sent', 'pending']

const GROUP_LINES: Record<Exclude<WishStatus, 'declined'>, string> = {
  approved: 'Approved by the client.',
  sent: "Draft: sent to the client, awaiting the client's decision.",
  pending: 'Draft: not yet sent to the client.',
}

/** The sheet's blocks by state: approved only, or approved then sent then pending for the draft. Empty groups included. */
export function specGroups(sheet: SpecSheet, which: SpecWhich): SpecGroup[] {
  const states = which === 'approved' ? GROUP_ORDER.slice(0, 1) : GROUP_ORDER
  return states.map((status) => ({
    status,
    label: WISH_STATUS_LABELS[status],
    line: GROUP_LINES[status as Exclude<WishStatus, 'declined'>],
    draft: status !== 'approved',
    blocks: sheet.blocks.filter((b) => b.status === status),
  }))
}

/** Rows the page shows in each block's heading rather than in its grid. */
export const SPEC_HEADING_LABELS = ['Public ID', 'Title'] as const

export type SpecColumn = { section: string; label: string }

/** One column per row label across every block, in the order of the spec sections, then first appearance. */
export function specColumns(blocks: SpecBlock[]): SpecColumn[] {
  const seen = new Map<string, SpecColumn & { order: number; first: number }>()
  let n = 0
  for (const b of blocks) {
    for (const r of b.rows) {
      const key = `${r.section}\u0000${r.label}`
      if (!seen.has(key)) seen.set(key, { section: r.section, label: r.label, order: (SPEC_SECTIONS as readonly string[]).indexOf(r.section), first: n++ })
    }
  }
  return [...seen.values()].sort((a, b) => a.order - b.order || a.first - b.first).map(({ section, label }) => ({ section, label }))
}

/** A block's values under the given columns; an empty string where the block has no such row. */
export function specCells(block: SpecBlock, columns: SpecColumn[]): string[] {
  return columns.map((c) => block.rows.find((r) => r.section === c.section && r.label === c.label)?.value ?? '')
}

/** A block's rows grouped by section, in order, leaving out the labels in `omit` (the page shows them in the block heading). */
export function blockSections(block: SpecBlock, omit: readonly string[] = []): { section: string; rows: SpecRow[] }[] {
  const out: { section: string; rows: SpecRow[] }[] = []
  for (const r of block.rows) {
    if (omit.includes(r.label)) continue
    const last = out[out.length - 1]
    if (last && last.section === r.section) last.rows.push(r)
    else out.push({ section: r.section, rows: [r] })
  }
  return out
}

/** The fixed label ID behind a caveat line, for its test id. */
export function caveatLabelId(text: string): LabelId | null {
  const hit = (Object.keys(LABELS) as LabelId[]).find((k) => LABELS[k] === text)
  return hit ?? null
}

// ---------- New project ----------

export type NewProjectField = keyof NewProjectInput

const ERROR_FIELDS: [string, NewProjectField][] = [
  [V1_ERRORS.name, 'name'],
  [V1_ERRORS.duplicateName, 'name'],
  [V1_ERRORS.clientName, 'clientName'],
  [V1_ERRORS.clientNotBuyer, 'clientName'],
  [V1_ERRORS.projectType, 'projectType'],
  [V1_ERRORS.region, 'region'],
  [V1_ERRORS.badDate, 'startDate'],
  [V1_ERRORS.pastDate, 'startDate'],
]

/** The form field an error from createProject belongs to, or null for an error about the whole form. */
export function newProjectErrorField(error: string): NewProjectField | null {
  return ERROR_FIELDS.find(([e]) => e === error)?.[1] ?? null
}

/** The clients of the architect's own projects, for suggestions. Never anyone else's counterparties. */
export function clientSuggestions(world: World, personaId: string): string[] {
  const names = architectProjects(world, personaId)
    .map((p) => world.orgs[p.clientOrgId]?.name)
    .filter((n): n is string => !!n)
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'en-GB'))
}

export const REGION_OPTIONS: readonly string[] = REGIONS
