// Projects: create and edit, the programme, planning and sustainability requirements, the client's acceptance,
// terms, consultant, and the architect's specification notes.
import type { ClientLink, ProgrammeDates, Project, ProjectProgramme } from '../../domain/types'
import type { ProjectType } from '../../domain/v1types'
import { REGIONS } from '../../domain/reference/assumptions'
import { V1_ASSUMPTIONS } from '../../domain/reference/v1assumptions'
import { blindProjectType, PROJECT_TYPE_OTHER_MAX, PROJECT_TYPES } from '../../domain/reference/projectTypes'
import { isValidLocalAuthority, normaliseLocalAuthority } from '../../domain/reference/places'
import { applicableIds, idsAfterMove, keepApplicable } from '../../domain/reference/requirements'
import { defaultCompletion, PROGRAMME_ERRORS, suggestProgramme, validateProgramme } from '../../domain/engines/programme'
import { daysBetween, isOnOrBefore } from '../../domain/dates'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, isProjectArchitect, isProjectClient, projectOrgIds, roleOfOrg, usersOfOrg } from '../access'
import { mint } from '../ids'
import { listIdFor } from '../lots'
import { log, notify, plural } from '../notifications'
import { setTermsAccepted } from '../worldOps'
import { sharedWithProjectHref } from '../paths'
import { acting, clean, fail, isIsoDate, ok, withWorld, type Acting } from './common'
import { askConsultant, pendingConsultantLink } from './consultant'
import { CLIENT_INVITE_ERRORS, clientInviteProblem, issueClientInvite } from './clientInvite'
import { isEmail } from '../../sandbox/accounts'

export { PROJECT_TYPES }

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
  localAuthority: 'Choose a local authority in this region.',
  requirement: 'Choose requirements that apply to this location.',
  linked: 'The client has already accepted this project.',
  alreadyPending: 'A request is already waiting for this client.',
  notPending: 'This request has already been answered.',
} as const

export type ClientChoice = { orgId: string } | { name: string }

export type NewProjectInput = {
  name: string
  client: ClientChoice
  projectType: ProjectType | null
  /** A description of the type when it is 'other'. Project team only. */
  projectTypeOther?: string
  localAuthority: string
  region: string
  ribaStage: number
  /** Materials needed on site from (ISO date). */
  startDate: string
  /** Start of stage 5 (ISO date); the materials date when left out. */
  siteStart?: string
  /** Start of stage 6 (ISO date); CONSTRUCTION_DAYS after site start when left out. */
  practicalCompletion?: string
  /** Planning and sustainability requirements to track; filtered to the location. */
  requirementIds?: string[]
  /** The architect's note to the client with the request to join. */
  clientMessage?: string
  /** A contact at a client nobody uses yet: they get an invite to join the client organisation and answer. */
  clientEmail?: string
  description?: string
  consultantOrgId?: string | null
}

export type ProjectField = 'name' | 'client' | 'clientEmail' | 'projectType' | 'projectTypeOther' | 'region' | 'localAuthority' | 'ribaStage' | 'startDate' | 'siteStart' | 'practicalCompletion' | 'consultantOrgId'

function validStage(stage: number): boolean {
  return Number.isInteger(stage) && stage >= 0 && stage <= 7
}

/** The programme dates a new project gets: site start defaults to the materials date, completion to the typical length. */
export function newProgrammeDates(input: NewProjectInput, today: string): ProgrammeDates | null {
  const siteStart = input.siteStart || input.startDate
  return suggestProgramme(today, input.ribaStage, siteStart, input.practicalCompletion || defaultCompletion(siteStart))
}

