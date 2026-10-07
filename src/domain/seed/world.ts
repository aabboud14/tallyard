// The seed world (06-DATA.md sections A3 to A9, with brief/09-V1-PRODUCT.md sections 8 and 13). Loaded without randomness.
import type { BillLine, InventoryItem, Lot, Org, Persona, Project, Requirement, SourceBuilding, World, WasteEngagement, LedgerEntry, Spec, Quantity, Condition, Recoverability, TestStatus, SteelGrade, EraBand, TimingLevel, SeededDeal } from '../types'
import type { Wishlist } from '../v1types'
import { buildSnapshot, demandFromRequirements, type DemandLine } from './snapshot'
import { itemMeasures } from '../engines/measures'

export const SAMPLE_PHOTO_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#9aa5ae"/><text x="320" y="252" font-family="Arial, sans-serif" font-size="40" text-anchor="middle" fill="#14202b">Sample photo</text></svg>',
  )

export const ORG_IDS = {
  tallyard: 'org_tallyard',
  ostlea: 'org_ostlea',
  tarnbrook: 'org_tarnbrook',
  oriel: 'org_oriel',
  lantern: 'org_lantern',
  halewick: 'org_halewick',
  pellory: 'org_pellory',
  quillon: 'org_quillon',
  brackwater: 'org_brackwater',
} as const

export const PERSONA_IDS = { tom: 'per_tom', dana: 'per_dana', priya: 'per_priya', isla: 'per_isla', marcus: 'per_marcus', operator: 'per_operator' } as const

export const TIVERNE_ID = 'bld_zad898'
export const HARROWDEN_ID = 'bld_m5tq8r'
export const MERROWGATE_ID = 'prj_hp23zk'
export const SALLOW_ID = 'prj_k2r8sw'
export const FERRYMOOR_ID = 'prj_x6dq3n'
export const DURNLEY_ID = 'wst_6yy2w2'
export const STEEL_NEED_BY = '2028-04-03'

export const PUBLIC_ID_POOL = ['L-GMXG69', 'L-NNGR64', 'L-MNRF3J', 'L-AFJQ3Z', 'L-HFFX9J', 'L-K8CGH4']
export const ITEM_ID_POOL = ['itm_q7m2kd', 'itm_b4xr8n', 'itm_t9pa3c', 'itm_h2wn6f', 'itm_z5kq1v', 'itm_c8dm4s']

const orgs: Org[] = [
  { id: ORG_IDS.tallyard, name: 'Tallyard', type: 'Platform' },
  { id: ORG_IDS.ostlea, name: 'Ostlea Estates', type: 'Asset owner' },
  { id: ORG_IDS.tarnbrook, name: 'Tarnbrook Deconstruction', type: 'Deconstruction contractor' },
  { id: ORG_IDS.oriel, name: 'Studio Oriel', type: 'Architect' },
  { id: ORG_IDS.lantern, name: 'Lantern Quay Developments', type: 'Developer' },
  { id: ORG_IDS.halewick, name: 'Halewick Sustainability', type: 'Sustainability consultant' },
  { id: ORG_IDS.pellory, name: 'Pellory Estates', type: 'Asset owner' },
  { id: ORG_IDS.quillon, name: 'Quillon Homes', type: 'Developer' },
  { id: ORG_IDS.brackwater, name: 'Brackwater Estates', type: 'Asset owner' },
]

const personas: Persona[] = [
  { id: PERSONA_IDS.tom, name: 'Tom Ashby', orgId: ORG_IDS.ostlea, role: 'Asset manager', tier: 'active' },
  { id: PERSONA_IDS.dana, name: 'Dana Kowalski', orgId: ORG_IDS.tarnbrook, role: 'Site surveyor', tier: 'active' },
  { id: PERSONA_IDS.priya, name: 'Priya Nair', orgId: ORG_IDS.oriel, role: 'Project architect', tier: 'passive' },
  { id: PERSONA_IDS.isla, name: 'Isla Brennan', orgId: ORG_IDS.lantern, role: 'Development manager', tier: 'active' },
  { id: PERSONA_IDS.marcus, name: 'Marcus Lindqvist', orgId: ORG_IDS.halewick, role: 'Sustainability consultant', tier: 'passive' },
  { id: PERSONA_IDS.operator, name: 'Platform operator', orgId: ORG_IDS.tallyard, role: 'Operations', tier: 'platform' },
]

export const TIVERNE_STEEL_NOTE = 'Archive drawings indicate Grade 50B to BS 4360, roughly S355. Unconfirmed.'

const tiverne: SourceBuilding = {
  id: TIVERNE_ID,
  ownerOrgId: ORG_IDS.ostlea,
  sellerType: 'Asset owner',
  sourceType: 'deconstruction',
  name: 'Tiverne House',
  address: '14 Garnet Row, London EC2',
  postcodeDistrict: 'EC2',
  localAuthority: 'City of London',
  region: 'Central London',
  yearBuilt: 1984,
  eraBand: '1970 or later',
  storeys: 7,
  giaM2: 5200,
  structureType: 'Steel frame with composite slabs, stone and precast cladding, curtain wall added in 2003',
  tenants: ['Corvane Insurance', 'Meridale Partners'],
  programme: { stripOutStart: '2027-01-04', dismantlingStart: '2027-01-25', clearBy: '2027-04-30' },
  defaultHubId: 'HUB-BARK',
  surveyorOrgId: ORG_IDS.tarnbrook,
  locationLevel: 'region',
  timingLevel: 'quarter',
  arisingsTitle: 'owner',
  distancesKm: { 'HUB-BARK': 18, 'HUB-PARK': 14, 'HUB-TILB': 38, [MERROWGATE_ID]: 9 },
  surveyedBy: { personaName: 'Dana Kowalski', orgName: 'Tarnbrook Deconstruction', date: '2026-09-14' },
}

