// The deconstruction contractor's Availability tab (owner-surveyor design 14.4.7): each item with the surveyor's
// estimate and the contractor's own month. Nothing about lots, prices, visibility or buyers.
import { formatDate, formatMonth, monthKey } from '../../domain/dates'
import { titleFor } from '../../domain/reference/families'
import { TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { typologyOf } from '../../domain/engines/typology'
import type { AppData, Viewer } from '../types'
import { isBuildingContractor } from '../access'
import { todayOf } from './common'
import { buildingHeader, itemQuantityText, itemsOf, type BuildingRef } from './owner'

export type AvailabilityRow = { itemId: string; tag: string; title: string; quantityText: string; location: string; typologyLabel: string; surveyorText: string; month: string | null; datedOn: string | null }

export type AvailabilityView = {
  header: BuildingRef
  rows: AvailabilityRow[]
  programme: { label: string; text: string }[]
  /** The dismantling start's month, or this month: what "Fill blanks from the programme" uses. */
  defaultMonth: string
  yearOptions: number[]
  canEdit: boolean
  datedCount: number
  empty: boolean
}

/** Years past the later of this year and the dismantling start that the month picker reaches. */
const YEARS_AHEAD = 3

export function availabilityView(state: AppData, viewer: Viewer, buildingId: string): AvailabilityView | null {
  if (!isBuildingContractor(state, viewer.userId, buildingId)) return null
  const header = buildingHeader(state, viewer, buildingId)
  if (!header) return null
  const b = state.world.buildings[buildingId]
  const today = todayOf(viewer)
  const defaultMonth = monthKey(b.programme.dismantlingStart ?? today)
  const first = Number(today.slice(0, 4))
  const last = Math.max(first, Number(defaultMonth.slice(0, 4))) + YEARS_AHEAD
  const yearOptions: number[] = []
  for (let y = first; y <= last; y++) yearOptions.push(y)
  const date = (d: string | null) => (d ? formatDate(d) : 'Not set')
  const rows = itemsOf(state, buildingId).map((i) => ({
    itemId: i.id,
    tag: i.tag,
    title: titleFor(i.spec),
    quantityText: itemQuantityText(i),
    location: i.location,
    typologyLabel: TYPOLOGY_LABELS[typologyOf(i.family)],
    surveyorText: i.expectedAvailableFrom ? formatMonth(i.expectedAvailableFrom) : 'Not set',
    month: i.contractorAvailableFrom ? monthKey(i.contractorAvailableFrom) : null,
    datedOn: i.contractorDatedOn,
  }))
  return {
    header,
    rows,
    programme: [
      { label: 'Strip-out starts', text: date(b.programme.stripOutStart) },
      { label: 'Dismantling starts', text: date(b.programme.dismantlingStart) },
      { label: 'Site clear by', text: date(b.programme.clearBy) },
    ],
    defaultMonth,
    yearOptions,
    canEdit: true,
    datedCount: rows.filter((r) => r.month !== null).length,
    empty: rows.length === 0,
  }
}
