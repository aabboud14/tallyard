// Deterministic, opaque IDs from the state's counter. Never a name, never random, so actions stay pure.
import type { AppData } from './types'

/** FNV-1a over the seed, as base 36, padded and cut to the length. */
export function opaque(seed: string, length = 6): string {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  let s = h.toString(36)
  // A second pass for lengths beyond one hash.
  let g = h ^ 0x5bd1e995
  while (s.length < length) {
    g = Math.imul(g ^ (g >>> 13), 0x01000193) >>> 0
    s += g.toString(36)
  }
  return s.padStart(length, '0').slice(-length)
}

/** A new ID with the prefix, not yet taken, and the state with its counter moved on. */
export function mint(state: AppData, prefix: string, taken: (id: string) => boolean): { id: string; state: AppData } {
  let seq = state.seq
  for (;;) {
    seq += 1
    const id = `${prefix}_${opaque(`${prefix}:${seq}`)}`
    if (!taken(id)) return { id, state: { ...state, seq } }
  }
}

const PUBLIC_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

function publicChars(seed: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  let out = ''
  let x = h
  for (let i = 0; i < 6; i++) {
    if (x < PUBLIC_ALPHABET.length) x = Math.imul(x ^ 0x9e3779b9, 0x01000193) >>> 0
    out += PUBLIC_ALPHABET[x % PUBLIC_ALPHABET.length]
    x = Math.floor(x / PUBLIC_ALPHABET.length)
  }
  return out
}

/** A new public listing ID such as L-7KQ2MD, unrelated to any internal ID. */
export function mintPublicId(state: AppData): { id: string; state: AppData } {
  const taken = new Set(Object.values(state.world.lots).map((l) => l.publicId))
  let seq = state.seq
  for (;;) {
    seq += 1
    const id = `L-${publicChars(`public:${seq}`)}`
    if (!taken.has(id)) return { id, state: { ...state, seq } }
  }
}
