import { describe, it, expect } from 'vitest'
import { daysBetween, quarterWindow, monthWindow, formatDate, formatQuarter, formatMonth, dateFormats, monthsCeil } from './dates'

describe('dates', () => {
  it('counts whole calendar days in UTC', () => {
    expect(daysBetween('2026-10-07', '2028-04-03')).toBe(544)
    expect(daysBetween('2026-10-07', '2027-04-30')).toBe(205)
    expect(daysBetween('2027-03-15', '2028-04-03')).toBe(385)
    expect(daysBetween('2027-01-20', '2028-04-03')).toBe(439)
    expect(daysBetween('2026-09-01', '2026-10-07')).toBe(36)
  })
  it('builds quarter and month windows', () => {
    expect(quarterWindow('2027-03-15')).toEqual({ start: '2027-01-01', end: '2027-03-31' })
    expect(quarterWindow('2027-04-12')).toEqual({ start: '2027-04-01', end: '2027-06-30' })
    expect(monthWindow('2026-11-15')).toEqual({ start: '2026-11-01', end: '2026-11-30' })
    expect(monthsCeil(544)).toBe(19)
  })
  it('formats dates, quarters and months', () => {
    expect(formatDate('2027-03-15')).toBe('15 March 2027')
    expect(formatQuarter('2027-03-15')).toBe('Q1 2027')
    expect(formatMonth('2026-11-15')).toBe('November 2026')
    expect(dateFormats('2027-03-15')).toEqual(['15 March 2027', '15 Mar 2027', '2027-03-15', '15/03/2027'])
  })
})
