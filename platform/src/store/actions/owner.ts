// The donor building owner's decisions: buildings, their structure, surveyor appointments, what is visible to whom
// and from when, disclosure settings, which projects may see shared lots, and the owner's own new projects.
import type { LocationLevel, SourceBuilding, StructuralElement, TimingLevel, EraBand } from '../../domain/types'
import { DEFAULT_ASSUMPTIONS as A, REGIONS } from '../../domain/reference/assumptions'
import { FAMILIES } from '../../domain/reference/families'
import { V1_ASSUMPTIONS } from '../../domain/reference/v1assumptions'
import { isValidLocalAuthority, normaliseLocalAuthority } from '../../domain/reference/places'
import { ticksOf } from '../../domain/money'
import { disclosureScore, type Disclosure } from '../../domain/engines/disclosure'
import { timelineFit } from '../../domain/engines/timeline'
import { blindBuyerText, toBlindBuyer } from '../../domain/privacy/blindBuyer'
import { normaliseStructure } from '../../domain/engines/structure'
import type { ActionResult, Actor, AppData, SurveyRecord } from '../types'
import { ERRORS, buildingOrgIds, buildingSide, buyerSideOrgIds, isBuildingOwner, isProjectClient, projectOrgIds, roleOfOrg, roleOfUser } from '../access'
import { mint } from '../ids'
import { acceptedReservation, listIdFor, listingOf } from '../lots'
import { listJoin, log, notify, plural } from '../notifications'
import * as ops from '../worldOps'
import { materialHref, sharedWithProjectHref } from '../paths'
import { acting, clean, fail, isIsoDate, ok, withWorld, type Acting } from './common'
import { pendingClientLink, PROJECT_ERRORS, projectRecord, validateNewProject, newProgrammeDates, type NewProjectInput } from './projects'
import { PROGRAMME_ERRORS } from '../../domain/engines/programme'

export const OWNER_ERRORS = {
  name: 'Enter the building name.',
  address: 'Enter the address.',
  region: 'Choose a region.',
  localAuthority: 'Choose a local authority in this region.',
  badDate: 'Enter a valid date.',
  order: 'The programme dates must run in order: strip-out, dismantling, clear by.',
  year: 'Enter a year between 1800 and this year.',
  surveyor: 'Choose a surveying firm.',
  noLot: 'That item could not be found.',
  reserved: 'This lot is reserved. Its visibility cannot change.',
  prices: 'Enter an ask and a reserve.',
  reserveAboveAsk: 'The reserve cannot be above the ask.',
  blocked: 'Publishing at this disclosure level lets an outsider narrow down the building. Reduce what is disclosed first.',
  notPrivate: 'The date can be changed only while the lot is private.',
  noPhoto: 'That photo could not be found.',
  architect: 'Choose an architecture practice.',
  hasArchitect: 'This project already has an architect.',
} as const

export type LotVisibilityChoice = 'private' | 'shared' | 'published'

const TO_VISIBILITY = { private: 'private', shared: 'matched_only', published: 'open' } as const

export function ownerOrgIdOf(state: AppData, userId: string): string | null {
  return roleOfUser(state, userId) === 'owner' ? (state.users[userId]?.orgId ?? null) : null
}

// ---------- Buildings ----------

/** The details of a building that the owner, or a surveyor before its owner confirms it, records. */
export type BuildingDetailsInput = {
  name: string
  address: string
  postcodeDistrict: string
  localAuthority: string
  region: string
  yearBuilt: number | null
  storeys: number | null
  giaM2: number | null
  /** Other notes on the structure. */
  structureType: string
  /** The structure element by element; empty when not recorded yet or left out. */
  structure?: StructuralElement[]
  stripOutStart: string | null
  dismantlingStart: string | null
  clearBy: string | null
}

export type NewBuildingInput = BuildingDetailsInput & { surveyorOrgId: string | null }

function eraFor(year: number | null): EraBand | null {
  if (year === null) return null
  return year >= 1970 ? '1970 or later' : 'before 1970'
}

function checkProgramme(input: { stripOutStart: string | null; dismantlingStart: string | null; clearBy: string | null }): string | null {
  const dates = [input.stripOutStart, input.dismantlingStart, input.clearBy]
  for (const d of dates) if (d !== null && !isIsoDate(d)) return OWNER_ERRORS.badDate
  const set = dates.filter((d): d is string => d !== null)
  for (let i = 1; i < set.length; i++) if (set[i] < set[i - 1]) return OWNER_ERRORS.order
  return null
}

