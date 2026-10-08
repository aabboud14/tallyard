// Projects: the list, the workspace header and tabs, overview with the programme timeline, carbon, team and activity.
import type { Project } from '../../domain/types'
import type { Typology, WishStatus } from '../../domain/v1types'
import { REGIONS } from '../../domain/reference/assumptions'
import { PROJECT_TYPE_LABELS, TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { RIBA_STAGES } from '../../domain/reference/policy'
import { addDays, daysBetween, formatQuarter, maxDate, quarterWindow } from '../../domain/dates'
import type { AppData, Viewer } from '../types'
import { projectSide, projectsOfUser, roleOfOrg, roleOfUser, usersOfOrg, type ProjectSide } from '../access'
import { existingClientOrgIds, PROJECT_TYPES } from '../actions/projects'
import { orgTypeLabel } from '../../sandbox/accounts'
import { activityFor, initials, projectRef, SHORTLIST_STATUS_LABELS, todayOf, type ActivityRow, type ProjectRef } from './common'
import { BOARD_COLUMNS, shortlistRows, totalsOf, type ShortlistRow, type TotalsByState } from './shortlist'
import { projectWishlist } from '../lots'
import { plural } from '../notifications'

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
  if (side === 'architect') return [tab('overview', 'Overview', ''), tab('shortlist', 'Shortlist', '/shortlist'), tab('specification', 'Specification', '/specification'), tab('carbon', 'Carbon', '/carbon'), tab('team', 'Team', '/team'), tab('activity', 'Activity', '/activity'), tab('matching', 'Matching', '/matching', null, true)]
  if (side === 'client') {
    const waiting = waitingApprovals(state, p)
    return [tab('overview', 'Overview', ''), tab('approvals', 'Approvals', '/approvals', waiting > 0 ? waiting : null), tab('reservations', 'Reservations', '/reservations'), tab('specification', 'Specification', '/specification'), tab('carbon', 'Carbon', '/carbon'), tab('team', 'Team', '/team'), tab('activity', 'Activity', '/activity')]
  }
  return [tab('overview', 'Overview', ''), tab('carbon', 'Carbon', '/carbon'), tab('compliance', 'Compliance', '/compliance'), tab('team', 'Team', '/team'), tab('activity', 'Activity', '/activity')]
}

export type TeamAvatar = { userId: string; name: string; initials: string; colour: string; orgName: string }

export type ProjectHeader = ProjectRef & { side: ProjectSide; tabs: ProjectTab[]; team: TeamAvatar[]; description: string; consultantName: string; architectName: string }

/** The workspace header and tabs for a project the viewer works on; null otherwise. */
export function projectHeader(state: AppData, viewer: Viewer, projectId: string): ProjectHeader | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (!side) return null
  const p = state.world.projects[projectId]
  const team = [p.architectOrgId, p.clientOrgId, p.consultantOrgId]
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
  }
}

export type ProjectListRow = ProjectRef & {
  side: ProjectSide
  counts: Record<WishStatus, number>
  total: number
  lastActivityAt: string | null
  lastActivity: string | null
  href: string
}

export type ProjectsListView = { rows: ProjectListRow[]; canCreate: boolean; empty: boolean }

export function projectsListView(state: AppData, viewer: Viewer): ProjectsListView {
  const orgId = state.users[viewer.userId]?.orgId
  const rows = projectsOfUser(state, viewer.userId).map((p) => {
    const side = projectSide(state, viewer.userId, p.id)!
    const items = projectWishlist(state.world, p.id)?.items ?? []
    const counts = Object.fromEntries(BOARD_COLUMNS.map((s) => [s, items.filter((i) => i.status === s).length])) as Record<WishStatus, number>
    const last = state.activity.find((e) => e.projectId === p.id && !!orgId && e.orgIds.includes(orgId)) ?? null
    return { ...projectRef(state, p), side, counts, total: items.length, lastActivityAt: last?.at ?? null, lastActivity: last ? `${last.actor} ${last.text}` : null, href: `/app/projects/${p.id}` }
  })
  rows.sort((a, b) => ((a.lastActivityAt ?? '') < (b.lastActivityAt ?? '') ? 1 : (a.lastActivityAt ?? '') > (b.lastActivityAt ?? '') ? -1 : a.name.localeCompare(b.name, 'en-GB')))
  return { rows, canCreate: roleOfUser(state, viewer.userId) === 'architect', empty: rows.length === 0 }
}

