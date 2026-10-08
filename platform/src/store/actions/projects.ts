// Projects: create and edit, terms, consultant, and the architect's specification notes.
import type { Project } from '../../domain/types'
import type { ProjectType } from '../../domain/v1types'
import { REGIONS } from '../../domain/reference/assumptions'
import { V1_ASSUMPTIONS } from '../../domain/reference/v1assumptions'
import { isOnOrBefore } from '../../domain/dates'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, isProjectArchitect, isProjectClient, projectOrgIds, roleOfOrg } from '../access'
import { mint } from '../ids'
import { listIdFor } from '../lots'
import { log, notify } from '../notifications'
import { setTermsAccepted } from '../worldOps'
import { acting, clean, fail, isIsoDate, ok, withWorld } from './common'

export const PROJECT_ERRORS = {
  name: 'Enter a project name.',
  clientName: 'Enter the client.',
  clientNotBuyer: 'This organisation cannot be a client.',
  duplicateName: 'A project with this name already exists.',
  projectType: 'Choose a project type.',
  region: 'Choose a region.',
  stage: 'Choose a RIBA stage from 0 to 7.',
  badDate: 'Enter a valid date.',
  pastDate: 'The date must be today or later.',
  consultant: 'Choose a sustainability consultancy.',
} as const

export const PROJECT_TYPES: ProjectType[] = ['office', 'hotel', 'residential', 'other']

export type ClientChoice = { orgId: string } | { name: string }

export type NewProjectInput = {
  name: string
  client: ClientChoice
  projectType: ProjectType | null
  localAuthority: string
  region: string
  ribaStage: number
  /** Materials needed on site from (ISO date). */
  startDate: string
  description?: string
  consultantOrgId?: string | null
}

export type ProjectField = 'name' | 'client' | 'projectType' | 'region' | 'ribaStage' | 'startDate' | 'consultantOrgId'

/** Every field error at once, in form order. Checks that need the state (a duplicate name, the client) stay in createProject. */
export function validateNewProject(input: NewProjectInput, today: string): [ProjectField, string][] {
  const out: [ProjectField, string][] = []
  if (!input.name.trim()) out.push(['name', PROJECT_ERRORS.name])
  if ('name' in input.client && !input.client.name.trim()) out.push(['client', PROJECT_ERRORS.clientName])
  if ('orgId' in input.client && !input.client.orgId) out.push(['client', PROJECT_ERRORS.clientName])
  if (input.projectType === null || !PROJECT_TYPES.includes(input.projectType)) out.push(['projectType', PROJECT_ERRORS.projectType])
  if (!(REGIONS as readonly string[]).includes(input.region)) out.push(['region', PROJECT_ERRORS.region])
  if (!Number.isInteger(input.ribaStage) || input.ribaStage < 0 || input.ribaStage > 7) out.push(['ribaStage', PROJECT_ERRORS.stage])
  if (!isIsoDate(input.startDate)) out.push(['startDate', PROJECT_ERRORS.badDate])
  else if (!isOnOrBefore(today, input.startDate)) out.push(['startDate', PROJECT_ERRORS.pastDate])
  return out
}

/** The practice's existing clients, for the new project dialog. */
export function existingClientOrgIds(state: AppData, architectOrgId: string): string[] {
  return [...new Set(Object.values(state.world.projects).filter((p) => p.architectOrgId === architectOrgId).map((p) => p.clientOrgId))]
}

function resolveClient(state: AppData, architectOrgId: string, client: ClientChoice): { orgId: string; createName: string | null } | { error: string } {
  if ('orgId' in client) {
    if (!existingClientOrgIds(state, architectOrgId).includes(client.orgId)) return { error: PROJECT_ERRORS.clientNotBuyer }
    return { orgId: client.orgId, createName: null }
  }
  const name = client.name.trim()
  const key = name.toLowerCase()
  const named = (id: string) => state.world.orgs[id]?.name.trim().toLowerCase() === key
  if (named(architectOrgId)) return { error: PROJECT_ERRORS.clientNotBuyer }
  // Reuse an organisation only when it is a client already: a developer, or a client of this practice. Any other
  // name, a seller's included, gets a new client record, so the form never tells the architect who sells (P3).
  const own = new Set(existingClientOrgIds(state, architectOrgId))
  const found = Object.values(state.world.orgs).find((o) => named(o.id) && (o.type === 'Developer' || own.has(o.id)))
  if (found) return { orgId: found.id, createName: null }
  return { orgId: '', createName: name }
}

