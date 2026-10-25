import { describe, it, expect } from 'vitest'
import { REGIONS } from './assumptions'
import { V1_ASSUMPTIONS, V1_PARAMETER_ROWS, V1_SOURCE } from './v1assumptions'

describe('V1_ASSUMPTIONS', () => {
  it('holds the placeholders agreed on the call', () => {
    expect(V1_ASSUMPTIONS.timeline).toEqual({ tightDays: 60 })
    expect(V1_ASSUMPTIONS.band).toEqual({ high: 0.9, medium: 0.8 })
  })

  it('gives km to each hub for every seed region', () => {
    expect(Object.keys(V1_ASSUMPTIONS.regionHubKm).sort()).toEqual([...REGIONS].sort())
    for (const km of Object.values(V1_ASSUMPTIONS.regionHubKm)) {
      expect(Object.keys(km).sort()).toEqual(['HUB-BARK', 'HUB-PARK', 'HUB-TILB'])
      for (const v of Object.values(km)) expect(v).toBeGreaterThan(0)
    }
  })

  it('lists every value as a placeholder row with the call as its source', () => {
    expect(V1_SOURCE).toBe('Founder and partner, call of 7 October 2026')
    expect(V1_PARAMETER_ROWS).toHaveLength(3 + REGIONS.length)
    for (const r of V1_PARAMETER_ROWS) {
      expect(r.status).toBe('placeholder')
      expect(r.source).toBe(V1_SOURCE)
    }
    const byId = Object.fromEntries(V1_PARAMETER_ROWS.map((r) => [r.id, r]))
    expect(byId['timeline.tightDays'].value).toBe('60')
    expect(byId['band.high'].value).toBe('90%')
    expect(byId['band.medium'].value).toBe('80%')
    expect(byId['regionHubKm.Central London'].value).toBe('Barking 17, Park Royal 14, Tilbury 38')
  })
})
