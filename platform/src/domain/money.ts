/** Round to pence when an amount is created (03 section 3). */
export function roundPence(x: number): number {
  return Math.floor(x * 100 + 0.5 + 1e-9) / 100
}

function decimalsOf(tick: number): number {
  const s = tick.toString()
  const i = s.indexOf('.')
  return i < 0 ? 0 : s.length - i - 1
}

/** Round to the nearest tick: n = floor(x / tick + 0.5 + 1e-9), then n * tick at the tick's decimals. */
export function roundToTick(x: number, tick: number): number {
  const n = Math.floor(x / tick + 0.5 + 1e-9)
  const d = decimalsOf(tick)
  return Number((n * tick).toFixed(d))
}

/** Whole number of ticks for a price, for comparisons. */
export function ticksOf(x: number, tick: number): number {
  return Math.round(x / tick)
}

export function fromTicks(n: number, tick: number): number {
  return Number((n * tick).toFixed(decimalsOf(tick)))
}

export function sumPence(amounts: number[]): number {
  return roundPence(amounts.reduce((a, b) => a + b, 0))
}
