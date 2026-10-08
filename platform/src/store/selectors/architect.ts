// The architect's home: projects, what is new for them, what waits on the client, recent activity.
import type { WishStatus } from '../../domain/v1types'
import { addDays, daysBetween, monthKey } from '../../domain/dates'
import { timelineFit } from '../../domain/engines/timeline'
import type { AppData, Viewer } from '../types'
import { isProjectArchitect, projectsOfUser, roleOfUser } from '../access'
import { marketplaceListings, projectWishlist } from '../lots'
import { activityFor, firstName, greeting, listingCard, longDate, projectRef, todayOf, type ActivityRow, type ListingCard, type ProjectRef } from './common'
import { BOARD_COLUMNS, shortlistRows, totalsOf } from './shortlist'

export type ProjectCardView = ProjectRef & { counts: Record<WishStatus, number>; total: number; href: string }

export type NewForProjects = ListingCard & { fitsProjects: { id: string; name: string }[] }

export type WaitingItem = { projectId: string; projectName: string; clientName: string; itemId: string; publicId: string; title: string; sentOn: string | null; daysWaiting: number | null; href: string }

export type ArchitectHome = {
  greeting: string
  dateText: string
  stats: { activeProjects: number; shortlisted: number; avoidedApprovedT: number }
  projects: ProjectCardView[]
  newForProjects: NewForProjects[]
  waitingOnClient: WaitingItem[]
  activity: ActivityRow[]
}

/** Days a listing counts as new on the home page. */
export const NEW_LISTING_DAYS = 30

/** How many new listings the home page shows. */
export const NEW_LISTING_LIMIT = 6

export function architectHome(state: AppData, viewer: Viewer): ArchitectHome | null {
  if (roleOfUser(state, viewer.userId) !== 'architect') return null
  const today = todayOf(viewer)
  const user = state.users[viewer.userId]
  const projects = projectsOfUser(state, viewer.userId).filter((p) => isProjectArchitect(state, viewer.userId, p.id))
  let shortlisted = 0
  let avoidedApprovedT = 0
  const waiting: WaitingItem[] = []
  const cards = projects.map((p) => {
    const list = projectWishlist(state.world, p.id)
    const rows = list ? shortlistRows(state, viewer, list, p) : []
    const totals = totalsOf(rows)
    shortlisted += rows.filter((r) => r.status !== 'declined').length
    avoidedApprovedT += totals.approved.avoidedT
    for (const r of rows) {
      if (r.status !== 'sent') continue
      waiting.push({ projectId: p.id, projectName: p.name, clientName: state.world.orgs[p.clientOrgId]?.name ?? '', itemId: r.itemId, publicId: r.publicId, title: r.title, sentOn: r.sentOn, daysWaiting: r.sentOn ? daysBetween(r.sentOn, today) : null, href: `/app/projects/${p.id}/shortlist` })
    }
    const counts = Object.fromEntries(BOARD_COLUMNS.map((s) => [s, rows.filter((r) => r.status === s).length])) as Record<WishStatus, number>
    return { ...projectRef(state, p), counts, total: rows.length, href: `/app/projects/${p.id}` }
  })
  const since = monthKey(addDays(today, -NEW_LISTING_DAYS))
  const newFor: NewForProjects[] = []
  for (const l of marketplaceListings(state)) {
    if (l.listedMonth < since) continue
    // Already on one of the practice's lists: not news.
    if (Object.values(state.world.wishlists).some((w) => w.orgId === user.orgId && w.items.some((x) => x.publicId === l.publicId))) continue
    const fits = projects.filter((p) => timelineFit(l.availability, p.startDate, today).fit !== 'late')
    if (fits.length === 0) continue
    newFor.push({ ...listingCard(state, l, fits[0], today, user.orgId), fitsProjects: fits.map((p) => ({ id: p.id, name: p.name })) })
  }
  newFor.sort((a, b) => (a.listing.listedMonth < b.listing.listedMonth ? 1 : a.listing.listedMonth > b.listing.listedMonth ? -1 : a.publicId < b.publicId ? -1 : 1))
  waiting.sort((a, b) => (a.sentOn ?? '').localeCompare(b.sentOn ?? ''))
  return {
    greeting: greeting(viewer.now, firstName(user.name)),
    dateText: longDate(today),
    stats: { activeProjects: projects.length, shortlisted, avoidedApprovedT },
    projects: cards,
    newForProjects: newFor.slice(0, NEW_LISTING_LIMIT),
    waitingOnClient: waiting,
    activity: activityFor(state, viewer, {}, 8),
  }
}
