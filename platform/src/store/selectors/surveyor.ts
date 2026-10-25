// The surveyor's workspace: appointments by client (as surveyor or as deconstruction contractor), the buildings the
// firm added that wait for their owner, the capture screen, and the standalone Capture page's building picker.
import type { FamilyId } from '../../domain/types'
import { FAMILIES, FAMILY_IDS } from '../../domain/reference/families'
import { SECTIONS } from '../../domain/reference/sections'
import { formatMonth, monthKey } from '../../domain/dates'
import type { AppData, Viewer } from '../types'
import { buildingSide, buildingsOfUser, canCaptureIn, isBuildingContractor, roleOfUser } from '../access'
import { QUANTITY_KIND } from '../capture'
import { activityFor, firstName, greeting, longDate, todayOf, type ActivityRow } from './common'
import { buildingHeader, inventoryView, itemQuantityText, itemsOf, surveyStatus, SURVEY_STATUS_LABELS, type BuildingRef } from './owner'
import { titleFor } from '../../domain/reference/families'
import type { SurveyStatus } from '../types'
import { claimStateFor, type ClaimState } from './claims'

export type AppointmentBuilding = {
  id: string
  name: string
  address: string
  itemCount: number
  status: SurveyStatus
  statusLabel: string
  lastCaptureOn: string | null
  href: string
  /** How the firm is appointed: to survey, or as the deconstruction contractor who sets dates. */
  role: 'surveyor' | 'contractor'
  roleLabel: 'Surveyor' | 'Contractor'
  /** Items with the contractor's expected date set. */
  datedCount: number
  /** The firm sets this building's availability dates: as its contractor alone, or as its surveyor and contractor. */
  setsDates: boolean
}

export type Appointment = { orgId: string; clientName: string; buildings: AppointmentBuilding[] }

export type SurveyorHome = {
  greeting: string
  dateText: string
  /** itemsCaptured counts every item the firm captured, at buildings not yet linked too (unlinkedItems of them). */
  stats: { clients: number; buildings: number; itemsCaptured: number; inProgress: number; unlinked: number; unlinkedItems: number }
  appointments: Appointment[]
  /** Buildings the firm added that no owner has confirmed yet. */
  unlinked: (AppointmentBuilding & { claim: ClaimState })[]
  /** The header's Capture action, with the building it would open on. */
  quickCapture: { href: '/app/capture'; buildingName: string | null }
  activity: ActivityRow[]
}

function appointmentBuilding(state: AppData, viewer: Viewer, buildingId: string): AppointmentBuilding {
  const b = state.world.buildings[buildingId]
  const items = itemsOf(state, b.id)
  const status = surveyStatus(state, b.id)
  const role = buildingSide(state, viewer.userId, b.id) === 'contractor' ? 'contractor' : 'surveyor'
  return {
    id: b.id,
    name: b.name,
    address: b.address,
    itemCount: items.length,
    status,
    statusLabel: SURVEY_STATUS_LABELS[status],
    lastCaptureOn: items.reduce<string | null>((m, i) => (m === null || i.capturedOn > m ? i.capturedOn : m), null),
    href: `/app/buildings/${b.id}`,
    role,
    roleLabel: role === 'contractor' ? 'Contractor' : 'Surveyor',
    datedCount: items.filter((i) => i.contractorAvailableFrom !== null).length,
    setsDates: isBuildingContractor(state, viewer.userId, b.id),
  }
}

/** The surveyor's clients, each with the buildings the firm surveys or dates as contractor. */
export function appointments(state: AppData, viewer: Viewer): Appointment[] {
  const out: Appointment[] = []
  for (const b of buildingsOfUser(state, viewer.userId)) {
    if (!b.ownerOrgId) continue
    const row = appointmentBuilding(state, viewer, b.id)
    const group = out.find((g) => g.orgId === b.ownerOrgId)
    if (group) group.buildings.push(row)
    else out.push({ orgId: b.ownerOrgId, clientName: state.world.orgs[b.ownerOrgId]?.name ?? '', buildings: [row] })
  }
  return out
}

