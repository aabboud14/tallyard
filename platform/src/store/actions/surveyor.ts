// Capture and survey: the surveyor (or the owner) records what a building holds; submitting tells the owner.
import type { Condition, Photo, Quantity, Recoverability, Spec } from '../../domain/types'
import { findSection } from '../../domain/reference/sections'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, buildingOrgIds, buildingSide } from '../access'
import { mint, mintPublicId } from '../ids'
import { lotOfItem } from '../lots'
import { log, notify, plural } from '../notifications'
import { addCapturedItem } from '../worldOps'
import { validQuantity } from '../capture'
import { acting, clean, fail, isIsoDate, ok, withWorld } from './common'

export const SURVEY_ERRORS = {
  spec: 'Describe the material: the family and its size.',
  section: 'That steel section is not in the section table.',
  quantity: 'Enter the quantity.',
  badDate: 'Enter a valid month for the expected availability.',
  photo: 'That photo reference is not valid.',
  noPhoto: 'That photo could not be found.',
  locked: 'This item is shared or published. Its material, size and quantity cannot change.',
  nothingCaptured: 'Capture at least one item before submitting the survey.',
  submitted: 'This survey has already been submitted.',
} as const

export type CaptureInput = {
  buildingId: string
  spec: Spec
  quantity: Quantity
  condition: Condition
  recoverability: Recoverability
  location: string
  notes: string
  /** Photo references already stored in the photo store. */
  photoIds: string[]
  /** ISO date; null uses the building's dismantling start. */
  expectedAvailableFrom: string | null
}

const PHOTO_ID = /^pho_[A-Za-z0-9-]{4,64}$/

function checkSpec(spec: Spec, quantity: Quantity): string | null {
  if (spec.family === 'steel_section' && !findSection(spec.designation)) return SURVEY_ERRORS.section
  if (spec.family === 'steel_section' && !(spec.lengthM > 0)) return SURVEY_ERRORS.spec
  if (spec.family === 'curtain_wall' && !(spec.panelWidthM > 0 && spec.panelHeightM > 0)) return SURVEY_ERRORS.spec
  if (!validQuantity(spec.family, quantity)) return SURVEY_ERRORS.quantity
  return null
}

/** A new item and its private lot. Returns the item ID and its tag. */
export function captureItem(state: AppData, actor: Actor, input: CaptureInput): ActionResult<{ itemId: string; tag: string }> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[input.buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  const side = buildingSide(state, actor.userId, input.buildingId)
  if (!side) return fail(state, ERRORS.noAccess)
  const bad = checkSpec(input.spec, input.quantity)
  if (bad) return fail(state, bad)
  if (input.expectedAvailableFrom !== null && !isIsoDate(input.expectedAvailableFrom)) return fail(state, SURVEY_ERRORS.badDate)
  if (input.photoIds.some((id) => !PHOTO_ID.test(id))) return fail(state, SURVEY_ERRORS.photo)
  const im = mint(state, 'itm', (id) => !!state.world.items[id] || !!state.world.lots['lot_' + id.slice(4)])
  const pm = mintPublicId(im.state)
  let s = pm.state
  const photos: Photo[] = input.photoIds.map((id) => ({ id, kind: 'blob', src: null, isPublic: false }))
  const r = addCapturedItem(
    s.world,
    { buildingId: input.buildingId, spec: input.spec, quantity: input.quantity, condition: input.condition, recoverability: input.recoverability, location: clean(input.location, 200), notes: clean(input.notes, 2000), photos, expectedAvailableFrom: input.expectedAvailableFrom },
    { itemId: im.id, lotId: 'lot_' + im.id.slice(4), publicId: pm.id },
    { name: a.user.name, today: a.today },
  )
  s = withWorld(s, r.world)
  const survey = s.surveys[input.buildingId]
  if (!survey || survey.status === 'not_started') s = { ...s, surveys: { ...s.surveys, [input.buildingId]: { buildingId: input.buildingId, status: 'in_progress', appointedAt: survey?.appointedAt ?? null, submittedAt: null, submittedByUserId: null } } }
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId: b.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `captured ${r.tag}`, href: `/app/buildings/${b.id}/inventory/${im.id}` })
  if (side === 'surveyor' && b.ownerOrgId) {
    const name = a.user.name
    s = notify(s, {
      orgIds: [b.ownerOrgId],
      kind: 'item_captured',
      title: `${name} captured ${r.tag} at ${b.name}`,
      body: 'New in the inventory. It stays private until you decide.',
      href: `/app/buildings/${b.id}/inventory`,
      at: a.now,
      actorUserId: a.user.id,
      key: `capture:${b.id}:${a.user.id}`,
      fold: (count) => ({ title: `${name} captured ${plural(count, 'item')} at ${b.name}`, body: `Latest: ${r.tag}. They stay private until you decide.` }),
    })
  }
  return ok(s, { itemId: im.id, tag: r.tag })
}

export type ItemPatch = { condition?: Condition; recoverability?: Recoverability; location?: string; notes?: string; expectedAvailableFrom?: string | null }

