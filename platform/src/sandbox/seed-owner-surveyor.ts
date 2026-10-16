// Round 2 seed additions for donor buildings and surveyors (owner-surveyor design 14.4.10): a deconstruction
// contractor with dates on Tiverne House, the structure of both owned buildings, a building the surveyor added that
// waits for its owner's confirmation, a booked testing request and an unused share link. Tarnbrook Deconstruction is
// also the contractor on Harrowden Court, with no dates yet, so the surveyor's first sign-in shows a contractor job. No owner new project is
// seeded: it would make the owner a buyer in the sample world and blur the seller privacy checks.
import type { InventoryItem, Lot, SourceBuilding, StructuralElement, World } from '../domain/types'
import { HARROWDEN_ID, itemByTag, lotForItem, ORG_IDS, PERSONA_IDS, TIVERNE_ID } from '../domain/seed/world'
import { V1_ASSUMPTIONS } from '../domain/reference/v1assumptions'
import { formatDate } from '../domain/dates'
import type { AppData, BuildingClaim, TestingRequest } from '../store/types'
import { claimNoticeKey, log, notify } from '../store/notifications'
import { SAMPLE_ACCOUNTS } from './accounts'

export const FENNICK_ID = 'org_fennick'
export const AMBREY_ID = 'bld_ab3m8r'
export const AMBREY_CLAIM_ID = 'clm_ambrey'
export const TIVERNE_TESTING_ID = 'tst_tiverne'
export const TIVERNE_LINK_ID = 'lnk_ostl01'

const el = (kind: StructuralElement['kind'], material: StructuralElement['material'], systemId: string, note = ''): StructuralElement => ({ kind, material, systemId, note })

export const TIVERNE_STRUCTURE: StructuralElement[] = [
  el('frame', 'steel', 'frame_steel_bolted'),
  el('floors', 'composite', 'floors_composite'),
  el('stability', 'concrete_in_situ', 'stab_cores'),
  el('facade', 'stone', 'fac_stone'),
  el('facade', 'concrete_precast', 'fac_precast'),
  el('facade', 'aluminium_glass', 'fac_unitised', 'Added in 2003'),
]

const HARROWDEN_STRUCTURE: StructuralElement[] = [el('frame', 'steel', 'frame_steel_bolted'), el('floors', 'composite', 'floors_composite'), el('stability', 'steel', 'stab_bracing'), el('facade', 'masonry', 'fac_brick')]

/**
 * The contractor's expected months on Tiverne House, as stored dates. The design gives the first of each month; the
 * day moves on from the first where a first would coincide with a buyer's own programme date in the sample world,
 * so the string-based privacy checks stay meaningful. Each still reads as the same month.
 */
export const FENNICK_DATES: Record<string, string> = { 'TH-07': '2027-03-01', 'TH-08': '2027-03-01', 'TH-09': '2027-04-01', 'TH-10': '2027-03-01', 'TH-11': '2027-02-08' }
export const FENNICK_DATED_ON = '2026-10-02'

/** Ambrey House's programme. The dismantling start moves a week from the design's 5 April so it is no buyer's date. */
export const AMBREY_PROGRAMME = { stripOutStart: '2027-03-01', dismantlingStart: '2027-04-12', clearBy: '2027-06-25' }

const AMBREY_ITEMS: { id: string; lotId: string; publicId: string; tag: string; item: Pick<InventoryItem, 'spec' | 'quantity' | 'condition' | 'recoverability' | 'location'> }[] = [
  { id: 'itm_ah7k2m', lotId: 'lot_ah7k2m', publicId: 'L-H7MB4T', tag: 'AH-01', item: { spec: { family: 'steel_section', designation: 'UB 305x165x40', lengthM: 5.0 }, quantity: { kind: 'pieces', pieces: 32 }, condition: 'B', recoverability: 'A', location: 'Floor beams, levels 1 to 3' } },
  { id: 'itm_ah9p4w', lotId: 'lot_ah9p4w', publicId: 'L-V3QK9C', tag: 'AH-02', item: { spec: { family: 'clay_brick', brickType: 'facing', mortar: 'cement mortar' }, quantity: { kind: 'pieces', pieces: 8000 }, condition: 'B', recoverability: 'C', location: 'Rear elevation' } },
]

