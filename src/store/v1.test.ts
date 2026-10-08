// Version 1.0 store: actions and view models (brief/09-V1-PRODUCT.md sections 3, 4 and 13).
import { describe, it, expect } from 'vitest'
import { closeTo } from '../test/helpers'
import type { World } from '../domain/types'
import { NO_FILTERS } from '../domain/v1types'
import { createSeed, itemByTag, lotForItem, ORG_IDS, PERSONA_IDS as P, MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID, TIVERNE_ID, HARROWDEN_ID, DURNLEY_ID } from '../domain/seed/world'
import { DEMO_TODAY } from '../domain/constants'
import { DEFAULT_ASSUMPTIONS as A } from '../domain/reference/assumptions'
import { V1_ASSUMPTIONS } from '../domain/reference/v1assumptions'
import { LABELS, NOT_SHARED } from '../domain/reference/labels'
import { projectsFor } from '../domain/access'
import { listingFor } from '../domain/visibility'
import { toBlindBuyer } from '../domain/privacy/blindBuyer'
import { lotPrivateStrings, projectPrivateStrings, INTERNAL_ID } from '../domain/privacy/privateStrings'
import { MOVE_REASONS } from '../domain/engines/wishlist'
import { NO_SECTION_SIZE } from '../domain/engines/geometry'
import { publishLot } from './actions'
import { useStore } from './store'
import {
  V1_ERRORS,
  acceptProjectTerms,
  createProject,
  validateNewProject,
  decideWish,
  editWishNote,
  moveWish,
  nextProjectId,
  removeWish,
  reopenWish,
  saveToWishlist,
  sendWishlist,
  setLotAvailability,
  setOwnerProjectApproval,
  isIsoDate,
  type NewProjectInput,
} from './v1actions'
import {
  approvalsView,
  browseView,
  geometryFor,
  homeFor,
  listingDetailView,
  ownerSharingView,
  projectHomeFor,
  railView,
  reviewView,
  savedView,
  sharedView,
  specSheetView,
  supplyTreeView,
  wishlistView,
  type RailItem,
} from './v1selectors'

const TH01 = 'L-9F4CQQ'
const SHARED = ['L-WPX5A6', 'L-MNY55K', 'L-2R8X5N', 'L-775DW8', 'L-FQK92P']
const OPEN_STEEL = 'L-NHZ32R'
const SOLD_STONE = 'L-R8Q33F'
const PRIVATE_STONE = 'L-DAXNV3'
const TIMBER = 'L-CJGQP7'

function lotId(w: World, tag: string): string {
  return lotForItem(w, itemByTag(w, tag).id).id
}

/** Fresh seed with TH-01 published to the open marketplace, as demo step 3 leaves it. */
function seedAfterStep3(): World {
  const w = createSeed()
  return publishLot(w, lotId(w, 'TH-01'), { visibility: 'open', ask: 800, reserve: 730 })
}

/** Runs a pure action and fails the test if it returned an error. */
function must(r: { world: World; error: string | null }): World {
  expect(r.error).toBeNull()
  return r.world
}

function listOf(w: World, projectId: string | null) {
  return Object.values(w.wishlists).find((l) => l.projectId === projectId && l.orgId === ORG_IDS.oriel)!
}

const NEW_PROJECT: NewProjectInput = { name: 'Sample office', clientName: 'lantern quay developments', projectType: 'office', localAuthority: 'Hackney', region: 'Inner London East', startDate: '2028-03-06' }

