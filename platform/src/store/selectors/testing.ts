// The Testing tab (owner-surveyor design 14.4.7): each request with its status, tests, items and results, and the
// request dialog's choices filtered by the items' families and the building's region.
import type { FamilyId } from '../../domain/types'
import { formatDate } from '../../domain/dates'
import { titleFor } from '../../domain/reference/families'
import { GRADE_UNKNOWN, TEST_STATUS_LABELS } from '../../domain/reference/labels'
import { TEST_SERVICES, testingCompanyById } from '../../domain/reference/testing'
import { companiesFor, servicesForFamilies } from '../../domain/engines/testing'
import type { AppData, TestingStatus, TestService, Viewer } from '../types'
import { buildingSide, canCaptureIn } from '../access'
import { lotOfItem } from '../lots'
import { buildingHeader, itemQuantityText, itemsOf, type BuildingRef } from './owner'

export const TESTING_STATUS_LABELS: Record<TestingStatus, string> = { requested: 'Sent', booked: 'Visit booked', results: 'Results recorded', cancelled: 'Cancelled' }

export const TESTING_STATUS_TONES: Record<TestingStatus, 'neutral' | 'info' | 'brand'> = { requested: 'neutral', booked: 'info', results: 'brand', cancelled: 'neutral' }

/**
 * What the testing company would receive: who it is to and from, the building, each item with its size and where it
 * is, the tests, the preferred date and the message. Nothing is sent from the sandbox; this is shown so both sides
 * can see exactly what was asked.
 */
export type TestingSheet = {
  companyName: string
  companyEmail: string
  fromName: string
  fromOrg: string
  fromEmail: string
  buildingName: string
  buildingAddress: string
  items: { tag: string; title: string; quantityText: string; location: string }[]
  tests: string[]
  preferredText: string | null
  /** 'Preferred from: 20 October 2026', or 'Preferred from: no preference'; the same words on screen and in the text. */
  preferredLine: string
  message: string
  requestedText: string
}

/** The preferred date line of a request sheet. */
export function preferredLine(preferredText: string | null): string {
  return `Preferred from: ${preferredText ?? 'no preference'}`
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** The request as plain text, for copying into an email or saving as a file. */
export function testingRequestText(sheet: TestingSheet): string {
  const lines = [
    `To: ${sheet.companyName}, ${sheet.companyEmail}`,
    `From: ${[sheet.fromName, sheet.fromOrg].filter(Boolean).join(', ')}${sheet.fromEmail ? `, ${sheet.fromEmail}` : ''}`,
    `Date: ${sheet.requestedText}`,
    '',
    `Testing request for ${sheet.buildingName}, ${sheet.buildingAddress}`,
    '',
    'Tests:',
    ...sheet.tests.map((t) => `- ${t}`),
    '',
    `Items (${sheet.items.length}):`,
    ...sheet.items.map((i) => `- ${i.tag}: ${i.title}, ${i.quantityText}${i.location ? `. ${i.location}` : ''}`),
    '',
    sheet.preferredLine,
  ]
  if (sheet.message) lines.push('', 'Message:', sheet.message)
  return lines.join('\n')
}

export type TestingRow = {
  id: string
  companyName: string
  companyEmail: string
  status: TestingStatus
  statusLabel: string
  statusTone: 'neutral' | 'info' | 'brand'
  services: string[]
  items: { itemId: string; tag: string; title: string }[]
  requestedByName: string
  requestedText: string
  /** 'Preferred from 20 October 2026', or null when no date was asked for. */
  preferredText: string | null
  message: string
  sheet: TestingSheet
  /** The plain text of the sheet, and the file name to save it under. */
  sheetText: string
  fileName: string
  bookedText: string | null
  results: { tag: string; statusLabel: string; gradeText: string; note: string }[]
  canBook: boolean
  canRecord: boolean
  canCancel: boolean
  /** Some items are shared or published, so only the owner records their results. */
  recordLocked: boolean
}

export type TestingView = { header: BuildingRef; rows: TestingRow[]; open: number; empty: boolean }

/** Whether the viewer, as surveyor, is kept from recording results on this item: its lot is shared or published. */
function lockedFor(state: AppData, viewer: Viewer, buildingId: string, itemId: string): boolean {
  if (buildingSide(state, viewer.userId, buildingId) === 'owner') return false
  const lot = lotOfItem(state.world, itemId)
  return !!lot && lot.visibility !== 'private'
}

export function testingView(state: AppData, viewer: Viewer, buildingId: string): TestingView | null {
  if (!canCaptureIn(state, viewer.userId, buildingId)) return null
  const header = buildingHeader(state, viewer, buildingId)
  if (!header) return null
  const rows = Object.values(state.testingRequests)
    .filter((t) => t.buildingId === buildingId)
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : a.requestedAt > b.requestedAt ? -1 : 0))
    .map((t) => {
      const company = testingCompanyById(t.companyId)
      const open = t.status === 'requested' || t.status === 'booked'
      const requester = state.users[t.requestedByUserId]
      const items = t.itemIds.map((id) => state.world.items[id]).filter((i) => !!i)
      const b = state.world.buildings[t.buildingId]
      const preferredText = t.preferredFrom ? formatDate(t.preferredFrom) : null
      const requestedText = formatDate(t.requestedAt.slice(0, 10))
      const services = t.services.map((x) => TEST_SERVICES[x].label)
      const sheet: TestingSheet = {
        companyName: company?.name ?? '',
        companyEmail: company?.email ?? '',
        fromName: requester?.name ?? '',
        fromOrg: state.world.orgs[t.requestedByOrgId]?.name ?? '',
        fromEmail: requester?.email ?? '',
        buildingName: b.name,
        buildingAddress: b.address,
        items: items.map((i) => ({ tag: i.tag, title: titleFor(i.spec), quantityText: itemQuantityText(i), location: i.location })),
        tests: services,
        preferredText,
        preferredLine: preferredLine(preferredText),
        message: t.message,
        requestedText,
      }
      return {
        id: t.id,
        companyName: company?.name ?? '',
        companyEmail: company?.email ?? '',
        status: t.status,
        statusLabel: TESTING_STATUS_LABELS[t.status],
        statusTone: TESTING_STATUS_TONES[t.status],
        services,
        items: t.itemIds.filter((id) => state.world.items[id]).map((id) => ({ itemId: id, tag: state.world.items[id].tag, title: titleFor(state.world.items[id].spec) })),
        requestedByName: state.users[t.requestedByUserId]?.name ?? '',
        requestedText,
        preferredText,
        message: t.message,
        sheet,
        sheetText: testingRequestText(sheet),
        fileName: `testing-request-${slug(b.name)}-${t.requestedAt.slice(0, 10)}.txt`,
        bookedText: t.bookedFor ? formatDate(t.bookedFor) : null,
        results: t.results.map((r) => ({
          tag: state.world.items[r.itemId]?.tag ?? '',
          statusLabel: TEST_STATUS_LABELS[r.testStatus],
          gradeText: r.grade === null ? '' : r.grade === 'unknown' ? GRADE_UNKNOWN : r.grade,
          note: r.note,
        })),
        canBook: open,
        canRecord: t.status === 'booked',
        canCancel: open,
        recordLocked: t.itemIds.some((id) => lockedFor(state, viewer, buildingId, id)),
      }
    })
  return { header, rows, open: rows.filter((r) => r.canCancel).length, empty: rows.length === 0 }
}

