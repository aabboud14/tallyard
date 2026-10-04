// F13. Demolition bill import: a real parser over a table of cells, so it serves .xlsx and .csv alike.
import type { Confidence, Destination, WasteBill, WasteRow } from '../types'
import { STREAM_KEYWORDS, streamForCode } from '../reference/wasteCodes'

export type Cell = string | number | null

type FieldId = 'facility' | 'description' | 'code' | 'quantity' | 'unit' | 'route'

const FIELD_NAMES: { id: FieldId; names: string[] }[] = [
  { id: 'facility', names: ['facility'] },
  { id: 'description', names: ['description'] },
  { id: 'code', names: ['ewc', 'waste code', 'lwc'] },
  { id: 'quantity', names: ['quantity', 'qty', 'tonnage'] },
  { id: 'unit', names: ['unit', 'units', 'uom'] },
  { id: 'route', names: ['disposal route', 'route', 'destination'] },
]

function text(c: Cell): string {
  if (c === null || c === undefined) return ''
  return String(c).trim()
}

function hasPhrase(hay: string, phrase: string): boolean {
  return new RegExp('(^|[^a-z0-9])' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)').test(hay)
}

function isBlankRow(row: Cell[]): boolean {
  return row.every((c) => text(c) === '')
}

export function findHeader(rows: Cell[][]): { index: number; columns: Partial<Record<FieldId | 'ref', number>> } | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (isBlankRow(row)) continue
    const columns: Partial<Record<FieldId | 'ref', number>> = {}
    const used = new Set<number>()
    for (const f of FIELD_NAMES) {
      for (let c = 0; c < row.length; c++) {
        if (used.has(c)) continue
        const t = text(row[c]).toLowerCase()
        if (t && f.names.some((n) => hasPhrase(t, n))) {
          columns[f.id] = c
          used.add(c)
          break
        }
      }
    }
    for (let c = 0; c < row.length; c++) {
      const t = text(row[c]).toLowerCase()
      if (!used.has(c) && (t === 'ref' || t === 'item' || t === 'no')) {
        columns.ref = c
        break
      }
    }
    const matched = FIELD_NAMES.filter((f) => columns[f.id] !== undefined).length
    if (matched >= 3) return { index: i, columns }
  }
  return null
}