/** The first problem with a building's details, or null. `today` bounds the year built. */
export function checkBuildingDetails(input: BuildingDetailsInput, today: string): string | null {
  if (!clean(input.name, 120)) return OWNER_ERRORS.name
  if (!clean(input.address, 200)) return OWNER_ERRORS.address
  if (!(REGIONS as readonly string[]).includes(input.region)) return OWNER_ERRORS.region
  // The requirements before demolition follow the local authority, so a listed one must be in its own region.
  if (!isValidLocalAuthority(input.region, input.localAuthority)) return OWNER_ERRORS.localAuthority
  const thisYear = Number(today.slice(0, 4))
  if (input.yearBuilt !== null && (!Number.isInteger(input.yearBuilt) || input.yearBuilt < 1800 || input.yearBuilt > thisYear)) return OWNER_ERRORS.year
  const bad = checkProgramme(input)
  if (bad) return bad
  return normaliseStructure(input.structure ?? []).error
}

/** A building record from checked details. Records are private; nothing is listed until the owner decides. */
export function buildingRecord(id: string, input: BuildingDetailsInput, orgs: { ownerOrgId: string | null; surveyorOrgId: string | null; createdByOrgId: string }): SourceBuilding {
  const hubKm = V1_ASSUMPTIONS.regionHubKm[input.region]
  return {
    id,
    ownerOrgId: orgs.ownerOrgId,
    sellerType: 'Asset owner',
    sourceType: 'deconstruction',
    name: clean(input.name, 120),
    address: clean(input.address, 200),
    postcodeDistrict: clean(input.postcodeDistrict, 8).toUpperCase(),
    localAuthority: normaliseLocalAuthority(clean(input.localAuthority, 80)),
    region: input.region,
    yearBuilt: input.yearBuilt,
    eraBand: eraFor(input.yearBuilt),
    storeys: input.storeys,
    giaM2: input.giaM2,
    structureType: clean(input.structureType, 200),
    structure: normaliseStructure(input.structure ?? []).elements,
    createdByOrgId: orgs.createdByOrgId,
    contractorOrgId: null,
    tenants: [],
    programme: { stripOutStart: input.stripOutStart, dismantlingStart: input.dismantlingStart, clearBy: input.clearBy },
    defaultHubId: Object.entries(hubKm).sort((x, y) => x[1] - y[1])[0][0],
    surveyorOrgId: orgs.surveyorOrgId,
    locationLevel: 'region',
    timingLevel: 'quarter',
    arisingsTitle: 'owner',
    distancesKm: { ...hubKm },
    surveyedBy: null,
  }
}

/** The owner adds a building. Its records are private; nothing is listed until the owner decides. */
export function createBuilding(state: AppData, actor: Actor, input: NewBuildingInput): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'owner') return fail(state, ERRORS.role)
  const bad = checkBuildingDetails(input, a.today)
  if (bad) return fail(state, bad)
  if (input.surveyorOrgId && roleOfOrg(state, input.surveyorOrgId) !== 'surveyor') return fail(state, OWNER_ERRORS.surveyor)
  const m = mint(state, 'bld', (id) => !!state.world.buildings[id])
  let s = m.state
  const building = buildingRecord(m.id, input, { ownerOrgId: a.org.id, surveyorOrgId: input.surveyorOrgId, createdByOrgId: a.org.id })
  const name = building.name
  const w = structuredClone(s.world)
  w.buildings[m.id] = building
  s = withWorld(s, w)
  const survey: SurveyRecord = { buildingId: m.id, status: 'not_started', appointedAt: input.surveyorOrgId ? a.now : null, submittedAt: null, submittedByUserId: null }
  s = { ...s, surveys: { ...s.surveys, [m.id]: survey } }
  s = log(s, { at: a.now, orgIds: buildingOrgIds(building), buildingId: m.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `added ${name}`, href: `/app/buildings/${m.id}` })
  if (input.surveyorOrgId) s = notify(s, { orgIds: [input.surveyorOrgId], kind: 'appointed', title: `${a.org.name} appointed you to survey ${name}`, body: `${name}, ${building.address}.`, href: `/app/buildings/${m.id}/capture`, at: a.now, actorUserId: a.user.id })
  return ok(s, m.id)
}

