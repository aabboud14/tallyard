// Version 1.0 store actions (brief/09-V1-PRODUCT.md sections 3, 5.8 and 13.4 to 13.6). Pure: World in, World out.
// Every action checks the persona's role and access first. When the action is not allowed it changes nothing and
// returns an error string for the screen to show.
import type { Lot, Project, World } from '../domain/types'
import type { ProjectType, Wishlist, WishlistItem } from '../domain/v1types'
import { DEMO_TODAY } from '../domain/constants'
import { isOnOrBefore, fromUtcMs, toUtcMs } from '../domain/dates'
import { canAccess, roleOf, type Role } from '../domain/access'
import { DEFAULT_ASSUMPTIONS as A, REGIONS } from '../domain/reference/assumptions'
import { V1_ASSUMPTIONS } from '../domain/reference/v1assumptions'
import { NOT_AVAILABLE_TO_ROLE, NOT_SHARED } from '../domain/reference/labels'
import { listingFor, lotsVisibleToProject } from '../domain/visibility'
import { addToWishlist, decideItem, editNote, MOVE_REASONS, putItem, reopenItem, removeFromWishlist, takeItem } from '../domain/engines/wishlist'
import { ORG_IDS } from '../domain/seed/world'
import { acceptTerms } from './actions'

export const V1_ERRORS = {
  role: NOT_AVAILABLE_TO_ROLE,
  noLot: 'This listing is not available.',
  notShared: 'Not shared with this project.',
  revoked: NOT_SHARED,
  notAvailable: 'No longer available.',
  sharedToSaved: 'Shared in confidence with a project. It can be saved only to a project it is shared with.',
  sharedMove: 'Shared in confidence with this project. It cannot be moved.',
  noItem: 'Not on this list.',
  approvedRemove: MOVE_REASONS.approved,
  sameList: MOVE_REASONS.present,
  nothingToSend: 'Nothing pending to send.',
  notSent: 'Only an item sent to the client can be decided.',
  notDeclined: 'Only a declined item can be reopened.',
  noteLocked: 'The note can be edited only while the item is pending or declined.',
  notPrivate: 'The date can be changed only while the lot is private.',
  badDate: 'Enter a valid date.',
  pastDate: 'The date must be today or later.',
  name: 'Enter a project name.',
  clientName: 'Enter the client.',
  clientNotBuyer: 'This organisation cannot be a client in this prototype.',
  duplicateName: 'A project with this name already exists.',
  projectType: 'Choose a project type.',
  region: 'Choose a region.',
  notOwner: 'Only an asset owner with buildings can share lots.',
  noProject: 'No such project.',
} as const

export type V1Result = { world: World; error: string | null }

function ok(world: World): V1Result {
  return { world, error: null }
}

function fail(world: World, error: string): V1Result {
  return { world, error }
}

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

/** The persona is the project's architect practice and may open it. */
export function isProjectArchitect(world: World, personaId: string, projectId: string): boolean {
  const p = world.projects[projectId]
  if (!p || roleOrNull(world, personaId) !== 'architect') return false
  return p.architectOrgId === orgIdOf(world, personaId) && canAccess(world, personaId, { projectId })
}

/** The persona is the project's paying client and may open it. */
export function isProjectClient(world: World, personaId: string, projectId: string): boolean {
  const p = world.projects[projectId]
  if (!p || roleOrNull(world, personaId) !== 'client') return false
  return p.clientOrgId === orgIdOf(world, personaId) && canAccess(world, personaId, { projectId })
}

/** The persona is the project's sustainability consultant and may open it. */
export function isProjectConsultant(world: World, personaId: string, projectId: string): boolean {
  const p = world.projects[projectId]
  if (!p || roleOrNull(world, personaId) !== 'consultant') return false
  return p.consultantOrgId === orgIdOf(world, personaId) && canAccess(world, personaId, { projectId })
}

export function lotByPublicIdOrNull(world: World, publicId: string): Lot | null {
  return Object.values(world.lots).find((l) => l.publicId === publicId) ?? null
}

export function isLotAvailable(world: World, lot: Lot): boolean {
  return listingFor(world, lot.id, A).status === 'Available'
}