describe('createProject (13.6)', () => {
  it('builds a full project with a deterministic opaque ID and its own empty wish list', () => {
    const w0 = createSeed()
    const r = createProject(w0, P.priya, NEW_PROJECT)
    expect(r.error).toBeNull()
    expect(r.projectId).toMatch(/^prj_[0-9a-z]{6}$/)
    expect(createProject(createSeed(), P.priya, NEW_PROJECT).projectId).toBe(r.projectId)
    expect(nextProjectId(w0, ORG_IDS.oriel)).toBe(r.projectId)
    const p = r.world.projects[r.projectId!]
    expect(p).toMatchObject({
      name: 'Sample office',
      clientOrgId: ORG_IDS.lantern,
      developerOrgId: ORG_IDS.lantern,
      architectOrgId: ORG_IDS.oriel,
      projectType: 'office',
      startDate: '2028-03-06',
      createdBy: P.priya,
      localAuthority: 'Hackney',
      region: 'Inner London East',
      blind: { orgType: 'Design team', projectType: 'office project' },
      giaM2: 0,
      ribaStage: 1,
      keyDates: { planningSubmission: '2028-03-06', steelNeedBy: '2028-03-06' },
      frameMassT: 0,
      billOfMaterials: [],
      requirements: [],
      matchResult: null,
      planItems: [],
      seededDeals: [],
      termsAccepted: false,
      approvedByOwnerOrgIds: [],
      consultantOrgId: ORG_IDS.halewick,
      targets: { contentByValue: 0, avoidedCarbonT: 0 },
    })
    expect(p.hubDistancesKm).toEqual(V1_ASSUMPTIONS.regionHubKm['Inner London East'])
    const lists = Object.values(r.world.wishlists).filter((l) => l.projectId === r.projectId)
    expect(lists).toHaveLength(1)
    expect(lists[0]).toMatchObject({ orgId: ORG_IDS.oriel, items: [] })
    expect(Object.keys(r.world.orgs)).toHaveLength(Object.keys(w0.orgs).length)
    // The architect, the client and the consultant reach it; the seller does not.
    for (const id of [P.priya, P.isla, P.marcus]) expect(projectsFor(r.world, id).map((x) => x.id)).toContain(r.projectId)
    expect(projectsFor(r.world, P.tom)).toHaveLength(0)
    // The original world is untouched.
    expect(w0.projects[r.projectId!]).toBeUndefined()
  })

  it('creates a new client as a developer, and a second project gets a new ID', () => {
    const r1 = createProject(createSeed(), P.priya, { ...NEW_PROJECT, clientName: 'Sample client', projectType: 'residential' })
    const p1 = r1.world.projects[r1.projectId!]
    expect(r1.world.orgs[p1.clientOrgId]).toMatchObject({ name: 'Sample client', type: 'Developer' })
    expect(p1.clientOrgId).toMatch(/^org_[0-9a-z]{6}$/)
    expect(p1.blind.projectType).toBe('residential project')
    const r2 = createProject(r1.world, P.priya, { ...NEW_PROJECT, name: 'Sample hotel', clientName: 'Sample client' })
    expect(r2.error).toBeNull()
    expect(r2.projectId).not.toBe(r1.projectId)
    expect(r2.world.projects[r2.projectId!].clientOrgId).toBe(p1.clientOrgId)
    expect(toBlindBuyer(p1)).toEqual({ orgType: 'Design team', projectType: 'residential project', region: 'Inner London East', needByQuarter: 'Q1 2028' })
    const text = JSON.stringify(toBlindBuyer(p1))
    for (const s of projectPrivateStrings(p1, r1.world)) expect(text).not.toContain(s)
  })

  it('refuses other roles and bad input, and changes nothing', () => {
    const w = createSeed()
    const cases: [string, NewProjectInput, string][] = [
      [P.isla, NEW_PROJECT, V1_ERRORS.role],
      [P.tom, NEW_PROJECT, V1_ERRORS.role],
      [P.priya, { ...NEW_PROJECT, name: '  ' }, V1_ERRORS.name],
      [P.priya, { ...NEW_PROJECT, clientName: '' }, V1_ERRORS.clientName],
      [P.priya, { ...NEW_PROJECT, region: 'Somewhere' }, V1_ERRORS.region],
      [P.priya, { ...NEW_PROJECT, startDate: '2027-02-30' }, V1_ERRORS.badDate],
      [P.priya, { ...NEW_PROJECT, startDate: '2026-10-06' }, V1_ERRORS.pastDate],
      [P.priya, { ...NEW_PROJECT, name: 'Sallow Court' }, V1_ERRORS.duplicateName],
      [P.priya, { ...NEW_PROJECT, clientName: 'Studio Oriel' }, V1_ERRORS.clientNotBuyer],
      [P.priya, { ...NEW_PROJECT, projectType: 'bridge' as never }, V1_ERRORS.projectType],
    ]
    for (const [persona, input, error] of cases) {
      const r = createProject(w, persona, input)
      expect(r.error, input.name + input.clientName).toBe(error)
      expect(r.world).toBe(w)
      expect(r.projectId).toBeNull()
    }
    // A client that buys but sells nothing is accepted.
    expect(createProject(w, P.priya, { ...NEW_PROJECT, clientName: 'Pellory Estates' }).error).toBeNull()
    // R3: a seller's name behaves exactly like an unknown name. It gives a new client organisation, never the
    // seller's own record, so the form cannot tell the architect who sells lots.
    for (const [sellerName, sellerId] of [['Ostlea Estates', ORG_IDS.ostlea], ['Brackwater Estates', ORG_IDS.brackwater]] as const) {
      const seller = createProject(w, P.priya, { ...NEW_PROJECT, clientName: sellerName })
      const unknown = createProject(w, P.priya, { ...NEW_PROJECT, clientName: 'sample client' })
      expect(seller.error).toBeNull()
      expect(unknown.error).toBeNull()
      const clientId = seller.world.projects[seller.projectId!]!.clientOrgId
      expect(clientId).not.toBe(sellerId)
      expect(w.orgs[clientId]).toBeUndefined()
      expect(seller.world.orgs[clientId]!.type).toBe('Developer')
      expect(Object.keys(seller.world.orgs).length).toBe(Object.keys(unknown.world.orgs).length)
    }
    expect(createProject(w, P.priya, { ...NEW_PROJECT, startDate: DEMO_TODAY }).error).toBeNull()
  })

  it('validateNewProject reports every field error at once, in form order', () => {
    const empty = { name: '', clientName: ' ', projectType: null, localAuthority: '', region: '', startDate: '' }
    expect(validateNewProject(empty)).toEqual([
      ['name', V1_ERRORS.name],
      ['clientName', V1_ERRORS.clientName],
      ['projectType', V1_ERRORS.projectType],
      ['region', V1_ERRORS.region],
      ['startDate', V1_ERRORS.badDate],
    ])
    expect(validateNewProject({ ...NEW_PROJECT, startDate: '2026-10-06' })).toEqual([['startDate', V1_ERRORS.pastDate]])
    expect(validateNewProject(NEW_PROJECT)).toEqual([])
  })

  it('isIsoDate accepts only real calendar days', () => {
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2027-02-29')).toBe(false)
    expect(isIsoDate('2027-3-01')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
})

describe('acceptProjectTerms', () => {
  it('the architect or the client accepts for the project; nobody else can', () => {
    const w = createSeed()
    expect(must(acceptProjectTerms(w, P.priya, MERROWGATE_ID)).projects[MERROWGATE_ID].termsAccepted).toBe(true)
    expect(must(acceptProjectTerms(w, P.isla, MERROWGATE_ID)).projects[MERROWGATE_ID].termsAccepted).toBe(true)
    for (const id of [P.marcus, P.tom, P.dana, P.operator]) expect(acceptProjectTerms(w, id, MERROWGATE_ID).error).toBe(V1_ERRORS.role)
    expect(acceptProjectTerms(w, P.isla, SALLOW_ID).error).toBe(V1_ERRORS.role)
    expect(acceptProjectTerms(w, P.priya, 'prj_nope00').error).toBe(V1_ERRORS.noProject)
  })
})

describe('saveToWishlist (13.4)', () => {
  it('saves an open lot to a project as pending; saving twice is a no-op', () => {
    const w0 = createSeed()
    const w1 = must(saveToWishlist(w0, P.priya, OPEN_STEEL, MERROWGATE_ID))
    const items = listOf(w1, MERROWGATE_ID).items
    expect(items).toEqual([{ id: 'wli_hp23zk_1', publicId: OPEN_STEEL, addedOn: DEMO_TODAY, addedByPersonaId: P.priya, note: '', status: 'pending', decidedOn: null, decisionNote: null }])
    expect(listOf(w0, MERROWGATE_ID).items).toHaveLength(0)
    const again = saveToWishlist(w1, P.priya, OPEN_STEEL, MERROWGATE_ID)
    expect(again.error).toBeNull()
    expect(again.world).toBe(w1)
  })

  it('the general list takes open lots only', () => {
    const w = createSeed()
    const w1 = must(saveToWishlist(w, P.priya, OPEN_STEEL, null))
    expect(listOf(w1, null).items.map((i) => i.publicId)).toEqual([TIMBER, OPEN_STEEL])
    const terms = must(acceptProjectTerms(w, P.priya, MERROWGATE_ID))
    expect(saveToWishlist(terms, P.priya, SHARED[0], null).error).toBe(V1_ERRORS.sharedToSaved)
  })

  it('a shared lot goes only to a project that can see it', () => {
    const w = createSeed()
    expect(saveToWishlist(w, P.priya, SHARED[0], MERROWGATE_ID).error).toBe(V1_ERRORS.notShared)
    const terms = must(acceptProjectTerms(w, P.priya, MERROWGATE_ID))
    const w1 = must(saveToWishlist(terms, P.priya, SHARED[0], MERROWGATE_ID))
    expect(listOf(w1, MERROWGATE_ID).items.map((i) => i.publicId)).toEqual([SHARED[0]])
    const sallowTerms = must(acceptProjectTerms(w1, P.priya, SALLOW_ID))
    expect(saveToWishlist(sallowTerms, P.priya, SHARED[0], SALLOW_ID).error).toBe(V1_ERRORS.notShared)
  })

  it('private, sold and unknown lots are refused', () => {
    const w = createSeed()
    expect(saveToWishlist(w, P.priya, PRIVATE_STONE, MERROWGATE_ID).error).toBe(V1_ERRORS.noLot)
    expect(saveToWishlist(w, P.priya, TH01, null).error).toBe(V1_ERRORS.noLot)
    expect(saveToWishlist(w, P.priya, 'L-QQQQQQ', null).error).toBe(V1_ERRORS.noLot)
    expect(saveToWishlist(w, P.priya, SOLD_STONE, MERROWGATE_ID).error).toBe(V1_ERRORS.notAvailable)
  })

  it('the client and the other roles cannot save', () => {
    const w = createSeed()
    for (const id of [P.isla, P.tom, P.dana, P.marcus, P.operator]) {
      const r = saveToWishlist(w, id, OPEN_STEEL, id === P.isla ? MERROWGATE_ID : null)
      expect(r.error).toBe(V1_ERRORS.role)
      expect(r.world).toBe(w)
    }
  })
})

describe('remove, move, edit, send, decide and reopen (13.5)', () => {
  it('removes a pending item; an approved item stays; only the architect removes', () => {
    let w = must(saveToWishlist(seedAfterStep3(), P.priya, TH01, MERROWGATE_ID))
    const id = listOf(w, MERROWGATE_ID).items[0].id
    expect(removeWish(w, P.isla, id).error).toBe(V1_ERRORS.role)
    expect(listOf(must(removeWish(w, P.priya, id)), MERROWGATE_ID).items).toHaveLength(0)
    w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
    w = must(decideWish(w, P.isla, MERROWGATE_ID, id, 'approved', 'Agreed'))
    expect(removeWish(w, P.priya, id).error).toBe(V1_ERRORS.approvedRemove)
    expect(removeWish(w, P.priya, 'wli_none_1').error).toBe(V1_ERRORS.noItem)
  })

  it('moves a pending item from Saved to a project, as pending with a new ID', () => {
    const w = createSeed()
    const w1 = must(moveWish(w, P.priya, 'wli_oriel_1', SALLOW_ID))
    expect(listOf(w1, null).items).toHaveLength(0)
    const moved = listOf(w1, SALLOW_ID).items.at(-1)!
    expect(moved).toMatchObject({ id: 'wli_k2r8sw_3', publicId: TIMBER, status: 'pending' })
    expect(must(moveWish(w1, P.priya, 'wli_k2r8sw_3', null)).wishlists.wl_oriel.items.map((i) => i.publicId)).toEqual([TIMBER])
  })

  it('refuses a move that would break the rules', () => {
    const w = createSeed()
    expect(moveWish(w, P.priya, 'wli_oriel_1', null).error).toBe(V1_ERRORS.sameList)
    expect(moveWish(w, P.priya, 'wli_x6dq3n_1', MERROWGATE_ID).error).toBe(MOVE_REASONS.sent)
    expect(moveWish(w, P.isla, 'wli_k2r8sw_1', MERROWGATE_ID).error).toBe(V1_ERRORS.role)
    const both = must(saveToWishlist(w, P.priya, 'L-Q23X7N', MERROWGATE_ID))
    expect(moveWish(both, P.priya, 'wli_k2r8sw_1', MERROWGATE_ID).error).toBe(MOVE_REASONS.present)
    let shared = must(acceptProjectTerms(w, P.priya, MERROWGATE_ID))
    shared = must(saveToWishlist(shared, P.priya, SHARED[1], MERROWGATE_ID))
    expect(moveWish(shared, P.priya, 'wli_hp23zk_1', SALLOW_ID).error).toBe(V1_ERRORS.sharedMove)
    expect(moveWish(shared, P.priya, 'wli_hp23zk_1', null).error).toBe(V1_ERRORS.sharedMove)
  })

  it('edits the note of a pending or declined item only', () => {
    const w = createSeed()
    const w1 = must(editWishNote(w, P.priya, 'wli_k2r8sw_1', 'Colour match agreed'))
    expect(w1.wishlists.wl_k2r8sw.items[0].note).toBe('Colour match agreed')
    expect(editWishNote(w1, P.priya, 'wli_k2r8sw_1', 'Colour match agreed').world).toBe(w1)
    expect(editWishNote(w, P.priya, 'wli_x6dq3n_1', 'Changed').error).toBe(V1_ERRORS.noteLocked)
    expect(editWishNote(w, P.isla, 'wli_k2r8sw_1', 'Changed').error).toBe(V1_ERRORS.role)
  })

  it('sends the pending items to the client once', () => {
    const w = createSeed()
    expect(sendWishlist(w, P.isla, SALLOW_ID).error).toBe(V1_ERRORS.role)
    const w1 = must(sendWishlist(w, P.priya, SALLOW_ID))
    expect(w1.wishlists.wl_k2r8sw.items.map((i) => i.status)).toEqual(['sent', 'sent'])
    expect(sendWishlist(w1, P.priya, SALLOW_ID).error).toBe(V1_ERRORS.nothingToSend)
    expect(sendWishlist(w, P.priya, MERROWGATE_ID).error).toBe(V1_ERRORS.nothingToSend)
  })

  it('only the client decides, only on a sent item; the architect reopens a declined one', () => {
    let w = must(saveToWishlist(seedAfterStep3(), P.priya, TH01, MERROWGATE_ID))
    w = must(saveToWishlist(w, P.priya, OPEN_STEEL, MERROWGATE_ID))
    const [a, b] = listOf(w, MERROWGATE_ID).items.map((i) => i.id)
    expect(decideWish(w, P.isla, MERROWGATE_ID, a, 'approved', '').error).toBe(V1_ERRORS.notSent)
    w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
    expect(decideWish(w, P.priya, MERROWGATE_ID, a, 'approved', '').error).toBe(V1_ERRORS.role)
    expect(decideWish(w, P.marcus, MERROWGATE_ID, a, 'approved', '').error).toBe(V1_ERRORS.role)
    expect(decideWish(w, P.isla, SALLOW_ID, 'wli_k2r8sw_1', 'approved', '').error).toBe(V1_ERRORS.role)
    w = must(decideWish(w, P.isla, MERROWGATE_ID, a, 'approved', 'Good fit for the frame'))
    w = must(decideWish(w, P.isla, MERROWGATE_ID, b, 'declined', 'Too short for the long spans'))
    const [ia, ib] = listOf(w, MERROWGATE_ID).items
    expect(ia).toMatchObject({ status: 'approved', decidedOn: DEMO_TODAY, decisionNote: 'Good fit for the frame' })
    expect(ib).toMatchObject({ status: 'declined', decisionNote: 'Too short for the long spans' })
    expect(reopenWish(w, P.priya, a, 'x').error).toBe(V1_ERRORS.notDeclined)
    expect(reopenWish(w, P.isla, b, 'x').error).toBe(V1_ERRORS.role)
    w = must(reopenWish(w, P.priya, b, 'Shorter spans only'))
    expect(listOf(w, MERROWGATE_ID).items[1]).toMatchObject({ status: 'pending', note: 'Shorter spans only', decidedOn: null, decisionNote: null })
    w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
    expect(listOf(w, MERROWGATE_ID).items.map((i) => i.status)).toEqual(['approved', 'sent'])
  })
})

describe('setLotAvailability (13.3)', () => {
  it('the owner sets the date of a private lot of their own building only', () => {
    const w = createSeed()
    const th07 = lotId(w, 'TH-07')
    expect(must(setLotAvailability(w, P.tom, th07, '2027-05-03')).lots[th07].availableFrom).toBe('2027-05-03')
    expect(w.lots[th07].availableFrom).toBe('2027-02-22')
    expect(setLotAvailability(w, P.tom, lotId(w, 'TH-02'), '2027-05-03').error).toBe(V1_ERRORS.notPrivate)
    expect(setLotAvailability(w, P.tom, lotId(w, 'HC-01'), '2027-05-03').error).toBe(V1_ERRORS.role)
    expect(setLotAvailability(w, P.dana, th07, '2027-05-03').error).toBe(V1_ERRORS.role)
    expect(setLotAvailability(w, P.priya, th07, '2027-05-03').error).toBe(V1_ERRORS.role)
    expect(setLotAvailability(w, P.tom, th07, '2027-13-01').error).toBe(V1_ERRORS.badDate)
    expect(setLotAvailability(w, P.tom, 'lot_none', '2027-05-03').error).toBe(V1_ERRORS.role)
  })
})

describe('setOwnerProjectApproval', () => {
  it('an owner with buildings shares with or revokes a project', () => {
    const w = createSeed()
    const w1 = must(setOwnerProjectApproval(w, ORG_IDS.ostlea, SALLOW_ID, true))
    expect(w1.projects[SALLOW_ID].approvedByOwnerOrgIds).toEqual([ORG_IDS.ostlea])
    expect(setOwnerProjectApproval(w1, ORG_IDS.ostlea, SALLOW_ID, true).world).toBe(w1)
    const w2 = must(setOwnerProjectApproval(w1, ORG_IDS.ostlea, MERROWGATE_ID, false))
    expect(w2.projects[MERROWGATE_ID].approvedByOwnerOrgIds).toEqual([])
    expect(setOwnerProjectApproval(w, ORG_IDS.lantern, SALLOW_ID, true).error).toBe(V1_ERRORS.notOwner)
    expect(setOwnerProjectApproval(w, ORG_IDS.pellory, SALLOW_ID, true).error).toBe(V1_ERRORS.notOwner)
    expect(setOwnerProjectApproval(w, ORG_IDS.ostlea, 'prj_nope00', true).error).toBe(V1_ERRORS.noProject)
  })
})

describe('browseView', () => {
  it('lists the open available listings with band, typology and where they are saved', () => {
    const v = browseView(createSeed(), P.priya, NO_FILTERS, 'newest', null)
    expect(v.total).toBe(16)
    expect(v.cards).toHaveLength(16)
    expect(v.cards.every((c) => c.listing.sharing === 'open' && c.listing.status === 'Available' && c.fit === null)).toBe(true)
    expect(v.cards.find((c) => c.listing.publicId === TIMBER)!.savedIn).toEqual(['wl_oriel'])
    expect(v.cards.find((c) => c.listing.publicId === 'L-Q23X7N')!.savedIn).toEqual(['wl_k2r8sw'])
    expect(v.projects.map((p) => p.id)).toEqual([MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID])
    expect(v.project).toBeNull()
    expect(v.canSave).toBe(true)
    expect(v.filterOptions.regions.length).toBeGreaterThan(0)
  })

  it('after step 3, L-9F4CQQ is a Structure card with a High band, in time for Merrowgate Wharf', () => {
    const v = browseView(seedAfterStep3(), P.priya, NO_FILTERS, 'newest', MERROWGATE_ID)
    expect(v.project).toEqual({ id: MERROWGATE_ID, name: 'Merrowgate Wharf', typeLabel: 'Office', startDate: '2028-04-03' })
    const c = v.cards.find((x) => x.listing.publicId === TH01)!
    expect(v.cards[0].listing.publicId).toBe(TH01)
    expect(c.typologyLabel).toBe('Structure')
    expect(c.band).toEqual({ band: 'high', segments: 3, word: 'High' })
    // Window Q1 2027 ends 31 March 2027; 369 days to 3 April 2028 is 13 months of 30 days.
    expect(c.fit).toEqual({ fit: 'in_time', storageMonths: 13, text: 'Available in time' })
    closeTo(c.listing.carbon!.avoidedT, 41.0037, 4)
  })

  it('filters by typology, sorts by carbon, and sorts by price only with one family', () => {
    const w = seedAfterStep3()
    const s = browseView(w, P.priya, { ...NO_FILTERS, typology: 'structure' }, 'carbon', null)
    expect(s.cards.every((c) => c.typologyLabel === 'Structure')).toBe(true)
    const carbon = s.cards.map((c) => c.listing.carbon?.avoidedT ?? -1)
    expect(carbon).toEqual([...carbon].sort((a, b) => b - a))
    expect(s.cards.at(-1)!.listing.carbon).toBeNull()
    const noFamily = browseView(w, P.priya, NO_FILTERS, 'price', null)
    expect([noFamily.sort, noFamily.priceSortEnabled]).toEqual(['newest', false])
    const steel = browseView(w, P.priya, { ...NO_FILTERS, family: 'steel_section' }, 'price', null)
    expect([steel.sort, steel.priceSortEnabled]).toEqual(['price', true])
    const prices = steel.cards.map((c) => c.listing.price.guide)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('"fits the project start date" uses the chosen project and is ignored without one', () => {
    const created = createProject(seedAfterStep3(), P.priya, { ...NEW_PROJECT, startDate: '2027-02-01' })
    const w = created.world
    const early = created.projectId!
    const all = browseView(w, P.priya, NO_FILTERS, 'newest', early)
    expect(all.cards.some((c) => c.fit?.fit === 'late')).toBe(true)
    expect(all.cards.find((c) => c.listing.publicId === TH01)!.fit!.fit).toBe('tight')
    const fits = browseView(w, P.priya, { ...NO_FILTERS, fitsStartDate: 'on' }, 'newest', early)
    expect(fits.cards.length).toBeGreaterThan(0)
    expect(fits.cards.every((c) => c.fit && c.fit.fit !== 'late')).toBe(true)
    expect(browseView(w, P.priya, { ...NO_FILTERS, fitsStartDate: 'on' }, 'newest', null).cards).toHaveLength(all.cards.length)
  })

  it('other roles may open browse but cannot save; a project they are not on is ignored', () => {
    const w = createSeed()
    const isla = browseView(w, P.isla, NO_FILTERS, 'newest', SALLOW_ID)
    expect(isla.canSave).toBe(false)
    expect(isla.projects.map((p) => p.id)).toEqual([MERROWGATE_ID])
    expect(isla.project).toBeNull()
    expect(isla.cards.every((c) => c.savedIn.length === 0)).toBe(true)
    const tom = browseView(w, P.tom, NO_FILTERS, 'newest', MERROWGATE_ID)
    expect([tom.projects, tom.project, tom.canSave]).toEqual([[], null, false])
  })
})

describe('sharedView', () => {
  it('lists nothing until the terms are accepted, then the lots shared with that project', () => {
    const w = createSeed()
    const before = sharedView(w, P.priya)
    expect(before.groups.map((g) => [g.project.name, g.termsAccepted, g.cards.length])).toEqual([
      ['Merrowgate Wharf', false, 0],
      ['Sallow Court', false, 0],
      ['Ferrymoor Yard', false, 0],
    ])
    let w1 = must(acceptProjectTerms(w, P.priya, MERROWGATE_ID))
    w1 = must(acceptProjectTerms(w1, P.priya, SALLOW_ID))
    const after = sharedView(w1, P.priya)
    const merrow = after.groups[0]
    expect(merrow.cards.map((c) => c.listing.publicId)).toEqual([...SHARED].sort())
    expect(merrow.cards.every((c) => c.listing.sharing === 'in_confidence' && c.fit !== null)).toBe(true)
    expect(after.groups[1].cards).toHaveLength(0)
    const approved = sharedView(must(setOwnerProjectApproval(w1, ORG_IDS.ostlea, SALLOW_ID, true)), P.priya)
    expect(approved.groups[1].cards).toHaveLength(5)
    expect([after.canAccept, after.canSave]).toEqual([true, true])
  })

  it('says a project is shared with only when an owner has approved it', () => {
    const w = createSeed()
    expect(sharedView(w, P.priya).groups.map((g) => [g.project.name, g.hasSharingOwner])).toEqual([
      ['Merrowgate Wharf', true],
      ['Sallow Court', false],
      ['Ferrymoor Yard', false],
    ])
    const approved = sharedView(must(setOwnerProjectApproval(w, ORG_IDS.ostlea, SALLOW_ID, true)), P.priya)
    expect(approved.groups[1].hasSharingOwner).toBe(true)
  })

  it('the client sees their own project only; the seller sees no group', () => {
    const w = must(acceptProjectTerms(createSeed(), P.isla, MERROWGATE_ID))
    const isla = sharedView(w, P.isla)
    expect(isla.groups.map((g) => g.project.id)).toEqual([MERROWGATE_ID])
    expect(isla.groups[0].cards).toHaveLength(5)
    expect(isla.canSave).toBe(false)
    expect(sharedView(w, P.tom)).toEqual({ groups: [], canAccept: false, canSave: false })
  })
})

describe('listingDetailView and geometryFor', () => {
  it('an open listing for the architect, with save targets and role flags', () => {
    const v = listingDetailView(createSeed(), P.priya, 'L-Q23X7N', SALLOW_ID)!
    expect(v.listing.publicId).toBe('L-Q23X7N')
    expect(v.typologyLabel).toBe('Envelope')
    expect(v.band.word).toBe('Medium')
    expect(v.project!.id).toBe(SALLOW_ID)
    expect(v.fit).not.toBeNull()
    expect(v.projects).toHaveLength(3)
    expect(v.saveTargets.map((t) => [t.label, t.allowed, t.saved])).toEqual([
      ['Merrowgate Wharf', true, false],
      ['Sallow Court', true, true],
      ['Ferrymoor Yard', true, false],
      ['Saved', true, false],
    ])
    expect([v.isArchitect, v.isClient]).toEqual([true, false])
    expect(v.geometry).toEqual({ dxf: true, obj: true, reason: null })
  })

  it('a private lot is null for everyone, the owner included', () => {
    const w = createSeed()
    for (const id of Object.values(P)) {
      expect(listingDetailView(w, id, PRIVATE_STONE, null)).toBeNull()
      expect(listingDetailView(w, id, TH01, MERROWGATE_ID)).toBeNull()
      expect(geometryFor(w, id, TH01, 'dxf')).toBeNull()
    }
  })

  it('a shared lot only for a project that sees it; Saved and other projects are not allowed', () => {
    const w = createSeed()
    expect(listingDetailView(w, P.priya, SHARED[0], MERROWGATE_ID)).toBeNull()
    expect(geometryFor(w, P.priya, SHARED[0], 'dxf')).toBeNull()
    const w1 = must(acceptProjectTerms(w, P.priya, MERROWGATE_ID))
    const v = listingDetailView(w1, P.priya, SHARED[0], null)!
    expect(v.listing.sharing).toBe('in_confidence')
    expect(v.project).toBeNull()
    expect(v.fit).toBeNull()
    expect(v.projects.map((p) => p.id)).toEqual([MERROWGATE_ID])
    expect(v.saveTargets.map((t) => [t.label, t.allowed, t.reason])).toEqual([
      ['Merrowgate Wharf', true, null],
      ['Sallow Court', false, V1_ERRORS.notShared],
      ['Ferrymoor Yard', false, V1_ERRORS.notShared],
      ['Saved', false, V1_ERRORS.sharedToSaved],
    ])
    const isla = listingDetailView(w1, P.isla, SHARED[0], MERROWGATE_ID)!
    expect([isla.isArchitect, isla.isClient, isla.saveTargets]).toEqual([false, true, []])
    expect(isla.fit).not.toBeNull()
    expect(listingDetailView(w1, P.tom, SHARED[0], null)).toBeNull()
    expect(listingDetailView(w1, P.priya, SHARED[0], SALLOW_ID)!.project).toBeNull()
  })

  it('a sold open listing shows, but cannot be saved', () => {
    const v = listingDetailView(createSeed(), P.priya, SOLD_STONE, null)!
    expect(v.listing.status).toBe('No longer available')
    expect(v.saveTargets.every((t) => !t.allowed && t.reason === V1_ERRORS.notAvailable)).toBe(true)
  })

  it('geometry: the steel DXF has 12 vertices; timber has no recorded section', () => {
    const w = seedAfterStep3()
    const dxf = geometryFor(w, P.priya, TH01, 'dxf')!
    expect(dxf.kind).toBe('file')
    if (dxf.kind === 'file') {
      expect(dxf.filename).toBe('L-9F4CQQ-UB-457x191x67.dxf')
      expect(dxf.text.split('\n').filter((l) => l === 'VERTEX')).toHaveLength(12)
    }
    expect(geometryFor(w, P.priya, TH01, 'obj')!.kind).toBe('file')
    expect(geometryFor(w, P.priya, TIMBER, 'dxf')).toEqual({ kind: 'unavailable', reason: NO_SECTION_SIZE })
    expect(listingDetailView(w, P.priya, TIMBER, null)!.geometry).toEqual({ dxf: false, obj: false, reason: NO_SECTION_SIZE })
    expect(geometryFor(w, P.priya, 'L-QQQQQQ', 'dxf')).toBeNull()
  })
})

describe('wishlistView, savedView, approvalsView, reviewView and specSheetView', () => {
  it('the architect reads a project list with fit, band, totals and the project line', () => {
    const v = wishlistView(createSeed(), P.priya, SALLOW_ID)!
    expect(v.project.projectLine).toBe('Hotel project for Pellory Estates. Materials needed on site from 10 January 2028.')
    expect(v.rows.map((r) => [r.item.publicId, r.state, r.statusLabel, r.typologyLabel])).toEqual([
      ['L-Q23X7N', 'ok', 'Pending', 'Envelope'],
      ['L-A945G6', 'ok', 'Pending', 'Envelope'],
    ])
    expect(v.rows.every((r) => r.fit !== null && r.band !== null && r.canRemove && r.canMove && r.canEditNote && !r.canReopen)).toBe(true)
    const stone = listingFor(createSeed(), lotForItem(createSeed(), itemByTag(createSeed(), 'OS-18').id).id, A)
    const brick = listingFor(createSeed(), lotForItem(createSeed(), itemByTag(createSeed(), 'OS-19').id).id, A)
    expect(v.totals.pending.count).toBe(2)
    closeTo(v.totals.pending.massT, stone.massT + brick.massT, 6)
    closeTo(v.totals.all.avoidedT, (stone.carbon?.avoidedT ?? 0) + (brick.carbon?.avoidedT ?? 0), 6)
    expect([v.sendableCount, v.canSend]).toEqual([2, true])
    expect(v.rows[0].moveTargets.map((t) => [t.label, t.allowed])).toEqual([
      ['Merrowgate Wharf', true],
      ['Ferrymoor Yard', true],
      ['Saved', true],
    ])
    const ferry = wishlistView(createSeed(), P.priya, FERRYMOOR_ID)!
    expect(ferry.rows[0]).toMatchObject({ statusLabel: 'Sent to client', canMove: false, canRemove: true, canEditNote: false })
    expect(ferry.rows[0].moveTargets.every((t) => !t.allowed && t.reason === MOVE_REASONS.sent)).toBe(true)
    expect(ferry.canSend).toBe(false)
  })

  it('only the architect of the project reads the list', () => {
    const w = createSeed()
    for (const id of [P.isla, P.marcus, P.tom, P.dana, P.operator]) expect(wishlistView(w, id, SALLOW_ID)).toBeNull()
    expect(wishlistView(w, P.priya, 'prj_nope00')).toBeNull()
  })

  it('Saved: the general list with move targets, for the architect only', () => {
    const w = createSeed()
    const v = savedView(w, P.priya)!
    expect(v.listId).toBe('wl_oriel')
    expect(v.rows.map((r) => [r.item.publicId, r.state, r.fit])).toEqual([[TIMBER, 'ok', null]])
    expect(v.rows[0].moveTargets.map((t) => [t.label, t.allowed])).toEqual([
      ['Merrowgate Wharf', true],
      ['Sallow Court', true],
      ['Ferrymoor Yard', true],
    ])
    expect(v.totals.all.count).toBe(1)
    expect(savedView(w, P.isla)).toBeNull()
  })

  it('approvals: the client sees sent and decided rows with the guide price range, never pending ones', () => {
    let w = must(saveToWishlist(seedAfterStep3(), P.priya, TH01, MERROWGATE_ID))
    w = must(saveToWishlist(w, P.priya, OPEN_STEEL, MERROWGATE_ID))
    expect(approvalsView(w, P.isla, MERROWGATE_ID)!.sent).toHaveLength(0)
    w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
    w = must(saveToWishlist(w, P.priya, 'L-6DN4K3', MERROWGATE_ID))
    w = must(decideWish(w, P.isla, MERROWGATE_ID, 'wli_hp23zk_1', 'approved', ''))
    const v = approvalsView(w, P.isla, MERROWGATE_ID)!
    expect(v.approved.map((r) => r.item.publicId)).toEqual([TH01])
    expect(v.sent.map((r) => r.item.publicId)).toEqual([OPEN_STEEL])
    expect(v.declined).toHaveLength(0)
    expect(v.approved[0].priceRange).toBe('£715 to £825 per tonne')
    expect(v.approved[0]).toMatchObject({ canRemove: false, canMove: false, canEditNote: false, moveTargets: [] })
    expect(v.totals.all.count).toBe(2)
    expect(approvalsView(w, P.priya, MERROWGATE_ID)).toBeNull()
    expect(approvalsView(w, P.isla, SALLOW_ID)).toBeNull()
  })

  it('review: the consultant reads the list by state with totals, read only', () => {
    let w = must(saveToWishlist(seedAfterStep3(), P.priya, TH01, MERROWGATE_ID))
    w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
    w = must(decideWish(w, P.isla, MERROWGATE_ID, 'wli_hp23zk_1', 'approved', ''))
    const v = reviewView(w, P.marcus, MERROWGATE_ID)!
    expect(v.byState.approved.map((r) => r.item.publicId)).toEqual([TH01])
    expect(v.totals.approved.count).toBe(1)
    closeTo(v.totals.approved.massT, 24.156, 3)
    closeTo(v.totals.approved.avoidedT, 41.0037, 4)
    expect(v.byState.approved[0]).toMatchObject({ canRemove: false, canMove: false, canEditNote: false, canReopen: false })
    expect(reviewView(w, P.priya, MERROWGATE_ID)).toBeNull()
    expect(reviewView(w, P.isla, MERROWGATE_ID)).toBeNull()
  })

  it('spec sheet: approved items, or a draft of everything not declined, for the architect only', () => {
    let w = must(saveToWishlist(seedAfterStep3(), P.priya, TH01, MERROWGATE_ID))
    w = must(saveToWishlist(w, P.priya, OPEN_STEEL, MERROWGATE_ID))
    const draft = specSheetView(w, P.priya, MERROWGATE_ID, 'draft')!
    expect(draft.title).toBe('Specification schedule, Merrowgate Wharf')
    expect(draft.projectLine).toBe('Office project. Materials needed on site from 3 April 2028.')
    expect(draft.blocks.map((b) => [b.publicId, b.status])).toEqual([
      [TH01, 'pending'],
      [OPEN_STEEL, 'pending'],
    ])
    expect(draft.caveats).toEqual(expect.arrayContaining([LABELS.L39, LABELS.L20]))
    expect(draft.blocks[0].rows.find((r) => r.label === 'Timeline check')!.value).toBe('Available in time')
    expect(specSheetView(w, P.priya, MERROWGATE_ID, 'approved')!.blocks).toHaveLength(0)
    w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
    w = must(decideWish(w, P.isla, MERROWGATE_ID, 'wli_hp23zk_2', 'declined', ''))
    w = must(decideWish(w, P.isla, MERROWGATE_ID, 'wli_hp23zk_1', 'approved', ''))
    expect(specSheetView(w, P.priya, MERROWGATE_ID, 'approved')!.blocks.map((b) => b.publicId)).toEqual([TH01])
    expect(specSheetView(w, P.priya, MERROWGATE_ID, 'draft')!.blocks.map((b) => b.publicId)).toEqual([TH01])
    expect(specSheetView(w, P.isla, MERROWGATE_ID, 'approved')).toBeNull()
    expect(specSheetView(w, P.marcus, MERROWGATE_ID, 'draft')).toBeNull()
  })

  it('a row whose lot is sold shows "No longer available", no figures, and drops out of totals', () => {
    const w = createSeed()
    const timberLot = lotForItem(w, itemByTag(w, 'OS-20').id)
    timberLot.sold = true
    const v = savedView(w, P.priya)!
    expect(v.rows[0]).toMatchObject({ state: 'not_available', stateText: 'No longer available', listing: null, band: null, fit: null, title: 'Timber joists, pitch pine' })
    expect(v.totals.all.count).toBe(0)
  })
})

describe('supply side views', () => {
  it('supplyTreeView: the surveyor sees both clients; the owner only their own building', () => {
    const w = createSeed()
    expect(supplyTreeView(w, P.dana).clients).toEqual([
      { orgId: ORG_IDS.ostlea, name: 'Ostlea Estates', buildings: [{ id: TIVERNE_ID, name: 'Tiverne House', itemCount: 11, lots: { private: 6, shared: 5, published: 0 } }] },
      { orgId: ORG_IDS.brackwater, name: 'Brackwater Estates', buildings: [{ id: HARROWDEN_ID, name: 'Harrowden Court', itemCount: 3, lots: { private: 3, shared: 0, published: 0 } }] },
    ])
    expect(supplyTreeView(w, P.tom).clients.map((c) => c.buildings.map((b) => b.id))).toEqual([[TIVERNE_ID]])
    for (const id of [P.priya, P.isla, P.marcus, P.operator]) expect(supplyTreeView(w, id).clients).toEqual([])
  })

  it('ownerSharingView: blind lines only, with the approval of each project', () => {
    const w = createSeed()
    const v = ownerSharingView(w, ORG_IDS.ostlea)
    expect(v.sharedLotCount).toBe(5)
    expect(v.rows.map((r) => [r.text, r.approved])).toEqual([
      ['Design team, commercial project, Inner London East, needed by Q2 2028', true],
      ['Design team, hotel project, Central London, needed by Q1 2028', false],
      ['Design team, residential project, Inner London East, needed by Q2 2027', false],
    ])
    const text = JSON.stringify(v)
    for (const p of Object.values(w.projects)) for (const s of projectPrivateStrings(p, w)) expect(text, s).not.toContain(s)
    expect(ownerSharingView(must(setOwnerProjectApproval(w, ORG_IDS.ostlea, MERROWGATE_ID, false)), ORG_IDS.ostlea).rows[0].approved).toBe(false)
  })
})

function flatten(items: RailItem[]): RailItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children ?? [])])
}

describe('railView, projectHomeFor and homeFor', () => {
  const w = createSeed()
  it('the architect: Marketplace, then each project with Wish list, Spec sheet and a greyed V2 Match schedule', () => {
    const rail = railView(w, P.priya)
    expect(rail.map((s) => s.title)).toEqual(['Marketplace', 'Projects'])
    expect(rail[0].items.map((i) => [i.label, i.href])).toEqual([
      ['Browse', '/market'],
      ['Shared with you', '/market/shared'],
      ['Saved', '/saved'],
    ])
    expect(rail[1].items.map((i) => i.label)).toEqual(['Merrowgate Wharf', 'Sallow Court', 'Ferrymoor Yard', 'New project'])
    expect(rail[1].items[0].children!.map((c) => [c.label, c.href, c.greyed ?? false, c.tag ?? null])).toEqual([
      ['Wish list', `/projects/${MERROWGATE_ID}/wishlist`, false, null],
      ['Spec sheet', `/projects/${MERROWGATE_ID}/spec`, false, null],
      ['Match schedule', `/projects/${MERROWGATE_ID}/match`, true, 'V2'],
    ])
    const labels = rail.flatMap((s) => flatten(s.items)).map((i) => i.label)
    for (const banned of ['Deals', 'Reuse plan', 'Offers and deals']) expect(labels).not.toContain(banned)
  })

  it('the client, the consultant, the surveyor, the owner and the operator', () => {
    const isla = railView(w, P.isla)
    expect(isla[0].items.map((i) => i.label)).toEqual(['Merrowgate Wharf'])
    expect(isla[0].items[0].children!.map((c) => c.label)).toEqual(['Approvals', 'Match schedule (advanced)', 'Reuse plan', 'Deals'])
    const marcus = railView(w, P.marcus)
    expect(marcus.map((s) => s.title)).toEqual(['Projects', 'Engagements'])
    expect(marcus[0].items[0].children!.map((c) => c.label)).toEqual(['Compliance', 'Wish list review'])
    expect(marcus[1].items[0].children![0].href).toBe(`/engagements/${DURNLEY_ID}/waste`)
    const dana = railView(w, P.dana)
    expect(dana[0].items.map((i) => [i.label, i.children!.map((b) => b.label)])).toEqual([
      ['Ostlea Estates', ['Tiverne House']],
      ['Brackwater Estates', ['Harrowden Court']],
    ])
    expect(dana[0].items[0].children![0].children!.map((c) => c.label)).toEqual(['Inventory', 'Capture'])
    const tom = railView(w, P.tom)
    expect(tom.map((s) => s.title)).toEqual(['Buildings', 'Offers and deals'])
    expect(tom[0].items.map((i) => i.label)).toEqual(['Tiverne House'])
    expect(JSON.stringify(tom)).not.toContain('Harrowden')
    expect(JSON.stringify(tom)).not.toContain(HARROWDEN_ID)
    expect(railView(w, P.operator)[0].items.map((i) => i.label)).toEqual(['Ledger', 'Model comparison'])
  })

  it('links carry IDs, never names', () => {
    const names = [...Object.values(w.projects).map((p) => p.name), ...Object.values(w.buildings).map((b) => b.name).filter(Boolean)]
    for (const id of Object.values(P)) {
      for (const item of railView(w, id).flatMap((s) => flatten(s.items))) for (const n of names) expect(item.href).not.toContain(n)
    }
  })

  it('project home redirects by role; home picks the first screen', () => {
    expect(projectHomeFor(w, P.priya, MERROWGATE_ID)).toBe(`/projects/${MERROWGATE_ID}/wishlist`)
    expect(projectHomeFor(w, P.isla, MERROWGATE_ID)).toBe(`/projects/${MERROWGATE_ID}/approvals`)
    expect(projectHomeFor(w, P.marcus, MERROWGATE_ID)).toBe(`/projects/${MERROWGATE_ID}/compliance`)
    expect(projectHomeFor(w, P.isla, SALLOW_ID)).toBeNull()
    expect(projectHomeFor(w, P.tom, MERROWGATE_ID)).toBeNull()
    expect([P.dana, P.tom, P.priya, P.isla, P.marcus, P.operator].map((id) => homeFor(w, id))).toEqual([
      `/buildings/${TIVERNE_ID}/capture`,
      `/buildings/${TIVERNE_ID}/inventory`,
      '/market',
      `/projects/${MERROWGATE_ID}/approvals`,
      `/projects/${MERROWGATE_ID}/compliance`,
      '/operator/ledger',
    ])
  })
})

describe('privacy in the version 1.0 views', () => {
  /** Every lot private string in the world, and the public IDs of the private lots. */
  function secrets(w: World) {
    const strings = new Set<string>()
    for (const lot of Object.values(w.lots)) {
      const item = w.items[lot.itemId]
      for (const s of lotPrivateStrings(lot, item, w.buildings[item.buildingId], w)) strings.add(s)
    }
    const privateIds = Object.values(w.lots)
      .filter((l) => l.visibility === 'private')
      .map((l) => l.publicId)
    return { strings: [...strings], privateIds }
  }

  it('browse, shared and detail views for the architect and the client hold no private lot and no lot private string', () => {
    let w = seedAfterStep3()
    w = must(acceptProjectTerms(w, P.priya, MERROWGATE_ID))
    w = must(acceptProjectTerms(w, P.priya, SALLOW_ID))
    w = must(saveToWishlist(w, P.priya, SHARED[0], MERROWGATE_ID))
    const { strings, privateIds } = secrets(w)
    // TH-07 to TH-11 and the three Harrowden Court lots.
    expect(privateIds).toHaveLength(8)
    for (const persona of [P.priya, P.isla]) {
      const texts: string[] = []
      for (const projectId of [null, MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID]) texts.push(JSON.stringify(browseView(w, persona, NO_FILTERS, 'newest', projectId)))
      texts.push(JSON.stringify(sharedView(w, persona)))
      for (const lot of Object.values(w.lots)) {
        const v = listingDetailView(w, persona, lot.publicId, MERROWGATE_ID)
        if (lot.visibility === 'private') expect(v, lot.publicId).toBeNull()
        texts.push(JSON.stringify(v))
      }
      if (persona === P.priya) {
        for (const projectId of [MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID]) texts.push(JSON.stringify(wishlistView(w, persona, projectId)))
        texts.push(JSON.stringify(savedView(w, persona)))
      } else {
        texts.push(JSON.stringify(approvalsView(w, persona, MERROWGATE_ID)))
      }
      const all = texts.join('\n')
      for (const id of privateIds) expect(all, `${persona} sees private lot ${id}`).not.toContain(id)
      for (const s of strings) expect(all, `${persona} sees "${s}"`).not.toContain(s)
      expect(all).not.toMatch(INTERNAL_ID)
    }
  })

  it('a lot from a revoked owner shows as not shared, drops out of totals, the send, the approvals and the spec sheet', () => {
    let w = must(acceptProjectTerms(createSeed(), P.priya, MERROWGATE_ID))
    w = must(saveToWishlist(w, P.priya, SHARED[0], MERROWGATE_ID))
    w = must(saveToWishlist(w, P.priya, OPEN_STEEL, MERROWGATE_ID))
    expect(wishlistView(w, P.priya, MERROWGATE_ID)!.totals.all.count).toBe(2)
    w = must(setOwnerProjectApproval(w, ORG_IDS.ostlea, MERROWGATE_ID, false))
    const v = wishlistView(w, P.priya, MERROWGATE_ID)!
    expect(v.rows[0]).toMatchObject({ state: 'not_shared', stateText: NOT_SHARED, listing: null, band: null, fit: null, title: 'UB 533x210x92, 9.0 m' })
    expect(v.rows[1].state).toBe('ok')
    expect(v.totals.all.count).toBe(1)
    expect(v.totals.pending.count).toBe(1)
    expect(v.sendableCount).toBe(1)
    expect(specSheetView(w, P.priya, MERROWGATE_ID, 'draft')!.blocks.map((b) => b.publicId)).toEqual([OPEN_STEEL])
    expect(listingDetailView(w, P.priya, SHARED[0], MERROWGATE_ID)).toBeNull()
    expect(geometryFor(w, P.priya, SHARED[0], 'dxf')).toBeNull()
    expect(saveToWishlist(w, P.priya, SHARED[1], MERROWGATE_ID).error).toBe(V1_ERRORS.notShared)
    w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
    expect(listOf(w, MERROWGATE_ID).items.map((i) => i.status)).toEqual(['pending', 'sent'])
    expect(approvalsView(w, P.isla, MERROWGATE_ID)!.sent.map((r) => r.item.publicId)).toEqual([OPEN_STEEL])
    // A row revoked after it was sent cannot be decided.
    let w2 = must(acceptProjectTerms(createSeed(), P.priya, MERROWGATE_ID))
    w2 = must(saveToWishlist(w2, P.priya, SHARED[0], MERROWGATE_ID))
    w2 = must(sendWishlist(w2, P.priya, MERROWGATE_ID))
    w2 = must(setOwnerProjectApproval(w2, ORG_IDS.ostlea, MERROWGATE_ID, false))
    expect(decideWish(w2, P.isla, MERROWGATE_ID, 'wli_hp23zk_1', 'approved', '').error).toBe(V1_ERRORS.revoked)
    expect(approvalsView(w2, P.isla, MERROWGATE_ID)!.sent).toHaveLength(0)
  })

  it('the spec sheet and geometry files hold no lot private string (P10 at store level)', () => {
    let w = must(acceptProjectTerms(seedAfterStep3(), P.priya, MERROWGATE_ID))
    for (const id of [TH01, ...SHARED, OPEN_STEEL]) w = must(saveToWishlist(w, P.priya, id, MERROWGATE_ID))
    const { strings } = secrets(w)
    const texts = [JSON.stringify(specSheetView(w, P.priya, MERROWGATE_ID, 'draft'))]
    for (const id of [TH01, ...SHARED, OPEN_STEEL]) for (const kind of ['dxf', 'obj'] as const) texts.push(JSON.stringify(geometryFor(w, P.priya, id, kind)))
    const all = texts.join('\n')
    for (const s of strings) expect(all, s).not.toContain(s)
  })
})

describe('store wiring', () => {
  it('each action runs as the current persona, stores the world on success and passes errors on', async () => {
    const s = () => useStore.getState()
    await s().reset()
    expect(s().browseProjectId).toBeNull()
    s().setPersona(P.isla)
    expect(s().saveToWishlist(OPEN_STEEL, MERROWGATE_ID)).toBe(V1_ERRORS.role)
    expect(listOf(s().world, MERROWGATE_ID).items).toHaveLength(0)
    s().setPersona(P.priya)
    expect(s().saveToWishlist(OPEN_STEEL, MERROWGATE_ID)).toBeNull()
    expect(s().editWishNote('wli_hp23zk_1', 'Floor beams')).toBeNull()
    expect(s().sendWishlist(MERROWGATE_ID)).toBeNull()
    expect(s().decideWish(MERROWGATE_ID, 'wli_hp23zk_1', 'approved', '')).toBe(V1_ERRORS.role)
    s().setPersona(P.isla)
    expect(s().decideWish(MERROWGATE_ID, 'wli_hp23zk_1', 'declined', 'Not this one')).toBeNull()
    s().setPersona(P.priya)
    expect(s().reopenWish('wli_hp23zk_1', 'Second look')).toBeNull()
    expect(s().moveWish('wli_hp23zk_1', null)).toBeNull()
    expect(s().removeWish('wli_oriel_2')).toBeNull()
    expect(s().acceptProjectTerms(MERROWGATE_ID)).toBeNull()
    const created = s().createProject(NEW_PROJECT)
    expect(created.error).toBeNull()
    expect(s().world.projects[created.projectId!].name).toBe('Sample office')
    s().setBrowseProjectId(MERROWGATE_ID)
    expect(s().browseProjectId).toBe(MERROWGATE_ID)
    s().setPersona(P.tom)
    const th07 = lotId(s().world, 'TH-07')
    expect(s().setLotAvailability(th07, '2027-05-03')).toBeNull()
    expect(s().world.lots[th07].availableFrom).toBe('2027-05-03')
    expect(s().setOwnerProjectApproval(SALLOW_ID, true)).toBeNull()
    expect(s().world.projects[SALLOW_ID].approvedByOwnerOrgIds).toEqual([ORG_IDS.ostlea])
    s().setPersona(P.isla)
    expect(s().setOwnerProjectApproval(SALLOW_ID, false)).toBe(V1_ERRORS.notOwner)
    const persisted = useStore.persist.getOptions().partialize!(s()) as Record<string, unknown>
    expect(Object.keys(persisted).sort()).toEqual(['browseProjectId', 'lastCapturedItemId', 'personaId', 'world'])
    expect(useStore.persist.getOptions().version).toBe(2)
    await s().reset()
    expect(s().browseProjectId).toBeNull()
    expect(s().world.projects[created.projectId!]).toBeUndefined()
  })
})
