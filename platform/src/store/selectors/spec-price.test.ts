// The specification without price for architects (recording audit note 15): the guide price and the market signal
// are for the client, so the architect's schedule, print view and spreadsheet carry neither.
import { describe, expect, it } from 'vitest'
import { fresh, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { LABELS } from '../../domain/reference/labels'
import { projectsOfUser } from '../access'
import { specificationView } from './shortlist'

describe('specificationView and price', () => {
  it('specification: the architect gets no guide price or market signal, in either mode; the client keeps them', () => {
    const s = fresh()
    for (const mode of ['approved', 'draft'] as const) {
      for (const p of projectsOfUser(s, U.priya)) {
        const v = specificationView(s, viewer(U.priya), p.id, mode)!
        expect(v.sheet.blocks.flatMap((b) => b.rows).some((r) => r.section === 'Price'), `${p.name} ${mode}`).toBe(false)
        expect(v.clauses.flatMap((c) => c.rows).some((r) => r.section === 'Price'), `${p.name} ${mode}`).toBe(false)
        expect(v.sheet.caveats).not.toContain(LABELS.L10)
        const json = JSON.stringify(v)
        expect(json).not.toContain('Guide price')
        expect(json).not.toContain('Market signal')
        expect(json).not.toContain('£')
      }
      const isla = specificationView(s, viewer(U.isla), MERROWGATE_ID, mode)!
      expect(isla.clauses[0].rows.filter((r) => r.section === 'Price').map((r) => r.label)).toEqual(['Guide price', 'Market signal'])
      expect(isla.sheet.caveats).toContain(LABELS.L10)
    }
  })
})
