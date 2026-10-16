// Projects: the list, the workspace header and tabs, overview with the programme, setup and the client's
// acceptance, carbon, team and activity, and the client's project requests.
import type { ClientLinkStatus, Project } from '../../domain/types'
import type { Typology, WishStatus } from '../../domain/v1types'
import { REGIONS } from '../../domain/reference/assumptions'
import { PROJECT_TYPE_LABELS, TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { RIBA_STAGES } from '../../domain/reference/policy'
import { isLondonRegion, localAuthoritiesFor } from '../../domain/reference/places'
import { projectTypeLabel } from '../../domain/reference/projectTypes'
import { clientLinked } from '../../domain/access'
import { CONSTRUCTION_DAYS } from '../../domain/engines/programme'
import { addDays, daysBetween, formatDate, formatQuarter, maxDate, quarterWindow } from '../../domain/dates'
import type { AppData, Viewer } from '../types'
import { marketplaceHref } from '../paths'
import { projectSide, projectsOfUser, roleOfOrg, roleOfUser, usersOfOrg, type ProjectSide } from '../access'
import { existingClientOrgIds, PROJECT_TYPES } from '../actions/projects'
import { orgTypeLabel } from '../../sandbox/accounts'
import { activityFor, initials, projectRef, SHORTLIST_STATUS_LABELS, stageLabel, todayOf, type ActivityRow, type ProjectRef } from './common'
import { BOARD_COLUMNS, shortlistRows, totalsOf, type ShortlistRow, type TotalsByState } from './shortlist'
import { plannedStageText, programmeView, type ProgrammeView } from './programme'
import { projectRequirementsView, type ProjectRequirementsView } from './requirements'
import { projectWishlist } from '../lots'
import { sustainabilityBadges, sustainabilityOf } from '../sustainabilityRecord'
import { plural } from '../notifications'
import { architectOptions, NEW_PROJECT } from './owner'

export type ProjectTab = { id: string; label: string; href: string; badge: number | null; soon: boolean }

function rowsOf(state: AppData, viewer: Viewer, p: Project): ShortlistRow[] {
  const list = projectWishlist(state.world, p.id)
  return list ? shortlistRows(state, viewer, list, p) : []
}

function waitingApprovals(state: AppData, p: Project): number {
  return projectWishlist(state.world, p.id)?.items.filter((i) => i.status === 'sent').length ?? 0
}

export function projectTabs(state: AppData, side: ProjectSide, p: Project): ProjectTab[] {
  const base = `/app/projects/${p.id}`
  const tab = (id: string, label: string, path: string, badge: number | null = null, soon = false): ProjectTab => ({ id, label, href: `${base}${path}`, badge, soon })
  const badges = sustainabilityBadges(state, p)
  const atRisk = badges.requirementsAtRisk > 0 ? badges.requirementsAtRisk : null
  if (side === 'architect')
    return [
      tab('overview', 'Overview', ''),
      tab('shortlist', 'Shortlist', '/shortlist'),
      tab('specification', 'Specification', '/specification'),
      tab('sustainability', 'Sustainability', '/sustainability'),
      tab('requirements', 'Requirements', '/requirements'),
      tab('team', 'Team', '/team'),
      tab('activity', 'Activity', '/activity'),
      tab('matching', 'Matching', '/matching', null, true),
    ]
  if (side === 'client') {
    const waiting = waitingApprovals(state, p)
    return [
      tab('overview', 'Overview', ''),
      tab('approvals', 'Approvals', '/approvals', waiting > 0 ? waiting : null),
      tab('reservations', 'Reservations', '/reservations'),
      tab('specification', 'Specification', '/specification'),
      tab('sustainability', 'Sustainability', '/sustainability', badges.statementForReview ? 1 : null),
      tab('requirements', 'Requirements', '/requirements', atRisk),
      tab('team', 'Team', '/team'),
      tab('activity', 'Activity', '/activity'),
    ]
  }
  return [
    tab('overview', 'Overview', ''),
    tab('sustainability', 'Sustainability', '/sustainability'),
    tab('targets', 'Goals and targets', '/targets'),
    tab('certification', 'Certification', '/certification'),
    tab('requirements', 'Requirements', '/requirements', atRisk),
    tab('statement', 'Circular economy', '/statement'),
    tab('compliance', 'Compliance', '/compliance'),
    tab('team', 'Team', '/team'),
    tab('activity', 'Activity', '/activity'),
  ]
}

export type TeamAvatar = { userId: string; name: string; initials: string; colour: string; orgName: string }

export type ProjectHeader = ProjectRef & {
  side: ProjectSide
  tabs: ProjectTab[]
  team: TeamAvatar[]
  description: string
  consultantName: string
  /** The practice's name, or '' while an owner's New project has none. */
  architectName: string
  /** The practice's name, or 'Not appointed yet'. */
  architectText: string
  /** An owner on their own New project with no architect yet: they may appoint one. */
  canAppointArchitect: boolean
  siteStartText: string
  completionText: string
  /** "Today: stage 2, Concept Design", or "Programme starts 1 Nov 2026". */
  plannedStageText: string
  linkStatus: ClientLinkStatus
  /** 'New project' for a donor building owner on their own New project, matching the 'Donor building' pill; else null. */
  kindLabel: string | null
}

export const NO_ARCHITECT_TEXT = 'Not appointed yet'

/** Only an owner whose organisation is the client of its own New project, while no practice is appointed. */
function canAppointArchitect(state: AppData, viewer: Viewer, p: Project): boolean {
  return !p.architectOrgId && roleOfUser(state, viewer.userId) === 'owner' && state.users[viewer.userId]?.orgId === p.clientOrgId
}

export type AppointArchitectView = { projectId: string; projectName: string; options: { orgId: string; name: string }[] }

/** The practices an owner may appoint to their New project; null when they may not appoint one. */
export function appointArchitectView(state: AppData, viewer: Viewer, projectId: string): AppointArchitectView | null {
  const p = state.world.projects[projectId]
  if (!p || projectSide(state, viewer.userId, projectId) !== 'client' || !canAppointArchitect(state, viewer, p)) return null
  return { projectId, projectName: p.name, options: architectOptions(state) }
}

/** The workspace header and tabs for a project the viewer works on; null otherwise. Client members appear only once the client has accepted. */
export function projectHeader(state: AppData, viewer: Viewer, projectId: string): ProjectHeader | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (!side) return null
  const p = state.world.projects[projectId]
  const team = [p.architectOrgId, clientLinked(p) ? p.clientOrgId : '', p.consultantOrgId]
    .filter((x) => x)
    .flatMap((orgId) => usersOfOrg(state, orgId).map((u) => ({ userId: u.id, name: u.name, initials: initials(u.name), colour: u.avatarColour, orgName: state.world.orgs[orgId]?.name ?? '' })))
  return {
    ...projectRef(state, p),
    side,
    tabs: projectTabs(state, side, p),
    team,
    description: p.description,
    consultantName: p.consultantOrgId ? (state.world.orgs[p.consultantOrgId]?.name ?? '') : '',
    architectName: state.world.orgs[p.architectOrgId]?.name ?? '',
    architectText: state.world.orgs[p.architectOrgId]?.name ?? NO_ARCHITECT_TEXT,
    canAppointArchitect: canAppointArchitect(state, viewer, p),
    siteStartText: formatDate(p.programme.siteStart),
    completionText: formatDate(p.programme.practicalCompletion),
    plannedStageText: plannedStageText(p, todayOf(viewer)),
    linkStatus: p.clientLink.status,
    kindLabel: side === 'client' && roleOfUser(state, viewer.userId) === 'owner' && state.users[viewer.userId]?.orgId === p.clientOrgId ? NEW_PROJECT : null,
  }
}

