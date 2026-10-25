// The sample steel schedule CSV, read through the real CSV parser.
import Papa from 'papaparse'
import type { Requirement, SteelGrade } from '../types'
import { findSection } from '../reference/sections'

export function parseSchedule(csv: string, needBy: string): Requirement[] {
  const parsed = Papa.parse<string[]>(csv.trim(), { skipEmptyLines: true })
  const rows = parsed.data
  if (rows.length < 2) return []
  const out: Requirement[] = []
  for (const r of rows.slice(1)) {
    const [mark, section, lengthMm, qty, grade] = r
    const s = findSection(section ?? '')
    if (!s) throw new Error('Unknown section in schedule: ' + section)
    const g = (grade ?? '').trim().toUpperCase()
    out.push({ ref: (mark ?? '').trim(), designation: s.designation, lengthM: Number(lengthMm) / 1000, count: Number(qty), minGrade: (g === 'S355' || g === 'S275' ? g : 'unknown') as SteelGrade, needBy })
  }
  return out
}
