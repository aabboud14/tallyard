import { describe, it, expect } from 'vitest'
import { FAMILY_IDS } from '../reference/families'
import { typologyOf } from './typology'

describe('typologyOf', () => {
  it('groups the seven families as agreed on the calls', () => {
    expect(typologyOf('steel_section')).toBe('structure')
    expect(typologyOf('timber_joist')).toBe('structure')
    expect(typologyOf('curtain_wall')).toBe('envelope')
    expect(typologyOf('precast_cladding')).toBe('envelope')
    expect(typologyOf('stone_cladding')).toBe('envelope')
    expect(typologyOf('clay_brick')).toBe('envelope')
    expect(typologyOf('raised_floor')).toBe('finishes')
  })

  it('gives every family a typology', () => {
    for (const id of FAMILY_IDS) expect(['structure', 'envelope', 'finishes']).toContain(typologyOf(id))
  })
})