/** The world additions, applied to the reference world before its dates move. */
export function withOwnerSurveyorWorld(world: World): World {
  const w = structuredClone(world)
  w.orgs[FENNICK_ID] = { id: FENNICK_ID, name: 'Fennick Dismantling', type: 'Deconstruction contractor' }

  const tiverne = w.buildings[TIVERNE_ID]
  tiverne.structure = structuredClone(TIVERNE_STRUCTURE)
  tiverne.structureType = 'Composite slabs act as diaphragms; cores at the north and east corners.'
  tiverne.contractorOrgId = FENNICK_ID
  for (const [tag, date] of Object.entries(FENNICK_DATES)) {
    const item = w.items[itemByTag(w, tag).id]
    item.contractorAvailableFrom = date
    item.contractorDatedOn = FENNICK_DATED_ON
  }

  const harrowden = w.buildings[HARROWDEN_ID]
  harrowden.structure = structuredClone(HARROWDEN_STRUCTURE)
  harrowden.structureType = ''
  // Brackwater Estates invited Tarnbrook, which surveys Harrowden Court, to set its availability dates too.
  harrowden.contractorOrgId = ORG_IDS.tarnbrook

  const hubKm = V1_ASSUMPTIONS.regionHubKm['Central London']
  const ambrey: SourceBuilding = {
    id: AMBREY_ID,
    ownerOrgId: null,
    sellerType: 'Asset owner',
    sourceType: 'deconstruction',
    name: 'Ambrey House',
    address: '6 Quarrel Lane, London SE1',
    postcodeDistrict: 'SE1',
    localAuthority: 'Southwark',
    region: 'Central London',
    yearBuilt: 1979,
    eraBand: '1970 or later',
    storeys: 4,
    giaM2: 2600,
    structureType: '',
    structure: [el('frame', 'steel', 'frame_steel_bolted'), el('floors', 'concrete_precast', 'floors_hollowcore'), el('facade', 'masonry', 'fac_brick')],
    createdByOrgId: ORG_IDS.tarnbrook,
    contractorOrgId: null,
    tenants: [],
    programme: { ...AMBREY_PROGRAMME },
    defaultHubId: Object.entries(hubKm).sort((x, y) => x[1] - y[1])[0][0],
    surveyorOrgId: ORG_IDS.tarnbrook,
    locationLevel: 'region',
    timingLevel: 'quarter',
    arisingsTitle: 'owner',
    distancesKm: { ...hubKm },
    surveyedBy: null,
  }
  w.buildings[AMBREY_ID] = ambrey
  for (const r of AMBREY_ITEMS) {
    const item: InventoryItem = {
      id: r.id,
      buildingId: AMBREY_ID,
      tag: r.tag,
      family: r.item.spec.family,
      spec: r.item.spec,
      quantity: r.item.quantity,
      condition: r.item.condition,
      recoverability: r.item.recoverability,
      testStatus: 'untested',
      grade: r.item.spec.family === 'steel_section' ? 'unknown' : null,
      location: r.item.location,
      photos: [],
      notes: '',
      capturedBy: 'Dana Kowalski',
      capturedOn: '2026-10-03',
      expectedAvailableFrom: AMBREY_PROGRAMME.dismantlingStart,
      contractorAvailableFrom: null,
      contractorDatedOn: null,
    }
    const lot: Lot = {
      id: r.lotId,
      itemId: r.id,
      publicId: r.publicId,
      visibility: 'private',
      piecesOnOffer: r.item.quantity.kind === 'pieces' ? r.item.quantity.pieces : null,
      shareOnOffer: 1,
      availableFrom: AMBREY_PROGRAMME.dismantlingStart,
      inStock: null,
      listedMonth: null,
      askPerUnit: null,
      reservePerUnit: null,
      sold: false,
    }
    w.items[r.id] = item
    w.lots[r.lotId] = lot
  }
  return w
}

const userOf = (personaId: string) => SAMPLE_ACCOUNTS.find((a) => a.personaId === personaId)!.userId

export type HistoryClock = { at: (daysAgo: number, hh: number, mm?: number) => string; day: (daysAgo: number) => string; todayIso: string }