export type BuildingPatch = Partial<Pick<NewBuildingInput, 'name' | 'address' | 'postcodeDistrict' | 'localAuthority' | 'region' | 'stripOutStart' | 'dismantlingStart' | 'clearBy'>>

/**
 * Whether the person may edit a building's details: its owner, or the surveying firm that added it while no owner has
 * confirmed it (so a surveyor can correct what they typed, and the owner can correct it once linked).
 */
export function canEditBuildingDetails(state: AppData, userId: string, buildingId: string): boolean {
  const b = state.world.buildings[buildingId]
  if (!b) return false
  if (isBuildingOwner(state, userId, buildingId)) return true
  return buildingSide(state, userId, buildingId) === 'surveyor' && b.ownerOrgId === null && b.createdByOrgId === state.users[userId]?.orgId
}

/**
 * The owner (or the firm that added an unlinked building) edits its name, address, location or programme. A listed
 * local authority must sit in the region.
 */
export function updateBuilding(state: AppData, actor: Actor, buildingId: string, patch: BuildingPatch): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (!canEditBuildingDetails(state, actor.userId, buildingId)) return fail(state, ERRORS.role)
  const programme = {
    stripOutStart: patch.stripOutStart !== undefined ? patch.stripOutStart : b.programme.stripOutStart,
    dismantlingStart: patch.dismantlingStart !== undefined ? patch.dismantlingStart : b.programme.dismantlingStart,
    clearBy: patch.clearBy !== undefined ? patch.clearBy : b.programme.clearBy,
  }
  const bad = checkProgramme(programme)
  if (bad) return fail(state, bad)
  const name = patch.name !== undefined ? clean(patch.name, 120) : b.name
  if (!name) return fail(state, OWNER_ERRORS.name)
  const address = patch.address !== undefined ? clean(patch.address, 200) : b.address
  if (!address) return fail(state, OWNER_ERRORS.address)
  const region = patch.region !== undefined ? patch.region : b.region
  if (!(REGIONS as readonly string[]).includes(region)) return fail(state, OWNER_ERRORS.region)
  const postcodeDistrict = patch.postcodeDistrict !== undefined ? clean(patch.postcodeDistrict, 8).toUpperCase() : b.postcodeDistrict
  const localAuthority = patch.localAuthority !== undefined ? normaliseLocalAuthority(clean(patch.localAuthority, 80)) : b.localAuthority
  if (!isValidLocalAuthority(region, localAuthority)) return fail(state, OWNER_ERRORS.localAuthority)
  const w = structuredClone(state.world)
  const moved = region !== b.region
  const hubKm = V1_ASSUMPTIONS.regionHubKm[region]
  w.buildings[buildingId] = {
    ...w.buildings[buildingId],
    name,
    address,
    postcodeDistrict,
    localAuthority,
    region,
    programme,
    ...(moved ? { distancesKm: { ...b.distancesKm, ...hubKm }, defaultHubId: Object.entries(hubKm).sort((x, y) => x[1] - y[1])[0][0] } : {}),
  }
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: buildingOrgIds(w.buildings[buildingId]), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: 'updated the building details', href: `/app/buildings/${buildingId}` })
  return ok(s)
}

export type StructureInput = { elements: StructuralElement[]; notes: string }

/** The owner or the surveyor records the building's structure, element by element, with other notes. */
export function setBuildingStructure(state: AppData, actor: Actor, buildingId: string, input: StructureInput): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  const side = buildingSide(state, actor.userId, buildingId)
  if (side !== 'owner' && side !== 'surveyor') return fail(state, ERRORS.role)
  const r = normaliseStructure(input.elements)
  if (r.error) return fail(state, r.error)
  const notes = clean(input.notes, 200)
  if (notes === b.structureType && JSON.stringify(r.elements) === JSON.stringify(b.structure)) return ok(state)
  const w = structuredClone(state.world)
  w.buildings[buildingId].structure = r.elements
  w.buildings[buildingId].structureType = notes
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: 'updated the structure', href: `/app/buildings/${buildingId}` })
  return ok(s)
}

