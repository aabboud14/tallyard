// The capture form as the surveyor fills it: plain strings while typing, filled from the description by the
// capture assist engine until the person edits a field, then checked and turned into a capture input.
import type { Condition, FamilyId, Quantity, Recoverability, Spec } from '../../domain/types'
import { captureAssist, type AssistResult } from '../../domain/engines/assist'
import { FAMILIES } from '../../domain/reference/families'
import { findSection } from '../../domain/reference/sections'
import type { CaptureInput } from '../actions/surveyor'
import { QUANTITY_KIND, validQuantity } from '../capture'

export type CaptureField =
  | 'family'
  | 'section'
  | 'lengthM'
  | 'panelWidthM'
  | 'panelHeightM'
  | 'thicknessMm'
  | 'stone'
  | 'mortar'
  | 'panelSize'
  | 'species'
  | 'pieces'
  | 'areaM2'
  | 'volumeM3'
  | 'condition'
  | 'recoverability'
  | 'location'
  | 'notes'
  | 'expectedMonth'

export type CaptureForm = {
  family: FamilyId | ''
  section: string
  lengthM: string
  panelWidthM: string
  panelHeightM: string
  thicknessMm: string
  stone: string
  mortar: string
  panelSize: string
  species: string
  pieces: string
  areaM2: string
  volumeM3: string
  condition: Condition | ''
  recoverability: Recoverability | ''
  location: string
  notes: string
  /** YYYY-MM. */
  expectedMonth: string
}

export const MORTAR_OPTIONS = ['lime mortar', 'cement mortar'] as const
export const SPECIES_OPTIONS = ['softwood', 'hardwood'] as const

export function emptyCaptureForm(expectedMonth: string): CaptureForm {
  return {
    family: '',
    section: '',
    lengthM: '',
    panelWidthM: '',
    panelHeightM: '',
    thicknessMm: '',
    stone: 'Portland',
    mortar: 'cement mortar',
    panelSize: '600 by 600',
    species: 'softwood',
    pieces: '',
    areaM2: '',
    volumeM3: '',
    condition: '',
    recoverability: '',
    location: '',
    notes: '',
    expectedMonth,
  }
}

/** The measurement fields each family asks for, in order. Every one is required. */
export type MeasureField = { key: CaptureField; label: string; unit: string | null; kind: 'integer' | 'decimal' | 'section' | 'text' | 'mortar' | 'species' }

export function measureFields(family: FamilyId): MeasureField[] {
  const count = (label: string): MeasureField => ({ key: 'pieces', label, unit: null, kind: 'integer' })
  switch (family) {
    case 'steel_section':
      return [{ key: 'section', label: 'Section', unit: null, kind: 'section' }, { key: 'lengthM', label: 'Length', unit: 'm', kind: 'decimal' }, count('Pieces')]
    case 'curtain_wall':
      return [{ key: 'panelWidthM', label: 'Panel width', unit: 'm', kind: 'decimal' }, { key: 'panelHeightM', label: 'Panel height', unit: 'm', kind: 'decimal' }, count('Panels')]
    case 'precast_cladding':
      return [{ key: 'thicknessMm', label: 'Thickness', unit: 'mm', kind: 'decimal' }, { key: 'areaM2', label: 'Area', unit: 'm2', kind: 'decimal' }]
    case 'stone_cladding':
      return [{ key: 'stone', label: 'Stone', unit: null, kind: 'text' }, { key: 'thicknessMm', label: 'Thickness', unit: 'mm', kind: 'decimal' }, { key: 'areaM2', label: 'Area', unit: 'm2', kind: 'decimal' }]
    case 'clay_brick':
      return [{ key: 'mortar', label: 'Mortar', unit: null, kind: 'mortar' }, count('Bricks')]
    case 'raised_floor':
      return [{ key: 'panelSize', label: 'Panel size', unit: 'mm', kind: 'text' }, count('Panels')]
    case 'timber_joist':
      return [{ key: 'species', label: 'Species', unit: null, kind: 'species' }, { key: 'volumeM3', label: 'Volume', unit: 'm3', kind: 'decimal' }]
  }
}