export function projectCanSee(world: World, project: Project, lot: Lot): boolean {
  return lotsVisibleToProject(world, project).includes(lot.id)
}

/** The project's wish list, if it has one. */
export function projectWishlist(world: World, projectId: string): Wishlist | null {
  const p = world.projects[projectId]
  if (!p) return null
  return Object.values(world.wishlists).find((l) => l.projectId === projectId && l.orgId === p.architectOrgId) ?? null
}

/** The practice's general list (no project), if it has one. */
export function generalWishlist(world: World, orgId: string): Wishlist | null {
  return Object.values(world.wishlists).find((l) => l.projectId === null && l.orgId === orgId) ?? null
}

function suffix(id: string): string {
  const i = id.indexOf('_')
  return i < 0 ? id : id.slice(i + 1)
}

/** The list holding an item, by item ID. Item IDs carry their list's suffix, so they are unique across lists. */
export function listOfItem(world: World, itemId: string): { list: Wishlist; item: WishlistItem } | null {
  for (const list of Object.values(world.wishlists)) {
    const item = list.items.find((x) => x.id === itemId)
    if (item) return { list, item }
  }
  return null
}

/** The architect may change a list held by their practice, on a project they can open, or their general list. */
function architectOwnsList(world: World, personaId: string, list: Wishlist): boolean {
  if (roleOrNull(world, personaId) !== 'architect' || list.orgId !== orgIdOf(world, personaId)) return false
  return list.projectId === null || isProjectArchitect(world, personaId, list.projectId)
}

function withList(world: World, list: Wishlist): World {
  const w = structuredClone(world)
  w.wishlists[list.id] = structuredClone(list)
  return w
}

// ---------- Projects ----------

export type NewProjectInput = { name: string; clientName: string; projectType: ProjectType; localAuthority: string; region: string; startDate: string }

const PROJECT_TYPES: ProjectType[] = ['office', 'hotel', 'residential', 'other']

/** A strict ISO calendar date: the right shape and a real day. */
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return fromUtcMs(toUtcMs(s)) === s
}

/** Six base 36 characters from a 32-bit FNV-1a hash. Deterministic, opaque, never a name. */
function opaque(seed: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).padStart(7, '0').slice(-6)
}

/** The next free project ID for this practice: deterministic from the practice and a counter. */
export function nextProjectId(world: World, architectOrgId: string): string {
  for (let n = 1; ; n++) {
    const id = `prj_${opaque(`${architectOrgId}:project:${n}`)}`
    if (!world.projects[id] && !world.wishlists[`wl_${suffix(id)}`]) return id
  }
}

function clientOrgFor(world: World, architectOrgId: string, clientName: string): { orgId: string; create: boolean } | { error: string } {
  const key = clientName.trim().toLowerCase()
  const named = (id: string) => world.orgs[id]?.name.trim().toLowerCase() === key
  // The practice cannot be its own client.
  if (named(architectOrgId)) return { error: V1_ERRORS.clientNotBuyer }
  // Reuse an existing organisation only when it is a developer or already a client of this practice. Any other
  // name, a seller's included, gets a new developer record, so the form never tells the architect who sells lots
  // (R3). The seller's own record is never the client (13.1).
  const ownClients = new Set(Object.values(world.projects).filter((p) => p.architectOrgId === architectOrgId).map((p) => p.clientOrgId))
  const found = Object.values(world.orgs).find((o) => named(o.id) && (o.type === 'Developer' || ownClients.has(o.id)))
  if (found) return { orgId: found.id, create: false }
  for (let n = 1; ; n++) {
    const id = `org_${opaque(`client:${key}:${n}`)}`
    if (!world.orgs[id]) return { orgId: id, create: true }
  }
}

export type NewProjectDraft = Omit<NewProjectInput, 'projectType'> & { projectType: ProjectType | null }

/** Every field error in a new project form at once, in form order. The checks that need the world (a duplicate
 * name, the client) stay in createProject. */
