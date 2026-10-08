// Discover: the marketplace as a showroom, plus lots shared in confidence with the viewer's projects, and the
// material page. Built from public listings only.
import type { Lot, Project, PublicListing, Spec } from '../../domain/types'
import type { BandLevel, BrowseFilters, BrowseSort, Typology } from '../../domain/v1types'
import type { Condition, FamilyId } from '../../domain/types'
import { filterListings, filterOptionsFor, sortListings, type BrowseOptions } from '../../domain/engines/browse'
import { specSheetRows, SPEC_SECTIONS } from '../../domain/engines/specSheet'
import { typologyOf } from '../../domain/engines/typology'
import { dxfFor, objFor } from '../../domain/engines/geometry'
import { SIGNAL_LABELS, TEST_STATUS_LABELS, TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { sustainabilityBand } from '../../domain/engines/band'
import * as f from '../../domain/format'
import type { AppData, Viewer } from '../types'
import { projectSide, projectsOfUser, roleOfUser } from '../access'
import { acceptedReservation, generalWishlist, isLotAvailable, listingOf, lotByPublicId, marketplaceListings, projectCanSee, projectWishlist, saveBlock } from '../lots'
import { familyLabel, listingCard, projectRef, sellerPhrase, storageText, todayOf, collectionPointText, type ListingCard, type ProjectRef, fitText, SHORTLIST_STATUS_LABELS } from './common'

export type DiscoverTab = 'all' | 'shared'

export type DiscoverQuery = {
  tab: DiscoverTab
  q: string
  typology: Typology | null
  family: FamilyId | null
  /** ISO date: keep listings available by then (a quarter start from the filter options). */
  availableBy: string | null
  condition: Condition | null
  region: string | null
  band: BandLevel | null
  /** Keep listings that are not too late for the project being checked. */
  fitsOnly: boolean
  sort: BrowseSort
  /** The project the cards are checked against. */
  projectId: string | null
}

export const DEFAULT_DISCOVER_QUERY: DiscoverQuery = { tab: 'all', q: '', typology: null, family: null, availableBy: null, condition: null, region: null, band: null, fitsOnly: false, sort: 'newest', projectId: null }

function specWords(s: Spec): string[] {
  switch (s.family) {
    case 'steel_section':
      return [s.designation, s.designation.slice(0, 2) === 'UB' ? 'beam' : 'column', 'steel']
    case 'curtain_wall':
      return [s.system, 'glazing', 'facade']
    case 'precast_cladding':
      return ['precast', 'concrete', 'facade']
    case 'stone_cladding':
      return [s.stone, 'stone', 'facade']
    case 'clay_brick':
      return [s.brickType, s.mortar, 'brick']
    case 'raised_floor':
      return [s.panelSize, 'floor']
    case 'timber_joist':
      return [s.species, 'timber', 'wood']
  }
}

/** Every word of the search must appear in the title, family, material, location, typology or public ID. */
export function matchesSearch(l: PublicListing, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = [l.title, l.publicId, familyLabel(l.family), TYPOLOGY_LABELS[typologyOf(l.family)], l.location.label, ...specWords(l.spec)].join(' ').toLowerCase()
  return words.every((w) => hay.includes(w))
}

function filtersOf(q: DiscoverQuery, project: Project | null): BrowseFilters {
  return { typology: q.typology, family: q.family, availableBy: q.availableBy, condition: q.condition, region: q.region, band: q.band, fitsStartDate: q.fitsOnly && project ? project.startDate : null }
}

/** The projects a viewer can check fit against: the ones they work on as architect, client or consultant. */
function pickerProjects(state: AppData, viewer: Viewer): Project[] {
  return projectsOfUser(state, viewer.userId)
}

function savedOrg(state: AppData, viewer: Viewer): string | null {
  return roleOfUser(state, viewer.userId) === 'architect' ? (state.users[viewer.userId]?.orgId ?? null) : null
}

export type SharedGroup = {
  project: ProjectRef
  termsAccepted: boolean
  /** How many lots owners share with this project, available now. Shown before the terms, without details. */
  sharedCount: number
  cards: ListingCard[]
  canAccept: boolean
}

/** Lots owners shared in confidence with the viewer's projects, by project. Nothing is listed before the terms. */
export function sharedGroups(state: AppData, viewer: Viewer): SharedGroup[] {
  const today = todayOf(viewer)
  const orgId = savedOrg(state, viewer)
  return pickerProjects(state, viewer)
    .filter((p) => projectSide(state, viewer.userId, p.id) !== 'consultant')
    .map((p) => {
      const lots = Object.values(state.world.lots).filter((l) => l.visibility === 'matched_only' && projectCanSee(state.world, p, l) && isLotAvailable(state, l, p.id))
      // Before the terms, lotsVisibleToProject hides them; count the lots the owners' approvals would show.
      const pending = p.termsAccepted ? [] : Object.values(state.world.lots).filter((l) => l.visibility === 'matched_only' && approvedOwnerLot(state, p, l) && isLotAvailable(state, l, p.id))
      const listings = lots.map((l) => listingOf(state.world, l)).sort((x, y) => (x.publicId < y.publicId ? -1 : 1))
      return {
        project: projectRef(state, p),
        termsAccepted: p.termsAccepted,
        sharedCount: p.termsAccepted ? listings.length : pending.length,
        cards: listings.map((l) => listingCard(state, l, p, today, orgId)),
        canAccept: !p.termsAccepted,
      }
    })
    .filter((g) => g.sharedCount > 0 || g.termsAccepted)
}

function approvedOwnerLot(state: AppData, p: Project, l: Lot): boolean {
  const owner = state.world.buildings[state.world.items[l.itemId].buildingId]?.ownerOrgId ?? null
  return owner !== null && p.approvedByOwnerOrgIds.includes(owner)
}

export type DiscoverView = {
  tab: DiscoverTab
  query: DiscoverQuery
  projects: ProjectRef[]
  /** The project being checked against, when the viewer works on it. */
  project: ProjectRef | null
  /** Listings each typology tab would show, with the search and the other filters as they stand. */
  typologyCounts: Record<Typology | 'all', number>
  cards: ListingCard[]
  /** Listings on the marketplace before search and filters. */
  total: number
  filterOptions: BrowseOptions
  /** Filters set in the Filters popover (everything but the typology tabs and search). */
  activeFilterCount: number
  /** The sort applied: lowest guide price needs one family, as prices are per family unit. */
  sort: BrowseSort
  priceSortEnabled: boolean
  priceSortHint: string | null
  canSave: boolean
  shared: SharedGroup[]
  sharedCount: number
  empty: 'no_listings' | 'no_results' | null
}

export function discoverView(state: AppData, viewer: Viewer, query: DiscoverQuery): DiscoverView {
  const today = todayOf(viewer)
  const projects = pickerProjects(state, viewer)
  const project = projects.find((p) => p.id === query.projectId) ?? null
  const all = marketplaceListings(state)
  const searched = all.filter((l) => matchesSearch(l, query.q))
  const filters = filtersOf(query, project)
  const count = (typology: Typology | null) => filterListings(searched, { ...filters, typology }, today).length
  const priceSortEnabled = query.family !== null
  const sort: BrowseSort = query.sort === 'price' && !priceSortEnabled ? 'newest' : query.sort
  const shown = sortListings(filterListings(searched, filters, today), sort)
  const orgId = savedOrg(state, viewer)
  const shared = sharedGroups(state, viewer)
  const activeFilterCount = [query.family, query.availableBy, query.condition, query.region, query.band].filter((x) => x !== null).length + (query.fitsOnly && project ? 1 : 0)
  return {
    tab: query.tab,
    query,
    projects: projects.map((p) => projectRef(state, p)),
    project: project ? projectRef(state, project) : null,
    typologyCounts: { all: count(null), structure: count('structure'), envelope: count('envelope'), finishes: count('finishes') },
    cards: shown.map((l) => listingCard(state, l, project, today, orgId)),
    total: all.length,
    filterOptions: filterOptionsFor(all, query.typology, today),
    activeFilterCount,
    sort,
    priceSortEnabled,
    priceSortHint: priceSortEnabled ? null : 'Choose a family to sort by price: prices are per tonne, per m2 or per piece.',
    canSave: roleOfUser(state, viewer.userId) === 'architect',
    shared,
    sharedCount: shared.reduce((n, g) => n + (g.termsAccepted ? g.cards.length : 0), 0),
    empty: all.length === 0 ? 'no_listings' : shown.length === 0 ? 'no_results' : null,
  }
}

// ---------- Material page ----------

export type SaveTarget = { projectId: string | null; label: string; saved: boolean; itemId: string | null; status: string | null; allowed: boolean; reason: string | null; canToggle: boolean }

/** Where the architect can save a listing: each of their projects, then Saved. Empty for every other role. */
export function saveTargets(state: AppData, viewer: Viewer, publicId: string): SaveTarget[] {
  if (roleOfUser(state, viewer.userId) !== 'architect') return []
  const orgId = state.users[viewer.userId].orgId
  const lot = lotByPublicId(state.world, publicId)
  const rows: { projectId: string | null; label: string; list: ReturnType<typeof projectWishlist> }[] = projectsOfUser(state, viewer.userId)
    .filter((p) => projectSide(state, viewer.userId, p.id) === 'architect')
    .map((p) => ({ projectId: p.id, label: p.name, list: projectWishlist(state.world, p.id) }))
  rows.push({ projectId: null, label: 'Saved', list: generalWishlist(state.world, orgId) })
  return rows.map((r) => {
    const item = r.list?.items.find((x) => x.publicId === publicId) ?? null
    const reason = item ? null : saveBlock(state, lot, r.projectId)
    const approved = item?.status === 'approved'
    return {
      projectId: r.projectId,
      label: r.label,
      saved: !!item,
      itemId: item?.id ?? null,
      status: item ? SHORTLIST_STATUS_LABELS[item.status] : null,
      allowed: item ? !approved : reason === null,
      reason: approved ? 'Approved by the client. It cannot be removed.' : reason,
      canToggle: item ? !approved : reason === null,
    }
  })
}

export type GalleryEntry = { kind: 'photo'; id: string; src: string | null } | { kind: 'illustration'; caption: string } | { kind: 'drawing'; caption: string }

export type MaterialView = {
  card: ListingCard
  listing: PublicListing
  gallery: GalleryEntry[]
  tags: string[]
  keyFacts: { label: string; value: string }[]
  specSections: { section: string; rows: { label: string; value: string }[] }[]
  availability: { text: string; windowStart: string | null; windowEnd: string | null; fitText: string | null; storageText: string | null }
  sustainability: { avoidedT: number | null; percent: number | null; bandWord: string; claimed: boolean }
  price: { guide: string; range: string; signal: string }
  location: { label: string; collectionPoint: string }
  sellerLine: string
  projects: ProjectRef[]
  project: ProjectRef | null
  saveTargets: SaveTarget[]
  geometry: { dxf: boolean; obj: boolean; reason: string | null }
  /** Held for one of the viewer's projects by an accepted reservation. */
  reservedFor: string | null
  similar: ListingCard[]
}

/** The lot behind a public ID, when the viewer may see its listing: open, or shared with one of their projects. */
function visibleLot(state: AppData, viewer: Viewer, publicId: string): Lot | null {
  const lot = lotByPublicId(state.world, publicId)
  if (!lot || lot.visibility === 'private') return null
  const mine = pickerProjects(state, viewer)
  const held = acceptedReservation(state, lot.id)
  if (held && !mine.some((p) => p.id === held.projectId)) return null
  if (lot.visibility === 'open') return lot
  return mine.some((p) => projectSide(state, viewer.userId, p.id) !== 'consultant' && projectCanSee(state.world, p, lot)) ? lot : null
}

export function materialView(state: AppData, viewer: Viewer, publicId: string, projectId: string | null): MaterialView | null {
  const role = roleOfUser(state, viewer.userId)
  if (role !== 'architect' && role !== 'client' && role !== 'consultant') return null
  const lot = visibleLot(state, viewer, publicId)
  if (!lot) return null
  const today = todayOf(viewer)
  const listing = listingOf(state.world, lot)
  const projects = pickerProjects(state, viewer).filter((p) => projectCanSee(state.world, p, lot))
  const project = projects.find((p) => p.id === projectId) ?? null
  const card = listingCard(state, listing, project, today, savedOrg(state, viewer))
  const rows = specSheetRows(listing, card.fit).filter((r) => r.section !== 'Price')
  const held = acceptedReservation(state, lot.id)
  const dxf = dxfFor(listing)
  const obj = objFor(listing)
  const band = sustainabilityBand(listing.carbon)
  const similar = marketplaceListings(state)
    .filter((l) => l.publicId !== listing.publicId && (l.family === listing.family || typologyOf(l.family) === typologyOf(listing.family)))
    .sort((a, b) => Number(b.family === listing.family) - Number(a.family === listing.family) || (a.publicId < b.publicId ? -1 : 1))
    .slice(0, 4)
    .map((l) => listingCard(state, l, project, today, savedOrg(state, viewer)))
  return {
    card,
    listing,
    gallery: [...listing.photos.map((p) => ({ kind: 'photo' as const, id: p.id, src: p.src })), { kind: 'illustration', caption: 'Illustration generated from the survey record' }, { kind: 'drawing', caption: 'Drawing generated from the recorded dimensions' }],
    tags: [card.typologyLabel, card.familyLabel, ...(card.sharedInConfidence ? ['Shared in confidence'] : [])],
    keyFacts: [
      { label: 'Quantity', value: card.quantityText },
      { label: 'Mass', value: f.massT(listing.massT) },
      { label: 'Condition', value: listing.condition },
      { label: 'Test status', value: TEST_STATUS_LABELS[listing.testStatus] },
      { label: 'Availability', value: card.availabilityText },
      { label: 'Location', value: listing.location.label },
    ],
    specSections: SPEC_SECTIONS.filter((s) => s !== 'Price')
      .map((section) => ({ section, rows: rows.filter((r) => r.section === section).map((r) => ({ label: r.label, value: r.value })) }))
      .filter((s) => s.rows.length > 0),
    availability: {
      text: card.availabilityText,
      windowStart: listing.availability.kind === 'window' ? listing.availability.windowStart : null,
      windowEnd: listing.availability.kind === 'window' ? listing.availability.windowEnd : null,
      fitText: fitText(card.fit),
      storageText: storageText(card.fit),
    },
    sustainability: { avoidedT: listing.carbon?.avoidedT ?? null, percent: listing.carbon && Number.isFinite(listing.carbon.percent) ? listing.carbon.percent : null, bandWord: band.word, claimed: listing.carbon !== null },
    price: { guide: f.unitPrice(listing.price.guide, listing.family), range: card.priceRange, signal: SIGNAL_LABELS[listing.price.signal] },
    location: { label: listing.location.label, collectionPoint: collectionPointText(listing) },
    sellerLine: `Listed by ${sellerPhrase(listing.sellerType)} in ${listing.location.label}`,
    projects: projects.map((p) => projectRef(state, p)),
    project: project ? projectRef(state, project) : null,
    saveTargets: saveTargets(state, viewer, publicId),
    geometry: { dxf: dxf.kind === 'file', obj: obj.kind === 'file', reason: dxf.kind === 'unavailable' ? dxf.reason : null },
    reservedFor: held ? (state.world.projects[held.projectId]?.name ?? null) : null,
    similar,
  }
}

/** A geometry file for a listing the viewer may see; null otherwise. */
export function geometryFile(state: AppData, viewer: Viewer, publicId: string, kind: 'dxf' | 'obj') {
  const lot = visibleLot(state, viewer, publicId)
  if (!lot) return null
  const listing = listingOf(state.world, lot)
  return kind === 'dxf' ? dxfFor(listing) : objFor(listing)
}