export const CAPTURE_FIELD_LABELS: Record<string, string> = {
  family: 'Family',
  section: 'Section',
  panel: 'Panel size',
  panelWidthM: 'Panel width',
  panelHeightM: 'Panel height',
  lengthM: 'Length',
  thicknessMm: 'Thickness',
  areaM2: 'Area',
  volumeM3: 'Volume',
  pieces: 'Quantity',
  recoverability: 'Recoverability',
  location: 'Location',
  condition: 'Condition',
  stone: 'Stone',
  mortar: 'Mortar',
  panelSize: 'Panel size',
  species: 'Species',
}

function str(n: number | null): string {
  return n === null ? '' : String(Number(n.toFixed(3)))
}

/** The values the description gives, as form strings. Only fields the engine reads appear. */
function assistValues(r: AssistResult): Partial<CaptureForm> {
  const out: Partial<CaptureForm> = {
    family: r.family ?? '',
    section: r.section ?? '',
    lengthM: str(r.lengthM),
    thicknessMm: str(r.thicknessMm),
    pieces: str(r.pieces),
    areaM2: str(r.areaM2 === null ? null : Math.round(r.areaM2 * 100) / 100),
    volumeM3: str(r.volumeM3),
    recoverability: r.recoverability ?? '',
    location: r.location ?? '',
  }
  if (r.family === 'raised_floor') {
    out.panelSize = r.panelWidthM !== null && r.panelHeightM !== null ? `${Math.round(r.panelWidthM * 1000)} by ${Math.round(r.panelHeightM * 1000)}` : '600 by 600'
  } else {
    out.panelWidthM = str(r.panelWidthM)
    out.panelHeightM = str(r.panelHeightM)
  }
  if (r.family === 'clay_brick') out.mortar = r.recoverability === 'A' ? 'lime mortar' : 'cement mortar'
  return out
}

export type AssistFill = {
  form: CaptureForm
  /** Fields the description set on this pass. */
  filled: CaptureField[]
  /** What the engine read, for the evidence chips: the field and the words it used. */
  evidence: { field: string; label: string; text: string }[]
  /** Required fields the description did not give. */
  missing: { field: string; label: string }[]
  /** For example "closest catalogue match, please check". */
  sectionFlag: string | null
  /** The description named something the engine recognised. */
  recognised: boolean
}

/**
 * Fills the form from the description. Fields the person has edited (`touched`) keep their value; every other
 * field the engine reads follows the description, so deleting words clears what they had filled.
 */
export function fillFromDescription(form: CaptureForm, text: string, touched: readonly CaptureField[]): AssistFill {
  const r = captureAssist(text)
  const values = assistValues(r)
  const next: CaptureForm = { ...form }
  const filled: CaptureField[] = []
  for (const [k, v] of Object.entries(values) as [CaptureField, string][]) {
    if (touched.includes(k)) continue
    ;(next as Record<CaptureField, string>)[k] = v
    if (v !== '') filled.push(k)
  }
  return {
    form: next,
    filled,
    evidence: Object.entries(r.evidence).map(([field, words]) => ({ field, label: CAPTURE_FIELD_LABELS[field] ?? field, text: words })),
    missing: r.missing.map((m) => ({ field: m, label: CAPTURE_FIELD_LABELS[m] ?? m })),
    sectionFlag: r.sectionFlag,
    recognised: Object.keys(r.evidence).length > 0,
  }
}

function parseNumber(s: string): number | null {
  const t = s.replace(/,/g, '').trim()
  if (t === '' || !/^\d*\.?\d+$/.test(t)) return null
  return Number(t)
}

export type CaptureCheck = {
  ok: boolean
  /** Required fields still blank, in form order. */
  missing: CaptureField[]
  /** Fields with a value that cannot be used, and why. */
  problems: Partial<Record<CaptureField, string>>
  spec: Spec | null
  quantity: Quantity | null
}

