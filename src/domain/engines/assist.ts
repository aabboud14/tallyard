// F14. Capture Assist: real text parsing, rule-based. Each step takes the first match and blanks it.
import type { FamilyId, Recoverability } from '../types'
import { SECTIONS, type Section } from '../reference/sections'

// oxlint-disable no-control-regex
const BLANK = '\u0001'

export type AssistResult = {
  family: FamilyId | null
  section: string | null
  sectionFlag: string | null
  pieces: number | null
  lengthM: number | null
  areaM2: number | null
  volumeM3: number | null
  thicknessMm: number | null
  panelWidthM: number | null
  panelHeightM: number | null
  recoverability: Recoverability | null
  location: string | null
  evidence: Record<string, string>
  missing: string[]
}

export const CLOSEST_MATCH = 'closest catalogue match, please check'

const REQUIRED: Record<FamilyId, string[]> = {
  steel_section: ['section', 'pieces', 'lengthM'],
  curtain_wall: ['pieces', 'panelWidthM', 'panelHeightM'],
  precast_cladding: ['areaM2'],
  stone_cladding: ['areaM2'],
  clay_brick: ['pieces'],
  raised_floor: ['pieces'],
  timber_joist: ['volumeM3'],
}

const LOCATION_WORDS = /\b(levels?|floors?|storeys?|basement|roof|plant room|room|bay|grid|gridline|elevation|north|south|east|west|core|stair|ground|mezzanine|wing|zone|podium)\b/

function num(s: string): number {
  return Number(s.replace(/,/g, ''))
}

