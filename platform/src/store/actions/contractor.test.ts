import { describe, it, expect } from 'vitest'
import { actor, addTestUser, fresh, must, NOW, refused, TODAY, U } from '../../test/fixtures'
import { appointContractor, applyContractorDates, CONTRACTOR_ERRORS, isoForMonth, setContractorDates } from './contractor'
import { setLotVisibility } from './owner'
import { captureItem } from './surveyor'
import { signUpState } from './auth'
import { draftFromText } from '../capture'
import { ERRORS, buildingSide, canCaptureIn, isBuildingContractor } from '../access'
import { listingOf } from '../lots'
import { HARROWDEN_ID, itemByTag, lotForItem, ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { FENNICK_ID } from '../../sandbox/seed-owner-surveyor'
import type { AppData } from '../types'

/** The seeded sandbox with a person at Fennick Dismantling, the contractor on Tiverne House. */
function withLee(): { s: AppData; lee: string } {
  const r = addTestUser(fresh(), { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
  return { s: r.state, lee: r.userId }
}

function listings(s: AppData) {
  return Object.values(s.world.lots).map((l) => listingOf(s.world, l))
}

describe('isoForMonth', () => {
  it('uses the dismantling start in its own month, else the first', () => {
    expect(isoForMonth('2027-01-26', '2027-01')).toBe('2027-01-26')
    expect(isoForMonth('2027-01-26', '2027-03')).toBe('2027-03-01')
    expect(isoForMonth(null, '2027-03')).toBe('2027-03-01')
  })
})

describe('appointing a deconstruction contractor', () => {
  it('the owner invites one, who is told and gets a contractor side', () => {
    const s0 = fresh()
    const shaw = must(signUpState(s0, { name: 'Lee Shaw', email: 'lee@shaw.example', orgName: 'Shaw Surveys', orgType: 'Surveying or deconstruction firm', salt: 's', passwordHash: 'h', now: NOW }))
    const shawOrg = shaw.state.users[shaw.value].orgId
    const r = must(appointContractor(shaw.state, actor(U.tom), TIVERNE_ID, shawOrg))
    expect(r.state.world.buildings[TIVERNE_ID].contractorOrgId).toBe(shawOrg)
    const n = r.state.notifications.find((x) => x.orgId === shawOrg && x.at === NOW)!
    expect(n).toMatchObject({ kind: 'appointed', title: 'Ostlea Estates invited you to set availability dates at Tiverne House', href: `/app/buildings/${TIVERNE_ID}/availability` })
    expect(buildingSide(r.state, shaw.value, TIVERNE_ID)).toBe('contractor')
    expect(isBuildingContractor(r.state, shaw.value, TIVERNE_ID)).toBe(true)
    expect(canCaptureIn(r.state, shaw.value, TIVERNE_ID)).toBe(false)
    // Unchanged is a no-op; removing logs only.
    expect(appointContractor(r.state, actor(U.tom), TIVERNE_ID, shawOrg).state).toBe(r.state)
    const removed = must(appointContractor(r.state, actor(U.tom), TIVERNE_ID, null)).state
    expect(removed.world.buildings[TIVERNE_ID].contractorOrgId).toBeNull()
    expect(removed.notifications).toBe(r.state.notifications)
  })

  it('the surveyor may invite one too, and the owner hears of it', () => {
    const s0 = fresh()
    const r = must(appointContractor(s0, actor(U.dana), HARROWDEN_ID, FENNICK_ID))
    const owner = r.state.notifications.find((x) => x.orgId === ORG_IDS.brackwater && x.at === NOW)!
    expect(owner).toMatchObject({ kind: 'availability_set', title: 'Tarnbrook Deconstruction invited Fennick Dismantling to Harrowden Court', body: 'They will set expected dates for each item. You can remove them in Overview.' })
    expect(r.state.notifications.some((x) => x.orgId === FENNICK_ID && x.kind === 'appointed' && x.at === NOW)).toBe(true)
  })

  it('refuses another role, an organisation that is not a firm, and anyone off the building', () => {
    const s0 = fresh()
    refused(s0, appointContractor(s0, actor(U.tom), TIVERNE_ID, ORG_IDS.oriel), CONTRACTOR_ERRORS.contractor)
    refused(s0, appointContractor(s0, actor(U.priya), TIVERNE_ID, FENNICK_ID), ERRORS.role)
    refused(s0, appointContractor(s0, actor(U.tom), HARROWDEN_ID, FENNICK_ID), ERRORS.role)
  })
})

describe('the contractor sets dates', () => {
  it('only the appointed contractor can, with valid months', () => {
    const { s, lee } = withLee()
    const th07 = itemByTag(s.world, 'TH-07').id
    refused(s, setContractorDates(s, actor(U.dana), TIVERNE_ID, [{ itemId: th07, month: '2027-01' }]), CONTRACTOR_ERRORS.notContractor)
    refused(s, setContractorDates(s, actor(U.tom), TIVERNE_ID, [{ itemId: th07, month: '2027-01' }]), CONTRACTOR_ERRORS.notContractor)
    refused(s, setContractorDates(s, actor(lee), TIVERNE_ID, [{ itemId: th07, month: '2027-13' }]), CONTRACTOR_ERRORS.badMonth)
    refused(s, setContractorDates(s, actor(lee), TIVERNE_ID, [{ itemId: itemByTag(s.world, 'HC-01').id, month: '2027-01' }]), CONTRACTOR_ERRORS.unknownItem)
  })

  it('stores the dismantling start for its own month, tells the owner and never touches a listing', () => {
    const { s, lee } = withLee()
    const th07 = itemByTag(s.world, 'TH-07').id
    const th01 = itemByTag(s.world, 'TH-01').id
    const r = must(setContractorDates(s, actor(lee), TIVERNE_ID, [{ itemId: th07, month: '2027-01' }, { itemId: th01, month: '2027-02' }]))
    expect(r.value).toBe(2)
    expect(r.state.world.items[th07].contractorAvailableFrom).toBe(s.world.buildings[TIVERNE_ID].programme.dismantlingStart)
    expect(r.state.world.items[th07].contractorAvailableFrom).toBe('2027-01-26')
    expect(r.state.world.items[th07].contractorDatedOn).toBe(TODAY)
    expect(r.state.world.items[th01].contractorAvailableFrom).toBe('2027-02-01')
    expect(listings(r.state)).toEqual(listings(s))
    const n = r.state.notifications.find((x) => x.orgId === ORG_IDS.ostlea && x.at === NOW)!
    expect(n).toMatchObject({ kind: 'availability_set', title: 'Fennick Dismantling set dates for 2 items at Tiverne House', href: `/app/buildings/${TIVERNE_ID}/inventory` })
    // A second save the same day folds into the same notification.
    const again = must(setContractorDates(r.state, actor(lee), TIVERNE_ID, [{ itemId: itemByTag(s.world, 'TH-08').id, month: '2027-05' }]))
    const folded = again.state.notifications.filter((x) => x.orgId === ORG_IDS.ostlea && x.kind === 'availability_set' && x.at.startsWith(TODAY))
    expect(folded).toHaveLength(1)
    expect(folded[0].title).toBe('Fennick Dismantling set dates for 3 items at Tiverne House')
    // Unchanged dates change nothing; null clears.
    expect(setContractorDates(again.state, actor(lee), TIVERNE_ID, [{ itemId: th07, month: '2027-01' }]).state).toBe(again.state)
    const cleared = must(setContractorDates(again.state, actor(lee), TIVERNE_ID, [{ itemId: th07, month: null }])).state
    expect(cleared.world.items[th07].contractorAvailableFrom).toBeNull()
  })

  it('a contractor alone may not capture or edit the record', () => {
    const { s, lee } = withLee()
    const d = draftFromText('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
    refused(s, captureItem(s, actor(lee), { buildingId: TIVERNE_ID, spec: d.spec!, quantity: d.quantity!, condition: 'A', recoverability: 'A', location: '', notes: '', photoIds: [], expectedAvailableFrom: null }), ERRORS.noAccess)
  })
})

describe('the owner applies the contractor dates', () => {
  it('applies them to private lots and leaves shared ones alone', () => {
    const s0 = fresh()
    const th02 = lotForItem(s0.world, itemByTag(s0.world, 'TH-02').id)
    const r = must(applyContractorDates(s0, actor(U.tom), TIVERNE_ID))
    expect(r.value).toEqual({ applied: 5, skipped: 0 })
    for (const tag of ['TH-07', 'TH-08', 'TH-09', 'TH-10', 'TH-11']) {
      const item = itemByTag(r.state.world, tag)
      expect(lotForItem(r.state.world, item.id).availableFrom).toBe(item.contractorAvailableFrom)
    }
    expect(r.state.world.lots[th02.id].availableFrom).toBe(th02.availableFrom)
    expect(r.state.activity[0]).toMatchObject({ text: "applied the contractor's dates to 5 lots", orgIds: [ORG_IDS.ostlea] })
    expect(must(applyContractorDates(r.state, actor(U.tom), TIVERNE_ID)).value).toEqual({ applied: 0, skipped: 0 })
  })

  it('counts a shared lot whose date differs as skipped', () => {
    let s = fresh()
    s = must(setLotVisibility(s, actor(U.tom), lotForItem(s.world, itemByTag(s.world, 'TH-07').id).id, { visibility: 'shared', ask: 180, reserve: 165 })).state
    expect(must(applyContractorDates(s, actor(U.tom), TIVERNE_ID)).value).toEqual({ applied: 4, skipped: 1 })
  })

  it('only the owner applies them', () => {
    const { s, lee } = withLee()
    refused(s, applyContractorDates(s, actor(U.dana), TIVERNE_ID), ERRORS.role)
    refused(s, applyContractorDates(s, actor(lee), TIVERNE_ID), ERRORS.role)
  })
})
