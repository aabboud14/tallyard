// F7. Schedule matching for steel. Reads nothing but public projections.
import type { Allocation, MatchResult, PublicListing, Requirement, RequirementResult, SteelGrade } from '../types'
import { sectionOrThrow } from '../reference/sections'
import type { Assumptions } from '../reference/assumptions'
import { daysBetween, maxDate, monthsCeil, isOnOrBefore } from '../dates'
import { steelMassT } from './measures'
import { steelAllocationCarbon } from './carbon'

export const MATCH_REASONS = {
  serial: 'No stock in this serial size',
  heavy: 'No stock heavy enough',
  long: (x: number) => `No stock long enough (longest visible in this serial size is ${x.toFixed(1)} m)`,
  grade: 'No stock of the required grade',
  time: 'No stock available in time',
  stock: 'Not enough eligible stock',
} as const

const GRADE_RANK: Record<SteelGrade, number> = { S355: 2, S275: 1, unknown: 0 }

type Stock = { listing: PublicListing; designation: string; type: string; serial: string; massKgM: number; lengthM: number; grade: SteelGrade; remaining: number }

function naturalRef(a: string, b: string): number {
  return a.localeCompare(b, 'en-GB', { numeric: true })
}

export function storageRange(listing: PublicListing, needBy: string, demoDate: string): { min: number; max: number } {
  const av = listing.availability
  if (av.kind === 'now') {
    const m = monthsCeil(daysBetween(demoDate, needBy))
    return { min: m, max: m }
  }
  return {
    min: monthsCeil(daysBetween(maxDate(av.windowEnd, demoDate), needBy)),
    max: monthsCeil(daysBetween(maxDate(av.windowStart, demoDate), needBy)),
  }
}

function availableInTime(listing: PublicListing, needBy: string): boolean {
  const av = listing.availability
  return av.kind === 'now' || isOnOrBefore(av.windowEnd, needBy)
}

function availabilityStart(listing: PublicListing): string {
  return listing.availability.kind === 'now' ? '0000-01-01' : listing.availability.windowStart
}

export type MatchOptions = { allowUnknownGrade?: boolean; secured?: Record<string, number> }

export function matchSchedule(requirements: Requirement[], listings: PublicListing[], demoDate: string, a: Assumptions, options: MatchOptions = {}): MatchResult {
  const allowUnknown = options.allowUnknownGrade ?? true
  const secured = options.secured ?? {}
  const stock: Stock[] = listings
    .filter((l) => l.family === 'steel_section' && l.status === 'Available' && l.spec.family === 'steel_section' && (l.quantity.pieces ?? 0) > 0)
    .map((l) => {
      const spec = l.spec as { designation: string; lengthM: number }
      const s = sectionOrThrow(spec.designation)
      return { listing: l, designation: s.designation, type: s.type, serial: s.serial, massKgM: s.massKgM, lengthM: spec.lengthM, grade: l.grade ?? 'unknown', remaining: l.quantity.pieces ?? 0 }
    })

  const reqs = requirements.map((r) => {
    const s = sectionOrThrow(r.designation)
    const need = Math.max(0, r.count - (secured[r.ref] ?? 0))
    return { r, type: s.type, serial: s.serial, massKgM: s.massKgM, need }
  })
  const order = [...reqs].sort((x, y) => y.r.lengthM - x.r.lengthM || y.massKgM - x.massKgM || naturalRef(x.r.ref, y.r.ref))

  const results = new Map<string, RequirementResult>()
  let baselineMassT = 0
  let stockMassT = 0
  let offcutMassT = 0

  for (const q of order) {
    const needBy = q.r.needBy
    const sameSerial = stock.filter((s) => s.type === q.type && s.serial === q.serial)
    const heavy = sameSerial.filter((s) => s.massKgM >= q.massKgM)
    const long = heavy.filter((s) => s.lengthM >= q.r.lengthM)
    const graded = long.filter((s) => (s.grade === 'unknown' ? allowUnknown : GRADE_RANK[s.grade] >= GRADE_RANK[q.r.minGrade]))
    const timely = graded.filter((s) => availableInTime(s.listing, needBy))
    const eligible = timely.filter((s) => s.remaining > 0)
    eligible.sort((x, y) => {
      const ox = Math.round((x.massKgM - q.massKgM) * 10)
      const oy = Math.round((y.massKgM - q.massKgM) * 10)
      if (ox !== oy) return ox - oy
      const cx = Math.round((x.lengthM - q.r.lengthM) * 100)
      const cy = Math.round((y.lengthM - q.r.lengthM) * 100)
      if (cx !== cy) return cx - cy
      const ax = availabilityStart(x.listing)
      const ay = availabilityStart(y.listing)
      if (ax !== ay) return ax < ay ? -1 : 1
      return x.listing.publicId < y.listing.publicId ? -1 : x.listing.publicId > y.listing.publicId ? 1 : 0
    })
    const allocations: Allocation[] = []
    let remaining = q.need
    for (const s of eligible) {
      if (remaining <= 0) break
      const take = Math.min(remaining, s.remaining)
      if (take <= 0) continue
      s.remaining -= take
      remaining -= take
      const range = storageRange(s.listing, needBy, demoDate)
      allocations.push({
        publicId: s.listing.publicId,
        pieces: take,
        overSpecKgM: Math.round((s.massKgM - q.massKgM) * 10) / 10,
        offcutM: Math.round((s.lengthM - q.r.lengthM) * 100) / 100,
        gradeFlag: s.grade === 'unknown',
        storageMin: range.min,
        storageMax: range.max,
      })
      baselineMassT += steelMassT(take, q.r.lengthM, q.massKgM)
      stockMassT += steelMassT(take, s.lengthM, s.massKgM)
      offcutMassT += steelMassT(take, s.lengthM - q.r.lengthM, s.massKgM)
    }
    let reason: string | null = null
    if (remaining > 0) {
      if (sameSerial.length === 0) reason = MATCH_REASONS.serial
      else if (heavy.length === 0) reason = MATCH_REASONS.heavy
      else if (long.length === 0) reason = MATCH_REASONS.long(Math.max(...sameSerial.map((s) => s.lengthM)))
      else if (graded.length === 0) reason = MATCH_REASONS.grade
      else if (timely.length === 0) reason = MATCH_REASONS.time
      else reason = MATCH_REASONS.stock
    }
    results.set(q.r.ref, { ref: q.r.ref, required: q.need, matched: q.need - remaining, allocations, reason })
  }

  const ordered = [...reqs].sort((x, y) => naturalRef(x.r.ref, y.r.ref)).map((q) => results.get(q.r.ref)!)
  const members = reqs.reduce((s, q) => s + q.need, 0)
  const matched = ordered.reduce((s, r) => s + r.matched, 0)
  const avoided = matched > 0 ? steelAllocationCarbon(baselineMassT, stockMassT, a.listingKm, a).avoided : 0
  return {
    lines: requirements.length,
    members,
    matched,
    coverage: members > 0 ? matched / members : 0,
    openOnly: null,
    results: ordered,
    baselineMassT,
    stockMassT,
    offcutMassT,
    avoidedT: avoided,
  }
}

/** Mass of every required member at the required section and length. */
export function requiredMassT(requirements: Requirement[]): number {
  return requirements.reduce((s, r) => s + steelMassT(r.count, r.lengthM, sectionOrThrow(r.designation).massKgM), 0)
}
