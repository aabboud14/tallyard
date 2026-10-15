// The compliance workbook's model with the sustainability records (client-consultant design, section 5.6): targets,
// requirement tracking and the certification mapping from the tracked credits. Consultant only.
import { SCHEME_IDS, schemeDef } from '../../domain/reference/certification'
import { LABELS } from '../../domain/reference/labels'
import type { AppData, Viewer } from '../types'
import { projectSide } from '../access'
import { complianceWorkbookModel, type ComplianceWorkbookModel } from './roles-views'
import { certificationView, goalRows, requirementsView, type CreditRow, type GoalRow, type RequirementTrackRow } from './sustainability'

export type ComplianceWorkbook = ComplianceWorkbookModel & { targets: GoalRow[]; requirements: RequirementTrackRow[]; credits: (CreditRow & { schemeLabel: string })[] }

export function complianceWorkbook(state: AppData, viewer: Viewer, projectId: string): ComplianceWorkbook | null {
  if (projectSide(state, viewer.userId, projectId) !== 'consultant') return null
  const model = complianceWorkbookModel(state, viewer, projectId)
  if (!model) return null
  const credits = SCHEME_IDS.flatMap((id) => certificationView(state, viewer, projectId, id)!.credits.map((c) => ({ ...c, schemeLabel: schemeDef(c.scheme).label })))
  return {
    ...model,
    certification: credits.filter((c) => c.targeted).map((c) => ({ requirement: `${c.schemeLabel} ${c.code}, ${c.title}`, provides: c.provides, note: c.note || LABELS.L19 })),
    targets: goalRows(state, viewer, projectId)!,
    requirements: requirementsView(state, viewer, projectId)!.rows,
    credits,
  }
}
