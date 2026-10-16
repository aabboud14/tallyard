// Sustainability view models (client-consultant design, section 5.2): goals and targets, certification, requirement
// tracking, the circular economy statement and the shared Sustainability tab. Items and figures come from the public
// listings (through projectMetrics) and the project's own records. No view here holds a money figure.
import type { Project, ReferenceStatus } from '../../domain/types'
import type { GoalId, GoalValue, OutputRef, StatementSectionId, StatementStatus, TrackStatus } from '../../domain/sustainabilityTypes'
import { GOAL_DEFS, GOAL_DEFAULTS, goalDef } from '../../domain/reference/goals'
import { CREDITS, SCHEMES, creditsOf, schemeDef, type SchemeId } from '../../domain/reference/certification'
import { CERT_CAVEAT, GOAL_STATUS_TEXT, OUTPUT_LABELS, REQ_CAVEAT, SCOPE_LABELS, STATEMENT_CAVEAT, STATEMENT_STATUS_FOR_CLIENT, STATEMENT_STATUS_LABELS, TARGET_CAVEAT, TRACK_STATUS_LABELS } from '../../domain/reference/sustainabilityCopy'
import { requirementById } from '../../domain/reference/requirements'
import { projectTypeLabel } from '../../domain/reference/projectTypes'
import { goalProgress, goalValueText, type GoalProgress } from '../../domain/engines/goals'
import { creditItems, defaultTargeted, schemeCounts, suggestedStatus, type CreditMetrics, type MappedItem } from '../../domain/engines/certification'
import { trackerSummary, type TrackerSummary } from '../../domain/engines/tracker'
import { isStale, statementPlainText, statementSections, type StatementInput } from '../../domain/engines/statement'
import type { DocxInput } from '../../domain/engines/statementDocx'
import { clientLinked } from '../../domain/access'
import { formatDate, formatDateShort } from '../../domain/dates'
import * as f from '../../domain/format'
import type { AppData, CreditTrack, Viewer } from '../types'
import { projectSide, type ProjectSide } from '../access'
import { applicableRequirements, effectiveTargets, goalTargets, schemeTargeted, sustainabilityOf } from '../sustainabilityRecord'
import { projectHeader, projectCarbon, type ProjectCarbon, type ProjectHeader } from './project'
import { projectMetrics, slug, type ProjectMetrics } from './consultant'
import { stageLabel, todayOf } from './common'

export { effectiveTargets } from '../sustainabilityRecord'

const base = (p: Project) => `/app/projects/${p.id}`

function nameOf(state: AppData, userId: string | null): string {
  return userId ? (state.users[userId]?.name ?? 'Someone who has left') : ''
}

function dateOf(iso: string): string {
  return formatDateShort(iso.slice(0, 10))
}

// ---------- Goals ----------

export type GoalRow = {
  id: GoalId
  label: string
  unitLabel: string
  direction: 'at_least' | 'at_most'
  measuredBy: 'tallyard' | 'consultant'
  scale: readonly string[] | null
  defaultText: string
  defaultBasis: string | null
  defaultStatus: ReferenceStatus | null
  target: GoalValue | null
  targetText: string
  source: 'default' | 'override' | 'none'
  overrideNote: string | null
  /** "Set by Marcus Lindqvist on 29 Aug 2026". */
  overriddenText: string | null
  actual: GoalValue | null
  actualText: string
  /** "Secured, worked out by Tallyard" or "18 Sep 2026, Stage 2 life cycle assessment". */
  actualNote: string | null
  progress: GoalProgress
  share: number
  statusText: string
  tone: 'brand' | 'warning' | 'neutral'
  indicative: boolean
  canEdit: boolean
  canEnterActual: boolean
}

/** The results Tallyard works out: content and reuse by value need the bill of materials. */
function measured(m: ProjectMetrics, goalId: GoalId): GoalValue | null {
  if (goalId === 'content_by_value') return m.hasBill ? m.secured.percent : null
  if (goalId === 'reuse_by_value') return m.hasBill ? m.reuseSecured : null
  if (goalId === 'avoided_carbon') return m.avoidedSecuredT
  return null
}

