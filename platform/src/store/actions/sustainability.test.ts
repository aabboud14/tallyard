import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U, NOW, TODAY } from '../../test/fixtures'
import { MERROWGATE_ID, ORG_IDS } from '../../domain/seed/world'
import { addDays } from '../../domain/dates'
import type { ActionResult, AppData } from '../types'
import { ERRORS } from '../access'
import { GOAL_INPUT_ERRORS } from '../../domain/engines/goals'
import { sustainabilityOf } from '../sustainabilityRecord'
import * as sel from '../selectors'
import { decideItem } from './shortlist'
import {
  addRequirementEvidence,
  clearGoalActual,
  editStatementSection,
  removeRequirementEvidence,
  resetGoalTarget,
  resetStatementSection,
  reviewStatement,
  sendStatementForReview,
  setCreditItem,
  setCreditNote,
  setCreditStatus,
  setCreditTargeted,
  setGoalActual,
  setGoalTarget,
  setRequirementStatus,
  SUSTAINABILITY_ERRORS as E,
} from './sustainability'

const M = MERROWGATE_ID
const newest = (s: AppData) => s.activity[0]
const notesFor = (before: AppData, after: AppData) => after.notifications.slice(0, after.notifications.length - before.notifications.length)

/** Every action, called as one person, with arguments that would succeed for the right side. */
const ACTIONS: { name: string; sides: ('client' | 'consultant')[]; run: (s: AppData, userId: string) => ActionResult<unknown> }[] = [
  { name: 'setGoalTarget', sides: ['consultant'], run: (s, u) => setGoalTarget(s, actor(u), M, 'content_by_value', 0.3, '') },
  { name: 'resetGoalTarget', sides: ['consultant'], run: (s, u) => resetGoalTarget(s, actor(u), M, 'content_by_value') },
  { name: 'setGoalActual', sides: ['consultant'], run: (s, u) => setGoalActual(s, actor(u), M, 'upfront_carbon', 800, TODAY, 'Stage 3 assessment') },
  { name: 'clearGoalActual', sides: ['consultant'], run: (s, u) => clearGoalActual(s, actor(u), M, 'upfront_carbon') },
  { name: 'setRequirementStatus', sides: ['client', 'consultant'], run: (s, u) => setRequirementStatus(s, actor(u), M, 'gla-ces', 'at_risk') },
  { name: 'addRequirementEvidence', sides: ['client', 'consultant'], run: (s, u) => addRequirementEvidence(s, actor(u), M, 'gla-ces', { text: 'A note.', output: null }) },
  { name: 'setCreditTargeted', sides: ['consultant'], run: (s, u) => setCreditTargeted(s, actor(u), M, 'breeam-wst06', true) },
  { name: 'setCreditStatus', sides: ['consultant'], run: (s, u) => setCreditStatus(s, actor(u), M, 'breeam-mat03', 'in_progress') },
  { name: 'setCreditNote', sides: ['consultant'], run: (s, u) => setCreditNote(s, actor(u), M, 'breeam-mat03', 'Note.') },
  { name: 'setCreditItem', sides: ['consultant'], run: (s, u) => setCreditItem(s, actor(u), M, 'breeam-mat05', 'L-NHZ32R', false) },
  { name: 'editStatementSection', sides: ['consultant'], run: (s, u) => editStatementSection(s, actor(u), M, 'carbon', 'Our words.', 'basis') },
  { name: 'resetStatementSection', sides: ['consultant'], run: (s, u) => resetStatementSection(s, actor(u), M, 'approach') },
  { name: 'sendStatementForReview', sides: ['consultant'], run: (s, u) => sendStatementForReview(s, actor(u), M) },
  { name: 'reviewStatement', sides: ['client'], run: (s, u) => reviewStatement(s, actor(u), M, 'Fine.') },
]

