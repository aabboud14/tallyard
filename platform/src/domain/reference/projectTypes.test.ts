import { describe, it, expect } from 'vitest'
import { blindProjectType, PROJECT_TYPE_LABELS, PROJECT_TYPES, projectTypeLabel } from './projectTypes'
import { PROJECT_TYPE_LABELS as FROM_LABELS } from './labels'

describe('project types', () => {
  it('has thirteen types with a label each, Other last', () => {
    expect(PROJECT_TYPES).toHaveLength(13)
    expect(PROJECT_TYPES[PROJECT_TYPES.length - 1]).toBe('other')
    for (const t of PROJECT_TYPES) expect(PROJECT_TYPE_LABELS[t].length, t).toBeGreaterThan(0)
    expect(Object.keys(PROJECT_TYPE_LABELS).sort()).toEqual([...PROJECT_TYPES].sort())
    expect(FROM_LABELS).toBe(PROJECT_TYPE_LABELS)
  })

  it('gives a seller the blind type, never the free text', () => {
    expect(blindProjectType('other')).toBe('other project')
    expect(blindProjectType('mixed_use')).toBe('mixed use project')
    expect(blindProjectType('residential')).toBe('residential project')
  })

  it('shows the team the description for Other', () => {
    expect(projectTypeLabel({ projectType: 'other', projectTypeOther: ' Data centre ' })).toBe('Data centre')
    expect(projectTypeLabel({ projectType: 'other', projectTypeOther: '' })).toBe('Other')
    expect(projectTypeLabel({ projectType: 'office', projectTypeOther: 'Ignored' })).toBe('Office')
  })
})