/** Version 1.0: a second client of the surveyor. Every record here is private; nothing is listed. */
const harrowden: SourceBuilding = {
  id: HARROWDEN_ID,
  ownerOrgId: ORG_IDS.brackwater,
  sellerType: 'Asset owner',
  sourceType: 'deconstruction',
  name: 'Harrowden Court',
  address: '31 Brindle Road, London W13',
  postcodeDistrict: 'W13',
  localAuthority: 'Ealing',
  region: 'Outer London West',
  yearBuilt: 1991,
  eraBand: '1970 or later',
  storeys: 5,
  giaM2: 4300,
  structureType: 'Steel frame with composite slabs, brick cladding and raised floors',
  tenants: [],
  programme: { stripOutStart: '2027-06-14', dismantlingStart: '2027-07-05', clearBy: '2027-09-24' },
  defaultHubId: 'HUB-PARK',
  surveyorOrgId: ORG_IDS.tarnbrook,
  locationLevel: 'region',
  timingLevel: 'quarter',
  arisingsTitle: 'owner',
  distancesKm: { 'HUB-BARK': 34, 'HUB-PARK': 5, 'HUB-TILB': 55, [MERROWGATE_ID]: 25, [SALLOW_ID]: 13, [FERRYMOOR_ID]: 19 },
  surveyedBy: { personaName: 'Dana Kowalski', orgName: 'Tarnbrook Deconstruction', date: '2026-09-28' },
}

type HcRow = { id: string; tag: string; publicId: string; spec: Spec; quantity: Quantity; condition: Condition; recoverability: Recoverability; location: string }

const HARROWDEN_AVAILABLE_FROM = '2027-07-05'

const hcRows: HcRow[] = [
  { id: 'itm_v3gk7p', tag: 'HC-01', publicId: 'L-K3TB7D', spec: { family: 'steel_section', designation: 'UB 356x171x51', lengthM: 6.0 }, quantity: { kind: 'pieces', pieces: 40 }, condition: 'B', recoverability: 'B', location: 'Floor beams, levels 1 to 4' },
  { id: 'itm_f8nr2j', tag: 'HC-02', publicId: 'L-P6HV2Q', spec: { family: 'clay_brick', brickType: 'facing', mortar: 'cement mortar' }, quantity: { kind: 'pieces', pieces: 12000 }, condition: 'B', recoverability: 'C', location: 'Outer leaf, rear and side elevations' },
  { id: 'itm_u6dy4b', tag: 'HC-03', publicId: 'L-X4NJ8G', spec: { family: 'raised_floor', panelSize: '600 by 600' }, quantity: { kind: 'pieces', pieces: 1800 }, condition: 'B', recoverability: 'A', location: 'Office floors, levels 1 to 4' },
]

type ThRow = { id: string; tag: string; publicId: string; spec: Spec; quantity: Quantity; condition: Condition; recoverability: Recoverability; availableFrom: string; location: string; visibility: 'private' | 'matched_only'; ask: number | null; reserve: number | null }

