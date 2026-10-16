// The sustainability records of a project (client-consultant design, section 4): the consultant's targets, results,
// certification credits and circular economy statement, and the requirement tracking the client and the consultant
// share. Every action addresses only the project's own organisations, never an owner or a surveyor.
import type { Project } from '../../domain/types'
import type { CreditTrack, GoalId, GoalValue, OutputRef, ProjectSustainability, RequirementTrack, StatementDoc, StatementSectionId, TrackStatus } from '../../domain/sustainabilityTypes'
import { OUTPUT_REFS, TRACK_STATUSES } from '../../domain/sustainabilityTypes'
import { goalDef, isGoalId } from '../../domain/reference/goals'
import { creditById, schemeDef, type CreditDef } from '../../domain/reference/certification'
import { inSentence, TRACK_STATUS_LABELS } from '../../domain/reference/sustainabilityCopy'
import { GOAL_INPUT_ERRORS, goalValueText, isValidGoalValue } from '../../domain/engines/goals'
import { defaultIncluded, defaultTargeted } from '../../domain/engines/certification'
import { STATEMENT_SECTIONS } from '../../domain/engines/statement'
import { clientLinked } from '../../domain/access'
import { daysBetween } from '../../domain/dates'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, linkedConsultantOrgId, projectOrgIds, projectSide, type ProjectSide } from '../access'
import { log, notify } from '../notifications'
import { mint } from '../ids'
import { applicableRequirements, isProjectMaterial, mappedItems, schemeTargeted, sustainabilityOf, withSustainability } from '../sustainabilityRecord'
import { acting, clean, fail, isIsoDate, ok, type Acting } from './common'
import { currentStatementSections } from '../selectors/sustainability'

export const SUSTAINABILITY_ERRORS = {
  noGoal: 'That target could not be found.',
  measured: 'Tallyard works this figure out from the project. It cannot be entered.',
  noRequirement: 'That requirement does not apply to this project.',
  noCredit: 'That credit could not be found.',
  notTargeted: 'Target this credit before you set its status.',
  noMaterial: 'That material is not on this project.',
  emptyEvidence: 'Add a note or choose an output.',
  noEvidence: 'That evidence could not be found.',
  notAuthor: 'Only the person who added this evidence can remove it.',
  notSent: 'The statement has not been sent for review.',
  noSection: 'That section could not be found.',
  badDate: 'Enter a date on or before today.',
  noSource: 'Say where the result comes from.',
  badStatus: 'Choose one of the statuses offered.',
  noClient: 'The client has not accepted this project yet.',
} as const

type OnProject = { a: Acting; p: Project; side: ProjectSide }

/** The acting person on the project, on one of the allowed sides; otherwise the error. */
function onProject(state: AppData, actor: Actor, projectId: string, sides: ProjectSide[]): OnProject | string {
  const a = acting(state, actor)
  if (typeof a === 'string') return a
  const p = state.world.projects[projectId]
  if (!p) return ERRORS.noProject
  const side = projectSide(state, actor.userId, projectId)
  if (!side || !sides.includes(side)) return ERRORS.role
  return { a, p, side }
}

function base(p: Project): string {
  return `/app/projects/${p.id}`
}

function record(s: AppData, o: OnProject, text: string, path: string): AppData {
  return log(s, { at: o.a.now, orgIds: projectOrgIds(o.p), projectId: o.p.id, buildingId: null, actorUserId: o.a.user.id, actor: o.a.user.name, text, href: `${base(o.p)}${path}` })
}

/** The client organisation, once it has accepted the project. */
function clientOrg(p: Project): string[] {
  return clientLinked(p) ? [p.clientOrgId] : []
}

function sameValue(a: GoalValue | null, b: GoalValue | null): boolean {
  return a === b
}

// ---------- Goals and targets ----------