export function validateNewProject(input: NewProjectDraft): [keyof NewProjectInput, string][] {
  const out: [keyof NewProjectInput, string][] = []
  if (!input.name.trim()) out.push(['name', V1_ERRORS.name])
  if (!input.clientName.trim()) out.push(['clientName', V1_ERRORS.clientName])
  if (input.projectType === null || !PROJECT_TYPES.includes(input.projectType)) out.push(['projectType', V1_ERRORS.projectType])
  if (!(REGIONS as readonly string[]).includes(input.region)) out.push(['region', V1_ERRORS.region])
  if (!isIsoDate(input.startDate)) out.push(['startDate', V1_ERRORS.badDate])
  else if (!isOnOrBefore(DEMO_TODAY, input.startDate)) out.push(['startDate', V1_ERRORS.pastDate])
  return out
}

/** Brief 09 section 13.6: the architect creates a project with its own empty wish list. */
export function createProject(world: World, personaId: string, input: NewProjectInput): { world: World; projectId: string | null; error: string | null } {
  const no = (error: string) => ({ world, projectId: null, error })
  if (roleOrNull(world, personaId) !== 'architect') return no(V1_ERRORS.role)
  const architectOrgId = orgIdOf(world, personaId)!
  const name = input.name.trim()
  const clientName = input.clientName.trim()
  const invalid = validateNewProject(input)
  if (invalid.length > 0) return no(invalid[0][1])
  const taken = Object.values(world.projects).some((p) => p.architectOrgId === architectOrgId && p.name.trim().toLowerCase() === name.toLowerCase())
  if (taken) return no(V1_ERRORS.duplicateName)
  const client = clientOrgFor(world, architectOrgId, clientName)
  if ('error' in client) return no(client.error)

  const w = structuredClone(world)
  if (client.create) w.orgs[client.orgId] = { id: client.orgId, name: clientName, type: 'Developer' }
  const id = nextProjectId(w, architectOrgId)
  const start = input.startDate
  const project: Project = {
    id,
    name,
    developerOrgId: client.orgId,
    clientOrgId: client.orgId,
    architectOrgId,
    projectType: input.projectType,
    startDate: start,
    createdBy: personaId,
    teamOrgIds: [architectOrgId, ORG_IDS.halewick],
    teamPersonaIds: [personaId],
    postcodeDistrict: '',
    localAuthority: input.localAuthority.trim(),
    region: input.region,
    blind: { orgType: 'Design team', projectType: `${input.projectType} project` },
    giaM2: 0,
    ribaStage: 1,
    description: '',
    keyDates: { planningSubmission: start, steelNeedBy: start },
    frameMassT: 0,
    billOfMaterials: [],
    requirements: [],
    matchResult: null,
    planItems: [],
    termsAccepted: false,
    approvedByOwnerOrgIds: [],
    seededDeals: [],
    hubDistancesKm: { ...V1_ASSUMPTIONS.regionHubKm[input.region] },
    consultantOrgId: ORG_IDS.halewick,
    targets: { contentByValue: 0, avoidedCarbonT: 0 },
  }
  w.projects[id] = project
  const listId = `wl_${suffix(id)}`
  w.wishlists[listId] = { id: listId, orgId: architectOrgId, projectId: id, items: [] }
  return { world: w, projectId: id, error: null }
}

/** The architect or the client accepts the confidentiality terms for the project (L7). Terms are per project. */
export function acceptProjectTerms(world: World, personaId: string, projectId: string): V1Result {
  if (!world.projects[projectId]) return fail(world, V1_ERRORS.noProject)
  if (!isProjectArchitect(world, personaId, projectId) && !isProjectClient(world, personaId, projectId)) return fail(world, V1_ERRORS.role)
  if (world.projects[projectId].termsAccepted) return ok(world)
  return ok(acceptTerms(world, projectId))
}

// ---------- Wish lists: the architect ----------

/** Why a lot cannot go to a target list, or null when it can (13.4). */
export function saveBlock(world: World, lot: Lot | null, projectId: string | null): string | null {
  if (!lot || lot.visibility === 'private') return V1_ERRORS.noLot
  if (projectId === null) {
    if (lot.visibility !== 'open') return V1_ERRORS.sharedToSaved
  } else {
    const p = world.projects[projectId]
    if (!p) return V1_ERRORS.noProject
    if (!projectCanSee(world, p, lot)) return V1_ERRORS.notShared
  }
  if (!isLotAvailable(world, lot)) return V1_ERRORS.notAvailable
  return null
}

