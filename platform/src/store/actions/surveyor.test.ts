import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U, TODAY } from '../../test/fixtures'
import { addPhoto, captureItem, removePhoto, reopenSurvey, submitSurvey, SURVEY_ERRORS, updateItem, type CaptureInput } from './surveyor'
import { draftFromText } from '../capture'
import { lotOfItem, listingOf } from '../lots'
import { ERRORS } from '../access'
import { HARROWDEN_ID, ORG_IDS, TIVERNE_ID, itemByTag } from '../../domain/seed/world'

function fromText(text: string, buildingId = TIVERNE_ID): CaptureInput {
  const d = draftFromText(text)
  return { buildingId, spec: d.spec!, quantity: d.quantity!, condition: 'A', recoverability: d.recoverability ?? 'B', location: d.location, notes: '', photoIds: ['pho_th12-0001'], expectedAvailableFrom: null }
}

describe('capture', () => {
  it('fills the fields from a description, as capture assist does', () => {
    const d = draftFromText('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
    expect(d.complete).toBe(true)
    expect(d.spec).toEqual({ family: 'steel_section', designation: 'UC 203x203x46', lengthM: 3.2 })
    expect(d.quantity).toEqual({ kind: 'pieces', pieces: 30 })
    expect(d.recoverability).toBe('A')
    expect(d.location).toBe('roof plant room')
  })

  it('the surveyor captures a private item with the next tag and the dismantling start as expected date', () => {
    const s0 = fresh()
    const r = must(captureItem(s0, actor(U.dana), fromText('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')))
    expect(r.value.tag).toBe('TH-12')
    const item = r.state.world.items[r.value.itemId]
    expect(item.capturedBy).toBe('Dana Kowalski')
    expect(item.capturedOn).toBe(TODAY)
    expect(item.expectedAvailableFrom).toBe(s0.world.buildings[TIVERNE_ID].programme.dismantlingStart)
    expect(item.photos).toEqual([{ id: 'pho_th12-0001', kind: 'blob', src: null, isPublic: false }])
    const lot = lotOfItem(r.state.world, item.id)!
    expect(lot.visibility).toBe('private')
    expect(lot.publicId).toMatch(/^L-[2-9A-HJKMNP-TV-Z]{6}$/)
    expect(Object.values(s0.world.lots).some((l) => l.publicId === lot.publicId)).toBe(false)
    expect(listingOf(r.state.world, lot).title).toBe('UC 203x203x46, 3.2 m')
    const n = r.state.notifications[0]
    expect(n.orgId).toBe(ORG_IDS.ostlea)
    expect(n.title).toBe('Dana Kowalski captured TH-12 at Tiverne House')
  })

  it('folds repeated captures on the same day into one notification for the owner', () => {
    let s = fresh()
    s = must(captureItem(s, actor(U.dana), fromText('30 no. 203x203x46 UC, 3.2m long, bolted'))).state
    s = must(captureItem(s, actor(U.dana, '2026-10-08T10:05:00.000Z'), fromText('12 no. 254x254x73 UC, 3.5m long'))).state
    const mine = s.notifications.filter((n) => n.kind === 'item_captured')
    expect(mine).toHaveLength(1)
    expect(mine[0].count).toBe(2)
    expect(mine[0].title).toBe('Dana Kowalski captured 2 items at Tiverne House')
    expect(mine[0].body).toBe('Latest: TH-13. They stay private until you decide.')
  })

  it('the owner can capture too, without notifying themselves; nobody else can', () => {
    const s0 = fresh()
    const r = must(captureItem(s0, actor(U.tom), fromText('600 m2 portland stone 50mm, north elevation')))
    expect(r.state.notifications).toBe(s0.notifications)
    refused(s0, captureItem(s0, actor(U.tom), fromText('30 no. 203x203x46 UC, 3.2m', HARROWDEN_ID)), ERRORS.noAccess)
    refused(s0, captureItem(s0, actor(U.priya), fromText('30 no. 203x203x46 UC, 3.2m')), ERRORS.noAccess)
  })

  it('checks the section, the quantity, the date and the photo reference', () => {
    const s0 = fresh()
    const ok = fromText('30 no. 203x203x46 UC, 3.2m long')
    refused(s0, captureItem(s0, actor(U.dana), { ...ok, spec: { family: 'steel_section', designation: 'UB 999x999x999', lengthM: 3 } }), SURVEY_ERRORS.section)
    refused(s0, captureItem(s0, actor(U.dana), { ...ok, quantity: { kind: 'pieces', pieces: 0 } }), SURVEY_ERRORS.quantity)
    refused(s0, captureItem(s0, actor(U.dana), { ...ok, quantity: { kind: 'area', areaM2: 10 } }), SURVEY_ERRORS.quantity)
    refused(s0, captureItem(s0, actor(U.dana), { ...ok, expectedAvailableFrom: '2027-13-01' }), SURVEY_ERRORS.badDate)
    refused(s0, captureItem(s0, actor(U.dana), { ...ok, photoIds: ['../../etc'] }), SURVEY_ERRORS.photo)
  })
})

describe('items, photos and the survey', () => {
  it('grades change only while the lot is private', () => {
    const s0 = fresh()
    const th08 = itemByTag(s0.world, 'TH-08')
    const r = must(updateItem(s0, actor(U.dana), th08.id, { condition: 'A', notes: 'Gaskets perished on two panels.' }))
    expect(r.state.world.items[th08.id].condition).toBe('A')
    const th01 = itemByTag(s0.world, 'TH-01')
    refused(s0, updateItem(s0, actor(U.dana), th01.id, { condition: 'C' }), SURVEY_ERRORS.locked)
    must(updateItem(s0, actor(U.dana), th01.id, { notes: 'Checked again.' }))
  })

  it('adds and removes photo references', () => {
    const s0 = fresh()
    const th08 = itemByTag(s0.world, 'TH-08')
    const r = must(addPhoto(s0, actor(U.dana), th08.id, 'pho_a1b2c3d4-e5f6'))
    expect(r.state.world.items[th08.id].photos).toHaveLength(1)
    expect(addPhoto(r.state, actor(U.dana), th08.id, 'pho_a1b2c3d4-e5f6').state).toBe(r.state)
    const back = must(removePhoto(r.state, actor(U.tom), th08.id, 'pho_a1b2c3d4-e5f6'))
    expect(back.state.world.items[th08.id].photos).toHaveLength(0)
    refused(s0, addPhoto(s0, actor(U.priya), th08.id, 'pho_a1b2c3d4-e5f6'), ERRORS.noAccess)
  })

  it('the surveyor submits a survey and the owner is told; it can be reopened', () => {
    const s0 = fresh()
    const r = must(submitSurvey(s0, actor(U.dana), HARROWDEN_ID))
    expect(r.state.surveys[HARROWDEN_ID].status).toBe('submitted')
    expect(r.state.world.buildings[HARROWDEN_ID].surveyedBy).toEqual({ personaName: 'Dana Kowalski', orgName: 'Tarnbrook Deconstruction', date: TODAY })
    const n = r.state.notifications[0]
    expect(n.orgId).toBe(ORG_IDS.brackwater)
    expect(n.title).toBe('Tarnbrook Deconstruction submitted the survey of Harrowden Court')
    refused(r.state, submitSurvey(r.state, actor(U.dana), HARROWDEN_ID), SURVEY_ERRORS.submitted)
    refused(s0, submitSurvey(s0, actor(U.tom), TIVERNE_ID), ERRORS.role)
    const again = must(reopenSurvey(r.state, actor(U.dana), HARROWDEN_ID))
    expect(again.state.surveys[HARROWDEN_ID].status).toBe('in_progress')
  })
})
