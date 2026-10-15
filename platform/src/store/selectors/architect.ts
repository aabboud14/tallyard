// The architect's home as a dashboard: four figures, the projects with a drawing, their fit and shortlist progress
// and how many new materials fit each, what is waiting for approval, carbon by project and recent activity.
// Everything about a seller's material comes from the shortlist rows' public cards (P3).
import type { Fit, WishStatus } from '../../domain/v1types'
import { daysBetween, formatDate } from '../../domain/dates'
import { projectSketch, type BuildingSketch } from '../../domain/sketch'
import { programmeCheck, stageOn, type ProgrammeStatus } from '../../domain/engines/programme'
import { niceMax } from '../../domain/engines/chartScale'
import * as f from '../../domain/format'
import type { AppData, Viewer } from '../types'
import { isProjectArchitect, projectsOfUser, roleOfUser } from '../access'
import { projectWishlist } from '../lots'
import { marketplaceHref } from '../paths'
import { activityFor, firstName, greeting, longDate, projectRef, todayOf, type ActivityRow, type ListingCard, type ProjectRef } from './common'
import { BOARD_COLUMNS, shortlistRows, totalsOf } from './shortlist'
import { effectiveTargets } from './sustainability'
import { activitySummary, earliestStart, fitCounts, fitState, fitTone, programmeState, targetState, thumbsOf, waitingState, waitingTone, type ActivitySummary, type MetricTone, type ThumbMaterial, type TileState } from './dashboard'
import { newForProjectsFeed, NEW_LISTING_LIMIT, type NewForProjects } from './marketplace'

export { NEW_LISTING_DAYS, NEW_LISTING_LIMIT, type NewForProjects } from './marketplace'

export type ProjectCardView = ProjectRef & {
  /** The RIBA stage the programme dates place today in (round 2); null before stage 0 starts. The strip shows it before the declared stage. */
  plannedStage: number | null
  counts: Record<WishStatus, number>
  total: number
  href: string
  /** Fit of the live (not declined) shortlist against the project's start. */
  fits: Record<Fit, number>
  fitTone: MetricTone
  sketch: BuildingSketch
  /** Up to 3, for the thumbnail's swatches. */
  materials: ThumbMaterial[]
  approvedT: number
  /** Avoided carbon on the live shortlist: everything but declined. */
  liveT: number
  /** New listings in time for this project. */
  newFits: number
  marketplaceHref: string
}

export type WaitingItem = {
  projectId: string
  projectName: string
  clientName: string
  itemId: string
  publicId: string
  title: string
  sentOn: string | null
  daysWaiting: number | null
  href: string
  /** The public card, for its picture; null when the project can no longer see the lot. */
  card: ListingCard | null
}

export type ArchitectHome = {
  greeting: string
  dateText: string
  stats: { activeProjects: number; shortlisted: number; avoidedApprovedT: number }
  metrics: {
    nextStart: { projectName: string; dateText: string } | null
    byStatus: Record<WishStatus, number>
    waiting: { count: number; oldestDays: number | null; tone: MetricTone; state: TileState | null }
    carbon: { approvedT: number; liveT: number; share: number; percentText: string; targetT: number; state: TileState | null }
    /** Each project's declared stage against its programme dates. */
    programme: { behind: number; state: TileState | null }
    /** The live shortlists' fit against each project's start, summed. */
    timing: { fits: Record<Fit, number>; state: TileState | null }
  }
  projects: ProjectCardView[]
  carbonByProject: { id: string; name: string; href: string; approvedT: number; liveT: number }[]
  carbonScaleMax: number
  /** A round scale end for the carbon chart, at least carbonScaleMax. */
  carbonAxisMax: number
  /** Oldest first. */
  waitingForApproval: WaitingItem[]
  /** The first of the Marketplace's New for your projects feed, for any screen that still lists it. */
  newForProjects: NewForProjects[]
  activity: ActivityRow[]
  activitySummary: ActivitySummary
}

