// The first-run sandbox (BRIEF section 2): the demo seed world, with TH-01 published as demo step 3 publishes it,
// moved so its programme sits where it does relative to 7 October 2026; the sample people; a believable recent
// history of shortlists, approvals, a pending reservation, notifications and activity for each organisation.
import type { World } from '../domain/types'
import type { WishlistItem } from '../domain/v1types'
import { DEMO_TODAY } from '../domain/constants'
import { addDays } from '../domain/dates'
import { timelineFit } from '../domain/engines/timeline'
import { blindBuyerText, toBlindBuyer } from '../domain/privacy/blindBuyer'
import { createSeed, FERRYMOOR_ID, HARROWDEN_ID, itemByTag, lotForItem, MERROWGATE_ID, ORG_IDS, PERSONA_IDS, SALLOW_ID, TIVERNE_ID } from '../domain/seed/world'
import type { AppData, Reservation } from '../store/types'
import { DEFAULT_UI } from '../store/types'
import * as ops from '../store/worldOps'
import { estimateForLot } from '../store/estimate'
import { lotByPublicId, listingOf, projectWishlist } from '../store/lots'
import { listJoin, log, notify, plural } from '../store/notifications'
import { mint } from '../store/ids'
import { SAMPLE_ACCOUNTS, sampleUsers } from './accounts'
import { shiftWorld } from './shift'

/** The date the seed world is written for. */
export const SEED_REFERENCE_DATE = DEMO_TODAY

/** Demo step 3's prices for TH-01 (02-DEMO-PATH.md). */
export const TH01_PRICES = { ask: 800, reserve: 730 }

const USER = Object.fromEntries(SAMPLE_ACCOUNTS.map((a) => [a.personaId, a.userId])) as Record<string, string>
const PRIYA = USER[PERSONA_IDS.priya]
const ISLA = USER[PERSONA_IDS.isla]
const TOM = USER[PERSONA_IDS.tom]
const DANA = USER[PERSONA_IDS.dana]
const MARCUS = USER[PERSONA_IDS.marcus]

/** Demo step 3: Tom tries the disclosure settings, resets to defaults and publishes TH-01 to the open marketplace. */
export function publishTh01(world: World, listedMonth: string): World {
  const item = itemByTag(world, 'TH-01')
  const lot = lotForItem(world, item.id)
  let w = ops.setDisclosure(world, TIVERNE_ID, { locationLevel: 'local_authority' })
  w = ops.setDisclosure(w, TIVERNE_ID, { timingLevel: 'month' })
  w = ops.setPhotoPublic(w, item.id, 'pho_th01', true)
  w = ops.resetDisclosureDefaults(w, TIVERNE_ID)
  return ops.publishLot(w, lot.id, { visibility: 'open', ...TH01_PRICES }, listedMonth)
}

/** The seed world as the sandbox starts it, before the dates move. */
export function referenceWorld(): World {
  let w = publishTh01(createSeed(), SEED_REFERENCE_DATE.slice(0, 7))
  // Priya accepted the confidentiality terms for Merrowgate Wharf when Ostlea Estates shared its lots.
  w = ops.setTermsAccepted(w, MERROWGATE_ID)
  return w
}

type SeedItem = { publicId: string; added: number; note: string; status: WishlistItem['status']; sent?: number; message?: string; decided?: number; decisionNote?: string }

/** Merrowgate Wharf's shortlist: a shared lot approved and requested, an open lot approved, one waiting on Isla, one shortlisted. */
const MERROWGATE_ITEMS: SeedItem[] = [
  { publicId: 'L-WPX5A6', added: 12, note: 'Primary beams for the office floors, levels 2 to 8.', status: 'approved', sent: 10, message: 'Primary beams from a lot shared with us in confidence. The 9 m length suits our grid.', decided: 7, decisionNote: 'Approved, subject to testing.' },
  { publicId: 'L-NHZ32R', added: 6, note: 'Secondary beams. Tested S355 and in stock.', status: 'approved', sent: 5, message: '', decided: 2, decisionNote: 'Approved. Tested steel is what the engineer asked for.' },
  { publicId: 'L-2MAC36', added: 3, note: 'Podium columns, tested and in stock.', status: 'sent', sent: 1, message: 'Columns for the podium. Tested, in stock and available now.' },
  { publicId: 'L-6APVMW', added: 1, note: 'Possible transfer beams at level 1. Grade to confirm.', status: 'pending' },
]

