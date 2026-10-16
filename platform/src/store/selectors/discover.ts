// The Marketplace (code name Discover): category folders, the showroom grid, lots shared in confidence with the
// viewer's projects, and the material page. Built from public listings only. The guide price, the price sort and
// the seller's details are for the client side; architects and consultants do not get them (a display decision,
// as price is a public listing field).
import type { Lot, Project, PublicListing, Spec } from '../../domain/types'
import type { BandLevel, BrowseFilters, BrowseSort, Fit, Typology } from '../../domain/v1types'
import type { Condition, FamilyId } from '../../domain/types'
import { filterListings, filterOptionsFor, sortListings, type BrowseOptions } from '../../domain/engines/browse'
import { specSheetRows, SPEC_SECTIONS } from '../../domain/engines/specSheet'
import { typologyOf } from '../../domain/engines/typology'
import { dxfFor, meshFor, objFor, type ModelGeometry } from '../../domain/engines/geometry'
import { ifcFor } from '../../domain/engines/ifc'
import { timelineFit } from '../../domain/engines/timeline'
import { availabilityPhrase, availableByLabel, type AvailabilityPhrase } from '../../domain/engines/availability'
import { FAMILY_IDS } from '../../domain/reference/families'
import { SIGNAL_LABELS, TEST_STATUS_LABELS, TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { sustainabilityBand } from '../../domain/engines/band'
import * as f from '../../domain/format'
import type { AppData, Viewer } from '../types'
import { projectSide, projectsOfUser, roleOfUser } from '../access'
import { lotsSharedByLinkWithOrg } from '../../domain/visibility'
import { acceptedReservation, generalWishlist, isLotAvailable, listingOf, lotByPublicId, marketplaceListings, projectCanSee, projectWishlist, saveBlock } from '../lots'
import { familyLabel, listingCard, projectRef, sellerPhrase, storageText, todayOf, collectionPointText, type ListingCard, type ProjectRef, fitText, FIT_LABELS, SHORTLIST_STATUS_LABELS } from './common'
import { availabilityFilterView, categoryFolders, checkingProjectSketch, fitSummary, newForProjectsFeed, type AvailabilityFilterView, type CategoryFolder, type FitSummary, type NewForProjects } from './marketplace'
import type { BuildingSketch } from '../../domain/sketch'

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

/**
 * Whether the viewer buys: clients see the guide price, the price sort and the seller's details.
 * A donor building owner can build too (audit 16 October, note C5): it reads the marketplace as a client would, with
 * or without a New project yet; saving needs a project.
 */
function isClientSide(state: AppData, viewer: Viewer): boolean {
  const role = roleOfUser(state, viewer.userId)
  return role === 'client' || role === 'owner'
}

/** The sorts each role is offered: lowest guide price is for clients only. */
export function sortOptionsFor(state: AppData, viewer: Viewer): BrowseSort[] {
  return isClientSide(state, viewer) ? ['newest', 'carbon', 'price'] : ['newest', 'carbon']
}

/** How many architects' new materials the Marketplace landing shows. */
export const NEW_FOR_PROJECTS_ON_LANDING = 4

/** For a donor building owner, the public IDs of its own lots: left out of what it browses. Empty for anyone else. */
function ownPublicIds(state: AppData, viewer: Viewer): Set<string> {
  if (roleOfUser(state, viewer.userId) !== 'owner') return new Set()
  const orgId = state.users[viewer.userId]?.orgId
  return new Set(
    Object.values(state.world.lots)
      .filter((l) => state.world.buildings[state.world.items[l.itemId]?.buildingId ?? '']?.ownerOrgId === orgId)
      .map((l) => l.publicId),
  )
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
      // Before the project's terms, only lots reached through a share link show (the link had its own terms).
      const lots = Object.values(state.world.lots).filter((l) => l.visibility === 'matched_only' && projectCanSee(state.world, p, l) && isLotAvailable(state, l, p.id))
      const visible = new Set(lots.map((l) => l.id))
      // Before the terms, lotsVisibleToProject hides owner-shared lots; count the ones the owners' approvals would show.
      const pending = p.termsAccepted ? [] : Object.values(state.world.lots).filter((l) => l.visibility === 'matched_only' && !visible.has(l.id) && approvedOwnerLot(state, p, l) && isLotAvailable(state, l, p.id))
      const listings = lots.map((l) => listingOf(state.world, l)).sort((x, y) => (x.publicId < y.publicId ? -1 : 1))
      return {
        project: projectRef(state, p),
        termsAccepted: p.termsAccepted,
        sharedCount: p.termsAccepted ? listings.length : pending.length,
        cards: listings.map((l) => listingCard(state, l, p, today, orgId)),
        canAccept: !p.termsAccepted,
      }
    })
    .filter((g) => g.sharedCount > 0 || g.termsAccepted || g.cards.length > 0)
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
  /** The drawing of the project being checked, for the checking strip. */
  projectSketch: BuildingSketch | null
  /** Whether the viewer can start a project (architects): the checking strip offers it when they have none. */
  canCreateProject: boolean
  /** Listings each typology tab would show, with the search and the other filters as they stand. */
  typologyCounts: Record<Typology | 'all', number>
  cards: ListingCard[]
  /** Listings on the marketplace before search and filters. */
  total: number
  filterOptions: BrowseOptions
  /** Filters set in the Filters popover (everything but the typology tabs and search). */
  activeFilterCount: number
  /** The sort applied: lowest guide price is for clients and needs one family, as prices are per family unit. */
  sort: BrowseSort
  /** The sorts offered to this viewer. */
  sortOptions: BrowseSort[]
  priceSortEnabled: boolean
  priceSortHint: string | null
  canSave: boolean
  shared: SharedGroup[]
  sharedCount: number
  /** Lots shared with the viewer's projects that wait behind the confidentiality terms. */
  pendingSharedCount: number
  /** Why Shared with you is empty for a viewer who does not get confidential lots (the consultant); else null. */
  sharedNote: string | null
  empty: 'no_listings' | 'no_results' | null
  /** The unfiltered first view: the All listings tab with no typology, search or filters. */
  landing: boolean
  /** Structure, Envelope and Finishes, counted over the whole marketplace. */
  folders: CategoryFolder[]
  /** The families of the chosen typology as chips; null with no typology. */
  familyChips: { family: FamilyId; label: string; count: number; active: boolean }[] | null
  /** The shown cards by fit, only with a project being checked. */
  fitSummary: FitSummary | null
  /** Architects on the landing view only: the first NEW_FOR_PROJECTS_ON_LANDING of the feed. */
  newForProjects: NewForProjects[]
  /** The rest of the feed, shown by the row's Show all control, so every new material the home counts is reachable. */
  newForProjectsMore: NewForProjects[]
  /** The whole feed's length: the same figure as the home's per-project count. */
  newForProjectsTotal: number
  availability: AvailabilityFilterView
  /** The chip label of the availability filter; null with no filter. */
  availableByLabel: string | null
}