export type ProjectListRow = ProjectRef & {
  side: ProjectSide
  counts: Record<WishStatus, number>
  total: number
  lastActivityAt: string | null
  lastActivity: string | null
  href: string
  /** The setup checklist's progress, for the architect while it shows; null otherwise. */
  setup: { done: number; total: number; nextText: string | null } | null
  linkStatus: ClientLinkStatus
}

/** requestsHref: Project requests, for a client with any request, waiting or answered; null otherwise. */
export type ProjectsListView = { rows: ProjectListRow[]; canCreate: boolean; empty: boolean; requestsHref: string | null }

export function projectsListView(state: AppData, viewer: Viewer): ProjectsListView {
  const orgId = state.users[viewer.userId]?.orgId
  const rows = projectsOfUser(state, viewer.userId).map((p) => {
    const side = projectSide(state, viewer.userId, p.id)!
    const items = projectWishlist(state.world, p.id)?.items ?? []
    const counts = Object.fromEntries(BOARD_COLUMNS.map((s) => [s, items.filter((i) => i.status === s).length])) as Record<WishStatus, number>
    const last = state.activity.find((e) => e.projectId === p.id && !!orgId && e.orgIds.includes(orgId)) ?? null
    const setup = side === 'architect' ? projectSetup(state, viewer, p.id) : null
    return {
      ...projectRef(state, p),
      side,
      counts,
      total: items.length,
      lastActivityAt: last?.at ?? null,
      lastActivity: last ? `${last.actor} ${last.text}` : null,
      href: `/app/projects/${p.id}`,
      setup: setup && setup.visible ? { done: setup.done, total: setup.total, nextText: setup.nextText } : null,
      linkStatus: p.clientLink.status,
    }
  })
  rows.sort((a, b) => ((a.lastActivityAt ?? '') < (b.lastActivityAt ?? '') ? 1 : (a.lastActivityAt ?? '') > (b.lastActivityAt ?? '') ? -1 : a.name.localeCompare(b.name, 'en-GB')))
  const requests = clientLinkRequests(state, viewer)
  const requestsHref = requests && requests.pending.length + requests.answered.length > 0 ? '/app/projects/requests' : null
  return { rows, canCreate: roleOfUser(state, viewer.userId) === 'architect', empty: rows.length === 0, requestsHref }
}