const thRows: ThRow[] = [
  { id: 'itm_7fk2qa', tag: 'TH-01', publicId: 'L-9F4CQQ', spec: { family: 'steel_section', designation: 'UB 457x191x67', lengthM: 7.5 }, quantity: { kind: 'pieces', pieces: 48 }, condition: 'A', recoverability: 'B', availableFrom: '2027-03-15', location: 'Secondary floor beams under composite slab, levels 1 to 6', visibility: 'private', ask: null, reserve: null },
  { id: 'itm_m3xd8p', tag: 'TH-02', publicId: 'L-WPX5A6', spec: { family: 'steel_section', designation: 'UB 533x210x92', lengthM: 9.0 }, quantity: { kind: 'pieces', pieces: 60 }, condition: 'A', recoverability: 'B', availableFrom: '2027-03-22', location: 'Primary beams, levels 1 to 6', visibility: 'matched_only', ask: 750, reserve: 685 },
  { id: 'itm_r9hw2c', tag: 'TH-03', publicId: 'L-MNY55K', spec: { family: 'steel_section', designation: 'UC 305x305x118', lengthM: 3.8 }, quantity: { kind: 'pieces', pieces: 54 }, condition: 'B', recoverability: 'B', availableFrom: '2027-04-12', location: 'Lower columns, concrete encased, cut at each floor, ground to level 3', visibility: 'matched_only', ask: 685, reserve: 625 },
  { id: 'itm_k4ns6t', tag: 'TH-04', publicId: 'L-2R8X5N', spec: { family: 'steel_section', designation: 'UB 610x229x113', lengthM: 9.0 }, quantity: { kind: 'pieces', pieces: 40 }, condition: 'B', recoverability: 'B', availableFrom: '2027-04-19', location: 'Heavy primary beams, ground and level 1', visibility: 'matched_only', ask: 640, reserve: 585 },
  { id: 'itm_p2vb7y', tag: 'TH-05', publicId: 'L-775DW8', spec: { family: 'steel_section', designation: 'UC 254x254x89', lengthM: 7.6 }, quantity: { kind: 'pieces', pieces: 36 }, condition: 'B', recoverability: 'A', availableFrom: '2027-03-29', location: 'Upper columns, two-storey lengths with bolted splices, levels 3 to 7', visibility: 'matched_only', ask: 685, reserve: 625 },
  { id: 'itm_w8qz3e', tag: 'TH-06', publicId: 'L-FQK92P', spec: { family: 'steel_section', designation: 'UB 406x178x60', lengthM: 6.0 }, quantity: { kind: 'pieces', pieces: 96 }, condition: 'A', recoverability: 'B', availableFrom: '2027-03-08', location: 'Infill beams, levels 1 to 6', visibility: 'matched_only', ask: 800, reserve: 730 },
  { id: 'itm_d6ct4m', tag: 'TH-07', publicId: 'L-DAXNV3', spec: { family: 'stone_cladding', stone: 'Portland', thicknessMm: 50 }, quantity: { kind: 'area', areaM2: 600 }, condition: 'A', recoverability: 'B', availableFrom: '2027-02-22', location: 'On fixings, north and east elevations', visibility: 'private', ask: null, reserve: null },
  { id: 'itm_y5lf9r', tag: 'TH-08', publicId: 'L-8N33X4', spec: { family: 'curtain_wall', system: 'Unitised', panelWidthM: 1.5, panelHeightM: 3.6 }, quantity: { kind: 'pieces', pieces: 78 }, condition: 'B', recoverability: 'A', availableFrom: '2027-02-15', location: 'Installed 2003, south elevation', visibility: 'private', ask: null, reserve: null },
  { id: 'itm_g1jm5h', tag: 'TH-09', publicId: 'L-323M2J', spec: { family: 'precast_cladding', thicknessMm: 150 }, quantity: { kind: 'area', areaM2: 1140 }, condition: 'B', recoverability: 'C', availableFrom: '2027-03-01', location: 'Cast-in fixings, west elevation and core', visibility: 'private', ask: null, reserve: null },
  { id: 'itm_n7rp2k', tag: 'TH-10', publicId: 'L-5RC3DR', spec: { family: 'clay_brick', brickType: 'facing', mortar: 'cement mortar' }, quantity: { kind: 'pieces', pieces: 20000 }, condition: 'B', recoverability: 'C', availableFrom: '2027-03-08', location: 'Plant enclosure and rear wall', visibility: 'private', ask: null, reserve: null },
  { id: 'itm_s3ek8w', tag: 'TH-11', publicId: 'L-33XJ8M', spec: { family: 'raised_floor', panelSize: '600 by 600' }, quantity: { kind: 'pieces', pieces: 3000 }, condition: 'B', recoverability: 'A', availableFrom: '2027-01-25', location: 'Levels 2 to 5', visibility: 'private', ask: null, reserve: null },
]

type OsRow = {
  id: string
  tag: string
  publicId: string
  sellerType: string
  sourceType: 'deconstruction' | 'unused_surplus' | 'fit_out_strip'
  spec: Spec
  quantity: Quantity
  grade: SteelGrade | null
  testStatus: TestStatus
  condition: Condition
  eraBand: EraBand | null
  hub: { id: string; since: string } | null
  availableFrom: string | null
  timingLevel: TimingLevel
  region: string
  sold: boolean
}