function goalRowsOf(state: AppData, p: Project, side: ProjectSide, m: ProjectMetrics): GoalRow[] {
  const record = sustainabilityOf(state, p.id)
  return GOAL_DEFS.map((def): GoalRow => {
    const { dflt, target } = goalTargets(state, p, def.id)
    const override = record.goals[def.id]
    const entered = record.actuals[def.id]
    const actual = def.measuredBy === 'tallyard' ? measured(m, def.id) : (entered?.value ?? null)
    const progress = goalProgress(def, target.value, actual)
    const reqTitle = dflt.requirementId ? (requirementById(dflt.requirementId, p.region, p.localAuthority)?.title ?? null) : null
    let statusText: string = GOAL_STATUS_TEXT[progress.status]
    if (progress.status === 'below' && def.direction === 'at_most') statusText = GOAL_STATUS_TEXT.over
    if (target.source === 'override' && target.value === null) statusText = 'Not targeted on this project'
    return {
      id: def.id,
      label: def.label,
      unitLabel: def.unitLabel,
      direction: def.direction,
      measuredBy: def.measuredBy,
      scale: def.scale,
      defaultText: dflt.value !== null && reqTitle ? `${goalValueText(def, dflt.value)} from ${reqTitle}` : 'No default',
      defaultBasis: dflt.basis,
      defaultStatus: dflt.status,
      target: target.value,
      targetText: target.source === 'none' ? 'No target set' : goalValueText(def, target.value),
      source: target.source,
      overrideNote: override?.note ? override.note : null,
      overriddenText: override ? `Set by ${nameOf(state, override.setByUserId)} on ${dateOf(override.setAt)}` : null,
      actual,
      actualText: actual === null ? 'No result yet' : goalValueText(def, actual),
      actualNote: def.measuredBy === 'tallyard' ? (actual === null ? 'Needs the bill of materials' : 'Secured, worked out by Tallyard') : entered ? `${dateOf(entered.asOf)}, ${entered.source}` : null,
      progress,
      share: progress.share,
      statusText,
      tone: progress.status === 'met' ? 'brand' : progress.status === 'below' ? 'warning' : 'neutral',
      indicative: def.measuredBy === 'tallyard' || (target.source === 'default' && target.status !== 'published'),
      canEdit: side === 'consultant',
      canEnterActual: side === 'consultant' && def.measuredBy === 'consultant',
    }
  })
}

/** Every goal for anyone on the project; null for anyone else. */
export function goalRows(state: AppData, viewer: Viewer, projectId: string): GoalRow[] | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (!side) return null
  return goalRowsOf(state, state.world.projects[projectId], side, projectMetrics(state, viewer, projectId)!)
}

export type GoalsView = { header: ProjectHeader; rows: GoalRow[]; requirements: { id: string; title: string }[]; caveat: string }

/** Goals and targets: the consultant's page. */
export function goalsView(state: AppData, viewer: Viewer, projectId: string): GoalsView | null {
  if (projectSide(state, viewer.userId, projectId) !== 'consultant') return null
  const p = state.world.projects[projectId]
  return { header: projectHeader(state, viewer, projectId)!, rows: goalRows(state, viewer, projectId)!, requirements: applicableRequirements(p).map((r) => ({ id: r.id, title: r.title })), caveat: TARGET_CAVEAT }
}

// ---------- Certification ----------

function effectiveCredit(state: AppData, p: Project, creditId: string): CreditTrack {
  const def = CREDITS.find((c) => c.id === creditId)!
  return sustainabilityOf(state, p.id).credits[creditId] ?? { creditId, targeted: defaultTargeted(def, schemeTargeted(state, p, def.scheme)), status: 'not_started', note: '', items: {}, updatedAt: null, updatedByUserId: null }
}

export type SchemeSummaryView = {
  scheme: SchemeId
  label: string
  version: string
  ratingTarget: string | null
  ratingPredicted: string | null
  targeted: number
  ready: number
  atRisk: number
  counts: Record<TrackStatus, number>
  tone: 'brand' | 'info' | 'warning' | 'neutral'
  /** Circular economy only: the project's content by value target (0 when not targeted) and the statement's status. */
  circular: { contentTarget: number; statement: StatementStatus | null } | null
}