/** The owner appoints a surveying firm to a building, or removes the appointment. */
export function appointSurveyor(state: AppData, actor: Actor, buildingId: string, surveyorOrgId: string | null): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (!isBuildingOwner(state, actor.userId, buildingId)) return fail(state, ERRORS.role)
  if (surveyorOrgId && roleOfOrg(state, surveyorOrgId) !== 'surveyor') return fail(state, OWNER_ERRORS.surveyor)
  if ((b.surveyorOrgId ?? null) === surveyorOrgId) return ok(state)
  const w = structuredClone(state.world)
  w.buildings[buildingId].surveyorOrgId = surveyorOrgId
  let s = withWorld(state, w)
  const prev = s.surveys[buildingId]
  s = { ...s, surveys: { ...s.surveys, [buildingId]: { buildingId, status: prev?.status ?? 'not_started', appointedAt: surveyorOrgId ? a.now : null, submittedAt: prev?.submittedAt ?? null, submittedByUserId: prev?.submittedByUserId ?? null } } }
  const text = surveyorOrgId ? `appointed ${w.orgs[surveyorOrgId].name} to survey the building` : 'removed the surveyor appointment'
  s = log(s, { at: a.now, orgIds: [a.org.id, ...(surveyorOrgId ? [surveyorOrgId] : [])], buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text, href: `/app/buildings/${buildingId}` })
  if (surveyorOrgId) s = notify(s, { orgIds: [surveyorOrgId], kind: 'appointed', title: `${a.org.name} appointed you to survey ${b.name}`, body: `${b.name}, ${b.address}.`, href: `/app/buildings/${buildingId}/capture`, at: a.now, actorUserId: a.user.id })
  return ok(s)
}

// ---------- Visibility and availability ----------

export type PriceCheck = { ask: number; reserve: number; valid: boolean; problem: string | null }

function onTick(x: number, tick: number): boolean {
  return Math.abs(x / tick - Math.round(x / tick)) < 1e-9
}

/** Ask and reserve per unit: both positive, in whole price steps, the reserve not above the ask. */
export function checkPrices(ask: number | null | undefined, reserve: number | null | undefined, family: keyof typeof FAMILIES): PriceCheck {
  const tick = FAMILIES[family].tick
  const x = ask ?? NaN
  const y = reserve ?? NaN
  const bad = (problem: string): PriceCheck => ({ ask: x, reserve: y, valid: false, problem })
  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) return bad(OWNER_ERRORS.prices)
  if (!onTick(x, tick) || !onTick(y, tick)) return bad(`Use whole steps of ${tick >= 1 ? `£${tick}` : `£${tick.toFixed(2)}`}.`)
  if (ticksOf(y, tick) > ticksOf(x, tick)) return bad(OWNER_ERRORS.reserveAboveAsk)
  return { ask: x, reserve: y, valid: true, problem: null }
}

/** The building's disclosure score as it would stand with one lot at a chosen visibility, and optional settings. */
export function disclosureWith(state: AppData, buildingId: string, pending: { lotId: string; visibility: 'private' | 'matched_only' | 'open' } | null, override?: { locationLevel?: LocationLevel; timingLevel?: TimingLevel }): Disclosure {
  const world = state.world
  const b = world.buildings[buildingId]
  const open = Object.values(world.lots).filter((l) => {
    const item = world.items[l.itemId]
    if (item.buildingId !== buildingId) return false
    if (pending && l.id === pending.lotId) return pending.visibility === 'open'
    return l.visibility === 'open'
  })
  return disclosureScore(
    {
      locationLevel: override?.locationLevel ?? b.locationLevel,
      timingLevel: override?.timingLevel ?? b.timingLevel,
      openLots: open.map((l) => {
        const item = world.items[l.itemId]
        const steel = item.spec.family === 'steel_section' ? item.spec : null
        return { isSteel: !!steel, sectionType: steel ? (steel.designation.startsWith('UC') ? 'UC' : 'UB') : null, designation: steel?.designation ?? null, lengthM: steel?.lengthM ?? null, hasPublicPhoto: item.photos.some((p) => p.isPublic) }
      }),
    },
    A,
  )
}

export type VisibilityInput = { visibility: LotVisibilityChoice; ask?: number | null; reserve?: number | null; availableFrom?: string | null }

/**
 * The owner sets a lot to private, shared with selected projects, or published. Sharing and publishing need an ask
 * and a reserve; publishing is refused when the disclosure score would be High. A date may be set in the same step
 * while the lot is still private.
 */