const osRows: OsRow[] = [
  { id: 'itm_a1b2c3', tag: 'OS-11', publicId: 'L-NHZ32R', sellerType: 'Deconstruction contractor', sourceType: 'deconstruction', spec: { family: 'steel_section', designation: 'UB 457x191x67', lengthM: 9.0 }, quantity: { kind: 'pieces', pieces: 16 }, grade: 'S355', testStatus: 'tested', condition: 'A', eraBand: '1970 or later', hub: { id: 'HUB-BARK', since: '2026-09-01' }, availableFrom: null, timingLevel: 'quarter', region: 'Outer London East', sold: false },
  { id: 'itm_d4e5f6', tag: 'OS-12', publicId: 'L-6DN4K3', sellerType: 'Deconstruction contractor', sourceType: 'deconstruction', spec: { family: 'steel_section', designation: 'UB 457x191x82', lengthM: 8.0 }, quantity: { kind: 'pieces', pieces: 10 }, grade: 'S355', testStatus: 'tested', condition: 'A', eraBand: '1970 or later', hub: null, availableFrom: '2026-11-15', timingLevel: 'month', region: 'Inner London East', sold: false },
  { id: 'itm_g7h8i9', tag: 'OS-13', publicId: 'L-Q58AZF', sellerType: 'Waste management firm', sourceType: 'deconstruction', spec: { family: 'steel_section', designation: 'UB 610x229x125', lengthM: 9.5 }, quantity: { kind: 'pieces', pieces: 12 }, grade: 'S275', testStatus: 'tested', condition: 'B', eraBand: 'before 1970', hub: { id: 'HUB-TILB', since: '2026-06-15' }, availableFrom: null, timingLevel: 'quarter', region: 'East of England', sold: false },
  { id: 'itm_j1k2l3', tag: 'OS-14', publicId: 'L-2MAC36', sellerType: 'Deconstruction contractor', sourceType: 'deconstruction', spec: { family: 'steel_section', designation: 'UC 305x305x97', lengthM: 4.2 }, quantity: { kind: 'pieces', pieces: 30 }, grade: 'S355', testStatus: 'tested', condition: 'A', eraBand: '1970 or later', hub: { id: 'HUB-BARK', since: '2026-08-03' }, availableFrom: null, timingLevel: 'quarter', region: 'Outer London East', sold: false },
  { id: 'itm_m4n5o6', tag: 'OS-15', publicId: 'L-53XY6Y', sellerType: 'Asset owner', sourceType: 'deconstruction', spec: { family: 'steel_section', designation: 'UC 203x203x60', lengthM: 3.2 }, quantity: { kind: 'pieces', pieces: 24 }, grade: 'unknown', testStatus: 'untested', condition: 'B', eraBand: '1970 or later', hub: null, availableFrom: '2027-01-11', timingLevel: 'quarter', region: 'Outer London West', sold: false },
  { id: 'itm_p7q8r9', tag: 'OS-16', publicId: 'L-R7ZRMD', sellerType: 'Contractor', sourceType: 'unused_surplus', spec: { family: 'steel_section', designation: 'UB 356x171x51', lengthM: 5.0 }, quantity: { kind: 'pieces', pieces: 36 }, grade: 'S275', testStatus: 'inspected', condition: 'B', eraBand: null, hub: null, availableFrom: '2026-12-07', timingLevel: 'quarter', region: 'Inner London West', sold: false },
  { id: 'itm_s1t2u3', tag: 'OS-17', publicId: 'L-YZ2C7H', sellerType: 'Manufacturer', sourceType: 'unused_surplus', spec: { family: 'steel_section', designation: 'UB 305x165x40', lengthM: 4.5 }, quantity: { kind: 'pieces', pieces: 50 }, grade: 'S275', testStatus: 'certified', condition: 'A', eraBand: null, hub: null, availableFrom: null, timingLevel: 'quarter', region: 'South East', sold: false },
  { id: 'itm_v4w5x6', tag: 'OS-18', publicId: 'L-Q23X7N', sellerType: 'Asset owner', sourceType: 'deconstruction', spec: { family: 'stone_cladding', stone: 'Portland', thicknessMm: 50 }, quantity: { kind: 'area', areaM2: 180 }, grade: null, testStatus: 'inspected', condition: 'B', eraBand: null, hub: null, availableFrom: '2027-02-08', timingLevel: 'quarter', region: 'Central London', sold: false },
  { id: 'itm_y7z8a9', tag: 'OS-19', publicId: 'L-A945G6', sellerType: 'Deconstruction contractor', sourceType: 'deconstruction', spec: { family: 'clay_brick', brickType: 'London stock', mortar: 'lime mortar' }, quantity: { kind: 'pieces', pieces: 45000 }, grade: null, testStatus: 'inspected', condition: 'A', eraBand: null, hub: { id: 'HUB-TILB', since: '2026-05-11' }, availableFrom: null, timingLevel: 'quarter', region: 'East of England', sold: false },
  { id: 'itm_b1c2d3', tag: 'OS-20', publicId: 'L-CJGQP7', sellerType: 'Deconstruction contractor', sourceType: 'deconstruction', spec: { family: 'timber_joist', species: 'pitch pine' }, quantity: { kind: 'volume', volumeM3: 22 }, grade: null, testStatus: 'inspected', condition: 'B', eraBand: null, hub: { id: 'HUB-PARK', since: '2026-07-20' }, availableFrom: null, timingLevel: 'quarter', region: 'Outer London West', sold: false },
  { id: 'itm_e4f5g6', tag: 'OS-21', publicId: 'L-R8Q33F', sellerType: 'Asset owner', sourceType: 'deconstruction', spec: { family: 'stone_cladding', stone: 'Portland', thicknessMm: 50 }, quantity: { kind: 'area', areaM2: 520 }, grade: null, testStatus: 'inspected', condition: 'A', eraBand: null, hub: { id: 'HUB-BARK', since: '2026-09-14' }, availableFrom: null, timingLevel: 'quarter', region: 'Outer London East', sold: true },
  { id: 'itm_h7i8j9', tag: 'OS-22', publicId: 'L-5APGJ7', sellerType: 'Property manager', sourceType: 'fit_out_strip', spec: { family: 'raised_floor', panelSize: '600 by 600' }, quantity: { kind: 'pieces', pieces: 3800 }, grade: null, testStatus: 'inspected', condition: 'B', eraBand: null, hub: { id: 'HUB-PARK', since: '2026-09-21' }, availableFrom: null, timingLevel: 'quarter', region: 'Outer London West', sold: true },
  { id: 'itm_k1l2m3', tag: 'OS-23', publicId: 'L-6VWCWH', sellerType: 'Property manager', sourceType: 'fit_out_strip', spec: { family: 'raised_floor', panelSize: '600 by 600' }, quantity: { kind: 'pieces', pieces: 6500 }, grade: null, testStatus: 'untested', condition: 'B', eraBand: null, hub: { id: 'HUB-PARK', since: '2026-09-14' }, availableFrom: null, timingLevel: 'quarter', region: 'Outer London West', sold: false },
  { id: 'itm_n4o5p6', tag: 'OS-24', publicId: 'L-9XXQC3', sellerType: 'Asset owner', sourceType: 'deconstruction', spec: { family: 'curtain_wall', system: 'Unitised', panelWidthM: 1.5, panelHeightM: 3.3 }, quantity: { kind: 'pieces', pieces: 96 }, grade: null, testStatus: 'untested', condition: 'B', eraBand: null, hub: null, availableFrom: '2027-04-12', timingLevel: 'quarter', region: 'Inner London East', sold: false },
  { id: 'itm_q7r8s9', tag: 'OS-25', publicId: 'L-J4WX28', sellerType: 'Waste management firm', sourceType: 'deconstruction', spec: { family: 'precast_cladding', thicknessMm: 150 }, quantity: { kind: 'area', areaM2: 300 }, grade: null, testStatus: 'untested', condition: 'B', eraBand: null, hub: { id: 'HUB-TILB', since: '2026-07-06' }, availableFrom: null, timingLevel: 'quarter', region: 'East of England', sold: false },
  { id: 'itm_t1u2v3', tag: 'OS-26', publicId: 'L-8WARGH', sellerType: 'Waste management firm', sourceType: 'deconstruction', spec: { family: 'clay_brick', brickType: 'facing', mortar: 'cement mortar' }, quantity: { kind: 'pieces', pieces: 18000 }, grade: null, testStatus: 'untested', condition: 'C', eraBand: null, hub: { id: 'HUB-TILB', since: '2026-07-06' }, availableFrom: null, timingLevel: 'quarter', region: 'East of England', sold: false },
  { id: 'itm_w4x5y6', tag: 'OS-27', publicId: 'L-6APVMW', sellerType: 'Asset owner', sourceType: 'deconstruction', spec: { family: 'steel_section', designation: 'UB 533x210x82', lengthM: 7.5 }, quantity: { kind: 'pieces', pieces: 20 }, grade: 'unknown', testStatus: 'untested', condition: 'A', eraBand: '1970 or later', hub: null, availableFrom: '2027-03-03', timingLevel: 'quarter', region: 'Outer London East', sold: false },
  { id: 'itm_z7a8b9', tag: 'OS-28', publicId: 'L-YJ4Z6W', sellerType: 'Deconstruction contractor', sourceType: 'deconstruction', spec: { family: 'steel_section', designation: 'UC 254x254x73', lengthM: 3.5 }, quantity: { kind: 'pieces', pieces: 28 }, grade: 'S355', testStatus: 'tested', condition: 'A', eraBand: '1970 or later', hub: { id: 'HUB-BARK', since: '2026-08-24' }, availableFrom: null, timingLevel: 'quarter', region: 'Outer London East', sold: false },
]