function schemeSummaries(state: AppData, p: Project): SchemeSummaryView[] {
  const record = sustainabilityOf(state, p.id)
  return SCHEMES.map((s) => {
    const c = schemeCounts(creditsOf(s.id).map((d) => effectiveCredit(state, p, d.id)))
    const goal = s.ratingGoal
    const ratingTarget = goal ? goalValueText(goalDef(goal), goalTargets(state, p, goal).target.value) : null
    const predicted = goal ? (record.actuals[goal]?.value ?? null) : null
    const tone = c.atRisk > 0 ? 'warning' : c.targeted > 0 && c.ready === c.targeted ? 'brand' : c.targeted > 0 ? 'info' : 'neutral'
    const circular = s.id === 'circular' ? { contentTarget: effectiveTargets(state, p.id).contentByValue, statement: record.statement?.status ?? null } : null
    return { scheme: s.id, label: s.label, version: s.version, ratingTarget, ratingPredicted: predicted === null ? null : String(predicted), targeted: c.targeted, ready: c.ready, atRisk: c.atRisk, counts: c.counts, tone, circular }
  })
}

/** One summary per scheme, for any side of the project. */
export function certificationSummary(state: AppData, viewer: Viewer, projectId: string): SchemeSummaryView[] | null {
  if (!projectSide(state, viewer.userId, projectId)) return null
  return schemeSummaries(state, state.world.projects[projectId])
}

export type CreditRow = {
  id: string
  scheme: SchemeId
  code: string
  title: string
  summary: string
  provides: string
  targeted: boolean
  status: TrackStatus
  statusLabel: string
  note: string
  suggested: { status: TrackStatus; label: string; reason: string } | null
  metrics: { label: string; value: string }[]
  items: { publicId: string; description: string; status: string; included: boolean; byDefault: boolean }[]
  updatedText: string | null
}

export type CertificationView = {
  header: ProjectHeader
  scheme: SchemeId
  schemes: SchemeSummaryView[]
  credits: CreditRow[]
  matrix: { items: { publicId: string; description: string; status: string }[]; credits: { id: string; label: string }[]; included: Record<string, boolean> }
  caveat: string
  empty: boolean
}

function mapped(m: ProjectMetrics): MappedItem[] {
  return m.items.map((i) => ({ publicId: i.publicId, description: i.description, family: i.family, status: i.status, eraBand: i.eraBand, testStatus: i.testStatus }))
}

function creditMetrics(state: AppData, p: Project, m: ProjectMetrics): CreditMetrics {
  return { hasBill: m.hasBill, contentSecured: m.secured.percent, contentWithApproved: m.withApproved.percent, aim: m.aim, avoidedSecuredT: m.avoidedSecuredT, statement: sustainabilityOf(state, p.id).statement?.status ?? null }
}

function creditRowsOf(state: AppData, p: Project, m: ProjectMetrics, credits = CREDITS): CreditRow[] {
  const items = mapped(m)
  const metrics = creditMetrics(state, p, m)
  return credits.map((def) => {
    const t = effectiveCredit(state, p, def.id)
    const listed = creditItems(def, items, t.items)
    const included = listed.filter((x) => x.included).map((x) => x.item)
    const s = suggestedStatus(def, metrics, included)
    const shown: { label: string; value: string }[] = []
    for (const ev of def.evidence) {
      if (ev === 'content_by_value') shown.push({ label: 'Content by value, secured', value: m.hasBill ? f.percent(m.secured.percent) : 'No bill yet' }, { label: 'With approved materials', value: m.hasBill ? f.percent(m.withApproved.percent) : 'No bill yet' }, { label: 'Aim', value: f.percent(m.aim) })
      else if (ev === 'avoided_carbon') shown.push({ label: 'Avoided carbon, secured', value: f.carbon(m.avoidedSecuredT) })
      else if (ev === 'carbon_factors') shown.push({ label: 'Items with carbon factors', value: String(included.length) })
      else if (ev === 'reused_items') shown.push({ label: 'Reclaimed items mapped', value: String(included.length) })
      else if (ev === 'hazard_screening') shown.push({ label: 'Items to screen', value: String(included.length) })
      else if (ev === 'specification') shown.push({ label: 'Items in the specification schedule', value: String(included.length) })
      else if (ev === 'statement') shown.push({ label: 'Circular economy statement', value: metrics.statement ? STATEMENT_STATUS_LABELS[metrics.statement] : 'Not started' })
      else if (ev === 'waste_reporting') shown.push({ label: 'Waste reports', value: 'Not held in Tallyard' })
    }
    return {
      id: def.id,
      scheme: def.scheme,
      code: def.code,
      title: def.title,
      summary: def.summary,
      provides: def.provides,
      targeted: t.targeted,
      status: t.status,
      statusLabel: TRACK_STATUS_LABELS[t.status],
      note: t.note,
      suggested: s ? { status: s.status, label: TRACK_STATUS_LABELS[s.status], reason: s.reason } : null,
      metrics: shown,
      items: listed.map((x) => ({ publicId: x.item.publicId, description: x.item.description, status: x.item.status, included: x.included, byDefault: x.byDefault })),
      updatedText: t.updatedAt ? `Updated by ${nameOf(state, t.updatedByUserId)} on ${dateOf(t.updatedAt)}` : null,
    }
  })
}