/** Every field error at once, in form order. Checks that need the state (a duplicate name, the client) stay in createProject. */
export function validateNewProject(input: NewProjectInput, today: string): [ProjectField, string][] {
  const out: [ProjectField, string][] = []
  if (!input.name.trim()) out.push(['name', PROJECT_ERRORS.name])
  if ('name' in input.client && !input.client.name.trim()) out.push(['client', PROJECT_ERRORS.clientName])
  if ('orgId' in input.client && !input.client.orgId) out.push(['client', PROJECT_ERRORS.clientName])
  if ('name' in input.client && input.clientEmail?.trim() && !isEmail(input.clientEmail)) out.push(['clientEmail', CLIENT_INVITE_ERRORS.email])
  if (input.projectType === null || !PROJECT_TYPES.includes(input.projectType)) out.push(['projectType', PROJECT_ERRORS.projectType])
  const regionOk = (REGIONS as readonly string[]).includes(input.region)
  if (!regionOk) out.push(['region', PROJECT_ERRORS.region])
  const stageOk = validStage(input.ribaStage)
  if (!stageOk) out.push(['ribaStage', PROJECT_ERRORS.stage])
  let startOk = false
  if (!isIsoDate(input.startDate)) out.push(['startDate', PROJECT_ERRORS.badDate])
  else if (!isOnOrBefore(today, input.startDate)) out.push(['startDate', PROJECT_ERRORS.pastDate])
  else startOk = true
  if (regionOk && !isValidLocalAuthority(input.region, input.localAuthority)) out.push(['localAuthority', PROJECT_ERRORS.localAuthority])
  if (!startOk) return out
  // The programme: checked only once the materials date is a valid future date, so earlier error lists stay as they were.
  let datesOk = true
  if (input.siteStart && !isIsoDate(input.siteStart)) {
    out.push(['siteStart', PROJECT_ERRORS.badDate])
    datesOk = false
  }
  if (input.practicalCompletion && !isIsoDate(input.practicalCompletion)) {
    out.push(['practicalCompletion', PROJECT_ERRORS.badDate])
    datesOk = false
  }
  if (!datesOk || !stageOk) return out
  const dates = newProgrammeDates(input, today)
  if (!dates) {
    out.push(['siteStart', PROGRAMME_ERRORS.tooSoon])
    return out
  }
  for (const [field, message] of validateProgramme(dates, input.startDate)) {
    if (field === 'siteStart' || field === 'practicalCompletion') out.push([field, message])
    else if (field === 'startDate') out.push([input.siteStart ? 'startDate' : 'siteStart', message])
  }
  return out
}

/**
 * The practice's clients that have not declined: for the new project dialog and the change of client. Only client
 * organisations: a donor building owner whose New project the practice works on is never offered or found by name
 * (BRIEF 14.2); owners become a project's client only through their own New project.
 */
