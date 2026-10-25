// Share links honoured by the domain visibility rules, with no change to any caller's signature (owner-surveyor 14.4.4).
import { describe, it, expect } from 'vitest'
import type { Project, ShareLink, World } from './types'
import { DEFAULT_ASSUMPTIONS as A } from './reference/assumptions'
import { activeLinkLots, browseListings, lotsSharedByLinkWithOrg, lotsVisibleToProject } from './visibility'
import { FERRYMOOR_ID, itemByTag, lotForItem, MERROWGATE_ID, ORG_IDS, SALLOW_ID } from './seed/world'
import { fresh } from '../test/fixtures'

const lotId = (w: World, tag: string) => lotForItem(w, itemByTag(w, tag).id).id

function withLink(w: World, tags: string[], opens: string[], patch: Partial<ShareLink> = {}): World {
  const next = structuredClone(w)
  next.shareLinks.lnk_test01 = { id: 'lnk_test01', ownerOrgId: ORG_IDS.ostlea, buildingId: itemByTag(w, tags[0]).buildingId, lotIds: tags.map((t) => lotId(w, t)), label: 'Test link', createdAt: '2026-10-08T09:00:00.000Z', createdByPersonaId: 'per_tom', revokedAt: null, opens: opens.map((orgId) => ({ orgId, at: '2026-10-08T09:30:00.000Z' })), ...patch }
  return next
}

describe('share links in the visibility rules', () => {
  const base = fresh().world
  const th02 = lotId(base, 'TH-02')
  const th03 = lotId(base, 'TH-03')

  it('a link opened by the architect makes its lots visible to its projects, even before their own terms', () => {
    const w = withLink(base, ['TH-02', 'TH-03'], [ORG_IDS.oriel])
    expect(w.projects[SALLOW_ID].termsAccepted).toBe(false)
    for (const id of [SALLOW_ID, FERRYMOOR_ID]) expect(lotsVisibleToProject(w, w.projects[id])).toEqual(expect.arrayContaining([th02, th03]))
    expect(lotsVisibleToProject(base, base.projects[SALLOW_ID])).not.toContain(th02)
    const stranger: Project = { ...w.projects[SALLOW_ID], id: 'prj_strang', architectOrgId: 'org_nobody', clientOrgId: ORG_IDS.pellory }
    expect(lotsVisibleToProject(w, stranger)).not.toContain(th02)
    expect(lotsVisibleToProject(w, stranger)).not.toContain(th03)
  })

  it('a link opened by the client counts for the client side too', () => {
    const w = withLink(base, ['TH-02'], [ORG_IDS.pellory])
    expect(lotsVisibleToProject(w, w.projects[SALLOW_ID])).toContain(th02)
    expect(lotsVisibleToProject(w, w.projects[FERRYMOOR_ID])).not.toContain(th02)
  })

  it('shows nothing when not opened or revoked, and drops a lot made private', () => {
    expect(lotsVisibleToProject(withLink(base, ['TH-02', 'TH-03'], []), base.projects[SALLOW_ID])).not.toContain(th02)
    const revoked = withLink(base, ['TH-02', 'TH-03'], [ORG_IDS.oriel], { revokedAt: '2026-10-08T11:00:00.000Z' })
    expect(lotsVisibleToProject(revoked, revoked.projects[SALLOW_ID])).not.toContain(th02)
    expect(activeLinkLots(revoked, revoked.shareLinks.lnk_test01)).toEqual([])
    const w = withLink(base, ['TH-02', 'TH-03'], [ORG_IDS.oriel])
    w.lots[th03].visibility = 'private'
    expect(activeLinkLots(w, w.shareLinks.lnk_test01)).toEqual([th02])
    const visible = lotsVisibleToProject(w, w.projects[SALLOW_ID])
    expect(visible).toContain(th02)
    expect(visible).not.toContain(th03)
  })

  it("a link never reaches another seller's lots beyond their own visibility", () => {
    const w = withLink(base, ['TH-02', 'OS-11', 'HC-01'], [ORG_IDS.oriel])
    w.lots[lotId(w, 'HC-01')].visibility = 'matched_only'
    expect(activeLinkLots(w, w.shareLinks.lnk_test01)).toEqual([th02])
    expect(lotsSharedByLinkWithOrg(w, ORG_IDS.oriel)).toEqual([th02])
    expect(lotsVisibleToProject(w, w.projects[SALLOW_ID])).not.toContain(lotId(w, 'HC-01'))
  })

  it('a link opened only by the consultancy exposes nothing to its projects', () => {
    const w = withLink(base, ['TH-02', 'TH-03'], [ORG_IDS.halewick])
    expect(lotsVisibleToProject(w, w.projects[MERROWGATE_ID])).toEqual(lotsVisibleToProject(base, base.projects[MERROWGATE_ID]))
    const noTerms: Project = { ...w.projects[MERROWGATE_ID], termsAccepted: false }
    expect(lotsVisibleToProject(w, noTerms)).not.toContain(th02)
    expect(lotsSharedByLinkWithOrg(w, '')).toEqual([])
  })

  it('leaves the open marketplace alone', () => {
    const w = withLink(base, ['TH-02', 'TH-03'], [ORG_IDS.oriel, ORG_IDS.lantern, ORG_IDS.halewick])
    expect(browseListings(w, A)).toEqual(browseListings(base, A))
  })
})
