// The asset owner's decisions: buildings, surveyor appointments, what is visible to whom and from when,
// disclosure settings, and which projects may see shared lots.
import type { LocationLevel, SourceBuilding, TimingLevel, EraBand } from '../../domain/types'
import { DEFAULT_ASSUMPTIONS as A, REGIONS } from '../../domain/reference/assumptions'
import { FAMILIES } from '../../domain/reference/families'
import { V1_ASSUMPTIONS } from '../../domain/reference/v1assumptions'
import { ticksOf } from '../../domain/money'
import { disclosureScore, type Disclosure } from '../../domain/engines/disclosure'
import { timelineFit } from '../../domain/engines/timeline'
import { blindBuyerText, toBlindBuyer } from '../../domain/privacy/blindBuyer'
import type { ActionResult, Actor, AppData, SurveyRecord } from '../types'
import { ERRORS, buildingOrgIds, isBuildingOwner, roleOfOrg, roleOfUser } from '../access'
import { mint } from '../ids'
import { acceptedReservation, listingOf } from '../lots'
import { listJoin, log, notify, plural } from '../notifications'
import * as ops from '../worldOps'
import { acting, clean, fail, isIsoDate, ok, withWorld } from './common'

export const OWNER_ERRORS = {
  name: 'Enter the building name.',
  address: 'Enter the address.',
  region: 'Choose a region.',
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
} as const

export type LotVisibilityChoice = 'private' | 'shared' | 'published'

const TO_VISIBILITY = { private: 'private', shared: 'matched_only', published: 'open' } as const

export function ownerOrgIdOf(state: AppData, userId: string): string | null {
  return roleOfUser(state, userId) === 'owner' ? (state.users[userId]?.orgId ?? null) : null
}

// ---------- Buildings ----------

export type NewBuildingInput = {
  name: string
  address: string
  postcodeDistrict: string
  localAuthority: string
  region: string
  yearBuilt: number | null
  storeys: number | null
  giaM2: number | null
  structureType: string
  stripOutStart: string | null
  dismantlingStart: string | null
  clearBy: string | null
  surveyorOrgId: string | null
}

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

/** The owner adds a building. Its records are private; nothing is listed until the owner decides. */
export function createBuilding(state: AppData, actor: Actor, input: NewBuildingInput): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'owner') return fail(state, ERRORS.role)
  const name = clean(input.name, 120)
  if (!name) return fail(state, OWNER_ERRORS.name)
  if (!clean(input.address, 200)) return fail(state, OWNER_ERRORS.address)
  if (!(REGIONS as readonly string[]).includes(input.region)) return fail(state, OWNER_ERRORS.region)
  const thisYear = Number(a.today.slice(0, 4))
  if (input.yearBuilt !== null && (!Number.isInteger(input.yearBuilt) || input.yearBuilt < 1800 || input.yearBuilt > thisYear)) return fail(state, OWNER_ERRORS.year)
  const bad = checkProgramme(input)
  if (bad) return fail(state, bad)
  if (input.surveyorOrgId && roleOfOrg(state, input.surveyorOrgId) !== 'surveyor') return fail(state, OWNER_ERRORS.surveyor)
  const m = mint(state, 'bld', (id) => !!state.world.buildings[id])
  let s = m.state
  const hubKm = V1_ASSUMPTIONS.regionHubKm[input.region]
  const building: SourceBuilding = {
    id: m.id,
    ownerOrgId: a.org.id,
    sellerType: 'Asset owner',
    sourceType: 'deconstruction',
    name,
    address: clean(input.address, 200),
    postcodeDistrict: clean(input.postcodeDistrict, 8).toUpperCase(),
    localAuthority: clean(input.localAuthority, 80),
    region: input.region,
    yearBuilt: input.yearBuilt,
    eraBand: eraFor(input.yearBuilt),
    storeys: input.storeys,
    giaM2: input.giaM2,
    structureType: clean(input.structureType, 200),
    tenants: [],
    programme: { stripOutStart: input.stripOutStart, dismantlingStart: input.dismantlingStart, clearBy: input.clearBy },
    defaultHubId: Object.entries(hubKm).sort((x, y) => x[1] - y[1])[0][0],
    surveyorOrgId: input.surveyorOrgId,
    locationLevel: 'region',
    timingLevel: 'quarter',
    arisingsTitle: 'owner',
    distancesKm: { ...hubKm },
    surveyedBy: null,
  }
  const w = structuredClone(s.world)
  w.buildings[m.id] = building
  s = withWorld(s, w)
  const survey: SurveyRecord = { buildingId: m.id, status: 'not_started', appointedAt: input.surveyorOrgId ? a.now : null, submittedAt: null, submittedByUserId: null }
  s = { ...s, surveys: { ...s.surveys, [m.id]: survey } }
  s = log(s, { at: a.now, orgIds: buildingOrgIds(building), buildingId: m.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `added ${name}`, href: `/app/buildings/${m.id}` })
  if (input.surveyorOrgId) s = notify(s, { orgIds: [input.surveyorOrgId], kind: 'appointed', title: `${a.org.name} appointed you to survey ${name}`, body: `${name}, ${building.address}.`, href: `/app/buildings/${m.id}/capture`, at: a.now, actorUserId: a.user.id })
  return ok(s, m.id)
}

export type BuildingPatch = Partial<Pick<NewBuildingInput, 'name' | 'address' | 'stripOutStart' | 'dismantlingStart' | 'clearBy'>>

/** The owner edits a building's name, address or programme. */
export function updateBuilding(state: AppData, actor: Actor, buildingId: string, patch: BuildingPatch): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (!isBuildingOwner(state, actor.userId, buildingId)) return fail(state, ERRORS.role)
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
  const w = structuredClone(state.world)
  w.buildings[buildingId] = { ...w.buildings[buildingId], name, address, programme }
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: buildingOrgIds(w.buildings[buildingId]), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: 'updated the building details', href: `/app/buildings/${buildingId}` })
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
      s = notify(s, { orgIds: [orgId], kind: 'new_fit', title: `New material for ${names.length === 1 ? names[0] : `${names.length} of your projects`}`, body: `${listing.title} is available in time for ${listJoin(names)}.`, href: `/app/discover/${listing.publicId}`, at: a.now, actorUserId: null })
    }
  } else {
    for (const p of Object.values(s.world.projects)) {
      if (!p.approvedByOwnerOrgIds.includes(a.org.id)) continue
      s = notify(s, {
        orgIds: [p.architectOrgId, p.clientOrgId],
        kind: 'lots_shared',
        title: `New lot shared with ${p.name}`,
        body: p.termsAccepted ? `${listing.title}, shared in confidence by an asset owner.` : 'An asset owner shared a lot in confidence. Accept the confidentiality terms to see it.',
        href: `/app/discover?tab=shared&project=${p.id}`,
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
      orgIds: [p.architectOrgId, p.clientOrgId],
      kind: 'lots_shared',
      title: `${plural(shared, 'lot')} shared with ${p.name}`,
      body: p.termsAccepted ? 'Shared in confidence by an asset owner. They are in Discover, under Shared with you.' : 'Shared in confidence by an asset owner. Accept the confidentiality terms to see them.',
      href: `/app/discover?tab=shared&project=${p.id}`,
      at: a.now,
      actorUserId: null,
    })
  }
  return ok(s)
}
