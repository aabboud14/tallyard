// The donor building owner's and the surveyor's building views: home, buildings and new projects, inventory, item
// detail, the recovery plan, listings with the disclosure score and a live preview, sharing as blind lines, requests,
// and the round 2 additions: structure, the deconstruction contractor's dates and testing.
// A buyer appears to the owner only through toBlindBuyer until the owner accepts their request.
import type { FamilyId, InventoryItem, Lot, Project, PublicListing, SourceBuilding, StructuralElementKind, Visibility } from '../../domain/types'
import type { DecisionRoute } from '../../domain/v1types'
import { DEFAULT_ASSUMPTIONS as A, FACILITIES, facilityById, REGIONS } from '../../domain/reference/assumptions'
import { FAMILIES } from '../../domain/reference/families'
import { DECISION_ROUTE_LABELS, LABELS, OWNER_VISIBILITY_LABELS, TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { daysBetween, formatDate, formatMonth } from '../../domain/dates'
import { ELEMENT_LABELS, ELEMENT_ORDER, MATERIAL_LABELS, structureSystemById } from '../../domain/reference/structure'
import { PROJECT_TYPE_LABELS } from '../../domain/reference/labels'
import { RIBA_STAGES } from '../../domain/reference/policy'
import { projectTypeLabel } from '../../domain/reference/projectTypes'
import { materialsFor, structureSummary, systemsFor } from '../../domain/engines/structure'
import { itemMeasures, lotMeasures, type Measures } from '../../domain/engines/measures'
import { itemCarbon, type CarbonResult } from '../../domain/engines/carbon'
import { guidePrice, sellerMandate, signalForLot, type GuidePrice } from '../../domain/engines/pricing'
import { holdingView, sellerPackage, type HoldingView } from '../../domain/engines/package'
import { priorityRanking, type PriorityResult, type PriorityRow } from '../../domain/engines/priority'
import { decisionTreeRoute } from '../../domain/engines/route'
import { typologyOf } from '../../domain/engines/typology'
import { toPublicListing } from '../../domain/privacy/publicListing'
import { blindBuyerText, toBlindBuyer } from '../../domain/privacy/blindBuyer'
import { titleFor } from '../../domain/reference/families'
import type { Disclosure } from '../../domain/engines/disclosure'
import * as f from '../../domain/format'
import type { AppData, ReservationStatus, SurveyStatus, Viewer } from '../types'
import { buildingSide, buildingsOfUser, isBuildingContractor, projectSide, projectsOfUser, roleOfOrg, roleOfUser, type BuildingSide } from '../access'
import { acceptedReservation, lotOfItem, projectWishlist } from '../lots'
import { checkPrices, disclosureWith, type LotVisibilityChoice, type PriceCheck } from '../actions/owner'
import { PROJECT_TYPES } from '../actions/projects'
import { datesClearedText } from '../actions/contractor'
import { claimRowsForOwner, claimStateFor, type ClaimRow, type ClaimState } from './claims'
import { activitySummary, type ActivitySummary } from './dashboard'
import { activityFor, firstName, greeting, listingCard, longDate, RESERVATION_STATUS_LABELS, stageLabel, timeAgo, todayOf, type ActivityRow, type ListingCard } from './common'

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = { not_started: 'Not started', in_progress: 'In progress', submitted: 'Submitted' }

export const VISIBILITY_CHOICE: Record<Visibility, LotVisibilityChoice> = { private: 'private', matched_only: 'shared', open: 'published' }

export function itemsOf(state: AppData, buildingId: string): InventoryItem[] {
  return Object.values(state.world.items)
    .filter((i) => i.buildingId === buildingId)
    .sort((a, b) => a.tag.localeCompare(b.tag, 'en-GB', { numeric: true }))
}

/** 48 pieces, 600 m2, 20,000 bricks, 3,000 panels, 22 m3. */
export function itemQuantityText(item: InventoryItem): string {
  const q = item.quantity
  if (q.kind === 'area') return f.quantity(q.areaM2, 'm2')
  if (q.kind === 'volume') return f.quantity(q.volumeM3, 'm3')
  const unit = item.family === 'clay_brick' ? 'bricks' : item.family === 'raised_floor' ? 'panels' : 'pieces'
  return f.quantity(q.pieces, unit)
}

export function surveyStatus(state: AppData, buildingId: string): SurveyStatus {
  return state.surveys[buildingId]?.status ?? (itemsOf(state, buildingId).length > 0 ? 'in_progress' : 'not_started')
}

export type BuildingTab = { id: string; label: string; href: string }

/** The building kind label (round 2). A New project is a Project, not a building, so every building is a donor building. */
export const DONOR_BUILDING = 'Donor building'
export const NEW_PROJECT = 'New project'

/**
 * The tabs for a side. The owner's priorities page reads Recovery plan (its address stays /priorities). A surveying
 * firm that is also the building's deconstruction contractor gets Availability too; a contractor alone, Overview and
 * Availability.
 */
export function buildingTabs(side: BuildingSide, buildingId: string, opts: { contractor: boolean } = { contractor: false }): BuildingTab[] {
  const base = `/app/buildings/${buildingId}`
  const tab = (id: string, label: string, path: string): BuildingTab => ({ id, label, href: `${base}${path}` })
  if (side === 'owner') return [tab('overview', 'Overview', ''), tab('inventory', 'Inventory', '/inventory'), tab('priorities', 'Recovery plan', '/priorities'), tab('listings', 'Listings', '/listings'), tab('sharing', 'Sharing', '/sharing'), tab('testing', 'Testing', '/testing')]
  if (side === 'contractor') return [tab('overview', 'Overview', ''), tab('availability', 'Availability', '/availability')]
  return [tab('overview', 'Overview', ''), tab('capture', 'Capture', '/capture'), tab('inventory', 'Inventory', '/inventory'), tab('testing', 'Testing', '/testing'), ...(opts.contractor ? [tab('availability', 'Availability', '/availability')] : [])]
}

/** The tabs the viewer gets on a building, from their side and whether their firm is its contractor. */
export function tabsFor(state: AppData, viewer: Viewer, b: SourceBuilding, side: BuildingSide): BuildingTab[] {
  return buildingTabs(side, b.id, { contractor: isBuildingContractor(state, viewer.userId, b.id) })
}

export type BuildingRef = {
  id: string
  name: string
  address: string
  region: string
  localAuthority: string
  postcodeDistrict: string
  clientName: string
  surveyorName: string
  side: BuildingSide
  /** The owner, or the surveying firm that added a building no owner has confirmed yet, may edit its details. */
  canEditDetails: boolean
  tabs: BuildingTab[]
  surveyStatus: SurveyStatus
  surveyStatusLabel: string
  /** Where the building stands with its owner, for the surveying firm's side only. */
  claim: ClaimState | null
  contractorName: string
  /** The viewer's firm is the building's deconstruction contractor. */
  isContractor: boolean
  kindLabel: string
}

function buildingRef(state: AppData, b: SourceBuilding, side: BuildingSide, viewer: Viewer | null = null): BuildingRef {
  const status = surveyStatus(state, b.id)
  const isContractor = viewer ? isBuildingContractor(state, viewer.userId, b.id) : false
  return {
    id: b.id,
    name: b.name,
    address: b.address,
    region: b.region,
    localAuthority: b.localAuthority,
    postcodeDistrict: b.postcodeDistrict,
    clientName: b.ownerOrgId ? (state.world.orgs[b.ownerOrgId]?.name ?? '') : '',
    surveyorName: b.surveyorOrgId ? (state.world.orgs[b.surveyorOrgId]?.name ?? '') : '',
    side,
    canEditDetails: side === 'owner' || (side === 'surveyor' && b.ownerOrgId === null && !!viewer && b.createdByOrgId === state.users[viewer.userId]?.orgId),
    tabs: buildingTabs(side, b.id, { contractor: isContractor }),
    surveyStatus: status,
    surveyStatusLabel: SURVEY_STATUS_LABELS[status],
    claim: side === 'surveyor' ? claimStateFor(state, b.id) : null,
    contractorName: b.contractorOrgId ? (state.world.orgs[b.contractorOrgId]?.name ?? '') : '',
    isContractor,
    kindLabel: DONOR_BUILDING,
  }
}

/** The header for a building the viewer owns, surveys or dates as contractor; null otherwise. */
export function buildingHeader(state: AppData, viewer: Viewer, buildingId: string): BuildingRef | null {
  const side = buildingSide(state, viewer.userId, buildingId)
  if (!side) return null
  return buildingRef(state, state.world.buildings[buildingId], side, viewer)
}

/** The header for a building whose records the viewer may read and edit: owner or surveyor, never a contractor alone. */
function recordHeader(state: AppData, viewer: Viewer, buildingId: string): BuildingRef | null {
  const header = buildingHeader(state, viewer, buildingId)
  return header && header.side !== 'contractor' ? header : null
}

export type VisibilityCounts = Record<Visibility, number> & { reserved: number }

function visibilityCounts(state: AppData, buildingId: string): VisibilityCounts {
  const out: VisibilityCounts = { private: 0, matched_only: 0, open: 0, reserved: 0 }
  for (const l of Object.values(state.world.lots)) {
    if (state.world.items[l.itemId]?.buildingId !== buildingId) continue
    out[l.visibility]++
    if (acceptedReservation(state, l.id)) out.reserved++
  }
  return out
}

// ---------- Figures (owner only) ----------

export type ItemFigures = {
  measures: Measures
  guide: GuidePrice
  carbon: CarbonResult | null
  holding: HoldingView | null
  sellerMandate: { ask: number; reserve: number; urgency: number }
  daysToClearBy: number | null
}

function holdingFacility(b: SourceBuilding, family: FamilyId, lot: Lot) {
  if (lot.inStock) return facilityById(lot.inStock.hubId)
  if (FAMILIES[family].storage === 'covered_only') return FACILITIES.filter((x) => x.type === 'covered').sort((x, y) => (b.distancesKm[x.id] ?? 0) - (b.distancesKm[y.id] ?? 0))[0] ?? null
  return b.defaultHubId ? facilityById(b.defaultHubId) : null
}

/** The owner's private figures for an item: guide price, carbon, the holding view and the suggested mandate. */
export function itemFigures(state: AppData, itemId: string, today: string): ItemFigures {
  const item = state.world.items[itemId]
  const lot = lotOfItem(state.world, itemId)!
  const b = state.world.buildings[item.buildingId]
  const measures = itemMeasures(item)
  const { signal } = signalForLot(state.world.snapshot, item.spec, lot.publicId, measures.units)
  const guide = guidePrice(item.family, item.condition, item.testStatus, signal, A)
  const daysToClearBy = b.programme.clearBy ? daysBetween(today, b.programme.clearBy) : null
  const facility = holdingFacility(b, item.family, lot)
  const holding = facility
    ? holdingView({ family: item.family, units: measures.units, massT: measures.massT, pricePerUnit: guide.guide, facility, kmSourceToHub: b.distancesKm[facility.id] ?? 0, inStock: lot.inStock ? { since: lot.inStock.since } : null, dealDate: today }, A)
    : null
  return { measures, guide, carbon: itemCarbon(item, b.sourceType, A), holding, sellerMandate: sellerMandate(guide.guide, guide.tick, daysToClearBy, A), daysToClearBy }
}

export function priorityFor(state: AppData, buildingId: string): PriorityResult {
  const items = itemsOf(state, buildingId)
  const b = state.world.buildings[buildingId]
  const publicIds = Object.fromEntries(items.map((i) => [i.id, lotOfItem(state.world, i.id)?.publicId ?? '']))
  return priorityRanking(items, publicIds, b.sourceType, state.world.snapshot, A)
}

// ---------- Owner home and buildings ----------

export type BuildingCard = BuildingRef & { itemCount: number; counts: VisibilityCounts; href: string; lastCaptureOn: string | null }

function buildingCard(state: AppData, b: SourceBuilding, side: BuildingSide, viewer: Viewer | null = null): BuildingCard {
  const items = itemsOf(state, b.id)
  const last = items.reduce<string | null>((m, i) => (m === null || i.capturedOn > m ? i.capturedOn : m), null)
  return { ...buildingRef(state, b, side, viewer), itemCount: items.length, counts: visibilityCounts(state, b.id), href: `/app/buildings/${b.id}`, lastCaptureOn: last }
}

/** A New project on the owner's side: a project where the owner organisation is the client. */
export type OwnerProjectRow = { id: string; name: string; typeLabel: string; architectName: string | null; stageText: string; startText: string; waitingApprovals: number; approved: number; href: string }

/** The viewer's own New projects, if they are a donor building owner. */
export function ownerProjects(state: AppData, viewer: Viewer): Project[] {
  if (roleOfUser(state, viewer.userId) !== 'owner') return []
  return projectsOfUser(state, viewer.userId).filter((p) => projectSide(state, viewer.userId, p.id) === 'client')
}

function ownerProjectRow(state: AppData, p: Project): OwnerProjectRow {
  const items = projectWishlist(state.world, p.id)?.items ?? []
  return {
    id: p.id,
    name: p.name,
    typeLabel: projectTypeLabel(p),
    architectName: p.architectOrgId ? (state.world.orgs[p.architectOrgId]?.name ?? null) : null,
    stageText: stageLabel(p.ribaStage),
    startText: formatDate(p.startDate),
    waitingApprovals: items.filter((i) => i.status === 'sent').length,
    approved: items.filter((i) => i.status === 'approved').length,
    href: `/app/projects/${p.id}`,
  }
}

export type BuildingsList = {
  /** Donor buildings for the owner; buildings linked to an owner for the surveyor. */
  rows: BuildingCard[]
  canAdd: boolean
  empty: boolean
  /** The owner's New projects. */
  projects: OwnerProjectRow[]
  /** The surveyor's own buildings that no owner has confirmed yet. */
  unlinked: (BuildingCard & { claim: ClaimState })[]
}

export function buildingsList(state: AppData, viewer: Viewer): BuildingsList {
  const role = roleOfUser(state, viewer.userId)
  const cards = buildingsOfUser(state, viewer.userId).map((b) => buildingCard(state, b, buildingSide(state, viewer.userId, b.id)!, viewer))
  const isUnlinked = (c: BuildingCard) => role === 'surveyor' && !state.world.buildings[c.id].ownerOrgId
  const rows = cards.filter((c) => !isUnlinked(c))
  const unlinked = cards.filter(isUnlinked).map((c) => ({ ...c, claim: claimStateFor(state, c.id) }))
  const projects = ownerProjects(state, viewer).map((p) => ownerProjectRow(state, p))
  return { rows, canAdd: role === 'owner' || role === 'surveyor', empty: rows.length === 0 && unlinked.length === 0 && projects.length === 0, projects, unlinked }
}

export type RequestRow = {
  id: string
  status: ReservationStatus
  statusLabel: string
  requestedAt: string
  timeAgo: string
  publicId: string
  itemId: string
  tag: string
  title: string
  quantityText: string
  buildingId: string
  buildingName: string
  /** Blind until the owner accepts; then the buyer's organisation and contact. */
  buyer: { kind: 'blind'; text: string } | { kind: 'known'; org: string; contact: string; email: string; message: string }
  /** The owner's own indicative figures for the whole lot at the guide price. */
  sellerEstimate: { pricePerUnit: number; unitPrice: string; material: number; net: number; lines: { label: string; amount: number }[]; facilityName: string | null }
  decisionNote: string | null
  decidedAt: string | null
  canDecide: boolean
  /** Other requests waiting for the same lot. */
  competing: number
}

function ownerOrg(state: AppData, viewer: Viewer): string | null {
  return roleOfUser(state, viewer.userId) === 'owner' ? (state.users[viewer.userId]?.orgId ?? null) : null
}

export function requestRows(state: AppData, viewer: Viewer): RequestRow[] {
  const orgId = ownerOrg(state, viewer)
  if (!orgId) return []
  const today = todayOf(viewer)
  return Object.values(state.reservations)
    .filter((r) => {
      const lot = state.world.lots[r.lotId]
      const item = lot ? state.world.items[lot.itemId] : null
      return !!item && state.world.buildings[item.buildingId]?.ownerOrgId === orgId && r.status !== 'withdrawn'
    })
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1))
    .map((r) => {
      const lot = state.world.lots[r.lotId]
      const item = state.world.items[lot.itemId]
      const b = state.world.buildings[item.buildingId]
      const p = state.world.projects[r.projectId]
      const m = lotMeasures(item, lot)
      const fig = itemFigures(state, item.id, today)
      const facility = holdingFacility(b, item.family, lot)
      const sp = sellerPackage({ family: item.family, units: m.units, massT: m.massT, pricePerUnit: fig.guide.guide, route: facility ? 'hub' : 'direct', facility, kmSourceToHub: facility ? (b.distancesKm[facility.id] ?? 0) : 0, inStock: lot.inStock ? { since: lot.inStock.since } : null, dealDate: today }, A)
      const known = r.status === 'accepted' && r.exchanged
      return {
        id: r.id,
        status: r.status,
        statusLabel: r.status === 'pending' ? 'Awaiting your decision' : RESERVATION_STATUS_LABELS[r.status],
        requestedAt: r.requestedAt,
        timeAgo: timeAgo(r.requestedAt, viewer.now),
        publicId: lot.publicId,
        itemId: item.id,
        tag: item.tag,
        title: titleFor(item.spec),
        quantityText: itemQuantityText(item),
        buildingId: b.id,
        buildingName: b.name,
        buyer: known ? { kind: 'known' as const, org: r.exchanged!.buyerOrg, contact: r.exchanged!.buyerContact, email: r.exchanged!.buyerEmail, message: r.message } : { kind: 'blind' as const, text: blindBuyerText(toBlindBuyer(p)) },
        sellerEstimate: { pricePerUnit: fig.guide.guide, unitPrice: f.unitPrice(fig.guide.guide, item.family), material: sp.material, net: sp.net, lines: sp.lines.map((x) => ({ label: x.label, amount: x.amount })), facilityName: facility?.name ?? null },
        decisionNote: r.decisionNote,
        decidedAt: r.decidedAt,
        canDecide: r.status === 'pending' && !acceptedReservation(state, lot.id),
        competing: Object.values(state.reservations).filter((x) => x.lotId === lot.id && x.id !== r.id && x.status === 'pending').length,
      }
    })
}