/** Certification for the consultant, one scheme at a time, by credit and by material. */
export function certificationView(state: AppData, viewer: Viewer, projectId: string, scheme: SchemeId): CertificationView | null {
  if (projectSide(state, viewer.userId, projectId) !== 'consultant') return null
  const p = state.world.projects[projectId]
  const m = projectMetrics(state, viewer, projectId)!
  const id = SCHEMES.some((s) => s.id === scheme) ? scheme : 'breeam'
  const credits = creditRowsOf(state, p, m, creditsOf(id))
  const matrixCredits = credits.filter((c) => c.targeted && CREDITS.find((d) => d.id === c.id)!.itemRule !== 'none')
  const included: Record<string, boolean> = {}
  for (const c of matrixCredits) for (const it of c.items) included[`${c.id}:${it.publicId}`] = it.included
  return {
    header: projectHeader(state, viewer, projectId)!,
    scheme: id,
    schemes: schemeSummaries(state, p),
    credits,
    matrix: { items: m.items.map((i) => ({ publicId: i.publicId, description: i.description, status: i.status })), credits: matrixCredits.map((c) => ({ id: c.id, label: `${schemeDef(c.scheme).label} ${c.code}` })), included },
    caveat: CERT_CAVEAT,
    empty: m.items.length === 0,
  }
}

// ---------- Requirements ----------

export type RequirementTrackRow = {
  id: string
  title: string
  scopeLabel: string
  source: string
  summary: string
  /** Names what to check without summarising it yet. */
  placeholder: boolean
  status: TrackStatus
  statusLabel: string
  evidence: { id: string; text: string; outputLabel: string | null; outputHref: string | null; by: string; onText: string; canRemove: boolean }[]
  heldInTallyard: { label: string; value: string; href: string | null }[]
  updatedText: string | null
}

export type RequirementsView = { header: ProjectHeader; rows: RequirementTrackRow[]; summary: TrackerSummary; canEdit: boolean; caveat: string; empty: boolean; locationText: string; outputs: { value: OutputRef; label: string }[] }

/** Where an output leads for each side, or null when that side cannot open it. */
export function outputHref(side: ProjectSide, output: OutputRef, p: Project): string | null {
  const b = base(p)
  if (output === 'compliance_workbook') return side === 'consultant' ? `${b}/compliance` : null
  if (output === 'ce_statement') return side === 'consultant' ? `${b}/statement` : side === 'client' ? `${b}/sustainability#statement` : null
  if (output === 'specification') return side === 'consultant' ? null : `${b}/specification`
  if (output === 'sustainability') return `${b}/sustainability`
  return side === 'consultant' ? `${b}/certification` : `${b}/sustainability`
}

function statementLabel(side: ProjectSide, status: StatementStatus | null): string {
  if (status === null) return 'Not started'
  return side === 'client' ? STATEMENT_STATUS_FOR_CLIENT[status] : STATEMENT_STATUS_LABELS[status]
}