/** The architect creates a project with an empty shortlist (09 section 13.6, adapted). */
export function createProject(state: AppData, actor: Actor, input: NewProjectInput): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'architect') return fail(state, ERRORS.role)
  const invalid = validateNewProject(input, a.today)
  if (invalid.length > 0) return fail(state, invalid[0][1])
  const name = clean(input.name, 120)
  const taken = Object.values(state.world.projects).some((p) => p.architectOrgId === a.org.id && p.name.trim().toLowerCase() === name.toLowerCase())
  if (taken) return fail(state, PROJECT_ERRORS.duplicateName)
  const consultantOrgId = input.consultantOrgId ?? ''
  if (consultantOrgId && roleOfOrg(state, consultantOrgId) !== 'consultant') return fail(state, PROJECT_ERRORS.consultant)
  const client = resolveClient(state, a.org.id, input.client)
  if ('error' in client) return fail(state, client.error)

  let s = state
  let clientOrgId = client.orgId
  const w = structuredClone(s.world)
  if (client.createName) {
    const m = mint(s, 'org', (id) => !!w.orgs[id])
    s = m.state
    clientOrgId = m.id
    w.orgs[clientOrgId] = { id: clientOrgId, name: clean(client.createName, 120), type: 'Developer' }
  }
  const pm = mint(s, 'prj', (id) => !!w.projects[id] || !!w.wishlists[listIdFor(a.org.id, id)])
  s = pm.state
  const id = pm.id
  const type = input.projectType!
  const project: Project = {
    id,
    name,
    developerOrgId: clientOrgId,
    clientOrgId,
    architectOrgId: a.org.id,
    projectType: type,
    startDate: input.startDate,
    createdBy: a.persona.id,
    teamOrgIds: consultantOrgId ? [a.org.id, consultantOrgId] : [a.org.id],
    teamPersonaIds: [a.persona.id],
    postcodeDistrict: '',
    localAuthority: clean(input.localAuthority, 80),
    region: input.region,
    blind: { orgType: 'Design team', projectType: `${type} project` },
    giaM2: 0,
    ribaStage: input.ribaStage,
    description: clean(input.description ?? '', 600),
    keyDates: { planningSubmission: input.startDate, steelNeedBy: input.startDate },
    frameMassT: 0,
    billOfMaterials: [],
    requirements: [],
    matchResult: null,
    planItems: [],
    termsAccepted: false,
    approvedByOwnerOrgIds: [],
    seededDeals: [],
    hubDistancesKm: { ...V1_ASSUMPTIONS.regionHubKm[input.region] },
    consultantOrgId,
    targets: { contentByValue: 0, avoidedCarbonT: 0 },
  }
  w.projects[id] = project
  const listId = listIdFor(a.org.id, id)
  w.wishlists[listId] = { id: listId, orgId: a.org.id, projectId: id, items: [] }
  s = withWorld(s, w)
  s = log(s, { at: a.now, orgIds: projectOrgIds(project), projectId: id, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'created the project', href: `/app/projects/${id}` })
  s = notify(s, { orgIds: [clientOrgId], kind: 'team', title: `${a.org.name} added you as client`, body: `${name} is now in your projects.`, href: `/app/projects/${id}`, at: a.now, actorUserId: a.user.id })
  if (consultantOrgId) s = notify(s, { orgIds: [consultantOrgId], kind: 'team', title: `${a.org.name} added you to ${name}`, body: 'You are the sustainability consultant on this project.', href: `/app/projects/${id}`, at: a.now, actorUserId: a.user.id })
  return ok(s, id)
}

export type ProjectPatch = Partial<Pick<Project, 'name' | 'projectType' | 'ribaStage' | 'startDate' | 'localAuthority' | 'region' | 'description'>>