/** The surveyor or the owner corrects an item. Grades and the expected date change only while the lot is private. */
export function updateItem(state: AppData, actor: Actor, itemId: string, patch: ItemPatch): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const item = state.world.items[itemId]
  if (!item) return fail(state, ERRORS.noItem)
  if (!buildingSide(state, actor.userId, item.buildingId)) return fail(state, ERRORS.noAccess)
  const lot = lotOfItem(state.world, itemId)
  const locked = !!lot && lot.visibility !== 'private'
  const touchesListing = patch.condition !== undefined || patch.recoverability !== undefined || patch.expectedAvailableFrom !== undefined
  if (locked && touchesListing) return fail(state, SURVEY_ERRORS.locked)
  if (patch.expectedAvailableFrom != null && !isIsoDate(patch.expectedAvailableFrom)) return fail(state, SURVEY_ERRORS.badDate)
  const w = structuredClone(state.world)
  const it = w.items[itemId]
  if (patch.condition !== undefined) it.condition = patch.condition
  if (patch.recoverability !== undefined) it.recoverability = patch.recoverability
  if (patch.location !== undefined) it.location = clean(patch.location, 200)
  if (patch.notes !== undefined) it.notes = clean(patch.notes, 2000)
  if (patch.expectedAvailableFrom !== undefined) it.expectedAvailableFrom = patch.expectedAvailableFrom
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: buildingOrgIds(w.buildings[item.buildingId]), buildingId: item.buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `updated ${item.tag}`, href: `/app/buildings/${item.buildingId}/inventory/${itemId}` })
  return ok(s)
}

/** Adds a reference to a photo already in the photo store. Photos start private. */
export function addPhoto(state: AppData, actor: Actor, itemId: string, photoId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const item = state.world.items[itemId]
  if (!item) return fail(state, ERRORS.noItem)
  if (!buildingSide(state, actor.userId, item.buildingId)) return fail(state, ERRORS.noAccess)
  if (!PHOTO_ID.test(photoId)) return fail(state, SURVEY_ERRORS.photo)
  if (item.photos.some((p) => p.id === photoId)) return ok(state)
  const w = structuredClone(state.world)
  w.items[itemId].photos.push({ id: photoId, kind: 'blob', src: null, isPublic: false })
  return ok(withWorld(state, w))
}

export function removePhoto(state: AppData, actor: Actor, itemId: string, photoId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const item = state.world.items[itemId]
  if (!item) return fail(state, ERRORS.noItem)
  if (!buildingSide(state, actor.userId, item.buildingId)) return fail(state, ERRORS.noAccess)
  if (!item.photos.some((p) => p.id === photoId)) return fail(state, SURVEY_ERRORS.noPhoto)
  const w = structuredClone(state.world)
  w.items[itemId].photos = w.items[itemId].photos.filter((p) => p.id !== photoId)
  return ok(withWorld(state, w))
}

/** The surveyor submits the survey to the building's owner. */
export function submitSurvey(state: AppData, actor: Actor, buildingId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (buildingSide(state, actor.userId, buildingId) !== 'surveyor') return fail(state, ERRORS.role)
  const count = Object.values(state.world.items).filter((i) => i.buildingId === buildingId).length
  if (count === 0) return fail(state, SURVEY_ERRORS.nothingCaptured)
  const prev = state.surveys[buildingId]
  if (prev?.status === 'submitted') return fail(state, SURVEY_ERRORS.submitted)
  const w = structuredClone(state.world)
  w.buildings[buildingId].surveyedBy = { personaName: a.user.name, orgName: a.org.name, date: a.today }
  let s = withWorld(state, w)
  s = { ...s, surveys: { ...s.surveys, [buildingId]: { buildingId, status: 'submitted', appointedAt: prev?.appointedAt ?? null, submittedAt: a.now, submittedByUserId: a.user.id } } }
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `submitted the survey: ${plural(count, 'item')}`, href: `/app/buildings/${buildingId}/inventory` })
  if (b.ownerOrgId) s = notify(s, { orgIds: [b.ownerOrgId], kind: 'survey_submitted', title: `${a.org.name} submitted the survey of ${b.name}`, body: `${plural(count, 'item')} captured by ${a.user.name}. Review the inventory and decide what to recover.`, href: `/app/buildings/${buildingId}/priorities`, at: a.now, actorUserId: a.user.id })
  return ok(s)
}

/** The surveyor reopens a submitted survey to add more items. */
export function reopenSurvey(state: AppData, actor: Actor, buildingId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (buildingSide(state, actor.userId, buildingId) !== 'surveyor') return fail(state, ERRORS.role)
  const prev = state.surveys[buildingId]
  if (prev?.status !== 'submitted') return ok(state)
  let s: AppData = { ...state, surveys: { ...state.surveys, [buildingId]: { ...prev, status: 'in_progress' } } }
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: 'reopened the survey', href: `/app/buildings/${buildingId}/capture` })
  return ok(s)
}
