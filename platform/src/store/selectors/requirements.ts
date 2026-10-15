// Planning and sustainability requirements: the choices for the forms, and what a project tracks. One dataset,
// src/domain/reference/requirements.ts, every entry an indicative summary.
import { KIND_LABELS, REQUIREMENTS_NOTE, requirementsFor, suggestedRequirementIds, type PlanningRequirement, type RequirementLevel, type RequirementTopic } from '../../domain/reference/requirements'
import type { AppData, Viewer } from '../types'
import { projectSide } from '../access'

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

export type RequirementChoices = { groups: RequirementChoiceGroup[]; suggestedIds: string[]; note: string }

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
  /** What the card says while nothing is chosen, for this viewer. */
  emptyText: string
  /** True on an owner's New project with no architect: no one can choose requirements yet. */
  noArchitect: boolean
}

/** What a project tracks, for anyone on the project; the architect may edit it. */
export function projectRequirementsView(state: AppData, viewer: Viewer, projectId: string): ProjectRequirementsView | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (!side) return null
  const p = state.world.projects[projectId]
  const choices = requirementChoices(p.region, p.localAuthority, p.planningRequirementIds)
  const noArchitect = !p.architectOrgId
  return {
    canEdit: side === 'architect',
    locationText: [p.localAuthority, p.region].filter((x) => x).join(', '),
    selected: choices.groups.flatMap((g) => g.rows.filter((r) => r.selected)),
    reviewed: p.requirementsReviewed,
    choices,
    note: REQUIREMENTS_NOTE,
    emptyText:
      side === 'architect'
        ? 'No requirements chosen yet. Pick the policies and standards to track for this location.'
        : noArchitect
          ? 'Appoint an architect to choose which requirements apply.'
          : 'The architect has not chosen any requirements yet.',
    noArchitect,
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
