// Version 1.0 view models (brief/09-V1-PRODUCT.md sections 3, 4 and 13). Screens format what these return.
// Anything the other side owns is read only through its public projection: listings through toPublicListing
// (via listingFor), projects through toBlindBuyer.
import type { BlindBuyer, Lot, Project, PublicListing, World } from '../domain/types'
import type { Band, BrowseFilters, BrowseSort, GeometryFile, SpecSheet, TimelineFit, WishStatus, WishTotals, Wishlist, WishlistItem } from '../domain/v1types'
import { DEFAULT_ASSUMPTIONS as A } from '../domain/reference/assumptions'
import { NOT_SHARED, PROJECT_TYPE_LABELS, TYPOLOGY_LABELS, WISH_STATUS_LABELS } from '../domain/reference/labels'
import { formatDate } from '../domain/dates'
import { buildingsFor, clientsFor, engagementsFor, projectsFor, roleOf, type Role } from '../domain/access'
import { browseListings, listingFor } from '../domain/visibility'
import { toBlindBuyer, blindBuyerText } from '../domain/privacy/blindBuyer'
import { filterListings, filterOptions, sortListings, type BrowseOptions } from '../domain/engines/browse'
import { sustainabilityBand } from '../domain/engines/band'
import { typologyOf } from '../domain/engines/typology'
import { timelineFit } from '../domain/engines/timeline'
import { MOVE_REASONS, wishlistTotals } from '../domain/engines/wishlist'
import { priceRangeText, specSheet } from '../domain/engines/specSheet'
import { dxfFor, objFor } from '../domain/engines/geometry'
import {
  generalWishlist,
  isLotAvailable,
  isProjectArchitect,
  isProjectClient,
  isProjectConsultant,
  lotByPublicIdOrNull,
  projectCanSee,
  projectWishlist,
  saveBlock,
  V1_ERRORS,
} from './v1actions'

// ---------- Shared pieces ----------

export type ProjectRef = { id: string; name: string; typeLabel: string; startDate: string }

export type ListingFacts = { listing: PublicListing; typologyLabel: string; band: Band; fit: TimelineFit | null }

export type BrowseCard = ListingFacts & { savedIn: string[] }

export type SaveTarget = { projectId: string | null; label: string; allowed: boolean; saved: boolean; reason: string | null }

export type MoveTarget = { projectId: string | null; label: string; allowed: boolean; reason: string | null }

export type WishRowState = 'ok' | 'not_shared' | 'not_available'

export type WishRow = {
  item: WishlistItem
  /** The listing title, shown on every row, including rows with no figures. */
  title: string
  /** Null unless the state is ok: a row the project can no longer see shows no figures (13.4). */
  listing: PublicListing | null
  state: WishRowState
  /** "No longer shared with this project" or "No longer available"; null when ok. */
  stateText: string | null
  statusLabel: string
  band: Band | null
  fit: TimelineFit | null
  typologyLabel: string
  canRemove: boolean
  canMove: boolean
  canEditNote: boolean
  canReopen: boolean
  moveTargets: MoveTarget[]
}

export type ApprovalRow = WishRow & { priceRange: string }

export type WishTotalsByState = Record<WishStatus | 'all', WishTotals>

const NO_LONGER_AVAILABLE = 'No longer available'

function roleOrNull(world: World, personaId: string): Role | null {
  try {
    return roleOf(world, personaId)
  } catch {
    return null
  }
}

function orgIdOf(world: World, personaId: string): string | null {
  return world.personas[personaId]?.orgId ?? null
}

function projectRef(p: Project): ProjectRef {
  return { id: p.id, name: p.name, typeLabel: PROJECT_TYPE_LABELS[p.projectType], startDate: p.startDate }
}

function facts(listing: PublicListing, project: Project | null): ListingFacts {
  return {
    listing,
    typologyLabel: TYPOLOGY_LABELS[typologyOf(listing.family)],
    band: sustainabilityBand(listing.carbon),
    fit: project ? timelineFit(listing.availability, project.startDate) : null,
  }
}

