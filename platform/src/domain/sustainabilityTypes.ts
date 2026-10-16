// The sustainability records a project keeps (client-consultant design, section 1): the consultant's targets and
// results, requirement tracking with evidence, certification credits and the circular economy statement. Plain data.

/** One status vocabulary for requirements and certification credits. */
export type TrackStatus = 'not_started' | 'in_progress' | 'at_risk' | 'evidence_ready' | 'not_applicable'
export const TRACK_STATUSES: readonly TrackStatus[] = ['not_started', 'in_progress', 'at_risk', 'evidence_ready', 'not_applicable']

/** Outputs held in Tallyard that a person can cite as evidence. */
export type OutputRef = 'compliance_workbook' | 'ce_statement' | 'specification' | 'sustainability' | 'certification'
export const OUTPUT_REFS: readonly OutputRef[] = ['compliance_workbook', 'ce_statement', 'specification', 'sustainability', 'certification']

export type Evidence = {
  id: string
  text: string
  output: OutputRef | null
  addedByUserId: string
  /** The name at the time, so the log reads the same if the person later leaves. */
  addedBy: string
  addedAt: string
}

/** Status and evidence for one planning or sustainability requirement (a PlanningRequirement id). */
export type RequirementTrack = { requirementId: string; status: TrackStatus; evidence: Evidence[]; updatedAt: string | null; updatedByUserId: string | null }

export type GoalId = 'content_by_value' | 'reuse_by_value' | 'avoided_carbon' | 'upfront_carbon' | 'cd_diversion' | 'breeam' | 'leed' | 'well'
/** A number for measured goals (a ratio from 0 to 1, tCO2e, or kgCO2e per m2), a level name for ratings. */
export type GoalValue = number | string

/** The consultant's override. value null means "not targeted on this project". */
export type GoalOverride = { goalId: GoalId; value: GoalValue | null; note: string; setByUserId: string; setAt: string }

/** A result the consultant enters for a goal Tallyard cannot measure. */
export type GoalActual = { goalId: GoalId; value: GoalValue; asOf: string; source: string; enteredByUserId: string; enteredAt: string }

export type CreditTrack = {
  creditId: string
  targeted: boolean
  status: TrackStatus
  note: string
  /** publicId to included, only where the consultant overrode the rule-based default. */
  items: Record<string, boolean>
  updatedAt: string | null
  updatedByUserId: string | null
}

export type StatementSectionId = 'context' | 'approach' | 'reuse' | 'content' | 'carbon' | 'targets' | 'certification' | 'next_steps'
/** The consultant's text for a section, with the generated text it replaced (basis), to spot later changes. */
export type StatementEdit = { text: string; basis: string; editedAt: string; editedByUserId: string }
export type StatementStatus = 'draft' | 'ready_for_review' | 'reviewed'
export type StatementDoc = {
  edits: Partial<Record<StatementSectionId, StatementEdit>>
  status: StatementStatus
  sentAt: string | null
  sentByUserId: string | null
  reviewedAt: string | null
  reviewedByUserId: string | null
  reviewNote: string | null
  /**
   * The sections exactly as sent for review, so the client reads what was sent while the consultant's live text
   * moves on with the records. Absent in records written before 16 October 2026; sending again replaces it.
   */
  sentSections?: StatementSnapshotSection[] | null
}

export type StatementSnapshotSection = { id: StatementSectionId; heading: string; text: string }

/** A project's sustainability records: the consultant's targets, results, credits and statement, and the tracking of its requirements. */
export type ProjectSustainability = {
  goals: Partial<Record<GoalId, GoalOverride>>
  actuals: Partial<Record<GoalId, GoalActual>>
  requirements: Record<string, RequirementTrack>
  credits: Record<string, CreditTrack>
  statement: StatementDoc | null
}
