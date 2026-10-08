// The specification workbook: re-open the file and read cells, never bytes. It carries the schedule's public
// fields and the architect's notes, and none of any lot's private strings (P3, 09 section 13.14 P10).
import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { fresh, U, viewer, actor, must } from '../../test/fixtures'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { lotPrivateStrings } from '../../domain/privacy/privateStrings'
import { specificationView } from '../../store/selectors/shortlist'
import { editSpecClauseNote, editSpecHeader } from '../../store/actions/projects'
import type { AppData } from '../../store/types'
import { buildSpecWorkbook, specHeadLines, specTable } from './specExport'

function text(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

async function reopen(buffer: ArrayBuffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  return wb
}

function allText(wb: ExcelJS.Workbook): string[] {
  const out = [wb.creator ?? '', wb.title ?? '']
  wb.eachSheet((ws) => {
    out.push(ws.name)
    ws.eachRow((row) => row.eachCell((c) => out.push(text(c.value))))
  })
  return out.filter(Boolean)
}

function privateStrings(s: AppData): string[] {
  const out = new Set<string>()
  for (const lot of Object.values(s.world.lots)) {
    const item = s.world.items[lot.itemId]
    for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) out.add(x)
  }
  return [...out].filter((x) => x.length >= 4)
}

describe('specTable', () => {
  it('has a row per clause with the status, every field and the note', () => {
    let s = fresh()
    const first = specificationView(s, viewer(U.priya), MERROWGATE_ID, 'approved')!
    s = must(editSpecClauseNote(s, actor(U.priya), MERROWGATE_ID, first.clauses[0].publicId, 'Fabricator to confirm end preparation.')).state
    const view = specificationView(s, viewer(U.priya), MERROWGATE_ID, 'approved')!
    const t = specTable(view)
    expect(t.columns[0]).toBe('Clause')
    expect(t.columns).toContain('Public ID')
    expect(t.columns[t.columns.length - 1]).toBe("Architect's note")
    expect(t.rows).toHaveLength(view.clauses.length)
    expect(t.rows[0][t.columns.indexOf('Public ID')]).toBe(view.clauses[0].publicId)
    expect(t.rows[0][t.columns.length - 1]).toBe('Fabricator to confirm end preparation.')
    for (const r of t.rows) expect(r).toHaveLength(t.columns.length)
  })

  it('says which materials the schedule holds', () => {
    const s = fresh()
    expect(specHeadLines(specificationView(s, viewer(U.priya), MERROWGATE_ID, 'approved')!).lines).toContain('Approved materials.')
    expect(specHeadLines(specificationView(s, viewer(U.priya), MERROWGATE_ID, 'draft')!).lines[1]).toMatch(/^Draft/)
  })
})

describe('buildSpecWorkbook', () => {
  it('writes the title, the header note, the caveats and every clause, and no private string', async () => {
    let s = fresh()
    s = must(editSpecHeader(s, actor(U.priya), MERROWGATE_ID, 'Issued for the stage 3 cost check.')).state
    const view = specificationView(s, viewer(U.priya), MERROWGATE_ID, 'draft')!
    expect(view.clauses.length).toBeGreaterThan(1)
    const wb = await reopen(await buildSpecWorkbook(view, '2026-10-08'))
    const ws = wb.getWorksheet('Draft specification')!
    expect(text(ws.getRow(1).getCell(1).value)).toBe(view.sheet.title)
    const texts = allText(wb)
    expect(texts).toContain('Issued for the stage 3 cost check.')
    for (const c of view.sheet.caveats) expect(texts).toContain(c)
    for (const c of view.clauses) expect(texts).toContain(c.publicId)
    const joined = texts.join('\n')
    for (const p of privateStrings(s)) expect(joined, p).not.toContain(p)
  })
})
