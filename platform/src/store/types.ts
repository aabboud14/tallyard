// The platform's state beyond the world: people, invites, notifications, activity, reservations and the
// working records of each role. Everything here is plain data so it persists as JSON.
import type { CostLine, SteelGrade, World } from '../domain/types'
import type { Fit } from '../domain/v1types'
import type { TestService } from '../domain/reference/testing'

/** The workspace an organisation's type gives its people (BRIEF section 1, principle 2). */
export type PlatformRole = 'architect' | 'client' | 'owner' | 'surveyor' | 'consultant'

export const AVATAR_COLOURS = ['forest', 'blue', 'amber', 'rose', 'violet', 'slate', 'teal'] as const
export type AvatarColour = (typeof AVATAR_COLOURS)[number]

export const NOTIFICATION_KINDS = [
  'lots_shared',
  'sent_to_client',
  'client_decision',
  'reservation_requested',
  'reservation_decided',
  'survey_submitted',
  'item_captured',
  'new_fit',
  'appointed',
  'team',
  // Round 2: building confirmations, testing, contractor dates and share links.
  'building_claim',
  'testing',
  'availability_set',
  'link_opened',
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export type User = {
  id: string
  email: string
  name: string
  /** Job title, for example Project architect. */
  title: string
  /** The persona in the world that this person acts as, so the domain access rules apply. */
  personaId: string
  orgId: string
  salt: string
  /** SHA-256 hex of `${salt}:${password}`. Never the password. */
  passwordHash: string
  avatarColour: AvatarColour
  createdAt: string
  /** One of the sample accounts on the sign-in page. */
  sample: boolean
  notificationPrefs: Record<NotificationKind, boolean>
}

export type InviteStatus = 'pending' | 'accepted' | 'revoked'

export type Invite = {
  token: string
  orgId: string
  email: string
  invitedByUserId: string
  createdAt: string
  status: InviteStatus
  acceptedUserId: string | null
}

/** Addressed to an organisation; read state is per person. */
export type AppNotification = {
  id: string
  orgId: string
  kind: NotificationKind
  title: string
  body: string
  href: string
  at: string
  actorUserId: string | null
  readBy: string[]
  /** Notifications with the same key on the same day are folded into one (repeated captures, for example). */
  key: string | null
  count: number
}

/** Who did what, when, written once for each audience in words that audience may read. */
export type ActivityEntry = {
  id: string
  at: string
  /** The organisations that may read this entry. */
  orgIds: string[]
  projectId: string | null
  buildingId: string | null
  actorUserId: string | null
  /** The name shown for the actor, or a blind description such as "A buyer". */
  actor: string
  /** The rest of the sentence, starting lower case: "published TH-01 to the marketplace". */
  text: string
  href: string | null
}

export type ReservationStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'

/** The client's indicative package at the time of the request, from the package engine. Buyer side only. */
export type ReservationEstimate = {
  lines: CostLine[]
  total: number
  costNew: number
  saving: number
  savingPercent: number
  pricePerUnit: number
  storageMonths: number
  facilityId: string
  facilityName: string
  testing: boolean
  fit: Fit
}

export type ExchangedContacts = {
  buyerOrg: string
  buyerContact: string
  buyerEmail: string
  sellerOrg: string
  sellerContact: string
  sellerEmail: string
}

export type Reservation = {
  id: string
  projectId: string
  lotId: string
  publicId: string
  wishItemId: string
  requestedByUserId: string
  requestedAt: string
  message: string
  status: ReservationStatus
  decidedAt: string | null
  decidedByUserId: string | null
  decisionNote: string | null
  estimate: ReservationEstimate
  /** Filled when the seller accepts: from then on both sides see each other. */
  exchanged: ExchangedContacts | null
}

export type SurveyStatus = 'not_started' | 'in_progress' | 'submitted'

export type SurveyRecord = {
  buildingId: string
  status: SurveyStatus
  appointedAt: string | null
  submittedAt: string | null
  submittedByUserId: string | null
}

export type BuildingClaimStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'

/** A surveying firm asks the owner of a building it added to confirm it. Addressed by email, never by organisation. */
export type BuildingClaim = {
  /** 'clm_' minted. */
  id: string
  buildingId: string
  surveyorOrgId: string
  requestedByUserId: string
  requestedAt: string
  /** Normalised email of the owner the surveyor named. Only an owner organisation with a member using it may decide. */
  ownerEmail: string
  ownerName: string
  message: string
  status: BuildingClaimStatus
  decidedAt: string | null
  decidedByUserId: string | null
  decisionNote: string | null
}

export type { TestService }
export type TestingStatus = 'requested' | 'booked' | 'results' | 'cancelled'
export type TestResult = { itemId: string; testStatus: 'inspected' | 'tested'; grade: SteelGrade | null; note: string }

/** A request to one of the testing companies (reference data) to inspect or test items of a building. */
export type TestingRequest = {
  /** 'tst_' minted. */
  id: string
  buildingId: string
  itemIds: string[]
  companyId: string
  services: TestService[]
  /** ISO date, or null for no preference. */
  preferredFrom: string | null
  message: string
  status: TestingStatus
  requestedByUserId: string
  requestedByOrgId: string
  requestedAt: string
  /** ISO date of the site visit. */
  bookedFor: string | null
  results: TestResult[]
  history: { at: string; status: TestingStatus; byUserId: string; note: string }[]
}

/** The architect's own words on a project's specification: a header note and one note per clause. */
export type SpecDoc = { header: string; clauseNotes: Record<string, string>; updatedAt: string | null }

export type OrgProfile = { address: string }

export type UiState = {
  sidebarCollapsed: boolean
  /** The project Discover checks fit against, per person. */
  checkingProjectId: Record<string, string | null>
  shortlistLayout: 'board' | 'list'
  projectsLayout: 'cards' | 'table'
  /** The building the standalone Capture page last used, per person. */
  captureBuildingId: Record<string, string | null>
}

export type AppData = {
  version: 2
  /** The date the sandbox was seeded. */
  seededOn: string
  /** Counter for deterministic IDs. */
  seq: number
  world: World
  users: Record<string, User>
  invites: Record<string, Invite>
  /** Newest first. */
  notifications: AppNotification[]
  /** Newest first. */
  activity: ActivityEntry[]
  reservations: Record<string, Reservation>
  surveys: Record<string, SurveyRecord>
  specs: Record<string, SpecDoc>
  orgProfiles: Record<string, OrgProfile>
  /** Round 2: surveyors' requests to owners to confirm a building. */
  buildingClaims: Record<string, BuildingClaim>
  /** Round 2: testing requests per building. */
  testingRequests: Record<string, TestingRequest>
  ui: UiState
}

/** Who is acting, and when. Actions read the time from here, never from the clock. */
export type Actor = { userId: string; now: string }

/** Who is looking, and when. Selectors read the time from here, never from the clock. */
export type Viewer = { userId: string; now: string }

export type ActionResult<V = null> = { state: AppData; error: string | null; value: V | null }

export const DEFAULT_UI: UiState = { sidebarCollapsed: false, checkingProjectId: {}, shortlistLayout: 'board', projectsLayout: 'cards', captureBuildingId: {} }
