import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import path from 'node:path'
import { closeTo } from '../../test/helpers'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { parseBillCells, destinationFrom, streamFromKeywords, confidenceCounts, editRow, normaliseCode, sumOfRows } from './billImport'
import { worksheetCells, cellsFromArrayBuffer, base64ToArrayBuffer } from './billXlsx'
import { SAMPLE_BILL_XLSX_BASE64 } from '../reference/samples'
import { wasteRates, reuseCarbonBenefit, unresolvedNotice } from './waste'
import type { WasteBill } from '../types'

async function loadSample(): Promise<WasteBill> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path.resolve('e2e/fixtures/durnley-house-bill.xlsx'))
  return parseBillCells(worksheetCells(wb.worksheets[0]))
}

describe('B12 bill import (F13), the sample file in C1', () => {
  it('B12.1 header, title rows, total row and 20 data rows', async () => {
    const b = await loadSample()
    expect(b.rows).toHaveLength(20)
    expect(b.titleRows).toBe(2)
    expect(b.totalRows).toBe(1)
  })
  it('B12.2 column mapping reads every field', async () => {
    const b = await loadSample()
    expect(b.rows[0].original).toEqual({ ref: '1', description: 'Concrete crushed for 6F2', code: '17 01 01', quantity: '6,650', unit: 't', route: 'Recycled off site', facility: 'Aggregate recycler, Essex' })
  })
  it('B12.3 confidence counts: 14 high, 5 medium, 1 low', async () => {
    const b = await loadSample()
    const high = [1, 2, 3, 6, 7, 9, 11, 12, 13, 15, 16, 17, 18, 19]
    const medium = [4, 5, 8, 10, 14]
    for (const r of b.rows) {
      const exp = high.includes(r.row) ? 'high' : medium.includes(r.row) ? 'medium' : 'low'
      expect([r.row, r.confidence]).toEqual([r.row, exp])
    }
    expect(confidenceCounts(b)).toEqual({ high: 14, medium: 5, low: 1, edited: 0 })
  })
  it('B12.4 codes, units and the hazardous flag', async () => {
    const b = await loadSample()
    expect(b.rows[1].code).toBe('17 01 01')
    closeTo(b.rows[4].tonnes!, 212.4, 1)
    closeTo(b.rows[17].tonnes!, 24, 1)
    expect(b.rows[18].hazardous).toBe(true)
    expect(normaliseCode('17 06 05*')).toEqual({ code: '17 06 05', hazardous: true, present: true })
  })
  it('B12.5 destinations', async () => {
    const b = await loadSample()
    const d = (n: number) => b.rows[n - 1].destination
    expect(d(1)).toBe('recycled_off_site')
    expect(d(2)).toBe('recycled_on_site')
    expect(d(3)).toBe('recycled_off_site')
    expect(d(4)).toBe('reused_off_site')
    expect(d(8)).toBe('reused_off_site')
    expect(d(11)).toBe('recycled_off_site')
    expect(d(12)).toBe('recovered')
    expect(d(15)).toBe('recovered')
    expect(d(19)).toBe('hazardous_disposal')
    expect(d(20)).toBeNull()
  })
  it('B12.6 stated total matches the sum of the 20 rows', async () => {
    const b = await loadSample()
    closeTo(b.statedTotal!, 11369.2, 1)
    closeTo(sumOfRows(b), 11369.2, 1)
    expect(b.statedTotalMatches).toBe(true)
  })
  it('B12.7 further destination cases', () => {
    expect(destinationFrom('Non-hazardous landfill')).toBe('landfill')
    expect(destinationFrom('Scrap sold to merchant')).toBe('recycled_off_site')
    expect(destinationFrom('Crushed and reused on site')).toBe('recycled_on_site')
    expect(destinationFrom('Materials recovery facility')).toBeNull()
    expect(destinationFrom('Backfill on site')).toBe('recovered')
    expect(destinationFrom('Incineration with energy recovery')).toBe('recovered')
    expect(destinationFrom('Re-used on-site')).toBe('reused_on_site')
    expect(destinationFrom('Sold for resale')).toBe('reused_off_site')
    expect(destinationFrom('Recycling (off-site)')).toBe('recycled_off_site')
    expect(destinationFrom('')).toBeNull()
  })
  it('B12.8 keyword cases', () => {
    expect(streamFromKeywords('Rafters and roof timbers')).toBe('timber')
    expect(streamFromKeywords('Draft excluder strips')).toBeNull()
    expect(streamFromKeywords('RAF tiles')).toBe('raised_floor')
    expect(streamFromKeywords('Stonework copings')).toBe('stone')
    expect(streamFromKeywords('Brickwork')).toBe('brick_block')
    expect(streamFromKeywords('Precast stairs')).toBe('concrete')
    expect(streamFromKeywords('Mixed waste')).toBeNull()
  })
  it('B12.9 the in-app sample (base64) parses the same as the file', async () => {
    const cells = await cellsFromArrayBuffer(base64ToArrayBuffer(SAMPLE_BILL_XLSX_BASE64))
    const b = parseBillCells(cells)
    const f = await loadSample()
    expect(b).toEqual(f)
  })
})