export const MERROWGATE_REQUIREMENTS: Requirement[] = [
  { ref: 'R1', designation: 'UB 457x191x67', lengthM: 7.2, count: 52, minGrade: 'S355', needBy: STEEL_NEED_BY },
  { ref: 'R2', designation: 'UB 533x210x92', lengthM: 8.4, count: 12, minGrade: 'S355', needBy: STEEL_NEED_BY },
  { ref: 'R3', designation: 'UC 305x305x118', lengthM: 3.6, count: 10, minGrade: 'S355', needBy: STEEL_NEED_BY },
  { ref: 'R4', designation: 'UB 457x191x74', lengthM: 7.2, count: 8, minGrade: 'S355', needBy: STEEL_NEED_BY },
  { ref: 'R5', designation: 'UB 610x229x125', lengthM: 10.5, count: 6, minGrade: 'S355', needBy: STEEL_NEED_BY },
  { ref: 'R6', designation: 'UB 406x178x54', lengthM: 5.5, count: 14, minGrade: 'S275', needBy: STEEL_NEED_BY },
]

/** Other demand: two projects that exist only as requirement lines in the snapshot and are never shown. */
export const OTHER_DEMAND: DemandLine[] = [
  { kind: 'steel', designation: 'UB 457x191x67', lengthM: 8.0, count: 60 },
  { kind: 'steel', designation: 'UB 457x191x98', lengthM: 7.0, count: 10 },
  { kind: 'steel', designation: 'UB 533x210x92', lengthM: 8.0, count: 40 },
  { kind: 'steel', designation: 'UC 305x305x118', lengthM: 3.6, count: 40 },
  { kind: 'steel', designation: 'UC 254x254x89', lengthM: 3.6, count: 60 },
  { kind: 'steel', designation: 'UC 254x254x73', lengthM: 3.5, count: 12 },
  { kind: 'steel', designation: 'UB 406x178x60', lengthM: 6.0, count: 150 },
  { kind: 'steel', designation: 'UB 406x178x67', lengthM: 6.0, count: 20 },
  { kind: 'family', family: 'stone_cladding', units: 450 },
  { kind: 'family', family: 'clay_brick', units: 40000 },
  { kind: 'family', family: 'raised_floor', units: 2000 },
  { kind: 'family', family: 'raised_floor', units: 5000 },
  { kind: 'family', family: 'clay_brick', units: 12000 },
  { kind: 'family', family: 'timber_joist', units: 14 },
]

const billOfMaterials: BillLine[] = [
  { id: 'bom01', element: '1 Substructure', layer: 'Substructure', massT: 9600, valueGbp: 610000, recycledShare: 0.1, family: null, lineQty: null },
  { id: 'bom02', element: '1 Substructure', layer: 'Substructure', massT: 420, valueGbp: 340000, recycledShare: 0.97, family: null, lineQty: null },
  { id: 'bom03', element: '2.1 Frame', layer: 'Superstructure', massT: 1150, valueGbp: 1150000, recycledShare: 0.25, family: 'steel_section', lineQty: 1150 },
  { id: 'bom04', element: '2.2 Upper floors', layer: 'Superstructure', massT: 185, valueGbp: 230000, recycledShare: 0.25, family: null, lineQty: null },
  { id: 'bom05', element: '2.2 Upper floors', layer: 'Superstructure', massT: 6300, valueGbp: 420000, recycledShare: 0.12, family: null, lineQty: null },
  { id: 'bom06', element: '2.3 Roof', layer: 'Shell/Skin', massT: 140, valueGbp: 190000, recycledShare: 0.08, family: null, lineQty: null },
  { id: 'bom07', element: '2.5 External walls', layer: 'Shell/Skin', massT: 269.5, valueGbp: 4900000, recycledShare: 0.18, family: null, lineQty: null },
  { id: 'bom08', element: '2.5 External walls', layer: 'Shell/Skin', massT: 57.2, valueGbp: 234000, recycledShare: 0.0, family: 'stone_cladding', lineQty: 520 },
  { id: 'bom09', element: '2.7 Internal walls and partitions', layer: 'Space', massT: 560, valueGbp: 330000, recycledShare: 0.35, family: null, lineQty: null },
  { id: 'bom10', element: '3 Internal finishes', layer: 'Space', massT: 367.2, valueGbp: 336600, recycledShare: 0.2, family: 'raised_floor', lineQty: 30600 },
  { id: 'bom11', element: '3 Internal finishes', layer: 'Space', massT: 230, valueGbp: 390000, recycledShare: 0.1, family: null, lineQty: null },
  { id: 'bom12', element: '5 Services', layer: 'Services', massT: 380, valueGbp: 2550000, recycledShare: 0.06, family: null, lineQty: null },
]