export function existingClientOrgIds(state: AppData, architectOrgId: string): string[] {
  return [...new Set(Object.values(state.world.projects).filter((p) => p.architectOrgId === architectOrgId && p.clientLink.status !== 'declined').map((p) => p.clientOrgId))].filter((id) => roleOfOrg(state, id) === 'client')
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

/** A request to the client organisation to accept a project, waiting for its answer. */
export function pendingClientLink(today: string, requestedByPersonaId: string | null, message: string): ClientLink {
  return { status: 'pending', requestedOn: today, requestedByPersonaId, message: clean(message, 1000), decidedOn: null, decidedByPersonaId: null, decisionNote: '' }
}

export type ProjectRecordInput = {
  id: string
  name: string
  clientOrgId: string
  /** '' when no practice is appointed yet. */
  architectOrgId: string
  createdByPersonaId: string
  consultantOrgId: string
  projectType: ProjectType
  projectTypeOther: string
  region: string
  localAuthority: string
  ribaStage: number
  /** Materials needed on site from. */
  startDate: string
  programme: ProjectProgramme
  clientLink: ClientLink
  /** The request to the consultancy, when one is named. */
  consultantLink?: ClientLink
  requirementIds: string[]
  /**
   * Whether requirementIds is the architect's choice, an empty one included. Left out, a non-empty list counts as
   * chosen and an empty one as not yet chosen, so the suggestions are tracked meanwhile.
   */
  requirementsReviewed?: boolean
  description: string
  /** What a seller reads as the buyer's organisation type; 'Design team' unless given. */
  blindOrgType?: string
}

/** A new project record with an empty bill, schedule and plan. Pure: the caller resolves the IDs and the client. */
export function projectRecord(input: ProjectRecordInput): Project {
  const type = input.projectType
  const localAuthority = normaliseLocalAuthority(clean(input.localAuthority, 80))
  const planningRequirementIds = keepApplicable(input.requirementIds, input.region, localAuthority)
  return {
    id: input.id,
    name: clean(input.name, 120),
    developerOrgId: input.clientOrgId,
    clientOrgId: input.clientOrgId,
    architectOrgId: input.architectOrgId,
    projectType: type,
    projectTypeOther: type === 'other' ? clean(input.projectTypeOther, PROJECT_TYPE_OTHER_MAX) : '',
    programme: { stageStarts: [...input.programme.stageStarts], siteStart: input.programme.siteStart, practicalCompletion: input.programme.practicalCompletion, source: input.programme.source },
    clientLink: { ...input.clientLink },
    planningRequirementIds,
    requirementsReviewed: input.requirementsReviewed ?? planningRequirementIds.length > 0,
    startDate: input.startDate,
    createdBy: input.createdByPersonaId,
    teamOrgIds: [input.architectOrgId, input.consultantOrgId].filter((x) => x),
    teamPersonaIds: [input.createdByPersonaId],
    postcodeDistrict: '',
    localAuthority,
    region: input.region,
    blind: { orgType: input.blindOrgType ?? 'Design team', projectType: blindProjectType(type) },
    giaM2: 0,
    ribaStage: input.ribaStage,
    description: clean(input.description, 600),
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
    consultantOrgId: input.consultantOrgId,
    ...(input.consultantLink ? { consultantLink: { ...input.consultantLink } } : {}),
    targets: { contentByValue: 0, avoidedCarbonT: 0 },
  }
}

/** The client side of a link request: a line in their activity and a notification, both leading to Project requests. */
function askClient(s: AppData, a: Acting, clientOrgId: string, projectName: string, message: string): AppData {
  const text = clean(message, 1000)
  let next = log(s, { at: a.now, orgIds: [clientOrgId], projectId: null, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `asked to add you as client on ${projectName}`, href: '/app/projects/requests' })
  next = notify(next, {
    orgIds: [clientOrgId],
    kind: 'team',
    title: `${a.org.name} asked to add you as client on ${projectName}`,
    body: text ? `${a.user.name}: ${text}` : 'Accept to see the project and approve materials for it.',
    href: '/app/projects/requests',
    at: a.now,
    actorUserId: a.user.id,
  })
  return next
}

/** The architect creates a project with an empty shortlist and suggested programme dates; the client is asked to accept. */
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
  const dates = newProgrammeDates(input, a.today)
  if (!dates) return fail(state, PROGRAMME_ERRORS.tooSoon)

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
  const project = projectRecord({
    id,
    name,
    clientOrgId,
    architectOrgId: a.org.id,
    createdByPersonaId: a.persona.id,
    consultantOrgId,
    projectType: input.projectType!,
    projectTypeOther: input.projectTypeOther ?? '',
    region: input.region,
    localAuthority: input.localAuthority,
    ribaStage: input.ribaStage,
    startDate: input.startDate,
    programme: { ...dates, source: 'suggested' },
    clientLink: pendingClientLink(a.today, a.persona.id, input.clientMessage ?? ''),
    consultantLink: consultantOrgId ? pendingConsultantLink(a.today, a.persona.id) : undefined,
    requirementIds: input.requirementIds ?? [],
    // A list sent from the form is the architect's choice, even when they cleared every tick.
    requirementsReviewed: input.requirementIds !== undefined,
    description: input.description ?? '',
  })
  w.projects[id] = project
  const listId = listIdFor(a.org.id, id)
  w.wishlists[listId] = { id: listId, orgId: a.org.id, projectId: id, items: [] }
  s = withWorld(s, w)
  s = log(s, { at: a.now, orgIds: projectOrgIds(project), projectId: id, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'created the project', href: `/app/projects/${id}` })
  s = askClient(s, a, clientOrgId, name, input.clientMessage ?? '')
  // The consultancy is asked once the client accepts (decideClientLink), never before.
  const invited = inviteNewClient(s, a, project, input.clientEmail)
  if (typeof invited === 'string') return fail(state, invited)
  return ok(invited, id)
}

