// The consultancy's project requests (round 2 follow-up, audit note C2): an architect who names a sustainability
// consultancy asks it to join once the client has accepted. Before accepting, a row holds what the client request
// holds (the project's name, practice, requester, type, place, stage and key dates) plus the client's name, which
// the client has agreed to share by accepting; never a shortlist, a listing or a figure.
import { clientLinked } from '../../domain/access'
import { projectTypeLabel } from '../../domain/reference/projectTypes'
import { formatDate } from '../../domain/dates'
import type { AppData, Viewer } from '../types'
import { roleOfUser } from '../access'
import { stageLabel } from './common'
import type { LinkRequestRow } from './project'

/** A consultancy's request: the client request's row, with the client it would work for. */
export type ConsultantRequestRow = LinkRequestRow & { clientName: string }

/** Whether the consultancy has a request to see: the project names it, carries a request, and its client has accepted. */
function asked(p: AppData['world']['projects'][string], orgId: string): boolean {
  return p.consultantOrgId === orgId && !!p.consultantLink && clientLinked(p)
}

/** The consultancy's requests, waiting and answered; null for anyone who is not a sustainability consultant. */
export function consultantLinkRequests(state: AppData, viewer: Viewer): { pending: ConsultantRequestRow[]; answered: ConsultantRequestRow[] } | null {
  if (roleOfUser(state, viewer.userId) !== 'consultant') return null
  const orgId = state.users[viewer.userId].orgId
  const rows: (ConsultantRequestRow & { sortKey: string })[] = []
  for (const p of Object.values(state.world.projects)) {
    if (!asked(p, orgId)) continue
    const link = p.consultantLink!
    const requester = link.requestedByPersonaId ? (state.world.personas[link.requestedByPersonaId] ?? null) : null
    const statusText = link.status === 'pending' ? 'Waiting for your answer' : `${link.status === 'accepted' ? 'Accepted' : 'Declined'} ${link.decidedOn ? formatDate(link.decidedOn) : ''}`.trim()
    rows.push({
      projectId: p.id,
      projectName: p.name,
      architectName: state.world.orgs[p.architectOrgId]?.name ?? '',
      clientName: state.world.orgs[p.clientOrgId]?.name ?? '',
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
  const strip = ({ sortKey: _sortKey, ...r }: ConsultantRequestRow & { sortKey: string }): ConsultantRequestRow => r
  return {
    pending: rows.filter((r) => r.status === 'pending').sort(newestFirst).map(strip),
    answered: rows.filter((r) => r.status !== 'pending').sort(newestFirst).map(strip),
  }
}

/** Requests waiting for the consultancy's answer, for the sidebar badge. */
export function pendingConsultantRequestCount(state: AppData, orgId: string): number {
  return Object.values(state.world.projects).filter((p) => asked(p, orgId) && p.consultantLink!.status === 'pending').length
}

/**
 * For a project address the person cannot open yet because their organisation has not answered the request to join
 * it (as client, or as consultancy once the client has accepted): the project's name and where to answer. Null
 * otherwise, so the calm "no access" page says nothing about any other project.
 */
export function waitingRequestForPath(state: AppData, viewer: Viewer, pathname: string): { projectName: string; href: string } | null {
  const [app, section, id] = pathname.split('#')[0].split('/').filter(Boolean)
  if (app !== 'app' || section !== 'projects' || !id) return null
  const p = state.world.projects[id]
  const orgId = state.users[viewer.userId]?.orgId
  const role = roleOfUser(state, viewer.userId)
  if (!p || !orgId) return null
  const clientWaits = role === 'client' && p.clientOrgId === orgId && p.createdBy !== null && p.clientLink.status === 'pending' && state.world.personas[p.clientLink.requestedByPersonaId ?? '']?.orgId !== orgId
  const consultantWaits = role === 'consultant' && asked(p, orgId) && p.consultantLink!.status === 'pending'
  return clientWaits || consultantWaits ? { projectName: p.name, href: '/app/projects/requests' } : null
}