export function captureAssist(input: string): AssistResult {
  let t = input.toLowerCase()
  const evidence: Record<string, string> = {}
  const r: AssistResult = { family: null, section: null, sectionFlag: null, pieces: null, lengthM: null, areaM2: null, volumeM3: null, thicknessMm: null, panelWidthM: null, panelHeightM: null, recoverability: null, location: null, evidence, missing: [] }

  const take = (re: RegExp, field: string): RegExpExecArray | null => {
    const m = re.exec(t)
    if (!m) return null
    evidence[field] = input.slice(m.index, m.index + m[0].length).trim()
    t = t.slice(0, m.index) + BLANK + t.slice(m.index + m[0].length)
    return m
  }

  // 1. Section designation
  const secRe = /(?:\b(ub|uc)\s*)?(\d{3})\s*x\s*(\d{3})\s*x\s*(\d{2,3}(?:\.\d+)?)(?:\s*(ub|uc)\b)?/
  const sm = secRe.exec(t)
  if (sm && (sm[1] || sm[5])) {
    const type = (sm[1] ?? sm[5]).toUpperCase() as 'UB' | 'UC'
    const serial = `${sm[2]}x${sm[3]}`
    const mass = Number(sm[4])
    const exact = SECTIONS.find((s) => s.type === type && s.serial === serial && Math.abs(s.massKgM - mass) < 0.05 + 1e-9) ?? SECTIONS.find((s) => s.designation === `${type} ${serial}x${sm[4]}`)
    let chosen: Section | undefined = exact
    if (!chosen) {
      const same = SECTIONS.filter((s) => s.type === type && s.serial === serial)
      if (same.length) {
        chosen = same.reduce((best, s) => {
          const d = Math.abs(s.massKgM - mass)
          const bd = Math.abs(best.massKgM - mass)
          if (d < bd - 1e-9) return s
          if (Math.abs(d - bd) <= 1e-9 && s.massKgM < best.massKgM) return s
          return best
        })
        r.sectionFlag = CLOSEST_MATCH
      }
    }
    if (chosen) {
      r.section = chosen.designation
      r.family = 'steel_section'
      evidence.section = input.slice(sm.index, sm.index + sm[0].length).trim()
      t = t.slice(0, sm.index) + BLANK + t.slice(sm.index + sm[0].length)
    }
  }

  // 2. Family
  if (!r.family) {
    const fams: [RegExp, FamilyId][] = [
      [/curtain wall(?:ing)?/, 'curtain_wall'],
      [/raised access floor|raised floor|\braf\b/, 'raised_floor'],
      [/pre-?cast/, 'precast_cladding'],
      [/stone/, 'stone_cladding'],
      [/bricks?/, 'clay_brick'],
      [/joists?|timber/, 'timber_joist'],
      [/steel|\bbeams?\b|\bcolumns?\b|\bub\b|\buc\b/, 'steel_section'],
    ]
    for (const [re, fam] of fams) {
      const m = take(re, 'family')
      if (m) {
        r.family = fam
        break
      }
    }
  }

  // 3. Panel dimensions
  const pm = take(/(\d+(?:\.\d+)?)\s*(mm|m)?\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(mm|m)?(?![a-z0-9])/, 'panel')
  if (pm) {
    const w = Number(pm[1])
    const h = Number(pm[3])
    const unit = pm[4] ?? pm[2] ?? null
    const toM = (v: number, u: string | null) => (u === 'mm' ? v / 1000 : u === 'm' ? v : v > 100 ? v / 1000 : v)
    r.panelWidthM = toM(w, unit)
    r.panelHeightM = toM(h, unit)
  }

  // 4. Area, then volume
  const am = take(/(\d[\d,]*(?:\.\d+)?)\s*(?:m2|m²|sq\.?\s?m|sqm)(?![a-z0-9])/, 'areaM2')
  if (am) r.areaM2 = num(am[1])
  const vm = take(/(\d[\d,]*(?:\.\d+)?)\s*(?:m3|m³|cu\.?\s?m)(?![a-z0-9])/, 'volumeM3')
  if (vm) r.volumeM3 = num(vm[1])

  // 5. Thickness
  const tm = take(/(\d+(?:\.\d+)?)\s*mm(?![a-z0-9])/, 'thicknessMm')
  if (tm) r.thicknessMm = Number(tm[1])

  // 6. Length
  const lm = take(/(?:@|\bat\b)?\s*(\d+(?:\.\d+)?)\s*m(?![a-z0-9²])(?:\s*long\b)?/, 'lengthM')
  if (lm) r.lengthM = Number(lm[1])

  // 7. Count
  const countRes: RegExp[] = [
    /(\d[\d,]*)\s*(?:no\.?|nr|nos\.?|pcs|pieces|off)(?![a-z0-9])/,
    /(?:^|[\s\u0001])x\s*(\d[\d,]*)(?![\d.]|\s*x)/,
    /(\d[\d,]*)\s*(?:panels|bricks|tiles|joists|beams|columns|members|lengths)\b/,
    /^\s*(?:approx\.?|about|circa)?\s*(\d[\d,]*)(?![\d.])/,
  ]
  for (const re of countRes) {
    const m = take(re, 'pieces')
    if (m) {
      r.pieces = num(m[1])
      break
    }
  }

  // 8. Recoverability suggestion
  const recA = take(/bolted|lime mortar/, 'recoverability')
  if (recA) r.recoverability = 'A'
  else if (take(/welded/, 'recoverability')) r.recoverability = 'B'
  else if (take(/cast-in|cast in|cement mortar/, 'recoverability')) r.recoverability = 'C'

  // 9. Location
  const pieces = t.split(/[,;\u0001]/).map((p) => p.trim()).filter((p) => p.length > 0)
  const locs = pieces.filter((p) => LOCATION_WORDS.test(p))
  if (locs.length) {
    r.location = locs.join(', ')
    evidence.location = r.location
  }

  // 10. Derived
  if (r.family === 'curtain_wall' && r.pieces !== null && r.panelWidthM !== null && r.panelHeightM !== null && r.areaM2 === null) {
    r.areaM2 = r.pieces * r.panelWidthM * r.panelHeightM
  }

  // 11. Required fields
  if (r.family) {
    r.missing = REQUIRED[r.family].filter((k) => (r as unknown as Record<string, unknown>)[k] === null)
  }
  return r
}
