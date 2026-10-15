import { describe, it, expect } from 'vitest'
import { FORBIDDEN } from '../../ui/testing'
import { GOAL_DEFAULTS, GOAL_DEFS, GOAL_IDS, RATING_SCALES } from './goals'
import { CREDITS, SCHEMES } from './certification'
import * as copy from './sustainabilityCopy'
import { LONDON_REQUIREMENTS, NATIONAL_REQUIREMENTS, LOCAL_REQUIREMENTS } from './requirements'

const allRequirementIds = new Set([...NATIONAL_REQUIREMENTS, ...LONDON_REQUIREMENTS, ...Object.values(LOCAL_REQUIREMENTS).flat()].map((r) => r.id))

describe('goals, certification credits and circular economy measures', () => {
  it('ids are unique', () => {
    const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id)).size === xs.length
    expect(ids(GOAL_DEFS)).toBe(true)
    expect(ids(CREDITS)).toBe(true)
    expect(ids(SCHEMES)).toBe(true)
    expect(GOAL_DEFS.map((g) => g.id)).toEqual([...GOAL_IDS])
  })

  it('every default comes from a requirement in the dataset', () => {
    for (const d of GOAL_DEFAULTS) expect(allRequirementIds.has(d.requirementId), d.requirementId).toBe(true)
    for (const id of ['lp-si7', 'lp-si2', 'gla-ces', 'gla-wlc', 'breeam-nc']) expect(GOAL_DEFAULTS.some((d) => d.requirementId === id), id).toBe(true)
  })

  it("every credit's scheme exists, and every credit is marked indicative", () => {
    for (const c of CREDITS) {
      expect(SCHEMES.some((s) => s.id === c.scheme)).toBe(true)
      expect(c.status).toBe('indicative')
    }
    expect(CREDITS.filter((c) => c.scheme === 'breeam')).toHaveLength(5)
  })

  it('every rating default is on its scale, and every default carries a basis and a status', () => {
    for (const d of GOAL_DEFAULTS) {
      const def = GOAL_DEFS.find((g) => g.id === d.goalId)!
      if (def.unit === 'rating') expect(def.scale).toContain(d.value)
      expect(d.basis.length).toBeGreaterThan(10)
      expect(['published', 'indicative']).toContain(d.status)
    }
    expect(RATING_SCALES.breeam).toContain('Excellent')
  })

  it('no string holds a dash, arrow or comparison sign', () => {
    const strings = [JSON.stringify(GOAL_DEFS), JSON.stringify(GOAL_DEFAULTS), JSON.stringify(CREDITS), JSON.stringify(SCHEMES), JSON.stringify(copy)]
    for (const s of strings) expect(s).not.toMatch(FORBIDDEN)
  })
})