export type NewProjectOptions = {
  clients: { orgId: string; name: string }[]
  consultants: { orgId: string; name: string }[]
  types: { value: string; label: string }[]
  regions: string[]
  stages: { value: number; label: string }[]
  /** The earliest start date the form accepts. */
  minStartDate: string
  today: string
  /** Practical completion defaults to this many days after site start. */
  typicalCompletionDays: number
}

/** Choices for the new project dialog. Clients are the practice's own; consultancies are those on the platform. */
export function newProjectOptions(state: AppData, viewer: Viewer): NewProjectOptions | null {
  if (roleOfUser(state, viewer.userId) !== 'architect') return null
  const orgId = state.users[viewer.userId].orgId
  return {
    clients: existingClientOrgIds(state, orgId).map((id) => ({ orgId: id, name: state.world.orgs[id]?.name ?? '' })),
    consultants: Object.values(state.world.orgs)
      .filter((o) => roleOfOrg(state, o.id) === 'consultant')
      .map((o) => ({ orgId: o.id, name: o.name })),
    types: PROJECT_TYPES.map((t) => ({ value: t, label: PROJECT_TYPE_LABELS[t] })),
    regions: [...REGIONS],
    stages: RIBA_STAGES.map((label, i) => ({ value: i, label: `${i}, ${label}` })),
    minStartDate: todayOf(viewer),
    today: todayOf(viewer),
    typicalCompletionDays: CONSTRUCTION_DAYS,
  }
}

export type LocalAuthorityChoices = { options: string[]; allowsOther: boolean; london: boolean }

/**
 * The local authority dropdown for a region: its listed authorities, and whether a typed name is accepted.
 * Reference data with no state, so the forms call it as the region changes. It is kept out of newProjectOptions
 * on purpose: a list of every authority would put a seller's private local authority into a buyer's view model.
 */
export function localAuthorityChoices(region: string): LocalAuthorityChoices {
  const london = isLondonRegion(region)
  return { options: [...localAuthoritiesFor(region)], allowsOther: !london, london }
}

// ---------- Overview ----------

export type TimelineRow = {
  itemId: string
  publicId: string
  title: string
  status: WishStatus
  statusLabel: string
  kind: 'now' | 'window'
  windowStart: string | null
  windowEnd: string | null
  /** Positions from 0 to 1 along the strip. */
  from: number
  to: number
  fit: string | null
  fitLabel: string | null
}

export type ProgrammeTimeline = {
  rangeStart: string
  rangeEnd: string
  today: number
  start: number
  startDate: string
  ticks: { date: string; label: string; at: number }[]
  rows: TimelineRow[]
}

