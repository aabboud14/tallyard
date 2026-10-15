// The Marketplace's landing: category folders with thumbnails, fit counts against the project being checked,
// "New for your projects" for architects, and the month scale behind the availability filter. Every listing here
// comes through listingOf, that is toPublicListing (P3).
import type { FamilyId, Project, PublicListing, Spec } from '../../domain/types'
import type { Fit, Typology } from '../../domain/v1types'
import { FAMILY_IDS } from '../../domain/reference/families'
import { TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { typologyOf } from '../../domain/engines/typology'
import { timelineFit } from '../../domain/engines/timeline'
import { availabilityScale, availableByLabel, scalePositionOf, type AvailabilityScale } from '../../domain/engines/availability'
import { addDays, monthKey } from '../../domain/dates'
import { projectSketch, type BuildingSketch } from '../../domain/sketch'
import type { AppData, Viewer } from '../types'
import { isProjectArchitect, projectsOfUser, roleOfUser } from '../access'
import { listingOf, lotByPublicId, marketplaceListings, projectWishlist } from '../lots'
import { familyLabel, listingCard, todayOf, type ListingCard, type ProjectRef } from './common'
import type { DiscoverQuery } from './discover'

/** Days a listing counts as new. */
export const NEW_LISTING_DAYS = 30

/** How many new listings the feed gives at most. */
export const NEW_LISTING_LIMIT = 6

export const CATEGORY_COPY: Record<Typology, { label: string; description: string }> = {
  structure: { label: TYPOLOGY_LABELS.structure, description: 'Steel sections, timber and the frame' },
  envelope: { label: TYPOLOGY_LABELS.envelope, description: 'Facades, cladding, brick and glazing' },
  finishes: { label: TYPOLOGY_LABELS.finishes, description: 'Floors and interior finishes' },
}

const TYPOLOGIES: Typology[] = ['structure', 'envelope', 'finishes']

export type CategoryThumb = { publicId: string; title: string; spec: Spec; photo: { id: string; src: string | null } | null }

export type CategoryFolder = {
  typology: Typology
  label: string
  description: string
  count: number
  families: { family: FamilyId; label: string; count: number }[]
  /** Up to 3. */
  thumbs: CategoryThumb[]
  /** Listings that are available now or in time (not tight, not late) for the checked project; null without one. */
  fitsCount: number | null
}

export type FitSummary = Record<Fit, number>

export type NewForProjects = ListingCard & { fitsProjects: { id: string; name: string }[] }

export type AvailabilityFilterView = AvailabilityScale & {
  selectedIndex: number
  selectedLabel: string
  /** The slider position of the checked project's start, or null without a project. */
  projectIndex: number | null
  projectName: string | null
}

/** Newest listed first, then by public ID. */
function newestFirst(a: PublicListing, b: PublicListing): number {
  if (a.listedMonth !== b.listedMonth) return a.listedMonth < b.listedMonth ? 1 : -1
  return a.publicId < b.publicId ? -1 : a.publicId > b.publicId ? 1 : 0
}

/** The three category folders, counted over the listings given (the whole marketplace). */
export function categoryFolders(state: AppData, viewer: Viewer, project: Project | null, listings: PublicListing[]): CategoryFolder[] {
  void state
  const today = todayOf(viewer)
  return TYPOLOGIES.map((typology) => {
    const mine = listings.filter((l) => typologyOf(l.family) === typology)
    const families = FAMILY_IDS.filter((f) => typologyOf(f) === typology)
      .map((family) => ({ family, label: familyLabel(family), count: mine.filter((l) => l.family === family).length }))
      .filter((f) => f.count > 0)
    const thumbs = [...mine]
      .sort((a, b) => Number(b.photos.length > 0) - Number(a.photos.length > 0) || newestFirst(a, b))
      .slice(0, 3)
      .map((l) => ({ publicId: l.publicId, title: l.title, spec: l.spec, photo: l.photos[0] ? { id: l.photos[0].id, src: l.photos[0].src } : null }))
    const fitsCount = project
      ? mine.filter((l) => {
          const fit = timelineFit(l.availability, project.startDate, today).fit
          return fit === 'now' || fit === 'in_time'
        }).length
      : null
    return { typology, label: CATEGORY_COPY[typology].label, description: CATEGORY_COPY[typology].description, count: mine.length, families, thumbs, fitsCount }
  })
}

/** How many cards fall in each fit; null when no card was checked against a project. */
export function fitSummary(cards: ListingCard[]): FitSummary | null {
  if (!cards.some((c) => c.fit !== null)) return null
  const out: FitSummary = { now: 0, in_time: 0, tight: 0, late: 0 }
  for (const c of cards) if (c.fit) out[c.fit.fit] += 1
  return out
}

/**
 * New for your projects: listed in the last 30 days, not on any of the practice's lists, and not too late for at
 * least one of the architect's projects; newest first. With a project the architect works on, only listings that
 * are not too late for it, checked against it. Empty for anyone who is not an architect.
 */
export function newForProjectsFeed(state: AppData, viewer: Viewer, projectId: string | null, limit = NEW_LISTING_LIMIT): NewForProjects[] {
  if (roleOfUser(state, viewer.userId) !== 'architect') return []
  const today = todayOf(viewer)
  const user = state.users[viewer.userId]
  const projects = projectsOfUser(state, viewer.userId).filter((p) => isProjectArchitect(state, viewer.userId, p.id))
  const chosen = projectId ? (projects.find((p) => p.id === projectId) ?? null) : null
  const since = monthKey(addDays(today, -NEW_LISTING_DAYS))
  const out: NewForProjects[] = []
  for (const l of [...marketplaceListings(state)].sort(newestFirst)) {
    if (l.listedMonth < since) continue
    // Already on one of the practice's lists: not news.
    if (Object.values(state.world.wishlists).some((w) => w.orgId === user.orgId && w.items.some((x) => x.publicId === l.publicId))) continue
    const fits = projects.filter((p) => timelineFit(l.availability, p.startDate, today).fit !== 'late')
    if (fits.length === 0) continue
    if (chosen && !fits.some((p) => p.id === chosen.id)) continue
    out.push({ ...listingCard(state, l, chosen ?? fits[0], today, user.orgId), fitsProjects: fits.map((p) => ({ id: p.id, name: p.name })) })
    if (out.length === limit) break
  }
  return out
}

/** The month slider: the scale over the listings, where the query's value sits and where the project starts. */
export function availabilityFilterView(listings: PublicListing[], query: DiscoverQuery, project: ProjectRef | null, today: string): AvailabilityFilterView {
  const scale = availabilityScale(listings, today, { includeDate: project?.startDate ?? null })
  return {
    ...scale,
    selectedIndex: scalePositionOf(scale, query.availableBy),
    selectedLabel: availableByLabel(query.availableBy, today),
    projectIndex: project ? scalePositionOf(scale, project.startDate) : null,
    projectName: project?.name ?? null,
  }
}

/**
 * The drawing for the project being checked, from the families on its shortlist (public listings only), for the
 * checking strip. Null when the viewer does not work on the project.
 */
export function checkingProjectSketch(state: AppData, viewer: Viewer, projectId: string | null): BuildingSketch | null {
  if (!projectId) return null
  const p = projectsOfUser(state, viewer.userId).find((x) => x.id === projectId)
  if (!p) return null
  const families: FamilyId[] = []
  for (const it of projectWishlist(state.world, p.id)?.items ?? []) {
    if (it.status === 'declined') continue
    const lot = lotByPublicId(state.world, it.publicId)
    if (lot) families.push(listingOf(state.world, lot).family)
  }
  return projectSketch(p, families)
}