export const BILL_LINE_NAMES: Record<string, string> = {
  bom01: 'Concrete in foundations and basement',
  bom02: 'Reinforcement',
  bom03: 'Structural steel sections',
  bom04: 'Metal decking',
  bom05: 'Concrete and mesh in composite slabs',
  bom06: 'Roof coverings and insulation',
  bom07: 'Unitised curtain wall',
  bom08: 'Stone cladding',
  bom09: 'Partitions and linings',
  bom10: 'Raised access floor',
  bom11: 'Other floor, wall and ceiling finishes',
  bom12: 'Building services plant and distribution',
}

const seededDeals: SeededDeal[] = [
  { id: 'deal_seed_1', publicId: 'L-R8Q33F', family: 'stone_cladding', description: 'Portland stone cladding, 50 mm', quantityLabel: '520 m2', quantityUnits: 520, massT: 57.2, agreedPricePerUnit: 175, materialGbp: 91000, hubId: 'HUB-BARK', confirmedOn: '2026-09-14', avoidedT: 4.4974, avoidedPercent: 0.847 },
  { id: 'deal_seed_2', publicId: 'L-5APGJ7', family: 'raised_floor', description: 'Raised access floor panels, 600 by 600', quantityLabel: '3,800 panels (1,368 m2)', quantityUnits: 3800, massT: 45.6, agreedPricePerUnit: 3.7, materialGbp: 14060, hubId: 'HUB-PARK', confirmedOn: '2026-09-21', avoidedT: 43.3, avoidedPercent: 0.783 },
]

const merrowgate: Project = {
  id: MERROWGATE_ID,
  name: 'Merrowgate Wharf',
  developerOrgId: ORG_IDS.lantern,
  clientOrgId: ORG_IDS.lantern,
  architectOrgId: ORG_IDS.oriel,
  projectType: 'office',
  startDate: STEEL_NEED_BY,
  createdBy: null,
  teamOrgIds: [ORG_IDS.oriel, ORG_IDS.halewick],
  /** The client persona comes first: she is the buyer contact exchanged at confirmation. */
  teamPersonaIds: [PERSONA_IDS.isla, PERSONA_IDS.priya, PERSONA_IDS.marcus],
  postcodeDistrict: 'E16',
  localAuthority: 'Newham',
  region: 'Inner London East',
  blind: { orgType: 'Design team', projectType: 'commercial project' },
  giaM2: 16500,
  ribaStage: 2,
  description: 'A ten-storey commercial building, 38 m high, 16,500 m2 GIA, referable to the Mayor. Steel frame of about 1,150 t.',
  keyDates: { planningSubmission: '2027-01-15', steelNeedBy: STEEL_NEED_BY },
  frameMassT: 1150,
  billOfMaterials,
  requirements: MERROWGATE_REQUIREMENTS,
  matchResult: null,
  planItems: [],
  termsAccepted: false,
  approvedByOwnerOrgIds: [ORG_IDS.ostlea],
  seededDeals,
  hubDistancesKm: { 'HUB-BARK': 14, 'HUB-PARK': 24, 'HUB-TILB': 31 },
  consultantOrgId: ORG_IDS.halewick,
  targets: { contentByValue: 0.25, avoidedCarbonT: 150 },
}

const SALLOW_START = '2028-01-10'

/** Version 1.0: a second project for the architect. Bill, schedule and plan are empty; distances are placeholders. */
const sallow: Project = {
  id: SALLOW_ID,
  name: 'Sallow Court',
  developerOrgId: ORG_IDS.pellory,
  clientOrgId: ORG_IDS.pellory,
  architectOrgId: ORG_IDS.oriel,
  projectType: 'hotel',
  startDate: SALLOW_START,
  createdBy: null,
  teamOrgIds: [ORG_IDS.oriel, ORG_IDS.halewick],
  teamPersonaIds: [PERSONA_IDS.priya, PERSONA_IDS.marcus],
  postcodeDistrict: 'NW1',
  localAuthority: 'Camden',
  region: 'Central London',
  blind: { orgType: 'Design team', projectType: 'hotel project' },
  giaM2: 9800,
  ribaStage: 1,
  description: 'A hotel of 9,800 m2 GIA at RIBA stage 1.',
  keyDates: { planningSubmission: SALLOW_START, steelNeedBy: SALLOW_START },
  frameMassT: 0,
  billOfMaterials: [],
  requirements: [],
  matchResult: null,
  planItems: [],
  termsAccepted: false,
  approvedByOwnerOrgIds: [],
  seededDeals: [],
  hubDistancesKm: { 'HUB-BARK': 17, 'HUB-PARK': 11, 'HUB-TILB': 41 },
  consultantOrgId: ORG_IDS.halewick,
  targets: { contentByValue: 0, avoidedCarbonT: 0 },
}

const FERRYMOOR_START = '2027-06-07'

