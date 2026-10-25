// A tiny deterministic generator for illustrations: the same public ID always draws the same picture.
// Drawing variation only. No business figure comes from here.

/** FNV-1a, 32 bit, over the characters of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Mulberry32: a small seeded generator of numbers in [0, 1). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof seeded>

export function rngFor(publicId: string): Rng {
  return seeded(hashString(publicId))
}

/** A value in [min, max). */
export function between(r: Rng, min: number, max: number): number {
  return min + r() * (max - min)
}

export function pick<T>(r: Rng, items: readonly T[]): T {
  return items[Math.floor(r() * items.length) % items.length]
}

/** A safe id fragment for SVG defs, so several swatches on one page never share a gradient. */
export function svgId(...parts: string[]): string {
  return parts.join('-').replace(/[^a-zA-Z0-9_-]/g, '')
}