export type TestingDraftOptions = {
  items: { itemId: string; tag: string; title: string; family: FamilyId; locked: boolean }[]
  services: { id: TestService; label: string; description: string }[]
  companies: { id: string; name: string; email: string; services: string[] }[]
  noCompanyText: string | null
  /** Who is told of the request: the owner organisation for a surveyor, the surveyor for an owner; null when nobody is. */
  otherSideName: string | null
}

/** The organisation told of a request, by the same rule as the action: the other side of the building, if there is one. */
export function otherSideName(state: AppData, viewer: Viewer, buildingId: string): string | null {
  const b = state.world.buildings[buildingId]
  if (!b) return null
  const side = buildingSide(state, viewer.userId, buildingId)
  const other = side === 'owner' ? b.surveyorOrgId : side === 'surveyor' ? b.ownerOrgId : null
  const own = state.users[viewer.userId]?.orgId
  if (!other || other === own) return null
  return state.world.orgs[other]?.name ?? null
}

/** The request dialog's choices: the building's items, the tests that suit the chosen items, and who can do them there. */
export function testingDraftOptions(state: AppData, viewer: Viewer, buildingId: string, draft: { itemIds: string[]; services: TestService[] }): TestingDraftOptions | null {
  if (!canCaptureIn(state, viewer.userId, buildingId)) return null
  const b = state.world.buildings[buildingId]
  const all = itemsOf(state, buildingId)
  const chosen = all.filter((i) => draft.itemIds.includes(i.id))
  const families = [...new Set((chosen.length > 0 ? chosen : all).map((i) => i.family))]
  const services = servicesForFamilies(families)
  const picked = services.filter((x) => draft.services.includes(x))
  const companies = companiesFor(picked, b.region)
  return {
    otherSideName: otherSideName(state, viewer, buildingId),
    items: all.map((i) => ({ itemId: i.id, tag: i.tag, title: titleFor(i.spec), family: i.family, locked: lockedFor(state, viewer, buildingId, i.id) })),
    services: services.map((x) => ({ id: x, label: TEST_SERVICES[x].label, description: TEST_SERVICES[x].description })),
    companies: companies.map((c) => ({ id: c.id, name: c.name, email: c.email, services: c.services.map((x) => TEST_SERVICES[x].label) })),
    noCompanyText: picked.length > 0 && companies.length === 0 ? 'No one company offers all of these tests. Send two requests.' : null,
  }
}
