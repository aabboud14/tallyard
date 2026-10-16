// What a donor building coming down tracks (recording audit of 16 October 2026, note C1): a national item before
// demolition, the London Plan's pre-demolition audit and diversion target in London, and the local authority's
// demolition policy where one is written (City of London, Westminster, Camden), otherwise a placeholder.
import { describe, it, expect } from 'vitest'
import { FORBIDDEN } from '../../ui/testing'
import { donorLocalRequirements, donorRequirementById, donorRequirementsFor, donorRequirementsMethodology, DONOR_LONDON, DONOR_NATIONAL, requirementsFor } from './requirements'

const DASH = /[‐-―]/
const ids = (region: string, la: string) => donorRequirementsFor(region, la).flatMap((g) => g.items.map((r) => r.id))

describe('donorRequirementsFor', () => {
  it('gives Tiverne House in the City of London the notice, the audit, the diversion target and Carbon Options', () => {
    expect(ids('Central London', 'City of London')).toEqual(['dem-notice', 'lp-si7-pda', 'lp-si7-diversion', 'la-city-of-london-carbon-options'])
    expect(donorRequirementsFor('Central London', 'City of London').map((g) => g.title)).toEqual(['National', 'London Plan 2021 and GLA guidance', 'City of London'])
    expect(ids('Central London', 'Westminster').at(-1)).toBe('la-westminster-retrofit-first')
    expect(ids('Central London', 'Camden').at(-1)).toBe('la-camden-cc1')
  })

  it('reuses the written demolition entries, so a project and a building in Camden name the same policy', () => {
    const projectCc1 = requirementsFor('Central London', 'Camden')[2].items.find((r) => r.id === 'la-camden-cc1')
    expect(donorRequirementById('la-camden-cc1', 'Central London', 'Camden')).toBe(projectCc1)
    expect(donorLocalRequirements('Central London', 'Camden').map((r) => r.id)).toEqual(['la-camden-cc1'])
  })

  it('gives a placeholder for an authority with no written entry, and none without an authority', () => {
    const ealing = donorLocalRequirements('Outer London West', 'Ealing')
    expect(ealing).toHaveLength(1)
    expect(ealing[0]).toMatchObject({ id: 'la-ealing-demolition', title: 'Ealing local plan, demolition and waste', placeholder: true })
    expect(ealing[0].summary).toMatch(/London Plan/)
    expect(donorLocalRequirements('South West', 'Bristol')[0].summary).not.toMatch(/London Plan/)
    expect(ids('South East', '')).toEqual(['dem-notice'])
  })

  it('follows the nation: Wales and Scotland get their own national item', () => {
    expect(ids('Wales', 'Cardiff')).toEqual(['dem-notice-wales', 'la-cardiff-demolition'])
    expect(ids('Scotland', '')).toEqual(['dem-warrant-scotland'])
    expect(donorRequirementsFor('Scotland', '')[0].subtitle).toBe('Scotland, before demolition')
  })

  it('applies only to donor buildings, never to the project picker', () => {
    for (const r of [...Object.values(DONOR_NATIONAL), ...DONOR_LONDON]) expect(r.appliesTo).toEqual(['donor'])
    const projectIds = requirementsFor('Central London', 'City of London').flatMap((g) => g.items.map((r) => r.id))
    expect(projectIds).not.toContain('lp-si7-pda')
    expect(projectIds).toContain('la-city-of-london-carbon-options')
  })

  it('is plain copy, marked indicative, and lists its summaries for Help, Methodology', () => {
    const all = [...Object.values(DONOR_NATIONAL), ...DONOR_LONDON, ...donorLocalRequirements('Outer London West', 'Ealing')]
    for (const r of all) {
      expect(r.status).toBe('indicative')
      for (const t of [r.code, r.title, r.source, r.trigger, r.summary, ...r.asks, r.helps ?? '']) {
        expect(t, r.id).not.toMatch(FORBIDDEN)
        expect(t, r.id).not.toMatch(DASH)
      }
    }
    expect(donorRequirementsMethodology().map((r) => r.title)).toEqual(['Policy SI 7, Pre-demolition audit', 'Policy SI 7, Demolition waste put to beneficial use'])
  })
})
