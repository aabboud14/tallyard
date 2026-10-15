// The pure view helpers the project screens and Help use: the programme dialog's lengths and errors, suggested
// stage dates, the requirements summary and preview, the change client choices, the project drawings and the
// methodology notes. fresh() is the seed shifted by one day (today 8 October 2026).
import { describe, expect, it } from 'vitest'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { createProject, decideClientLink, type NewProjectInput } from '../actions/projects'
import { saveToProject } from '../actions/shortlist'
import { MERROWGATE_ID, ORG_IDS, SALLOW_ID } from '../../domain/seed/world'
import { PROGRAMME_ERRORS } from '../../domain/engines/programme'
import { REQUIREMENTS_NOTE } from '../../domain/reference/requirements'
import { FORBIDDEN } from '../../ui/testing'
import type { AppData } from '../types'
import { programmeDraftView, programmeForm, suggestedStageStarts, type ProgrammeDraft } from './programme'
import { projectRequirementsView, requirementChoiceSummary, requirementChoices, requirementsAfterMove, requirementsPreview } from './requirements'
import { timeAgoStart } from './common'
import { changeClientOptions } from './project'
import { projectVisual, projectVisuals } from './project-visuals'
import { goalDefaultRows, methodologyNotes } from './help'

const base: NewProjectInput = { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: ORG_IDS.halewick }

function corbel(s0: AppData = fresh(), input: Partial<NewProjectInput> = {}): { state: AppData; id: string } {
  const r = must(createProject(s0, actor(U.priya), { ...base, ...input }))
  return { state: r.state, id: r.value }
}

function merrowgateDraft(): ProgrammeDraft {
  const f = programmeForm(fresh(), viewer(U.priya), MERROWGATE_ID)!
  return { ribaStage: f.ribaStage, stageStarts: f.stageStarts, siteStart: f.siteStart, practicalCompletion: f.practicalCompletion, startDate: f.startDate }
}