/**
 * A contact email for a client nobody uses yet: invites them to join the client organisation and answer. Ignored when
 * blank, or when someone from the organisation already uses the product (they answer on Project requests).
 */
function inviteNewClient(s: AppData, a: Acting, project: Project, email: string | undefined): AppData | string {
  if (!email?.trim() || usersOfOrg(s, project.clientOrgId).length > 0) return s
  const problem = clientInviteProblem(s, project, email)
  if (problem) return problem
  return issueClientInvite(s, project, email, { userId: a.user.id, name: a.user.name, now: a.now }).state
}

/** The client organisation accepts or declines being the client on a project. Only a pending request can be answered. */
export function decideClientLink(state: AppData, actor: Actor, projectId: string, decision: 'accepted' | 'declined', note: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (a.role !== 'client' || p.clientOrgId !== a.org.id) return fail(state, ERRORS.role)
  if (p.clientLink.status !== 'pending') return fail(state, PROJECT_ERRORS.notPending)
  const clientOrg = a.org.name
  const href = `/app/projects/${projectId}`
  const w = structuredClone(state.world)
  const next = w.projects[projectId]
  let s: AppData
  if (decision === 'accepted') {
    next.clientLink = { ...next.clientLink, status: 'accepted', decidedOn: a.today, decidedByPersonaId: a.persona.id, decisionNote: '' }
    s = withWorld(state, w)
    s = log(s, { at: a.now, orgIds: projectOrgIds(next), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'accepted the project as client', href })
    s = notify(s, { orgIds: [p.architectOrgId], kind: 'team', title: `${clientOrg} accepted ${p.name}`, body: 'They can now see the project and approve materials you send.', href, at: a.now, actorUserId: a.user.id })
    // Now the client has agreed, the consultancy the architect named is asked.
    s = askConsultant(s, next, a.now)
    return ok(s)
  }
  const text = clean(note, 1000)
  next.clientLink = { ...next.clientLink, status: 'declined', decidedOn: a.today, decidedByPersonaId: a.persona.id, decisionNote: text }
  s = withWorld(state, w)
  // A decline reaches the architect under the organisation's name, never a person's.
  s = log(s, { at: a.now, orgIds: [p.architectOrgId], projectId, buildingId: null, actorUserId: null, actor: clientOrg, text: 'declined the project', href })
  s = notify(s, { orgIds: [p.architectOrgId], kind: 'team', title: `${clientOrg} declined ${p.name}`, body: text ? `Their note: ${text}` : 'Ask again or choose another client from the project overview.', href, at: a.now, actorUserId: null })
  return ok(s)
}

