// The look follow-up to the recording audit (feedback/r2f-look.md): one drawing per project for every role, a new
// project leading the architect home with its setup and next step, a first run on every empty home, the client's
// project cards, and the landing page's product shot and frameworks row read from the real seed and reference data.
import { describe, expect, it } from 'vitest'
import { actor, fresh, must, NOW, TODAY, U, viewer } from '../../test/fixtures'
import { createProject, decideClientLink, type NewProjectInput } from '../actions/projects'
import { signUpState } from '../actions/auth'
import { FERRYMOOR_ID, MERROWGATE_ID, ORG_IDS } from '../../domain/seed/world'
import { KILNWORTH_ID } from '../../sandbox/seed-portfolio'
import { ALLOWED_SOURCES } from '../../domain/reference/names'
import { FRAMEWORKS_CAPTION, reportingFrameworks } from '../../domain/reference/frameworks'
import { architectHome } from './architect'
import { clientHomeView, clientPlaceText } from './sustainability-screens'
import { consultantDashboard } from './home-consultant'
import { projectVisual } from './project-visuals'
import { projectsListView } from './project'
import { landingDashboard } from './landing'
import type { AppData } from '../types'
import { lotPrivateStrings } from '../../domain/privacy/privateStrings'

const corbelInput: NewProjectInput = { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: ORG_IDS.halewick }

function corbel(s0: AppData = fresh(), input: Partial<NewProjectInput> = {}): { state: AppData; id: string } {
  const r = must(createProject(s0, actor(U.priya), { ...corbelInput, ...input }))
  return { state: r.state, id: r.value }
}

function newUser(orgType: string, label: string): { state: AppData; userId: string } {
  const r = signUpState(fresh(), { name: 'Rowan Hale', email: `rowan.${label}@newco.example`, orgName: 'Newco', orgType, salt: 's', passwordHash: 'h', now: NOW })
  expect(r.error).toBeNull()
  return { state: r.state, userId: r.value! }
}

describe('one drawing per project, for every role', () => {
  it('draws Merrowgate Wharf the same for Priya, Isla and Marcus, with a facade', () => {
    const s = fresh()
    const priya = architectHome(s, viewer(U.priya))!.projects.find((p) => p.id === MERROWGATE_ID)!.sketch
    const isla = clientHomeView(s, viewer(U.isla))!.sketches[MERROWGATE_ID]
    const marcus = consultantDashboard(s, viewer(U.marcus))!.rows.find((r) => r.id === MERROWGATE_ID)!.sketch
    expect(isla).toEqual(priya)
    expect(marcus).toEqual(priya)
    expect(projectVisual(s, viewer(U.isla), MERROWGATE_ID)!.sketch).toEqual(priya)
    // An all-steel shortlist shows no facade material, so the office is drawn with its typical glass, and says so.
    expect(priya).toMatchObject({ facades: ['glass'], facadeSource: 'use', frame: 'steel' })
    expect(priya.label).toContain('a typical office facade')
  })

  it('gives every seeded project card a facade on the architect and client homes', () => {
    const s = fresh()
    for (const p of architectHome(s, viewer(U.priya))!.projects) expect(p.sketch.facades.length, p.name).toBeGreaterThan(0)
    for (const sk of Object.values(clientHomeView(s, viewer(U.isla))!.sketches)) expect(sk.facades.length).toBeGreaterThan(0)
  })

  it("gives the client's cards the same swatches as the architect's", () => {
    const s = fresh()
    const priya = architectHome(s, viewer(U.priya))!.projects.find((p) => p.id === MERROWGATE_ID)!
    expect(clientHomeView(s, viewer(U.isla))!.cardExtras[MERROWGATE_ID].materials.map((m) => m.publicId)).toEqual(priya.materials.map((m) => m.publicId))
  })
})

describe('a new project on the architect home', () => {
  it('leads the cards with its setup progress, the client it waits for and its next step', () => {
    const { state, id } = corbel()
    const h = architectHome(state, viewer(U.priya))!
    const list = projectsListView(state, viewer(U.priya)).rows.find((r) => r.id === id)!
    expect(h.projects[0].id).toBe(id)
    expect(h.projects[0].setup).toEqual({ done: list.setup!.done, total: list.setup!.total, nextText: list.setup!.nextText, href: `/app/projects/${id}` })
    expect(h.projects[0].linkStatus).toBe('pending')
    // The seeded projects keep their order after it, with no setup.
    expect(h.projects.slice(1).map((p) => p.setup)).toEqual([null, null, null])
    expect(h.projects.slice(1).map((p) => p.id)).toEqual(architectHome(fresh(), viewer(U.priya))!.projects.map((p) => p.id))
  })

  it('does not count a project its client has not accepted as active, or judge its suggested programme', () => {
    const { state, id } = corbel(fresh(), { startDate: '2026-11-02' })
    const h = architectHome(state, viewer(U.priya))!
    expect(h.stats.activeProjects).toBe(3)
    expect(h.metrics.settingUp).toBe(1)
    expect(h.metrics.notAccepted).toBe(1)
    // Corbel starts first, but its client has not accepted and its dates are only suggested.
    expect(h.metrics.nextStart!.projectName).toBe('Ferrymoor Yard')
    const accepted = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    const a = architectHome(accepted, viewer(U.priya))!
    expect(a.stats.activeProjects).toBe(4)
    expect(a.metrics.notAccepted).toBe(0)
    // Still setting up: the programme is suggested until the architect confirms it.
    expect(a.metrics.settingUp).toBe(1)
    expect(a.metrics.nextStart!.projectName).toBe('Ferrymoor Yard')
  })

  it("splits each card's new materials by their fit against that project", () => {
    const h = architectHome(fresh(), viewer(U.priya))!
    for (const p of h.projects) {
      const by = p.newFitsBy
      expect(by.now + by.in_time + by.tight + by.late, p.name).toBe(p.newFits)
      expect(by.late).toBe(0)
    }
    expect(h.projects.find((p) => p.id === FERRYMOOR_ID)!.newFitsBy.tight).toBeGreaterThan(0)
  })
})