/** The consultant sets a project's target for a goal, or marks it not targeted (value null). */
export function setGoalTarget(state: AppData, actor: Actor, projectId: string, goalId: GoalId, value: GoalValue | null, note: string): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  if (!isGoalId(goalId)) return fail(state, SUSTAINABILITY_ERRORS.noGoal)
  const def = goalDef(goalId)
  if (value !== null && !isValidGoalValue(def, value)) return fail(state, GOAL_INPUT_ERRORS[def.unit])
  const text = clean(note, 1000)
  const current = sustainabilityOf(state, projectId).goals[goalId]
  if (current && sameValue(current.value, value) && current.note === text) return ok(state)
  let s = withSustainability(state, projectId, (r) => ({ ...r, goals: { ...r.goals, [goalId]: { goalId, value, note: text, setByUserId: o.a.user.id, setAt: o.a.now } } }))
  const label = inSentence(def.label)
  const valueText = goalValueText(def, value)
  s = record(s, o, value === null ? `marked ${label} as not targeted` : `set the target for ${label} to ${valueText}`, '/targets')
  s = notify(s, { orgIds: clientOrg(o.p), kind: 'sustainability', title: `New target on ${o.p.name}`, body: `${o.a.user.name}, ${o.a.org.name}: ${def.label} ${valueText}.`, href: `${base(o.p)}/sustainability`, at: o.a.now, actorUserId: o.a.user.id })
  return ok(s)
}

/** The consultant returns a goal to its default from the requirements. */
export function resetGoalTarget(state: AppData, actor: Actor, projectId: string, goalId: GoalId): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  if (!isGoalId(goalId)) return fail(state, SUSTAINABILITY_ERRORS.noGoal)
  if (!sustainabilityOf(state, projectId).goals[goalId]) return ok(state)
  let s = withSustainability(state, projectId, (r) => {
    const goals = { ...r.goals }
    delete goals[goalId]
    return { ...r, goals }
  })
  s = record(s, o, `reset the target for ${inSentence(goalDef(goalId).label)} to the default`, '/targets')
  return ok(s)
}

/** The consultant records a result Tallyard cannot work out, with its date and source. */
export function setGoalActual(state: AppData, actor: Actor, projectId: string, goalId: GoalId, value: GoalValue, asOf: string, source: string): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  if (!isGoalId(goalId)) return fail(state, SUSTAINABILITY_ERRORS.noGoal)
  const def = goalDef(goalId)
  if (def.measuredBy !== 'consultant') return fail(state, SUSTAINABILITY_ERRORS.measured)
  if (!isValidGoalValue(def, value)) return fail(state, GOAL_INPUT_ERRORS[def.unit])
  if (!isIsoDate(asOf) || daysBetween(asOf, o.a.today) < 0) return fail(state, SUSTAINABILITY_ERRORS.badDate)
  const src = clean(source, 300)
  if (!src) return fail(state, SUSTAINABILITY_ERRORS.noSource)
  const current = sustainabilityOf(state, projectId).actuals[goalId]
  if (current && current.value === value && current.asOf === asOf && current.source === src) return ok(state)
  let s = withSustainability(state, projectId, (r) => ({ ...r, actuals: { ...r.actuals, [goalId]: { goalId, value, asOf, source: src, enteredByUserId: o.a.user.id, enteredAt: o.a.now } } }))
  s = record(s, o, `recorded ${inSentence(def.label)}: ${goalValueText(def, value)}`, '/targets')
  return ok(s)
}

export function clearGoalActual(state: AppData, actor: Actor, projectId: string, goalId: GoalId): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  if (!isGoalId(goalId)) return fail(state, SUSTAINABILITY_ERRORS.noGoal)
  if (!sustainabilityOf(state, projectId).actuals[goalId]) return ok(state)
  return ok(
    withSustainability(state, projectId, (r) => {
      const actuals = { ...r.actuals }
      delete actuals[goalId]
      return { ...r, actuals }
    }),
  )
}

// ---------- Requirements ----------

function trackOf(r: ProjectSustainability, requirementId: string): RequirementTrack {
  return r.requirements[requirementId] ?? { requirementId, status: 'not_started', evidence: [], updatedAt: null, updatedByUserId: null }
}

function requirementOn(p: Project, requirementId: string) {
  return applicableRequirements(p).find((r) => r.id === requirementId) ?? null
}