/** The programme strip: today, each shortlisted item's availability window and the start date, as positions. */
export function programmeTimeline(today: string, startDate: string, rows: ShortlistRow[]): ProgrammeTimeline {
  const live = rows.filter((r) => r.card && r.status !== 'declined')
  const ends = live.map((r) => (r.card!.listing.availability.kind === 'window' ? (r.card!.listing.availability as { windowEnd: string }).windowEnd : today))
  const rangeStart = quarterWindow(today).start
  const lastDate = ends.reduce((m, d) => maxDate(m, d), startDate)
  const rangeEnd = quarterWindow(addDays(lastDate, 31)).end
  const span = Math.max(1, daysBetween(rangeStart, rangeEnd))
  const at = (d: string) => Math.min(1, Math.max(0, daysBetween(rangeStart, d) / span))
  const ticks: ProgrammeTimeline['ticks'] = []
  for (let d = rangeStart; daysBetween(d, rangeEnd) >= 0; d = addDays(quarterWindow(d).end, 1)) ticks.push({ date: d, label: formatQuarter(d), at: at(d) })
  return {
    rangeStart,
    rangeEnd,
    today: at(today),
    start: at(startDate),
    startDate,
    ticks,
    rows: live.map((r) => {
      const a = r.card!.listing.availability
      const windowStart = a.kind === 'window' ? a.windowStart : null
      const windowEnd = a.kind === 'window' ? a.windowEnd : null
      return {
        itemId: r.itemId,
        publicId: r.publicId,
        title: r.title,
        status: r.status,
        statusLabel: r.statusLabel,
        kind: a.kind,
        windowStart,
        windowEnd,
        from: windowStart ? at(windowStart) : at(today),
        to: windowEnd ? at(windowEnd) : at(today),
        fit: r.card!.fit?.fit ?? null,
        fitLabel: r.card!.fitLabel,
      }
    }),
  }
}

export type NextStep = { id: string; text: string; href: string }

export type ProjectOverview = {
  header: ProjectHeader
  counts: Record<WishStatus, number>
  totals: TotalsByState
  carbon: { securedT: number; shortlistedT: number }
  /** Kept for compatibility; the overview draws `programme`. */
  timeline: ProgrammeTimeline
  programme: ProgrammeView
  requirements: ProjectRequirementsView
  setup: ProjectSetup | null
  link: ClientLinkView | null
  nextSteps: NextStep[]
  activity: ActivityRow[]
  /** Every activity line on the project the viewer may read. */
  activityTotal: number
  empty: boolean
}

export function projectOverview(state: AppData, viewer: Viewer, projectId: string): ProjectOverview | null {
  const header = projectHeader(state, viewer, projectId)
  if (!header) return null
  const p = state.world.projects[projectId]
  const rows = rowsOf(state, viewer, p)
  const totals = totalsOf(rows)
  const counts = Object.fromEntries(BOARD_COLUMNS.map((s) => [s, rows.filter((r) => r.status === s).length])) as Record<WishStatus, number>
  const base = `/app/projects/${projectId}`
  const steps: NextStep[] = []
  const clientName = header.clientName
  if (header.side === 'architect') {
    if (rows.length === 0) steps.push({ id: 'discover', text: 'Find materials for this project in the Marketplace', href: marketplaceHref(projectId) })
    const sendable = rows.filter((r) => r.canSelect).length
    if (sendable > 0 && clientLinked(p)) steps.push({ id: 'send', text: `Send ${plural(sendable, 'shortlisted material')} to ${clientName}`, href: `${base}/shortlist` })
    if (counts.declined > 0) steps.push({ id: 'declined', text: `Review ${plural(counts.declined, 'declined material')}`, href: `${base}/shortlist` })
    if (counts.approved > 0) steps.push({ id: 'spec', text: 'Export the specification for the approved materials', href: `${base}/specification` })
  } else if (header.side === 'client') {
    if (header.canAppointArchitect) steps.push({ id: 'architect', text: 'Appoint an architect to start sourcing', href: `${base}/team` })
    if (counts.sent > 0) steps.push({ id: 'approve', text: `Approve or decline ${plural(counts.sent, 'material')}`, href: `${base}/approvals` })
    const unreserved = rows.filter((r) => r.status === 'approved' && r.card && (!r.reservation || r.reservation.status === 'declined' || r.reservation.status === 'withdrawn')).length
    if (unreserved > 0) steps.push({ id: 'reserve', text: `Request a reservation for ${plural(unreserved, 'approved material')}`, href: `${base}/reservations` })
  } else {
    steps.push({ id: 'targets', text: 'Review targets for this project', href: `${base}/targets` })
    if ((sustainabilityOf(state, projectId).statement?.status ?? 'draft') === 'draft') steps.push({ id: 'statement', text: 'Send the circular economy statement for review', href: `${base}/statement` })
    steps.push({ id: 'compliance', text: 'Export the compliance workbook', href: `${base}/compliance` })
  }
  return {
    header,
    counts,
    totals,
    carbon: { securedT: totals.approved.avoidedT, shortlistedT: totals.all.avoidedT - totals.declined.avoidedT },
    timeline: programmeTimeline(todayOf(viewer), p.startDate, rows),
    programme: programmeView(state, viewer, projectId, 'whole')!,
    requirements: projectRequirementsView(state, viewer, projectId)!,
    setup: projectSetup(state, viewer, projectId),
    link: clientLinkView(state, viewer, projectId),
    nextSteps: steps,
    activity: activityFor(state, viewer, { projectId }, 8),
    activityTotal: activityFor(state, viewer, { projectId }, Number.MAX_SAFE_INTEGER).length,
    empty: rows.length === 0,
  }
}

