import { describe, expect, it } from 'vitest'
import { expandFor, parseExpansion, revealFolder, toggleFolder } from './expansion'

describe('sidebar folder expansion', () => {
  it('opens the folder of the page shown and closes it again when the person moves on', () => {
    let e = expandFor({ open: [], auto: [] }, ['p1'])
    expect(e).toEqual({ open: ['p1'], auto: ['p1'] })
    e = expandFor(e, ['p2'])
    expect(e).toEqual({ open: ['p2'], auto: ['p2'] })
    e = expandFor(e, [])
    expect(e).toEqual({ open: [], auto: [] })
  })

  it('keeps a folder the person opened or closed as they left it', () => {
    let e = toggleFolder({ open: [], auto: [] }, 'p1')
    e = expandFor(e, ['p2'])
    expect(e.open).toEqual(['p1', 'p2'])
    // Opened automatically, then the person closes it while there: it stays closed on the way out and in.
    e = toggleFolder(e, 'p2')
    expect(e).toEqual({ open: ['p1'], auto: [] })
    e = expandFor(e, ['p3'])
    expect(e).toEqual({ open: ['p1', 'p3'], auto: ['p3'] })
    // Opened automatically, then closed and opened again by the person: theirs now, so it stays open.
    e = toggleFolder(toggleFolder(e, 'p3'), 'p3')
    e = expandFor(e, [])
    expect(e).toEqual({ open: ['p1', 'p3'], auto: [] })
  })

  it('treats a folder opened by following its link like one opened by the page', () => {
    let e = revealFolder({ open: [], auto: [] }, 'p1')
    expect(e).toEqual({ open: ['p1'], auto: ['p1'] })
    expect(revealFolder(e, 'p1')).toBe(e)
    e = expandFor(e, ['p1'])
    e = expandFor(e, ['p2'])
    expect(e).toEqual({ open: ['p2'], auto: ['p2'] })
  })

  it('opens nested folders together, outermost first', () => {
    expect(expandFor({ open: [], auto: [] }, ['b1', 'b1-recovery'])).toEqual({ open: ['b1', 'b1-recovery'], auto: ['b1', 'b1-recovery'] })
  })

  it('reads the stored value, the older plain list included, and survives damage', () => {
    expect(parseExpansion(null)).toEqual({ open: [], auto: [] })
    expect(parseExpansion('["p1","p2"]')).toEqual({ open: ['p1', 'p2'], auto: [] })
    expect(parseExpansion('{"open":["p1"],"auto":["p1","p9"]}')).toEqual({ open: ['p1'], auto: ['p1'] })
    expect(parseExpansion('{oops')).toEqual({ open: [], auto: [] })
    expect(parseExpansion('7')).toEqual({ open: [], auto: [] })
  })
})