/** The firm's own buildings that no owner has confirmed yet, with where each stands. */
export function unlinkedBuildings(state: AppData, viewer: Viewer): (AppointmentBuilding & { claim: ClaimState })[] {
  if (roleOfUser(state, viewer.userId) !== 'surveyor') return []
  return buildingsOfUser(state, viewer.userId)
    .filter((b) => !b.ownerOrgId && buildingSide(state, viewer.userId, b.id) === 'surveyor')
    .map((b) => ({ ...appointmentBuilding(state, viewer, b.id), claim: claimStateFor(state, b.id) }))
}

export function surveyorHome(state: AppData, viewer: Viewer): SurveyorHome | null {
  if (roleOfUser(state, viewer.userId) !== 'surveyor') return null
  const user = state.users[viewer.userId]
  const groups = appointments(state, viewer)
  const all = groups.flatMap((g) => g.buildings)
  const unlinked = unlinkedBuildings(state, viewer)
  const targets = captureTargets(state, viewer)
  const selected = targets?.targets.find((t) => t.id === targets.selectedId) ?? null
  return {
    greeting: greeting(viewer.now, firstName(user.name)),
    dateText: longDate(todayOf(viewer)),
    stats: {
      clients: groups.length,
      buildings: all.length,
      itemsCaptured: [...all, ...unlinked].reduce((n, b) => n + b.itemCount, 0),
      inProgress: all.filter((b) => b.status !== 'submitted').length,
      unlinked: unlinked.length,
      unlinkedItems: unlinked.reduce((n, b) => n + b.itemCount, 0),
    },
    appointments: groups,
    unlinked,
    quickCapture: { href: '/app/capture', buildingName: selected?.name ?? null },
    activity: activityFor(state, viewer, {}, 8),
  }
}

// ---------- Standalone capture ----------

export const NOT_YET_LINKED = 'Not yet linked'

export type CaptureTarget = { id: string; name: string; address: string; group: string; itemCount: number; statusLabel: string }

export type CaptureTargets = { targets: CaptureTarget[]; groups: { label: string; ids: string[] }[]; selectedId: string | null; canAdd: boolean; empty: boolean }

/**
 * The buildings the standalone Capture page can record in (owner or surveyor side, never a contractor alone), grouped
 * by client with the firm's unconfirmed buildings last. The selection is the person's last choice while it is still a
 * target, else the building with the latest capture, else the first.
 */
export function captureTargets(state: AppData, viewer: Viewer): CaptureTargets | null {
  const role = roleOfUser(state, viewer.userId)
  if (role !== 'owner' && role !== 'surveyor') return null
  const buildings = buildingsOfUser(state, viewer.userId).filter((b) => canCaptureIn(state, viewer.userId, b.id))
  const linked = buildings.filter((b) => b.ownerOrgId)
  const unlinked = buildings.filter((b) => !b.ownerOrgId)
  const target = (b: (typeof buildings)[number]): CaptureTarget => ({
    id: b.id,
    name: b.name,
    address: b.address,
    group: b.ownerOrgId ? (state.world.orgs[b.ownerOrgId]?.name ?? '') : NOT_YET_LINKED,
    itemCount: itemsOf(state, b.id).length,
    statusLabel: SURVEY_STATUS_LABELS[surveyStatus(state, b.id)],
  })
  const targets = [...linked, ...unlinked].map(target)
  const groups: { label: string; ids: string[] }[] = []
  for (const t of targets) {
    const g = groups.find((x) => x.label === t.group)
    if (g) g.ids.push(t.id)
    else groups.push({ label: t.group, ids: [t.id] })
  }
  const remembered = state.ui.captureBuildingId?.[viewer.userId] ?? null
  let selectedId: string | null = remembered && targets.some((t) => t.id === remembered) ? remembered : null
  if (!selectedId) {
    let best: { id: string; on: string } | null = null
    for (const t of targets) {
      for (const i of itemsOf(state, t.id)) if (!best || i.capturedOn > best.on) best = { id: t.id, on: i.capturedOn }
    }
    selectedId = best?.id ?? targets[0]?.id ?? null
  }
  return { targets, groups, selectedId, canAdd: true, empty: targets.length === 0 }
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
  if (!header || header.side === 'contractor') return null
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