/** The client or the consultant sets a requirement's status. At risk and evidence ready reach the other of the two. */
export function setRequirementStatus(state: AppData, actor: Actor, projectId: string, requirementId: string, status: TrackStatus): ActionResult {
  const o = onProject(state, actor, projectId, ['client', 'consultant'])
  if (typeof o === 'string') return fail(state, o)
  const req = requirementOn(o.p, requirementId)
  if (!req) return fail(state, SUSTAINABILITY_ERRORS.noRequirement)
  if (!TRACK_STATUSES.includes(status)) return fail(state, SUSTAINABILITY_ERRORS.badStatus)
  if (trackOf(sustainabilityOf(state, projectId), requirementId).status === status) return ok(state)
  let s = withSustainability(state, projectId, (r) => ({ ...r, requirements: { ...r.requirements, [requirementId]: { ...trackOf(r, requirementId), status, updatedAt: o.a.now, updatedByUserId: o.a.user.id } } }))
  const word = TRACK_STATUS_LABELS[status].toLowerCase()
  s = record(s, o, `marked ${req.title} as ${word}`, '/requirements')
  if (status === 'at_risk' || status === 'evidence_ready') {
    const other = o.side === 'client' ? (linkedConsultantOrgId(o.p) ? [linkedConsultantOrgId(o.p)] : []) : clientOrg(o.p)
    s = notify(s, { orgIds: other, kind: 'sustainability', title: `${req.title} is ${word} on ${o.p.name}`, body: `Marked by ${o.a.user.name}, ${o.a.org.name}.`, href: `${base(o.p)}/requirements`, at: o.a.now, actorUserId: o.a.user.id })
  }
  return ok(s)
}

/** Adds a note, optionally linked to an output held in Tallyard. The first evidence starts the requirement. */
export function addRequirementEvidence(state: AppData, actor: Actor, projectId: string, requirementId: string, input: { text: string; output: OutputRef | null }): ActionResult<string> {
  const o = onProject(state, actor, projectId, ['client', 'consultant'])
  if (typeof o === 'string') return fail(state, o)
  const req = requirementOn(o.p, requirementId)
  if (!req) return fail(state, SUSTAINABILITY_ERRORS.noRequirement)
  const text = clean(input.text ?? '', 1000)
  const output = input.output && OUTPUT_REFS.includes(input.output) ? input.output : null
  if (!text && !output) return fail(state, SUSTAINABILITY_ERRORS.emptyEvidence)
  const taken = new Set(Object.values(state.sustainability ?? {}).flatMap((r) => Object.values(r.requirements ?? {}).flatMap((t) => t.evidence.map((e) => e.id))))
  const m = mint(state, 'evd', (id) => taken.has(id))
  let s = withSustainability(m.state, projectId, (r) => {
    const t = trackOf(r, requirementId)
    const evidence = [...t.evidence, { id: m.id, text, output, addedByUserId: o.a.user.id, addedBy: o.a.user.name, addedAt: o.a.now }]
    const started = t.status === 'not_started'
    return { ...r, requirements: { ...r.requirements, [requirementId]: { ...t, evidence, status: started ? 'in_progress' : t.status, updatedAt: o.a.now, updatedByUserId: o.a.user.id } } }
  })
  s = record(s, o, `added evidence to ${req.title}`, '/requirements')
  return ok(s, m.id)
}

/** Removes evidence; only the person who added it may. */
export function removeRequirementEvidence(state: AppData, actor: Actor, projectId: string, requirementId: string, evidenceId: string): ActionResult {
  const o = onProject(state, actor, projectId, ['client', 'consultant'])
  if (typeof o === 'string') return fail(state, o)
  if (!requirementOn(o.p, requirementId)) return fail(state, SUSTAINABILITY_ERRORS.noRequirement)
  const t = trackOf(sustainabilityOf(state, projectId), requirementId)
  const e = t.evidence.find((x) => x.id === evidenceId)
  if (!e) return fail(state, SUSTAINABILITY_ERRORS.noEvidence)
  if (e.addedByUserId !== o.a.user.id) return fail(state, SUSTAINABILITY_ERRORS.notAuthor)
  return ok(withSustainability(state, projectId, (r) => ({ ...r, requirements: { ...r.requirements, [requirementId]: { ...t, evidence: t.evidence.filter((x) => x.id !== evidenceId) } } })))
}

// ---------- Certification ----------

/** The credit's record, created with its defaults the first time it is changed. */
function creditTrack(state: AppData, p: Project, def: CreditDef): CreditTrack {
  return sustainabilityOf(state, p.id).credits[def.id] ?? { creditId: def.id, targeted: defaultTargeted(def, schemeTargeted(state, p, def.scheme)), status: 'not_started', note: '', items: {}, updatedAt: null, updatedByUserId: null }
}

function putCredit(state: AppData, projectId: string, track: CreditTrack): AppData {
  return withSustainability(state, projectId, (r) => ({ ...r, credits: { ...r.credits, [track.creditId]: track } }))
}

function creditName(def: CreditDef): string {
  return `${schemeDef(def.scheme).label} ${def.code}`
}