export function architectHome(state: AppData, viewer: Viewer): ArchitectHome | null {
  if (roleOfUser(state, viewer.userId) !== 'architect') return null
  const today = todayOf(viewer)
  const user = state.users[viewer.userId]
  const projects = projectsOfUser(state, viewer.userId).filter((p) => isProjectArchitect(state, viewer.userId, p.id))
  const feed = newForProjectsFeed(state, viewer, null, Number.POSITIVE_INFINITY)
  let shortlisted = 0
  let avoidedApprovedT = 0
  let liveTotalT = 0
  let carbonTargetT = 0
  let approvedOnTargetedT = 0
  const programmeStatuses: ProgrammeStatus[] = []
  const allFits: Fit[] = []
  const byStatus = Object.fromEntries(BOARD_COLUMNS.map((s) => [s, 0])) as Record<WishStatus, number>
  const waiting: WaitingItem[] = []
  const cards: ProjectCardView[] = projects.map((p) => {
    const list = projectWishlist(state.world, p.id)
    const rows = list ? shortlistRows(state, viewer, list, p) : []
    const totals = totalsOf(rows)
    const live = rows.filter((r) => r.status !== 'declined')
    shortlisted += live.length
    avoidedApprovedT += totals.approved.avoidedT
    const liveT = totals.all.avoidedT - totals.declined.avoidedT
    liveTotalT += liveT
    for (const r of rows) {
      if (r.status !== 'sent') continue
      waiting.push({
        projectId: p.id,
        projectName: p.name,
        clientName: state.world.orgs[p.clientOrgId]?.name ?? '',
        itemId: r.itemId,
        publicId: r.publicId,
        title: r.title,
        sentOn: r.sentOn,
        daysWaiting: r.sentOn ? daysBetween(r.sentOn, today) : null,
        href: `/app/projects/${p.id}/shortlist`,
        card: r.card,
      })
    }
    const counts = Object.fromEntries(BOARD_COLUMNS.map((s) => [s, rows.filter((r) => r.status === s).length])) as Record<WishStatus, number>
    for (const s of BOARD_COLUMNS) byStatus[s] += counts[s]
    const fits = fitCounts(live.map((r) => r.card?.fit?.fit ?? null))
    for (const r of live) if (r.card?.fit) allFits.push(r.card.fit.fit)
    programmeStatuses.push(programmeCheck(p.programme, p.ribaStage, today).status)
    const target = effectiveTargets(state, p.id).avoidedCarbonT
    if (target > 0) {
      carbonTargetT += target
      approvedOnTargetedT += totals.approved.avoidedT
    }
    const families = live.flatMap((r) => (r.card ? [r.card.family] : []))
    return {
      ...projectRef(state, p),
      plannedStage: stageOn(p.programme, today),
      counts,
      total: rows.length,
      href: `/app/projects/${p.id}`,
      fits,
      fitTone: fitTone(fits),
      sketch: projectSketch(p, families),
      materials: thumbsOf(rows),
      approvedT: totals.approved.avoidedT,
      liveT,
      newFits: feed.filter((n) => n.fitsProjects.some((x) => x.id === p.id)).length,
      marketplaceHref: marketplaceHref(p.id),
    }
  })
  waiting.sort((a, b) => (a.sentOn ?? '').localeCompare(b.sentOn ?? ''))
  const oldestDays = waiting.reduce<number | null>((m, w) => (w.daysWaiting === null ? m : m === null ? w.daysWaiting : Math.max(m, w.daysWaiting)), null)
  const next = earliestStart(projects, today)
  const share = liveTotalT > 0 ? avoidedApprovedT / liveTotalT : 0
  const activity = activityFor(state, viewer, {}, 8)
  const timing = fitCounts(allFits)
  const programme = programmeState(programmeStatuses)
  const carbonScaleMax = cards.reduce((m, c) => Math.max(m, c.liveT), 0) || 1
  return {
    greeting: greeting(viewer.now, firstName(user.name)),
    dateText: longDate(today),
    stats: { activeProjects: projects.length, shortlisted, avoidedApprovedT },
    metrics: {
      nextStart: next ? { projectName: next.name, dateText: formatDate(next.startDate) } : null,
      byStatus,
      waiting: { count: waiting.length, oldestDays, tone: waitingTone(waiting.length, oldestDays), state: waitingState(waiting.length, oldestDays) },
      carbon: { approvedT: avoidedApprovedT, liveT: liveTotalT, share, percentText: f.percent(share), targetT: carbonTargetT, state: targetState(approvedOnTargetedT, carbonTargetT) },
      programme: { behind: programmeStatuses.filter((x) => x === 'behind').length, state: programme },
      timing: { fits: timing, state: fitState(timing) },
    },
    projects: cards,
    carbonByProject: cards.map((c) => ({ id: c.id, name: c.name, href: c.href, approvedT: c.approvedT, liveT: c.liveT })),
    carbonScaleMax,
    carbonAxisMax: niceMax(carbonScaleMax),
    waitingForApproval: waiting,
    newForProjects: feed.slice(0, NEW_LISTING_LIMIT),
    activity,
    activitySummary: activitySummary(activity),
  }
}
