import { describe, it, expect } from 'vitest'
import { FORBIDDEN } from '../../ui/testing'
import { createSeed } from '../seed/world'
import { applicableIds, keepApplicable, LOCAL_REQUIREMENTS, LONDON_REQUIREMENTS, localRequirements, localSlug, NATIONAL_REQUIREMENTS, requirementsFor, requirementsMethodology, suggestedRequirementIds } from './requirements'
import { ALL_REFERENCE_PLACES, isLondonRegion, isValidLocalAuthority, LOCAL_AUTHORITIES, LONDON_REGIONS, localAuthoritiesFor, regionOfLocalAuthority } from './places'
import { REGIONS } from './assumptions'

const DASH = /[‐-―]/
const ALL = [...NATIONAL_REQUIREMENTS, ...LONDON_REQUIREMENTS, ...Object.values(LOCAL_REQUIREMENTS).flat(), ...localRequirements('Inner London East', 'Newham'), ...localRequirements('South East', 'Reading')]

describe('the requirements dataset', () => {
  it('has unique IDs that never look like dates', () => {
    const ids = ALL.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).not.toMatch(/^\d{4}-\d{2}(-\d{2})?$/)
  })

  it('marks every entry indicative, with a source and a summary, in plain copy', () => {
    for (const r of ALL) {
      expect(r.status).toBe('indicative')
      expect(r.source.length, r.id).toBeGreaterThan(0)
      expect(r.summary.length, r.id).toBeGreaterThan(0)
      for (const text of [r.code, r.title, r.source, r.trigger, r.summary, ...r.asks, r.helps ?? '']) {
        expect(text, r.id).not.toMatch(FORBIDDEN)
        expect(text, r.id).not.toMatch(DASH)
      }
    }
  })

  it('suggests only statutory policy, regulation and guidance', () => {
    for (const r of ALL) if (r.suggested) expect(['planning_policy', 'regulation', 'guidance'], r.id).toContain(r.kind)
  })
})

describe('requirementsFor', () => {
  it('gives national, London and local groups in London', () => {
    const g = requirementsFor('Inner London East', 'Hackney')
    expect(g.map((x) => x.level)).toEqual(['national', 'london', 'local'])
    expect(g[2].items.map((r) => r.id)).toEqual(['la-hackney-lp33'])
    expect(g.map((x) => x.title)).toEqual(['National', 'London Plan 2021 and GLA guidance', 'Hackney'])
  })

  it('gives a generated local entry elsewhere, and no local group without an authority', () => {
    const g = requirementsFor('South East', 'Reading')
    expect(g.map((x) => x.level)).toEqual(['national', 'local'])
    expect(g[1].items.map((r) => r.id)).toEqual(['la-reading'])
    expect(g[1].items[0].title).toBe('Reading local plan policies')
    expect(g[1].items[0].summary).toMatch(/^Local policies apply alongside national policy/)
    expect(requirementsFor('South East', '').map((x) => x.level)).toEqual(['national'])
    expect(localRequirements('Inner London East', 'Newham')[0].summary).toMatch(/^Borough policies apply alongside the London Plan/)
    expect(localSlug('  Kingston upon Thames ')).toBe('kingston-upon-thames')
    expect(localSlug('Southend-on-Sea')).toBe('southend-on-sea')
  })

  it('suggests statutory items only, never voluntary standards or certifications', () => {
    expect(suggestedRequirementIds('Central London', 'Camden')).toEqual(['nppf', 'adl', 'lp-si2', 'lp-si7', 'lp-d3', 'gla-wlc', 'gla-ces', 'gla-energy', 'la-camden-cc1', 'la-camden-cpg'])
  })

  it('keeps the IDs that apply here, in dataset order, without repeats', () => {
    expect(keepApplicable(['la-camden-cc1', 'lp-si2', 'lp-si2', 'nppf'], 'Inner London East', 'Hackney')).toEqual(['nppf', 'lp-si2'])
    expect(keepApplicable(['lp-si2', 'nppf'], 'South East', 'Reading')).toEqual(['nppf'])
  })

  it('applies to every seeded project as stored', () => {
    for (const p of Object.values(createSeed().projects)) {
      expect(keepApplicable(p.planningRequirementIds, p.region, p.localAuthority), p.name).toEqual(p.planningRequirementIds)
      expect(applicableIds(p.region, p.localAuthority).length).toBeGreaterThan(p.planningRequirementIds.length - 1)
    }
  })

  it('lists every named entry for Help, Methodology', () => {
    const rows = requirementsMethodology()
    expect(rows).toHaveLength(NATIONAL_REQUIREMENTS.length + LONDON_REQUIREMENTS.length + 7)
    expect(rows.every((r) => r.status === 'Indicative summary' && r.source.length > 0)).toBe(true)
  })
})

describe('places', () => {
  it('lists the 33 London authorities, each in exactly one London region', () => {
    const london = LONDON_REGIONS.flatMap((r) => [...LOCAL_AUTHORITIES[r]])
    expect(london).toHaveLength(33)
    expect(new Set(london).size).toBe(33)
    for (const la of london) expect(LONDON_REGIONS.filter((r) => LOCAL_AUTHORITIES[r].includes(la))).toHaveLength(1)
    expect(regionOfLocalAuthority('Newham')).toBe('Inner London East')
    expect(regionOfLocalAuthority('Atlantis')).toBeNull()
    expect(ALL_REFERENCE_PLACES).toContain('Reading')
  })

  it('covers every product region', () => {
    for (const r of REGIONS) expect(localAuthoritiesFor(r).length, r).toBeGreaterThan(0)
    expect(localAuthoritiesFor('Mars')).toEqual([])
    expect(isLondonRegion('Central London')).toBe(true)
    expect(isLondonRegion('South East')).toBe(false)
  })

  it('accepts only a London region own authorities, and typed names elsewhere', () => {
    expect(isValidLocalAuthority('Inner London East', 'Camden')).toBe(false)
    expect(isValidLocalAuthority('Central London', 'Camden')).toBe(true)
    expect(isValidLocalAuthority('South East', 'St Albans')).toBe(true)
    expect(isValidLocalAuthority('South East', 'x'.repeat(81))).toBe(false)
    expect(isValidLocalAuthority('Mars', '')).toBe(true)
  })
})