// ---------- Client link and setup ----------

export type ClientLinkView = {
  status: ClientLinkStatus
  clientName: string
  /** Whether anyone from the client organisation uses the product, so someone can accept. Never who. */
  clientHasMembers: boolean
  requestedText: string
  decidedText: string | null
  /** The client's note on a decline. */
  note: string | null
  canChange: boolean
}

/** The architect's view of a client that has not accepted: the organisation's name only, never its people. Null once accepted. */
export function clientLinkView(state: AppData, viewer: Viewer, projectId: string): ClientLinkView | null {
  if (projectSide(state, viewer.userId, projectId) !== 'architect') return null
  const p = state.world.projects[projectId]
  const link = p.clientLink
  if (link.status === 'accepted') return null
  return {
    status: link.status,
    clientName: state.world.orgs[p.clientOrgId]?.name ?? '',
    clientHasMembers: usersOfOrg(state, p.clientOrgId).length > 0,
    requestedText: `Asked on ${formatDate(link.requestedOn)}`,
    decidedText: link.status === 'declined' && link.decidedOn ? `Declined on ${formatDate(link.decidedOn)}` : null,
    note: link.status === 'declined' && link.decisionNote ? link.decisionNote : null,
    canChange: true,
  }
}

export type ChangeClientOptions = {
  /** The client asked now, by organisation name only. */
  current: { orgId: string; name: string; status: ClientLinkStatus }
  /** Who the architect may ask: the declined client again, and the practice's other clients. A new name is always possible. */
  options: { value: string; label: string }[]
  /** The choice the dialog opens on for "Ask again" ('ask_again') and for "Change client" or "Choose another client" ('another'). */
  defaults: { ask_again: string | null; another: string | null }
}

/** Choices for the change client dialog, for the project's architect while the client has not accepted. */
export function changeClientOptions(state: AppData, viewer: Viewer, projectId: string): ChangeClientOptions | null {
  if (projectSide(state, viewer.userId, projectId) !== 'architect') return null
  const p = state.world.projects[projectId]
  if (p.clientLink.status === 'accepted') return null
  const orgName = (id: string) => state.world.orgs[id]?.name ?? ''
  const others = existingClientOrgIds(state, p.architectOrgId).filter((id) => id !== p.clientOrgId)
  const declined = p.clientLink.status === 'declined'
  const options = [...(declined ? [p.clientOrgId] : []), ...others].map((id) => ({ value: id, label: orgName(id) }))
  return {
    current: { orgId: p.clientOrgId, name: orgName(p.clientOrgId), status: p.clientLink.status },
    options,
    defaults: { ask_again: declined ? p.clientOrgId : null, another: others[0] ?? null },
  }
}

export type SetupStepState = 'done' | 'current' | 'todo' | 'waiting' | 'attention'
export type SetupIntent = 'edit_programme' | 'keep_programme' | 'requirements' | 'change_client' | null
export type SetupStep = {
  id: 'programme' | 'client' | 'requirements' | 'consultant' | 'shortlist' | 'send'
  title: string
  /** One or two words for the compact strip, for example 'Programme'. */
  short: string
  text: string
  state: SetupStepState
  optional: boolean
  action: { label: string; href: string | null; intent: SetupIntent } | null
  secondary: { label: string; intent: SetupIntent } | null
}
/**
 * focusId is the step the compact checklist leads with: the first that needs the architect (current or attention),
 * otherwise the first not yet done. Null once every step is done.
 */
