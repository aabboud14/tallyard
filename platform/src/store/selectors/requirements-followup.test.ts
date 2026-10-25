// The follow-up review of the requirements package (16 October 2026): a donor building's local authority is checked
// against its region and stored in its listed spelling, so its requirements before demolition are the right ones,
// and the owner can move it; requirement activity reaches only the owner and the surveyor; the building's
// Requirements tab and sidebar item count what is at risk; a project move adds the new suggestions on saving; a
// stored sandbox from before the tracking gets the seeded statuses; and the Wales and Scotland placeholders do not
// name the nation twice.
import { describe, it, expect } from 'vitest'
import { actor, addTestUser, fresh, must, refused, U, viewer } from '../../test/fixtures'
import * as sel from '.'
import { createBuilding, OWNER_ERRORS, updateBuilding, type NewBuildingInput } from '../actions/owner'
import { createProject, setProjectRequirements, updateProject, type NewProjectInput } from '../actions/projects'
import { buildingRequirementOrgIds, setBuildingRequirementStatus, addBuildingRequirementEvidence } from '../actions/buildingRequirements'
import { buildingRequirements } from '../buildingTracks'
import { buildingMoveNote } from './buildingRequirements'
import { moveSaveNote, requirementsAfterMove } from './requirements'
import { localAuthorityChoices, typedLocalAuthorityNote } from './project'
import { ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { FENNICK_ID } from '../../sandbox/seed-owner-surveyor'
import { withSeededBuildingTracks } from '../../sandbox/seed'
import { isValidLocalAuthority, listedLocalAuthority, normaliseLocalAuthority } from '../../domain/reference/places'
import { DEVOLVED_NATIONAL, donorRequirementsFor, idsAfterMove, requirementsFor } from '../../domain/reference/requirements'
import { FORBIDDEN } from '../../ui/testing'
import type { AppData } from '../types'

const DONOR: NewBuildingInput = { name: 'Wexcombe House', address: '9 Lantry Street, London W1', postcodeDistrict: 'w1', localAuthority: 'Westminster', region: 'Central London', yearBuilt: 1979, storeys: 6, giaM2: 4100, structureType: '', stripOutStart: null, dismantlingStart: null, clearBy: null, surveyorOrgId: null }

const ids = (b: { region: string; localAuthority: string }) => buildingRequirements(b).map((r) => r.id)

describe('the listed spelling of a local authority', () => {
  it('ignores case, spaces and the council words around the name', () => {
    expect(listedLocalAuthority('westminster')).toBe('Westminster')
    expect(listedLocalAuthority('  Westminster   City Council ')).toBe('Westminster')
    expect(listedLocalAuthority('City of Westminster')).toBe('Westminster')
    expect(listedLocalAuthority('Royal Borough of Kensington and Chelsea')).toBe('Kensington and Chelsea')
    expect(listedLocalAuthority('London Borough of Camden')).toBe('Camden')
    expect(listedLocalAuthority('City of London')).toBe('City of London')
    expect(listedLocalAuthority('Bristol City Council')).toBe('Bristol')
    expect(listedLocalAuthority('St Albans')).toBeNull()
    expect(listedLocalAuthority('council')).toBeNull()
    expect(listedLocalAuthority('')).toBeNull()
    expect(normaliseLocalAuthority('  st   Albans ')).toBe('st Albans')
    expect(normaliseLocalAuthority('camden')).toBe('Camden')
  })

  it('is valid only in its own region, however it is typed', () => {
    expect(isValidLocalAuthority('South East', 'Camden')).toBe(false)
    expect(isValidLocalAuthority('South East', 'camden council')).toBe(false)
    expect(isValidLocalAuthority('Central London', 'westminster')).toBe(true)
    expect(isValidLocalAuthority('South East', 'oxford')).toBe(true)
    expect(isValidLocalAuthority('North West', 'Oxford')).toBe(false)
    expect(isValidLocalAuthority('South East', 'St Albans')).toBe(true)
    expect(isValidLocalAuthority('Central London', 'St Albans')).toBe(false)
  })

  it('gives a typed Westminster its written policy, not a placeholder', () => {
    expect(donorRequirementsFor('Central London', 'westminster').at(-1)!.items.map((r) => r.id)).toEqual(['la-westminster-retrofit-first'])
    expect(donorRequirementsFor('Central London', 'Westminster City Council').at(-1)!.title).toBe('Westminster')
    expect(requirementsFor('Central London', 'camden').at(-1)!.items.map((r) => r.id)).toContain('la-camden-cc1')
  })

  it('offers a typed name only once a region outside London is chosen, and says where a listed one is', () => {
    expect(localAuthorityChoices('').allowsOther).toBe(false)
    expect(localAuthorityChoices('Central London').allowsOther).toBe(false)
    expect(localAuthorityChoices('South East').allowsOther).toBe(true)
    expect(typedLocalAuthorityNote('South East', 'camden')).toBe('Camden is listed under Central London. Choose it from the list to set the region.')
    expect(typedLocalAuthorityNote('South East', 'Oxford')).toBeNull()
    expect(typedLocalAuthorityNote('South East', 'St Albans')).toBeNull()
  })
})

describe("a donor building's location", () => {
  it('stores the listed spelling, so the building tracks the written policy', () => {
    const r = must(createBuilding(fresh(), actor(U.tom), { ...DONOR, localAuthority: 'westminster' }))
    const b = r.state.world.buildings[r.value]
    expect(b.localAuthority).toBe('Westminster')
    expect(ids(b)).toEqual(['dem-notice', 'lp-si7-pda', 'lp-si7-diversion', 'la-westminster-retrofit-first'])
  })

  it('refuses a listed authority under another region, so London policy never lands outside London', () => {
    const s0 = fresh()
    refused(s0, createBuilding(s0, actor(U.tom), { ...DONOR, localAuthority: 'Camden', region: 'South East' }), OWNER_ERRORS.localAuthority)
    refused(s0, createBuilding(s0, actor(U.tom), { ...DONOR, localAuthority: 'St Albans', region: 'Central London' }), OWNER_ERRORS.localAuthority)
    must(createBuilding(s0, actor(U.tom), { ...DONOR, localAuthority: 'St Albans', region: 'East of England' }))
  })

  it('lets the owner move it; the requirements follow and the statuses stay with the ones that still apply', () => {
    const s0 = fresh()
    const b0 = s0.world.buildings[TIVERNE_ID]
    expect(buildingMoveNote(b0, { region: 'Central London', localAuthority: 'Camden' })).toBe('1 requirement before demolition no longer applies to Camden, Central London. 1 more is tracked there. Statuses and evidence stay with the ones that still apply.')
    expect(buildingMoveNote(b0, { region: b0.region, localAuthority: b0.localAuthority })).toBeNull()
    expect(buildingMoveNote(b0, { region: 'South East', localAuthority: '' })).toBe('3 requirements before demolition no longer apply to South East. Statuses and evidence stay with the ones that still apply.')
    refused(s0, updateBuilding(s0, actor(U.tom), TIVERNE_ID, { region: 'South East', localAuthority: 'Camden' }), OWNER_ERRORS.localAuthority)
    refused(s0, updateBuilding(s0, actor(U.tom), TIVERNE_ID, { region: 'South East' }), OWNER_ERRORS.localAuthority)
    refused(s0, updateBuilding(s0, actor(U.dana), TIVERNE_ID, { region: 'Central London', localAuthority: 'Camden' }))
    const moved = must(updateBuilding(s0, actor(U.tom), TIVERNE_ID, { region: 'Central London', localAuthority: 'camden' })).state
    const b = moved.world.buildings[TIVERNE_ID]
    expect(b.localAuthority).toBe('Camden')
    const view = sel.buildingRequirementsView(moved, viewer(U.tom), TIVERNE_ID)!
    expect(view.rows.map((r) => [r.id, r.status])).toEqual([
      ['dem-notice', 'not_started'],
      ['lp-si7-pda', 'in_progress'],
      ['lp-si7-diversion', 'at_risk'],
      ['la-camden-cc1', 'not_started'],
    ])
  })
})

describe('requirement activity on a donor building', () => {
  it('reaches the owner and the surveyor, never a deconstruction contractor alone', () => {
    const s0 = fresh()
    expect(s0.world.buildings[TIVERNE_ID].contractorOrgId).toBe(FENNICK_ID)
    expect(buildingRequirementOrgIds(s0.world.buildings[TIVERNE_ID])).toEqual([ORG_IDS.ostlea, ORG_IDS.tarnbrook])
    const lee = addTestUser(s0, { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    let s = must(setBuildingRequirementStatus(lee.state, actor(U.tom), TIVERNE_ID, 'dem-notice', 'in_progress')).state
    s = must(addBuildingRequirementEvidence(s, actor(U.dana), TIVERNE_ID, 'dem-notice', 'Notice drafted.')).state
    const onRequirements = (e: { href: string | null }) => !!e.href && e.href.endsWith('/requirements')
    expect(s.activity.filter(onRequirements).length).toBeGreaterThanOrEqual(5)
    expect(s.activity.filter(onRequirements).every((e) => !e.orgIds.includes(FENNICK_ID))).toBe(true)
    expect(sel.activityFor(s, viewer(lee.userId)).some((r) => /Demolition notice|Pre-demolition audit|beneficial use|Carbon Options/.test(r.text))).toBe(false)
    expect(sel.activityFor(s, viewer(U.tom)).some((r) => r.text.includes('Demolition notice'))).toBe(true)
    expect(sel.activityFor(s, viewer(U.dana)).some((r) => r.text.includes('Demolition notice'))).toBe(true)
  })
})

describe('the at-risk count on a donor building', () => {
  it('badges the Requirements tab and its sidebar item for the owner and the surveyor', () => {
    const s = fresh()
    const tabs = sel.buildingHeader(s, viewer(U.tom), TIVERNE_ID)!.tabs
    expect(tabs.map((t) => [t.id, t.badge])).toEqual([['overview', null], ['inventory', null], ['priorities', null], ['listings', null], ['sharing', null], ['testing', null], ['requirements', 1]])
    const tom = sel.navModel(s, viewer(U.tom))!.sections.find((x) => x.id === 'buildings')!.items.find((i) => i.id === `building-${TIVERNE_ID}`)!
    expect(tom.children.find((c) => c.label === 'Requirements')!.badge).toBe(1)
    const dana = sel.navModel(s, viewer(U.dana))!.sections[1].items.flatMap((g) => g.children).find((i) => i.id === `building-${TIVERNE_ID}`)!
    expect(dana.children.find((c) => c.label === 'Requirements')!.badge).toBe(1)
    const cleared = must(setBuildingRequirementStatus(s, actor(U.tom), TIVERNE_ID, 'lp-si7-diversion', 'in_progress')).state
    expect(sel.buildingHeader(cleared, viewer(U.tom), TIVERNE_ID)!.tabs.find((t) => t.id === 'requirements')!.badge).toBeNull()
  })
})

describe('a project move', () => {
  const base: NewProjectInput = { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null }

  it('adds the suggestions new to the place on saving, so a cancelled review keeps what the dialog said', () => {
    const r = must(createProject(fresh(), actor(U.priya), base))
    const chosen = must(setProjectRequirements(r.state, actor(U.priya), r.value, ['nppf', 'nzcbs', 'la-camden-cc1'])).state
    const p = chosen.world.projects[r.value]
    const to = { region: 'Inner London East', localAuthority: 'Hackney' }
    const move = requirementsAfterMove(p.planningRequirementIds, p, to)
    const moved = must(updateProject(chosen, actor(U.priya), r.value, to)).state
    expect(moved.world.projects[r.value].planningRequirementIds).toEqual(move.preselect)
    expect(move.preselect).toContain('la-hackney-lp33')
    expect(move.preselect).not.toContain('la-camden-cc1')
    expect(moveSaveNote(move)).toBe(`${move.newSuggested === 1 ? 'It is' : 'They are'} added when you save. Saving opens the requirements so you can review them.`)
    expect(moveSaveNote({ ...move, newSuggested: 0 })).toBe('Saving opens the requirements so you can review them.')
  })

  it('leaves a project nobody has reviewed with the suggestions tracked, not chosen', () => {
    const r = must(createProject(fresh(), actor(U.priya), base))
    const moved = must(updateProject(r.state, actor(U.priya), r.value, { region: 'Inner London East', localAuthority: 'Hackney' })).state
    expect(moved.world.projects[r.value]).toMatchObject({ planningRequirementIds: [], requirementsReviewed: false })
    expect(idsAfterMove(['nppf', 'la-camden-cc1'], { region: 'Central London', localAuthority: 'Camden' }, { region: 'South East', localAuthority: 'Reading' }, false)).toEqual(['nppf'])
  })
})

describe('a sandbox stored before donor building requirements were tracked', () => {
  it('gets the seeded statuses on load, and a current one is kept as it is', () => {
    const s = fresh()
    const old = { ...s, buildingTracks: undefined } as unknown as AppData
    const loaded = withSeededBuildingTracks(old)
    expect(loaded.buildingTracks).toEqual(s.buildingTracks)
    expect(sel.ownerDashboard(loaded, viewer(U.tom))!.buildingCards.find((b) => b.id === TIVERNE_ID)!.requirements).toMatchObject({ readyText: '1 of 4 ready', atRisk: 1 })
    expect(withSeededBuildingTracks(s)).toBe(s)
    const edited = { ...s, buildingTracks: {} }
    expect(withSeededBuildingTracks(edited)).toBe(edited)
  })
})

describe('the Wales and Scotland placeholders', () => {
  it('do not name the nation twice in the picker heading', () => {
    for (const r of Object.values(DEVOLVED_NATIONAL)) {
      expect(r.code).toBe('National policy')
      expect(`${r.code}, ${r.title}`).not.toMatch(FORBIDDEN)
    }
    const wales = sel.requirementChoices('Wales', 'Cardiff', []).groups[0].rows[0]
    expect(`${wales.code}, ${wales.title}`).toBe('National policy, Planning policy and building regulations in Wales')
  })
})
