// Discover's query in the address bar: read it back safely (anything unknown falls back to the default) and write
// only what differs from the default, so links stay short and the back button restores every filter.
// Also the project Discover checks fit against: the one in the address, else the person's last choice, else the
// first project they work on.
import type { Condition, FamilyId } from '../../domain/types'
import type { BandLevel, BrowseSort, Typology } from '../../domain/v1types'
import { FAMILIES } from '../../domain/reference/families'
import type { AppData, Viewer } from '../types'
import { projectsOfUser } from '../access'
import { DEFAULT_DISCOVER_QUERY, type DiscoverQuery, type DiscoverTab } from './discover'

/** Anything with get(name), such as URLSearchParams. */
export type ParamReader = { get(name: string): string | null }

const TYPOLOGIES: Typology[] = ['structure', 'envelope', 'finishes']
const CONDITIONS: Condition[] = ['A', 'B', 'C']
const BANDS: BandLevel[] = ['high', 'medium', 'low', 'none']
const SORTS: BrowseSort[] = ['newest', 'carbon', 'price']
const TABS: DiscoverTab[] = ['all', 'shared']

/** The address bar keys, one per query field. */
export const DISCOVER_PARAM = { tab: 'tab', q: 'q', typology: 'type', family: 'family', availableBy: 'by', condition: 'condition', region: 'region', band: 'band', fitsOnly: 'fits', sort: 'sort', projectId: 'project' } as const

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function isoDate(value: string | null): string | null {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

/** The query the address describes. The project comes from `projectId`, already resolved by checkingProjectFor. */
export function discoverQueryFromParams(p: ParamReader, projectId: string | null): DiscoverQuery {
  const family = p.get(DISCOVER_PARAM.family)
  const region = p.get(DISCOVER_PARAM.region)
  return {
    tab: oneOf(p.get(DISCOVER_PARAM.tab), TABS) ?? DEFAULT_DISCOVER_QUERY.tab,
    q: (p.get(DISCOVER_PARAM.q) ?? '').slice(0, 120),
    typology: oneOf(p.get(DISCOVER_PARAM.typology), TYPOLOGIES),
    family: family !== null && family in FAMILIES ? (family as FamilyId) : null,
    availableBy: isoDate(p.get(DISCOVER_PARAM.availableBy)),
    condition: oneOf(p.get(DISCOVER_PARAM.condition), CONDITIONS),
    region: region && region.trim() ? region.slice(0, 80) : null,
    band: oneOf(p.get(DISCOVER_PARAM.band), BANDS),
    fitsOnly: p.get(DISCOVER_PARAM.fitsOnly) === '1',
    sort: oneOf(p.get(DISCOVER_PARAM.sort), SORTS) ?? DEFAULT_DISCOVER_QUERY.sort,
    projectId,
  }
}

/** The address bar entries for a query: only fields that differ from the default. */
export function discoverParamsFor(q: DiscoverQuery): Record<string, string> {
  const out: Record<string, string> = {}
  if (q.tab !== DEFAULT_DISCOVER_QUERY.tab) out[DISCOVER_PARAM.tab] = q.tab
  if (q.q.trim()) out[DISCOVER_PARAM.q] = q.q
  if (q.typology) out[DISCOVER_PARAM.typology] = q.typology
  if (q.family) out[DISCOVER_PARAM.family] = q.family
  if (q.availableBy) out[DISCOVER_PARAM.availableBy] = q.availableBy
  if (q.condition) out[DISCOVER_PARAM.condition] = q.condition
  if (q.region) out[DISCOVER_PARAM.region] = q.region
  if (q.band) out[DISCOVER_PARAM.band] = q.band
  if (q.fitsOnly) out[DISCOVER_PARAM.fitsOnly] = '1'
  if (q.sort !== DEFAULT_DISCOVER_QUERY.sort) out[DISCOVER_PARAM.sort] = q.sort
  if (q.projectId) out[DISCOVER_PARAM.projectId] = q.projectId
  return out
}

/** The query with every Filters popover field cleared; search, tabs, sort and the project stay. */
export function clearDiscoverFilters(q: DiscoverQuery): DiscoverQuery {
  return { ...q, family: null, availableBy: null, condition: null, region: null, band: null, fitsOnly: false }
}

/**
 * The project the viewer checks fit against. A project in the address wins when the viewer works on it; then
 * their stored choice (null means they chose none); with no stored choice, their first project.
 */
export function checkingProjectFor(state: AppData, viewer: Viewer, fromAddress: string | null): string | null {
  const mine = projectsOfUser(state, viewer.userId).map((p) => p.id)
  if (fromAddress && mine.includes(fromAddress)) return fromAddress
  const stored = state.ui.checkingProjectId[viewer.userId]
  if (stored === null) return null
  if (stored !== undefined && mine.includes(stored)) return stored
  return mine[0] ?? null
}