export function setLotVisibility(state: AppData, actor: Actor, lotId: string, input: VisibilityInput): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const lot = state.world.lots[lotId]
  const item = lot ? state.world.items[lot.itemId] : null
  if (!lot || !item) return fail(state, OWNER_ERRORS.noLot)
  if (!isBuildingOwner(state, actor.userId, item.buildingId)) return fail(state, ERRORS.role)
  if (acceptedReservation(state, lotId)) return fail(state, OWNER_ERRORS.reserved)
  const target = TO_VISIBILITY[input.visibility]
  const building = state.world.buildings[item.buildingId]
  let w = state.world
  if (input.availableFrom !== undefined && input.availableFrom !== null && input.availableFrom !== lot.availableFrom) {
    if (lot.visibility !== 'private') return fail(state, OWNER_ERRORS.notPrivate)
    if (!isIsoDate(input.availableFrom)) return fail(state, OWNER_ERRORS.badDate)
    w = structuredClone(w)
    w.lots[lotId].availableFrom = input.availableFrom
  }
  if (target === 'private') {
    if (lot.visibility === 'private' && w === state.world) return ok(state)
    let s = withWorld(state, ops.makePrivate(w, lotId))
    s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: item.buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `made ${item.tag} private`, href: `/app/buildings/${item.buildingId}/listings` })
    return ok(s)
  }
  const prices = checkPrices(input.ask ?? lot.askPerUnit, input.reserve ?? lot.reservePerUnit, item.family)
  if (!prices.valid) return fail(state, prices.problem!)
  if (target === 'open' && lot.visibility !== 'open' && disclosureWith({ ...state, world: w }, item.buildingId, { lotId, visibility: 'open' }).blocksPublishing) return fail(state, OWNER_ERRORS.blocked)
  const wasVisibility = lot.visibility
  w = ops.publishLot(w, lotId, { visibility: target, ask: prices.ask, reserve: prices.reserve }, a.today.slice(0, 7))
  let s = withWorld(state, w)
  const verb = target === 'open' ? 'published' : 'shared'
  const where = target === 'open' ? 'to the marketplace' : 'with selected projects'
  if (wasVisibility !== target) s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: item.buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `${verb} ${item.tag} ${where}`, href: `/app/buildings/${item.buildingId}/listings` })
  else s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: item.buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `updated the ask and reserve for ${item.tag}`, href: `/app/buildings/${item.buildingId}/listings` })
  if (wasVisibility === target) return ok(s)
  const listing = listingOf(s.world, s.world.lots[lotId])
  if (target === 'open') {
    // Architects whose projects it fits hear of it. The owner and the building are never named.
    const fits = new Map<string, string[]>()
    for (const p of Object.values(s.world.projects)) {
      if (!p.architectOrgId || p.architectOrgId === building.ownerOrgId) continue
      if (timelineFit(listing.availability, p.startDate, a.today).fit === 'late') continue
      fits.set(p.architectOrgId, [...(fits.get(p.architectOrgId) ?? []), p.name])
    }
    for (const [orgId, names] of fits) {
      s = notify(s, { orgIds: [orgId], kind: 'new_fit', title: `New material for ${names.length === 1 ? names[0] : `${names.length} of your projects`}`, body: `${listing.title} is available in time for ${listJoin(names)}.`, href: materialHref(listing.publicId), at: a.now, actorUserId: null })
    }
  } else {
    for (const p of Object.values(s.world.projects)) {
      if (!p.approvedByOwnerOrgIds.includes(a.org.id)) continue
      s = notify(s, {
        orgIds: buyerSideOrgIds(p),
        kind: 'lots_shared',
        title: `New lot shared with ${p.name}`,
        body: p.termsAccepted ? `${listing.title}, shared in confidence by a donor building owner.` : 'A donor building owner shared a lot in confidence. Accept the confidentiality terms to see it.',
        href: sharedWithProjectHref(p.id),
        at: a.now,
        actorUserId: null,
      })
    }
  }
  return ok(s)
}

