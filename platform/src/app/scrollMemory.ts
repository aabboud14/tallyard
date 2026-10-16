// Where the page scroller goes on each navigation, and the positions it remembers per history entry. The rule is
// pure (scrollPlan) so it can be tested; AppShell applies it. A new page starts at the top, or at its #hash target.
// Back and Forward return to where the person was. A change of address on the same page that adds a history entry
// (the sidebar's Marketplace while on a filtered Marketplace, opening a category folder) starts at the top; one
// that replaces the entry (typing a search, a filter) keeps the position. Opening an address afresh (a new tab, a
// pasted link, a reload) goes to its #hash target.

export type NavigationKind = 'POP' | 'PUSH' | 'REPLACE'

export type ScrollPlan = { kind: 'keep' } | { kind: 'top' } | { kind: 'restore'; top: number } | { kind: 'hash'; id: string }

export type ScrollNavigation = {
  type: NavigationKind
  /** The address before this navigation, or null on the first render. */
  prev: { pathname: string; search: string } | null
  next: { pathname: string; search: string; hash: string }
  /** The position remembered for the entry being entered, if the person has been on it in this session. */
  saved: number | undefined
}

/** The element id a location hash names, or '' for none. */
export function hashTarget(hash: string): string {
  if (!hash || hash === '#') return ''
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return hash.slice(1)
  }
}

export function scrollPlan(nav: ScrollNavigation): ScrollPlan {
  const id = hashTarget(nav.next.hash)
  if (nav.type === 'POP') {
    if (nav.saved !== undefined) return { kind: 'restore', top: nav.saved }
    return id ? { kind: 'hash', id } : { kind: 'top' }
  }
  if (nav.prev && nav.prev.pathname === nav.next.pathname) {
    if (nav.type === 'REPLACE') return { kind: 'keep' }
    if (id) return { kind: 'hash', id }
    return nav.prev.search === nav.next.search ? { kind: 'keep' } : { kind: 'top' }
  }
  return id ? { kind: 'hash', id } : { kind: 'top' }
}

const positions = new Map<string, number>()
let current: { key: string; plan: ScrollPlan } | null = null

export const scrollMemory = {
  saved(key: string): number | undefined {
    return positions.get(key)
  },
  record(key: string, top: number) {
    positions.set(key, top)
  },
  /** Records the plan chosen for the entry now shown, so a page can tell whether its position is being restored. */
  planned(key: string, plan: ScrollPlan) {
    current = { key, plan }
  },
  /** True while the shell is returning the person to a remembered position on this entry (Back or Forward). */
  restoring(key: string): boolean {
    return current?.key === key && current.plan.kind === 'restore'
  },
  /** For tests. */
  clear() {
    positions.clear()
    current = null
  },
}