/** The architect edits a project's details. A new start date moves the need-by date the seller sees as a quarter. */
export function updateProject(state: AppData, actor: Actor, projectId: string, patch: ProjectPatch): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const next = { ...p }
  if (patch.name !== undefined) {
    const name = clean(patch.name, 120)
    if (!name) return fail(state, PROJECT_ERRORS.name)
    const taken = Object.values(state.world.projects).some((x) => x.id !== projectId && x.architectOrgId === p.architectOrgId && x.name.trim().toLowerCase() === name.toLowerCase())
    if (taken) return fail(state, PROJECT_ERRORS.duplicateName)
    next.name = name
  }
  if (patch.projectType !== undefined) {
    if (!PROJECT_TYPES.includes(patch.projectType)) return fail(state, PROJECT_ERRORS.projectType)
    next.projectType = patch.projectType
    if (p.createdBy !== null) next.blind = { ...p.blind, projectType: `${patch.projectType} project` }
  }
  if (patch.ribaStage !== undefined) {
    if (!Number.isInteger(patch.ribaStage) || patch.ribaStage < 0 || patch.ribaStage > 7) return fail(state, PROJECT_ERRORS.stage)
    next.ribaStage = patch.ribaStage
  }
  if (patch.startDate !== undefined) {
    if (!isIsoDate(patch.startDate)) return fail(state, PROJECT_ERRORS.badDate)
    next.startDate = patch.startDate
    next.keyDates = { ...p.keyDates, steelNeedBy: patch.startDate }
  }
  if (patch.region !== undefined) {
    if (!(REGIONS as readonly string[]).includes(patch.region)) return fail(state, PROJECT_ERRORS.region)
    next.region = patch.region
    if (patch.region !== p.region) next.hubDistancesKm = { ...V1_ASSUMPTIONS.regionHubKm[patch.region] }
  }
  if (patch.localAuthority !== undefined) next.localAuthority = clean(patch.localAuthority, 80)
  if (patch.description !== undefined) next.description = clean(patch.description, 600)
  const w = structuredClone(state.world)
  w.projects[projectId] = next
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: projectOrgIds(next), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'updated the project details', href: `/app/projects/${projectId}` })
  return ok(s)
}

/** The architect or the client accepts the confidentiality terms for shared lots. Once per project. */
export function acceptTerms(state: AppData, actor: Actor, projectId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId) && !isProjectClient(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  if (p.termsAccepted) return ok(state)
  let s = withWorld(state, setTermsAccepted(state.world, projectId))
  s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'accepted the confidentiality terms for shared lots', href: `/app/discover?tab=shared&project=${projectId}` })
  return ok(s)
}

/** The architect sets or clears the project's sustainability consultancy. */
export function setProjectConsultant(state: AppData, actor: Actor, projectId: string, consultantOrgId: string | null): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const next = consultantOrgId ?? ''
  if (next && roleOfOrg(state, next) !== 'consultant') return fail(state, PROJECT_ERRORS.consultant)
  if (next === p.consultantOrgId) return ok(state)
  const w = structuredClone(state.world)
  const proj = w.projects[projectId]
  proj.teamOrgIds = [...proj.teamOrgIds.filter((x) => x !== p.consultantOrgId), ...(next ? [next] : [])]
  proj.consultantOrgId = next
  let s = withWorld(state, w)
  const text = next ? `added ${w.orgs[next].name} as sustainability consultant` : 'removed the sustainability consultant'
  s = log(s, { at: a.now, orgIds: projectOrgIds(proj), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text, href: `/app/projects/${projectId}/team` })
  if (next) s = notify(s, { orgIds: [next], kind: 'team', title: `${a.org.name} added you to ${p.name}`, body: 'You are the sustainability consultant on this project.', href: `/app/projects/${projectId}`, at: a.now, actorUserId: a.user.id })
  return ok(s)
}

function specOf(state: AppData, projectId: string) {
  return state.specs[projectId] ?? { header: '', clauseNotes: {}, updatedAt: null }
}

/** The architect's note at the head of the specification. */
export function editSpecHeader(state: AppData, actor: Actor, projectId: string, text: string): ActionResult {
  if (!state.world.projects[projectId]) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const spec = specOf(state, projectId)
  const header = clean(text, 4000)
  if (spec.header === header) return ok(state)
  return ok({ ...state, specs: { ...state.specs, [projectId]: { ...spec, header, updatedAt: actor.now } } })
}

/** The architect's note on one clause of the specification, by public ID. An empty note clears it. */
export function editSpecClauseNote(state: AppData, actor: Actor, projectId: string, publicId: string, text: string): ActionResult {
  if (!state.world.projects[projectId]) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const spec = specOf(state, projectId)
  const note = clean(text, 2000)
  if ((spec.clauseNotes[publicId] ?? '') === note) return ok(state)
  const clauseNotes = { ...spec.clauseNotes }
  if (note) clauseNotes[publicId] = note
  else delete clauseNotes[publicId]
  return ok({ ...state, specs: { ...state.specs, [projectId]: { ...spec, clauseNotes, updatedAt: actor.now } } })
}