describe('B3 diversion and reuse (F3), Durnley House', () => {
  it('B3.1 before the open row is resolved', async () => {
    const b = await loadSample()
    const r = wasteRates(b.rows, 15800)
    closeTo(r.totalNonHaz, 11349.0, 1)
    closeTo(r.byDestination.recycled_off_site, 9389.0, 1)
    closeTo(r.byDestination.recycled_on_site, 1200.0, 1)
    closeTo(r.byDestination.reused_off_site, 351.0, 1)
    closeTo(r.byDestination.reused_on_site, 0, 1)
    closeTo(r.byDestination.recovered, 123.0, 1)
    closeTo(r.byDestination.landfill, 286.0, 1)
    closeTo(r.diversionRate * 100, 97.47995, 5)
    closeTo(r.reuseRate * 100, 3.09278, 5)
    closeTo(r.hazardousT, 14.2, 1)
    closeTo(r.tonnesPerM2, 0.71829, 5)
    expect(r.unresolved).toEqual({ count: 1, tonnes: 6 })
    expect(unresolvedNotice(r.unresolved)).toBe('1 row (6.0 t) is not counted until it is reviewed')
    expect(unresolvedNotice({ count: 2, tonnes: 10 })).toBe('2 rows (10.0 t) are not counted until they are reviewed')
  })
  it('B3.2 after it is set to mixed_cd, landfill', async () => {
    const b = await loadSample()
    const rows = b.rows.map((r) => (r.row === 20 ? editRow(r, { stream: 'mixed_cd', destination: 'landfill' }) : r))
    expect(rows[19].confidence).toBe('edited')
    const r = wasteRates(rows, 15800)
    closeTo(r.totalNonHaz, 11355.0, 1)
    closeTo(r.byDestination.landfill, 292.0, 1)
    closeTo(r.diversionRate * 100, 97.42845, 5)
    closeTo(r.reuseRate * 100, 3.09115, 5)
    closeTo(r.tonnesPerM2, 0.71867, 5)
    closeTo(r.shares.reused_off_site * 100, 3.0911, 4)
    closeTo(r.shares.recycled_on_site * 100, 10.568, 4)
    closeTo(r.shares.recycled_off_site * 100, 82.686, 4)
    closeTo(r.shares.recovered * 100, 1.0832, 4)
    closeTo(r.shares.landfill * 100, 2.5716, 4)
    expect(r.unresolved.count).toBe(0)
  })
  it('B3.3 potential carbon benefit of off-site reuse', async () => {
    const b = await loadSample()
    const r = reuseCarbonBenefit(b.rows, A)
    const by = (stream: string) => r.rows.find((x) => x.stream === stream)!
    closeTo(by('brick_block').benefit, 7.6544, 4)
    closeTo(by('steel').benefit, 358.956, 3)
    closeTo(by('curtain_wall').benefit, 63.90909, 5)
    closeTo(by('curtain_wall').quantity, 345.4545, 4)
    closeTo(by('stone').benefit, 3.78, 3)
    closeTo(by('raised_floor').benefit, 27.1296, 4)
    closeTo(by('raised_floor').quantity, 864, 0)
    closeTo(r.total, 461.42909, 5)
    expect(r.rows).toHaveLength(5)
  })
})