function requirementRowsOf(state: AppData, viewer: Viewer, p: Project, side: ProjectSide, goals: GoalRow[]): RequirementTrackRow[] {
  const record = sustainabilityOf(state, p.id)
  const canEdit = side === 'client' || side === 'consultant'
  const goalsHref = side === 'consultant' ? `${base(p)}/targets` : `${base(p)}/sustainability`
  return applicableRequirements(p).map((r) => {
    const t = record.requirements[r.id]
    const status: TrackStatus = t?.status ?? 'not_started'
    const held: RequirementTrackRow['heldInTallyard'] = []
    for (const g of goals) {
      const fromHere = GOAL_DEFAULTS.some((d) => d.goalId === g.id && d.requirementId === r.id) && goalTargets(state, p, g.id).dflt.requirementId === r.id
      if (fromHere) held.push({ label: g.label, value: `${g.actualText} of ${g.targetText}`, href: goalsHref })
    }
    if (r.id === 'lp-si7' || r.id === 'gla-ces') held.push({ label: 'Circular economy statement', value: statementLabel(side, record.statement?.status ?? null), href: outputHref(side, 'ce_statement', p) })
    return {
      id: r.id,
      title: r.title,
      scopeLabel: r.level === 'local' ? p.localAuthority : SCOPE_LABELS[r.level],
      source: r.source,
      summary: r.summary,
      placeholder: r.placeholder,
      status,
      statusLabel: TRACK_STATUS_LABELS[status],
      evidence: (t?.evidence ?? []).map((e) => ({
        id: e.id,
        text: e.text,
        outputLabel: e.output ? OUTPUT_LABELS[e.output] : null,
        outputHref: e.output ? outputHref(side, e.output, p) : null,
        by: e.addedBy,
        onText: dateOf(e.addedAt),
        canRemove: canEdit && e.addedByUserId === viewer.userId,
      })),
      heldInTallyard: held,
      updatedText: t?.updatedAt ? `Updated by ${nameOf(state, t.updatedByUserId)} on ${dateOf(t.updatedAt)}` : null,
    }
  })
}

const OUTPUTS_BY_SIDE: Record<ProjectSide, OutputRef[]> = {
  architect: [],
  client: ['ce_statement', 'specification', 'sustainability', 'certification'],
  consultant: ['compliance_workbook', 'ce_statement', 'sustainability', 'certification'],
}

/** The requirements tracked on a project: the architect reads; the client and the consultant edit. */
export function requirementsView(state: AppData, viewer: Viewer, projectId: string): RequirementsView | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (!side) return null
  const p = state.world.projects[projectId]
  const goals = goalRowsOf(state, p, side, projectMetrics(state, viewer, projectId)!)
  const rows = requirementRowsOf(state, viewer, p, side, goals)
  return {
    header: projectHeader(state, viewer, projectId)!,
    rows,
    summary: trackerSummary(rows.map((r) => r.status)),
    canEdit: side === 'client' || side === 'consultant',
    caveat: REQ_CAVEAT,
    empty: rows.length === 0,
    locationText: [p.localAuthority, p.region].filter((x) => x).join(', '),
    outputs: OUTPUTS_BY_SIDE[side].map((o) => ({ value: o, label: OUTPUT_LABELS[o] })),
  }
}

/** Requirement tracking for a project: counts and the at-risk titles. */
export function requirementsRollup(state: AppData, p: Project): TrackerSummary & { atRiskItems: { id: string; title: string }[] } {
  const record = sustainabilityOf(state, p.id)
  const reqs = applicableRequirements(p)
  const statuses = reqs.map((r) => record.requirements[r.id]?.status ?? 'not_started')
  return { ...trackerSummary(statuses), atRiskItems: reqs.filter((_, i) => statuses[i] === 'at_risk').map((r) => ({ id: r.id, title: r.title })) }
}

// ---------- The circular economy statement ----------

export function statementInputFor(state: AppData, p: Project, side: ProjectSide, m: ProjectMetrics): StatementInput {
  const goals = goalRowsOf(state, p, side, m)
  const orgName = (id: string) => (id ? (state.world.orgs[id]?.name ?? '') : '')
  const goal = (id: GoalId) => goals.find((g) => g.id === id)!
  const num = (v: GoalValue | null) => (typeof v === 'number' && v > 0 ? v : null)
  const credits = CREDITS.map((d) => ({ d, t: effectiveCredit(state, p, d.id) })).filter((x) => x.t.targeted)
  return {
    projectName: p.name,
    clientName: orgName(p.clientOrgId),
    architectName: orgName(p.architectOrgId),
    consultantName: orgName(p.consultantOrgId),
    typeLabel: projectTypeLabel(p),
    giaM2: p.giaM2,
    localAuthority: p.localAuthority,
    region: p.region,
    stageText: stageLabel(p.ribaStage),
    requirementTitles: applicableRequirements(p).map((r) => r.title),
    hasBill: m.hasBill,
    contentSecured: m.secured.percent,
    contentWithApproved: m.withApproved.percent,
    contentWithoutReuse: m.secured.withoutReuse,
    aim: m.aim,
    contentTarget: num(goal('content_by_value').target),
    avoidedSecuredT: m.avoidedSecuredT,
    avoidedApprovedT: m.avoidedApprovedT,
    carbonTargetT: num(goal('avoided_carbon').target),
    items: m.items.map((i) => ({ publicId: i.publicId, description: i.description, quantityLabel: i.quantityLabel, family: i.family, status: i.status })),
    targets: goals.filter((g) => g.target !== null).map((g) => ({ label: g.label, targetText: g.targetText, actualText: g.actualText, statusText: g.statusText })),
    credits: credits.map(({ d, t }) => ({ schemeLabel: schemeDef(d.scheme).label, code: d.code, title: d.title, statusLabel: TRACK_STATUS_LABELS[t.status] })),
  }
}


