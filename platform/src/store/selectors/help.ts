// Help, Methodology beyond the factor tables: the default targets with their basis and status, the caveats on
// costs, certification, requirements and the statement, and the planning and sustainability references. Fixed
// reference data, so no viewer is needed.
import { GOAL_DEFAULTS, goalDef } from '../../domain/reference/goals'
import { PROJECT_TYPE_LABELS } from '../../domain/reference/projectTypes'
import { REQUIREMENTS_NOTE, requirementById, requirementsMethodology, donorRequirementsMethodology } from '../../domain/reference/requirements'
import { CERT_CAVEAT, FINANCE_CAVEAT, REQ_CAVEAT, STATEMENT_CAVEAT, TARGET_CAVEAT } from '../../domain/reference/sustainabilityCopy'
import { STATEMENT_SECTIONS } from '../../domain/engines/statement'
import { goalValueText } from '../../domain/engines/goals'
import type { ProjectType } from '../../domain/v1types'

export type GoalDefaultRow = { id: string; goal: string; requirement: string; valueText: string; basis: string; status: string }

export type MethodologyNotes = {
  goalDefaults: GoalDefaultRow[]
  targetNote: string
  financeNote: string
  financeFormula: string
  certificationNote: string
  requirementsNote: string
  statementNote: string
  statementSections: string[]
  references: { title: string; source: string; status: string }[]
  referencesNote: string
  localNote: string
}

/** Every default target in the order it is tried, with the requirement it comes from, its value, basis and status. */
export function goalDefaultRows(): GoalDefaultRow[] {
  return GOAL_DEFAULTS.map((d, i) => {
    const def = goalDef(d.goalId)
    const req = requirementById(d.requirementId, 'Central London', '')
    const byType = d.byType
      ? Object.entries(d.byType)
          .map(([type, v], j) => {
            const label = PROJECT_TYPE_LABELS[type as ProjectType] ?? type
            return `${j === 0 ? label : label.toLowerCase()} ${goalValueText(def, v ?? null)}`
          })
          .join(', ')
      : null
    return {
      id: `${d.goalId}-${d.requirementId}-${i}`,
      goal: def.label,
      requirement: req ? `${req.code}, ${req.title}` : d.requirementId,
      valueText: d.value !== null ? goalValueText(def, d.value) : (byType ?? 'Not targeted'),
      basis: d.basis,
      status: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    }
  })
}

export function methodologyNotes(): MethodologyNotes {
  return {
    goalDefaults: goalDefaultRows(),
    targetNote: TARGET_CAVEAT,
    financeNote: FINANCE_CAVEAT,
    financeFormula: "Indicative cost is the package total: material at the guide price, testing, storage and delivery. The same new is the quantity at the family's new price. Saving is the difference.",
    certificationNote: CERT_CAVEAT,
    requirementsNote: REQ_CAVEAT,
    statementNote: STATEMENT_CAVEAT,
    statementSections: STATEMENT_SECTIONS.map((s) => s.heading),
    references: [...requirementsMethodology(), ...donorRequirementsMethodology()],
    referencesNote: REQUIREMENTS_NOTE,
    localNote: 'Local authority entries name the adopted plan to check; they do not summarise every policy.',
  }
}
