// Building confirmations (owner-surveyor design 14.4.7): the owner's list of buildings surveyors ask them to confirm,
// and where a surveyor's own building stands with its owner. The surveyor never learns which organisation declined.
import type { AppData, BuildingClaim, BuildingClaimStatus, SurveyStatus, Viewer } from '../types'
import { buildingSide, roleOfUser } from '../access'
import { claimAddressedTo } from '../actions/claims'
import { timeAgo } from './common'

export type ClaimState = { status: 'linked' | 'not_linked' | 'pending' | 'declined'; label: string; email: string | null; note: string | null; claimId: string | null }

export const CLAIM_STATE_LABELS: Record<ClaimState['status'], string> = { linked: 'Linked to its owner', not_linked: 'Not linked yet', pending: 'Waiting for the owner', declined: 'Not confirmed' }

export const CLAIM_STATUS_LABELS: Record<BuildingClaimStatus, string> = { pending: 'Waiting for you', accepted: 'Confirmed', declined: 'Not ours', withdrawn: 'Withdrawn' }

const SURVEY_LABELS: Record<SurveyStatus, string> = { not_started: 'Not started', in_progress: 'In progress', submitted: 'Submitted' }

function newestFirst(a: BuildingClaim, b: BuildingClaim): number {
  return a.requestedAt < b.requestedAt ? 1 : a.requestedAt > b.requestedAt ? -1 : 0
}

/** Where a building stands with its owner: linked, waiting, declined (with the owner's note) or not asked yet. */
export function claimStateFor(state: AppData, buildingId: string): ClaimState {
  const b = state.world.buildings[buildingId]
  if (b?.ownerOrgId) return { status: 'linked', label: CLAIM_STATE_LABELS.linked, email: null, note: null, claimId: null }
  const latest = Object.values(state.buildingClaims)
    .filter((c) => c.buildingId === buildingId)
    .sort(newestFirst)[0]
  if (latest?.status === 'pending') return { status: 'pending', label: CLAIM_STATE_LABELS.pending, email: latest.ownerEmail, note: null, claimId: latest.id }
  if (latest?.status === 'declined') return { status: 'declined', label: CLAIM_STATE_LABELS.declined, email: latest.ownerEmail, note: latest.decisionNote, claimId: latest.id }
  return { status: 'not_linked', label: CLAIM_STATE_LABELS.not_linked, email: null, note: null, claimId: null }
}

/** The claim state for the surveying firm's own view of a building; null for anyone else. */
export function claimStateOf(state: AppData, viewer: Viewer, buildingId: string): ClaimState | null {
  if (buildingSide(state, viewer.userId, buildingId) !== 'surveyor') return null
  return claimStateFor(state, buildingId)
}

export type ClaimRow = {
  id: string
  buildingId: string
  buildingName: string
  address: string
  region: string
  localAuthority: string
  surveyorName: string
  requestedByName: string
  requestedAt: string
  timeAgo: string
  message: string
  itemCount: number
  surveyStatusLabel: string
  status: BuildingClaimStatus
  statusLabel: string
  decisionNote: string | null
  canDecide: boolean
}

/**
 * The confirmations for an owner organisation: those addressed to it that wait, and those its people answered, newest
 * first. A request waits for an email with no account yet, and appears here once someone signs up with it as an owner.
 */
export function claimRowsForOwner(state: AppData, viewer: Viewer): ClaimRow[] {
  if (roleOfUser(state, viewer.userId) !== 'owner') return []
  const orgId = state.users[viewer.userId].orgId
  const ours = (userId: string | null) => !!userId && state.users[userId]?.orgId === orgId
  return Object.values(state.buildingClaims)
    .filter((c) => (c.status === 'pending' && claimAddressedTo(state, c, orgId)) || ((c.status === 'accepted' || c.status === 'declined') && ours(c.decidedByUserId)))
    .filter((c) => !!state.world.buildings[c.buildingId])
    .sort(newestFirst)
    .map((c) => {
      const b = state.world.buildings[c.buildingId]
      const itemCount = Object.values(state.world.items).filter((i) => i.buildingId === b.id).length
      const survey = state.surveys[b.id]?.status ?? (itemCount > 0 ? 'in_progress' : 'not_started')
      return {
        id: c.id,
        buildingId: b.id,
        buildingName: b.name,
        address: b.address,
        region: b.region,
        localAuthority: b.localAuthority,
        surveyorName: state.world.orgs[c.surveyorOrgId]?.name ?? '',
        requestedByName: state.users[c.requestedByUserId]?.name ?? '',
        requestedAt: c.requestedAt,
        timeAgo: timeAgo(c.requestedAt, viewer.now),
        message: c.message,
        itemCount,
        surveyStatusLabel: SURVEY_LABELS[survey],
        status: c.status,
        statusLabel: CLAIM_STATUS_LABELS[c.status],
        decisionNote: c.decisionNote,
        canDecide: c.status === 'pending',
      }
    })
}

/** Pending confirmations addressed to an organisation, for the Requests badge. */
export function pendingClaimCount(state: AppData, orgId: string): number {
  return Object.values(state.buildingClaims).filter((c) => c.status === 'pending' && claimAddressedTo(state, c, orgId)).length
}
