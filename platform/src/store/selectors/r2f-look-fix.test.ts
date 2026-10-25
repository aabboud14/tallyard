// The second pass on the look follow-up (feedback/r2f-look.md, "Review fixes"): a considered first run on the
// surveyor, owner and consultant homes, what is new for each project on the architect home, no 0.0 of 0.0 carbon
// bar, the client's card and overview read from what the client can see, and the frameworks row's lines.
import { describe, expect, it } from 'vitest'
import { actor, fresh, must, NOW, U, viewer } from '../../test/fixtures'
import { createProject, decideClientLink, type NewProjectInput } from '../actions/projects'
import { saveToProject, sendToClient } from '../actions/shortlist'
import { signUpState } from '../actions/auth'
import { FERRYMOOR_ID, MERROWGATE_ID, ORG_IDS, SALLOW_ID } from '../../domain/seed/world'
import { NATIONAL_REQUIREMENTS } from '../../domain/reference/requirements'
import { reportingFrameworks, whatItCovers } from '../../domain/reference/frameworks'
import { marketplaceListings } from '../lots'
import { architectHome } from './architect'
import { clientHomeView } from './sustainability-screens'
import { consultantDashboard } from './home-consultant'
import { ownerDashboard } from './home-owner'
import { surveyorDashboard } from './home-surveyor'
import { nextStepsEmptyFor, projectOverview } from './project'
import { newForProjectsFeed } from './marketplace'
import type { AppData } from '../types'

const corbelInput: NewProjectInput = { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null }

function newUser(orgType: string, label: string): { state: AppData; userId: string } {
  const r = signUpState(fresh(), { name: 'Rowan Hale', email: `rowan.${label}@newco.example`, orgName: 'Newco', orgType, salt: 's', passwordHash: 'h', now: NOW })
  expect(r.error).toBeNull()
  return { state: r.state, userId: r.value! }
}

/** Corbel Yard, accepted by Isla, with one material Priya has shortlisted but not sent. */
function corbelWithPending(): { state: AppData; id: string; publicId: string } {
  const created = must(createProject(fresh(), actor(U.priya), corbelInput))
  const accepted = must(decideClientLink(created.state, actor(U.isla), created.value, 'accepted', '')).state
  const publicId = marketplaceListings(accepted)[0].publicId
  const saved = must(saveToProject(accepted, actor(U.priya), publicId, created.value))
  return { state: saved.state, id: created.value, publicId }
}

describe('first runs on every role', () => {
  it('gives a new surveying firm a first run and never says every survey is submitted when there are none', () => {
    const { state, userId } = newUser('Surveying or deconstruction firm', 'surv')
    const d = surveyorDashboard(state, viewer(userId))!
    expect(d.firstRun).toBe(true)
    expect(d.metrics.openSubText).toBe('No surveys yet')
    const dana = surveyorDashboard(fresh(), viewer(U.dana))!
    expect(dana.firstRun).toBe(false)
    expect(dana.metrics.openSubText).not.toBe('No surveys yet')
  })

  it('gives a new owner and a new consultancy a first run, and the sample accounts their figures', () => {
    const owner = newUser('Asset owner', 'own')
    expect(ownerDashboard(owner.state, viewer(owner.userId))!.firstRun).toBe(true)
    expect(ownerDashboard(fresh(), viewer(U.tom))!.firstRun).toBe(false)
    const consultant = newUser('Sustainability consultant', 'cons')
    expect(consultantDashboard(consultant.state, viewer(consultant.userId))!.firstRun).toBe(true)
    expect(consultantDashboard(fresh(), viewer(U.marcus))!.firstRun).toBe(false)
  })
})

describe('the architect home', () => {
  it("says how many of each project's new materials are like its shortlist, so the cards differ", () => {
    const s = fresh()
    const h = architectHome(s, viewer(U.priya))!
    const feed = newForProjectsFeed(s, viewer(U.priya), null, Number.POSITIVE_INFINITY)
    expect(feed.length).toBeGreaterThan(0)
    for (const p of h.projects) expect(p.newLikeShortlist, p.name).toBeLessThanOrEqual(p.newFits)
    // A project with nothing shortlisted has nothing to be like.
    const created = must(createProject(s, actor(U.priya), corbelInput))
    expect(architectHome(created.state, viewer(U.priya))!.projects.find((p) => p.id === created.value)!.newLikeShortlist).toBe(0)
    const by = (id: string) => h.projects.find((p) => p.id === id)!.newLikeShortlist
    // Merrowgate's shortlist is steel, and most new listings are steel; Sallow Court's is brick and stone.
    expect(by(MERROWGATE_ID)).toBeGreaterThan(by(SALLOW_ID))
    expect(by(MERROWGATE_ID)).not.toBe(by(FERRYMOOR_ID))
  })

  it('names a project with nothing shortlisted instead of drawing a 0.0 of 0.0 carbon bar', () => {
    const created = must(createProject(fresh(), actor(U.priya), corbelInput))
    const h = architectHome(created.state, viewer(U.priya))!
    expect(h.carbonByProject.map((c) => c.id)).not.toContain(created.value)
    expect(h.carbonByProject.every((c) => c.liveT > 0)).toBe(true)
    expect(h.carbonNotYet).toEqual([{ id: created.value, name: 'Corbel Yard' }])
    expect(architectHome(fresh(), viewer(U.priya))!.carbonNotYet).toEqual([])
  })
})

