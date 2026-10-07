// Run under both TZ=UTC and TZ=Pacific/Auckland: the result must not move with the clock's zone.
import { describe, it, expect } from 'vitest'
import type { Availability } from '../types'
import { addDays } from '../dates'
import { DEMO_TODAY } from '../constants'
import { TIMELINE_TEXT } from '../reference/labels'
import { V1_ASSUMPTIONS } from '../reference/v1assumptions'
import { timelineFit } from './timeline'

const now: Availability = { kind: 'now' }
const window = (start: string, end: string, label = 'Window'): Availability => ({ kind: 'window', level: 'quarter', label, windowStart: start, windowEnd: end })
const q1_2027 = window('2027-01-01', '2027-03-31', 'Q1 2027')
const q2_2027 = window('2027-04-01', '2027-06-30', 'Q2 2027')
const q3_2027 = window('2027-07-01', '2027-09-30', 'Q3 2027')

describe('timelineFit', () => {
  it('uses a 60 day tight band by default', () => {
    expect(V1_ASSUMPTIONS.timeline.tightDays).toBe(60)
  })

  describe('available now', () => {
    it('counts storage from today to the start: 243 days is 9 months', () => {
      expect(timelineFit(now, '2027-06-07')).toEqual({ fit: 'now', storageMonths: 9, text: TIMELINE_TEXT.now })
    })

    it('rounds part months up on both sides of a 30 day step', () => {
      expect(timelineFit(now, addDays(DEMO_TODAY, 30)).storageMonths).toBe(1)
      expect(timelineFit(now, addDays(DEMO_TODAY, 31)).storageMonths).toBe(2)
      expect(timelineFit(now, addDays(DEMO_TODAY, 1)).storageMonths).toBe(1)
    })

    it('floors storage at zero when the start is today or past', () => {
      expect(timelineFit(now, DEMO_TODAY).storageMonths).toBe(0)
      expect(Object.is(timelineFit(now, '2026-09-01').storageMonths, 0)).toBe(true)
    })

    it('takes another today', () => {
      expect(timelineFit(now, '2027-06-07', '2027-05-08').storageMonths).toBe(1)
    })
  })

  describe('in time', () => {
    it('reads the worked examples: Q1 2027 against 4 October 2027 is 187 days, 7 months', () => {
      expect(timelineFit(q1_2027, '2027-10-04')).toEqual({ fit: 'in_time', storageMonths: 7, text: TIMELINE_TEXT.in_time })
      expect(timelineFit(q1_2027, '2028-04-03')).toEqual({ fit: 'in_time', storageMonths: 13, text: 'Available in time' })
      expect(timelineFit(q1_2027, '2027-06-07')).toEqual({ fit: 'in_time', storageMonths: 3, text: 'Available in time' })
    })

    it('is in time when the window ends exactly 60 days before the start, tight at 59', () => {
      expect(timelineFit(q1_2027, addDays('2027-03-31', 60))).toEqual({ fit: 'in_time', storageMonths: 2, text: TIMELINE_TEXT.in_time })
      expect(timelineFit(q1_2027, addDays('2027-03-31', 59))).toEqual({ fit: 'tight', storageMonths: 2, text: TIMELINE_TEXT.tight })
    })

    it('takes another tight band', () => {
      expect(timelineFit(q1_2027, '2027-06-07', DEMO_TODAY, 90).fit).toBe('tight')
      expect(timelineFit(q1_2027, '2027-06-07', DEMO_TODAY, 68).fit).toBe('in_time')
      expect(timelineFit(q1_2027, '2027-06-07', DEMO_TODAY, 69).fit).toBe('tight')
    })
  })

  describe('tight', () => {
    it('reads Q2 2027 against 7 June 2027 as tight with no storage', () => {
      const r = timelineFit(q2_2027, '2027-06-07')
      expect(r).toEqual({ fit: 'tight', storageMonths: 0, text: TIMELINE_TEXT.tight })
      expect(Object.is(r.storageMonths, 0)).toBe(true)
    })

    it('is tight when the window starts on the start date, late a day earlier', () => {
      expect(timelineFit(q2_2027, '2027-04-01')).toEqual({ fit: 'tight', storageMonths: 0, text: TIMELINE_TEXT.tight })
      expect(timelineFit(q2_2027, '2027-03-31')).toEqual({ fit: 'late', storageMonths: null, text: TIMELINE_TEXT.late })
    })

    it('reads a month window ending 56 days before the start as tight, 2 months', () => {
      const nov = { kind: 'window', level: 'month', label: 'November 2026', windowStart: '2026-11-01', windowEnd: '2026-11-30' } as const
      expect(timelineFit(nov, '2027-01-25')).toEqual({ fit: 'tight', storageMonths: 2, text: TIMELINE_TEXT.tight })
    })

    it('is tight when the window ends on the start date, in time a band earlier', () => {
      expect(timelineFit(q1_2027, '2027-03-31').fit).toBe('tight')
      expect(timelineFit(q1_2027, '2027-03-31').storageMonths).toBe(0)
    })
  })

  describe('late', () => {
    it('reads a Q3 2027 window against 7 June 2027 as not available in time', () => {
      expect(timelineFit(q3_2027, '2027-06-07')).toEqual({ fit: 'late', storageMonths: null, text: 'Not available in time' })
    })
  })

  it('uses the four fixed phrases', () => {
    expect(TIMELINE_TEXT).toEqual({
      in_time: 'Available in time',
      tight: 'Tight: available close to the start date',
      late: 'Not available in time',
      now: 'Available now: storage until the start',
    })
  })
})
