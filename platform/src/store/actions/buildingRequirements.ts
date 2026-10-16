// Requirement tracking on a donor building (review of 16 October 2026): the owner and the surveyor set the status of
// each requirement that applies before demolition and keep evidence for it. A deconstruction contractor alone dates
// availability only. Nothing here reaches a buyer.
import type { SourceBuilding } from '../../domain/types'
import type { TrackStatus } from '../../domain/sustainabilityTypes'
import { TRACK_STATUSES } from '../../domain/sustainabilityTypes'
import { TRACK_STATUS_LABELS } from '../../domain/reference/sustainabilityCopy'
import type { PlanningRequirement } from '../../domain/reference/requirements'
import type { ActionResult, Actor, AppData } from '../types'
import { buildingOrgIds, buildingSide, ERRORS } from '../access'
import { log, notify } from '../notifications'
import { mint } from '../ids'
import { buildingRequirements, buildingTrackOf, withBuildingTrack } from '../buildingTracks'
import { SUSTAINABILITY_ERRORS } from './sustainability'
import { acting, clean, fail, ok, type Acting } from './common'

export const BUILDING_REQUIREMENT_ERRORS = {
  noBuilding: 'That building could not be found.',
  noRequirement: 'That requirement does not apply to this building.',
} as const

type OnBuilding = { a: Acting; b: SourceBuilding; side: 'owner' | 'surveyor'; req: PlanningRequirement }

/** The acting owner or surveyor of the building, and the requirement; otherwise the error. */
function onBuilding(state: AppData, actor: Actor, buildingId: string, requirementId: string): OnBuilding | string {
  const a = acting(state, actor)
  if (typeof a === 'string') return a
  const b = state.world.buildings[buildingId]
  if (!b) return BUILDING_REQUIREMENT_ERRORS.noBuilding
  const side = buildingSide(state, actor.userId, buildingId)
  if (side !== 'owner' && side !== 'surveyor') return ERRORS.role
  const req = buildingRequirements(b).find((r) => r.id === requirementId)
  if (!req) return BUILDING_REQUIREMENT_ERRORS.noRequirement
  return { a, b, side, req }
}

function href(b: SourceBuilding): string {
  return `/app/buildings/${b.id}/requirements`
}

function record(s: AppData, o: OnBuilding, text: string): AppData {
  return log(s, { at: o.a.now, orgIds: buildingOrgIds(o.b), projectId: null, buildingId: o.b.id, actorUserId: o.a.user.id, actor: o.a.user.name, text, href: href(o.b) })
}

/** The owner or the surveyor sets a requirement's status. The owner hears when the surveyor marks one at risk or evidence ready. */
export function setBuildingRequirementStatus(state: AppData, actor: Actor, buildingId: string, requirementId: string, status: TrackStatus): ActionResult {
  const o = onBuilding(state, actor, buildingId, requirementId)
  if (typeof o === 'string') return fail(state, o)
  if (!TRACK_STATUSES.includes(status)) return fail(state, SUSTAINABILITY_ERRORS.badStatus)
  const t = buildingTrackOf(state, buildingId, requirementId)
  if (t.status === status) return ok(state)
  let s = withBuildingTrack(state, buildingId, { ...t, status, updatedAt: o.a.now, updatedByUserId: o.a.user.id })
  const word = TRACK_STATUS_LABELS[status].toLowerCase()
  s = record(s, o, `marked ${o.req.title} as ${word} on ${o.b.name}`)
  if (o.side === 'surveyor' && o.b.ownerOrgId && (status === 'at_risk' || status === 'evidence_ready')) {
    s = notify(s, { orgIds: [o.b.ownerOrgId], kind: 'sustainability', title: `${o.req.title} is ${word} on ${o.b.name}`, body: `Marked by ${o.a.user.name}, ${o.a.org.name}.`, href: href(o.b), at: o.a.now, actorUserId: o.a.user.id })
  }
  return ok(s)
}

/** Adds a note of evidence. The first evidence starts the requirement. */
export function addBuildingRequirementEvidence(state: AppData, actor: Actor, buildingId: string, requirementId: string, text: string): ActionResult<string> {
  const o = onBuilding(state, actor, buildingId, requirementId)
  if (typeof o === 'string') return fail(state, o)
  const note = clean(text ?? '', 1000)
  if (!note) return fail(state, SUSTAINABILITY_ERRORS.emptyEvidence)
  const taken = new Set([
    ...Object.values(state.sustainability ?? {}).flatMap((r) => Object.values(r.requirements ?? {}).flatMap((t) => t.evidence.map((e) => e.id))),
    ...Object.values(state.buildingTracks ?? {}).flatMap((r) => Object.values(r).flatMap((t) => t.evidence.map((e) => e.id))),
  ])
  const m = mint(state, 'evd', (id) => taken.has(id))
  const t = buildingTrackOf(m.state, buildingId, requirementId)
  const evidence = [...t.evidence, { id: m.id, text: note, output: null, addedByUserId: o.a.user.id, addedBy: o.a.user.name, addedAt: o.a.now }]
  let s = withBuildingTrack(m.state, buildingId, { ...t, evidence, status: t.status === 'not_started' ? 'in_progress' : t.status, updatedAt: o.a.now, updatedByUserId: o.a.user.id })
  s = record(s, o, `added evidence to ${o.req.title} on ${o.b.name}`)
  return ok(s, m.id)
}

/** Removes evidence; only the person who added it may. */
export function removeBuildingRequirementEvidence(state: AppData, actor: Actor, buildingId: string, requirementId: string, evidenceId: string): ActionResult {
  const o = onBuilding(state, actor, buildingId, requirementId)
  if (typeof o === 'string') return fail(state, o)
  const t = buildingTrackOf(state, buildingId, requirementId)
  const e = t.evidence.find((x) => x.id === evidenceId)
  if (!e) return fail(state, SUSTAINABILITY_ERRORS.noEvidence)
  if (e.addedByUserId !== o.a.user.id) return fail(state, SUSTAINABILITY_ERRORS.notAuthor)
  return ok(withBuildingTrack(state, buildingId, { ...t, evidence: t.evidence.filter((x) => x.id !== evidenceId) }))
}
