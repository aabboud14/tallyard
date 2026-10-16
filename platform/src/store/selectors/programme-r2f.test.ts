// Follow-up to the recording audit of 16 October 2026 (notes 14, 17 and 19): the programme card's words for each
// viewer, who may set the programme on a New project with no architect, stages outside the axis, month labels in
// place of quarters, and the setup checklist leading with the next step while the card carries the programme's own.
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U, viewer } from '../../test/fixtures'
import * as sel from '.'
import { createProject, decideClientLink, setProjectProgramme, type NewProjectInput } from '../actions/projects'
import { appointProjectArchitect, createOwnerProject, type OwnerProjectInput } from '../actions/owner'
import { canEditProgramme, ERRORS } from '../access'
import { MERROWGATE_ID, ORG_IDS } from '../../domain/seed/world'
import type { AppData } from '../types'

const base: NewProjectInput = { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: ORG_IDS.halewick }
const WEXCOMBE: OwnerProjectInput = { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: null }

function corbel(input: Partial<NewProjectInput> = {}): { state: AppData; id: string } {
  const r = must(createProject(fresh(), actor(U.priya), { ...base, ...input }))
  return { state: r.state, id: r.value }
}

function keep(s: AppData, who: string, id: string): AppData {
  const p = s.world.projects[id]
  return must(setProjectProgramme(s, actor(who), id, { ribaStage: p.ribaStage, programme: p.programme, startDate: p.startDate })).state
}

describe('the programme card for each viewer', () => {
  it('offers the architect of a new project Keep these dates, and says the dates are suggested until then', () => {
    const { state, id } = corbel()
    const v = sel.programmeView(state, viewer(U.priya), id)!
    expect(v).toMatchObject({ source: 'suggested', canEdit: true, canKeep: true })
    expect(v.suggestedText).toBe('Worked out from your site start and typical stage lengths. Keep them or edit them to match your plan.')
    expect(v.footerText).toBe('Stages from the RIBA Plan of Work 2020. Suggested dates until you keep or edit them. Indicative.')
    expect(v.emptyText).toBe('No materials on the programme yet. Shortlist materials and each one appears here against your programme.')
    const kept = keep(state, U.priya, id)
    expect(sel.programmeView(kept, viewer(U.priya), id)).toMatchObject({ source: 'set', canKeep: false, footerText: "Stages from the RIBA Plan of Work 2020. Dates are the architect's plan. Indicative." })
  })

  it('tells the client the architect confirms the dates, and gives them nothing to edit', () => {
    const { state, id } = corbel()
    const s = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    const v = sel.programmeView(s, viewer(U.isla), id)!
    expect(v).toMatchObject({ canEdit: false, canKeep: false })
    expect(v.suggestedText).toBe('Worked out from the site start and typical stage lengths, until the architect confirms them.')
    expect(v.footerText).toBe('Stages from the RIBA Plan of Work 2020. Suggested dates until the architect confirms them. Indicative.')
    expect(v.emptyText).toBe('Materials appear here as the architect shortlists them.')
    expect(v.suggestedText + v.footerText).not.toContain('Edit to match')
    expect(sel.programmeForm(s, viewer(U.isla), id)).toBeNull()
    refused(s, setProjectProgramme(s, actor(U.isla), id, { ribaStage: 2, programme: s.world.projects[id].programme, startDate: s.world.projects[id].startDate }), ERRORS.role)
  })

  it("lets the owner set the programme of their own New project until an architect is appointed, and names no architect", () => {
    const r = must(createOwnerProject(fresh(), actor(U.tom), WEXCOMBE))
    const id = r.value
    expect(canEditProgramme(r.state, U.tom, id)).toBe(true)
    const v = sel.programmeView(r.state, viewer(U.tom), id)!
    expect(v).toMatchObject({ source: 'suggested', canEdit: true, canKeep: true })
    expect(v.footerText).toBe('Stages from the RIBA Plan of Work 2020. Suggested dates until you keep or edit them. Indicative.')
    expect(v.emptyText).toBe('Materials appear here once an architect is appointed and shortlists them.')
    expect(v.footerText + v.emptyText + v.suggestedText).not.toContain("architect's plan")
    expect(sel.programmeForm(r.state, viewer(U.tom), id)).not.toBeNull()
    // Tom keeps the dates: they become his plan until an architect is appointed.
    const kept = keep(r.state, U.tom, id)
    expect(kept.world.projects[id].programme.source).toBe('set')
    expect(sel.programmeView(kept, viewer(U.tom), id)!.footerText).toBe('Stages from the RIBA Plan of Work 2020. Dates are your plan until an architect is appointed. Indicative.')
    // Once Studio Oriel is appointed, the programme is theirs.
    const a = must(appointProjectArchitect(kept, actor(U.tom), id, ORG_IDS.oriel)).state
    expect(canEditProgramme(a, U.tom, id)).toBe(false)
    expect(canEditProgramme(a, U.priya, id)).toBe(true)
    expect(sel.programmeView(a, viewer(U.tom), id)).toMatchObject({ canEdit: false, canKeep: false, footerText: "Stages from the RIBA Plan of Work 2020. Dates are the architect's plan. Indicative." })
    expect(sel.programmeForm(a, viewer(U.tom), id)).toBeNull()
    refused(a, setProjectProgramme(a, actor(U.tom), id, { ribaStage: 2, programme: a.world.projects[id].programme, startDate: a.world.projects[id].startDate }), ERRORS.role)
  })

  it('never lets a consultant or an outsider set the programme', () => {
    const s = fresh()
    expect(canEditProgramme(s, U.marcus, MERROWGATE_ID)).toBe(false)
    expect(canEditProgramme(s, U.isla, MERROWGATE_ID)).toBe(false)
    expect(canEditProgramme(s, U.tom, MERROWGATE_ID)).toBe(false)
    expect(canEditProgramme(s, U.priya, MERROWGATE_ID)).toBe(true)
  })
})

