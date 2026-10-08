// The platform's state beyond the world: people, invites, notifications, activity, reservations and the
// working records of each role. Everything here is plain data so it persists as JSON.
import type { CostLine, World } from '../domain/types'
import type { Fit } from '../domain/v1types'

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

/** The architect's own words on a project's specification: a header note and one note per clause. */
export type SpecDoc = { header: string; clauseNotes: Record<string, string>; updatedAt: string | null }

export type OrgProfile = { address: string }

export type UiState = {
  sidebarCollapsed: boolean
  /** The project Discover checks fit against, per person. */
  checkingProjectId: Record<string, string | null>
  shortlistLayout: 'board' | 'list'
  projectsLayout: 'cards' | 'table'
}

export type AppData = {
  version: 1
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
  ui: UiState
}

/** Who is acting, and when. Actions read the time from here, never from the clock. */
export type Actor = { userId: string; now: string }

/** Who is looking, and when. Selectors read the time from here, never from the clock. */
export type Viewer = { userId: string; now: string }

export type ActionResult<V = null> = { state: AppData; error: string | null; value: V | null }

export const DEFAULT_UI: UiState = { sidebarCollapsed: false, checkingProjectId: {}, shortlistLayout: 'board', projectsLayout: 'cards' }