export function setCreditTargeted(state: AppData, actor: Actor, projectId: string, creditId: string, targeted: boolean): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  const def = creditById(creditId)
  if (!def) return fail(state, SUSTAINABILITY_ERRORS.noCredit)
  const t = creditTrack(state, o.p, def)
  if (t.targeted === targeted && sustainabilityOf(state, projectId).credits[creditId]) return ok(state)
  let s = putCredit(state, projectId, { ...t, targeted, updatedAt: o.a.now, updatedByUserId: o.a.user.id })
  if (t.targeted !== targeted) s = record(s, o, targeted ? `now targets ${creditName(def)}` : `no longer targets ${creditName(def)}`, '/certification')
  return ok(s)
}

export function setCreditStatus(state: AppData, actor: Actor, projectId: string, creditId: string, status: TrackStatus): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  const def = creditById(creditId)
  if (!def) return fail(state, SUSTAINABILITY_ERRORS.noCredit)
  if (!TRACK_STATUSES.includes(status) || status === 'not_applicable') return fail(state, SUSTAINABILITY_ERRORS.badStatus)
  const t = creditTrack(state, o.p, def)
  if (!t.targeted) return fail(state, SUSTAINABILITY_ERRORS.notTargeted)
  if (t.status === status) return ok(state)
  let s = putCredit(state, projectId, { ...t, status, updatedAt: o.a.now, updatedByUserId: o.a.user.id })
  s = record(s, o, `marked ${creditName(def)} as ${TRACK_STATUS_LABELS[status].toLowerCase()}`, '/certification')
  if (status === 'at_risk') s = notify(s, { orgIds: clientOrg(o.p), kind: 'sustainability', title: `${creditName(def)} is at risk on ${o.p.name}`, body: `${o.a.user.name}, ${o.a.org.name}: ${def.title}.`, href: `${base(o.p)}/sustainability`, at: o.a.now, actorUserId: o.a.user.id })
  return ok(s)
}

export function setCreditNote(state: AppData, actor: Actor, projectId: string, creditId: string, note: string): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  const def = creditById(creditId)
  if (!def) return fail(state, SUSTAINABILITY_ERRORS.noCredit)
  const t = creditTrack(state, o.p, def)
  const text = clean(note, 1000)
  if (t.note === text) return ok(state)
  return ok(putCredit(state, projectId, { ...t, note: text, updatedAt: o.a.now, updatedByUserId: o.a.user.id }))
}

/** Includes or leaves out one of the project's materials for a credit. Setting it back to the rule's default drops the override. */
export function setCreditItem(state: AppData, actor: Actor, projectId: string, creditId: string, publicId: string, included: boolean): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  const def = creditById(creditId)
  if (!def) return fail(state, SUSTAINABILITY_ERRORS.noCredit)
  if (def.itemRule === 'none' || !isProjectMaterial(state.world, o.p, publicId)) return fail(state, SUSTAINABILITY_ERRORS.noMaterial)
  const item = mappedItems(state, o.p).find((i) => i.publicId === publicId)
  if (!item) return fail(state, SUSTAINABILITY_ERRORS.noMaterial)
  const t = creditTrack(state, o.p, def)
  const items = { ...t.items }
  if (included === defaultIncluded(def.itemRule, item)) delete items[publicId]
  else items[publicId] = included
  if (JSON.stringify(items) === JSON.stringify(t.items)) return ok(state)
  return ok(putCredit(state, projectId, { ...t, items, updatedAt: o.a.now, updatedByUserId: o.a.user.id }))
}

// ---------- The circular economy statement ----------

const EMPTY_STATEMENT: StatementDoc = { edits: {}, status: 'draft', sentAt: null, sentByUserId: null, reviewedAt: null, reviewedByUserId: null, reviewNote: null }

function statementOf(state: AppData, projectId: string): StatementDoc {
  return sustainabilityOf(state, projectId).statement ?? EMPTY_STATEMENT
}

function isSection(id: string): id is StatementSectionId {
  return STATEMENT_SECTIONS.some((s) => s.id === id)
}

/**
 * The consultant's text for a section, with the generated text it replaces. Empty text returns to the generated text.
 * Editing after sending keeps the status: the client goes on reading (and reviewing) the version that was sent, and
 * the consultant is offered to send the updated statement.
 */