export function discoverView(state: AppData, viewer: Viewer, query: DiscoverQuery): DiscoverView {
  const today = todayOf(viewer)
  const projects = pickerProjects(state, viewer)
  const project = projects.find((p) => p.id === query.projectId) ?? null
  const own = ownPublicIds(state, viewer)
  const all = marketplaceListings(state).filter((l) => !own.has(l.publicId))
  const searched = all.filter((l) => matchesSearch(l, query.q))
  const filters = filtersOf(query, project)
  const count = (typology: Typology | null) => filterListings(searched, { ...filters, typology }, today).length
  const client = isClientSide(state, viewer)
  const sortOptions = sortOptionsFor(state, viewer)
  const priceSortEnabled = client && query.family !== null
  const sort: BrowseSort = query.sort === 'price' && !priceSortEnabled ? 'newest' : query.sort
  const shown = sortListings(filterListings(searched, filters, today), sort)
  const orgId = savedOrg(state, viewer)
  const shared = sharedGroups(state, viewer)
  const activeFilterCount = [query.family, query.availableBy, query.condition, query.region, query.band].filter((x) => x !== null).length + (query.fitsOnly && project ? 1 : 0)
  const landing = query.tab === 'all' && query.typology === null && !query.q.trim() && activeFilterCount === 0
  // The whole feed: the home counts every new material that fits a project, so the row must reach all of them.
  const newFeed = landing && roleOfUser(state, viewer.userId) === 'architect' ? newForProjectsFeed(state, viewer, project?.id ?? null, Number.POSITIVE_INFINITY) : []
  const cards = shown.map((l) => listingCard(state, l, project, today, orgId))
  const projectView = project ? projectRef(state, project) : null
  // Family chips count the searched listings with every filter but the family itself.
  const familyChips = query.typology
    ? FAMILY_IDS.filter((f) => typologyOf(f) === query.typology).map((family) => ({
        family,
        label: familyLabel(family),
        count: filterListings(searched, { ...filters, family }, today).length,
        active: query.family === family,
      }))
    : null
  return {
    tab: query.tab,
    query,
    projects: projects.map((p) => projectRef(state, p)),
    project: project ? projectRef(state, project) : null,
    projectSketch: checkingProjectSketch(state, viewer, project?.id ?? null),
    canCreateProject: roleOfUser(state, viewer.userId) === 'architect',
    typologyCounts: { all: count(null), structure: count('structure'), envelope: count('envelope'), finishes: count('finishes') },
    cards,
    total: all.length,
    filterOptions: filterOptionsFor(all, query.typology, today),
    activeFilterCount,
    sort,
    sortOptions,
    priceSortEnabled,
    priceSortHint: client && !priceSortEnabled ? 'Choose a family to sort by price: prices are per tonne, per m2 or per piece.' : null,
    canSave: roleOfUser(state, viewer.userId) === 'architect',
    shared,
    sharedCount: shared.reduce((n, g) => n + g.cards.length, 0),
    pendingSharedCount: shared.reduce((n, g) => n + (g.termsAccepted ? 0 : g.sharedCount), 0),
    sharedNote: sharedNoteFor(state, viewer),
    empty: all.length === 0 ? 'no_listings' : shown.length === 0 ? 'no_results' : null,
    landing,
    folders: categoryFolders(state, viewer, project, all),
    familyChips,
    fitSummary: fitSummary(cards),
    newForProjects: newFeed.slice(0, NEW_FOR_PROJECTS_ON_LANDING),
    newForProjectsMore: newFeed.slice(NEW_FOR_PROJECTS_ON_LANDING),
    newForProjectsTotal: newFeed.length,
    availability: availabilityFilterView(all, query, projectView, today),
    availableByLabel: query.availableBy ? availableByLabel(query.availableBy, today) : null,
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

/** How a material fits one of the viewer's projects. */
export type ProjectFit = { projectId: string; name: string; startText: string; fit: Fit; fitLabel: string }

/**
 * Specification rows the material page already shows above the table: the title, public ID and tags in the header,
 * the key facts, the Availability block (with its timeline check) and the Sustainability block. The table keeps only
 * what is not shown elsewhere (the material and dimensions, and the steel grade), so nothing is said twice and every
 * indicative figure sits under its own Indicative marker. The specification export keeps every row.
 */
export const SHOWN_ABOVE_SPEC: ReadonlySet<string> = new Set(['Public ID', 'Title', 'Typology', 'Family', 'Quantity', 'Mass', 'Condition', 'Test status', 'Availability', 'Timeline check', 'Storage until the start', 'Location', 'Collection point', 'Avoided carbon', 'Sustainability band'])

/** How many projects the material page checks at once when none is chosen. */
export const BY_PROJECT_LIMIT = 5

export type GalleryEntry = { kind: 'photo'; id: string; src: string | null } | { kind: 'illustration'; caption: string } | { kind: 'drawing'; caption: string }

export type MaterialView = {
  card: ListingCard
  listing: PublicListing
  gallery: GalleryEntry[]
  tags: string[]
  keyFacts: { label: string; value: string }[]
  /** The specification rows not already shown above the table (see SHOWN_ABOVE_SPEC). */
  specSections: { section: string; rows: { label: string; value: string }[] }[]
  availability: {
    /** The phrase's text, for the key facts and the large line. */
    text: string
    phrase: AvailabilityPhrase
    windowStart: string | null
    windowEnd: string | null
    fitText: string | null
    storageText: string | null
    /** The fit against each of the viewer's projects that can see the lot, in order, at most 5. */
    byProject: ProjectFit[]
  }
  sustainability: { avoidedT: number | null; percent: number | null; bandWord: string; claimed: boolean }
  /** Null unless the viewer is on the client side. */
  price: { guide: string; range: string; signal: string } | null
  /** The seller is named (by type) for clients only. */
  location: { label: string; collectionPoint: string; seller: string | null }
  /** Null unless the viewer is on the client side. */
  sellerLine: string | null
  projects: ProjectRef[]
  project: ProjectRef | null
  /** The project being checked against when it is one of the viewer's but the lot is not shared with it; else null. */
  notSharedWith: string | null
  saveTargets: SaveTarget[]
  geometry: { dxf: boolean; obj: boolean; ifc: boolean; reason: string | null }
  /** The 3D model built from the recorded dimensions, or null when there are none. */
  model: ModelGeometry | null
  /** Architects see that approval and purchase sit with the client. */
  showPurchaseNote: boolean
  /** Held for one of the viewer's projects by an accepted reservation. */
  reservedFor: string | null
  similar: ListingCard[]
}

/**
 * The lot behind a public ID, when the viewer may see its listing: open, or shared with one of their projects. A lot
 * shared in confidence opens for the project's architect and client, who accept the confidentiality terms; the
 * project's consultant does not get it (one rule for every surface: see canOpenMaterial).
 */
function visibleLot(state: AppData, viewer: Viewer, publicId: string): Lot | null {
  const lot = lotByPublicId(state.world, publicId)
  if (!lot || lot.visibility === 'private') return null
  // A donor building owner manages its own lots in its buildings; the marketplace shows it what others offer.
  if (ownPublicIds(state, viewer).has(publicId)) return null
  const mine = pickerProjects(state, viewer)
  const held = acceptedReservation(state, lot.id)
  if (held && !mine.some((p) => p.id === held.projectId)) return null
  if (lot.visibility === 'open') return lot
  // Round 2: a lot reached through a share link the viewer's organisation opened reads as a public listing.
  const orgId = state.users[viewer.userId]?.orgId ?? ''
  if (lotsSharedByLinkWithOrg(state.world, orgId).includes(lot.id)) return lot
  return mine.some((p) => projectSide(state, viewer.userId, p.id) !== 'consultant' && projectCanSee(state.world, p, lot)) ? lot : null
}

/** Roles that read material pages: the buying side, and a donor building owner, who may build too. */
function readsMaterials(state: AppData, viewer: Viewer): boolean {
  const role = roleOfUser(state, viewer.userId)
  return role === 'architect' || role === 'client' || role === 'consultant' || role === 'owner'
}

/**
 * Whether the viewer can open a material page. Every surface that links a material (programme chart, search, cards)
 * asks this first, so no link leads to "You do not have access to this".
 */
export function canOpenMaterial(state: AppData, viewer: Viewer, publicId: string): boolean {
  return readsMaterials(state, viewer) && visibleLot(state, viewer, publicId) !== null
}

/** The note on Shared with you for a viewer who sees no confidential lots by role (the consultant); else null. */
function sharedNoteFor(state: AppData, viewer: Viewer): string | null {
  const consultantOnly = pickerProjects(state, viewer).some((p) => projectSide(state, viewer.userId, p.id) === 'consultant') && !pickerProjects(state, viewer).some((p) => projectSide(state, viewer.userId, p.id) !== 'consultant')
  return consultantOnly ? 'Lots that donor building owners share in confidence stay with the project\'s architect and client, who accept the confidentiality terms. They do not appear here.' : null
}

export function materialView(state: AppData, viewer: Viewer, publicId: string, projectId: string | null): MaterialView | null {
  if (!readsMaterials(state, viewer)) return null
  const lot = visibleLot(state, viewer, publicId)
  if (!lot) return null
  const today = todayOf(viewer)
  const listing = listingOf(state.world, lot)
  const mine = pickerProjects(state, viewer)
  const projects = mine.filter((p) => projectCanSee(state.world, p, lot))
  const project = projects.find((p) => p.id === projectId) ?? null
  const unseen = project ? null : (mine.find((p) => p.id === projectId) ?? null)
  const card = listingCard(state, listing, project, today, savedOrg(state, viewer))
  const rows = specSheetRows(listing, card.fit).filter((r) => r.section !== 'Price')
  const held = acceptedReservation(state, lot.id)
  const dxf = dxfFor(listing)
  const obj = objFor(listing)
  const ifc = ifcFor(listing, today)
  const mesh = meshFor(listing)
  const client = isClientSide(state, viewer)
  const phrase = availabilityPhrase(listing.availability)
  const band = sustainabilityBand(listing.carbon)
  const own = ownPublicIds(state, viewer)
  const similar = marketplaceListings(state)
    .filter((l) => !own.has(l.publicId))
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
      { label: 'Location', value: listing.location.label },
      { label: 'Collection point', value: collectionPointText(listing) },
    ],
    specSections: SPEC_SECTIONS.filter((s) => s !== 'Price')
      .map((section) => ({ section, rows: rows.filter((r) => r.section === section && !SHOWN_ABOVE_SPEC.has(r.label)).map((r) => ({ label: r.label, value: r.value })) }))
      .filter((s) => s.rows.length > 0),
    availability: {
      text: phrase.text,
      phrase,
      windowStart: listing.availability.kind === 'window' ? listing.availability.windowStart : null,
      windowEnd: listing.availability.kind === 'window' ? listing.availability.windowEnd : null,
      fitText: fitText(card.fit),
      storageText: storageText(card.fit),
      byProject: projects.slice(0, BY_PROJECT_LIMIT).map((p) => {
        const fit = timelineFit(listing.availability, p.startDate, today).fit
        return { projectId: p.id, name: p.name, startText: projectRef(state, p).startText, fit, fitLabel: FIT_LABELS[fit] }
      }),
    },
    sustainability: { avoidedT: listing.carbon?.avoidedT ?? null, percent: listing.carbon && Number.isFinite(listing.carbon.percent) ? listing.carbon.percent : null, bandWord: band.word, claimed: listing.carbon !== null },
    price: client ? { guide: f.unitPrice(listing.price.guide, listing.family), range: card.priceRange, signal: SIGNAL_LABELS[listing.price.signal] } : null,
    location: { label: listing.location.label, collectionPoint: collectionPointText(listing), seller: client ? listing.sellerType : null },
    sellerLine: client ? `Listed by ${sellerPhrase(listing.sellerType)} in ${listing.location.label}` : null,
    projects: projects.map((p) => projectRef(state, p)),
    project: project ? projectRef(state, project) : null,
    notSharedWith: unseen?.name ?? null,
    saveTargets: saveTargets(state, viewer, publicId),
    geometry: { dxf: dxf.kind === 'file', obj: obj.kind === 'file', ifc: ifc.kind === 'file', reason: dxf.kind === 'unavailable' ? dxf.reason : null },
    model: 'unavailable' in mesh ? null : mesh,
    showPurchaseNote: roleOfUser(state, viewer.userId) === 'architect',
    reservedFor: held ? (state.world.projects[held.projectId]?.name ?? null) : null,
    similar,
  }
}

/** A geometry file for a listing the viewer may see; null otherwise. */
export function geometryFile(state: AppData, viewer: Viewer, publicId: string, kind: 'dxf' | 'obj' | 'ifc') {
  const lot = visibleLot(state, viewer, publicId)
  if (!lot) return null
  const listing = listingOf(state.world, lot)
  if (kind === 'ifc') return ifcFor(listing, todayOf(viewer))
  return kind === 'dxf' ? dxfFor(listing) : objFor(listing)
}
