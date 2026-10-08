// The surveyor's workspace: appointments by client, and the capture screen.
import type { FamilyId } from '../../domain/types'
import { FAMILIES, FAMILY_IDS } from '../../domain/reference/families'
import { SECTIONS } from '../../domain/reference/sections'
import { formatMonth, monthKey } from '../../domain/dates'
import type { AppData, Viewer } from '../types'
import { buildingSide, buildingsOfUser, roleOfUser } from '../access'
import { QUANTITY_KIND } from '../capture'
import { activityFor, firstName, greeting, longDate, todayOf, type ActivityRow } from './common'
import { buildingHeader, inventoryView, itemQuantityText, itemsOf, surveyStatus, SURVEY_STATUS_LABELS, type BuildingRef } from './owner'
import { titleFor } from '../../domain/reference/families'
import type { SurveyStatus } from '../types'

export type AppointmentBuilding = { id: string; name: string; address: string; itemCount: number; status: SurveyStatus; statusLabel: string; lastCaptureOn: string | null; href: string }

export type Appointment = { orgId: string; clientName: string; buildings: AppointmentBuilding[] }

export type SurveyorHome = {
  greeting: string
  dateText: string
  stats: { clients: number; buildings: number; itemsCaptured: number; inProgress: number }
  appointments: Appointment[]
  activity: ActivityRow[]
}

/** The surveyor's clients, each with the buildings they are appointed to. */
export function appointments(state: AppData, viewer: Viewer): Appointment[] {
  const out: Appointment[] = []
  for (const b of buildingsOfUser(state, viewer.userId)) {
    if (buildingSide(state, viewer.userId, b.id) !== 'surveyor' || !b.ownerOrgId) continue
    const items = itemsOf(state, b.id)
    const status = surveyStatus(state, b.id)
    const row: AppointmentBuilding = {
      id: b.id,
      name: b.name,
      address: b.address,
      itemCount: items.length,
      status,
      statusLabel: SURVEY_STATUS_LABELS[status],
      lastCaptureOn: items.reduce<string | null>((m, i) => (m === null || i.capturedOn > m ? i.capturedOn : m), null),
      href: `/app/buildings/${b.id}`,
    }
    const group = out.find((g) => g.orgId === b.ownerOrgId)
    if (group) group.buildings.push(row)
    else out.push({ orgId: b.ownerOrgId, clientName: state.world.orgs[b.ownerOrgId]?.name ?? '', buildings: [row] })
  }
  return out
}

export function surveyorHome(state: AppData, viewer: Viewer): SurveyorHome | null {
  if (roleOfUser(state, viewer.userId) !== 'surveyor') return null
  const user = state.users[viewer.userId]
  const groups = appointments(state, viewer)
  const all = groups.flatMap((g) => g.buildings)
  return {
    greeting: greeting(viewer.now, firstName(user.name)),
    dateText: longDate(todayOf(viewer)),
    stats: { clients: groups.length, buildings: all.length, itemsCaptured: all.reduce((n, b) => n + b.itemCount, 0), inProgress: all.filter((b) => b.status !== 'submitted').length },
    appointments: groups,
    activity: activityFor(state, viewer, {}, 8),
  }
}

export type CaptureView = {
  header: BuildingRef
  families: { id: FamilyId; label: string; quantityKind: 'pieces' | 'area' | 'volume'; unit: string }[]
  sections: string[]
  /** The month the expected availability starts at: the dismantling start, or this month. */
  defaultMonth: string
  defaultMonthText: string
  yearOptions: number[]
  recent: { itemId: string; tag: string; title: string; quantityText: string; capturedOn: string; href: string }[]
  itemCount: number
  canSubmit: boolean
}

/** Years ahead of the later of this year and the dismantling start that the year picker reaches. */
const YEARS_AHEAD = 3

export function captureView(state: AppData, viewer: Viewer, buildingId: string): CaptureView | null {
  const header = buildingHeader(state, viewer, buildingId)
  if (!header) return null
  const b = state.world.buildings[buildingId]
  const today = todayOf(viewer)
  const defaultMonth = monthKey(b.programme.dismantlingStart ?? today)
  const first = Number(today.slice(0, 4))
  const last = Math.max(first, Number(defaultMonth.slice(0, 4))) + YEARS_AHEAD
  const years: number[] = []
  for (let y = first; y <= last; y++) years.push(y)
  const items = itemsOf(state, buildingId)
  const recent = [...items]
    .sort((a, c) => (a.capturedOn < c.capturedOn ? 1 : a.capturedOn > c.capturedOn ? -1 : c.tag.localeCompare(a.tag, 'en-GB', { numeric: true })))
    .slice(0, 5)
    .map((i) => ({ itemId: i.id, tag: i.tag, title: titleFor(i.spec), quantityText: itemQuantityText(i), capturedOn: i.capturedOn, href: `/app/buildings/${buildingId}/inventory/${i.id}` }))
  return {
    header,
    families: FAMILY_IDS.map((id) => ({ id, label: FAMILIES[id].label, quantityKind: QUANTITY_KIND[id], unit: QUANTITY_KIND[id] === 'pieces' ? (id === 'clay_brick' ? 'bricks' : id === 'raised_floor' || id === 'curtain_wall' ? 'panels' : 'pieces') : QUANTITY_KIND[id] === 'area' ? 'm2' : 'm3' })),
    sections: SECTIONS.map((s) => s.designation),
    defaultMonth,
    defaultMonthText: formatMonth(defaultMonth),
    yearOptions: years,
    recent,
    itemCount: items.length,
    canSubmit: inventoryView(state, viewer, buildingId)?.canSubmit ?? false,
  }
}

/** The ISO date stored for an expected month: the dismantling start itself when it falls in that month, else the first. */
export function expectedFromMonth(state: AppData, buildingId: string, key: string): string {
  const start = state.world.buildings[buildingId]?.programme.dismantlingStart ?? null
  if (start && monthKey(start) === key) return start
  return `${key}-01`
}