describe('who may change the sustainability records', () => {
  for (const a of ACTIONS) {
    it(`${a.name} is refused for an owner, a surveyor and the wrong side`, () => {
      const s = fresh()
      for (const u of [U.tom, U.dana, U.priya]) refused(s, a.run(s, u), ERRORS.role)
      if (!a.sides.includes('client')) refused(s, a.run(s, U.isla), ERRORS.role)
      if (!a.sides.includes('consultant')) refused(s, a.run(s, U.marcus), ERRORS.role)
      const empty = { ...s, world: { ...s.world, projects: {} } }
      refused(empty, a.run(empty, a.sides.includes('consultant') ? U.marcus : U.isla), ERRORS.noProject)
    })
  }

  it('the right side succeeds with each action', () => {
    for (const a of ACTIONS) {
      if (a.name === 'removeRequirementEvidence') continue
      const s = fresh()
      const who = a.sides.includes('consultant') ? U.marcus : U.isla
      expect(a.run(s, who).error, a.name).toBeNull()
    }
  })

  it('an unknown project fails with noProject', () => {
    const s = fresh()
    refused(s, setGoalTarget(s, actor(U.marcus), 'prj_nothere', 'content_by_value', 0.3, ''), ERRORS.noProject)
  })
})

describe('goals and targets', () => {
  it('Marcus sets a target: activity for the three Merrowgate organisations, a notification for Lantern only', () => {
    const s = fresh()
    const after = must(setGoalTarget(s, actor(U.marcus), M, 'content_by_value', 0.3, 'Raised with the client.')).state
    expect(sustainabilityOf(after, M).goals.content_by_value).toMatchObject({ value: 0.3, note: 'Raised with the client.', setByUserId: U.marcus, setAt: NOW })
    expect(newest(after)).toMatchObject({ text: 'set the target for reused and recycled content by value to 30%', href: `/app/projects/${M}/targets`, projectId: M })
    expect([...newest(after).orgIds].sort()).toEqual([ORG_IDS.oriel, ORG_IDS.lantern, ORG_IDS.halewick].sort())
    const notes = notesFor(s, after)
    expect(notes.map((n) => [n.orgId, n.kind, n.title])).toEqual([[ORG_IDS.lantern, 'sustainability', 'New target on Merrowgate Wharf']])
    expect(notes[0].body).toBe('Marcus Lindqvist, Halewick Sustainability: Reused and recycled content by value 30%.')
    expect(notes[0].href).toBe(`/app/projects/${M}/sustainability`)
  })

  it('refuses a value that does not fit the goal, and the same target twice changes nothing', () => {
    const s = fresh()
    refused(s, setGoalTarget(s, actor(U.marcus), M, 'content_by_value', 1.2, ''), GOAL_INPUT_ERRORS.ratio)
    refused(s, setGoalTarget(s, actor(U.marcus), M, 'breeam', 'Gold', ''), GOAL_INPUT_ERRORS.rating)
    refused(s, setGoalTarget(s, actor(U.marcus), M, 'nothing' as never, 1, ''), E.noGoal)
    expect(setGoalTarget(s, actor(U.marcus), M, 'content_by_value', 0.25, 'Set at inception with the client.').state).toBe(s)
  })

  it('not targeted, then reset to the default', () => {
    let s = must(setGoalTarget(fresh(), actor(U.marcus), M, 'well', null, 'Dropped.')).state
    expect(newest(s).text).toBe('marked WELL certification as not targeted')
    expect(sustainabilityOf(s, M).goals.well!.value).toBeNull()
    s = must(resetGoalTarget(s, actor(U.marcus), M, 'well')).state
    expect(sustainabilityOf(s, M).goals.well).toBeUndefined()
    expect(newest(s).text).toBe('reset the target for WELL certification to the default')
    expect(resetGoalTarget(s, actor(U.marcus), M, 'well').state).toBe(s)
  })

  it('results: only for goals Tallyard cannot measure, dated on or before today, with a source', () => {
    const s = fresh()
    refused(s, setGoalActual(s, actor(U.marcus), M, 'content_by_value', 0.3, TODAY, 'Bill'), E.measured)
    refused(s, setGoalActual(s, actor(U.marcus), M, 'upfront_carbon', 800, addDays(TODAY, 1), 'Stage 3'), E.badDate)
    refused(s, setGoalActual(s, actor(U.marcus), M, 'upfront_carbon', 800, '2026-13-01', 'Stage 3'), E.badDate)
    refused(s, setGoalActual(s, actor(U.marcus), M, 'upfront_carbon', 800, TODAY, '  '), E.noSource)
    const after = must(setGoalActual(s, actor(U.marcus), M, 'upfront_carbon', 800, TODAY, 'Stage 3 assessment')).state
    expect(sustainabilityOf(after, M).actuals.upfront_carbon).toMatchObject({ value: 800, asOf: TODAY, source: 'Stage 3 assessment' })
    expect(newest(after).text).toBe('recorded upfront carbon, modules A1 to A5: 800 kgCO2e per m2')
    expect(notesFor(s, after)).toEqual([])
    const cleared = must(clearGoalActual(after, actor(U.marcus), M, 'upfront_carbon')).state
    expect(sustainabilityOf(cleared, M).actuals.upfront_carbon).toBeUndefined()
  })
})

