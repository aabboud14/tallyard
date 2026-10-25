// Chart axes (visual-qa.md section 7, P2): the right end of a bar scale and its ticks, so chart components such as
// BarList and TargetMeter only place what they are given. Pure.

/** The mantissas of a "nice" number, in order, times a power of ten. */
const NICE = [1, 2, 2.5, 5] as const

/** Ten to the power k, built so negative powers stay exact decimals (0.1, not 0.1 times rounding). */
function pow10(k: number): number {
  return k >= 0 ? 10 ** k : 1 / 10 ** -k
}

/** Round away the floating point noise of a product such as 3 * 0.1, to 12 significant figures. */
function clean(x: number): number {
  return Number(x.toPrecision(12))
}

/** The smallest "nice" number (1, 2, 2.5 or 5 times a power of ten) that is at least max. 0 gives 1. */
export function niceMax(max: number): number {
  if (!Number.isFinite(max) || max < 0) throw new RangeError(`niceMax needs a finite figure of 0 or more, got ${max}`)
  if (max === 0) return 1
  const k = Math.floor(Math.log10(max))
  // Try the decade below as well, in case log10 rounds a power of ten up.
  for (const e of [k - 1, k, k + 1]) {
    for (const m of NICE) {
      const candidate = clean(m * pow10(e))
      if (candidate >= max) return candidate
    }
  }
  return clean(10 * pow10(k + 1))
}

/** Evenly spaced ticks from 0 to niceMax(max), count intervals (default 4). */
export function ticks(max: number, count = 4): number[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`ticks needs a whole number of intervals of 1 or more, got ${count}`)
  const top = niceMax(max)
  return Array.from({ length: count + 1 }, (_, i) => (i === count ? top : clean((top * i) / count)))
}
