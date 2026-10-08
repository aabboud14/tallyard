// Browse filters and sort for this browser tab. Kept in memory so they survive opening a listing and coming back;
// Reset demo data clears them.
// The chosen project is the store's browseProjectId (persisted), shared with the listing page.
import { create } from 'zustand'
import type { BrowseFilters, BrowseSort } from '../domain/v1types'
import { NO_FILTERS } from '../domain/v1types'

type BrowseUi = {
  filters: BrowseFilters
  sort: BrowseSort
  patch: (p: Partial<BrowseFilters>) => void
  clear: () => void
  setSort: (s: BrowseSort) => void
  reset: () => void
}

export const useBrowseUi = create<BrowseUi>()((set) => ({
  filters: NO_FILTERS,
  sort: 'newest',
  patch: (p) => set((s) => ({ filters: { ...s.filters, ...p } })),
  clear: () => set({ filters: NO_FILTERS }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ filters: NO_FILTERS, sort: 'newest' }),
}))

/** Any non-null value turns the "fits the project start date" filter on; browseView reads the date from the project. */
export const FITS_ON = 'project'
