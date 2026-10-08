// The landing page groups (brief/09-V1-PRODUCT.md sections 3.6 and 6.4).
import { describe, expect, it } from 'vitest'
import { createSeed, PERSONA_IDS } from '../../domain/seed/world'
import { typologyOf } from '../../domain/engines/typology'
import { assumptionRowsFor, landingGroups, landingShowcase } from './shared'

describe('landingGroups', () => {
  it('puts the architect first and names each role group', () => {
    const groups = landingGroups(createSeed())
    expect(groups.map((g) => g.role)).toEqual(['architect', 'surveyor', 'seller', 'client', 'consultant', 'operator'])
    expect(groups.map((g) => g.heading)).toEqual(['Architect', 'Site surveyor', 'Asset owner (selling)', 'Asset owner (client)', 'Sustainability consultant', 'Platform operator'])
    for (const g of groups) expect(g.copy.length).toBeGreaterThan(0)
  })

  it('holds one card per active persona, each in its own role group', () => {
    const groups = landingGroups(createSeed())
    const byRole = Object.fromEntries(groups.map((g) => [g.role, g.personas.map((p) => p.id)]))
    expect(byRole.architect).toEqual([PERSONA_IDS.priya])
    expect(byRole.surveyor).toEqual([PERSONA_IDS.dana])
    expect(byRole.seller).toEqual([PERSONA_IDS.tom])
    expect(byRole.client).toEqual([PERSONA_IDS.isla])
    expect(byRole.consultant).toEqual([PERSONA_IDS.marcus])
    expect(byRole.operator).toEqual([PERSONA_IDS.operator])
    const isla = groups.find((g) => g.role === 'client')!.personas[0]
    expect(isla.name).toBe('Isla Brennan')
    expect(isla.line).toBe('Lantern Quay Developments, Development manager')
  })
})

describe('landingShowcase', () => {
  it('shows up to three open listings, one per typology first', () => {
    const picks = landingShowcase(createSeed())
    expect(picks.length).toBeGreaterThan(0)
    expect(picks.length).toBeLessThanOrEqual(3)
    expect(new Set(picks.map((l) => l.publicId)).size).toBe(picks.length)
    expect(typologyOf(picks[0].family)).toBe('envelope')
    for (const l of picks) expect(l.sharing).toBe('open')
  })
})

describe('assumptionRowsFor', () => {
  it('leaves the negotiation agent out for the architect only', () => {
    const w = createSeed()
    const ids = (personaId: string) => assumptionRowsFor(w, personaId).map((r) => r.id)
    expect(ids(PERSONA_IDS.priya)).not.toContain('negotiation')
    expect(ids(PERSONA_IDS.isla)).toContain('negotiation')
    expect(ids(PERSONA_IDS.operator)).toContain('negotiation')
    expect(ids(PERSONA_IDS.priya).length).toBe(ids(PERSONA_IDS.isla).length - 1)
  })
})