/** Projects the persona works on as the architect practice. */
export function architectProjects(world: World, personaId: string): Project[] {
  if (roleOrNull(world, personaId) !== 'architect') return []
  return projectsFor(world, personaId).filter((p) => isProjectArchitect(world, personaId, p.id))
}

/** Projects the persona works on as the architect or the client: the ones with a project picker. */
function pickerProjects(world: World, personaId: string): Project[] {
  return projectsFor(world, personaId).filter((p) => isProjectArchitect(world, personaId, p.id) || isProjectClient(world, personaId, p.id))
}

/** The practice's lists that hold this public ID, by list ID. */
function savedInLists(world: World, personaId: string, publicId: string): string[] {
  if (roleOrNull(world, personaId) !== 'architect') return []
  const orgId = orgIdOf(world, personaId)
  return Object.values(world.wishlists)
    .filter((l) => l.orgId === orgId && l.items.some((it) => it.publicId === publicId))
    .map((l) => l.id)
}

/** Whether the persona may see this lot's public listing: open lots for everyone, shared lots for a project that can see them. */
function visibleToPersona(world: World, personaId: string, lot: Lot | null): boolean {
  if (!lot || lot.visibility === 'private') return false
  if (lot.visibility === 'open') return true
  return pickerProjects(world, personaId).some((p) => projectCanSee(world, p, lot))
}

// ---------- Browse ----------

export type BrowseView = {
  cards: BrowseCard[]
  /** Listings on the marketplace before filters. */
  total: number
  filterOptions: BrowseOptions
  /** The project chosen in the picker, if the persona works on it. */
  project: ProjectRef | null
  projects: ProjectRef[]
  /** The sort actually applied: lowest guide price needs exactly one family (prices are in each family's unit). */
  sort: BrowseSort
  priceSortEnabled: boolean
  canSave: boolean
}

/**
 * The marketplace: open listings that are still available. Any non-null `fitsStartDate` turns on the
 * "fits the project start date" filter, which uses the chosen project's start date and is ignored without one.
 */
export function browseView(world: World, personaId: string, filters: BrowseFilters, sort: BrowseSort, projectId: string | null): BrowseView {
  const projects = pickerProjects(world, personaId)
  const project = projects.find((p) => p.id === projectId) ?? null
  const all = browseListings(world, A)
  const effective: BrowseFilters = { ...filters, fitsStartDate: filters.fitsStartDate !== null && project ? project.startDate : null }
  const priceSortEnabled = filters.family !== null
  const applied: BrowseSort = sort === 'price' && !priceSortEnabled ? 'newest' : sort
  const shown = sortListings(filterListings(all, effective), applied)
  return {
    cards: shown.map((l) => ({ ...facts(l, project), savedIn: savedInLists(world, personaId, l.publicId) })),
    total: all.length,
    filterOptions: filterOptions(all),
    project: project ? projectRef(project) : null,
    projects: projects.map(projectRef),
    sort: applied,
    priceSortEnabled,
    canSave: roleOrNull(world, personaId) === 'architect',
  }
}

// ---------- Shared with you ----------

export type SharedGroup = { project: ProjectRef; termsAccepted: boolean; cards: BrowseCard[] }

export type SharedView = { groups: SharedGroup[]; canAccept: boolean; canSave: boolean }

/** Lots shared in confidence, grouped by project. Nothing is listed for a project until its terms are accepted. */
export function sharedView(world: World, personaId: string): SharedView {
  const groups = pickerProjects(world, personaId).map((p) => {
    const cards: BrowseCard[] = []
    if (p.termsAccepted) {
      const lots = Object.values(world.lots).filter((l) => l.visibility === 'matched_only' && projectCanSee(world, p, l))
      const listings = lots
        .map((l) => listingFor(world, l.id, A))
        .filter((l) => l.status === 'Available')
        .sort((x, y) => (x.publicId < y.publicId ? -1 : x.publicId > y.publicId ? 1 : 0))
      for (const l of listings) cards.push({ ...facts(l, p), savedIn: savedInLists(world, personaId, l.publicId) })
    }
    return { project: projectRef(p), termsAccepted: p.termsAccepted, cards }
  })
  const role = roleOrNull(world, personaId)
  return { groups, canAccept: role === 'architect' || role === 'client', canSave: role === 'architect' }
}