/** Version 1.0: a third project for the architect. Bill, schedule and plan are empty; distances are placeholders. */
const ferrymoor: Project = {
  id: FERRYMOOR_ID,
  name: 'Ferrymoor Yard',
  developerOrgId: ORG_IDS.quillon,
  clientOrgId: ORG_IDS.quillon,
  architectOrgId: ORG_IDS.oriel,
  projectType: 'residential',
  startDate: FERRYMOOR_START,
  createdBy: null,
  teamOrgIds: [ORG_IDS.oriel, ORG_IDS.halewick],
  teamPersonaIds: [PERSONA_IDS.priya, PERSONA_IDS.marcus],
  postcodeDistrict: 'E9',
  localAuthority: 'Hackney',
  region: 'Inner London East',
  blind: { orgType: 'Design team', projectType: 'residential project' },
  giaM2: 12400,
  ribaStage: 3,
  description: 'A residential scheme of 12,400 m2 GIA at RIBA stage 3.',
  keyDates: { planningSubmission: FERRYMOOR_START, steelNeedBy: FERRYMOOR_START },
  frameMassT: 0,
  billOfMaterials: [],
  requirements: [],
  matchResult: null,
  planItems: [],
  termsAccepted: false,
  approvedByOwnerOrgIds: [],
  seededDeals: [],
  hubDistancesKm: { 'HUB-BARK': 12, 'HUB-PARK': 19, 'HUB-TILB': 33 },
  consultantOrgId: ORG_IDS.halewick,
  targets: { contentByValue: 0, avoidedCarbonT: 0 },
}

/** One wish list per project, plus Studio Oriel's general list (projectId null). Seeded items are open lots only. */
const wishlistsSeed: Wishlist[] = [
  { id: 'wl_hp23zk', orgId: ORG_IDS.oriel, projectId: MERROWGATE_ID, items: [] },
  {
    id: 'wl_k2r8sw',
    orgId: ORG_IDS.oriel,
    projectId: SALLOW_ID,
    items: [
      { id: 'wli_k2r8sw_1', publicId: 'L-Q23X7N', addedOn: '2026-09-29', addedByPersonaId: PERSONA_IDS.priya, note: 'Portland stone for the entrance front, subject to a colour match', status: 'pending', decidedOn: null, decisionNote: null },
      { id: 'wli_k2r8sw_2', publicId: 'L-A945G6', addedOn: '2026-10-01', addedByPersonaId: PERSONA_IDS.priya, note: 'London stock for the courtyard walls', status: 'pending', decidedOn: null, decisionNote: null },
    ],
  },
  {
    id: 'wl_x6dq3n',
    orgId: ORG_IDS.oriel,
    projectId: FERRYMOOR_ID,
    items: [{ id: 'wli_x6dq3n_1', publicId: 'L-6VWCWH', addedOn: '2026-09-22', addedByPersonaId: PERSONA_IDS.priya, note: 'Raised floor for the ground floor workspace units', status: 'sent', decidedOn: null, decisionNote: null }],
  },
  {
    id: 'wl_oriel',
    orgId: ORG_IDS.oriel,
    projectId: null,
    items: [{ id: 'wli_oriel_1', publicId: 'L-CJGQP7', addedOn: '2026-09-17', addedByPersonaId: PERSONA_IDS.priya, note: 'Pitch pine for joinery, no project yet', status: 'pending', decidedOn: null, decisionNote: null }],
  },
]

const durnley: WasteEngagement = {
  id: DURNLEY_ID,
  name: 'Durnley House',
  buildingName: 'Durnley House',
  ownerOrgId: ORG_IDS.pellory,
  consultantOrgId: ORG_IDS.halewick,
  giaM2: 15800,
  period: 'Deconstructed in the first half of 2026',
  bill: null,
}

const ledgerSeed: LedgerEntry[] = [
  { id: 'led_seed_1', label: 'Commission, stone cladding deal L-R8Q33F, September 2026', amount: 7280.0, kind: 'seed', note: null, publicId: 'L-R8Q33F' },
  { id: 'led_seed_2', label: 'Commission, raised access floor deal L-5APGJ7, September 2026', amount: 1124.8, kind: 'seed', note: null, publicId: 'L-5APGJ7' },
  { id: 'led_seed_3', label: 'Data and insights (placeholder)', amount: 6000.0, kind: 'seed', note: 'placeholder', publicId: null },
  { id: 'led_seed_4', label: 'Survey referral (not simulated)', amount: 0, kind: 'seed', note: 'not simulated', publicId: null },
  { id: 'led_sub', label: 'Subscriptions, annual: 9 suppliers, 3 buyer organisations, 14 professional seats', amount: 70800.0, kind: 'subscription', note: null, publicId: null },
]

function osBuildingId(itemId: string): string {
  return 'bld_' + itemId.slice(4)
}

