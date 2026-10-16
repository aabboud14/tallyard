// Requirement tracking on a donor building (review of 16 October 2026), for its owner and its surveyor: the
// requirements that apply before demolition at its location, each with a status and an evidence log, and the
// roll-up the home dashboards show. Indicative summaries of policy, to check against the current text.
import type { SourceBuilding } from '../../domain/types'
import type { TrackStatus } from '../../domain/sustainabilityTypes'
import { KIND_LABELS, REQUIREMENTS_NOTE_AFTER_MARKER } from '../../domain/reference/requirements'
import { REQ_CAVEAT, SCOPE_LABELS, TRACK_STATUS_LABELS } from '../../domain/reference/sustainabilityCopy'
import { trackerSummary, type TrackerSummary } from '../../domain/engines/tracker'
import { formatDateShort } from '../../domain/dates'
import type { AppData, Viewer } from '../types'
import { buildingSide } from '../access'
import { buildingRequirements, buildingTracksOf } from '../buildingTracks'

export type BuildingRequirementRow = {
  id: string
  code: string
  title: string
  source: string
  kindLabel: string
  /** "National", "London" or the local authority. */
  scopeLabel: string
  summary: string
  trigger: string
  asks: string[]
  helps: string | null
  placeholder: boolean
  status: TrackStatus
  statusLabel: string
  evidence: { id: string; text: string; by: string; onText: string; canRemove: boolean }[]
  updatedText: string | null
}

export type BuildingRequirementsView = {
  buildingId: string
  buildingName: string
  /** "City of London, Central London". */
  locationText: string
  /** The line under the heading: what applies here, and who keeps it current. */
  introText: string
  rows: BuildingRequirementRow[]
  summary: TrackerSummary
  /** "1 of 4 ready". */
  readyText: string
  canEdit: boolean
  caveat: string
  note: string
}

function nameOf(state: AppData, userId: string | null): string {
  return userId ? (state.users[userId]?.name ?? 'Someone who has left') : ''
}

function readyText(s: TrackerSummary): string {
  return s.total === 0 ? 'None apply' : `${s.ready} of ${s.total} ready`
}

/** The requirements a donor building tracks, for its owner and its surveyor (both edit); null for anyone else. */
export function buildingRequirementsView(state: AppData, viewer: Viewer, buildingId: string): BuildingRequirementsView | null {
  const side = buildingSide(state, viewer.userId, buildingId)
  if (side !== 'owner' && side !== 'surveyor') return null
  const b = state.world.buildings[buildingId]
  const tracks = buildingTracksOf(state, buildingId)
  const rows = buildingRequirements(b).map((r): BuildingRequirementRow => {
    const t = tracks[r.id]
    const status: TrackStatus = t?.status ?? 'not_started'
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      source: r.source,
      kindLabel: KIND_LABELS[r.kind],
      scopeLabel: r.level === 'local' ? b.localAuthority : SCOPE_LABELS[r.level],
      summary: r.summary,
      trigger: r.trigger,
      asks: [...r.asks],
      helps: r.helps,
      placeholder: r.placeholder,
      status,
      statusLabel: TRACK_STATUS_LABELS[status],
      evidence: (t?.evidence ?? []).map((e) => ({ id: e.id, text: e.text, by: e.addedBy, onText: formatDateShort(e.addedAt.slice(0, 10)), canRemove: e.addedByUserId === viewer.userId })),
      updatedText: t?.updatedAt ? `Updated by ${nameOf(state, t.updatedByUserId)} on ${formatDateShort(t.updatedAt.slice(0, 10))}` : null,
    }
  })
  const summary = trackerSummary(rows.map((r) => r.status))
  const locationText = [b.localAuthority, b.region].filter((x) => x).join(', ')
  const who = side === 'surveyor' ? 'You and the owner keep' : b.surveyorOrgId ? 'You and your surveyor keep' : 'You keep'
  return {
    buildingId,
    buildingName: b.name,
    locationText,
    introText: `What applies before ${b.name} comes down in ${locationText || b.region}. ${who} the status and the evidence current.`,
    rows,
    summary,
    readyText: readyText(summary),
    canEdit: true,
    caveat: REQ_CAVEAT,
    note: REQUIREMENTS_NOTE_AFTER_MARKER,
  }
}

export type BuildingRequirementsRollup = TrackerSummary & { readyText: string; atRiskItems: { id: string; title: string }[]; href: string }

/** The line a home dashboard shows for a building: ready out of total, and the ones at risk. */
export function buildingRequirementsRollup(state: AppData, b: SourceBuilding): BuildingRequirementsRollup {
  const tracks = buildingTracksOf(state, b.id)
  const reqs = buildingRequirements(b)
  const statuses = reqs.map((r) => tracks[r.id]?.status ?? 'not_started')
  const summary = trackerSummary(statuses)
  return { ...summary, readyText: readyText(summary), atRiskItems: reqs.filter((_, i) => statuses[i] === 'at_risk').map((r) => ({ id: r.id, title: r.title })), href: `/app/buildings/${b.id}/requirements` }
}
