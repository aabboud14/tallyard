// The architect's home as a dashboard: four figures, the projects with a drawing, their fit and shortlist progress
// and how many new materials fit each, what is waiting for approval, carbon by project and recent activity.
// Everything about a seller's material comes from the shortlist rows' public cards (P3).
import type { Fit, WishStatus } from '../../domain/v1types'
import { daysBetween, formatDate } from '../../domain/dates'
import type { BuildingSketch } from '../../domain/sketch'
import { timelineFit } from '../../domain/engines/timeline'
import { programmeCheck, stageOn, type ProgrammeStatus } from '../../domain/engines/programme'
import { niceMax } from '../../domain/engines/chartScale'
import * as f from '../../domain/format'
import type { ClientLinkStatus } from '../../domain/types'
import type { AppData, Viewer } from '../types'
import { isProjectArchitect, projectsOfUser, roleOfUser } from '../access'
import { projectWishlist } from '../lots'
import { marketplaceHref, newForProjectHref } from '../paths'
import { activityFor, firstName, greeting, longDate, projectRef, todayOf, type ActivityRow, type ListingCard, type ProjectRef } from './common'
import { BOARD_COLUMNS, shortlistRows, totalsOf } from './shortlist'
import { effectiveTargets } from './sustainability'
import { visualFromRows } from './project-visuals'
import { projectSetup } from './project'
import { activitySummary, earliestStart, fitCounts, fitState, fitTone, programmeState, targetState, waitingState, waitingTone, type ActivitySummary, type MetricTone, type ThumbMaterial, type TileState } from './dashboard'
import { categoryFolders, newForProjectsFeed, NEW_LISTING_LIMIT, type CategoryFolder, type NewForProjects } from './marketplace'
import { marketplaceListings } from '../lots'
import { DISCOVER_PARAM } from './arch-discover'

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
  /** The same new listings by their fit against this project's start, so each card says what is new for it. */
  newFitsBy: Record<Fit, number>
  /** Of the new listings in time for this project, those of a family already on its live shortlist. */
  newLikeShortlist: number
  marketplaceHref: string
  /** The Marketplace checked against this project, opened at its New for {project} row. */
  newFitsHref: string
  /** The setup checklist's progress while it shows on the project, as on the projects list; null once set up. */
  setup: { done: number; total: number; nextText: string | null; href: string } | null
  linkStatus: ClientLinkStatus
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
  /** activeProjects: projects the client has accepted. A project still waiting for its client is not active yet. */
  stats: { activeProjects: number; shortlisted: number; avoidedApprovedT: number }
  metrics: {
    /** Projects whose setup checklist still shows (new projects); they lead the project cards. */
    settingUp: number
    /** Projects whose client has not accepted (waiting or declined). */
    notAccepted: number
    nextStart: { projectName: string; dateText: string } | null
    byStatus: Record<WishStatus, number>
    waiting: { count: number; oldestDays: number | null; tone: MetricTone; state: TileState | null }
    carbon: { approvedT: number; liveT: number; share: number; percentText: string; targetT: number; state: TileState | null }
    /** Each active project's declared stage against its confirmed programme dates; suggested dates are not judged. */
    programme: { behind: number; state: TileState | null }
    /** The live shortlists' fit against each project's start, summed. */
    timing: { fits: Record<Fit, number>; state: TileState | null }
  }
  projects: ProjectCardView[]
  /** Projects with something on a live shortlist; the others are named in carbonNotYet instead of a 0.0 of 0.0 bar. */
  carbonByProject: { id: string; name: string; href: string; approvedT: number; liveT: number }[]
  /** Projects with nothing on a live shortlist yet, by name. */
  carbonNotYet: { id: string; name: string }[]
  carbonScaleMax: number
  /** A round scale end for the carbon chart, at least carbonScaleMax. */
  carbonAxisMax: number
  /** Oldest first. */
  waitingForApproval: WaitingItem[]
  /** The first of the Marketplace's New for your projects feed, for any screen that still lists it. */
  newForProjects: NewForProjects[]
  activity: ActivityRow[]
  activitySummary: ActivitySummary
  /**
   * For a practice with no projects yet: what the Marketplace holds now, by category, so the first screen shows
   * real stock under the welcome. Null once there is a project.
   */
  firstRun: { total: number; folders: (Pick<CategoryFolder, 'typology' | 'label' | 'description' | 'count' | 'thumbs'> & { href: string; familiesText: string })[] } | null
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
  // Only projects the client accepted are active; only confirmed programmes are judged and give the next start.
  const active = projects.filter((p) => p.clientLink.status === 'accepted')
  const judged = active.filter((p) => p.programme.source === 'set')
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
    if (judged.includes(p)) programmeStatuses.push(programmeCheck(p.programme, p.ribaStage, today).status)
    const target = effectiveTargets(state, p.id).avoidedCarbonT
    if (target > 0) {
      carbonTargetT += target
      approvedOnTargetedT += totals.approved.avoidedT
    }
    const visual = visualFromRows(p, rows)
    const fresh = feed.filter((n) => n.fitsProjects.some((x) => x.id === p.id))
    const newFitsBy = fitCounts(fresh.map((n) => timelineFit(n.listing.availability, p.startDate, today).fit))
    const liveFamilies = new Set(live.flatMap((r) => (r.card ? [r.card.family] : [])))
    const setup = projectSetup(state, viewer, p.id)
    return {
      ...projectRef(state, p),
      plannedStage: stageOn(p.programme, today),
      counts,
      total: rows.length,
      href: `/app/projects/${p.id}`,
      fits,
      fitTone: fitTone(fits),
      sketch: visual.sketch,
      materials: visual.materials,
      approvedT: totals.approved.avoidedT,
      liveT,
      newFits: fresh.length,
      newFitsBy,
      newLikeShortlist: fresh.filter((n) => liveFamilies.has(n.family)).length,
      marketplaceHref: marketplaceHref(p.id),
      newFitsHref: newForProjectHref(p.id),
      setup: setup && setup.visible ? { done: setup.done, total: setup.total, nextText: setup.nextText, href: `/app/projects/${p.id}` } : null,
      linkStatus: p.clientLink.status,
    }
  })
  // New projects still setting up lead, newest first, so the next step is the first thing on the home; the rest
  // keep their order.
  const ordered = [...cards.filter((c) => c.setup).reverse(), ...cards.filter((c) => !c.setup)]
  waiting.sort((a, b) => (a.sentOn ?? '').localeCompare(b.sentOn ?? ''))
  const oldestDays = waiting.reduce<number | null>((m, w) => (w.daysWaiting === null ? m : m === null ? w.daysWaiting : Math.max(m, w.daysWaiting)), null)
  const next = earliestStart(judged, today)
  const share = liveTotalT > 0 ? avoidedApprovedT / liveTotalT : 0
  const activity = activityFor(state, viewer, {}, 8)
  const timing = fitCounts(allFits)
  const programme = programmeState(programmeStatuses)
  const carbonScaleMax = cards.reduce((m, c) => Math.max(m, c.liveT), 0) || 1
  return {
    greeting: greeting(viewer.now, firstName(user.name)),
    dateText: longDate(today),
    stats: { activeProjects: active.length, shortlisted, avoidedApprovedT },
    metrics: {
      settingUp: ordered.filter((c) => c.setup).length,
      notAccepted: projects.length - active.length,
      nextStart: next ? { projectName: next.name, dateText: formatDate(next.startDate) } : null,
      byStatus,
      waiting: { count: waiting.length, oldestDays, tone: waitingTone(waiting.length, oldestDays), state: waitingState(waiting.length, oldestDays) },
      carbon: { approvedT: avoidedApprovedT, liveT: liveTotalT, share, percentText: f.percent(share), targetT: carbonTargetT, state: targetState(approvedOnTargetedT, carbonTargetT) },
      programme: { behind: programmeStatuses.filter((x) => x === 'behind').length, state: programme },
      timing: { fits: timing, state: fitState(timing) },
    },
    projects: ordered,
    carbonByProject: cards.filter((c) => c.liveT > 0).map((c) => ({ id: c.id, name: c.name, href: c.href, approvedT: c.approvedT, liveT: c.liveT })),
    carbonNotYet: cards.filter((c) => c.liveT <= 0).map((c) => ({ id: c.id, name: c.name })),
    carbonScaleMax,
    carbonAxisMax: niceMax(carbonScaleMax),
    waitingForApproval: waiting,
    newForProjects: feed.slice(0, NEW_LISTING_LIMIT),
    activity,
    activitySummary: activitySummary(activity),
    firstRun: projects.length === 0 ? firstRunView(state, viewer) : null,
  }
}

function firstRunView(state: AppData, viewer: Viewer): ArchitectHome['firstRun'] {
  const listings = marketplaceListings(state)
  const folders = categoryFolders(state, viewer, null, listings).map((c) => ({
    typology: c.typology,
    label: c.label,
    description: c.description,
    count: c.count,
    thumbs: c.thumbs,
    href: marketplaceHref(null, { [DISCOVER_PARAM.typology]: c.typology }),
    familiesText: c.families.map((x) => x.label).join(', '),
  }))
  return { total: listings.length, folders }
}