/** Saves a listing to a project's wish list or to the practice's general list. Saving twice is a no-op. */
export function saveToWishlist(world: World, personaId: string, publicId: string, projectId: string | null): V1Result {
  if (roleOrNull(world, personaId) !== 'architect') return fail(world, V1_ERRORS.role)
  if (projectId !== null && !isProjectArchitect(world, personaId, projectId)) return fail(world, V1_ERRORS.role)
  const lot = lotByPublicIdOrNull(world, publicId)
  const blocked = saveBlock(world, lot, projectId)
  if (blocked) return fail(world, blocked)
  const orgId = orgIdOf(world, personaId)!
  let list = projectId === null ? generalWishlist(world, orgId) : projectWishlist(world, projectId)
  if (!list) {
    const id = projectId === null ? `wl_${suffix(orgId)}` : `wl_${suffix(projectId)}`
    list = { id, orgId, projectId, items: [] }
  }
  const next = addToWishlist(list, publicId, personaId)
  if (next === list && world.wishlists[list.id]) return ok(world)
  return ok(withList(world, next))
}

/** Removes an item. An approved item stays (13.5). */
export function removeWish(world: World, personaId: string, itemId: string): V1Result {
  const found = listOfItem(world, itemId)
  if (!found) return fail(world, V1_ERRORS.noItem)
  if (!architectOwnsList(world, personaId, found.list)) return fail(world, V1_ERRORS.role)
  if (found.item.status === 'approved') return fail(world, V1_ERRORS.approvedRemove)
  return ok(withList(world, removeFromWishlist(found.list, itemId)))
}

/** Moves a pending or declined item to another project's list or to the general list. A shared lot never moves (13.4). */
export function moveWish(world: World, personaId: string, itemId: string, toProjectId: string | null): V1Result {
  const found = listOfItem(world, itemId)
  if (!found) return fail(world, V1_ERRORS.noItem)
  if (!architectOwnsList(world, personaId, found.list)) return fail(world, V1_ERRORS.role)
  if (toProjectId !== null && !isProjectArchitect(world, personaId, toProjectId)) return fail(world, V1_ERRORS.role)
  if (found.list.projectId === toProjectId) return fail(world, V1_ERRORS.sameList)
  const lot = lotByPublicIdOrNull(world, found.item.publicId)
  if (lot && lot.visibility === 'matched_only') return fail(world, V1_ERRORS.sharedMove)
  const blocked = saveBlock(world, lot, toProjectId)
  if (blocked) return fail(world, blocked)
  const taken = takeItem(found.list, itemId)
  if (!taken.item) return fail(world, taken.reason ?? V1_ERRORS.noItem)
  const orgId = found.list.orgId
  const target = (toProjectId === null ? generalWishlist(world, orgId) : projectWishlist(world, toProjectId)) ?? {
    id: toProjectId === null ? `wl_${suffix(orgId)}` : `wl_${suffix(toProjectId)}`,
    orgId,
    projectId: toProjectId,
    items: [],
  }
  const put = putItem(target, taken.item)
  if (put.reason) return fail(world, put.reason)
  return ok(withList(withList(world, taken.list), put.list))
}

export function editWishNote(world: World, personaId: string, itemId: string, note: string): V1Result {
  const found = listOfItem(world, itemId)
  if (!found) return fail(world, V1_ERRORS.noItem)
  if (!architectOwnsList(world, personaId, found.list)) return fail(world, V1_ERRORS.role)
  if (found.item.status !== 'pending' && found.item.status !== 'declined') return fail(world, V1_ERRORS.noteLocked)
  const next = editNote(found.list, itemId, note)
  return next === found.list ? ok(world) : ok(withList(world, next))
}