describe('requirements', () => {
  it('Isla marks a requirement at risk: Halewick hears of it, not Lantern; Marcus marking it reaches Lantern', () => {
    const s = fresh()
    const byIsla = must(setRequirementStatus(s, actor(U.isla), M, 'gla-ces', 'at_risk')).state
    expect(notesFor(s, byIsla).map((n) => [n.orgId, n.kind])).toEqual([[ORG_IDS.halewick, 'sustainability']])
    expect(notesFor(s, byIsla)[0].title).toBe('Circular Economy Statements guidance is at risk on Merrowgate Wharf')
    expect(newest(byIsla)).toMatchObject({ text: 'marked Circular Economy Statements guidance as at risk', href: `/app/projects/${M}/requirements` })
    const byMarcus = must(setRequirementStatus(s, actor(U.marcus), M, 'gla-ces', 'evidence_ready')).state
    expect(notesFor(s, byMarcus).map((n) => n.orgId)).toEqual([ORG_IDS.lantern])
    expect(setRequirementStatus(byIsla, actor(U.isla), M, 'gla-ces', 'at_risk').state).toBe(byIsla)
    const quiet = must(setRequirementStatus(s, actor(U.isla), M, 'gla-ces', 'in_progress')).state
    expect(notesFor(s, quiet)).toEqual([])
  })

  it('refuses a requirement that does not apply and a status that does not exist', () => {
    const s = fresh()
    refused(s, setRequirementStatus(s, actor(U.isla), M, 'la-camden-cc1', 'at_risk'), E.noRequirement)
    refused(s, setRequirementStatus(s, actor(U.isla), M, 'gla-ces', 'done' as never), E.badStatus)
  })

  it('evidence: a note or an output, the first one starts the requirement, only its author removes it', () => {
    const s = fresh()
    refused(s, addRequirementEvidence(s, actor(U.isla), M, 'gla-ces', { text: '  ', output: null }), E.emptyEvidence)
    const added = must(addRequirementEvidence(s, actor(U.isla), M, 'gla-ces', { text: 'Board approved the approach.', output: 'specification' }))
    const t = sustainabilityOf(added.state, M).requirements['gla-ces']
    expect(t.status).toBe('in_progress')
    expect(t.evidence).toEqual([{ id: added.value, text: 'Board approved the approach.', output: 'specification', addedByUserId: U.isla, addedBy: 'Isla Brennan', addedAt: NOW }])
    expect(newest(added.state).text).toBe('added evidence to Circular Economy Statements guidance')
    refused(added.state, removeRequirementEvidence(added.state, actor(U.marcus), M, 'gla-ces', added.value), E.notAuthor)
    refused(added.state, removeRequirementEvidence(added.state, actor(U.isla), M, 'gla-ces', 'evd_nothere'), E.noEvidence)
    const removed = must(removeRequirementEvidence(added.state, actor(U.isla), M, 'gla-ces', added.value)).state
    expect(sustainabilityOf(removed, M).requirements['gla-ces'].evidence).toEqual([])
    // An at-risk requirement keeps its status when evidence is added.
    const atRisk = must(addRequirementEvidence(s, actor(U.marcus), M, 'breeam-nc', { text: '', output: 'certification' })).state
    expect(sustainabilityOf(atRisk, M).requirements['breeam-nc'].status).toBe('at_risk')
  })
})