describe('first runs', () => {
  it('shows a new practice what the Marketplace holds, by category; a practice with projects gets none', () => {
    const { state, userId } = newUser('Architect', 'arch')
    const h = architectHome(state, viewer(userId))!
    expect(h.projects).toEqual([])
    expect(h.firstRun!.folders.map((f) => f.typology)).toEqual(['structure', 'envelope', 'finishes'])
    expect(h.firstRun!.folders.reduce((n, f) => n + f.count, 0)).toBe(h.firstRun!.total)
    expect(h.firstRun!.total).toBeGreaterThan(0)
    expect(h.firstRun!.folders[0].href).toBe('/app/marketplace?type=structure')
    for (const f of h.firstRun!.folders) expect(f.thumbs.length).toBeLessThanOrEqual(3)
    expect(architectHome(fresh(), viewer(U.priya))!.firstRun).toBeNull()
  })

  it('keeps the carbon and shortlist figures honest at zero for a first project', () => {
    const { state, userId } = newUser('Architect', 'arch2')
    const r = must(createProject(state, actor(userId), { ...corbelInput, client: { name: 'Reed Holdings' }, consultantOrgId: null }))
    const h = architectHome(r.state, viewer(userId))!
    expect(h.stats).toEqual({ activeProjects: 0, shortlisted: 0, avoidedApprovedT: 0 })
    expect(h.metrics.carbon.liveT).toBe(0)
    expect(h.metrics.settingUp).toBe(1)
    expect(h.metrics.nextStart).toBeNull()
  })
})

describe("the client's project cards", () => {
  it('reads the type and place without a trailing comma', () => {
    expect(clientPlaceText('Office', 'Newham')).toBe('Office, Newham')
    expect(clientPlaceText('Office', '')).toBe('Office')
    expect(clientPlaceText('Office', '  ')).toBe('Office')
  })

  it('says when a project has nothing shortlisted, and when it is still being set up', () => {
    const s = fresh()
    const v = clientHomeView(s, viewer(U.isla))!
    expect(v.cardExtras[MERROWGATE_ID]).toMatchObject({ placeText: 'Office, Newham', status: null })
    expect(v.cardExtras[KILNWORTH_ID].status).toEqual({ kind: 'no_shortlist', label: 'Nothing shortlisted yet' })
    const { state, id } = corbel(s, { localAuthority: '' })
    const accepted = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    const after = clientHomeView(accepted, viewer(U.isla))!.cardExtras[id]
    expect(after.placeText).toBe('Residential')
    expect(after.status).toEqual({ kind: 'setting_up', label: 'Being set up' })
  })
})

describe('the landing page', () => {
  it("shows Priya's home exactly as a fresh sandbox gives it, at today's date", () => {
    const d = landingDashboard(TODAY, NOW)
    const h = architectHome(fresh(), viewer(U.priya))!
    expect(d.greeting).toBe(h.greeting)
    expect(d.dateText).toBe(h.dateText)
    expect(d.stats).toEqual(h.stats)
    expect(d.metrics).toEqual(h.metrics)
    expect(d.projects.map((p) => p.sketch)).toEqual(h.projects.map((p) => p.sketch))
    expect(d.stats.shortlisted).toBe(7)
    expect(d.metrics.byStatus).toMatchObject({ pending: 3, sent: 2, approved: 2 })
    expect(d.metrics.carbon.approvedT.toFixed(1)).toBe('100.8')
    expect(d.metrics.waiting.count).toBe(2)
    expect(d.navProjects).toEqual(['Ferrymoor Yard', 'Merrowgate Wharf', 'Sallow Court'])
    // The greeting follows the hour, as the app's does.
    expect(landingDashboard(TODAY, `${TODAY}T19:30:00.000Z`).greeting).toBe('Good evening, Priya')
  })

  it('carries nothing private about any lot, since the page is public (P3)', () => {
    const s = fresh()
    const json = JSON.stringify(landingDashboard(TODAY, NOW))
    for (const lot of Object.values(s.world.lots)) {
      const item = s.world.items[lot.itemId]
      for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) if (x.length >= 4) expect(json, x).not.toContain(x)
    }
  })

  it('names the frameworks from the reference data, as fictional-world-safe text with the caption', () => {
    const items = reportingFrameworks()
    expect(items.map((x) => x.name)).toEqual(['RIBA Plan of Work', 'London Plan', 'BREEAM', 'LEED', 'WELL', 'UK Net Zero Carbon Buildings Standard'])
    for (const x of items) expect(ALLOWED_SOURCES.some((a) => x.name.startsWith(a)), x.name).toBe(true)
    expect(items[0].line).toBe('Stages 0 to 7, Strategic Definition to Use, set each programme')
    expect(items[1].line).toBe('Reducing waste and supporting the circular economy, and minimising greenhouse gas emissions')
    expect(FRAMEWORKS_CAPTION).toBe('Indicative summaries to check. Not affiliated with or endorsed by these bodies.')
  })
})