/**
 * The initial app state for a sandbox first opened on `todayIso`. `now` is the moment of the first visit;
 * seeded history is dated before it.
 */
export function firstRun(todayIso: string, now: string = `${todayIso}T09:00:00.000Z`): AppData {
  const day = (k: number) => addDays(todayIso, -k)
  const nowMs = Date.parse(now)
  const at = (k: number, hh: number, mm = 0) => {
    const t = `${day(k)}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`
    return Date.parse(t) < nowMs ? t : new Date(nowMs - (k + 1) * 60_000).toISOString()
  }
  const hoursAgo = (h: number) => new Date(nowMs - h * 3_600_000).toISOString()

  const world = shiftWorld(referenceWorld(), SEED_REFERENCE_DATE, todayIso)

  // Shortlists: Merrowgate Wharf's from the story above; Ferrymoor Yard's sent item gets its sent date.
  const w = structuredClone(world)
  const mg = projectWishlist(w, MERROWGATE_ID)!
  mg.items = MERROWGATE_ITEMS.map((x, i) => ({
    id: `wli_hp23zk_${i + 1}`,
    publicId: x.publicId,
    addedOn: day(x.added),
    addedByPersonaId: PERSONA_IDS.priya,
    note: x.note,
    status: x.status,
    decidedOn: x.decided !== undefined ? day(x.decided) : null,
    decisionNote: x.decisionNote ?? null,
    sentOn: x.sent !== undefined ? day(x.sent) : null,
    sentMessage: x.message ? x.message : null,
  }))
  const fy = projectWishlist(w, FERRYMOOR_ID)
  if (fy) fy.items = fy.items.map((it) => (it.status === 'sent' ? { ...it, sentOn: addDays(it.addedOn, 1), sentMessage: null } : it))

  let s: AppData = {
    version: 1,
    seededOn: todayIso,
    seq: 0,
    world: w,
    users: sampleUsers(at(60, 9)),
    invites: {},
    notifications: [],
    activity: [],
    reservations: {},
    surveys: {
      [TIVERNE_ID]: { buildingId: TIVERNE_ID, status: 'submitted', appointedAt: at(30, 10), submittedAt: at(23, 16, 40), submittedByUserId: DANA },
      [HARROWDEN_ID]: { buildingId: HARROWDEN_ID, status: 'in_progress', appointedAt: at(14, 11), submittedAt: null, submittedByUserId: null },
    },
    specs: {},
    orgProfiles: Object.fromEntries(Object.keys(w.orgs).map((id) => [id, { address: '' }])),
    ui: { ...DEFAULT_UI, checkingProjectId: {} },
  }

  const merrowgate = s.world.projects[MERROWGATE_ID]
  const blind = blindBuyerText(toBlindBuyer(merrowgate))
  const title = (publicId: string) => listingOf(s.world, lotByPublicId(s.world, publicId)!).title
  const mgOrgs = [ORG_IDS.oriel, ORG_IDS.lantern, ORG_IDS.halewick]
  const mgHref = `/app/projects/${MERROWGATE_ID}`
  const project = (k: number, hh: number, actorUserId: string, text: string, href = `${mgHref}/shortlist`) => {
    s = log(s, { at: at(k, hh), orgIds: mgOrgs, projectId: MERROWGATE_ID, buildingId: null, actorUserId, actor: s.users[actorUserId].name, text, href })
  }

  // The reservation Isla asked for yesterday on the shared primary beams.
  const th02 = lotByPublicId(s.world, 'L-WPX5A6')!
  const rm = mint(s, 'res', (id) => !!s.reservations[id])
  s = rm.state
  const reservation: Reservation = {
    id: rm.id,
    projectId: MERROWGATE_ID,
    lotId: th02.id,
    publicId: th02.publicId,
    wishItemId: 'wli_hp23zk_1',
    requestedByUserId: ISLA,
    requestedAt: hoursAgo(20),
    message: 'The full lot, for the office frame. Testing to follow on delivery.',
    status: 'pending',
    decidedAt: null,
    decidedByUserId: null,
    decisionNote: null,
    estimate: estimateForLot(s.world, th02, merrowgate, todayIso),
    exchanged: null,
  }
  s = { ...s, reservations: { [rm.id]: reservation } }

  // The counts the history quotes, from the world itself.
  const surveyed = plural(Object.values(s.world.items).filter((i) => i.buildingId === TIVERNE_ID).length, 'item')
  const sharedWithMerrowgate = plural(
    Object.values(s.world.lots).filter((l) => l.visibility === 'matched_only' && merrowgate.approvedByOwnerOrgIds.includes(s.world.buildings[s.world.items[l.itemId].buildingId].ownerOrgId ?? '')).length,
    'lot',
  )

  // Activity, oldest first (each entry goes on top).
  s = log(s, { at: at(30, 10), orgIds: [ORG_IDS.ostlea, ORG_IDS.tarnbrook], projectId: null, buildingId: TIVERNE_ID, actorUserId: TOM, actor: 'Tom Ashby', text: 'appointed Tarnbrook Deconstruction to survey the building', href: `/app/buildings/${TIVERNE_ID}` })
  s = log(s, { at: at(23, 16, 40), orgIds: [ORG_IDS.ostlea, ORG_IDS.tarnbrook], projectId: null, buildingId: TIVERNE_ID, actorUserId: DANA, actor: 'Dana Kowalski', text: `submitted the survey: ${surveyed}`, href: `/app/buildings/${TIVERNE_ID}/inventory` })
  s = log(s, { at: at(21, 11), orgIds: [ORG_IDS.ostlea], projectId: null, buildingId: null, actorUserId: TOM, actor: 'Tom Ashby', text: `shared lots with ${blind}`, href: `/app/buildings/${TIVERNE_ID}/sharing` })
  project(20, 14, PRIYA, 'accepted the confidentiality terms for shared lots', `/app/discover?tab=shared&project=${MERROWGATE_ID}`)
  s = log(s, { at: at(20, 15), orgIds: [ORG_IDS.oriel], projectId: null, buildingId: null, actorUserId: PRIYA, actor: 'Priya Nair', text: `saved ${title('L-CJGQP7')}`, href: '/app/saved' })
  s = log(s, { at: at(15, 10), orgIds: [ORG_IDS.oriel, ORG_IDS.quillon, ORG_IDS.halewick], projectId: FERRYMOOR_ID, buildingId: null, actorUserId: PRIYA, actor: 'Priya Nair', text: `shortlisted ${title('L-6VWCWH')}`, href: `/app/projects/${FERRYMOOR_ID}/shortlist` })
  s = log(s, { at: at(14, 9, 30), orgIds: [ORG_IDS.oriel, ORG_IDS.quillon, ORG_IDS.halewick], projectId: FERRYMOOR_ID, buildingId: null, actorUserId: PRIYA, actor: 'Priya Nair', text: `sent ${title('L-6VWCWH')} to the client for approval`, href: `/app/projects/${FERRYMOOR_ID}/shortlist` })
  s = log(s, { at: at(14, 11), orgIds: [ORG_IDS.brackwater, ORG_IDS.tarnbrook], projectId: null, buildingId: HARROWDEN_ID, actorUserId: null, actor: 'Brackwater Estates', text: 'appointed Tarnbrook Deconstruction to survey the building', href: `/app/buildings/${HARROWDEN_ID}` })
  project(12, 10, PRIYA, `shortlisted ${title('L-WPX5A6')}`)
  project(10, 16, PRIYA, `sent ${title('L-WPX5A6')} to the client for approval`, `${mgHref}/approvals`)
  s = log(s, { at: at(9, 15, 20), orgIds: [ORG_IDS.brackwater, ORG_IDS.tarnbrook], projectId: null, buildingId: HARROWDEN_ID, actorUserId: DANA, actor: 'Dana Kowalski', text: 'captured HC-01, HC-02 and HC-03', href: `/app/buildings/${HARROWDEN_ID}/inventory` })
  for (const [k, publicId] of [[8, 'L-Q23X7N'], [6, 'L-A945G6']] as const) {
    s = log(s, { at: at(k, 12), orgIds: [ORG_IDS.oriel, ORG_IDS.pellory, ORG_IDS.halewick], projectId: SALLOW_ID, buildingId: null, actorUserId: PRIYA, actor: 'Priya Nair', text: `shortlisted ${title(publicId)}`, href: `/app/projects/${SALLOW_ID}/shortlist` })
  }
  project(7, 11, ISLA, `approved ${title('L-WPX5A6')}`)
  project(6, 10, PRIYA, `shortlisted ${title('L-NHZ32R')}`)
  project(5, 15, PRIYA, `sent ${title('L-NHZ32R')} to the client for approval`, `${mgHref}/approvals`)
  project(3, 10, PRIYA, `shortlisted ${title('L-2MAC36')}`)
  s = log(s, { at: at(2, 9, 15), orgIds: [ORG_IDS.ostlea], projectId: null, buildingId: TIVERNE_ID, actorUserId: TOM, actor: 'Tom Ashby', text: 'published TH-01 to the marketplace', href: `/app/buildings/${TIVERNE_ID}/listings` })
  project(2, 14, ISLA, `approved ${title('L-NHZ32R')}`)
  project(1, 10, PRIYA, `sent ${title('L-2MAC36')} to the client for approval`, `${mgHref}/approvals`)
  project(1, 11, PRIYA, `shortlisted ${title('L-6APVMW')}`)
  s = log(s, { at: hoursAgo(20), orgIds: mgOrgs, projectId: MERROWGATE_ID, buildingId: null, actorUserId: ISLA, actor: 'Isla Brennan', text: `requested a reservation of ${title('L-WPX5A6')}`, href: `${mgHref}/reservations` })
  s = log(s, { at: hoursAgo(20), orgIds: [ORG_IDS.ostlea], projectId: null, buildingId: TIVERNE_ID, actorUserId: null, actor: 'A buyer', text: `requested a reservation of TH-02. ${blind}.`, href: '/app/requests' })

  // Notifications, oldest first, each read by its organisation's sample person unless it is recent.
  const read = (userId: string) => {
    s = { ...s, notifications: s.notifications.map((n, i) => (i === 0 ? { ...n, readBy: [userId] } : n)) }
  }
  s = notify(s, { orgIds: [ORG_IDS.tarnbrook], kind: 'appointed', title: 'Ostlea Estates appointed you to survey Tiverne House', body: 'Tiverne House, 14 Garnet Row, London EC2.', href: `/app/buildings/${TIVERNE_ID}/capture`, at: at(30, 10), actorUserId: null })
  read(DANA)
  s = notify(s, { orgIds: [ORG_IDS.ostlea], kind: 'survey_submitted', title: 'Tarnbrook Deconstruction submitted the survey of Tiverne House', body: `${surveyed} captured by Dana Kowalski. Review the inventory and decide what to recover.`, href: `/app/buildings/${TIVERNE_ID}/priorities`, at: at(23, 16, 40), actorUserId: null })
  read(TOM)
  for (const [orgId, userId] of [[ORG_IDS.oriel, PRIYA], [ORG_IDS.lantern, ISLA]] as const) {
    s = notify(s, { orgIds: [orgId], kind: 'lots_shared', title: `${sharedWithMerrowgate} shared with ${merrowgate.name}`, body: 'Shared in confidence by an asset owner. Accept the confidentiality terms to see them.', href: `/app/discover?tab=shared&project=${MERROWGATE_ID}`, at: at(21, 11), actorUserId: null })
    read(userId)
  }
  s = notify(s, { orgIds: [ORG_IDS.tarnbrook], kind: 'appointed', title: 'Brackwater Estates appointed you to survey Harrowden Court', body: 'Harrowden Court, 31 Brindle Road, London W13.', href: `/app/buildings/${HARROWDEN_ID}/capture`, at: at(14, 11), actorUserId: null })
  read(DANA)
  s = notify(s, { orgIds: [ORG_IDS.lantern], kind: 'sent_to_client', title: '1 material to approve on Merrowgate Wharf', body: `Priya Nair: ${MERROWGATE_ITEMS[0].message}`, href: `${mgHref}/approvals`, at: at(10, 16), actorUserId: null })
  read(ISLA)
  for (const [orgId, userId] of [[ORG_IDS.oriel, PRIYA], [ORG_IDS.halewick, MARCUS]] as const) {
    s = notify(s, { orgIds: [orgId], kind: 'client_decision', title: `Lantern Quay Developments approved ${title('L-WPX5A6')}`, body: `Isla Brennan: ${MERROWGATE_ITEMS[0].decisionNote}`, href: `${mgHref}/shortlist`, at: at(7, 11), actorUserId: null })
    read(userId)
  }
  s = notify(s, { orgIds: [ORG_IDS.lantern], kind: 'sent_to_client', title: '1 material to approve on Merrowgate Wharf', body: 'Sent by Priya Nair, Studio Oriel.', href: `${mgHref}/approvals`, at: at(5, 15), actorUserId: null })
  read(ISLA)
  // TH-01 went on the marketplace: the projects it fits hear of it, with no owner or building named.
  const th01 = listingOf(s.world, lotForItem(s.world, itemByTag(s.world, 'TH-01').id))
  const fits = Object.values(s.world.projects)
    .filter((p) => p.architectOrgId === ORG_IDS.oriel && timelineFit(th01.availability, p.startDate, todayIso).fit !== 'late')
    .map((p) => p.name)
  if (fits.length > 0) {
    s = notify(s, { orgIds: [ORG_IDS.oriel], kind: 'new_fit', title: `New material for ${fits.length === 1 ? fits[0] : `${fits.length} of your projects`}`, body: `${th01.title} is available in time for ${listJoin(fits)}.`, href: `/app/discover/${th01.publicId}`, at: at(2, 9, 15), actorUserId: null })
  }
  for (const orgId of [ORG_IDS.oriel, ORG_IDS.halewick]) {
    s = notify(s, { orgIds: [orgId], kind: 'client_decision', title: `Lantern Quay Developments approved ${title('L-NHZ32R')}`, body: `Isla Brennan: ${MERROWGATE_ITEMS[1].decisionNote}`, href: `${mgHref}/shortlist`, at: at(2, 14), actorUserId: null })
  }
  s = notify(s, { orgIds: [ORG_IDS.lantern], kind: 'sent_to_client', title: '1 material to approve on Merrowgate Wharf', body: `Priya Nair: ${MERROWGATE_ITEMS[2].message}`, href: `${mgHref}/approvals`, at: at(1, 10), actorUserId: null })
  s = notify(s, { orgIds: [ORG_IDS.ostlea], kind: 'reservation_requested', title: 'Reservation request for TH-02', body: `${title('L-WPX5A6')}. ${blind}.`, href: '/app/requests', at: hoursAgo(20), actorUserId: null })

  // Keep everything newest first.
  const byTime = <T extends { at: string }>(xs: T[]) => [...xs].sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0))
  return { ...s, notifications: byTime(s.notifications), activity: byTime(s.activity) }
}
