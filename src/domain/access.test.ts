import { describe, it, expect } from 'vitest'
import { createSeed, PERSONA_IDS, ORG_IDS, TIVERNE_ID, HARROWDEN_ID, MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID, DURNLEY_ID } from './seed/world'
import { roleOf, buildingsFor, clientsFor, projectsFor, engagementsFor, canAccess } from './access'

const w = createSeed()
const ids = <T extends { id: string }>(xs: T[]) => xs.map((x) => x.id)

describe('roleOf', () => {
  it('maps each persona to the role of their organisation', () => {
    expect(roleOf(w, PERSONA_IDS.dana)).toBe('surveyor')
    expect(roleOf(w, PERSONA_IDS.tom)).toBe('seller')
    expect(roleOf(w, PERSONA_IDS.priya)).toBe('architect')
    expect(roleOf(w, PERSONA_IDS.isla)).toBe('client')
    expect(roleOf(w, PERSONA_IDS.marcus)).toBe('consultant')
    expect(roleOf(w, PERSONA_IDS.operator)).toBe('operator')
  })
  it('throws for an unknown persona', () => {
    expect(() => roleOf(w, 'per_nobody')).toThrow()
  })
})

describe('buildings', () => {
  it('Tom sees Tiverne House only and not Harrowden Court', () => {
    expect(ids(buildingsFor(w, PERSONA_IDS.tom))).toEqual([TIVERNE_ID])
    expect(canAccess(w, PERSONA_IDS.tom, { buildingId: TIVERNE_ID })).toBe(true)
    expect(canAccess(w, PERSONA_IDS.tom, { buildingId: HARROWDEN_ID })).toBe(false)
  })
  it('Dana sees both buildings, grouped by client', () => {
    expect(ids(buildingsFor(w, PERSONA_IDS.dana))).toEqual([TIVERNE_ID, HARROWDEN_ID])
    expect(canAccess(w, PERSONA_IDS.dana, { buildingId: TIVERNE_ID })).toBe(true)
    expect(canAccess(w, PERSONA_IDS.dana, { buildingId: HARROWDEN_ID })).toBe(true)
    const groups = clientsFor(w, PERSONA_IDS.dana)
    expect(groups.map((g) => [g.org.name, g.buildings.map((b) => b.name)])).toEqual([
      ['Ostlea Estates', ['Tiverne House']],
      ['Brackwater Estates', ['Harrowden Court']],
    ])
  })
  it('the architect, the client, the consultant and the operator see no building', () => {
    for (const p of [PERSONA_IDS.priya, PERSONA_IDS.isla, PERSONA_IDS.marcus, PERSONA_IDS.operator]) {
      expect(buildingsFor(w, p)).toEqual([])
      expect(canAccess(w, p, { buildingId: TIVERNE_ID })).toBe(false)
      expect(canAccess(w, p, { buildingId: HARROWDEN_ID })).toBe(false)
    }
  })
  it("other sellers' stock buildings are open to nobody", () => {
    const others = Object.values(w.buildings).filter((b) => b.ownerOrgId === null)
    expect(others.length).toBeGreaterThan(0)
    for (const b of others) for (const p of Object.keys(w.personas)) expect(canAccess(w, p, { buildingId: b.id })).toBe(false)
  })
  it('an unknown building is not accessible', () => {
    expect(canAccess(w, PERSONA_IDS.dana, { buildingId: 'bld_nothin' })).toBe(false)
  })
})

describe('projects', () => {
  it('Priya sees the three projects of her practice', () => {
    expect(ids(projectsFor(w, PERSONA_IDS.priya))).toEqual([MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID])
    for (const id of [MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID]) expect(canAccess(w, PERSONA_IDS.priya, { projectId: id })).toBe(true)
  })
  it('Isla sees Merrowgate Wharf only', () => {
    expect(ids(projectsFor(w, PERSONA_IDS.isla))).toEqual([MERROWGATE_ID])
    expect(canAccess(w, PERSONA_IDS.isla, { projectId: SALLOW_ID })).toBe(false)
    expect(canAccess(w, PERSONA_IDS.isla, { projectId: FERRYMOOR_ID })).toBe(false)
  })
  it('Marcus sees Merrowgate Wharf and the Durnley House engagement', () => {
    expect(canAccess(w, PERSONA_IDS.marcus, { projectId: MERROWGATE_ID })).toBe(true)
    expect(canAccess(w, PERSONA_IDS.marcus, { engagementId: DURNLEY_ID })).toBe(true)
    expect(ids(engagementsFor(w, PERSONA_IDS.marcus))).toEqual([DURNLEY_ID])
  })
  it('Tom, Dana and the operator see no project and no engagement', () => {
    for (const p of [PERSONA_IDS.tom, PERSONA_IDS.dana, PERSONA_IDS.operator]) {
      expect(projectsFor(w, p)).toEqual([])
      expect(engagementsFor(w, p)).toEqual([])
      expect(canAccess(w, p, { projectId: MERROWGATE_ID })).toBe(false)
      expect(canAccess(w, p, { engagementId: DURNLEY_ID })).toBe(false)
    }
  })
  it('Isla and Priya see no engagement', () => {
    expect(engagementsFor(w, PERSONA_IDS.isla)).toEqual([])
    expect(engagementsFor(w, PERSONA_IDS.priya)).toEqual([])
  })
})

describe('the operator', () => {
  it('reaches none of the private records', () => {
    const op = PERSONA_IDS.operator
    for (const id of Object.keys(w.buildings)) expect(canAccess(w, op, { buildingId: id })).toBe(false)
    for (const id of Object.keys(w.projects)) expect(canAccess(w, op, { projectId: id })).toBe(false)
    for (const id of Object.keys(w.engagements)) expect(canAccess(w, op, { engagementId: id })).toBe(false)
  })
})

describe('an unknown persona', () => {
  it('reaches nothing', () => {
    expect(buildingsFor(w, 'per_nobody')).toEqual([])
    expect(projectsFor(w, 'per_nobody')).toEqual([])
    expect(canAccess(w, 'per_nobody', { projectId: MERROWGATE_ID })).toBe(false)
  })
})

describe('the seed behind the access rules', () => {
  it('Harrowden Court belongs to Brackwater Estates and is surveyed by Tarnbrook', () => {
    expect(w.buildings[HARROWDEN_ID].ownerOrgId).toBe(ORG_IDS.brackwater)
    expect(w.buildings[HARROWDEN_ID].surveyorOrgId).toBe(ORG_IDS.tarnbrook)
    expect(w.buildings[TIVERNE_ID].surveyorOrgId).toBe(ORG_IDS.tarnbrook)
  })
})