export type StatementView = {
  header: ProjectHeader
  title: string
  subtitle: string
  sections: { id: StatementSectionId; heading: string; text: string; generated: string; edited: boolean; stale: boolean }[]
  status: StatementStatus
  statusLabel: string
  sentText: string | null
  reviewedText: string | null
  reviewNote: string | null
  canEdit: boolean
  canSend: boolean
  canReview: boolean
  plainText: string
  docx: DocxInput
  fileName: string
  caveat: string
}

/** The statement: the consultant edits and sends it; the client reads it once sent and reviews it; null for the architect. */
export function statementView(state: AppData, viewer: Viewer, projectId: string): StatementView | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (side !== 'consultant' && side !== 'client') return null
  const p = state.world.projects[projectId]
  const m = projectMetrics(state, viewer, projectId)!
  const doc = sustainabilityOf(state, projectId).statement
  const status: StatementStatus = doc?.status ?? 'draft'
  const generated = statementSections(statementInputFor(state, p, side, m))
  // The client reads what was sent; a statement being drafted stays with the consultant.
  const visible = side === 'consultant' || status !== 'draft'
  const sections = visible
    ? generated.map((g) => {
        const edit = doc?.edits[g.id]
        return { id: g.id, heading: g.heading, text: edit ? edit.text : g.text, generated: g.text, edited: !!edit, stale: isStale(edit, g.text) }
      })
    : []
  const clientName = state.world.orgs[p.clientOrgId]?.name ?? ''
  const consultantName = p.consultantOrgId ? (state.world.orgs[p.consultantOrgId]?.name ?? '') : ''
  const today = todayOf(viewer)
  const title = `${p.name}: circular economy statement`
  const subtitle = consultantName ? `Prepared by ${consultantName} for ${clientName}, ${formatDate(today)}` : `Prepared for ${clientName}, ${formatDate(today)}`
  const plain = sections.map((s) => ({ heading: s.heading, text: s.text }))
  return {
    header: projectHeader(state, viewer, projectId)!,
    title,
    subtitle,
    sections,
    status,
    statusLabel: statementLabel(side, status),
    sentText: doc?.sentAt ? `Sent to ${clientName} on ${dateOf(doc.sentAt)}` : null,
    reviewedText: doc?.reviewedAt ? `Reviewed by ${nameOf(state, doc.reviewedByUserId)} on ${dateOf(doc.reviewedAt)}` : null,
    reviewNote: doc?.reviewNote ?? null,
    canEdit: side === 'consultant',
    canSend: side === 'consultant' && status !== 'ready_for_review' && clientLinked(p),
    canReview: side === 'client' && status === 'ready_for_review',
    plainText: visible ? statementPlainText(title, subtitle, plain, STATEMENT_CAVEAT) : '',
    docx: { title, subtitle, sections: plain, footer: STATEMENT_CAVEAT },
    fileName: `${slug(p.name)}-circular-economy-statement-${today}.docx`,
    caveat: STATEMENT_CAVEAT,
  }
}

// ---------- The Sustainability tab ----------

export type SustainabilityView = {
  header: ProjectHeader
  side: ProjectSide
  metrics: { avoidedSecuredT: number; avoidedLiveT: number; contentSecured: number | null; reclaimedSecuredT: number; carbon: GoalRow | null; content: GoalRow | null }
  carbon: ProjectCarbon
  goals: GoalRow[]
  schemes: SchemeSummaryView[]
  requirements: TrackerSummary & { atRiskItems: { id: string; title: string }[]; href: string }
  statement: { status: StatementStatus; label: string; sentText: string | null; canReview: boolean; href: string | null } | null
  links: { targets: string | null; certification: string | null; statement: string | null; requirements: string }
  /** "Targets are set by Halewick Sustainability", or that no consultant is appointed. */
  targetsNote: string
}