export type RequestsView = { pending: RequestRow[]; decided: RequestRow[]; empty: boolean }

export function requestsView(state: AppData, viewer: Viewer): RequestsView | null {
  if (!ownerOrg(state, viewer)) return null
  const rows = requestRows(state, viewer)
  return { pending: rows.filter((r) => r.status === 'pending'), decided: rows.filter((r) => r.status !== 'pending'), empty: rows.length === 0 }
}

export type OwnerHome = {
  greeting: string
  dateText: string
  stats: { buildings: number; donorBuildings: number; newProjects: number; itemsSurveyed: number; listed: number; shared: number; reserved: number; potentialAvoidedT: number; requestsAwaiting: number; claimsAwaiting: number }
  buildings: BuildingCard[]
  requests: RequestRow[]
  /** Buildings surveyors ask the owner to confirm, waiting. */
  claims: ClaimRow[]
  newProjects: OwnerProjectRow[]
  activity: ActivityRow[]
}

export function ownerHome(state: AppData, viewer: Viewer): OwnerHome | null {
  const orgId = ownerOrg(state, viewer)
  if (!orgId) return null
  const user = state.users[viewer.userId]
  const buildings = buildingsOfUser(state, viewer.userId)
  const cards = buildings.map((b) => buildingCard(state, b, 'owner', viewer))
  let potential = 0
  for (const b of buildings) for (const row of priorityFor(state, b.id).rows) if (row.route === 'recover') potential += row.carbon
  const requests = requestRows(state, viewer)
  const claims = claimRowsForOwner(state, viewer).filter((c) => c.status === 'pending')
  const newProjects = ownerProjects(state, viewer).map((p) => ownerProjectRow(state, p))
  return {
    greeting: greeting(viewer.now, firstName(user.name)),
    dateText: longDate(todayOf(viewer)),
    stats: {
      buildings: buildings.length,
      donorBuildings: buildings.length,
      newProjects: newProjects.length,
      claimsAwaiting: claims.length,
      itemsSurveyed: cards.reduce((n, c) => n + c.itemCount, 0),
      listed: cards.reduce((n, c) => n + c.counts.open, 0),
      shared: cards.reduce((n, c) => n + c.counts.matched_only, 0),
      reserved: cards.reduce((n, c) => n + c.counts.reserved, 0),
      potentialAvoidedT: potential,
      requestsAwaiting: requests.filter((r) => r.status === 'pending').length,
    },
    buildings: cards,
    requests: requests.filter((r) => r.status === 'pending').slice(0, 5),
    claims,
    newProjects,
    activity: activityFor(state, viewer, {}, 8),
  }
}