export type ProjectSetup = { visible: boolean; done: number; total: number; steps: SetupStep[]; nextText: string | null; focusId: SetupStep['id'] | null }

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

/** The setup checklist on a new project, for its architect. It hides once the programme, the client and the shortlist are done. */
export function projectSetup(state: AppData, viewer: Viewer, projectId: string): ProjectSetup | null {
  if (projectSide(state, viewer.userId, projectId) !== 'architect') return null
  const p = state.world.projects[projectId]
  const base = `/app/projects/${projectId}`
  const items = projectWishlist(state.world, projectId)?.items ?? []
  const clientName = state.world.orgs[p.clientOrgId]?.name ?? 'The client'
  const linked = p.clientLink.status === 'accepted'
  type Draft = Omit<SetupStep, 'state'> & { done: boolean; waiting: boolean; attention: boolean }
  const drafts: Draft[] = []
  const programmeSet = p.programme.source === 'set'
  drafts.push({
    id: 'programme',
    title: 'Check the programme',
    short: 'Programme',
    text: programmeSet ? 'Stage dates, site start and practical completion are set.' : 'Suggested from your site start and typical stage lengths. Confirm the dates or edit them.',
    optional: false,
    action: programmeSet ? null : { label: 'Edit programme', href: null, intent: 'edit_programme' },
    secondary: programmeSet ? null : { label: 'Keep these dates', intent: 'keep_programme' },
    done: programmeSet,
    waiting: false,
    attention: false,
  })
  const declined = p.clientLink.status === 'declined'
  drafts.push({
    id: 'client',
    title: 'Client accepts the project',
    short: 'Client',
    text: linked ? `${clientName} accepted the project.` : declined ? `${clientName} declined this project.` : `Waiting for ${clientName} to accept.`,
    optional: false,
    action: declined ? { label: 'Ask again', href: null, intent: 'change_client' } : null,
    secondary: linked ? null : { label: 'Change client', intent: 'change_client' },
    done: linked,
    waiting: p.clientLink.status === 'pending',
    attention: declined,
  })
  drafts.push({
    id: 'requirements',
    title: 'Choose planning and sustainability requirements',
    short: 'Requirements',
    text: p.requirementsReviewed ? plural(p.planningRequirementIds.length, 'requirement') + ' chosen.' : 'Pick the policies and standards to track for this location.',
    optional: true,
    action: { label: p.requirementsReviewed ? 'Edit requirements' : 'Choose requirements', href: null, intent: 'requirements' },
    secondary: null,
    done: p.requirementsReviewed,
    waiting: false,
    attention: false,
  })
  const consultantName = p.consultantOrgId ? (state.world.orgs[p.consultantOrgId]?.name ?? '') : ''
  drafts.push({
    id: 'consultant',
    title: 'Add a sustainability consultant',
    short: 'Consultant',
    text: consultantName ? `${consultantName} is on the team.` : 'They can follow carbon and compliance on this project.',
    optional: true,
    action: { label: consultantName ? 'Open team' : 'Add consultant', href: `${base}/team`, intent: null },
    secondary: null,
    done: !!consultantName,
    waiting: false,
    attention: false,
  })
  drafts.push({
    id: 'shortlist',
    title: 'Shortlist materials',
    short: 'Shortlist',
    text: items.length > 0 ? `${plural(items.length, 'material')} on the shortlist.` : 'Find materials that arrive in time for this project.',
    optional: false,
    action: { label: 'Find materials', href: marketplaceHref(projectId), intent: null },
    secondary: null,
    done: items.length > 0,
    waiting: false,
    attention: false,
  })
  const sentAny = items.some((i) => i.status !== 'pending' || !!i.sentOn)
  drafts.push({
    id: 'send',
    title: 'Send materials for approval',
    short: 'Send',
    text: sentAny ? 'Materials have gone to the client.' : linked ? `Send shortlisted materials to ${clientName}.` : 'Opens once the client accepts the project.',
    optional: false,
    action: { label: 'Open shortlist', href: `${base}/shortlist`, intent: null },
    secondary: null,
    done: sentAny,
    waiting: !sentAny && !linked,
    attention: false,
  })
  let currentFound = false
  const steps: SetupStep[] = drafts.map(({ done, waiting, attention, ...rest }) => {
    let st: SetupStepState
    if (done) st = 'done'
    else if (waiting) st = 'waiting'
    else if (!currentFound) {
      st = attention ? 'attention' : 'current'
      currentFound = true
    } else st = attention ? 'attention' : 'todo'
    return { ...rest, state: st }
  })
  const first = drafts.findIndex((d) => !d.done && !d.waiting)
  const doneCount = drafts.filter((d) => d.done).length
  const doneById = (id: SetupStep['id']) => drafts.find((d) => d.id === id)!.done
  const focus = steps.find((x) => x.state === 'current' || x.state === 'attention') ?? steps.find((x) => x.state !== 'done') ?? null
  return {
    visible: !(doneById('programme') && doneById('client') && doneById('shortlist')),
    done: doneCount,
    total: drafts.length,
    steps,
    nextText: first >= 0 ? `Next: ${lowerFirst(drafts[first].title)}` : null,
    focusId: focus ? focus.id : null,
  }
}