/** The shared Sustainability tab, for every side of the project. */
export function sustainabilityView(state: AppData, viewer: Viewer, projectId: string): SustainabilityView | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (!side) return null
  const p = state.world.projects[projectId]
  const m = projectMetrics(state, viewer, projectId)!
  const goals = goalRowsOf(state, p, side, m)
  const carbon = projectCarbon(state, viewer, projectId)!
  const doc = sustainabilityOf(state, projectId).statement
  const consultant = side === 'consultant'
  const consultantName = p.consultantOrgId ? (state.world.orgs[p.consultantOrgId]?.name ?? '') : ''
  return {
    header: projectHeader(state, viewer, projectId)!,
    side,
    metrics: {
      avoidedSecuredT: m.avoidedSecuredT,
      avoidedLiveT: carbon.total.avoidedT,
      contentSecured: m.hasBill ? m.secured.percent : null,
      reclaimedSecuredT: m.reclaimedSecuredT,
      carbon: goals.find((g) => g.id === 'avoided_carbon') ?? null,
      content: goals.find((g) => g.id === 'content_by_value') ?? null,
    },
    carbon,
    goals: goals.filter((g) => g.target !== null || g.actual !== null),
    schemes: schemeSummaries(state, p),
    requirements: { ...requirementsRollup(state, p), href: `${base(p)}/requirements` },
    statement:
      side === 'architect'
        ? null
        : {
            status: doc?.status ?? 'draft',
            label: statementLabel(side, doc?.status ?? null),
            sentText: doc?.sentAt ? `Sent on ${dateOf(doc.sentAt)}` : null,
            canReview: side === 'client' && doc?.status === 'ready_for_review',
            href: consultant ? `${base(p)}/statement` : doc && doc.status !== 'draft' ? `${base(p)}/sustainability#statement` : null,
          },
    links: { targets: consultant ? `${base(p)}/targets` : null, certification: consultant ? `${base(p)}/certification` : null, statement: consultant ? `${base(p)}/statement` : null, requirements: `${base(p)}/requirements` },
    targetsNote: consultantName ? `Targets are set by ${consultantName}` : 'No consultant appointed yet. Defaults from the requirements are shown.',
  }
}

// ---------- Tracking across projects ----------

export type TrackingScheme = { targetText: string; predictedText: string | null; targeted: number; ready: number; atRisk: number; tone: string }

export type TrackingRow = {
  projectId: string
  projectName: string
  href: string
  /** Where the requirements come from: "Newham, Inner London East". */
  locationText: string
  consultantName: string | null
  schemes: Record<'breeam' | 'leed' | 'well', TrackingScheme>
  circular: { content: GoalRow | null; statementLabel: string; statementTone: string }
  requirements: TrackerSummary
}

/** One row of the client's sustainability tracking table; the consultant gets the same. Null for others. */
export function sustainabilityTracking(state: AppData, viewer: Viewer, projectId: string): TrackingRow | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (side !== 'client' && side !== 'consultant') return null
  const p = state.world.projects[projectId]
  const m = projectMetrics(state, viewer, projectId)!
  const goals = goalRowsOf(state, p, side, m)
  const summaries = schemeSummaries(state, p)
  const scheme = (id: 'breeam' | 'leed' | 'well'): TrackingScheme => {
    const s = summaries.find((x) => x.scheme === id)!
    return { targetText: s.ratingTarget ?? 'Not targeted', predictedText: s.ratingPredicted, targeted: s.targeted, ready: s.ready, atRisk: s.atRisk, tone: s.tone }
  }
  const status = sustainabilityOf(state, projectId).statement?.status ?? null
  const { atRiskItems: _list, ...requirements } = requirementsRollup(state, p)
  return {
    projectId: p.id,
    projectName: p.name,
    href: `${base(p)}/sustainability`,
    locationText: [p.localAuthority, p.region].filter((x) => x).join(', '),
    consultantName: p.consultantOrgId ? (state.world.orgs[p.consultantOrgId]?.name ?? null) : null,
    schemes: { breeam: scheme('breeam'), leed: scheme('leed'), well: scheme('well') },
    circular: { content: goals.find((g) => g.id === 'content_by_value') ?? null, statementLabel: statementLabel(side, status), statementTone: status === 'reviewed' ? 'brand' : status === 'ready_for_review' ? 'info' : 'neutral' },
    requirements,
  }
}