export type StructureOption = { kind: StructuralElementKind; label: string; materials: { value: string; label: string; systems: { id: string; label: string }[] }[] }

/** Every element with its materials and, for each material, its systems: the structure editor's choices. */
export function structureOptions(): StructureOption[] {
  return ELEMENT_ORDER.map((kind) => ({
    kind,
    label: ELEMENT_LABELS[kind],
    materials: materialsFor(kind).map((m) => ({ value: m, label: MATERIAL_LABELS[m], systems: systemsFor(kind, m).map((x) => ({ id: x.id, label: x.label })) })),
  }))
}

export type NewBuildingOptions = {
  /** Owners choose Donor building or New project; surveyors add buildings to survey. */
  mode: 'owner' | 'surveyor'
  kinds: { value: 'donor' | 'project'; label: string; description: string }[]
  regions: string[]
  surveyors: { orgId: string; name: string }[]
  /** Architecture practices on the platform, for a New project. Owners only. */
  architects: { orgId: string; name: string }[]
  projectTypes: { value: string; label: string }[]
  stages: { value: number; label: string }[]
  structure: StructureOption[]
}

/** Choices for the add building dialog. Owners also get what a New project needs; surveyors only the building. */
export function newBuildingOptions(state: AppData, viewer: Viewer): NewBuildingOptions | null {
  const role = roleOfUser(state, viewer.userId)
  if (role === 'surveyor') return { mode: 'surveyor', kinds: [], regions: [...REGIONS], surveyors: [], architects: [], projectTypes: [], stages: [], structure: structureOptions() }
  if (role !== 'owner') return null
  return {
    mode: 'owner',
    kinds: [
      { value: 'donor', label: DONOR_BUILDING, description: 'Coming down or being stripped out. Survey it and offer what it holds for reuse.' },
      { value: 'project', label: NEW_PROJECT, description: 'Being built or refurbished. Source reclaimed materials for it with your architect.' },
    ],
    regions: [...REGIONS],
    surveyors: surveyorOptions(state),
    architects: architectOptions(state),
    projectTypes: PROJECT_TYPES.map((t) => ({ value: t, label: PROJECT_TYPE_LABELS[t] })),
    stages: RIBA_STAGES.map((label, i) => ({ value: i, label: `${i}, ${label}` })),
    structure: structureOptions(),
  }
}