/** The architect asks a client to accept the project again, or asks another client, while it is not accepted. */
export function requestClientLink(state: AppData, actor: Actor, projectId: string, client: ClientChoice, message: string, clientEmail?: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  if (p.clientLink.status === 'accepted') return fail(state, PROJECT_ERRORS.linked)
  // Asking the same client again after a decline is allowed, even though it no longer counts as one of the practice's clients.
  const resolved = 'orgId' in client && client.orgId === p.clientOrgId ? { orgId: p.clientOrgId, createName: null } : resolveClient(state, p.architectOrgId, client)
  if ('error' in resolved) return fail(state, resolved.error)
  if (p.clientLink.status === 'pending' && resolved.orgId === p.clientOrgId) return fail(state, PROJECT_ERRORS.alreadyPending)
  let s = state
  let clientOrgId = resolved.orgId
  const w = structuredClone(s.world)
  if (resolved.createName) {
    const m = mint(s, 'org', (id) => !!w.orgs[id])
    s = m.state
    clientOrgId = m.id
    w.orgs[clientOrgId] = { id: clientOrgId, name: clean(resolved.createName, 120), type: 'Developer' }
  }
  const next = w.projects[projectId]
  next.clientOrgId = clientOrgId
  next.developerOrgId = clientOrgId
  next.clientLink = pendingClientLink(a.today, a.persona.id, message)
  s = withWorld(s, w)
  const clientName = w.orgs[clientOrgId]?.name ?? ''
  s = log(s, { at: a.now, orgIds: projectOrgIds(next), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `asked ${clientName} to join as client`, href: `/app/projects/${projectId}` })
  s = askClient(s, a, clientOrgId, p.name, message)
  if ('name' in client && clientEmail?.trim() && !isEmail(clientEmail)) return fail(state, CLIENT_INVITE_ERRORS.email)
  const invited = inviteNewClient(s, a, next, clientEmail)
  if (typeof invited === 'string') return fail(state, invited)
  return ok(invited)
}

export type ProgrammeInput = { ribaStage: number; programme: ProgrammeDates; startDate: string }

/** The architect sets the declared stage, the programme dates and when materials are needed on site. */
export function setProjectProgramme(state: AppData, actor: Actor, projectId: string, input: ProgrammeInput): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  if (!validStage(input.ribaStage)) return fail(state, PROJECT_ERRORS.stage)
  const problems = validateProgramme(input.programme, input.startDate)
  if (problems.length > 0) return fail(state, problems[0][1])
  const programme: ProjectProgramme = { stageStarts: [...input.programme.stageStarts], siteStart: input.programme.siteStart, practicalCompletion: input.programme.practicalCompletion, source: 'set' }
  const same =
    p.programme.source === 'set' &&
    p.ribaStage === input.ribaStage &&
    p.startDate === input.startDate &&
    p.keyDates.steelNeedBy === input.startDate &&
    p.programme.siteStart === programme.siteStart &&
    p.programme.practicalCompletion === programme.practicalCompletion &&
    p.programme.stageStarts.every((d, i) => d === programme.stageStarts[i])
  if (same) return ok(state)
  const w = structuredClone(state.world)
  const next = w.projects[projectId]
  next.programme = programme
  next.ribaStage = input.ribaStage
  next.startDate = input.startDate
  next.keyDates = { ...next.keyDates, steelNeedBy: input.startDate }
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: projectOrgIds(next), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'updated the programme', href: `/app/projects/${projectId}` })
  return ok(s)
}

/** The architect chooses the planning and sustainability requirements to track. An empty list counts as skipped. */
export function setProjectRequirements(state: AppData, actor: Actor, projectId: string, ids: string[]): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const applicable = new Set(applicableIds(p.region, p.localAuthority))
  if (ids.some((id) => !applicable.has(id))) return fail(state, PROJECT_ERRORS.requirement)
  const chosen = keepApplicable(ids, p.region, p.localAuthority)
  if (p.requirementsReviewed && chosen.length === p.planningRequirementIds.length && chosen.every((id, i) => id === p.planningRequirementIds[i])) return ok(state)
  const w = structuredClone(state.world)
  w.projects[projectId].planningRequirementIds = chosen
  w.projects[projectId].requirementsReviewed = true
  let s = withWorld(state, w)
  const text = chosen.length > 0 ? `chose ${plural(chosen.length, 'planning and sustainability requirement')}` : 'cleared the planning and sustainability requirements'
  s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text, href: `/app/projects/${projectId}` })
  return ok(s)
}

