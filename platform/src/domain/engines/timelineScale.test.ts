import { describe, it, expect } from 'vitest'
import { daysOnScale, monthStarts, storageRun, timelineScale, TIMELINE_MARGIN_DAYS } from './timelineScale'

describe('timelineScale', () => {
  it('runs from today to the latest date shown plus the margin', () => {
    const s = timelineScale('2026-10-07', '2027-09-06', [{ start: '2027-01-01', end: '2027-03-31' }])
    expect(TIMELINE_MARGIN_DAYS).toBe(45)
    expect(s.end).toBe('2027-10-21')
    expect(s.spanDays).toBe(379)
    expect(daysOnScale(s, '2026-10-07')).toBe(0)
    expect(daysOnScale(s, '2027-09-06')).toBe(334)
  })

  it('reaches past a window that ends after the start date', () => {
    const s = timelineScale('2026-10-07', '2027-01-04', [null, { start: '2027-04-01', end: '2027-06-30' }])
    expect(s.end).toBe('2027-08-14')
  })

  it('never has a zero span', () => {
    const s = timelineScale('2026-10-07', '2026-10-07', [])
    expect(s.spanDays).toBe(TIMELINE_MARGIN_DAYS)
    expect(timelineScale('2026-10-07', '2026-01-01', []).spanDays).toBe(45)
  })

  it('labels every month on a short strip, with the year on the first and on January', () => {
    const s = timelineScale('2026-10-07', '2027-03-01', [])
    expect(s.ticks.map((t) => t.iso)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01'])
    expect(s.ticks.map((t) => t.label)).toEqual(['Nov 2026', 'Dec', 'Jan 2027', 'Feb', 'Mar', 'Apr'])
    expect(s.ticks[0].days).toBe(25)
  })

  it('labels quarters past twelve months and years past thirty six', () => {
    const q = timelineScale('2026-10-07', '2028-03-01', [])
    expect(q.ticks.length).toBeGreaterThan(12)
    expect(q.ticks.filter((t) => t.label !== null).map((t) => t.label)).toEqual(['Jan 2027', 'Apr', 'Jul', 'Oct', 'Jan 2028', 'Apr'])
    const y = timelineScale('2026-10-07', '2030-06-01', [])
    expect(y.ticks.length).toBeGreaterThan(36)
    expect(y.ticks.filter((t) => t.label !== null).map((t) => t.label)).toEqual(['Jan 2027', 'Jan 2028', 'Jan 2029', 'Jan 2030'])
  })
})

describe('monthStarts', () => {
  it('lists the first of each month after the first date, up to the last', () => {
    expect(monthStarts('2026-12-15', '2027-02-01')).toEqual(['2027-01-01', '2027-02-01'])
    expect(monthStarts('2026-12-15', '2026-12-31')).toEqual([])
  })
})

describe('storageRun', () => {
  it('runs from the end of availability to the start when the material is early', () => {
    expect(storageRun({ start: '2027-01-01', end: '2027-03-31' }, 'in_time', '2026-10-07', '2027-09-06')).toEqual({ start: '2027-03-31', end: '2027-09-06' })
  })

  it('runs from today for a material available now', () => {
    expect(storageRun(null, 'now', '2026-10-07', '2027-09-06')).toEqual({ start: '2026-10-07', end: '2027-09-06' })
  })

  it('is absent when the material is late or arrives on the start date', () => {
    expect(storageRun({ start: '2027-07-01', end: '2027-09-30' }, 'late', '2026-10-07', '2027-09-06')).toBeNull()
    expect(storageRun({ start: '2027-08-01', end: '2027-09-06' }, 'tight', '2026-10-07', '2027-09-06')).toBeNull()
  })
})
