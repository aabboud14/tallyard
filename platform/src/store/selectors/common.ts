// Shared pieces for every view model: time words, listing cards, project references and labels.
// Anything the other side owns is read through toPublicListing (via listingOf) or toBlindBuyer only.
import type { FamilyId, Project, PublicListing } from '../../domain/types'
import type { Band, TimelineFit, Typology, WishStatus } from '../../domain/v1types'
import { FAMILIES } from '../../domain/reference/families'
import { facilityById } from '../../domain/reference/assumptions'
import { PROJECT_TYPE_LABELS, TIMELINE_TEXT, TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { RIBA_STAGES } from '../../domain/reference/policy'
import { daysBetween, formatDate, formatDateShort } from '../../domain/dates'
import { typologyOf } from '../../domain/engines/typology'
import { sustainabilityBand } from '../../domain/engines/band'
import { timelineFit } from '../../domain/engines/timeline'
import { availabilityText, priceRangeText, quantityText } from '../../domain/engines/specSheet'
import * as f from '../../domain/format'
import type { ActivityEntry, AppData, ReservationStatus, Viewer } from '../types'
import { roleForOrgType, orgTypeLabel } from '../../sandbox/accounts'
import { generalWishlist, projectWishlist } from '../lots'

// ---------- Time ----------

export function todayOf(v: Viewer): string {
  return v.now.slice(0, 10)
}

/** "just now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago", then the date. */
export function timeAgo(at: string, now: string): string {
  const ms = Date.parse(now) - Date.parse(at)
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  const hours = Math.floor(minutes / 60)
  const days = daysBetween(at.slice(0, 10), now.slice(0, 10))
  if (days === 0 || hours < 6) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatDateShort(at.slice(0, 10))
}

/** "Today", "Yesterday", or the date, for grouping by day. */
export function dayLabel(at: string, now: string): string {
  const days = daysBetween(at.slice(0, 10), now.slice(0, 10))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return formatDate(at.slice(0, 10))
}

/** "Good morning", "Good afternoon" or "Good evening", from the hour in UTC. */
export function greeting(now: string, firstName: string): string {
  const h = Number(now.slice(11, 13))
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return firstName ? `${part}, ${firstName}` : part
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "Thursday 8 October 2026". */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${formatDate(iso)}`
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// ---------- Labels ----------

export const SHORTLIST_STATUS_LABELS: Record<WishStatus, string> = { pending: 'Shortlisted', sent: 'Sent to client', approved: 'Approved', declined: 'Declined' }

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = { pending: 'Awaiting the seller', accepted: 'Reserved', declined: 'Declined', withdrawn: 'Withdrawn' }

export const FIT_LABELS = { now: 'Available now', in_time: 'In time', tight: 'Tight', late: 'Too late' } as const

export const ROLE_TITLES = { architect: 'Architect', client: 'Client', consultant: 'Sustainability consultant', owner: 'Asset owner', surveyor: 'Site surveyor' } as const

export function stageLabel(stage: number): string {
  return `RIBA Stage ${stage}, ${RIBA_STAGES[stage] ?? ''}`.replace(/, $/, '')
}

export function familyLabel(family: FamilyId): string {
  return FAMILIES[family].label
}

/** "an asset owner", "a deconstruction contractor". */
export function sellerPhrase(sellerType: string): string {
  const lower = sellerType.charAt(0).toLowerCase() + sellerType.slice(1)
  return /^[aeiou]/i.test(lower) ? `an ${lower}` : `a ${lower}`
}

export function orgTypeText(state: AppData, orgId: string): string {
  const org = state.world.orgs[orgId]
  return org ? orgTypeLabel(org.type) : ''
}

export function roleOfOrgId(state: AppData, orgId: string) {
  const org = state.world.orgs[orgId]
  return org ? roleForOrgType(org.type) : null
}

// ---------- Listings ----------

export type SavedIn = { projectId: string | null; label: string; status: WishStatus }

/** Everything a card shows about a listing, from the public projection only. */
export type ListingCard = {
  listing: PublicListing
  publicId: string
  title: string
  family: FamilyId
  familyLabel: string
  typology: Typology
  typologyLabel: string
  quantityText: string
  massT: number
  availabilityText: string
  locationLabel: string
  collectionPoint: string
  /** The first public photo, or null for the generated illustration. */
  photo: { id: string; src: string | null } | null
  band: Band
  /** The fit against the project being checked, or null with no project. */
  fit: TimelineFit | null
  fitLabel: string | null
  avoidedT: number | null
  priceRange: string
  sharedInConfidence: boolean
  savedIn: SavedIn[]
}

export function collectionPointText(l: PublicListing): string {
  return l.collectionHubId ? facilityById(l.collectionHubId).name : 'From the source site'
}

/** The practice's lists that hold this public ID. */
export function savedInFor(state: AppData, orgId: string | null, publicId: string): SavedIn[] {
  if (!orgId) return []
  const out: SavedIn[] = []
  for (const list of Object.values(state.world.wishlists)) {
    if (list.orgId !== orgId) continue
    const it = list.items.find((x) => x.publicId === publicId)
    if (!it) continue
    out.push({ projectId: list.projectId, label: list.projectId ? (state.world.projects[list.projectId]?.name ?? '') : 'Saved', status: it.status })
  }
  return out
}

export function listingCard(state: AppData, listing: PublicListing, project: Project | null, today: string, savedOrgId: string | null = null): ListingCard {
  const fit = project ? timelineFit(listing.availability, project.startDate, today) : null
  const firstPhoto = listing.photos[0] ?? null
  return {
    listing,
    publicId: listing.publicId,
    title: listing.title,
    family: listing.family,
    familyLabel: familyLabel(listing.family),
    typology: typologyOf(listing.family),
    typologyLabel: TYPOLOGY_LABELS[typologyOf(listing.family)],
    quantityText: quantityText(listing),
    massT: listing.massT,
    availabilityText: availabilityText(listing),
    locationLabel: listing.location.label,
    collectionPoint: collectionPointText(listing),
    photo: firstPhoto ? { id: firstPhoto.id, src: firstPhoto.src } : null,
    band: sustainabilityBand(listing.carbon),
    fit,
    fitLabel: fit ? FIT_LABELS[fit.fit] : null,
    avoidedT: listing.carbon ? listing.carbon.avoidedT : null,
    priceRange: priceRangeText(listing),
    sharedInConfidence: listing.sharing === 'in_confidence',
    savedIn: savedInFor(state, savedOrgId, listing.publicId),
  }
}

export function fitText(fit: TimelineFit | null): string | null {
  return fit ? TIMELINE_TEXT[fit.fit] : null
}

/** "About 7 months in storage before the start", or nothing for a late lot. */
export function storageText(fit: TimelineFit | null): string | null {
  if (!fit || fit.storageMonths === null) return null
  if (fit.storageMonths === 0) return 'No storage before the start'
  return `About ${f.months(fit.storageMonths)} in storage before the start`
}

// ---------- Projects ----------

export type ProjectRef = {
  id: string
  name: string
  clientName: string
  typeLabel: string
  stage: number
  stageLabel: string
  region: string
  localAuthority: string
  startDate: string
  startText: string
}

export function projectRef(state: AppData, p: Project): ProjectRef {
  return {
    id: p.id,
    name: p.name,
    clientName: state.world.orgs[p.clientOrgId]?.name ?? '',
    typeLabel: PROJECT_TYPE_LABELS[p.projectType],
    stage: p.ribaStage,
    stageLabel: stageLabel(p.ribaStage),
    region: p.region,
    localAuthority: p.localAuthority,
    startDate: p.startDate,
    startText: formatDate(p.startDate),
  }
}

export function shortlistOf(state: AppData, projectId: string) {
  return projectWishlist(state.world, projectId)
}

export function savedListOf(state: AppData, orgId: string) {
  return generalWishlist(state.world, orgId)
}

// ---------- Activity ----------

export type ActivityRow = { id: string; at: string; timeAgo: string; actor: string; text: string; href: string | null; initials: string; projectId: string | null; buildingId: string | null }

export function activityRow(e: ActivityEntry, now: string): ActivityRow {
  return { id: e.id, at: e.at, timeAgo: timeAgo(e.at, now), actor: e.actor, text: e.text, href: e.href, initials: initials(e.actor), projectId: e.projectId, buildingId: e.buildingId }
}

/** Activity the viewer's organisation may read, newest first, optionally for one project or building. */
export function activityFor(state: AppData, viewer: Viewer, scope: { projectId?: string; buildingId?: string } = {}, limit = 50): ActivityRow[] {
  const orgId = state.users[viewer.userId]?.orgId
  if (!orgId) return []
  return state.activity
    .filter((e) => e.orgIds.includes(orgId))
    .filter((e) => (scope.projectId === undefined || e.projectId === scope.projectId) && (scope.buildingId === undefined || e.buildingId === scope.buildingId))
    .slice(0, limit)
    .map((e) => activityRow(e, viewer.now))
}