export type ProjectPatch = Partial<Pick<Project, 'name' | 'projectType' | 'projectTypeOther' | 'ribaStage' | 'startDate' | 'localAuthority' | 'region' | 'description'>>

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
    if (p.createdBy !== null) next.blind = { ...p.blind, projectType: blindProjectType(patch.projectType) }
  }
  next.projectTypeOther = next.projectType === 'other' ? clean(patch.projectTypeOther ?? p.projectTypeOther, PROJECT_TYPE_OTHER_MAX) : ''
  if (patch.ribaStage !== undefined) {
    if (!validStage(patch.ribaStage)) return fail(state, PROJECT_ERRORS.stage)
    next.ribaStage = patch.ribaStage
  }
  if (patch.startDate !== undefined) {
    if (!isIsoDate(patch.startDate)) return fail(state, PROJECT_ERRORS.badDate)
    if (daysBetween(p.programme.siteStart, patch.startDate) < 0 || daysBetween(patch.startDate, p.programme.practicalCompletion) < 0) return fail(state, PROGRAMME_ERRORS.materials)
    next.startDate = patch.startDate
    next.keyDates = { ...p.keyDates, steelNeedBy: patch.startDate }
  }
  if (patch.region !== undefined) {
    if (!(REGIONS as readonly string[]).includes(patch.region)) return fail(state, PROJECT_ERRORS.region)
    next.region = patch.region
    if (patch.region !== p.region) next.hubDistancesKm = { ...V1_ASSUMPTIONS.regionHubKm[patch.region] }
  }
  if (patch.localAuthority !== undefined) next.localAuthority = normaliseLocalAuthority(clean(patch.localAuthority, 80))
  if (!isValidLocalAuthority(next.region, next.localAuthority)) return fail(state, PROJECT_ERRORS.localAuthority)
  // A move keeps the chosen requirements that still apply and adds the suggestions new to the place, so the review
  // that follows only confirms the set and a cancelled review leaves what the dialog said.
  if (next.region !== p.region || next.localAuthority !== p.localAuthority) next.planningRequirementIds = idsAfterMove(p.planningRequirementIds, p, next, p.requirementsReviewed)
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
  s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: 'accepted the confidentiality terms for shared lots', href: sharedWithProjectHref(projectId) })
  return ok(s)
}

/**
 * The architect names or clears the project's sustainability consultancy. A named consultancy is asked to join (at
 * once if the client has accepted, otherwise when it does) and reaches the project only once it accepts. Naming the
 * same consultancy again after it declined asks it again.
 */
export function setProjectConsultant(state: AppData, actor: Actor, projectId: string, consultantOrgId: string | null): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const next = consultantOrgId ?? ''
  if (next && roleOfOrg(state, next) !== 'consultant') return fail(state, PROJECT_ERRORS.consultant)
  const askAgain = !!next && next === p.consultantOrgId && p.consultantLink?.status === 'declined'
  if (next === p.consultantOrgId && !askAgain) return ok(state)
  const w = structuredClone(state.world)
  const proj = w.projects[projectId]
  proj.teamOrgIds = [...proj.teamOrgIds.filter((x) => x !== p.consultantOrgId), ...(next ? [next] : [])]
  proj.consultantOrgId = next
  if (next) proj.consultantLink = pendingConsultantLink(a.today, a.persona.id)
  else delete proj.consultantLink
  let s = withWorld(state, w)
  // Logged to the organisations on the project before the change, so a consultancy that is removed reads it too.
  const text = next ? `asked ${w.orgs[next].name} to join as sustainability consultant` : 'removed the sustainability consultant'
  s = log(s, { at: a.now, orgIds: [...projectOrgIds(p), ...projectOrgIds(proj)], projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text, href: `/app/projects/${projectId}/team` })
  s = askConsultant(s, proj, a.now)
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