export type LinkRequestRow = {
  projectId: string
  projectName: string
  architectName: string
  requestedBy: string
  requestedText: string
  message: string
  typeLabel: string
  locationText: string
  stageText: string
  siteStartText: string
  completionText: string
  status: ClientLinkStatus
  statusText: string
  href: string | null
}

/**
 * The client's project requests: pending ones to answer, and the ones answered here. Before accepting, a row
 * holds the project's name, practice, requester, type, place, stage and key dates, and the message; never the
 * shortlist, a listing or a figure. Seeded projects and a client's own projects are not requests.
 */
export function clientLinkRequests(state: AppData, viewer: Viewer): { pending: LinkRequestRow[]; answered: LinkRequestRow[] } | null {
  if (roleOfUser(state, viewer.userId) !== 'client') return null
  const orgId = state.users[viewer.userId].orgId
  const rows: (LinkRequestRow & { sortKey: string })[] = []
  for (const p of Object.values(state.world.projects)) {
    if (p.clientOrgId !== orgId || p.createdBy === null) continue
    const link = p.clientLink
    const requester = link.requestedByPersonaId ? (state.world.personas[link.requestedByPersonaId] ?? null) : null
    if (requester && requester.orgId === orgId) continue
    const statusText = link.status === 'pending' ? 'Waiting for your answer' : `${link.status === 'accepted' ? 'Accepted' : 'Declined'} ${link.decidedOn ? formatDate(link.decidedOn) : ''}`.trim()
    rows.push({
      projectId: p.id,
      projectName: p.name,
      architectName: state.world.orgs[p.architectOrgId]?.name ?? '',
      requestedBy: requester?.name ?? '',
      requestedText: formatDate(link.requestedOn),
      message: link.message,
      typeLabel: projectTypeLabel(p),
      locationText: [p.localAuthority, p.region].filter((x) => x).join(', '),
      stageText: stageLabel(p.ribaStage),
      siteStartText: formatDate(p.programme.siteStart),
      completionText: formatDate(p.programme.practicalCompletion),
      status: link.status,
      statusText,
      href: link.status === 'accepted' ? `/app/projects/${p.id}` : null,
      sortKey: link.status === 'pending' ? link.requestedOn : (link.decidedOn ?? link.requestedOn),
    })
  }
  const newestFirst = (a: { sortKey: string; projectName: string }, b: { sortKey: string; projectName: string }) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : a.projectName.localeCompare(b.projectName, 'en-GB'))
  const strip = ({ sortKey: _sortKey, ...r }: LinkRequestRow & { sortKey: string }): LinkRequestRow => r
  return {
    pending: rows.filter((r) => r.status === 'pending').sort(newestFirst).map(strip),
    answered: rows.filter((r) => r.status !== 'pending').sort(newestFirst).map(strip),
  }
}

/** Requests waiting for the client organisation's answer, for the sidebar badge. */
export function pendingLinkRequestCount(state: AppData, orgId: string): number {
  return Object.values(state.world.projects).filter((p) => p.clientOrgId === orgId && p.createdBy !== null && p.clientLink.status === 'pending' && state.world.personas[p.clientLink.requestedByPersonaId ?? '']?.orgId !== orgId).length
}