// ---------- Listing detail ----------

/** Where the architect can save a listing: each project, then Saved. Empty for every other role. */
export function saveTargetsFor(world: World, personaId: string, publicId: string): SaveTarget[] {
  if (roleOrNull(world, personaId) !== 'architect') return []
  const lot = lotByPublicIdOrNull(world, publicId)
  const orgId = orgIdOf(world, personaId)!
  const target = (projectId: string | null, label: string, list: Wishlist | null): SaveTarget => {
    const saved = !!list?.items.some((it) => it.publicId === publicId)
    const reason = saveBlock(world, lot, projectId)
    return { projectId, label, allowed: reason === null, saved, reason }
  }
  const out = architectProjects(world, personaId).map((p) => target(p.id, p.name, projectWishlist(world, p.id)))
  out.push(target(null, 'Saved', generalWishlist(world, orgId)))
  return out
}

export type ListingDetailView = ListingFacts & {
  /** The project chosen in the page's picker, when the persona works on it and it can see this listing. */
  project: ProjectRef | null
  /** The persona's projects that can see this listing, for the picker. */
  projects: ProjectRef[]
  saveTargets: SaveTarget[]
  isArchitect: boolean
  isClient: boolean
  geometry: { dxf: boolean; obj: boolean; reason: string | null }
}

/** A listing as this persona may see it, or null when they may not (private, or shared with none of their projects). */
export function listingDetailView(world: World, personaId: string, publicId: string, projectId: string | null): ListingDetailView | null {
  const lot = lotByPublicIdOrNull(world, publicId)
  if (!lot || !visibleToPersona(world, personaId, lot)) return null
  const listing = listingFor(world, lot.id, A)
  const projects = pickerProjects(world, personaId).filter((p) => projectCanSee(world, p, lot))
  const project = projects.find((p) => p.id === projectId) ?? null
  const role = roleOrNull(world, personaId)
  const dxf = dxfFor(listing)
  const obj = objFor(listing)
  return {
    ...facts(listing, project),
    project: project ? projectRef(project) : null,
    projects: projects.map(projectRef),
    saveTargets: saveTargetsFor(world, personaId, publicId),
    isArchitect: role === 'architect',
    isClient: role === 'client',
    geometry: { dxf: dxf.kind === 'file', obj: obj.kind === 'file', reason: dxf.kind === 'unavailable' ? dxf.reason : null },
  }
}

/** A geometry file for a listing the persona can see; null otherwise. */
export function geometryFor(world: World, personaId: string, publicId: string, kind: 'dxf' | 'obj'): GeometryFile | null {
  const lot = lotByPublicIdOrNull(world, publicId)
  if (!lot || !visibleToPersona(world, personaId, lot)) return null
  const listing = listingFor(world, lot.id, A)
  return kind === 'dxf' ? dxfFor(listing) : objFor(listing)
}

// ---------- Wish lists ----------

/** How a list row stands: ok, no longer shared with the project, or no longer available. */
function rowState(world: World, lot: Lot | null, project: Project | null): { state: WishRowState; listing: PublicListing | null } {
  if (!lot) return { state: 'not_available', listing: null }
  const visible = project ? projectCanSee(world, project, lot) : lot.visibility === 'open'
  if (!visible) return { state: 'not_shared', listing: null }
  if (!isLotAvailable(world, lot)) return { state: 'not_available', listing: null }
  return { state: 'ok', listing: listingFor(world, lot.id, A) }
}

