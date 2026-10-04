import { describe, it, expect } from 'vitest'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { negotiate } from './negotiation'

type Move = ['S' | 'B', number | 'hold']

function moves(r: ReturnType<typeof negotiate>): Move[] {
  return r.log
    .slice(2)
    .filter((e) => e.side !== 'system')
    .map((e) => [e.side === 'seller' ? 'S' : 'B', e.kind === 'hold' ? 'hold' : e.price!] as Move)
}

const cases: [string, [number, number, number, number, number], Move[], { agreed: boolean; price?: number; moves: number }][] = [
  ['N1', [800, 730, 700, 780, 5], [['S', 760], ['B', 725], ['S', 745], ['B', 735]], { agreed: true, price: 740, moves: 4 }],
  ['N2', [800, 750, 700, 720, 5], [['S', 760], ['B', 'hold'], ['S', 'hold']], { agreed: false, moves: 3 }],
  ['N3', [770, 730, 765, 800, 5], [], { agreed: true, price: 770, moves: 0 }],
  ['N4', [800, 770, 700, 790, 5], [['S', 'hold'], ['B', 740], ['S', 775], ['B', 755], ['S', 'hold'], ['B', 765]], { agreed: true, price: 770, moves: 6 }],
  ['N5', [770, 730, 800, 820, 5], [], { agreed: true, price: 770, moves: 0 }],
  ['N6', [770, 770, 765, 765, 5], [['S', 'hold'], ['B', 'hold']], { agreed: false, moves: 2 }],
  ['N7', [260, 225, 200, 245, 1], [['S', 236], ['B', 214], ['S', 227], ['B', 219], ['S', 'hold'], ['B', 222], ['S', 225], ['B', 223], ['S', 'hold'], ['B', 224]], { agreed: true, price: 225, moves: 10 }],
  ['N8', [800, 730, 300, 300, 5], [['S', 'hold'], ['B', 'hold']], { agreed: false, moves: 2 }],
  ['N9', [800, 700, 700, 780, 5], [['S', 760], ['B', 725], ['S', 745], ['B', 735]], { agreed: true, price: 740, moves: 4 }],
  ['N10', [3.7, 3.4, 3.3, 3.6, 0.1], [['S', 3.5]], { agreed: true, price: 3.4, moves: 1 }],
]

describe('B9 negotiation (F9)', () => {
  for (const [id, [ask, reserve, open, max, tick], seq, out] of cases) {
    it(`B9.${id}`, () => {
      const r = negotiate({ ask, reserve, open, max, tick }, A)
      expect(r.log[0]).toMatchObject({ side: 'seller', kind: 'ask', price: ask })
      expect(r.log[1]).toMatchObject({ side: 'buyer', kind: 'bid', price: open })
      expect(moves(r)).toEqual(seq)
      expect(r.outcome.agreed).toBe(out.agreed)
      expect(r.outcome.moves).toBe(out.moves)
      if (out.agreed) expect((r.outcome as { price: number }).price).toBe(out.price)
    })
  }
  it('B9.11 N8: the reserve 730 never appears, and holds carry no figure', () => {
    const r = negotiate({ ask: 800, reserve: 730, open: 300, max: 300, tick: 5 }, A)
    expect(r.log.map((e) => e.price)).not.toContain(730)
    for (const e of r.log) if (e.kind === 'hold' || e.kind === 'none') expect(e.price).toBeNull()
  })
  it('B9.12 N1 and N9 give the same buyer-visible log', () => {
    const a = negotiate({ ask: 800, reserve: 730, open: 700, max: 780, tick: 5 }, A)
    const b = negotiate({ ask: 800, reserve: 700, open: 700, max: 780, tick: 5 }, A)
    expect(a.log).toEqual(b.log)
  })
})
