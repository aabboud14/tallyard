import { describe, it, expect } from 'vitest'
import { mint, mintPublicId, opaque } from './ids'
import { fresh } from '../test/fixtures'
import { INTERNAL_ID } from '../domain/privacy/privateStrings'

describe('IDs', () => {
  it('opaque IDs are deterministic, six characters, and never a name', () => {
    expect(opaque('prj:1')).toBe(opaque('prj:1'))
    expect(opaque('prj:1')).not.toBe(opaque('prj:2'))
    expect(opaque('anything')).toMatch(/^[0-9a-z]{6}$/)
    expect(opaque('x', 10)).toMatch(/^[0-9a-z]{10}$/)
  })

  it('mint moves the counter on and skips taken IDs', () => {
    const s = fresh()
    const a = mint(s, 'prj', () => false)
    expect(a.state.seq).toBe(s.seq + 1)
    expect(a.id).toMatch(/^prj_[0-9a-z]{6}$/)
    const b = mint(s, 'prj', (id) => id === a.id)
    expect(b.id).not.toBe(a.id)
    expect(b.state.seq).toBe(s.seq + 2)
  })

  it('public IDs look like the seed, are unique and never carry an internal ID', () => {
    let s = fresh()
    const seen = new Set(Object.values(s.world.lots).map((l) => l.publicId))
    for (let i = 0; i < 300; i++) {
      const m = mintPublicId(s)
      expect(m.id).toMatch(/^L-[2-9A-HJKMNP-TV-Z]{6}$/)
      expect(seen.has(m.id)).toBe(false)
      expect(INTERNAL_ID.test(m.id)).toBe(false)
      seen.add(m.id)
      s = { ...m.state, world: { ...m.state.world, lots: { ...m.state.world.lots, [`lot_t${i}`]: { ...Object.values(m.state.world.lots)[0], id: `lot_t${i}`, publicId: m.id } } } }
    }
  })
})