export function createSeed(): World {
  const buildings: Record<string, SourceBuilding> = {
    [tiverne.id]: { ...tiverne, distancesKm: { ...tiverne.distancesKm } },
    [harrowden.id]: { ...harrowden, distancesKm: { ...harrowden.distancesKm } },
  }
  const items: Record<string, InventoryItem> = {}
  const lots: Record<string, Lot> = {}
  for (const r of thRows) {
    items[r.id] = {
      id: r.id,
      buildingId: TIVERNE_ID,
      tag: r.tag,
      family: r.spec.family,
      spec: r.spec,
      quantity: r.quantity,
      condition: r.condition,
      recoverability: r.recoverability,
      testStatus: 'untested',
      grade: r.spec.family === 'steel_section' ? 'unknown' : null,
      location: r.location,
      photos: r.tag === 'TH-01' ? [{ id: 'pho_th01', kind: 'data', src: SAMPLE_PHOTO_DATA_URI, isPublic: false }] : [],
      notes: r.spec.family === 'steel_section' ? TIVERNE_STEEL_NOTE : '',
      capturedBy: 'Dana Kowalski',
      capturedOn: '2026-09-14',
      expectedAvailableFrom: r.availableFrom,
    }
    lots['lot_' + r.id.slice(4)] = {
      id: 'lot_' + r.id.slice(4),
      itemId: r.id,
      publicId: r.publicId,
      visibility: r.visibility,
      piecesOnOffer: r.quantity.kind === 'pieces' ? r.quantity.pieces : null,
      shareOnOffer: 1,
      availableFrom: r.availableFrom,
      inStock: null,
      listedMonth: r.visibility === 'matched_only' ? '2026-09' : null,
      askPerUnit: r.ask,
      reservePerUnit: r.reserve,
      sold: false,
    }
  }
  for (const r of hcRows) {
    items[r.id] = {
      id: r.id,
      buildingId: HARROWDEN_ID,
      tag: r.tag,
      family: r.spec.family,
      spec: r.spec,
      quantity: r.quantity,
      condition: r.condition,
      recoverability: r.recoverability,
      testStatus: 'untested',
      grade: r.spec.family === 'steel_section' ? 'unknown' : null,
      location: r.location,
      photos: [],
      notes: '',
      capturedBy: 'Dana Kowalski',
      capturedOn: '2026-09-28',
      expectedAvailableFrom: HARROWDEN_AVAILABLE_FROM,
    }
    lots['lot_' + r.id.slice(4)] = {
      id: 'lot_' + r.id.slice(4),
      itemId: r.id,
      publicId: r.publicId,
      visibility: 'private',
      piecesOnOffer: r.quantity.kind === 'pieces' ? r.quantity.pieces : null,
      shareOnOffer: 1,
      availableFrom: HARROWDEN_AVAILABLE_FROM,
      inStock: null,
      listedMonth: null,
      askPerUnit: null,
      reservePerUnit: null,
      sold: false,
    }
  }
  for (const r of osRows) {
    const bid = osBuildingId(r.id)
    buildings[bid] = {
      id: bid,
      ownerOrgId: null,
      sellerType: r.sellerType,
      sourceType: r.sourceType,
      name: '',
      address: '',
      postcodeDistrict: '',
      localAuthority: '',
      region: r.region,
      yearBuilt: null,
      eraBand: r.eraBand,
      storeys: null,
      giaM2: null,
      structureType: '',
      tenants: [],
      programme: { stripOutStart: null, dismantlingStart: null, clearBy: null },
      defaultHubId: r.hub?.id ?? null,
      surveyorOrgId: null,
      locationLevel: 'region',
      timingLevel: r.timingLevel,
      arisingsTitle: r.sellerType === 'Deconstruction contractor' ? 'contractor' : 'owner',
      distancesKm: {},
      surveyedBy: null,
    }
    items[r.id] = {
      id: r.id,
      buildingId: bid,
      tag: r.tag,
      family: r.spec.family,
      spec: r.spec,
      quantity: r.quantity,
      condition: r.condition,
      recoverability: 'B',
      testStatus: r.testStatus,
      grade: r.grade,
      location: '',
      photos: [],
      notes: '',
      capturedBy: '',
      capturedOn: '2026-09-01',
      expectedAvailableFrom: null,
    }
    lots['lot_' + r.id.slice(4)] = {
      id: 'lot_' + r.id.slice(4),
      itemId: r.id,
      publicId: r.publicId,
      visibility: 'open',
      piecesOnOffer: r.sold ? 0 : r.quantity.kind === 'pieces' ? r.quantity.pieces : null,
      shareOnOffer: r.sold ? 0 : 1,
      availableFrom: r.availableFrom,
      inStock: r.hub ? { hubId: r.hub.id, since: r.hub.since } : null,
      listedMonth: '2026-09',
      askPerUnit: null,
      reservePerUnit: null,
      sold: r.sold,
    }
  }
  const openLots = osRows.map((r) => ({ lot: lots['lot_' + r.id.slice(4)], item: items[r.id] }))
  const snapshot = buildSnapshot(openLots, [...demandFromRequirements(MERROWGATE_REQUIREMENTS), ...OTHER_DEMAND])
  return {
    orgs: Object.fromEntries(orgs.map((o) => [o.id, { ...o }])),
    personas: Object.fromEntries(personas.map((p) => [p.id, { ...p }])),
    buildings,
    items,
    lots,
    projects: Object.fromEntries([merrowgate, sallow, ferrymoor].map((p) => [p.id, structuredClone(p)])),
    deals: {},
    engagements: { [durnley.id]: structuredClone(durnley) },
    wishlists: Object.fromEntries(wishlistsSeed.map((l) => [l.id, structuredClone(l)])),
    snapshot,
    ledger: ledgerSeed.map((l) => ({ ...l })),
    publicIdPool: [...PUBLIC_ID_POOL],
    itemIdPool: [...ITEM_ID_POOL],
  }
}

export function lotForItem(world: World, itemId: string): Lot {
  const lot = Object.values(world.lots).find((l) => l.itemId === itemId)
  if (!lot) throw new Error('No lot for item ' + itemId)
  return lot
}

export function lotByPublicId(world: World, publicId: string): Lot | undefined {
  return Object.values(world.lots).find((l) => l.publicId === publicId)
}

export function itemByTag(world: World, tag: string): InventoryItem {
  const item = Object.values(world.items).find((i) => i.tag === tag)
  if (!item) throw new Error('No item ' + tag)
  return item
}

export function itemUnits(item: InventoryItem): number {
  return itemMeasures(item).units
}
