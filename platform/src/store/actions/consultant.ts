// The consultant's waste engagements (load a demolition bill, review its rows) and the consultancy's answer to being
// added to a project.
import type { ClientLink, Destination, Project } from '../../domain/types'
import { parseBillCells, editRow, type Cell } from '../../domain/engines/billImport'
import { clientLinked } from '../../domain/access'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, canOpenEngagement, projectOrgIds } from '../access'
import { log, notify } from '../notifications'
import { acting, clean, fail, ok, withWorld } from './common'

export const WASTE_ERRORS = {
  noEngagement: 'That engagement could not be found.',
  unreadable: 'That file has no recognisable header row. Use the sample bill or a bill with the same columns.',
  noBill: 'Load a bill first.',
  noRow: 'That row could not be found.',
} as const

/** Reads the rows of a demolition bill (cells from the spreadsheet) into the engagement. */
export function loadWasteBill(state: AppData, actor: Actor, engagementId: string, cells: Cell[][]): ActionResult<number> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const e = state.world.engagements[engagementId]
  if (!e) return fail(state, WASTE_ERRORS.noEngagement)
  if (!canOpenEngagement(state, actor.userId, engagementId)) return fail(state, ERRORS.noAccess)
  let bill
  try {
    bill = parseBillCells(cells)
  } catch {
    return fail(state, WASTE_ERRORS.unreadable)
  }
  if (bill.rows.length === 0) return fail(state, WASTE_ERRORS.unreadable)
  const w = structuredClone(state.world)
  w.engagements[engagementId].bill = bill
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: [e.consultantOrgId], projectId: null, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `loaded the demolition bill for ${e.name}: ${bill.rows.length} rows`, href: `/app/engagements/${engagementId}/waste` })
  return ok(s, bill.rows.length)
}

/** The consultant corrects a row's stream or destination. */
export function editWasteRow(state: AppData, actor: Actor, engagementId: string, row: number, patch: { stream?: string | null; destination?: Destination | null }): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const e = state.world.engagements[engagementId]
  if (!e) return fail(state, WASTE_ERRORS.noEngagement)
  if (!canOpenEngagement(state, actor.userId, engagementId)) return fail(state, ERRORS.noAccess)
  if (!e.bill) return fail(state, WASTE_ERRORS.noBill)
  if (!e.bill.rows.some((r) => r.row === row)) return fail(state, WASTE_ERRORS.noRow)
  const w = structuredClone(state.world)
  const bill = w.engagements[engagementId].bill!
  bill.rows = bill.rows.map((r) => (r.row === row ? editRow(r, patch) : r))
  return ok(withWorld(state, w))
}

export function clearWasteBill(state: AppData, actor: Actor, engagementId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const e = state.world.engagements[engagementId]
  if (!e) return fail(state, WASTE_ERRORS.noEngagement)
  if (!canOpenEngagement(state, actor.userId, engagementId)) return fail(state, ERRORS.noAccess)
  if (!e.bill) return ok(state)
  const w = structuredClone(state.world)
  w.engagements[engagementId].bill = null
  return ok(withWorld(state, w))
}

// ---------- The consultancy's consent to a project (round 2 follow-up, 16 October 2026) ----------
// An architect who names a sustainability consultancy asks it to join, as it asks the client. The consultancy is asked
// only once the client has accepted the project, so no third party learns of a project before its client agrees,
// and it reaches the project only once it has accepted too. Its answer goes back to the architect.

export const CONSULTANT_LINK_ERRORS = {
  notPending: 'This request has already been answered.',
  noClient: 'The client has not accepted this project yet.',
} as const

/** A request to the consultancy, waiting for its answer. */
export function pendingConsultantLink(today: string, requestedByPersonaId: string | null): ClientLink {
  return { status: 'pending', requestedOn: today, requestedByPersonaId, message: '', decidedOn: null, decidedByPersonaId: null, decisionNote: '' }
}

/**
 * The consultancy's side of the request: a line in its activity and a notification, both leading to Project requests.
 * Sent only once the client has accepted; before that it does nothing.
 */
export function askConsultant(state: AppData, project: Project, at: string): AppData {
  if (!project.consultantOrgId || project.consultantLink?.status !== 'pending' || !clientLinked(project)) return state
  const architect = state.world.orgs[project.architectOrgId]?.name ?? 'The architect'
  const client = state.world.orgs[project.clientOrgId]?.name ?? 'the client'
  let s = log(state, { at, orgIds: [project.consultantOrgId], projectId: null, buildingId: null, actorUserId: null, actor: architect, text: `asked to add you as sustainability consultant on ${project.name}`, href: '/app/projects/requests' })
  s = notify(s, {
    orgIds: [project.consultantOrgId],
    kind: 'team',
    title: `${architect} asked to add you as sustainability consultant on ${project.name}`,
    body: `${client} has accepted the project. Accept to see it and set its targets.`,
    href: '/app/projects/requests',
    at,
    actorUserId: null,
  })
  return s
}

/** The consultancy accepts or declines being the sustainability consultant on a project, once its client has accepted. */
export function decideConsultantLink(state: AppData, actor: Actor, projectId: string, decision: 'accepted' | 'declined', note: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (a.role !== 'consultant' || p.consultantOrgId !== a.org.id) return fail(state, ERRORS.role)
  if (p.consultantLink?.status !== 'pending') return fail(state, CONSULTANT_LINK_ERRORS.notPending)
  if (!clientLinked(p)) return fail(state, CONSULTANT_LINK_ERRORS.noClient)
  const href = `/app/projects/${projectId}`
  const w = structuredClone(state.world)
  const next = w.projects[projectId]
  let s: AppData
  if (decision === 'accepted') {
    next.consultantLink = { ...p.consultantLink, status: 'accepted', decidedOn: a.today, decidedByPersonaId: a.persona.id, decisionNote: '' }
    s = withWorld(state, w)
    s = log(s, { at: a.now, orgIds: projectOrgIds(next), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'accepted the project as sustainability consultant', href })
    s = notify(s, { orgIds: [p.architectOrgId, p.clientOrgId], kind: 'team', title: `${a.org.name} joined ${p.name} as sustainability consultant`, body: 'They can now set targets and follow carbon and compliance on the project.', href: `${href}/team`, at: a.now, actorUserId: a.user.id })
    return ok(s)
  }
  const text = clean(note, 1000)
  next.consultantLink = { ...p.consultantLink, status: 'declined', decidedOn: a.today, decidedByPersonaId: a.persona.id, decisionNote: text }
  s = withWorld(state, w)
  // A decline reaches the architect under the consultancy's name, never a person's.
  s = log(s, { at: a.now, orgIds: [p.architectOrgId], projectId, buildingId: null, actorUserId: null, actor: a.org.name, text: 'declined to join as sustainability consultant', href: `${href}/team` })
  s = notify(s, { orgIds: [p.architectOrgId], kind: 'team', title: `${a.org.name} declined ${p.name}`, body: text ? `Their note: ${text}` : 'Ask again or choose another consultancy on the Team tab.', href: `${href}/team`, at: a.now, actorUserId: null })
  return ok(s)
}
