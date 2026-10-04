// F10. Disclosure score for a building's open listings.
import type { LocationLevel, TimingLevel } from '../types'
import type { Assumptions } from '../reference/assumptions'

export type DisclosureLot = { isSteel: boolean; sectionType: 'UB' | 'UC' | null; designation: string | null; lengthM: number | null; hasPublicPhoto: boolean }

export type DisclosureInputs = { locationLevel: LocationLevel; timingLevel: TimingLevel; openLots: DisclosureLot[] }

export type Disclosure = {
  score: number
  band: 'Low' | 'Medium' | 'High'
  terms: { location: number; timing: number; openLots: number; frame: number; photos: number }
  inferences: string[]
  blocksPublishing: boolean
}

export const INFERENCES = {
  localAuthority: "Local authority shown: narrows the search to one planning authority's area.",
  month: 'Month shown: narrows the dismantling programme to a month.',
  openLots: 'Several open lots from one building can be linked by region, window and seller type.',
  frame: 'Beam and column lots together describe a structural grid and storey height.',
  photo: 'A public photo may show features that identify the building.',
  none: 'Region and quarter only.',
} as const

export function disclosureScore(i: DisclosureInputs, a: Assumptions): Disclosure {
  const d = a.disclosure
  const location = d.location[i.locationLevel]
  const timing = d.timing[i.timingLevel]
  const n = i.openLots.length
  const openLots = n <= 1 ? d.openLots.few : n <= 3 ? d.openLots.several : d.openLots.many
  const steel = i.openLots.filter((l) => l.isSteel)
  const types = new Set(steel.map((l) => l.sectionType))
  const combos = new Set(steel.map((l) => `${l.designation}|${l.lengthM}`))
  const frame = (types.has('UB') && types.has('UC')) || combos.size >= 3 ? d.frame : 0
  const photos = i.openLots.some((l) => l.hasPublicPhoto) ? d.photos : 0
  const score = location + timing + openLots + frame + photos
  const band = score < d.mediumFrom ? 'Low' : score < d.highFrom ? 'Medium' : 'High'
  const inferences: string[] = []
  if (i.locationLevel === 'local_authority') inferences.push(INFERENCES.localAuthority)
  if (i.timingLevel === 'month') inferences.push(INFERENCES.month)
  if (openLots > 0) inferences.push(INFERENCES.openLots)
  if (frame > 0) inferences.push(INFERENCES.frame)
  if (photos > 0) inferences.push(INFERENCES.photo)
  if (inferences.length === 0) inferences.push(INFERENCES.none)
  return { score, band, terms: { location, timing, openLots, frame, photos }, inferences, blocksPublishing: band === 'High' }
}