describe('programmeDraftView', () => {
  it("gives each design stage's length and no errors for Merrowgate Wharf's programme", () => {
    const v = programmeDraftView(merrowgateDraft())
    expect(v.valid).toBe(true)
    expect(v.errors).toEqual({})
    expect(v.rows.map((r) => r.label)).toEqual(['Stage 0', 'Stage 1', 'Stage 2', 'Stage 3', 'Stage 4'])
    expect(v.rows[2].name).toBe('Concept Design')
    // Stage 0 of the seed runs 1 September to 30 November 2025 before the one-day shift: 91 days, 13 weeks.
    expect(v.rows[0].lengthText).toBe('13 weeks')
    for (const r of v.rows) expect(r.lengthText).toMatch(/^\d+ (weeks?|days?)$/)
    expect(v.constructionText).toMatch(/^\d+ weeks$/)
  })

  it('puts each error on its field and leaves the length blank while a date is missing', () => {
    const d = merrowgateDraft()
    const bad = programmeDraftView({ ...d, stageStarts: [d.stageStarts[1], d.stageStarts[1], d.stageStarts[2], d.stageStarts[3], d.stageStarts[4]] })
    expect(bad.valid).toBe(false)
    expect(bad.errors.stage1).toBe(PROGRAMME_ERRORS.order)
    const missing = programmeDraftView({ ...d, siteStart: '' })
    expect(missing.errors.siteStart).toBe(PROGRAMME_ERRORS.badDate)
    expect(missing.rows[4].lengthText).toBe('')
    expect(missing.constructionText).toBe('')
    const late = programmeDraftView({ ...d, startDate: d.practicalCompletion.replace(/^(\d{4})/, (y) => String(Number(y) + 1)) })
    expect(late.errors.startDate).toBe(PROGRAMME_ERRORS.materials)
  })

  it('reads short stages in days', () => {
    const d: ProgrammeDraft = { ribaStage: 0, stageStarts: ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'], siteStart: '2026-10-13', practicalCompletion: '2028-04-05', startDate: '2026-10-13' }
    expect(programmeDraftView(d).rows.map((r) => r.lengthText)).toEqual(['1 day', '1 day', '1 day', '1 day', '1 day'])
  })
})

describe('suggestedStageStarts', () => {
  it('suggests the five starts from today, the stage and site start, as the engine does', () => {
    expect(suggestedStageStarts('2026-10-08', 2, '2027-09-06', '2029-02-27')).toEqual({ stageStarts: ['2026-07-16', '2026-08-13', '2026-10-08', '2026-12-30', '2027-04-20'] })
  })

  it('says why when it cannot', () => {
    expect(suggestedStageStarts('2026-10-08', 0, '2026-10-12', '')).toEqual({ error: PROGRAMME_ERRORS.tooSoon })
    expect(suggestedStageStarts('2026-10-08', 2, '', '')).toEqual({ error: PROGRAMME_ERRORS.badDate })
  })
})

describe('requirements summary and preview', () => {
  it('counts what applies, what is suggested and what is ticked here', () => {
    const c = requirementChoices('Central London', 'Camden', [])
    const s = requirementChoiceSummary(c, [...c.suggestedIds, 'la-hackney-lp33'], 'Camden, Central London')
    expect(s.applyCount).toBe(c.groups.reduce((n, g) => n + g.rows.length, 0))
    expect(s.suggestedCount).toBe(10)
    expect(s.selectedCount).toBe(10)
    expect(s.text).toBe(`${s.applyCount} apply to Camden, Central London, 10 suggested. Choose now or later.`)
    expect(s.selectedText).toBe('10 selected')
    expect(requirementChoiceSummary(requirementChoices('South East', '', []), [], '').text).toMatch(/apply to England, \d+ suggested/)
  })

  it('shows the first four and how many more', () => {
    const v = projectRequirementsView(fresh(), viewer(U.priya), MERROWGATE_ID)!
    const p = requirementsPreview(v.selected)
    expect(p.shown).toHaveLength(4)
    expect(p.moreText).toBe(`${v.selected.length - 4} more`)
    expect(requirementsPreview(v.selected.slice(0, 3)).moreText).toBeNull()
    expect(v.note).toBe(REQUIREMENTS_NOTE)
    // After the Indicative marker in the picker, the note does not say the word again.
    expect(v.choices.markerNote).toBe('Summaries as at October 2026. Check the current published documents before you rely on them.')
    expect(REQUIREMENTS_NOTE.toLowerCase()).toBe(`indicative ${v.choices.markerNote.toLowerCase()}`)
  })
})

describe('changeClientOptions', () => {
  it('lets the architect ask another client while pending, and the same one again after a decline', () => {
    const { state, id } = corbel()
    const pending = changeClientOptions(state, viewer(U.priya), id)!
    expect(pending.current).toMatchObject({ name: 'Lantern Quay Developments', status: 'pending' })
    expect(pending.options.map((o) => o.label)).not.toContain('Lantern Quay Developments')
    expect(pending.options.map((o) => o.label)).toContain('Quillon Homes')
    expect(pending.defaults.ask_again).toBeNull()
    const declined = must(decideClientLink(state, actor(U.isla), id, 'declined', 'Not for us.')).state
    const after = changeClientOptions(declined, viewer(U.priya), id)!
    expect(after.options[0].label).toBe('Lantern Quay Developments')
    expect(after.defaults.ask_again).toBe(after.current.orgId)
  })

  it('is for the architect only, and only before the client accepts', () => {
    const { state, id } = corbel()
    expect(changeClientOptions(state, viewer(U.marcus), id)).toBeNull()
    expect(changeClientOptions(state, viewer(U.isla), id)).toBeNull()
    expect(changeClientOptions(fresh(), viewer(U.priya), MERROWGATE_ID)).toBeNull()
  })
})

describe('project drawings', () => {
  it('draws each project from the families on its live shortlist, with up to three swatches', () => {
    const s = fresh()
    const v = projectVisual(s, viewer(U.priya), MERROWGATE_ID)!
    expect(v.sketch.state).toBe('proposed')
    expect(v.sketch.frame).toBe('steel')
    expect(v.materials.length).toBeGreaterThan(0)
    expect(v.materials.length).toBeLessThanOrEqual(3)
    expect(Object.keys(projectVisuals(s, viewer(U.priya)))).toContain(MERROWGATE_ID)
    expect(projectVisual(s, viewer(U.tom), MERROWGATE_ID)).toBeNull()
  })

  it('draws a new project with nothing on it, then with what was saved', () => {
    const { state, id } = corbel()
    expect(projectVisual(state, viewer(U.priya), id)!.materials).toEqual([])
    const saved = must(saveToProject(state, actor(U.priya), 'L-9F4CQQ', id)).state
    expect(projectVisual(saved, viewer(U.priya), id)!.materials.map((m) => m.publicId)).toEqual(['L-9F4CQQ'])
  })
})

describe('methodology notes', () => {
  it('lists every default target with its source requirement, value, basis and status', () => {
    const rows = goalDefaultRows()
    expect(rows.length).toBeGreaterThanOrEqual(6)
    expect(rows[0]).toMatchObject({ goal: 'Reused and recycled content by value', valueText: '20%', status: 'Published' })
    expect(rows.find((r) => r.goal.startsWith('Upfront carbon'))!.valueText).toBe('Office 950 kgCO2e per m2, residential 850 kgCO2e per m2')
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length)
  })

  it('carries the caveats, the statement sections and the references, with no forbidden characters', () => {
    const n = methodologyNotes()
    expect(n.statementSections).toHaveLength(8)
    expect(n.references.length).toBeGreaterThan(10)
    expect(n.references.every((r) => r.status === 'Indicative summary')).toBe(true)
    expect(n.localNote).toBe('Local authority entries name the adopted plan to check; they do not summarise every policy.')
    expect(JSON.stringify(n)).not.toMatch(FORBIDDEN)
  })
})