/** Sends every pending item the project can still see, and that is still available, to the client. */
export function sendWishlist(world: World, personaId: string, projectId: string): V1Result {
  if (!isProjectArchitect(world, personaId, projectId)) return fail(world, V1_ERRORS.role)
  const list = projectWishlist(world, projectId)
  const p = world.projects[projectId]
  if (!list) return fail(world, V1_ERRORS.nothingToSend)
  const sendable = (it: WishlistItem) => {
    if (it.status !== 'pending') return false
    const lot = lotByPublicIdOrNull(world, it.publicId)
    return !!lot && projectCanSee(world, p, lot) && isLotAvailable(world, lot)
  }
  if (!list.items.some(sendable)) return fail(world, V1_ERRORS.nothingToSend)
  const next: Wishlist = { ...list, items: list.items.map((it) => (sendable(it) ? { ...it, status: 'sent' as const } : it)) }
  return ok(withList(world, next))
}

/** A declined item goes back to pending with the architect's new note (13.5). */
export function reopenWish(world: World, personaId: string, itemId: string, note: string): V1Result {
  const found = listOfItem(world, itemId)
  if (!found) return fail(world, V1_ERRORS.noItem)
  if (!architectOwnsList(world, personaId, found.list)) return fail(world, V1_ERRORS.role)
  if (found.item.status !== 'declined') return fail(world, V1_ERRORS.notDeclined)
  return ok(withList(world, reopenItem(found.list, itemId, note)))
}

// ---------- Wish lists: the client ----------

/** The client approves or declines an item sent to them, with a note. Only rows the project can still see. */
export function decideWish(world: World, personaId: string, projectId: string, itemId: string, decision: 'approved' | 'declined', note: string): V1Result {
  if (!isProjectClient(world, personaId, projectId)) return fail(world, V1_ERRORS.role)
  const list = projectWishlist(world, projectId)
  const item = list?.items.find((x) => x.id === itemId)
  if (!list || !item) return fail(world, V1_ERRORS.noItem)
  if (item.status !== 'sent') return fail(world, V1_ERRORS.notSent)
  const lot = lotByPublicIdOrNull(world, item.publicId)
  if (!lot || !projectCanSee(world, world.projects[projectId], lot)) return fail(world, V1_ERRORS.revoked)
  if (!isLotAvailable(world, lot)) return fail(world, V1_ERRORS.notAvailable)
  return ok(withList(world, decideItem(list, itemId, decision, note.trim())))
}

// ---------- The selling owner ----------

/** The owner sets a lot's availability date while the lot is still private (13.3). */
export function setLotAvailability(world: World, personaId: string, lotId: string, isoDate: string): V1Result {
  const lot = world.lots[lotId]
  if (!lot || roleOrNull(world, personaId) !== 'seller') return fail(world, V1_ERRORS.role)
  const item = world.items[lot.itemId]
  const building = world.buildings[item.buildingId]
  if (building.ownerOrgId !== orgIdOf(world, personaId) || !canAccess(world, personaId, { buildingId: building.id })) return fail(world, V1_ERRORS.role)
  if (lot.visibility !== 'private') return fail(world, V1_ERRORS.notPrivate)
  if (!isIsoDate(isoDate)) return fail(world, V1_ERRORS.badDate)
  if (lot.availableFrom === isoDate) return ok(world)
  const w = structuredClone(world)
  w.lots[lotId].availableFrom = isoDate
  return ok(w)
}

/** The owner shares lots for private matching with a project, or revokes the share. The project stays blind. */
export function setOwnerProjectApproval(world: World, ownerOrgId: string, projectId: string, approved: boolean): V1Result {
  const org = world.orgs[ownerOrgId]
  const ownsBuilding = Object.values(world.buildings).some((b) => b.ownerOrgId === ownerOrgId)
  if (!org || org.type !== 'Asset owner' || !ownsBuilding) return fail(world, V1_ERRORS.notOwner)
  const p = world.projects[projectId]
  if (!p) return fail(world, V1_ERRORS.noProject)
  const has = p.approvedByOwnerOrgIds.includes(ownerOrgId)
  if (has === approved) return ok(world)
  const w = structuredClone(world)
  const list = w.projects[projectId].approvedByOwnerOrgIds
  w.projects[projectId].approvedByOwnerOrgIds = approved ? [...list, ownerOrgId] : list.filter((x) => x !== ownerOrgId)
  return ok(w)
}
