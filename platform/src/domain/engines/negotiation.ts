// F9. Negotiation agent: scripted and deterministic. Works in whole ticks.
import type { Negotiation, NegotiationEntry } from '../types'
import type { Assumptions } from '../reference/assumptions'
import { fromTicks, ticksOf } from '../money'

export type NegotiationInputs = { ask: number; reserve: number; open: number; max: number; tick: number }

export function negotiate(i: NegotiationInputs, a: Assumptions): Omit<Negotiation, 'buyer'> {
  const tick = i.tick
  const ask = ticksOf(i.ask, tick)
  const reserve = ticksOf(i.reserve, tick)
  const open = ticksOf(i.open, tick)
  const max = ticksOf(i.max, tick)
  const gapLimit = a.negotiation.settleGapTicks
  const c = a.negotiation.concession
  let s = ask
  let b = open
  const log: NegotiationEntry[] = []
  let n = 0
  const push = (side: NegotiationEntry['side'], kind: NegotiationEntry['kind'], price: number | null, text: string) => {
    n += 1
    log.push({ n, side, kind, price: price === null ? null : fromTicks(price, tick), text })
  }
  push('seller', 'ask', s, 'Ask')
  push('buyer', 'bid', b, 'Bid')

  const settle = (): number | null => {
    if (b >= s) return s
    if (s - b <= gapLimit) {
      const p = Math.floor((s + b) / 2 + 0.5 + 1e-9)
      if (reserve <= p && p <= max) return p
    }
    return null
  }

  let agreed = settle()
  let moves = 0
  let lastHold = false
  while (agreed === null && moves < a.negotiation.maxMoves) {
    const sellerTurn = moves % 2 === 0
    let hold: boolean
    if (sellerTurn) {
      const candidate = Math.floor(s - c * (s - b) + 0.5 + 1e-9)
      if (candidate < reserve || candidate === s) {
        hold = true
        push('seller', 'hold', null, 'Seller holds')
      } else {
        hold = false
        s = candidate
        push('seller', 'ask', s, 'Ask')
      }
    } else {
      const candidate = Math.floor(b + c * (s - b) + 0.5 + 1e-9)
      if (candidate > max || candidate === b) {
        hold = true
        push('buyer', 'hold', null, 'Buyer holds')
      } else {
        hold = false
        b = candidate
        push('buyer', 'bid', b, 'Bid')
      }
    }
    moves += 1
    agreed = settle()
    if (agreed !== null) break
    if (hold && lastHold) break
    lastHold = hold
  }
  if (agreed !== null) {
    push('system', 'agreed', agreed, 'Agreed in principle')
    return { log, outcome: { agreed: true, price: fromTicks(agreed, tick), moves } }
  }
  push('system', 'none', null, 'No agreement')
  return { log, outcome: { agreed: false, moves } }
}

/** The buyer-visible log: entries with their prices. Limits never appear, so both sides see the same log. */
export function visibleLog(n: Omit<Negotiation, 'buyer'>): { kind: string; price: number | null }[] {
  return n.log.map((e) => ({ kind: e.kind, price: e.price }))
}