describe('requirementsAfterMove', () => {
  it('says which chosen requirements stop applying and offers the new local suggestions', () => {
    const p = fresh().world.projects[SALLOW_ID]
    expect([p.region, p.localAuthority]).toEqual(['Central London', 'Camden'])
    const m = requirementsAfterMove(p.planningRequirementIds, p, { region: 'Inner London East', localAuthority: 'Hackney' })
    expect(m).toMatchObject({ moved: true, dropped: 2, newSuggested: 1 })
    expect(m.text).toBe('2 chosen requirements no longer apply to Hackney, Inner London East. 1 more is suggested there.')
    // Camden's two local items go; what still applies stays, and Hackney's local plan is offered.
    expect(m.preselect).toEqual(['nppf', 'breeam-nc', 'lp-si2', 'lp-si7', 'gla-ces', 'la-hackney-lp33'])
    expect(m.text).not.toMatch(FORBIDDEN)
  })

  it('says nothing when the location stays the same', () => {
    const p = fresh().world.projects[SALLOW_ID]
    expect(requirementsAfterMove(p.planningRequirementIds, p, { region: p.region, localAuthority: ` ${p.localAuthority}` })).toEqual({ moved: false, dropped: 0, newSuggested: 0, preselect: p.planningRequirementIds, text: null })
  })
})

describe('timeAgoStart', () => {
  it('starts a line with a capital', () => {
    expect(timeAgoStart('2026-10-08T10:00:00Z', '2026-10-08T10:00:30Z')).toBe('Just now')
    expect(timeAgoStart('2026-10-08T09:55:00Z', '2026-10-08T10:00:00Z')).toBe('5 minutes ago')
    expect(timeAgoStart('2026-10-07T09:00:00Z', '2026-10-08T10:00:00Z')).toBe('Yesterday')
  })
})
