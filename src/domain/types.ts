// Data model (03-ENGINES.md section 2). The private and public split is the point.

export type FamilyId =
  | 'steel_section'
  | 'curtain_wall'
  | 'precast_cladding'
  | 'stone_cladding'
  | 'clay_brick'
  | 'raised_floor'
  | 'timber_joist'

export type Condition = 'A' | 'B' | 'C'
export type Recoverability = 'A' | 'B' | 'C'
export type TestStatus = 'untested' | 'inspected' | 'tested' | 'certified'
export type SteelGrade = 'S275' | 'S355' | 'unknown'
export type SourceType = 'deconstruction' | 'unused_surplus' | 'fit_out_strip'
export type Visibility = 'private' | 'matched_only' | 'open'
export type LocationLevel = 'region' | 'local_authority'
export type TimingLevel = 'quarter' | 'month'
export type Signal = 'low' | 'balanced' | 'high'
export type EraBand = '1970 or later' | 'before 1970'
export type StorageNeed = 'open_or_covered' | 'covered_only'
export type FactorStatus = 'published' | 'indicative' | 'placeholder'
export type ReferenceStatus = FactorStatus | 'candidate'

export type SteelSpec = { designation: string; lengthM: number }
export type CurtainWallSpec = { system: string; panelWidthM: number; panelHeightM: number }
export type PrecastSpec = { thicknessMm: number }
export type StoneSpec = { stone: string; thicknessMm: number }
export type BrickSpec = { brickType: string; mortar: string }
export type RaisedFloorSpec = { panelSize: string }
export type TimberSpec = { species: string }

export type Spec =
  | ({ family: 'steel_section' } & SteelSpec)
  | ({ family: 'curtain_wall' } & CurtainWallSpec)
  | ({ family: 'precast_cladding' } & PrecastSpec)
  | ({ family: 'stone_cladding' } & StoneSpec)
  | ({ family: 'clay_brick' } & BrickSpec)
  | ({ family: 'raised_floor' } & RaisedFloorSpec)
  | ({ family: 'timber_joist' } & TimberSpec)

/** Quantity as captured: pieces for countable families, area or volume for the others. */
export type Quantity =
  | { kind: 'pieces'; pieces: number }
  | { kind: 'area'; areaM2: number }
  | { kind: 'volume'; volumeM3: number }

export type Photo = { id: string; kind: 'data' | 'blob'; src: string | null; isPublic: boolean }

export type Org = {
  id: string
  name: string
  type: string
}

export type Persona = {
  id: string
  name: string
  orgId: string
  role: string
  tier: 'active' | 'passive' | 'platform'
}

/** A source of lots: a building the owner is dismantling, or another seller's stock. Private. */
export type SourceBuilding = {
  id: string
  ownerOrgId: string | null
  sellerType: string
  sourceType: SourceType
  name: string
  address: string
  postcodeDistrict: string
  localAuthority: string
  region: string
  yearBuilt: number | null
  eraBand: EraBand | null
  storeys: number | null
  giaM2: number | null
  structureType: string
  tenants: string[]
  programme: { stripOutStart: string | null; dismantlingStart: string | null; clearBy: string | null }
  defaultHubId: string | null
  locationLevel: LocationLevel
  timingLevel: TimingLevel
  /** Record data: km from the source to each hub and project. */
  distancesKm: Record<string, number>
  surveyedBy: { personaName: string; orgName: string; date: string } | null
}

export type InventoryItem = {
  id: string
  buildingId: string
  tag: string
  family: FamilyId
  spec: Spec
  quantity: Quantity
  condition: Condition
  recoverability: Recoverability
  testStatus: TestStatus
  grade: SteelGrade | null
  location: string
  photos: Photo[]
  notes: string
  capturedBy: string
  capturedOn: string
}

export type Lot = {
  id: string
  itemId: string
  publicId: string
  visibility: Visibility
  /** Pieces still on offer for countable families; null otherwise. */
  piecesOnOffer: number | null
  /** Share of the captured quantity still on offer for area and volume families (1 = all). */
  shareOnOffer: number
  availableFrom: string | null
  inStock: { hubId: string; since: string } | null
  listedMonth: string | null
  askPerUnit: number | null
  reservePerUnit: number | null
  sold: boolean
}

export type Availability =
  | { kind: 'now' }
  | { kind: 'window'; level: TimingLevel; label: string; windowStart: string; windowEnd: string }

export type PublicLocation = { level: LocationLevel; label: string }

export type PublicQuantity = { value: number; unit: string; pieces: number | null }

export type PublicPrice = { guide: number; low: number; high: number; signal: Signal }

export type PublicCarbon = { avoidedT: number; percent: number } | null

export type PublicListing = {
  publicId: string
  sharing: 'open' | 'in_confidence'
  family: FamilyId
  title: string
  spec: Spec
  quantity: PublicQuantity
  massT: number
  condition: Condition
  testStatus: TestStatus
  grade: SteelGrade | null
  sourceType: SourceType
  sellerType: string
  eraBand: EraBand | null
  location: PublicLocation
  availability: Availability
  collectionHubId: string | null
  listedMonth: string
  status: 'Available' | 'No longer available'
  price: PublicPrice
  carbon: PublicCarbon
  photos: { id: string; src: string | null }[]
}

export type BlindBuyer = { orgType: string; projectType: string; region: string; needByQuarter: string }

export type Requirement = {
  ref: string
  designation: string
  lengthM: number
  count: number
  minGrade: SteelGrade
  needBy: string
}

export type BillLine = {
  id: string
  element: string
  layer: string
  massT: number
  valueGbp: number
  recycledShare: number
  family: FamilyId | null
  lineQty: number | null
}