function moveTargetsFor(world: World, personaId: string, list: Wishlist, item: WishlistItem, lot: Lot | null, canMove: boolean): MoveTarget[] {
  if (roleOrNull(world, personaId) !== 'architect') return []
  const targets: { projectId: string | null; label: string; list: Wishlist | null }[] = architectProjects(world, personaId).map((p) => ({ projectId: p.id, label: p.name, list: projectWishlist(world, p.id) }))
  targets.push({ projectId: null, label: 'Saved', list: generalWishlist(world, list.orgId) })
  return targets
    .filter((t) => t.projectId !== list.projectId)
    .map((t) => {
      let reason: string | null = null
      if (!canMove) reason = item.status === 'approved' ? MOVE_REASONS.approved : item.status === 'sent' ? MOVE_REASONS.sent : V1_ERRORS.sharedMove
      else if (t.list?.items.some((x) => x.publicId === item.publicId)) reason = V1_ERRORS.sameList
      else reason = saveBlock(world, lot, t.projectId)
      return { projectId: t.projectId, label: t.label, allowed: reason === null, reason }
    })
}

function rowsFor(world: World, personaId: string, list: Wishlist, project: Project | null): WishRow[] {
  const isArchitect = roleOrNull(world, personaId) === 'architect' && list.orgId === orgIdOf(world, personaId)
  return list.items.map((item) => {
    const lot = lotByPublicIdOrNull(world, item.publicId)
    const { state, listing } = rowState(world, lot, project)
    // The title is a public field; it stays on rows that no longer show figures.
    const title = lot ? listingFor(world, lot.id, A).title : item.publicId
    const family = lot ? world.items[lot.itemId].family : null
    const f = listing ? facts(listing, project) : null
    const canMove = isArchitect && (item.status === 'pending' || item.status === 'declined') && lot?.visibility !== 'matched_only'
    return {
      item,
      title,
      listing,
      state,
      stateText: state === 'not_shared' ? NOT_SHARED : state === 'not_available' ? NO_LONGER_AVAILABLE : null,
      statusLabel: WISH_STATUS_LABELS[item.status],
      band: f ? f.band : null,
      fit: f ? f.fit : null,
      typologyLabel: family ? TYPOLOGY_LABELS[typologyOf(family)] : '',
      canRemove: isArchitect && item.status !== 'approved',
      canMove,
      canEditNote: isArchitect && (item.status === 'pending' || item.status === 'declined'),
      canReopen: isArchitect && item.status === 'declined',
      moveTargets: isArchitect ? moveTargetsFor(world, personaId, list, item, lot, canMove) : [],
    }
  })
}

/** Totals by state, from rows that are ok only (13.5). */
function totalsFor(rows: WishRow[]): WishTotalsByState {
  const ok = new Map(rows.filter((r) => r.state === 'ok').map((r) => [r.item.publicId, r.listing!]))
  return wishlistTotals(
    rows.map((r) => r.item),
    (publicId) => ok.get(publicId) ?? null,
  )
}

export type ProjectHeader = ProjectRef & { clientName: string; projectLine: string; termsAccepted: boolean }

function projectHeader(world: World, p: Project): ProjectHeader {
  return {
    ...projectRef(p),
    clientName: world.orgs[p.clientOrgId]?.name ?? '',
    projectLine: `${PROJECT_TYPE_LABELS[p.projectType]} project for ${world.orgs[p.clientOrgId]?.name ?? ''}. Materials needed on site from ${formatDate(p.startDate)}.`,
    termsAccepted: p.termsAccepted,
  }
}

export type WishlistView = {
  project: ProjectHeader
  listId: string | null
  rows: WishRow[]
  totals: WishTotalsByState
  /** Pending rows that would go to the client: ok rows only. */
  sendableCount: number
  canSend: boolean
}