// ---------- Carbon ----------

export type CarbonLine = { key: string; label: string; count: number; massT: number; avoidedT: number }

export type ProjectCarbon = {
  header: ProjectHeader
  byStatus: CarbonLine[]
  byTypology: CarbonLine[]
  reserved: CarbonLine
  total: CarbonLine
  empty: boolean
}

/** Avoided carbon and mass by status and by typology, from public listings. Indicative. */
export function projectCarbon(state: AppData, viewer: Viewer, projectId: string): ProjectCarbon | null {
  const header = projectHeader(state, viewer, projectId)
  if (!header) return null
  const p = state.world.projects[projectId]
  const rows = rowsOf(state, viewer, p).filter((r) => r.card)
  const sum = (key: string, label: string, xs: ShortlistRow[]): CarbonLine => ({ key, label, count: xs.length, massT: xs.reduce((s, r) => s + r.card!.massT, 0), avoidedT: xs.reduce((s, r) => s + (r.card!.avoidedT ?? 0), 0) })
  const live = rows.filter((r) => r.status !== 'declined')
  const typologies: Typology[] = ['structure', 'envelope', 'finishes']
  return {
    header,
    byStatus: BOARD_COLUMNS.map((s) => sum(s, SHORTLIST_STATUS_LABELS[s], rows.filter((r) => r.status === s))),
    byTypology: typologies.map((t) => sum(t, TYPOLOGY_LABELS[t], live.filter((r) => r.card!.typology === t))),
    reserved: sum('reserved', 'Reserved', rows.filter((r) => r.reservation?.status === 'accepted')),
    total: sum('all', 'Shortlisted, sent and approved', live),
    empty: rows.length === 0,
  }
}

// ---------- Team ----------

export type TeamMember = { userId: string; name: string; title: string; email: string; initials: string; colour: string; you: boolean }

/** `pending` is true for a client that has not accepted: then members is empty. */
export type TeamSection = { orgId: string; orgName: string; orgTypeLabel: string; roleLabel: string; members: TeamMember[]; yours: boolean; pending: boolean }

export type ProjectTeam = {
  header: ProjectHeader
  sections: TeamSection[]
  canSetConsultant: boolean
  consultantOptions: { orgId: string; name: string }[]
  /** Set while an owner's New project has no architect, so the owner can appoint one. */
  appointArchitect: AppointArchitectView | null
}

export function projectTeam(state: AppData, viewer: Viewer, projectId: string): ProjectTeam | null {
  const header = projectHeader(state, viewer, projectId)
  if (!header) return null
  const p = state.world.projects[projectId]
  const myOrg = state.users[viewer.userId].orgId
  const section = (orgId: string, roleLabel: string, pending = false): TeamSection => ({
    orgId,
    orgName: state.world.orgs[orgId]?.name ?? '',
    orgTypeLabel: orgTypeLabel(state.world.orgs[orgId]?.type ?? ''),
    roleLabel,
    members: pending ? [] : usersOfOrg(state, orgId).map((u) => ({ userId: u.id, name: u.name, title: u.title, email: u.email, initials: initials(u.name), colour: u.avatarColour, you: u.id === viewer.userId })),
    yours: orgId === myOrg,
    pending,
  })
  const sections = [section(p.clientOrgId, 'Client', !clientLinked(p))]
  if (p.architectOrgId) sections.push(section(p.architectOrgId, 'Architect'))
  if (p.consultantOrgId) sections.push(section(p.consultantOrgId, 'Sustainability consultant'))
  return {
    header,
    sections,
    canSetConsultant: header.side === 'architect',
    consultantOptions: Object.values(state.world.orgs)
      .filter((o) => roleOfOrg(state, o.id) === 'consultant')
      .map((o) => ({ orgId: o.id, name: o.name })),
    appointArchitect: appointArchitectView(state, viewer, projectId),
  }
}

export function projectActivity(state: AppData, viewer: Viewer, projectId: string): { header: ProjectHeader; rows: ActivityRow[] } | null {
  const header = projectHeader(state, viewer, projectId)
  if (!header) return null
  return { header, rows: activityFor(state, viewer, { projectId }, 200) }
}