export type SeededDeal = {
  id: string
  publicId: string
  family: FamilyId
  description: string
  quantityLabel: string
  quantityUnits: number
  massT: number
  agreedPricePerUnit: number
  materialGbp: number
  hubId: string
  confirmedOn: string
  avoidedT: number
  avoidedPercent: number
}

export type PlanStatus = 'planned' | 'agreed_in_principle' | 'awaiting_seller' | 'confirmed' | 'no_agreement'

export type Package = { route: 'hub' | 'direct'; facilityId: string | null; testing: boolean; facilityFixed: boolean }

export type NegotiationEntry = { n: number; side: 'seller' | 'buyer' | 'system'; kind: 'ask' | 'bid' | 'hold' | 'agreed' | 'none'; price: number | null; text: string }

export type Negotiation = {
  buyer: { open: number; max: number }
  log: NegotiationEntry[]
  outcome: { agreed: true; price: number; moves: number } | { agreed: false; moves: number }
}

export type PlanItem = {
  id: string
  lotPublicId: string
  pieces: number
  requirementRef: string
  pkg: Package
  status: PlanStatus
  negotiation: Negotiation | null
  agreedPricePerUnit: number | null
  dealId: string | null
}

export type Allocation = {
  publicId: string
  pieces: number
  overSpecKgM: number
  offcutM: number
  gradeFlag: boolean
  storageMin: number
  storageMax: number
}

export type RequirementResult = {
  ref: string
  required: number
  matched: number
  allocations: Allocation[]
  reason: string | null
}

export type MatchResult = {
  lines: number
  members: number
  matched: number
  coverage: number
  openOnly: number | null
  results: RequirementResult[]
  baselineMassT: number
  stockMassT: number
  offcutMassT: number
  avoidedT: number
}

export type Project = {
  id: string
  name: string
  developerOrgId: string
  teamOrgIds: string[]
  teamPersonaIds: string[]
  postcodeDistrict: string
  localAuthority: string
  region: string
  blind: { orgType: string; projectType: string }
  giaM2: number
  ribaStage: number
  description: string
  keyDates: { planningSubmission: string; steelNeedBy: string }
  frameMassT: number
  billOfMaterials: BillLine[]
  requirements: Requirement[]
  matchResult: MatchResult | null
  planItems: PlanItem[]
  termsAccepted: boolean
  approvedByOwnerOrgIds: string[]
  seededDeals: SeededDeal[]
  /** Record data: km from each hub to the site. */
  hubDistancesKm: Record<string, number>
  consultantOrgId: string
}

export type CostLine = { id: string; label: string; amount: number }

export type Quote = { haulier: string; amount: number; noticeDays: number; meetsDates: boolean }

export type CustodyEvent = { id: string; label: string; date: string; done: boolean }

export type Deal = {
  id: string
  projectId: string
  planItemId: string
  lotId: string
  lotPublicId: string
  pieces: number
  massT: number
  units: number
  agreedPricePerUnit: number
  status: 'confirmed'
  dealDate: string
  handoverDate: string
  hubId: string
  testing: boolean
  needBy: string
  storageMonths: number
  buyerLines: CostLine[]
  sellerLines: CostLine[]
  buyerTotal: number
  costNew: number
  sellerNet: number
  scrapValue: number
  premium: number
  upliftVsScrap: number
  commission: number
  inbound: number
  outboundEstimate: number
  booking: { haulier: string; amount: number; deliveryDate: string; quotes: Quote[] } | null
  avoidedT: number
  avoidedPercent: number
  baselineMassT: number
  requirementRef: string
  exchanged: {
    buyerOrg: string
    buyerContact: string
    sellerOrg: string
    sellerContact: string
  }
}

export type Destination =
  | 'reused_on_site'
  | 'reused_off_site'
  | 'recycled_on_site'
  | 'recycled_off_site'
  | 'recovered'
  | 'landfill'
  | 'hazardous_disposal'

export type Confidence = 'high' | 'medium' | 'low' | 'edited'

export type WasteRow = {
  row: number
  original: { ref: string; description: string; code: string; quantity: string; unit: string; route: string; facility: string }
  stream: string | null
  streamFrom: 'code' | 'keyword' | 'none' | 'edited'
  code: string | null
  tonnes: number | null
  destination: Destination | null
  hazardous: boolean
  confidence: Confidence
}

export type WasteBill = {
  rows: WasteRow[]
  titleRows: number
  totalRows: number
  statedTotal: number | null
  statedTotalMatches: boolean
}

export type WasteEngagement = {
  id: string
  name: string
  buildingName: string
  ownerOrgId: string
  giaM2: number
  period: string
  bill: WasteBill | null
}

export type MarketSnapshot = { supply: Record<string, number>; demand: Record<string, number>; lotPublicIds: string[] }

export type LedgerEntry = { id: string; label: string; amount: number; kind: 'deal' | 'seed' | 'subscription'; note: string | null; publicId: string | null }

export type Facility = { id: string; name: string; type: 'open' | 'covered'; region: string; storageRate: number; handlingRate: number }

export type Haulier = { name: string; fixed: number; perKm: number; noticeDays: number }

export type World = {
  orgs: Record<string, Org>
  personas: Record<string, Persona>
  buildings: Record<string, SourceBuilding>
  items: Record<string, InventoryItem>
  lots: Record<string, Lot>
  projects: Record<string, Project>
  deals: Record<string, Deal>
  engagements: Record<string, WasteEngagement>
  snapshot: MarketSnapshot
  ledger: LedgerEntry[]
  publicIdPool: string[]
  itemIdPool: string[]
}
