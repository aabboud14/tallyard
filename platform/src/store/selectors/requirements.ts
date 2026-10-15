// Planning and sustainability requirements: the choices for the forms, and what a project tracks. One dataset,
// src/domain/reference/requirements.ts, every entry an indicative summary.
import { applicableIds, keepApplicable, KIND_LABELS, REQUIREMENTS_NOTE, REQUIREMENTS_NOTE_AFTER_MARKER, requirementsFor, suggestedRequirementIds, type PlanningRequirement, type RequirementLevel, type RequirementTopic } from '../../domain/reference/requirements'
import type { AppData, Viewer } from '../types'
import { projectSide } from '../access'
import { plural } from '../notifications'

export type RequirementRow = {
  id: string
  code: string
  title: string
  source: string
  kindLabel: string
  topic: RequirementTopic
  summary: string
  trigger: string
  asks: string[]
  helps: string | null
  suggested: boolean
  selected: boolean
}

export type RequirementChoiceGroup = { level: RequirementLevel; title: string; subtitle: string; rows: RequirementRow[] }

/** markerNote follows an Indicative marker, so it does not start with the word again. */
export type RequirementChoices = { groups: RequirementChoiceGroup[]; suggestedIds: string[]; note: string; markerNote: string }

function rowOf(r: PlanningRequirement, selected: Set<string>): RequirementRow {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    source: r.source,
    kindLabel: KIND_LABELS[r.kind],
    topic: r.topic,
    summary: r.summary,
    trigger: r.trigger,
    asks: [...r.asks],
    helps: r.helps,
    suggested: r.suggested,
    selected: selected.has(r.id),
  }
}

/** For the forms: no state needed. */
export function requirementChoices(region: string, localAuthority: string, selected: string[]): RequirementChoices {
  const chosen = new Set(selected)
  return {
    groups: requirementsFor(region, localAuthority).map((g) => ({ level: g.level, title: g.title, subtitle: g.subtitle, rows: g.items.map((r) => rowOf(r, chosen)) })),
    suggestedIds: suggestedRequirementIds(region, localAuthority),
    note: REQUIREMENTS_NOTE,
    markerNote: REQUIREMENTS_NOTE_AFTER_MARKER,
  }
}

export type ProjectRequirementsView = {
  canEdit: boolean
  /** "Newham, Inner London East". */
  locationText: string
  selected: RequirementRow[]
  reviewed: boolean
  choices: RequirementChoices
  note: string
}

/** What a project tracks, for anyone on the project; the architect may edit it. */
export function projectRequirementsView(state: AppData, viewer: Viewer, projectId: string): ProjectRequirementsView | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (!side) return null
  const p = state.world.projects[projectId]
  const choices = requirementChoices(p.region, p.localAuthority, p.planningRequirementIds)
  return {
    canEdit: side === 'architect',
    locationText: [p.localAuthority, p.region].filter((x) => x).join(', '),
    selected: choices.groups.flatMap((g) => g.rows.filter((r) => r.selected)),
    reviewed: p.requirementsReviewed,
    choices,
    note: REQUIREMENTS_NOTE,
  }
}

export type RequirementChoiceSummary = { applyCount: number; suggestedCount: number; selectedCount: number; text: string; selectedText: string }

/** The line on the closed requirements disclosure: '12 apply to Camden, Central London, 10 suggested. Choose now or later.' */
export function requirementChoiceSummary(choices: RequirementChoices, selectedIds: string[], place: string): RequirementChoiceSummary {
  const ids = new Set(choices.groups.flatMap((g) => g.rows.map((r) => r.id)))
  const applyCount = ids.size
  const suggestedCount = choices.suggestedIds.length
  const selectedCount = new Set(selectedIds.filter((id) => ids.has(id))).size
  return {
    applyCount,
    suggestedCount,
    selectedCount,
    text: `${applyCount} apply to ${place || 'England'}, ${suggestedCount} suggested. Choose now or later.`,
    selectedText: `${selectedCount} selected`,
  }
}

/** The first few chosen requirements for a card, and how many more there are. */
export function requirementsPreview(rows: RequirementRow[], limit = 4): { shown: RequirementRow[]; moreText: string | null } {
  const shown = rows.slice(0, Math.max(0, limit))
  const more = rows.length - shown.length
  return { shown, moreText: more > 0 ? `${more} more` : null }
}

export type RequirementsMove = {
  /** True when the region or local authority differs from the saved one. */
  moved: boolean
  /** Chosen requirements that do not apply at the new location, and are dropped on save. */
  dropped: number
  /** Suggested requirements that apply at the new location and did not apply at the old one. */
  newSuggested: number
  /** What the requirements dialog starts with after the move: what still applies, plus the new suggestions. */
  preselect: string[]
  /** "2 chosen requirements no longer apply to Hackney, Inner London East. 1 more is suggested there.", or null. */
  text: string | null
}

/**
 * What moving a project does to its requirements: the ones that stop applying and the new suggestions, so the
 * architect is told before saving and can review them after. Pure, from the dataset.
 */
export function requirementsAfterMove(chosen: string[], from: { region: string; localAuthority: string }, to: { region: string; localAuthority: string }): RequirementsMove {
  const moved = from.region !== to.region || from.localAuthority.trim() !== to.localAuthority.trim()
  if (!moved) return { moved, dropped: 0, newSuggested: 0, preselect: [...chosen], text: null }
  const kept = keepApplicable(chosen, to.region, to.localAuthority)
  const keptSet = new Set(kept)
  // Only suggestions new to this place: ones the architect could already pick and left out stay left out.
  const before = new Set(applicableIds(from.region, from.localAuthority))
  const suggested = suggestedRequirementIds(to.region, to.localAuthority).filter((id) => !keptSet.has(id) && !before.has(id))
  const wanted = new Set([...kept, ...suggested])
  const preselect = applicableIds(to.region, to.localAuthority).filter((id) => wanted.has(id))
  const dropped = new Set(chosen).size - kept.length
  const place = [to.localAuthority.trim(), to.region].filter((x) => x).join(', ') || 'the new location'
  const parts: string[] = []
  if (dropped > 0) parts.push(`${plural(dropped, 'chosen requirement')} no longer ${dropped === 1 ? 'applies' : 'apply'} to ${place}.`)
  if (suggested.length > 0) parts.push(`${suggested.length} more ${suggested.length === 1 ? 'is' : 'are'} suggested there.`)
  return { moved, dropped, newSuggested: suggested.length, preselect, text: parts.length > 0 ? parts.join(' ') : null }
}