/** The history additions: the claim, the contractor's dates, the testing request and the share link. Applied after the dates move. */
export function withOwnerSurveyorHistory(state: AppData, h: HistoryClock): AppData {
  const TOM = userOf(PERSONA_IDS.tom)
  const DANA = userOf(PERSONA_IDS.dana)
  let s = state
  const read = (userId: string) => {
    s = { ...s, notifications: s.notifications.map((n, i) => (i === 0 ? { ...n, readBy: [userId] } : n)) }
  }
  const tiverne = s.world.buildings[TIVERNE_ID]
  const ambrey = s.world.buildings[AMBREY_ID]

  // Ambrey House: Dana added it ahead of the strip-out tender and asked Tom to confirm it.
  s = { ...s, surveys: { ...s.surveys, [AMBREY_ID]: { buildingId: AMBREY_ID, status: 'in_progress', appointedAt: null, submittedAt: null, submittedByUserId: null } } }
  const claim: BuildingClaim = {
    id: AMBREY_CLAIM_ID,
    buildingId: AMBREY_ID,
    surveyorOrgId: ORG_IDS.tarnbrook,
    requestedByUserId: DANA,
    requestedAt: h.at(3, 10),
    ownerEmail: 'tom.ashby@ostlea.example',
    ownerName: 'Tom Ashby',
    message: 'We surveyed Ambrey House ahead of the strip-out tender. Please confirm it is yours.',
    status: 'pending',
    decidedAt: null,
    decidedByUserId: null,
    decisionNote: null,
  }
  s = { ...s, buildingClaims: { ...s.buildingClaims, [claim.id]: claim } }
  s = log(s, { at: h.at(4, 9), orgIds: [ORG_IDS.tarnbrook], projectId: null, buildingId: AMBREY_ID, actorUserId: DANA, actor: 'Dana Kowalski', text: 'added Ambrey House to survey', href: `/app/buildings/${AMBREY_ID}` })
  s = log(s, { at: h.at(4, 15), orgIds: [ORG_IDS.tarnbrook], projectId: null, buildingId: AMBREY_ID, actorUserId: DANA, actor: 'Dana Kowalski', text: 'captured AH-01 and AH-02', href: `/app/buildings/${AMBREY_ID}/inventory` })
  s = log(s, { at: h.at(3, 10), orgIds: [ORG_IDS.tarnbrook], projectId: null, buildingId: AMBREY_ID, actorUserId: DANA, actor: 'Dana Kowalski', text: `asked ${claim.ownerEmail} to confirm Ambrey House`, href: `/app/buildings/${AMBREY_ID}` })
  s = notify(s, { orgIds: [ORG_IDS.ostlea], kind: 'building_claim', title: 'Tarnbrook Deconstruction surveyed a building for you', body: `${ambrey.name}, ${ambrey.address}. Confirm it is yours to see what it holds.`, href: '/app/requests?tab=buildings', at: h.at(3, 10), actorUserId: null, key: claimNoticeKey(claim.id) })

  // Fennick Dismantling: invited by Ostlea Estates, then set dates for five items.
  const contractorOrgs = [ORG_IDS.ostlea, ORG_IDS.tarnbrook, FENNICK_ID]
  s = log(s, { at: h.at(9, 10), orgIds: contractorOrgs, projectId: null, buildingId: TIVERNE_ID, actorUserId: TOM, actor: 'Tom Ashby', text: 'invited Fennick Dismantling to set availability dates', href: `/app/buildings/${TIVERNE_ID}` })
  const dated = Object.keys(FENNICK_DATES).length
  s = log(s, { at: h.at(5, 14), orgIds: contractorOrgs, projectId: null, buildingId: TIVERNE_ID, actorUserId: null, actor: 'Fennick Dismantling', text: `set dates for ${dated} items`, href: `/app/buildings/${TIVERNE_ID}/inventory` })
  s = notify(s, { orgIds: [ORG_IDS.ostlea], kind: 'availability_set', title: `Fennick Dismantling set dates for ${dated} items at ${tiverne.name}`, body: 'Review them in the inventory and apply the ones you agree with.', href: `/app/buildings/${TIVERNE_ID}/inventory`, at: h.at(5, 14), actorUserId: null })
  read(TOM)

  // Harrowden Court: Brackwater Estates invited Tarnbrook to set availability dates; none are set yet.
  const harrowden = s.world.buildings[HARROWDEN_ID]
  s = log(s, { at: h.at(2, 9), orgIds: [ORG_IDS.brackwater, ORG_IDS.tarnbrook], projectId: null, buildingId: HARROWDEN_ID, actorUserId: null, actor: 'Brackwater Estates', text: 'invited Tarnbrook Deconstruction to set availability dates', href: `/app/buildings/${HARROWDEN_ID}` })
  s = notify(s, { orgIds: [ORG_IDS.tarnbrook], kind: 'appointed', title: `Brackwater Estates invited you to set availability dates at ${harrowden.name}`, body: 'Say when each item is expected to come out. The owner decides what buyers see.', href: `/app/buildings/${HARROWDEN_ID}/availability`, at: h.at(2, 9), actorUserId: null })

  // Testing: Dana asked Brindmoor Testing for coupon tests on the primary steel; the visit is booked.
  const steel = ['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06'].map((t) => itemByTag(s.world, t).id)
  const testing: TestingRequest = {
    id: TIVERNE_TESTING_ID,
    buildingId: TIVERNE_ID,
    itemIds: steel,
    companyId: 'tco_brindmoor',
    services: ['steel_coupon'],
    preferredFrom: null,
    message: 'Coupons from five sections; grade unconfirmed from the archive drawings.',
    status: 'booked',
    requestedByUserId: DANA,
    requestedByOrgId: ORG_IDS.tarnbrook,
    requestedAt: h.at(12, 10),
    bookedFor: h.day(-9),
    results: [],
    history: [
      { at: h.at(12, 10), status: 'requested', byUserId: DANA, note: '' },
      { at: h.at(4, 11), status: 'booked', byUserId: DANA, note: 'Coupon cutting on site, levels 1 and 2' },
    ],
  }
  s = { ...s, testingRequests: { ...s.testingRequests, [testing.id]: testing } }
  const buildingOrgs = [ORG_IDS.ostlea, ORG_IDS.tarnbrook, FENNICK_ID]
  s = log(s, { at: h.at(12, 10), orgIds: buildingOrgs, projectId: null, buildingId: TIVERNE_ID, actorUserId: DANA, actor: 'Dana Kowalski', text: `asked Brindmoor Testing to test ${steel.length} items`, href: `/app/buildings/${TIVERNE_ID}/testing` })
  s = notify(s, { orgIds: [ORG_IDS.ostlea], kind: 'testing', title: `Dana Kowalski asked Brindmoor Testing to test ${steel.length} items at ${tiverne.name}`, body: 'Tests: Steel coupon tests. Nothing is sent in the sandbox; the request is recorded here.', href: `/app/buildings/${TIVERNE_ID}/testing`, at: h.at(12, 10), actorUserId: null })
  read(TOM)
  s = log(s, { at: h.at(4, 11), orgIds: buildingOrgs, projectId: null, buildingId: TIVERNE_ID, actorUserId: DANA, actor: 'Dana Kowalski', text: 'recorded the testing visit', href: `/app/buildings/${TIVERNE_ID}/testing` })
  s = notify(s, { orgIds: [ORG_IDS.ostlea], kind: 'testing', title: `Testing visit booked at ${tiverne.name}`, body: `Brindmoor Testing on ${formatDate(testing.bookedFor!)}.`, href: `/app/buildings/${TIVERNE_ID}/testing`, at: h.at(4, 11), actorUserId: null })
  read(TOM)

  // A share link Tom made for enquiries about the primary steel; nobody has opened it yet.
  const w = structuredClone(s.world)
  w.shareLinks[TIVERNE_LINK_ID] = {
    id: TIVERNE_LINK_ID,
    ownerOrgId: ORG_IDS.ostlea,
    buildingId: TIVERNE_ID,
    lotIds: ['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06'].map((t) => lotForItem(w, itemByTag(w, t).id).id),
    label: 'Primary steel for enquiries',
    createdAt: h.at(6, 12),
    createdByPersonaId: PERSONA_IDS.tom,
    revokedAt: null,
    opens: [],
  }
  s = { ...s, world: w }
  s = log(s, { at: h.at(6, 12), orgIds: [ORG_IDS.ostlea], projectId: null, buildingId: TIVERNE_ID, actorUserId: TOM, actor: 'Tom Ashby', text: 'created a share link for 5 lots', href: `/app/buildings/${TIVERNE_ID}/sharing` })
  return s
}