/** The owner sets a private lot's availability date. */
export function setLotAvailability(state: AppData, actor: Actor, lotId: string, isoDate: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const lot = state.world.lots[lotId]
  const item = lot ? state.world.items[lot.itemId] : null
  if (!lot || !item) return fail(state, OWNER_ERRORS.noLot)
  if (!isBuildingOwner(state, actor.userId, item.buildingId)) return fail(state, ERRORS.role)
  if (lot.visibility !== 'private') return fail(state, OWNER_ERRORS.notPrivate)
  if (!isIsoDate(isoDate)) return fail(state, OWNER_ERRORS.badDate)
  if (lot.availableFrom === isoDate) return ok(state)
  const w = structuredClone(state.world)
  w.lots[lotId].availableFrom = isoDate
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: item.buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `set the availability of ${item.tag}`, href: `/app/buildings/${item.buildingId}/inventory/${item.id}` })
  return ok(s)
}

/** The owner's disclosure settings for a building: location as region or local authority, timing as quarter or month. */
export function setDisclosure(state: AppData, actor: Actor, buildingId: string, patch: { locationLevel?: LocationLevel; timingLevel?: TimingLevel }): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (!isBuildingOwner(state, actor.userId, buildingId)) return fail(state, ERRORS.role)
  if ((patch.locationLevel === undefined || patch.locationLevel === b.locationLevel) && (patch.timingLevel === undefined || patch.timingLevel === b.timingLevel)) return ok(state)
  return ok(withWorld(state, ops.setDisclosure(state.world, buildingId, patch)))
}

/** Back to region, quarter and every photo private. */
export function resetDisclosure(state: AppData, actor: Actor, buildingId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (!state.world.buildings[buildingId]) return fail(state, ERRORS.noBuilding)
  if (!isBuildingOwner(state, actor.userId, buildingId)) return fail(state, ERRORS.role)
  return ok(withWorld(state, ops.resetDisclosureDefaults(state.world, buildingId)))
}

/** The owner shows or hides a photo on the public listing. */
export function setPhotoPublic(state: AppData, actor: Actor, itemId: string, photoId: string, isPublic: boolean): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const item = state.world.items[itemId]
  if (!item) return fail(state, ERRORS.noItem)
  if (!isBuildingOwner(state, actor.userId, item.buildingId)) return fail(state, ERRORS.role)
  const photo = item.photos.find((p) => p.id === photoId)
  if (!photo) return fail(state, OWNER_ERRORS.noPhoto)
  if (photo.isPublic === isPublic) return ok(state)
  return ok(withWorld(state, ops.setPhotoPublic(state.world, itemId, photoId, isPublic)))
}

/** The owner lets a project see the lots they share, or revokes. The project stays a blind line to the owner. */
export function setProjectAccess(state: AppData, actor: Actor, projectId: string, granted: boolean): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'owner') return fail(state, ERRORS.role)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (p.clientOrgId === a.org.id || p.architectOrgId === a.org.id) return fail(state, ERRORS.role)
  if (p.approvedByOwnerOrgIds.includes(a.org.id) === granted) return ok(state)
  let s = withWorld(state, ops.setOwnerProjectApproval(state.world, a.org.id, projectId, granted))
  const blind = blindBuyerText(toBlindBuyer(p))
  const shared = Object.values(s.world.lots).filter((l) => l.visibility === 'matched_only' && s.world.buildings[s.world.items[l.itemId].buildingId].ownerOrgId === a.org.id).length
  const firstBuilding = Object.values(s.world.buildings).find((b) => b.ownerOrgId === a.org.id)
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: null, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: granted ? `shared lots with ${blind}` : `stopped sharing lots with ${blind}`, href: firstBuilding ? `/app/buildings/${firstBuilding.id}/sharing` : null })
  if (granted && shared > 0) {
    s = notify(s, {
      orgIds: buyerSideOrgIds(p),
      kind: 'lots_shared',
      title: `${plural(shared, 'lot')} shared with ${p.name}`,
      body: p.termsAccepted ? 'Shared in confidence by a donor building owner. They are in the Marketplace, under Shared with you.' : 'Shared in confidence by a donor building owner. Accept the confidentiality terms to see them.',
      href: sharedWithProjectHref(p.id),
      at: a.now,
      actorUserId: null,
    })
  }
  return ok(s)
}

// ---------- New projects (the owner as client) ----------

/** A New project: a Project on which the owner organisation is the client and developer, with an optional architect. */
export type OwnerProjectInput = Omit<NewProjectInput, 'client' | 'consultantOrgId' | 'clientMessage'> & { architectOrgId: string | null }