/** The project's wish list for its architect; null for anyone else. */
export function wishlistView(world: World, personaId: string, projectId: string): WishlistView | null {
  if (!isProjectArchitect(world, personaId, projectId)) return null
  const p = world.projects[projectId]
  const list = projectWishlist(world, projectId)
  const rows = list ? rowsFor(world, personaId, list, p) : []
  const sendableCount = rows.filter((r) => r.item.status === 'pending' && r.state === 'ok').length
  return { project: projectHeader(world, p), listId: list?.id ?? null, rows, totals: totalsFor(rows), sendableCount, canSend: sendableCount > 0 }
}

export type SavedView = { listId: string | null; rows: WishRow[]; totals: WishTotalsByState; projects: ProjectRef[] }

/** The practice's general list, with no project, for the architect; null for anyone else. */
export function savedView(world: World, personaId: string): SavedView | null {
  if (roleOrNull(world, personaId) !== 'architect') return null
  const list = generalWishlist(world, orgIdOf(world, personaId)!)
  const rows = list ? rowsFor(world, personaId, list, null) : []
  return { listId: list?.id ?? null, rows, totals: totalsFor(rows), projects: architectProjects(world, personaId).map(projectRef) }
}

export type ApprovalsView = {
  project: ProjectHeader
  sent: ApprovalRow[]
  approved: ApprovalRow[]
  declined: ApprovalRow[]
  totals: WishTotalsByState
}

/** The client's approvals: rows sent to them and their decisions. Rows the project can no longer see are left out (13.4). */
export function approvalsView(world: World, personaId: string, projectId: string): ApprovalsView | null {
  if (!isProjectClient(world, personaId, projectId)) return null
  const p = world.projects[projectId]
  const list = projectWishlist(world, projectId)
  const rows: ApprovalRow[] = (list ? rowsFor(world, personaId, list, p) : [])
    .filter((r) => r.state === 'ok' && r.item.status !== 'pending')
    .map((r) => ({ ...r, priceRange: priceRangeText(r.listing!) }))
  return {
    project: projectHeader(world, p),
    sent: rows.filter((r) => r.item.status === 'sent'),
    approved: rows.filter((r) => r.item.status === 'approved'),
    declined: rows.filter((r) => r.item.status === 'declined'),
    totals: totalsFor(rows),
  }
}

export type ReviewView = { project: ProjectHeader; byState: Record<WishStatus, WishRow[]>; totals: WishTotalsByState }

/** The consultant's read-only review of the architect's list, by state, with mass and carbon totals (13.12). */
export function reviewView(world: World, personaId: string, projectId: string): ReviewView | null {
  if (!isProjectConsultant(world, personaId, projectId)) return null
  const p = world.projects[projectId]
  const list = projectWishlist(world, projectId)
  const rows = (list ? rowsFor(world, personaId, list, p) : []).filter((r) => r.state === 'ok')
  const by = (s: WishStatus) => rows.filter((r) => r.item.status === s)
  return { project: projectHeader(world, p), byState: { pending: by('pending'), sent: by('sent'), approved: by('approved'), declined: by('declined') }, totals: totalsFor(rows) }
}

/**
 * The specification schedule for the architect: the approved items, or a draft of every item not declined
 * (approved, sent and pending). Rows the project can no longer see, or that are no longer available, are left out.
 */
export function specSheetView(world: World, personaId: string, projectId: string, which: 'approved' | 'draft'): SpecSheet | null {
  if (!isProjectArchitect(world, personaId, projectId)) return null
  const p = world.projects[projectId]
  const list = projectWishlist(world, projectId)
  const rows = (list ? rowsFor(world, personaId, list, p) : []).filter((r) => r.state === 'ok' && (which === 'approved' ? r.item.status === 'approved' : r.item.status !== 'declined'))
  return specSheet(
    { name: p.name, typeLabel: PROJECT_TYPE_LABELS[p.projectType], startDate: p.startDate },
    rows.map((r) => ({ listing: r.listing!, fit: r.fit, status: r.item.status })),
  )
}

// ---------- Supply side ----------

export type SupplyBuilding = { id: string; name: string; itemCount: number; lots: { private: number; shared: number; published: number } }
export type SupplyClient = { orgId: string; name: string; buildings: SupplyBuilding[] }

