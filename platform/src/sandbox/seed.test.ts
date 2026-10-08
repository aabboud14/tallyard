import { describe, it, expect } from 'vitest'
import { firstRun, SEED_REFERENCE_DATE } from './seed'
import { hashPassword, roleForOrgType, SAMPLE_ACCOUNTS, SAMPLE_PASSWORD } from './accounts'
import { addDays, daysBetween } from '../domain/dates'
import { itemByTag, lotForItem, MERROWGATE_ID, ORG_IDS, TIVERNE_ID } from '../domain/seed/world'
import { listingOf, projectWishlist } from '../store/lots'
import { toPublicListing } from '../domain/privacy/publicListing'
import { DEFAULT_ASSUMPTIONS as A } from '../domain/reference/assumptions'

const TODAY = '2026-10-08'
const NOW = '2026-10-08T09:00:00.000Z'

describe('sample accounts', () => {
  it('every sample password hash is SHA-256 of its salt and sandbox', async () => {
    for (const a of SAMPLE_ACCOUNTS) expect(await hashPassword(SAMPLE_PASSWORD, a.salt)).toBe(a.passwordHash)
  })
  it('a different password or salt gives a different hash', async () => {
    const a = SAMPLE_ACCOUNTS[0]
    expect(await hashPassword('Sandbox', a.salt)).not.toBe(a.passwordHash)
    expect(await hashPassword(SAMPLE_PASSWORD, 'slt_other')).not.toBe(a.passwordHash)
  })
  it('each sample person has the role of their organisation and an example email', () => {
    const s = firstRun(TODAY, NOW)
    for (const a of SAMPLE_ACCOUNTS) {
      const org = s.world.orgs[a.orgId]
      expect(roleForOrgType(org.type)).toBe(a.role)
      expect(a.email.endsWith('.example')).toBe(true)
      expect(s.world.personas[a.personaId].name).toBe(a.name)
      expect(s.users[a.userId].passwordHash).toBe(a.passwordHash)
    }
    expect(SAMPLE_ACCOUNTS.map((a) => a.role)).toEqual(['architect', 'client', 'owner', 'surveyor', 'consultant'])
  })
})

describe('firstRun', () => {
  it('is deterministic', () => {
    expect(firstRun(TODAY, NOW)).toEqual(firstRun(TODAY, NOW))
  })

  it('publishes TH-01 as demo step 3 does, on the reference date', () => {
    const s = firstRun(SEED_REFERENCE_DATE)
    const item = itemByTag(s.world, 'TH-01')
    const lot = lotForItem(s.world, item.id)
    expect(lot.visibility).toBe('open')
    expect(lot.askPerUnit).toBe(800)
    expect(lot.reservePerUnit).toBe(730)
    const l = toPublicListing(lot, item, s.world.buildings[TIVERNE_ID], s.world.snapshot, A)
    expect(l.publicId).toBe('L-9F4CQQ')
    expect(l.listedMonth).toBe('2026-10')
    expect(l.location).toEqual({ level: 'region', label: 'Central London' })
    expect(l.availability).toEqual({ kind: 'window', level: 'quarter', label: 'Q1 2027', windowStart: '2027-01-01', windowEnd: '2027-03-31' })
    expect(l.price).toEqual({ guide: 770, low: 715, high: 825, signal: 'high' })
    expect(l.photos).toEqual([])
  })

  it('keeps TH-02 to TH-06 shared with Merrowgate Wharf only', () => {
    const s = firstRun(TODAY, NOW)
    for (const tag of ['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06']) expect(lotForItem(s.world, itemByTag(s.world, tag).id).visibility).toBe('matched_only')
    expect(s.world.projects[MERROWGATE_ID].approvedByOwnerOrgIds).toEqual([ORG_IDS.ostlea])
    for (const p of Object.values(s.world.projects)) if (p.id !== MERROWGATE_ID) expect(p.approvedByOwnerOrgIds).toEqual([])
  })

  it('moves every date by the days from the reference date', () => {
    const later = '2027-02-14'
    const s = firstRun(later)
    const shift = daysBetween(SEED_REFERENCE_DATE, later)
    expect(s.world.projects[MERROWGATE_ID].startDate).toBe(addDays('2028-04-03', shift))
    expect(s.world.buildings[TIVERNE_ID].programme.dismantlingStart).toBe(addDays('2027-01-25', shift))
    expect(lotForItem(s.world, itemByTag(s.world, 'TH-01').id).listedMonth).toBe('2027-02')
    expect(s.seededOn).toBe(later)
  })

  it('seeds a lived-in Merrowgate Wharf: shortlist, approvals, a pending reservation', () => {
    const s = firstRun(TODAY, NOW)
    const list = projectWishlist(s.world, MERROWGATE_ID)!
    expect(list.items.map((x) => x.status)).toEqual(['approved', 'approved', 'sent', 'pending'])
    for (const it of list.items) expect(it.addedOn < TODAY).toBe(true)
    const res = Object.values(s.reservations)
    expect(res).toHaveLength(1)
    expect(res[0].status).toBe('pending')
    expect(res[0].publicId).toBe('L-WPX5A6')
    expect(res[0].estimate.total).toBeGreaterThan(0)
    expect(listingOf(s.world, s.world.lots[res[0].lotId]).status).toBe('Available')
  })

  it('gives every sample organisation history dated before now, newest first', () => {
    const s = firstRun(TODAY, NOW)
    for (const a of SAMPLE_ACCOUNTS) {
      expect(s.notifications.some((n) => n.orgId === a.orgId), a.name).toBe(true)
      expect(s.activity.some((e) => e.orgIds.includes(a.orgId)), a.name).toBe(true)
    }
    for (const n of s.notifications) expect(n.at < NOW).toBe(true)
    for (const e of s.activity) expect(e.at < NOW).toBe(true)
    const sorted = (xs: { at: string }[]) => xs.every((x, i) => i === 0 || xs[i - 1].at >= x.at)
    expect(sorted(s.notifications)).toBe(true)
    expect(sorted(s.activity)).toBe(true)
    expect(s.notifications.some((n) => n.readBy.length === 0)).toBe(true)
  })

  it('leaves no seeded date in the future of an early-morning first visit', () => {
    const s = firstRun(TODAY, '2026-10-08T00:30:00.000Z')
    for (const n of s.notifications) expect(n.at < '2026-10-08T00:30:00.000Z').toBe(true)
    for (const e of s.activity) expect(e.at < '2026-10-08T00:30:00.000Z').toBe(true)
  })
})
