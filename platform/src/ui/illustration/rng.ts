// A tiny deterministic generator for drawings: the same public ID always draws the same picture, and the same
// name always gets the same avatar colour. Drawing variation only. No business figure comes from here.

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

export function rngFor(key: string): Rng {
  return seeded(hashString(key))
}

/** A value in [min, max). */
export function between(r: Rng, min: number, max: number): number {
  return min + r() * (max - min)
}

export function pick<T>(r: Rng, items: readonly T[]): T {
  return items[Math.floor(r() * items.length) % items.length]
}

/** A safe id fragment for SVG defs, so several drawings on one page never share a gradient. */
export function svgId(...parts: string[]): string {
  return parts.join('-').replace(/[^a-zA-Z0-9_-]/g, '')
}

/** Avatar hues, chosen to sit calmly beside the brand green. */
export const AVATAR_HUES = [152, 205, 24, 262, 340, 42, 182] as const

/** Murmur3 finaliser: spreads the low bits so similar names get different hues. */
function mix(h: number): number {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** The same name always gets the same hue. */
export function hueFor(name: string): number {
  return AVATAR_HUES[mix(hashString(name.trim().toLowerCase())) % AVATAR_HUES.length]
}

/** "Priya Nair" gives "PN"; "Studio Oriel" gives "SO"; one word gives its first two letters. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
