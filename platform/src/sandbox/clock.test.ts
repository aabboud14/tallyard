import { describe, it, expect, afterEach } from 'vitest'
import { nowIso, setClockForTests, today } from './clock'

afterEach(() => setClockForTests(null))

describe('the one clock', () => {
  it('reads today as a UTC ISO date and now as a timestamp', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(nowIso().slice(0, 10)).toBe(today())
  })

  it('can be pinned for tests by date, timestamp or Date, and released', () => {
    setClockForTests('2027-02-14')
    expect(today()).toBe('2027-02-14')
    expect(nowIso()).toBe('2027-02-14T09:00:00.000Z')
    setClockForTests('2027-02-14T23:59:59.000Z')
    expect(today()).toBe('2027-02-14')
    setClockForTests(new Date(Date.UTC(2028, 0, 1, 0, 0, 0)))
    expect(today()).toBe('2028-01-01')
    setClockForTests(null)
    expect(today()).not.toBe('2028-01-01')
  })
})