/** The surveyor's clients and buildings (and the owner's own), with counts. */
export function supplyTreeView(world: World, personaId: string): { clients: SupplyClient[] } {
  return {
    clients: clientsFor(world, personaId).map((g) => ({
      orgId: g.org.id,
      name: g.org.name,
      buildings: g.buildings.map((b) => {
        const lots = Object.values(world.lots).filter((l) => world.items[l.itemId].buildingId === b.id)
        return {
          id: b.id,
          name: b.name,
          itemCount: lots.length,
          lots: {
            private: lots.filter((l) => l.visibility === 'private').length,
            shared: lots.filter((l) => l.visibility === 'matched_only').length,
            published: lots.filter((l) => l.visibility === 'open').length,
          },
        }
      }),
    })),
  }
}

export type OwnerSharingRow = { projectId: string; blind: BlindBuyer; text: string; approved: boolean }

/** Every project as the owner may see it: the blind line only, and whether the owner shares lots with it. */
export function ownerSharingView(world: World, ownerOrgId: string): { rows: OwnerSharingRow[]; sharedLotCount: number } {
  const rows = Object.values(world.projects).map((p) => {
    const blind = toBlindBuyer(p)
    return { projectId: p.id, blind, text: blindBuyerText(blind), approved: p.approvedByOwnerOrgIds.includes(ownerOrgId) }
  })
  const sharedLotCount = Object.values(world.lots).filter((l) => l.visibility === 'matched_only' && world.buildings[world.items[l.itemId].buildingId].ownerOrgId === ownerOrgId).length
  return { rows, sharedLotCount }
}

// ---------- Navigation ----------

export type RailItem = { id: string; label: string; href: string; greyed?: boolean; tag?: string; children?: RailItem[] }
export type RailSection = { id: string; title: string; items: RailItem[] }

