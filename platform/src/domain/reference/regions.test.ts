// The regions and local authorities behind the location dropdowns (recording audit of 16 October 2026, note C7):
// London follows the ONS split of Inner and Outer London, every English region, Wales and Scotland can be chosen,
// and each has hub distances; Wales and Scotland say their national requirements are not yet summarised.
import { describe, it, expect } from 'vitest'
import { FORBIDDEN } from '../../ui/testing'
import { createSeed } from '../seed/world'
import { REGIONS } from './assumptions'
import { V1_ASSUMPTIONS } from './v1assumptions'
import { ALL_REFERENCE_PLACES, isValidLocalAuthority, localAuthorityGroups, LOCAL_AUTHORITIES, LONDON_REGIONS, nationOfRegion, regionGroups, regionHint, regionOfLocalAuthority } from './places'
import { applicableIds, requirementsFor, suggestedRequirementIds } from './requirements'

const DASH = /[‐-―]/
/** The ONS list of Inner London authorities; every other London borough is Outer London. */
const ONS_INNER = ['Camden', 'City of London', 'Hackney', 'Hammersmith and Fulham', 'Haringey', 'Islington', 'Kensington and Chelsea', 'Lambeth', 'Lewisham', 'Newham', 'Southwark', 'Tower Hamlets', 'Wandsworth', 'Westminster']

describe('London regions', () => {
  it('put every inner borough in Central or Inner London and every outer one in Outer London', () => {
    for (const r of LONDON_REGIONS) {
      for (const la of LOCAL_AUTHORITIES[r]) {
        const inner = r === 'Central London' || r.startsWith('Inner')
        expect(ONS_INNER.includes(la), `${la} in ${r}`).toBe(inner)
      }
    }
    expect(regionOfLocalAuthority('Brent')).toBe('Outer London West')
    expect(regionOfLocalAuthority('Merton')).toBe('Outer London West')
    expect(regionOfLocalAuthority('Greenwich')).toBe('Outer London East')
  })

  it('keeps every seeded project and building in a valid place, with its region unchanged', () => {
    const w = createSeed()
    for (const p of Object.values(w.projects)) expect(isValidLocalAuthority(p.region, p.localAuthority), p.name).toBe(true)
    for (const b of Object.values(w.buildings)) expect(isValidLocalAuthority(b.region, b.localAuthority), b.id).toBe(true)
  })
})

describe('regions across Great Britain', () => {
  it('lists the English regions, Wales and Scotland, each with authorities and hub distances', () => {
    expect(REGIONS).toHaveLength(15)
    for (const r of REGIONS) {
      expect(LOCAL_AUTHORITIES[r]?.length ?? 0, r).toBeGreaterThan(0)
      expect(Object.keys(V1_ASSUMPTIONS.regionHubKm[r] ?? {}), r).toHaveLength(3)
      expect(nationOfRegion(r), r).not.toBeNull()
    }
    expect(nationOfRegion('North West')).toBe('England')
    expect(nationOfRegion('Wales')).toBe('Wales')
    expect(nationOfRegion('Mars')).toBeNull()
    expect(new Set(ALL_REFERENCE_PLACES).size).toBe(ALL_REFERENCE_PLACES.length)
    for (const la of ALL_REFERENCE_PLACES) expect(la).not.toMatch(DASH)
  })

  it('groups the regions for the dropdown, and every authority by region with the chosen one first', () => {
    expect(regionGroups(REGIONS).map((g) => [g.label, g.items.length])).toEqual([
      ['London', 5],
      ['England outside London', 8],
      ['Wales and Scotland', 2],
    ])
    const g = localAuthorityGroups('Outer London West', REGIONS)
    expect(g[0]).toEqual({ label: 'Outer London West', items: [...LOCAL_AUTHORITIES['Outer London West']] })
    expect(g.map((x) => x.label)).toHaveLength(REGIONS.length)
    expect(g.flatMap((x) => x.items)).toHaveLength(ALL_REFERENCE_PLACES.length)
  })

  it('names the boroughs a London region covers, and what is not yet summarised in Wales and Scotland', () => {
    expect(regionHint('Inner London West')).toBe('Covers Hammersmith and Fulham and Wandsworth.')
    expect(regionHint('Central London')).toBe('Covers City of London, Westminster, Camden, Islington, Kensington and Chelsea, Lambeth and Southwark.')
    expect(regionHint('Scotland')).toBe('National requirements for Scotland are not yet summarised. UK standards and certifications are listed.')
    expect(regionHint('South West')).toBeNull()
  })
})

describe('requirements in Wales and Scotland', () => {
  it('give a national placeholder and the UK-wide entries instead of English policy', () => {
    const g = requirementsFor('Wales', 'Cardiff')
    expect(g.map((x) => x.level)).toEqual(['national', 'local'])
    expect(g[0].subtitle).toBe('Wales: national requirements not yet summarised, UK standards shown')
    expect(g[0].items.map((r) => r.id)).toEqual(['wales-national', 'nzcbs', 'riba2030', 'rics-wlca', 'breeam-nc', 'leed-v5', 'well-v2'])
    expect(g[0].items[0]).toMatchObject({ placeholder: true, suggested: true })
    expect(applicableIds('Scotland', '')).not.toContain('nppf')
    expect(suggestedRequirementIds('Scotland', 'Glasgow')).toEqual(['scotland-national', 'la-glasgow'])
    for (const r of [...g.flatMap((x) => x.items), ...requirementsFor('Scotland', '')[0].items]) {
      for (const t of [r.title, r.summary, r.source, r.code]) {
        expect(t).not.toMatch(FORBIDDEN)
        expect(t).not.toMatch(DASH)
      }
    }
  })

  it('marks generated local entries as placeholders and written ones as summaries', () => {
    expect(requirementsFor('North East', 'Gateshead')[1].items[0]).toMatchObject({ id: 'la-gateshead', placeholder: true })
    expect(requirementsFor('Central London', 'Camden')[2].items.every((r) => !r.placeholder)).toBe(true)
    expect(requirementsFor('Central London', 'Camden')[0].items.every((r) => !r.placeholder)).toBe(true)
  })
})