/** The architect hears they are appointed; their shortlist for the project is ready. */
function welcomeArchitect(state: AppData, a: Acting, projectId: string, projectName: string, architectOrgId: string): AppData {
  let s = state
  const listId = listIdFor(architectOrgId, projectId)
  if (!s.world.wishlists[listId]) {
    const w = structuredClone(s.world)
    w.wishlists[listId] = { id: listId, orgId: architectOrgId, projectId, items: [] }
    s = withWorld(s, w)
  }
  return notify(s, {
    orgIds: [architectOrgId],
    kind: 'team',
    title: `${a.org.name} added you as architect on ${projectName}`,
    body: `${projectName} is now in your projects. Your client is ${a.org.name}.`,
    href: `/app/projects/${projectId}`,
    at: a.now,
    actorUserId: a.user.id,
  })
}

/** The owner adds a New project, as its client and developer, and may appoint an architecture practice at once. */
export function createOwnerProject(state: AppData, actor: Actor, input: OwnerProjectInput): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'owner') return fail(state, ERRORS.role)
  const invalid = validateNewProject({ ...input, client: { orgId: a.org.id } }, a.today)
  if (invalid.length > 0) return fail(state, invalid[0][1])
  const name = clean(input.name, 120)
  const taken = Object.values(state.world.projects).some((p) => p.clientOrgId === a.org.id && p.name.trim().toLowerCase() === name.toLowerCase())
  if (taken) return fail(state, PROJECT_ERRORS.duplicateName)
  const architectOrgId = input.architectOrgId ?? ''
  if (architectOrgId && roleOfOrg(state, architectOrgId) !== 'architect') return fail(state, OWNER_ERRORS.architect)
  const dates = newProgrammeDates({ ...input, client: { orgId: a.org.id } }, a.today)
  if (!dates) return fail(state, PROGRAMME_ERRORS.tooSoon)
  const pm = mint(state, 'prj', (id) => !!state.world.projects[id] || (!!architectOrgId && !!state.world.wishlists[listIdFor(architectOrgId, id)]))
  let s = pm.state
  const id = pm.id
  const project = projectRecord({
    id,
    name,
    clientOrgId: a.org.id,
    architectOrgId,
    createdByPersonaId: a.persona.id,
    consultantOrgId: '',
    projectType: input.projectType!,
    projectTypeOther: input.projectTypeOther ?? '',
    region: input.region,
    localAuthority: input.localAuthority,
    ribaStage: input.ribaStage,
    startDate: input.startDate,
    programme: { ...dates, source: 'suggested' },
    // The owner is its own client: the link is accepted when the project is made.
    clientLink: { ...pendingClientLink(a.today, a.persona.id, ''), status: 'accepted', decidedOn: a.today, decidedByPersonaId: a.persona.id },
    requirementIds: input.requirementIds ?? [],
    description: input.description ?? '',
  })
  project.teamOrgIds = [a.org.id, ...(architectOrgId ? [architectOrgId] : [])]
  const w = structuredClone(s.world)
  w.projects[id] = project
  s = withWorld(s, w)
  if (architectOrgId) s = welcomeArchitect(s, a, id, project.name, architectOrgId)
  s = log(s, { at: a.now, orgIds: projectOrgIds(project), projectId: id, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'created the project', href: `/app/projects/${id}` })
  return ok(s, id)
}

/** The owner appoints an architecture practice to a New project that has none yet. */
export function appointProjectArchitect(state: AppData, actor: Actor, projectId: string, architectOrgId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (a.role !== 'owner' || !isProjectClient(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  if (p.architectOrgId !== '') return fail(state, OWNER_ERRORS.hasArchitect)
  if (!architectOrgId || roleOfOrg(state, architectOrgId) !== 'architect') return fail(state, OWNER_ERRORS.architect)
  const w = structuredClone(state.world)
  const next = w.projects[projectId]
  next.architectOrgId = architectOrgId
  next.teamOrgIds = [...next.teamOrgIds.filter((x) => x !== architectOrgId), architectOrgId]
  let s = withWorld(state, w)
  s = welcomeArchitect(s, a, projectId, p.name, architectOrgId)
  s = log(s, { at: a.now, orgIds: projectOrgIds(next), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `appointed ${w.orgs[architectOrgId].name} as architect`, href: `/app/projects/${projectId}` })
  return ok(s)
}