/** Architecture practices on the platform, by name. Shown to an owner only to appoint one to their own New project. */
export function architectOptions(state: AppData): { orgId: string; name: string }[] {
  return Object.values(state.world.orgs)
    .filter((o) => roleOfOrg(state, o.id) === 'architect')
    .map((o) => ({ orgId: o.id, name: o.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))
}

export function surveyorOptions(state: AppData): { orgId: string; name: string }[] {
  return Object.values(state.world.orgs)
    .filter((o) => roleOfOrg(state, o.id) === 'surveyor')
    .map((o) => ({ orgId: o.id, name: o.name }))
}

// ---------- Building overview and inventory ----------

export type BuildingOverview = {
  header: BuildingRef
  /** For the owner's appoint surveyor control. */
  surveyorOrgId: string | null
  surveyorOptions: { orgId: string; name: string }[]
  facts: { label: string; value: string }[]
  /** The overview's Building card: the facts less the structure, which the Structure card beside it records in full. */
  cardFacts: { label: string; value: string }[]
  programme: { label: string; date: string | null; text: string }[]
  survey: { status: SurveyStatus; label: string; surveyorName: string; submittedAt: string | null; itemCount: number }
  byTypology: { typology: string; label: string; count: number; massT: number }[]
  counts: VisibilityCounts
  activity: ActivityRow[]
  /** Round 2: the structure element by element, and the editor's choices. */
  structure: {
    rows: { kind: StructuralElementKind; label: string; materialLabel: string; systemLabel: string; note: string }[]
    summary: string
    notes: string
    canEdit: boolean
    options: StructureOption[]
  }
  /** The deconstruction contractor invited to set availability dates, with how many items it has dated. */
  contractor: { orgId: string; name: string; datedCount: number; itemCount: number } | null
  /** Firms that can be invited as contractor (owner and surveyor sides). */
  contractorOptions: { orgId: string; name: string }[]
  /** A contractor invited by email that has not joined Tallyard yet (owner and surveyor sides). */
  contractorInvite: { email: string; invitedText: string; clearsText: string | null } | null
  /** The collapsed activity panel's one line: how many updates and the latest. */
  activitySummary: ActivitySummary
  /** Testing requests still open, for the owner and surveyor sides; null for a contractor. */
  testing: { open: number; href: string } | null
}

export function buildingOverview(state: AppData, viewer: Viewer, buildingId: string): BuildingOverview | null {
  const header = buildingHeader(state, viewer, buildingId)
  if (!header) return null
  const b = state.world.buildings[buildingId]
  const items = itemsOf(state, buildingId)
  const facts: { label: string; value: string }[] = [
    { label: 'Address', value: b.address },
    { label: 'Local authority', value: b.localAuthority },
    { label: 'Region', value: b.region },
  ]
  if (b.yearBuilt) facts.push({ label: 'Built', value: String(b.yearBuilt) })
  if (b.storeys) facts.push({ label: 'Storeys', value: String(b.storeys) })
  if (b.giaM2) facts.push({ label: 'Gross internal area', value: `${f.number(b.giaM2)} m2` })
  const summary = structureSummary(b.structure)
  if (summary || b.structureType) facts.push({ label: 'Structure', value: summary || b.structureType })
  const date = (d: string | null) => (d ? formatDate(d) : 'Not set')
  const records = header.side === 'owner' || header.side === 'surveyor'
  const datedCount = items.filter((i) => i.contractorAvailableFrom !== null).length
  const openTests = Object.values(state.testingRequests).filter((t) => t.buildingId === buildingId && (t.status === 'requested' || t.status === 'booked')).length
  const typologies = ['structure', 'envelope', 'finishes'] as const
  const activity = activityFor(state, viewer, { buildingId }, 8)
  return {
    header,
    surveyorOrgId: b.surveyorOrgId,
    surveyorOptions: header.side === 'owner' ? surveyorOptions(state) : [],
    facts,
    cardFacts: facts.filter((x) => x.label !== 'Structure'),
    programme: [
      { label: 'Strip-out starts', date: b.programme.stripOutStart, text: date(b.programme.stripOutStart) },
      { label: 'Dismantling starts', date: b.programme.dismantlingStart, text: date(b.programme.dismantlingStart) },
      { label: 'Site clear by', date: b.programme.clearBy, text: date(b.programme.clearBy) },
    ],
    survey: { status: header.surveyStatus, label: header.surveyStatusLabel, surveyorName: header.surveyorName, submittedAt: state.surveys[buildingId]?.submittedAt ?? null, itemCount: items.length },
    byTypology: typologies.map((t) => {
      const xs = items.filter((i) => typologyOf(i.family) === t)
      return { typology: t, label: TYPOLOGY_LABELS[t], count: xs.length, massT: xs.reduce((s, i) => s + itemMeasures(i).massT, 0) }
    }),
    counts: visibilityCounts(state, buildingId),
    activity,
    activitySummary: activitySummary(activity),
    structure: {
      rows: b.structure.map((e) => ({ kind: e.kind, label: ELEMENT_LABELS[e.kind], materialLabel: e.material ? MATERIAL_LABELS[e.material] : 'Not recorded', systemLabel: e.systemId ? (structureSystemById(e.systemId)?.label ?? '') : 'Not recorded', note: e.note })),
      summary,
      notes: b.structureType,
      canEdit: records,
      options: structureOptions(),
    },
    contractor: b.contractorOrgId ? { orgId: b.contractorOrgId, name: state.world.orgs[b.contractorOrgId]?.name ?? '', datedCount, itemCount: items.length } : null,
    contractorOptions: records ? surveyorOptions(state) : [],
    contractorInvite:
      records && b.contractorInvite
        ? {
            email: b.contractorInvite.email,
            invitedText: formatDate(b.contractorInvite.invitedAt.slice(0, 10)),
            // The current contractor's dates go when the invited firm joins (note 28): said before it happens.
            clearsText: b.contractorOrgId ? datesClearedText(state.world.orgs[b.contractorOrgId]?.name ?? null, datedCount, 'on_join') : null,
          }
        : null,
    testing: records ? { open: openTests, href: `/app/buildings/${buildingId}/testing` } : null,
  }
}

export type InventoryRow = {
  itemId: string
  lotId: string
  tag: string
  title: string
  family: FamilyId
  familyLabel: string
  typologyLabel: string
  quantityText: string
  massT: number
  condition: string
  recoverability: string
  expectedAvailableFrom: string | null
  expectedText: string
  /** The owner's date for the lot (owner only). */
  availableFrom: string | null
  /** The deconstruction contractor's month, or 'Not set'. */
  contractorText: string
  /** The contractor's date differs from the lot's date (owner only). */
  contractorDiffers: boolean
  visibility: Visibility
  visibilityLabel: string
  reserved: boolean
  photoId: string | null
  photoCount: number
  capturedOn: string
  capturedBy: string
  href: string
}

export type InventoryView = {
  header: BuildingRef
  rows: InventoryRow[]
  canCapture: boolean
  canSubmit: boolean
  counts: VisibilityCounts
  empty: boolean
  /** The deconstruction contractor's name, '' when none is appointed. */
  contractorName: string
  /** The owner may apply the contractor's dates: some private, unreserved lot's date differs. */
  canApplyContractorDates: boolean
  /** How many lots applying would change. */
  applyCount: number
}

/** Whether the contractor's date would change this lot when the owner applies it: private, not reserved, different. */
function contractorApplies(state: AppData, item: InventoryItem, lot: Lot): boolean {
  return !!item.contractorAvailableFrom && lot.visibility === 'private' && !acceptedReservation(state, lot.id) && lot.availableFrom !== item.contractorAvailableFrom
}

export function inventoryView(state: AppData, viewer: Viewer, buildingId: string): InventoryView | null {
  const header = recordHeader(state, viewer, buildingId)
  if (!header) return null
  const owner = header.side === 'owner'
  const b = state.world.buildings[buildingId]
  let applyCount = 0
  const rows = itemsOf(state, buildingId).map((item) => {
    const lot = lotOfItem(state.world, item.id)!
    if (owner && contractorApplies(state, item, lot)) applyCount++
    return {
      itemId: item.id,
      lotId: lot.id,
      tag: item.tag,
      title: titleFor(item.spec),
      family: item.family,
      familyLabel: FAMILIES[item.family].label,
      typologyLabel: TYPOLOGY_LABELS[typologyOf(item.family)],
      quantityText: itemQuantityText(item),
      massT: itemMeasures(item).massT,
      condition: item.condition,
      recoverability: item.recoverability,
      expectedAvailableFrom: item.expectedAvailableFrom,
      expectedText: item.expectedAvailableFrom ? formatMonth(item.expectedAvailableFrom) : 'Not set',
      availableFrom: owner ? lot.availableFrom : null,
      contractorText: item.contractorAvailableFrom ? formatMonth(item.contractorAvailableFrom) : 'Not set',
      contractorDiffers: owner && !!item.contractorAvailableFrom && lot.availableFrom !== item.contractorAvailableFrom,
      visibility: lot.visibility,
      visibilityLabel: OWNER_VISIBILITY_LABELS[lot.visibility],
      reserved: !!acceptedReservation(state, lot.id),
      photoId: item.photos[0]?.id ?? null,
      photoCount: item.photos.length,
      capturedOn: item.capturedOn,
      capturedBy: item.capturedBy,
      href: `/app/buildings/${buildingId}/inventory/${item.id}`,
    }
  })
  return {
    header,
    rows,
    canCapture: true,
    // Round 2: a building the surveyor added waits for its owner's confirmation before the survey goes in.
    canSubmit: header.side === 'surveyor' && header.surveyStatus !== 'submitted' && rows.length > 0 && b.ownerOrgId !== null,
    counts: visibilityCounts(state, buildingId),
    empty: rows.length === 0,
    contractorName: header.contractorName,
    canApplyContractorDates: owner && applyCount > 0,
    applyCount,
  }
}

export type ItemDetail = {
  header: BuildingRef
  itemId: string
  lotId: string
  tag: string
  title: string
  item: InventoryItem
  familyLabel: string
  typologyLabel: string
  quantityText: string
  massT: number
  expectedText: string
  photos: { id: string; src: string | null; kind: 'data' | 'blob'; isPublic: boolean }[]
  /** Grades and the expected date can change while the lot is private. */
  canEditGrades: boolean
  canEditNotes: boolean
  /** Owner only from here. */
  owner: {
    visibility: Visibility
    visibilityLabel: string
    availableFrom: string | null
    ask: number | null
    reserve: number | null
    figures: ItemFigures
    route: DecisionRoute
    routeLabel: string
    preview: ListingCard
    requests: RequestRow[]
    reserved: boolean
    /** The surveyor's and the contractor's months beside what buyers see. */
    dates: { surveyorText: string; contractorText: string; contractorDatedOn: string | null; buyersSeeText: string; canUseContractor: boolean }
  } | null
}

export function itemDetail(state: AppData, viewer: Viewer, buildingId: string, itemId: string): ItemDetail | null {
  const header = recordHeader(state, viewer, buildingId)
  const item = state.world.items[itemId]
  if (!header || !item || item.buildingId !== buildingId) return null
  const lot = lotOfItem(state.world, itemId)!
  const today = todayOf(viewer)
  let owner: ItemDetail['owner'] = null
  if (header.side === 'owner') {
    const figures = itemFigures(state, itemId, today)
    const row = priorityFor(state, buildingId).rows.find((r) => r.itemId === itemId)
    const route = decisionTreeRoute(item.family, row?.route ?? 'recover')
    const preview = listingCard(state, previewListing(state, lot, lot.visibility === 'matched_only' ? 'matched_only' : 'open', null, today), null, today)
    owner = {
      visibility: lot.visibility,
      visibilityLabel: OWNER_VISIBILITY_LABELS[lot.visibility],
      availableFrom: lot.availableFrom,
      ask: lot.askPerUnit,
      reserve: lot.reservePerUnit,
      figures,
      route,
      routeLabel: DECISION_ROUTE_LABELS[route],
      preview,
      requests: requestRows(state, viewer).filter((r) => r.itemId === itemId),
      reserved: !!acceptedReservation(state, lot.id),
      dates: {
        surveyorText: item.expectedAvailableFrom ? formatMonth(item.expectedAvailableFrom) : 'Not set',
        contractorText: item.contractorAvailableFrom ? formatMonth(item.contractorAvailableFrom) : 'Not set',
        contractorDatedOn: item.contractorDatedOn,
        buyersSeeText: preview.availabilityText,
        canUseContractor: contractorApplies(state, item, lot),
      },
    }
  }
  return {
    header,
    itemId,
    lotId: lot.id,
    tag: item.tag,
    title: titleFor(item.spec),
    item,
    familyLabel: FAMILIES[item.family].label,
    typologyLabel: TYPOLOGY_LABELS[typologyOf(item.family)],
    quantityText: itemQuantityText(item),
    massT: itemMeasures(item).massT,
    expectedText: item.expectedAvailableFrom ? formatMonth(item.expectedAvailableFrom) : 'Not set',
    photos: item.photos.map((p) => ({ id: p.id, src: p.src, kind: p.kind, isPublic: p.isPublic })),
    canEditGrades: lot.visibility === 'private',
    canEditNotes: true,
    owner,
  }
}

// ---------- Priorities ----------

export type PriorityViewRow = PriorityRow & { title: string; quantityText: string; treeRoute: DecisionRoute; treeLabel: string; tone: 'reuse' | 'downcycle' | 'recycle' | 'other' }

export type LegendStep = { route: DecisionRoute; step: number; label: string; assigned: boolean; count: number; hint: string }

export type PrioritiesView = { header: BuildingRef; result: PriorityResult; rows: PriorityViewRow[]; recoverCount: number; legend: LegendStep[]; note: string; empty: boolean }

const TREE: DecisionRoute[] = ['reuse', 'upcycle', 'downcycle', 'recycle', 'scrap']
const ASSIGNED: DecisionRoute[] = ['reuse', 'downcycle', 'recycle']
const TREE_HINTS: Record<DecisionRoute, string> = {
  reuse: 'Recovered intact and used again for the same purpose.',
  upcycle: 'Reworked into a product of higher value.',
  downcycle: 'Crushed, chipped or broken for a lower use.',
  recycle: 'Reprocessed into the same material, such as steel remelted.',
  scrap: 'Disposed of with no material recovered.',
}

export function prioritiesView(state: AppData, viewer: Viewer, buildingId: string): PrioritiesView | null {
  const header = buildingHeader(state, viewer, buildingId)
  if (!header || header.side !== 'owner') return null
  const result = priorityFor(state, buildingId)
  const rows = result.rows.map((row) => {
    const item = state.world.items[row.itemId]
    const treeRoute = decisionTreeRoute(item.family, row.route)
    const tone: PriorityViewRow['tone'] = treeRoute === 'reuse' || treeRoute === 'downcycle' || treeRoute === 'recycle' ? treeRoute : 'other'
    return { ...row, title: titleFor(item.spec), quantityText: itemQuantityText(item), treeRoute, treeLabel: DECISION_ROUTE_LABELS[treeRoute], tone }
  })
  return {
    header,
    result,
    rows,
    recoverCount: rows.filter((r) => r.route === 'recover').length,
    legend: TREE.map((route, i) => ({ route, step: i + 1, label: DECISION_ROUTE_LABELS[route], assigned: ASSIGNED.includes(route), count: rows.filter((r) => r.treeRoute === route).length, hint: TREE_HINTS[route] })),
    note: LABELS.L41,
    empty: rows.length === 0,
  }
}

// ---------- Listings ----------

/** The public listing as it would stand with a chosen visibility and date. The real projection, never a copy. */
export function previewListing(state: AppData, lot: Lot, visibility: 'open' | 'matched_only', availableFrom: string | null, today: string): PublicListing {
  const draft: Lot = { ...lot, visibility, listedMonth: lot.listedMonth ?? today.slice(0, 7), availableFrom: availableFrom ?? lot.availableFrom }
  const item = state.world.items[lot.itemId]
  return toPublicListing(draft, item, state.world.buildings[item.buildingId], state.world.snapshot, A)
}

export type ListingRow = {
  lotId: string
  itemId: string
  tag: string
  title: string
  family: FamilyId
  visibility: Visibility
  choice: LotVisibilityChoice
  visibilityLabel: string
  ask: number | null
  reserve: number | null
  suggested: { ask: number; reserve: number }
  guide: number
  unitLabel: string
  tick: number
  availableFrom: string | null
  expectedText: string
  reserved: boolean
  canChange: boolean
}

export type ListingsView = {
  header: BuildingRef
  locationLevel: SourceBuilding['locationLevel']
  timingLevel: SourceBuilding['timingLevel']
  disclosure: Disclosure
  rows: ListingRow[]
  counts: VisibilityCounts
  sharedProjectCount: number
  blockedText: string
  empty: boolean
}

export function listingsView(state: AppData, viewer: Viewer, buildingId: string): ListingsView | null {
  const header = buildingHeader(state, viewer, buildingId)
  if (!header || header.side !== 'owner') return null
  const b = state.world.buildings[buildingId]
  const today = todayOf(viewer)
  const orgId = state.users[viewer.userId].orgId
  const rows = itemsOf(state, buildingId).map((item) => {
    const lot = lotOfItem(state.world, item.id)!
    const fig = itemFigures(state, item.id, today)
    const reserved = !!acceptedReservation(state, lot.id)
    return {
      lotId: lot.id,
      itemId: item.id,
      tag: item.tag,
      title: titleFor(item.spec),
      family: item.family,
      visibility: lot.visibility,
      choice: VISIBILITY_CHOICE[lot.visibility],
      visibilityLabel: OWNER_VISIBILITY_LABELS[lot.visibility],
      ask: lot.askPerUnit,
      reserve: lot.reservePerUnit,
      suggested: { ask: fig.sellerMandate.ask, reserve: fig.sellerMandate.reserve },
      guide: fig.guide.guide,
      unitLabel: FAMILIES[item.family].pricingUnitLabel,
      tick: FAMILIES[item.family].tick,
      availableFrom: lot.availableFrom,
      expectedText: item.expectedAvailableFrom ? formatMonth(item.expectedAvailableFrom) : 'Not set',
      reserved,
      canChange: !reserved,
    }
  })
  return {
    header,
    locationLevel: b.locationLevel,
    timingLevel: b.timingLevel,
    disclosure: disclosureWith(state, buildingId, null),
    rows,
    counts: visibilityCounts(state, buildingId),
    sharedProjectCount: Object.values(state.world.projects).filter((p) => p.approvedByOwnerOrgIds.includes(orgId)).length,
    blockedText: LABELS.L34,
    empty: rows.length === 0,
  }
}

export type ListingDraft = { visibility: LotVisibilityChoice; ask: string; reserve: string; availableFrom: string }

export type ListingDraftView = {
  prices: PriceCheck
  disclosure: Disclosure
  /** Publishing is refused at a High disclosure score. */
  blocked: boolean
  preview: ListingCard
  /** The date can change only while the lot is private. */
  dateEditable: boolean
  canSubmit: boolean
  problem: string | null
}

/** The publish form as the owner edits it: price checks, the disclosure score with this lot, and the live preview. */
export function listingDraftView(state: AppData, viewer: Viewer, lotId: string, draft: ListingDraft): ListingDraftView | null {
  const lot = state.world.lots[lotId]
  const item = lot ? state.world.items[lot.itemId] : null
  if (!lot || !item || buildingSide(state, viewer.userId, item.buildingId) !== 'owner') return null
  const today = todayOf(viewer)
  const target: Visibility = draft.visibility === 'published' ? 'open' : draft.visibility === 'shared' ? 'matched_only' : 'private'
  const prices = draft.visibility === 'private' ? { ask: NaN, reserve: NaN, valid: true, problem: null } : checkPrices(draft.ask.trim() === '' ? NaN : Number(draft.ask), draft.reserve.trim() === '' ? NaN : Number(draft.reserve), item.family)
  const disclosure = disclosureWith(state, item.buildingId, { lotId, visibility: target })
  const blocked = target === 'open' && lot.visibility !== 'open' && disclosure.blocksPublishing
  const dateEditable = lot.visibility === 'private'
  const date = dateEditable && /^\d{4}-\d{2}-\d{2}$/.test(draft.availableFrom) ? draft.availableFrom : null
  const preview = listingCard(state, previewListing(state, lot, target === 'matched_only' ? 'matched_only' : 'open', date, today), null, today)
  const reserved = !!acceptedReservation(state, lotId)
  const problem = reserved ? 'This lot is reserved. Its visibility cannot change.' : blocked ? LABELS.L34 : prices.problem
  return { prices, disclosure, blocked, preview, dateEditable, canSubmit: !reserved && !blocked && prices.valid, problem }
}

/** The disclosure score with trial settings, before the owner saves them. */
export function disclosurePreview(state: AppData, viewer: Viewer, buildingId: string, override: { locationLevel?: SourceBuilding['locationLevel']; timingLevel?: SourceBuilding['timingLevel'] }): Disclosure | null {
  if (buildingSide(state, viewer.userId, buildingId) !== 'owner') return null
  return disclosureWith(state, buildingId, null, override)
}

// ---------- Sharing ----------

export type SharingRow = { projectId: string; text: string; orgType: string; projectType: string; region: string; needByQuarter: string; granted: boolean }

export type SharingView = { rows: SharingRow[]; sharedLotCount: number; grantedCount: number; empty: boolean }

/** Every other project on the platform as a blind line, and whether the owner shares lots with it. */
export function sharingView(state: AppData, viewer: Viewer): SharingView | null {
  const orgId = ownerOrg(state, viewer)
  if (!orgId) return null
  const rows = Object.values(state.world.projects)
    .filter((p) => p.clientOrgId !== orgId && p.architectOrgId !== orgId)
    .map((p) => {
      const blind = toBlindBuyer(p)
      return { projectId: p.id, text: blindBuyerText(blind), orgType: blind.orgType, projectType: blind.projectType, region: blind.region, needByQuarter: blind.needByQuarter, granted: p.approvedByOwnerOrgIds.includes(orgId) }
    })
  const sharedLotCount = Object.values(state.world.lots).filter((l) => l.visibility === 'matched_only' && state.world.buildings[state.world.items[l.itemId].buildingId]?.ownerOrgId === orgId).length
  return { rows, sharedLotCount, grantedCount: rows.filter((r) => r.granted).length, empty: rows.length === 0 }
}

/**
 * The Marketplace prompt for a donor building owner with no New project yet (audit 16 October, note C5): it reads the
 * marketplace as a client would, and a New project lets its architect save materials to it. Null for anyone else.
 */
export function ownerBuildPrompt(state: AppData, viewer: Viewer): { title: string; text: string; href: string } | null {
  if (roleOfUser(state, viewer.userId) !== 'owner') return null
  if (ownerProjects(state, viewer).length > 0) return null
  return {
    title: 'Building something too?',
    text: 'Add a new project to save materials to it and check them against its start on site.',
    href: '/app/buildings?new=project',
  }
}
