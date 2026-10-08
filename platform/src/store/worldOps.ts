// Pure world updates, adapted from the demo's actions (src/store/actions.ts in the repository root).
// They do not check who acts: the platform actions in ./actions do that first.
import type { InventoryItem, LocationLevel, Lot, Photo, Quantity, Spec, TimingLevel, Visibility, World, Condition, Recoverability } from '../domain/types'

export function setDisclosure(world: World, buildingId: string, patch: { locationLevel?: LocationLevel; timingLevel?: TimingLevel }): World {
  const w = structuredClone(world)
  Object.assign(w.buildings[buildingId], patch)
  return w
}

export function setPhotoPublic(world: World, itemId: string, photoId: string, isPublic: boolean): World {
  const w = structuredClone(world)
  const p = w.items[itemId]?.photos.find((x) => x.id === photoId)
  if (p) p.isPublic = isPublic
  return w
}

/** Region, quarter and every photo private. Visibility, ask and reserve are left alone. */
export function resetDisclosureDefaults(world: World, buildingId: string): World {
  const w = structuredClone(world)
  const b = w.buildings[buildingId]
  b.locationLevel = 'region'
  b.timingLevel = 'quarter'
  for (const item of Object.values(w.items)) if (item.buildingId === buildingId) for (const p of item.photos) p.isPublic = false
  return w
}

/** Shares or publishes a lot at an ask and reserve. The listed month is set the first time it leaves private. */
export function publishLot(world: World, lotId: string, input: { visibility: Exclude<Visibility, 'private'>; ask: number; reserve: number }, listedMonth: string): World {
  if (input.reserve > input.ask) throw new Error('The reserve cannot be above the ask')
  const w = structuredClone(world)
  const lot = w.lots[lotId]
  lot.visibility = input.visibility
  lot.askPerUnit = input.ask
  lot.reservePerUnit = input.reserve
  lot.listedMonth = lot.listedMonth ?? listedMonth
  return w
}

export function makePrivate(world: World, lotId: string): World {
  const w = structuredClone(world)
  w.lots[lotId].visibility = 'private'
  return w
}

/** The owner shares lots for private matching with a project, or revokes. */
export function setOwnerProjectApproval(world: World, ownerOrgId: string, projectId: string, approved: boolean): World {
  const p = world.projects[projectId]
  if (!p || p.approvedByOwnerOrgIds.includes(ownerOrgId) === approved) return world
  const w = structuredClone(world)
  const list = w.projects[projectId].approvedByOwnerOrgIds
  w.projects[projectId].approvedByOwnerOrgIds = approved ? [...list, ownerOrgId] : list.filter((x) => x !== ownerOrgId)
  return w
}

export function setTermsAccepted(world: World, projectId: string): World {
  if (world.projects[projectId]?.termsAccepted !== false) return world
  const w = structuredClone(world)
  w.projects[projectId].termsAccepted = true
  return w
}

/** The next tag for a building: its prefix (from its first tag, or the initials of its name) and the next number. */
export function nextTag(world: World, buildingId: string): string {
  const tags = Object.values(world.items)
    .filter((i) => i.buildingId === buildingId)
    .map((i) => i.tag)
  const fromName = (world.buildings[buildingId]?.name ?? '')
    .split(/\s+/)
    .filter((x) => /^[A-Za-z]/.test(x))
    .map((x) => x[0].toUpperCase())
    .join('')
    .slice(0, 3)
  const prefix = tags[0]?.split('-')[0] ?? (fromName || 'IT')
  const max = Math.max(0, ...tags.map((t) => Number(t.split('-')[1]) || 0))
  return `${prefix}-${String(max + 1).padStart(2, '0')}`
}

export type CaptureFields = {
  buildingId: string
  spec: Spec
  quantity: Quantity
  condition: Condition
  recoverability: Recoverability
  location: string
  notes: string
  photos: Photo[]
  /** The surveyor's expected availability (ISO date). Defaults to the building's dismantling start. */
  expectedAvailableFrom: string | null
}

/** A new item and its private lot, with IDs chosen by the caller. */
export function addCapturedItem(world: World, input: CaptureFields, ids: { itemId: string; lotId: string; publicId: string }, by: { name: string; today: string }): { world: World; tag: string } {
  const w = structuredClone(world)
  const building = w.buildings[input.buildingId]
  const tag = nextTag(w, input.buildingId)
  const expected = input.expectedAvailableFrom ?? building.programme.dismantlingStart
  const item: InventoryItem = {
    id: ids.itemId,
    buildingId: input.buildingId,
    tag,
    family: input.spec.family,
    spec: input.spec,
    quantity: input.quantity,
    condition: input.condition,
    recoverability: input.recoverability,
    testStatus: 'untested',
    grade: input.spec.family === 'steel_section' ? 'unknown' : null,
    location: input.location,
    photos: input.photos,
    notes: input.notes,
    capturedBy: by.name,
    capturedOn: by.today,
    expectedAvailableFrom: expected,
  }
  w.items[ids.itemId] = item
  const lot: Lot = {
    id: ids.lotId,
    itemId: ids.itemId,
    publicId: ids.publicId,
    visibility: 'private',
    piecesOnOffer: input.quantity.kind === 'pieces' ? input.quantity.pieces : null,
    shareOnOffer: 1,
    availableFrom: expected,
    inStock: null,
    listedMonth: null,
    askPerUnit: null,
    reservePerUnit: null,
    sold: false,
  }
  w.lots[ids.lotId] = lot
  return { world: w, tag }
}