export function parseQuantity(c: Cell): number | null {
  if (typeof c === 'number') return c
  const t = text(c).replace(/,/g, '')
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

export function tonnesFrom(quantity: number | null, unit: string): number | null {
  if (quantity === null) return null
  const u = unit.trim().toLowerCase()
  if (u === 't' || u === 'te' || u === 'tonne' || u === 'tonnes') return quantity
  if (u === 'kg') return quantity / 1000
  return null
}

export function normaliseCode(raw: string): { code: string | null; hazardous: boolean; present: boolean } {
  const t = raw.trim()
  if (!t) return { code: null, hazardous: false, present: false }
  const hazardous = /\*\s*$/.test(t)
  const digits = t.replace(/\D/g, '')
  if (digits.length === 6) return { code: `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)}`, hazardous, present: true }
  return { code: null, hazardous, present: true }
}

export function streamFromKeywords(description: string): string | null {
  const d = description.toLowerCase()
  for (const k of STREAM_KEYWORDS) if (k.pattern.test(d)) return k.stream
  return null
}

export function destinationFrom(route: string): Destination | null {
  let t = route.toLowerCase()
  t = t.replace(/[-/,()[\]]/g, ' ')
  t = t.replace(/onsite/g, 'on site').replace(/offsite/g, 'off site')
  t = t.replace(/\s+/g, ' ').trim()
  t = t.replace(/\bre use\b/g, 'reuse').replace(/\bre used\b/g, 'reused')
  t = t.replace(/\bnon hazardous\b/g, '').replace(/\s+/g, ' ').trim()
  if (/haz/.test(t)) return 'hazardous_disposal'
  if (/landfill/.test(t)) return 'landfill'
  if (/crush|recycl|scrap|smelt|aggregate/.test(t)) return /\bon site\b/.test(t) ? 'recycled_on_site' : 'recycled_off_site'
  if (/reuse|reused|resale/.test(t)) return /\bon site\b/.test(t) ? 'reused_on_site' : 'reused_off_site'
  if (/energy|efw|incinerat|backfill/.test(t)) return 'recovered'
  return null
}

function isTotalRow(row: Cell[]): boolean {
  const first = row.map(text).find((t) => t !== '')
  return first !== undefined && /^(sub)?total/i.test(first)
}

export function parseBillCells(rows: Cell[][]): WasteBill {
  const header = findHeader(rows)
  if (!header) throw new Error('No header row found in the bill')
  const col = header.columns
  let titleRows = 0
  for (let i = 0; i < header.index; i++) if (!isBlankRow(rows[i])) titleRows += 1
  const get = (row: Cell[], f: FieldId | 'ref'): Cell => (col[f] === undefined ? null : (row[col[f]!] ?? null))
  const out: WasteRow[] = []
  let statedTotal: number | null = null
  let totalRows = 0
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i]
    if (isBlankRow(row)) continue
    if (isTotalRow(row)) {
      totalRows += 1
      const first = row.map(text).find((t) => t !== '') ?? ''
      if (/^total/i.test(first)) statedTotal = parseQuantity(get(row, 'quantity'))
      continue
    }
    const original = {
      ref: text(get(row, 'ref')),
      description: text(get(row, 'description')),
      code: text(get(row, 'code')),
      quantity: text(get(row, 'quantity')),
      unit: text(get(row, 'unit')),
      route: text(get(row, 'route')),
      facility: text(get(row, 'facility')),
    }
    const qty = parseQuantity(get(row, 'quantity'))
    const tonnes = tonnesFrom(qty, original.unit)
    const codeInfo = normaliseCode(original.code)
    let stream: string | null = null
    let streamFrom: WasteRow['streamFrom'] = 'none'
    if (codeInfo.present) {
      const s = codeInfo.code ? streamForCode(codeInfo.code) : undefined
      if (s) {
        stream = s.id
        streamFrom = 'code'
      }
    } else {
      stream = streamFromKeywords(original.description)
      if (stream) streamFrom = 'keyword'
    }
    const destination = destinationFrom(original.route)
    const hazardous = codeInfo.hazardous || destination === 'hazardous_disposal'
    let confidence: Confidence = 'low'
    if (stream && destination && tonnes !== null) confidence = streamFrom === 'code' ? 'high' : 'medium'
    out.push({ row: out.length + 1, original, stream, streamFrom, code: codeInfo.code, tonnes, destination, hazardous, confidence })
  }
  const sum = out.reduce((s, r) => s + (r.tonnes ?? 0), 0)
  const statedTotalMatches = statedTotal !== null && Math.abs(statedTotal - sum) <= 0.05 + 1e-9
  return { rows: out, titleRows, totalRows, statedTotal, statedTotalMatches }
}

export function sumOfRows(bill: WasteBill): number {
  return bill.rows.reduce((s, r) => s + (r.tonnes ?? 0), 0)
}

export function confidenceCounts(bill: WasteBill): { high: number; medium: number; low: number; edited: number } {
  const c = { high: 0, medium: 0, low: 0, edited: 0 }
  for (const r of bill.rows) c[r.confidence] += 1
  return c
}

/** A row the user corrects is marked "edited" and counts once stream, destination and tonnes are all known. */
export function editRow(row: WasteRow, patch: { stream?: string | null; destination?: Destination | null }): WasteRow {
  const next: WasteRow = { ...row, ...(patch.stream !== undefined ? { stream: patch.stream } : {}), ...(patch.destination !== undefined ? { destination: patch.destination } : {}) }
  next.streamFrom = 'edited'
  next.confidence = 'edited'
  next.hazardous = row.code !== null && /\*/.test(row.original.code) ? true : next.destination === 'hazardous_disposal'
  return next
}
