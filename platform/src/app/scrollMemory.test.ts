// Where the page scroller goes on each navigation (recording audit follow-up, feedback/r2f-market.md): an address
// with #new-for-projects lands on the row however it is opened, Back returns to where the person was, and the
// sidebar's Marketplace from a scrolled Marketplace starts at the top.
import { afterEach, describe, expect, it } from 'vitest'
import { hashTarget, scrollMemory, scrollPlan, type ScrollNavigation } from './scrollMemory'

const market = (search = '', hash = '') => ({ pathname: '/app/marketplace', search, hash })
const nav = (n: Partial<ScrollNavigation> & Pick<ScrollNavigation, 'type' | 'next'>): ScrollNavigation => ({ prev: null, saved: undefined, ...n })

afterEach(() => scrollMemory.clear())

describe('scrollPlan', () => {
  it('goes to the hash target when an address is opened afresh: a new tab, a pasted link or a reload', () => {
    // The first render, and a reload (the history entry is known but nothing was remembered in this page load).
    expect(scrollPlan(nav({ type: 'POP', next: market('?project=p1', '#new-for-projects') }))).toEqual({ kind: 'hash', id: 'new-for-projects' })
    expect(scrollPlan(nav({ type: 'POP', next: market() }))).toEqual({ kind: 'top' })
  })

  it('goes to the hash target when a link with one is followed', () => {
    expect(scrollPlan(nav({ type: 'PUSH', prev: { pathname: '/app/home', search: '' }, next: market('?project=p1', '#new-for-projects') }))).toEqual({ kind: 'hash', id: 'new-for-projects' })
  })

  it('returns to the remembered position on Back and Forward, even when the address has a hash', () => {
    expect(scrollPlan(nav({ type: 'POP', prev: { pathname: '/app/marketplace', search: '?type=structure' }, next: market('?project=p1', '#new-for-projects'), saved: 634 }))).toEqual({ kind: 'restore', top: 634 })
    expect(scrollPlan(nav({ type: 'POP', prev: { pathname: '/app/home', search: '' }, next: market(), saved: 0 }))).toEqual({ kind: 'restore', top: 0 })
  })

  it('starts at the top when a link to the same page with a different address adds a history entry', () => {
    // The sidebar's Marketplace while on /app/marketplace?project=p1, and opening a category folder.
    expect(scrollPlan(nav({ type: 'PUSH', prev: { pathname: '/app/marketplace', search: '?project=p1' }, next: market() }))).toEqual({ kind: 'top' })
    expect(scrollPlan(nav({ type: 'PUSH', prev: { pathname: '/app/marketplace', search: '' }, next: market('?type=structure') }))).toEqual({ kind: 'top' })
  })

  it('keeps the position when the same page only replaces its address (typing a search, a filter)', () => {
    expect(scrollPlan(nav({ type: 'REPLACE', prev: { pathname: '/app/marketplace', search: '' }, next: market('?q=brick') }))).toEqual({ kind: 'keep' })
    expect(scrollPlan(nav({ type: 'PUSH', prev: { pathname: '/app/marketplace', search: '?q=brick' }, next: market('?q=brick') }))).toEqual({ kind: 'keep' })
  })

  it('starts a new page at the top', () => {
    expect(scrollPlan(nav({ type: 'PUSH', prev: { pathname: '/app/marketplace', search: '' }, next: { pathname: '/app/home', search: '', hash: '' } }))).toEqual({ kind: 'top' })
    expect(scrollPlan(nav({ type: 'REPLACE', prev: { pathname: '/signin', search: '' }, next: { pathname: '/app/home', search: '', hash: '' } }))).toEqual({ kind: 'top' })
  })
})

describe('hashTarget', () => {
  it('reads the element id a hash names', () => {
    expect(hashTarget('#new-for-projects')).toBe('new-for-projects')
    expect(hashTarget('#a%20b')).toBe('a b')
    expect(hashTarget('#%E0%A4%A')).toBe('%E0%A4%A')
    expect(hashTarget('#')).toBe('')
    expect(hashTarget('')).toBe('')
  })
})

describe('scrollMemory', () => {
  it('remembers a position per history entry and says when one is being restored', () => {
    scrollMemory.record('a', 120)
    expect(scrollMemory.saved('a')).toBe(120)
    expect(scrollMemory.saved('b')).toBeUndefined()
    scrollMemory.planned('a', { kind: 'restore', top: 120 })
    expect(scrollMemory.restoring('a')).toBe(true)
    expect(scrollMemory.restoring('b')).toBe(false)
    scrollMemory.planned('b', { kind: 'hash', id: 'new-for-projects' })
    expect(scrollMemory.restoring('b')).toBe(false)
  })
})
