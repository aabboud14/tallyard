// Building confirmations (owner-surveyor design 14.4.7): the owner's list of buildings surveyors ask them to confirm,
// and where a surveyor's own building stands with its owner. The surveyor never learns which organisation declined.
import type { SourceBuilding } from '../../domain/types'
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

// ---------- Moving early captures into an appointment (audit 16 October, note 26) ----------

/** Lower case, punctuation dropped, spaces collapsed: 'Corbel Yard, 9 Corbel Lane' and 'corbel yard 9 corbel lane' match. */
export function normaliseForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const STOP_WORDS = new Set(['the', 'house', 'building', 'court', 'yard', 'london', 'street', 'road', 'lane', 'and', 'of'])

/** Two names are alike when one holds the other, or they share a distinctive word. */
function similarNames(a: string, b: string): boolean {
  const x = normaliseForMatch(a)
  const y = normaliseForMatch(b)
  if (!x || !y) return false
  if (x.includes(y) || y.includes(x)) return true
  const words = (s: string) => new Set(s.split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w)))
  const wx = words(x)
  return [...words(y)].some((w) => wx.has(w))
}

export type MergeCandidate = {
  /** The firm's own building, not linked to an owner. */
  fromId: string
  fromName: string
  fromAddress: string
  itemCount: number
  /** The building an owner appointed the firm to. */
  intoId: string
  intoName: string
  intoAddress: string
  ownerName: string
  reason: 'name' | 'address' | 'postcode'
  /** 'You added Corbel Yard yourself before Ostlea Estates appointed you. Move its 2 captured items here?' */
  prompt: string
  /** 'Merge into Corbel Yard for Ostlea Estates', the heading on the unlinked building's own overview. */
  mergeTitle: string
  actionLabel: string
}

function candidate(state: AppData, from: SourceBuilding, into: SourceBuilding, reason: MergeCandidate['reason']): MergeCandidate {
  const itemCount = Object.values(state.world.items).filter((i) => i.buildingId === from.id).length
  const ownerName = into.ownerOrgId ? (state.world.orgs[into.ownerOrgId]?.name ?? '') : ''
  const what = itemCount === 0 ? 'Merge it into this appointment?' : `Move its ${itemCount === 1 ? 'captured item' : `${itemCount} captured items`} here?`
  return {
    fromId: from.id,
    fromName: from.name,
    fromAddress: from.address,
    itemCount,
    intoId: into.id,
    intoName: into.name,
    intoAddress: into.address,
    ownerName,
    reason,
    prompt: `You added ${from.name} yourself before ${ownerName} appointed you. ${what}`,
    mergeTitle: `Merge into ${into.name} for ${ownerName}`,
    actionLabel: itemCount === 0 ? 'Merge here' : 'Move items here',
  }
}

/**
 * For a surveying firm: each of its own unlinked buildings paired with a building an owner appointed it to that looks
 * like the same place (the same name or address once normalised, or the same postcode district with a similar name).
 * Only the firm sees these; nothing reaches the owner side.
 */
export function mergeCandidates(state: AppData, viewer: Viewer): MergeCandidate[] {
  if (roleOfUser(state, viewer.userId) !== 'surveyor') return []
  const orgId = state.users[viewer.userId]?.orgId
  if (!orgId) return []
  const buildings = Object.values(state.world.buildings)
  const own = buildings.filter((b) => b.ownerOrgId === null && b.createdByOrgId === orgId && b.surveyorOrgId === orgId && buildingSide(state, viewer.userId, b.id) === 'surveyor')
  const appointed = buildings.filter((b) => b.ownerOrgId !== null && b.surveyorOrgId === orgId && buildingSide(state, viewer.userId, b.id) === 'surveyor')
  const out: MergeCandidate[] = []
  for (const from of own) {
    for (const into of appointed) {
      const sameName = normaliseForMatch(from.name) === normaliseForMatch(into.name)
      const sameAddress = !!normaliseForMatch(from.address) && normaliseForMatch(from.address) === normaliseForMatch(into.address)
      const samePostcode = !!from.postcodeDistrict && from.postcodeDistrict === into.postcodeDistrict && similarNames(from.name, into.name)
      const reason = sameName ? 'name' : sameAddress ? 'address' : samePostcode ? 'postcode' : null
      if (reason) out.push(candidate(state, from, into, reason))
    }
  }
  return out
}

/** The appointed buildings the firm may move an unlinked building's captures into, for cases the matcher misses. */
export function mergeTargets(state: AppData, viewer: Viewer, fromId: string): { id: string; label: string }[] {
  const from = state.world.buildings[fromId]
  const orgId = state.users[viewer.userId]?.orgId
  if (!from || !orgId || roleOfUser(state, viewer.userId) !== 'surveyor' || from.ownerOrgId !== null || from.createdByOrgId !== orgId) return []
  return Object.values(state.world.buildings)
    .filter((b) => b.ownerOrgId !== null && b.surveyorOrgId === orgId && buildingSide(state, viewer.userId, b.id) === 'surveyor')
    .map((b) => ({ id: b.id, label: `${b.name}, ${b.address} (${state.world.orgs[b.ownerOrgId ?? '']?.name ?? ''})` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en-GB'))
}