/** The left rail, built from the world and the persona (brief 09 section 4). IDs only in links, never names. */
export function railView(world: World, personaId: string): RailSection[] {
  const role = roleOrNull(world, personaId)
  const projects = projectsFor(world, personaId)
  switch (role) {
    case 'surveyor':
      return [
        {
          id: 'clients',
          title: 'Clients',
          items: clientsFor(world, personaId).map((g) => ({
            id: g.org.id,
            label: g.org.name,
            href: `/buildings/${g.buildings[0].id}/inventory`,
            children: g.buildings.map((b) => ({
              id: b.id,
              label: b.name,
              href: `/buildings/${b.id}/inventory`,
              children: [
                { id: `${b.id}-inventory`, label: 'Inventory', href: `/buildings/${b.id}/inventory` },
                { id: `${b.id}-capture`, label: 'Capture', href: `/buildings/${b.id}/capture` },
              ],
            })),
          })),
        },
      ]
    case 'seller':
      return [
        {
          id: 'buildings',
          title: 'Buildings',
          items: buildingsFor(world, personaId).map((b) => ({
            id: b.id,
            label: b.name,
            href: `/buildings/${b.id}/inventory`,
            children: [
              { id: `${b.id}-inventory`, label: 'Inventory', href: `/buildings/${b.id}/inventory` },
              { id: `${b.id}-priority`, label: 'Priority', href: `/buildings/${b.id}/priority` },
              { id: `${b.id}-listings`, label: 'Listings and visibility', href: `/buildings/${b.id}/listings` },
            ],
          })),
        },
        { id: 'offers', title: 'Offers and deals', items: [{ id: 'offers', label: 'Offers and deals', href: '/offers' }] },
      ]
    case 'architect':
      return [
        {
          id: 'marketplace',
          title: 'Marketplace',
          items: [
            { id: 'browse', label: 'Browse', href: '/market' },
            { id: 'shared', label: 'Shared with you', href: '/market/shared' },
            { id: 'saved', label: 'Saved', href: '/saved' },
          ],
        },
        {
          id: 'projects',
          title: 'Projects',
          items: [
            ...architectProjects(world, personaId).map((p) => ({
              id: p.id,
              label: p.name,
              href: `/projects/${p.id}/wishlist`,
              children: [
                { id: `${p.id}-wishlist`, label: 'Wish list', href: `/projects/${p.id}/wishlist` },
                { id: `${p.id}-spec`, label: 'Spec sheet', href: `/projects/${p.id}/spec` },
                { id: `${p.id}-match`, label: 'Match schedule', href: `/projects/${p.id}/match`, greyed: true, tag: 'V2' },
              ],
            })),
            { id: 'new-project', label: 'New project', href: '/projects/new' },
          ],
        },
      ]
    case 'client':
      return [
        {
          id: 'projects',
          title: 'Projects',
          items: projects
            .filter((p) => isProjectClient(world, personaId, p.id))
            .map((p) => ({
              id: p.id,
              label: p.name,
              href: `/projects/${p.id}/approvals`,
              children: [
                { id: `${p.id}-approvals`, label: 'Approvals', href: `/projects/${p.id}/approvals` },
                { id: `${p.id}-match`, label: 'Match schedule (advanced)', href: `/projects/${p.id}/match` },
                { id: `${p.id}-plan`, label: 'Reuse plan', href: `/projects/${p.id}/plan` },
                { id: `${p.id}-deals`, label: 'Deals', href: `/projects/${p.id}/deals` },
              ],
            })),
        },
      ]
    case 'consultant':
      return [
        {
          id: 'projects',
          title: 'Projects',
          items: projects
            .filter((p) => isProjectConsultant(world, personaId, p.id))
            .map((p) => ({
              id: p.id,
              label: p.name,
              href: `/projects/${p.id}/compliance`,
              children: [
                { id: `${p.id}-compliance`, label: 'Compliance', href: `/projects/${p.id}/compliance` },
                { id: `${p.id}-review`, label: 'Wish list review', href: `/projects/${p.id}/review` },
              ],
            })),
        },
        {
          id: 'engagements',
          title: 'Engagements',
          items: engagementsFor(world, personaId).map((e) => ({
            id: e.id,
            label: e.name,
            href: `/engagements/${e.id}/waste`,
            children: [{ id: `${e.id}-waste`, label: 'Waste and reuse', href: `/engagements/${e.id}/waste` }],
          })),
        },
      ]
    case 'operator':
      return [
        {
          id: 'platform',
          title: 'Platform',
          items: [
            { id: 'ledger', label: 'Ledger', href: '/operator/ledger' },
            { id: 'models', label: 'Model comparison', href: '/operator/models' },
          ],
        },
      ]
    default:
      return []
  }
}

/** Where /projects/:projectId sends this persona, or null when the project is not theirs. */
export function projectHomeFor(world: World, personaId: string, projectId: string): string | null {
  if (isProjectArchitect(world, personaId, projectId)) return `/projects/${projectId}/wishlist`
  if (isProjectClient(world, personaId, projectId)) return `/projects/${projectId}/approvals`
  if (isProjectConsultant(world, personaId, projectId)) return `/projects/${projectId}/compliance`
  return null
}

/** The persona's first screen after picking a role on the landing page. */
export function homeFor(world: World, personaId: string): string {
  const role = roleOrNull(world, personaId)
  const firstProject = projectsFor(world, personaId)[0]
  const firstBuilding = buildingsFor(world, personaId)[0]
  switch (role) {
    case 'surveyor':
      return firstBuilding ? `/buildings/${firstBuilding.id}/capture` : '/'
    case 'seller':
      return firstBuilding ? `/buildings/${firstBuilding.id}/inventory` : '/'
    case 'architect':
      return '/market'
    case 'client':
      return firstProject ? `/projects/${firstProject.id}/approvals` : '/'
    case 'consultant':
      return firstProject ? `/projects/${firstProject.id}/compliance` : '/'
    case 'operator':
      return '/operator/ledger'
    default:
      return '/'
  }
}