describe('what the client sees of a project the architect is shortlisting', () => {
  it("bases the card's status and swatches on materials sent to the client, never on the architect's pending ones", () => {
    const { state, id } = corbelWithPending()
    const extra = clientHomeView(state, viewer(U.isla))!.cardExtras[id]
    expect(extra.status).toEqual({ kind: 'shortlisting', label: 'Shortlisting under way' })
    expect(extra.materials).toEqual([])
    // The drawing is still the one every role sees.
    expect(clientHomeView(state, viewer(U.isla))!.sketches[id]).toEqual(architectHome(state, viewer(U.priya))!.projects.find((p) => p.id === id)!.sketch)
    const sent = must(sendToClient(state, actor(U.priya), id, null, '')).state
    const after = clientHomeView(sent, viewer(U.isla))!.cardExtras[id]
    expect(after.status).toBeNull()
    expect(after.materials).toHaveLength(1)
  })

  it("tells the client who acts next while nothing has been sent, even with rows pending with the architect", () => {
    const { state, id } = corbelWithPending()
    const o = projectOverview(state, viewer(U.isla), id)!
    expect(o.nextSteps).toEqual([])
    expect(o.nextStepsEmpty).toEqual({ kind: 'client_waiting', architectName: 'Studio Oriel', hasConsultant: false, teamHref: `/app/projects/${id}/team` })
    // With a consultant on the team the line asks for nothing more.
    const withConsultant = must(createProject(fresh(), actor(U.priya), { ...corbelInput, consultantOrgId: ORG_IDS.halewick }))
    const linked = must(decideClientLink(withConsultant.state, actor(U.isla), withConsultant.value, 'accepted', '')).state
    expect(projectOverview(linked, viewer(U.isla), withConsultant.value)!.nextStepsEmpty).toMatchObject({ kind: 'client_waiting', hasConsultant: true })
  })

  it('decides the empty Next steps line from the rows the client can see', () => {
    const header = { architectText: 'Studio Oriel', consultantName: 'Halewick Sustainability' }
    expect(nextStepsEmptyFor('client', [], header, false, '/t')).toEqual({ kind: 'client_waiting', architectName: 'Studio Oriel', hasConsultant: true, teamHref: '/t' })
    expect(nextStepsEmptyFor('client', [{ status: 'pending' }], header, false, '/t').kind).toBe('client_waiting')
    expect(nextStepsEmptyFor('client', [{ status: 'declined' }], header, false, '/t').kind).toBe('up_to_date')
    expect(nextStepsEmptyFor('architect', [], header, true, '/t').kind).toBe('link_pending')
    expect(nextStepsEmptyFor('architect', [], header, false, '/t').kind).toBe('up_to_date')
  })
})

describe('the frameworks row', () => {
  it('says what each scheme covers from its summary, not its name again', () => {
    const items = reportingFrameworks()
    const line = (id: string) => items.find((x) => x.id === id)!.line
    expect(line('breeam-nc')).toBe('Mat 01 covers life cycle assessment, Mat 05 rewards reusing materials and Wst 01 diverting construction waste from landfill')
    expect(line('leed-v5')).toMatch(/^Materials and Resources credits cover/)
    expect(line('well-v2')).toBe('Materials concept restricts hazardous substances, which matters when reusing older materials')
    const nzcbs = NATIONAL_REQUIREMENTS.find((r) => r.id === 'nzcbs')!
    expect(line('nzcbs')).toBe(nzcbs.summary.replace(/\.$/, ''))
    for (const x of items) expect(x.line.toLowerCase().startsWith(x.name.toLowerCase()), x.id).toBe(false)
    expect(whatItCovers('One. Two things.')).toBe('Two things')
    expect(whatItCovers('Its scope is wide.')).toBe('Scope is wide')
  })
})