export type NewProjectOptions = {
  clients: { orgId: string; name: string }[]
  consultants: { orgId: string; name: string }[]
  types: { value: string; label: string }[]
  regions: string[]
  stages: { value: number; label: string }[]
  /** The earliest start date the form accepts. */
  minStartDate: string
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
  }
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
  timeline: ProgrammeTimeline
  nextSteps: NextStep[]
  activity: ActivityRow[]
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
    if (rows.length === 0) steps.push({ id: 'discover', text: 'Find materials for this project in Discover', href: `/app/discover?project=${projectId}` })
    const sendable = rows.filter((r) => r.canSelect).length
    if (sendable > 0) steps.push({ id: 'send', text: `Send ${plural(sendable, 'shortlisted material')} to ${clientName}`, href: `${base}/shortlist` })
    if (counts.declined > 0) steps.push({ id: 'declined', text: `Review ${plural(counts.declined, 'declined material')}`, href: `${base}/shortlist` })
    if (counts.approved > 0) steps.push({ id: 'spec', text: 'Export the specification for the approved materials', href: `${base}/specification` })
  } else if (header.side === 'client') {
    if (counts.sent > 0) steps.push({ id: 'approve', text: `Approve or decline ${plural(counts.sent, 'material')}`, href: `${base}/approvals` })
    const unreserved = rows.filter((r) => r.status === 'approved' && r.card && (!r.reservation || r.reservation.status === 'declined' || r.reservation.status === 'withdrawn')).length
    if (unreserved > 0) steps.push({ id: 'reserve', text: `Request a reservation for ${plural(unreserved, 'approved material')}`, href: `${base}/reservations` })
  } else {
    steps.push({ id: 'carbon', text: 'Review avoided carbon by status', href: `${base}/carbon` })
    steps.push({ id: 'compliance', text: 'Export the compliance workbook', href: `${base}/compliance` })
  }
  return {
    header,
    counts,
    totals,
    carbon: { securedT: totals.approved.avoidedT, shortlistedT: totals.all.avoidedT - totals.declined.avoidedT },
    timeline: programmeTimeline(todayOf(viewer), p.startDate, rows),
    nextSteps: steps,
    activity: activityFor(state, viewer, { projectId }, 8),
    empty: rows.length === 0,
  }
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

export type TeamSection = { orgId: string; orgName: string; orgTypeLabel: string; roleLabel: string; members: TeamMember[]; yours: boolean }

export type ProjectTeam = {
  header: ProjectHeader
  sections: TeamSection[]
  canSetConsultant: boolean
  consultantOptions: { orgId: string; name: string }[]
}

export function projectTeam(state: AppData, viewer: Viewer, projectId: string): ProjectTeam | null {
  const header = projectHeader(state, viewer, projectId)
  if (!header) return null
  const p = state.world.projects[projectId]
  const myOrg = state.users[viewer.userId].orgId
  const section = (orgId: string, roleLabel: string): TeamSection => ({
    orgId,
    orgName: state.world.orgs[orgId]?.name ?? '',
    orgTypeLabel: orgTypeLabel(state.world.orgs[orgId]?.type ?? ''),
    roleLabel,
    members: usersOfOrg(state, orgId).map((u) => ({ userId: u.id, name: u.name, title: u.title, email: u.email, initials: initials(u.name), colour: u.avatarColour, you: u.id === viewer.userId })),
    yours: orgId === myOrg,
  })
  const sections = [section(p.clientOrgId, 'Client'), section(p.architectOrgId, 'Architect')]
  if (p.consultantOrgId) sections.push(section(p.consultantOrgId, 'Sustainability consultant'))
  return {
    header,
    sections,
    canSetConsultant: header.side === 'architect',
    consultantOptions: Object.values(state.world.orgs)
      .filter((o) => roleOfOrg(state, o.id) === 'consultant')
      .map((o) => ({ orgId: o.id, name: o.name })),
  }
}

export function projectActivity(state: AppData, viewer: Viewer, projectId: string): { header: ProjectHeader; rows: ActivityRow[] } | null {
  const header = projectHeader(state, viewer, projectId)
  if (!header) return null
  return { header, rows: activityFor(state, viewer, { projectId }, 200) }
}
