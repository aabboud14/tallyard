// Sustainability goals and their default targets (client-consultant design, section 2.1). A default comes from a
// requirement that applies to the project, in src/domain/reference/requirements.ts. Every default is a summary to
// check: published where the figure is in the published policy or guidance, indicative otherwise.
//
// The design named the requirement ids london-plan-si7, london-plan-si2 and borough-breeam. The dataset uses
// lp-si7 and gla-ces (Policy SI 7 and its statement guidance), lp-si2 and gla-wlc (Policy SI 2 and the whole
// life-cycle carbon guidance) and breeam-nc (BREEAM New Construction, chosen per project). Only this table maps them.
import type { ReferenceStatus } from '../types'
import type { GoalId, GoalValue } from '../sustainabilityTypes'
import type { SchemeId } from './certification'

export type GoalUnit = 'ratio' | 'tCO2e' | 'kgCO2e_m2' | 'rating'

export type GoalDef = {
  id: GoalId
  label: string
  unitLabel: string
  unit: GoalUnit
  direction: 'at_least' | 'at_most'
  /** Tallyard works out the result itself, or the consultant enters it. */
  measuredBy: 'tallyard' | 'consultant'
  scale: readonly string[] | null
  scheme: SchemeId | null
}

export type GoalDefault = {
  goalId: GoalId
  requirementId: string
  value: GoalValue | null
  /** A value per project type, when the default depends on it; a type not listed has no default. */
  byType: Partial<Record<string, number>> | null
  basis: string
  status: ReferenceStatus
}

export const RATING_SCALES = {
  breeam: ['Pass', 'Good', 'Very good', 'Excellent', 'Outstanding'],
  leed: ['Certified', 'Silver', 'Gold', 'Platinum'],
  well: ['Bronze', 'Silver', 'Gold', 'Platinum'],
} as const

export const GOAL_IDS: readonly GoalId[] = ['content_by_value', 'reuse_by_value', 'avoided_carbon', 'upfront_carbon', 'cd_diversion', 'breeam', 'leed', 'well']

export const GOAL_DEFS: GoalDef[] = [
  { id: 'content_by_value', label: 'Reused and recycled content by value', unitLabel: '% by value', unit: 'ratio', direction: 'at_least', measuredBy: 'tallyard', scale: null, scheme: 'circular' },
  { id: 'reuse_by_value', label: 'Reused content by value', unitLabel: '% by value', unit: 'ratio', direction: 'at_least', measuredBy: 'tallyard', scale: null, scheme: 'circular' },
  { id: 'avoided_carbon', label: 'Upfront carbon avoided by reuse', unitLabel: 'tCO2e', unit: 'tCO2e', direction: 'at_least', measuredBy: 'tallyard', scale: null, scheme: null },
  { id: 'upfront_carbon', label: 'Upfront carbon, modules A1 to A5', unitLabel: 'kgCO2e per m2 GIA', unit: 'kgCO2e_m2', direction: 'at_most', measuredBy: 'consultant', scale: null, scheme: null },
  { id: 'cd_diversion', label: 'Construction and demolition waste diverted from landfill', unitLabel: '% by mass', unit: 'ratio', direction: 'at_least', measuredBy: 'consultant', scale: null, scheme: 'circular' },
  { id: 'breeam', label: 'BREEAM rating', unitLabel: 'Rating', unit: 'rating', direction: 'at_least', measuredBy: 'consultant', scale: RATING_SCALES.breeam, scheme: 'breeam' },
  { id: 'leed', label: 'LEED certification', unitLabel: 'Level', unit: 'rating', direction: 'at_least', measuredBy: 'consultant', scale: RATING_SCALES.leed, scheme: 'leed' },
  { id: 'well', label: 'WELL certification', unitLabel: 'Level', unit: 'rating', direction: 'at_least', measuredBy: 'consultant', scale: RATING_SCALES.well, scheme: 'well' },
]

const CES_BASIS = 'Circular Economy Statement guidance (2022), paragraph 4.7.6: aim of at least 20% reused or recycled content by value'
const WLC_BASIS = 'GLA whole life-cycle carbon guidance (2022), benchmark for modules A1 to A5. Indicative summary, check the current guidance.'

/** In order: for each goal the first entry whose requirement applies to the project gives the default. */
export const GOAL_DEFAULTS: GoalDefault[] = [
  { goalId: 'content_by_value', requirementId: 'gla-ces', value: 0.2, byType: null, basis: CES_BASIS, status: 'published' },
  { goalId: 'content_by_value', requirementId: 'lp-si7', value: 0.2, byType: null, basis: CES_BASIS, status: 'published' },
  { goalId: 'upfront_carbon', requirementId: 'gla-wlc', value: null, byType: { office: 950, residential: 850 }, basis: WLC_BASIS, status: 'indicative' },
  { goalId: 'upfront_carbon', requirementId: 'lp-si2', value: null, byType: { office: 950, residential: 850 }, basis: WLC_BASIS, status: 'indicative' },
  { goalId: 'cd_diversion', requirementId: 'lp-si7', value: 0.95, byType: null, basis: 'London Plan 2021 Policy SI 7: at least 95% diverted from landfill', status: 'published' },
  {
    goalId: 'breeam',
    requirementId: 'breeam-nc',
    value: 'Excellent',
    byType: null,
    basis: "Local plan policy for major non-residential development, where the scheme seeks a rating. Indicative summary, check the borough's policy.",
    status: 'indicative',
  },
]

export function goalDef(id: GoalId): GoalDef {
  const d = GOAL_DEFS.find((g) => g.id === id)
  if (!d) throw new Error('No goal ' + id)
  return d
}

export function isGoalId(id: string): id is GoalId {
  return (GOAL_IDS as readonly string[]).includes(id)
}
