// The command palette's results: the search index ranked for the query, grouped by kind in a fixed order, with a
// thumbnail for materials taken from the public listing.
import type { Spec } from '../../domain/types'
import type { AppData, Viewer } from '../types'
import { listingOf, lotByPublicId } from '../lots'
import { searchEntries, searchIndex, SEARCH_KIND_LABELS, type SearchEntry, type SearchKind } from './search'

export type SearchResult = SearchEntry & { thumb: { spec: Spec; publicId: string } | null }

export type SearchGroup = { kind: SearchKind; heading: string; results: SearchResult[] }

const ORDER: SearchKind[] = ['page', 'project', 'building', 'material', 'item']

export function searchResults(state: AppData, viewer: Viewer, query: string, limit = 24): SearchGroup[] {
  const found = searchEntries(searchIndex(state, viewer), query, limit)
  return ORDER.map((kind) => ({
    kind,
    heading: SEARCH_KIND_LABELS[kind],
    results: found
      .filter((e) => e.kind === kind)
      .map((e) => {
        if (kind !== 'material') return { ...e, thumb: null }
        const publicId = e.id.slice('material:'.length)
        const lot = lotByPublicId(state.world, publicId)
        return { ...e, thumb: lot ? { spec: listingOf(state.world, lot).spec, publicId } : null }
      }),
  })).filter((g) => g.results.length > 0)
}