describe('certification credits', () => {
  it('a status needs the credit targeted, and not applicable is not offered', () => {
    const s = fresh()
    refused(s, setCreditStatus(s, actor(U.marcus), M, 'breeam-wst06', 'in_progress'), E.notTargeted)
    refused(s, setCreditStatus(s, actor(U.marcus), M, 'breeam-mat03', 'not_applicable'), E.badStatus)
    refused(s, setCreditStatus(s, actor(U.marcus), M, 'nothing', 'in_progress'), E.noCredit)
    // LEED is not pursued on Merrowgate, so its credits start untargeted.
    refused(s, setCreditStatus(s, actor(U.marcus), M, 'leed-mr-reuse', 'in_progress'), E.notTargeted)
  })

  it('targeting creates the record with its defaults, logs it, and untargeting keeps the status', () => {
    const s = fresh()
    const on = must(setCreditTargeted(s, actor(U.marcus), M, 'breeam-wst06', true)).state
    expect(sustainabilityOf(on, M).credits['breeam-wst06']).toMatchObject({ targeted: true, status: 'not_started', items: {} })
    expect(newest(on).text).toBe('now targets BREEAM Wst 06')
    const st = must(setCreditStatus(on, actor(U.marcus), M, 'breeam-wst06', 'in_progress')).state
    const off = must(setCreditTargeted(st, actor(U.marcus), M, 'breeam-wst06', false)).state
    expect(sustainabilityOf(off, M).credits['breeam-wst06']).toMatchObject({ targeted: false, status: 'in_progress' })
    expect(newest(off).text).toBe('no longer targets BREEAM Wst 06')
  })

  it('at risk reaches the client', () => {
    const s = fresh()
    const after = must(setCreditStatus(s, actor(U.marcus), M, 'breeam-mat03', 'at_risk')).state
    expect(notesFor(s, after).map((n) => [n.orgId, n.title])).toEqual([[ORG_IDS.lantern, 'BREEAM Mat 03 is at risk on Merrowgate Wharf']])
    expect(newest(after).text).toBe('marked BREEAM Mat 03 as at risk')
  })

  it('materials: only the project\'s own; back to the default drops the override', () => {
    const s = fresh()
    refused(s, setCreditItem(s, actor(U.marcus), M, 'breeam-mat05', 'L-9F4CQQ', true), E.noMaterial)
    refused(s, setCreditItem(s, actor(U.marcus), M, 'ce-content', 'L-NHZ32R', true), E.noMaterial)
    const out = must(setCreditItem(s, actor(U.marcus), M, 'breeam-mat05', 'L-NHZ32R', false)).state
    expect(sustainabilityOf(out, M).credits['breeam-mat05'].items).toEqual({ 'L-NHZ32R': false })
    const back = must(setCreditItem(out, actor(U.marcus), M, 'breeam-mat05', 'L-NHZ32R', true)).state
    expect(sustainabilityOf(back, M).credits['breeam-mat05'].items).toEqual({})
    const x07 = must(setCreditItem(s, actor(U.marcus), M, 'well-x01', 'L-R8Q33F', true)).state
    expect(sustainabilityOf(x07, M).credits['well-x01'].items).toEqual({ 'L-R8Q33F': true })
    expect(setCreditItem(s, actor(U.marcus), M, 'well-x01', 'L-R8Q33F', false).state).toBe(s)
  })

  it('a note, trimmed', () => {
    const after = must(setCreditNote(fresh(), actor(U.marcus), M, 'breeam-mat03', '  Ask the supplier.  ')).state
    expect(sustainabilityOf(after, M).credits['breeam-mat03'].note).toBe('Ask the supplier.')
  })
})

