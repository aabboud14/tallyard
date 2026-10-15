// View models the round 2 building screens need beyond the data streams' selectors: the building's drawing for the
// header, what it holds as a chart scale, the structure editor's starting values, the owner's Requests page with its
// two tabs, the contractor's unsaved dates and the testing results form. Pure; screens only format what these give.
import type { StructuralElement } from '../../domain/types'
import type { Typology } from '../../domain/v1types'
import { buildingSketch, type BuildingSketch } from '../../domain/sketch'
import { niceMax } from '../../domain/engines/chartScale'
import { recordsGrade, resultStatusesFor } from '../../domain/engines/testing'
import { TEST_STATUS_LABELS } from '../../domain/reference/labels'
import { testingCompanyById } from '../../domain/reference/testing'
import { titleFor } from '../../domain/reference/families'
import * as f from '../../domain/format'
import type { AppData, Viewer } from '../types'
import { buildingSide, canCaptureIn } from '../access'
import { lotOfItem } from '../lots'
import { plural } from '../notifications'
import type { ContractorDateEntry } from '../actions/contractor'
import { claimRowsForOwner, type ClaimRow } from './claims'
import type { AvailabilityRow } from './contractor'
import { buildingOverview, itemsOf, requestsView, structureOptions, type RequestsView, type StructureOption } from './owner'

/** The building drawn from its survey, for the header thumbnail. Owner, surveyor and contractor sides only. */
export function buildingVisual(state: AppData, viewer: Viewer, buildingId: string): { sketch: BuildingSketch } | null {
  if (!buildingSide(state, viewer.userId, buildingId)) return null
  const b = state.world.buildings[buildingId]
  const families = itemsOf(state, buildingId).map((i) => i.family)
  return { sketch: buildingSketch({ id: b.id, storeys: b.storeys, structureType: b.structureType, structure: b.structure }, families) }
}

export type HoldsChart = {
  items: { key: Typology; label: string; value: number; valueText: string; sub: string }[]
  /** The right end of the bars, a nice number at least the heaviest typology. */
  max: number
  totalText: string
  itemCount: number
  empty: boolean
}

/** What the building holds by typology, by mass, on a nice scale: the overview's bar chart. */
export function holdsChart(state: AppData, viewer: Viewer, buildingId: string): HoldsChart | null {
  const o = buildingOverview(state, viewer, buildingId)
  if (!o) return null
  const heaviest = o.byTypology.reduce((m, t) => Math.max(m, t.massT), 0)
  const total = o.byTypology.reduce((s, t) => s + t.massT, 0)
  const count = o.byTypology.reduce((s, t) => s + t.count, 0)
  return {
    items: o.byTypology.map((t) => ({ key: t.typology as Typology, label: t.label, value: t.massT, valueText: f.massT(t.massT), sub: plural(t.count, 'item') })),
    max: niceMax(heaviest),
    totalText: `${f.massT(total)} across ${plural(count, 'item')}`,
    itemCount: count,
    empty: count === 0,
  }
}

export type StructureForm = { elements: StructuralElement[]; notes: string; options: StructureOption[]; summary: string }

/** The structure editor's starting values: the recorded elements and notes. Owner and surveyor sides only. */
export function structureForm(state: AppData, viewer: Viewer, buildingId: string): StructureForm | null {
  const o = buildingOverview(state, viewer, buildingId)
  if (!o || !o.structure.canEdit) return null
  const b = state.world.buildings[buildingId]
  return { elements: b.structure.map((e) => ({ ...e })), notes: b.structureType, options: structureOptions(), summary: o.structure.summary }
}

/** An empty element row for the editor. */
export function blankElement(kind: StructuralElement['kind']): StructuralElement {
  return { kind, material: null, systemId: null, note: '' }
}

/** A row's label in the structure editor: 'Facade' for the first of its kind, then 'Facade 2', 'Facade 3'. */
export function elementRowLabel(rows: StructuralElement[], index: number, label: string): string {
  const kind = rows[index]?.kind
  const n = rows.slice(0, index + 1).filter((r) => r.kind === kind).length
  return n <= 1 ? label : `${label} ${n}`
}