describe('stage bands on the axis', () => {
  it('leaves out the stages before this month on From today, and runs Handover off the right edge', () => {
    const v = sel.programmeView(fresh(), viewer(U.priya), MERROWGATE_ID, 'ahead')!
    expect(v.stages.filter((b) => !b.visible).map((b) => b.stage)).toEqual([0, 1, 7])
    expect(v.stages.find((b) => b.visible)!.stage).toBe(2)
    expect(v.stages.filter((b) => b.open).map((b) => b.stage)).toEqual([6, 7])
    for (const b of v.stages) expect(b.hoverText).toMatch(new RegExp(`^Stage ${b.stage}, ${b.name}, `))
  })
})

describe('month labels on the programme', () => {
  it('labels a short project in months, never quarters, in both ranges', () => {
    const { state, id } = corbel({ startDate: '2027-03-01', practicalCompletion: '2027-09-01' })
    expect(state.world.projects[id].programme.practicalCompletion).toBe('2027-09-01')
    for (const range of ['whole', 'ahead'] as const) {
      const v = sel.programmeView(state, viewer(U.priya), id, range)!
      const labels = v.axis.ticks.filter((t) => t.label).map((t) => t.label!)
      expect(labels.length, range).toBeGreaterThan(2)
      for (const l of labels) expect(l, range).not.toMatch(/Q[1-4]/)
      expect(labels[0], range).toMatch(/^[A-Z][a-z]{2} \d{4}$/)
      expect(v.axis.ticks.every((t) => t.tier >= 0 && t.tier <= 3)).toBe(true)
    }
  })
})

describe('the setup checklist beside the programme card', () => {
  it('leads with the next step, as the card carries Keep these dates and Edit programme', () => {
    const { state, id } = corbel()
    const setup = sel.projectSetup(state, viewer(U.priya), id)!
    expect(setup.steps[0]).toMatchObject({ id: 'programme', state: 'current', action: null, secondary: null })
    expect(setup.focusId).toBe('requirements')
    expect(setup.nextText).toBe('Next: check the programme')
    // A declined client has its own banner, so the checklist still leads with what the architect can do here.
    const declined = must(decideClientLink(state, actor(U.isla), id, 'declined', '')).state
    expect(sel.projectSetup(declined, viewer(U.priya), id)!.focusId).toBe('requirements')
  })
})