describe('the circular economy statement', () => {
  it('review: the client reviews what was sent, the consultant hears of it, and the to-do clears', () => {
    const s = fresh()
    expect(sel.clientDashboard(s, { userId: U.isla, now: NOW })!.todos.some((t) => t.kind === 'review_statement')).toBe(true)
    const reviewed = must(reviewStatement(s, actor(U.isla), M, '  Thanks, happy with this.  ')).state
    expect(sustainabilityOf(reviewed, M).statement).toMatchObject({ status: 'reviewed', reviewedAt: NOW, reviewedByUserId: U.isla, reviewNote: 'Thanks, happy with this.' })
    expect(notesFor(s, reviewed).map((n) => [n.orgId, n.title, n.body])).toEqual([[ORG_IDS.halewick, 'Lantern Quay Developments reviewed the circular economy statement', 'Thanks, happy with this.']])
    expect(newest(reviewed).text).toBe('reviewed the circular economy statement')
    expect(sel.clientDashboard(reviewed, { userId: U.isla, now: NOW })!.todos.some((t) => t.kind === 'review_statement')).toBe(false)
    refused(reviewed, reviewStatement(reviewed, actor(U.isla), M, ''), E.notSent)
  })

  it('editing after a review returns it to draft; sending again reaches Lantern with a to-do', () => {
    let s = must(reviewStatement(fresh(), actor(U.isla), M, '')).state
    s = must(editStatementSection(s, actor(U.marcus), M, 'carbon', 'Our own words on carbon.', 'the generated text')).state
    expect(sustainabilityOf(s, M).statement).toMatchObject({ status: 'draft' })
    expect(sustainabilityOf(s, M).statement!.edits.carbon).toMatchObject({ text: 'Our own words on carbon.', basis: 'the generated text', editedByUserId: U.marcus })
    refused(s, reviewStatement(s, actor(U.isla), M, ''), E.notSent)
    const before = s
    s = must(sendStatementForReview(s, actor(U.marcus), M)).state
    expect(sustainabilityOf(s, M).statement).toMatchObject({ status: 'ready_for_review', sentAt: NOW, sentByUserId: U.marcus, reviewedAt: null })
    expect(notesFor(before, s).map((n) => [n.orgId, n.title, n.body, n.href])).toEqual([[ORG_IDS.lantern, 'Circular economy statement ready for review', 'Merrowgate Wharf. Sent by Marcus Lindqvist, Halewick Sustainability.', `/app/projects/${M}/sustainability#statement`]])
    expect(newest(s).text).toBe('sent the circular economy statement to Lantern Quay Developments for review')
    const todo = sel.clientDashboard(s, { userId: U.isla, now: NOW })!.todos.find((t) => t.kind === 'review_statement')!
    expect(todo).toMatchObject({ due: addDays(TODAY, 14), whenText: 'Due in 14 days' })
    expect(sendStatementForReview(s, actor(U.marcus), M).state).toBe(s)
  })

  it('an empty edit and a reset return to the generated text', () => {
    const s = fresh()
    refused(s, editStatementSection(s, actor(U.marcus), M, 'nothing' as never, 'x', 'y'), E.noSection)
    const cleared = must(editStatementSection(s, actor(U.marcus), M, 'approach', '   ', '')).state
    expect(sustainabilityOf(cleared, M).statement!.edits.approach).toBeUndefined()
    expect(sustainabilityOf(cleared, M).statement!.status).toBe('draft')
    const reset = must(resetStatementSection(s, actor(U.marcus), M, 'approach')).state
    expect(sustainabilityOf(reset, M).statement!.edits).toEqual({})
    expect(resetStatementSection(reset, actor(U.marcus), M, 'approach').state).toBe(reset)
  })

  it('needs a client that has accepted the project', () => {
    const s = fresh()
    const w = structuredClone(s.world)
    w.projects[M].clientLink = { ...w.projects[M].clientLink, status: 'pending' }
    const pending = { ...s, world: w }
    // Round 2 follow-up (audit of 16 October, note C2): while the client has not accepted, the consultancy does not
    // reach the project at all, so the action is refused for its role before the client check.
    refused(pending, sendStatementForReview(pending, actor(U.marcus), M), ERRORS.role)
  })
})

describe('privacy: nothing reaches the owner or the surveyor', () => {
  it('a busy round of changes writes nothing addressed to Ostlea Estates or Tarnbrook', () => {
    let s = fresh()
    const before = s
    s = must(setGoalTarget(s, actor(U.marcus), M, 'content_by_value', 0.3, '')).state
    s = must(setRequirementStatus(s, actor(U.isla), M, 'gla-ces', 'at_risk')).state
    s = must(setRequirementStatus(s, actor(U.marcus), M, 'lp-si2', 'evidence_ready')).state
    s = must(addRequirementEvidence(s, actor(U.isla), M, 'gla-ces', { text: 'Note.', output: null })).state
    s = must(setCreditStatus(s, actor(U.marcus), M, 'breeam-mat03', 'at_risk')).state
    s = must(reviewStatement(s, actor(U.isla), M, 'Fine.')).state
    s = must(sendStatementForReview(s, actor(U.marcus), M)).state
    s = must(decideItem(s, actor(U.isla), M, 'wli_hp23zk_3', 'approved', '')).state
    const fresh_ = (xs: { id: string }[], ys: { id: string }[]) => xs.filter((x) => !ys.some((y) => y.id === x.id))
    const notes = fresh_(s.notifications, before.notifications) as typeof s.notifications
    const lines = fresh_(s.activity, before.activity) as typeof s.activity
    for (const n of notes) expect([ORG_IDS.ostlea, ORG_IDS.tarnbrook]).not.toContain(n.orgId)
    for (const l of lines) for (const o of [ORG_IDS.ostlea, ORG_IDS.tarnbrook]) expect(l.orgIds).not.toContain(o)
    expect(notes.length).toBeGreaterThan(4)
  })
})