export type RequestsTab = 'reservations' | 'buildings'

export type RequestsPage = {
  reservations: RequestsView
  claims: { waiting: ClaimRow[]; answered: ClaimRow[] }
  counts: { reservations: number; buildings: number }
  /** The tab to open when the address names none: buildings when only confirmations wait. */
  defaultTab: RequestsTab
}

/** The owner's Requests page: reservation requests and buildings surveyors ask them to confirm. */
export function requestsPage(state: AppData, viewer: Viewer): RequestsPage | null {
  const reservations = requestsView(state, viewer)
  if (!reservations) return null
  const rows = claimRowsForOwner(state, viewer)
  const waiting = rows.filter((r) => r.status === 'pending')
  const answered = rows.filter((r) => r.status !== 'pending')
  const counts = { reservations: reservations.pending.length, buildings: waiting.length }
  return { reservations, claims: { waiting, answered }, counts, defaultTab: counts.reservations === 0 && counts.buildings > 0 ? 'buildings' : 'reservations' }
}

/** The contractor's months as a draft keyed by item, from the saved rows. */
export function availabilityDraft(rows: AvailabilityRow[]): Record<string, string | null> {
  return Object.fromEntries(rows.map((r) => [r.itemId, r.month]))
}

/** The entries of a draft that differ from what is saved, in row order: what Save dates sends. */
export function changedDates(rows: AvailabilityRow[], draft: Record<string, string | null>): ContractorDateEntry[] {
  return rows.filter((r) => (draft[r.itemId] ?? null) !== r.month).map((r) => ({ itemId: r.itemId, month: draft[r.itemId] ?? null }))
}

/** The draft with every blank month set to the given one (the dismantling start's month). */
export function fillBlankMonths(rows: AvailabilityRow[], draft: Record<string, string | null>, month: string): Record<string, string | null> {
  const out = { ...draft }
  for (const r of rows) if (!out[r.itemId]) out[r.itemId] = month
  return out
}

export type ResultsForm = {
  requestId: string
  companyName: string
  items: { itemId: string; tag: string; title: string; steel: boolean; locked: boolean }[]
  statuses: { value: 'inspected' | 'tested'; label: string }[]
  grades: boolean
  /** The viewer is the surveyor and some items are shared or published: only the owner records those. */
  locked: boolean
}

/** The record results form for a booked testing request. */
export function testingResultsForm(state: AppData, viewer: Viewer, requestId: string): ResultsForm | null {
  const r = state.testingRequests[requestId]
  if (!r || r.status !== 'booked' || !canCaptureIn(state, viewer.userId, r.buildingId)) return null
  const owner = buildingSide(state, viewer.userId, r.buildingId) === 'owner'
  const items = r.itemIds
    .filter((id) => state.world.items[id])
    .map((id) => {
      const item = state.world.items[id]
      const lot = lotOfItem(state.world, id)
      return { itemId: id, tag: item.tag, title: titleFor(item.spec), steel: item.family === 'steel_section', locked: !owner && !!lot && lot.visibility !== 'private' }
    })
  return {
    requestId,
    companyName: testingCompanyById(r.companyId)?.name ?? '',
    items,
    statuses: resultStatusesFor(r.services).map((s) => ({ value: s, label: TEST_STATUS_LABELS[s] })),
    grades: recordsGrade(r.services),
    locked: items.some((i) => i.locked),
  }
}

/** The drawing of each building on the viewer's buildings list, by building id. */
export function buildingSketches(state: AppData, viewer: Viewer): Record<string, BuildingSketch> {
  const out: Record<string, BuildingSketch> = {}
  for (const b of Object.values(state.world.buildings)) {
    const v = buildingVisual(state, viewer, b.id)
    if (v) out[b.id] = v.sketch
  }
  return out
}
