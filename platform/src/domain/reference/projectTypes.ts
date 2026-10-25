// Project types: thirteen kinds of building plus 'Other' with an optional description (review of 14 October 2026).
// The description is for the project team only; a seller reads the blind type, never the free text.
import type { ProjectType } from '../v1types'

export const PROJECT_TYPES: ProjectType[] = ['office', 'residential', 'hotel', 'mixed_use', 'retail', 'education', 'healthcare', 'laboratory', 'industrial', 'cultural', 'leisure', 'student_housing', 'other']

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  office: 'Office',
  residential: 'Residential',
  hotel: 'Hotel',
  mixed_use: 'Mixed use',
  retail: 'Retail',
  education: 'Education',
  healthcare: 'Healthcare',
  laboratory: 'Laboratory',
  industrial: 'Industrial and logistics',
  cultural: 'Cultural and civic',
  leisure: 'Sport and leisure',
  student_housing: 'Student housing',
  other: 'Other',
}

export const PROJECT_TYPE_OTHER_MAX = 60

/** What a seller may read: never the free text. */
export function blindProjectType(type: ProjectType): string {
  return `${PROJECT_TYPE_LABELS[type].toLowerCase()} project`
}

/** The trimmed free text when the type is 'other' and the text is not empty, otherwise the type's label. */
export function projectTypeLabel(p: { projectType: ProjectType; projectTypeOther: string }): string {
  const other = (p.projectTypeOther ?? '').trim()
  return p.projectType === 'other' && other ? other : PROJECT_TYPE_LABELS[p.projectType]
}