/** Whether the form can be saved, what is missing, and the specification and quantity it describes. */
export function checkCaptureForm(form: CaptureForm): CaptureCheck {
  const missing: CaptureField[] = []
  const problems: Partial<Record<CaptureField, string>> = {}
  if (!form.family) missing.push('family')
  const family = form.family || null
  const num = (key: CaptureField, integer: boolean): number | null => {
    const raw = form[key] as string
    if (raw.trim() === '') {
      missing.push(key)
      return null
    }
    const n = parseNumber(raw)
    if (n === null || n <= 0) {
      problems[key] = 'Enter a number above zero.'
      return null
    }
    if (integer && !Number.isInteger(n)) {
      problems[key] = 'Enter a whole number.'
      return null
    }
    return n
  }
  const text = (key: CaptureField): string | null => {
    const v = (form[key] as string).trim()
    if (!v) {
      missing.push(key)
      return null
    }
    return v
  }
  let spec: Spec | null = null
  let quantity: Quantity | null = null
  if (family) {
    switch (family) {
      case 'steel_section': {
        const raw = text('section')
        const section = raw ? findSection(raw) : undefined
        if (raw && !section) problems.section = 'Not in the section table. Use a designation such as UB 457x191x67.'
        const lengthM = num('lengthM', false)
        const pieces = num('pieces', true)
        if (section && lengthM !== null) spec = { family, designation: section.designation, lengthM }
        if (pieces !== null) quantity = { kind: 'pieces', pieces }
        break
      }
      case 'curtain_wall': {
        const w = num('panelWidthM', false)
        const h = num('panelHeightM', false)
        const pieces = num('pieces', true)
        if (w !== null && h !== null) spec = { family, system: 'Unitised', panelWidthM: w, panelHeightM: h }
        if (pieces !== null) quantity = { kind: 'pieces', pieces }
        break
      }
      case 'precast_cladding': {
        const t = num('thicknessMm', false)
        const area = num('areaM2', false)
        if (t !== null) spec = { family, thicknessMm: t }
        if (area !== null) quantity = { kind: 'area', areaM2: area }
        break
      }
      case 'stone_cladding': {
        const stone = text('stone')
        const t = num('thicknessMm', false)
        const area = num('areaM2', false)
        if (stone && t !== null) spec = { family, stone, thicknessMm: t }
        if (area !== null) quantity = { kind: 'area', areaM2: area }
        break
      }
      case 'clay_brick': {
        const mortar = text('mortar')
        const pieces = num('pieces', true)
        if (mortar) spec = { family, brickType: 'facing', mortar }
        if (pieces !== null) quantity = { kind: 'pieces', pieces }
        break
      }
      case 'raised_floor': {
        const size = text('panelSize')
        const pieces = num('pieces', true)
        if (size) spec = { family, panelSize: size }
        if (pieces !== null) quantity = { kind: 'pieces', pieces }
        break
      }
      case 'timber_joist': {
        const species = text('species')
        const v = num('volumeM3', false)
        if (species) spec = { family, species }
        if (v !== null) quantity = { kind: 'volume', volumeM3: v }
        break
      }
    }
  }
  if (!form.condition) missing.push('condition')
  if (!form.recoverability) missing.push('recoverability')
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.expectedMonth)) problems.expectedMonth = 'Choose a month.'
  if (family && quantity && !validQuantity(family, quantity)) problems[QUANTITY_KIND[family] === 'pieces' ? 'pieces' : QUANTITY_KIND[family] === 'area' ? 'areaM2' : 'volumeM3'] = 'Enter the quantity.'
  const ok = missing.length === 0 && Object.keys(problems).length === 0 && spec !== null && quantity !== null
  return { ok, missing, problems, spec: ok ? spec : null, quantity: ok ? quantity : null }
}

/** The input for the capture action, or null while the form cannot be saved. */
export function captureInputOf(form: CaptureForm, buildingId: string, photoIds: string[], expectedAvailableFrom: string | null): CaptureInput | null {
  const c = checkCaptureForm(form)
  if (!c.ok || !c.spec || !c.quantity || !form.condition || !form.recoverability) return null
  return { buildingId, spec: c.spec, quantity: c.quantity, condition: form.condition, recoverability: form.recoverability, location: form.location, notes: form.notes, photoIds, expectedAvailableFrom }
}

/** The form after a save with "Save and capture another": the location and the expected month stay. */
export function nextCaptureForm(form: CaptureForm): CaptureForm {
  return { ...emptyCaptureForm(form.expectedMonth), location: form.location }
}

/** The unit a quantity is entered in, for the field's suffix. */
export function quantityUnit(family: FamilyId): string {
  const kind = QUANTITY_KIND[family]
  if (kind === 'area') return 'm2'
  if (kind === 'volume') return 'm3'
  return FAMILIES[family].unitPlural === 'tonnes' || FAMILIES[family].unitPlural === 'm2' ? 'pieces' : FAMILIES[family].unitPlural
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

/** "2027-01" from a year and a month number. */
export function monthKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}