export function editStatementSection(state: AppData, actor: Actor, projectId: string, sectionId: StatementSectionId, text: string, basis: string): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  if (!isSection(sectionId)) return fail(state, SUSTAINABILITY_ERRORS.noSection)
  const doc = statementOf(state, projectId)
  const body = clean(text, 8000)
  const current = doc.edits[sectionId]
  if (!body && !current) return ok(state)
  if (current && body && current.text === body && current.basis === basis) return ok(state)
  const edits = { ...doc.edits }
  if (body) edits[sectionId] = { text: body, basis, editedAt: o.a.now, editedByUserId: o.a.user.id }
  else delete edits[sectionId]
  return ok(withSustainability(state, projectId, (r) => ({ ...r, statement: { ...doc, edits } })))
}

export function resetStatementSection(state: AppData, actor: Actor, projectId: string, sectionId: StatementSectionId): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  if (!isSection(sectionId)) return fail(state, SUSTAINABILITY_ERRORS.noSection)
  const doc = statementOf(state, projectId)
  if (!doc.edits[sectionId]) return ok(state)
  const edits = { ...doc.edits }
  delete edits[sectionId]
  return ok(withSustainability(state, projectId, (r) => ({ ...r, statement: { ...doc, edits } })))
}

function sameSnapshot(a: StatementDoc['sentSections'], b: StatementDoc['sentSections']): boolean {
  if (!a || !b) return false
  return a.length === b.length && a.every((x, i) => x.id === b[i].id && x.heading === b[i].heading && x.text === b[i].text)
}

/**
 * The consultant sends the statement to the client for review. The text is frozen as sent, so the client reviews
 * that version while the records move on. While it waits for review, sending again is only possible once the text
 * has changed, and it replaces the frozen version.
 */
export function sendStatementForReview(state: AppData, actor: Actor, projectId: string): ActionResult {
  const o = onProject(state, actor, projectId, ['consultant'])
  if (typeof o === 'string') return fail(state, o)
  if (!clientLinked(o.p)) return fail(state, SUSTAINABILITY_ERRORS.noClient)
  const doc = statementOf(state, projectId)
  const sections = currentStatementSections(state, { userId: actor.userId, now: actor.now }, projectId) ?? []
  const again = doc.status === 'ready_for_review'
  if (again && (!doc.sentSections || sameSnapshot(doc.sentSections, sections))) return ok(state)
  let s = withSustainability(state, projectId, (r) => ({ ...r, statement: { ...doc, status: 'ready_for_review', sentAt: o.a.now, sentByUserId: o.a.user.id, reviewedAt: null, reviewedByUserId: null, reviewNote: null, sentSections: sections } }))
  const clientName = state.world.orgs[o.p.clientOrgId]?.name ?? 'the client'
  s = record(s, o, again ? `sent an updated circular economy statement to ${clientName} for review` : `sent the circular economy statement to ${clientName} for review`, '/statement')
  s = notify(s, { orgIds: [o.p.clientOrgId], kind: 'sustainability', title: again ? 'Updated circular economy statement ready for review' : 'Circular economy statement ready for review', body: `${o.p.name}. Sent by ${o.a.user.name}, ${o.a.org.name}.`, href: `${base(o.p)}/sustainability#statement`, at: o.a.now, actorUserId: o.a.user.id })
  return ok(s)
}

/** The client marks the statement reviewed, with an optional note for the consultant. */
export function reviewStatement(state: AppData, actor: Actor, projectId: string, note: string): ActionResult {
  const o = onProject(state, actor, projectId, ['client'])
  if (typeof o === 'string') return fail(state, o)
  const doc = statementOf(state, projectId)
  if (doc.status !== 'ready_for_review') return fail(state, SUSTAINABILITY_ERRORS.notSent)
  const text = clean(note, 2000)
  let s = withSustainability(state, projectId, (r) => ({ ...r, statement: { ...doc, status: 'reviewed', reviewedAt: o.a.now, reviewedByUserId: o.a.user.id, reviewNote: text || null } }))
  s = record(s, o, 'reviewed the circular economy statement', '/statement')
  s = notify(s, { orgIds: linkedConsultantOrgId(o.p) ? [linkedConsultantOrgId(o.p)] : [], kind: 'sustainability', title: `${o.a.org.name} reviewed the circular economy statement`, body: text || 'No comments.', href: `${base(o.p)}/statement`, at: o.a.now, actorUserId: o.a.user.id })
  return ok(s)
}
