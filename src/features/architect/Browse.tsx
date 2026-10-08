// The marketplace showroom (brief/09-V1-PRODUCT.md sections 3.3, 6 and 13.9): large visuals, typology chips with counts,
// a "More filters" sheet, a sort, and the project picker that drives the fit tag on each card. Formats only.
import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '../../store/store'
import { browseView } from '../../store/v1selectors'
import { anyFilter, moreFilterCount, typologyCounts } from '../../store/views/market'
import { useBrowseUi, FITS_ON } from '../../store/browseUi'
import { MarketCard, CardGrid } from '../market/MarketCard'
import { Button, EmptyState, PageTitle, cx, selectClass } from '../../components/ui'
import { ChipGroup, Filter, Sheet, type ChipOption } from '../../components/v1'
import type { BandLevel, BrowseSort, Typology } from '../../domain/v1types'
import type { Condition, FamilyId } from '../../domain/types'
import { BAND_WORDS, LABELS, TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { FAMILIES } from '../../domain/reference/families'
import { formatDate } from '../../domain/dates'


const SORT_LABELS: Record<BrowseSort, string> = { newest: 'Newest listed', carbon: 'Most carbon avoided', price: 'Lowest guide price' }

function useIsPhone(): boolean {
  const query = '(max-width: 639px)'
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const m = window.matchMedia?.(query)
    if (!m) return
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

export function Browse() {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const projectId = useStore((s) => s.browseProjectId)
  const setProjectId = useStore((s) => s.setBrowseProjectId)
  const { filters, sort, patch, clear, setSort } = useBrowseUi()
  const [moreOpen, setMoreOpen] = useState(false)
  const phone = useIsPhone()

  const v = browseView(world, personaId, filters, sort, projectId)
  const counts = typologyCounts(world, personaId, filters, sort, projectId)
  const more = moreFilterCount(filters)
  const filtered = anyFilter(filters)

  const typologyOptions: ChipOption<Typology | null>[] = [
    { value: null, label: 'All', count: counts.all },
    ...(['structure', 'envelope', 'finishes'] as const).map((t) => ({ value: t, label: TYPOLOGY_LABELS[t], count: counts[t] })),
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Marketplace" sub="Salvaged materials listed by the owners of buildings coming down. Open a lot for its sizes, timing and carbon." />

      <div className="flex flex-col gap-4 border-b border-rule-soft pb-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <ChipGroup ariaLabel="Typology" options={typologyOptions} value={filters.typology} onChange={(t) => patch({ typology: t })} testId="typology" className={cx('max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:flex-nowrap! max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-1 [&>button]:shrink-0')} />
          {v.projects.length > 0 ? (
            <label className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[260px]">
              <span className="text-xs font-medium text-mill-text">Checking against</span>
              <select className={selectClass} value={v.project?.id ?? ''} onChange={(e) => setProjectId(e.target.value || null)} data-testid="project-picker">
                <option value="">No project</option>
                {v.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button size="lg" onClick={() => setMoreOpen(true)} data-testid="open-more-filters" aria-haspopup="dialog" className="shrink-0 gap-2">
            <Filter size={18} />
            More filters
            {more > 0 ? <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-xs font-medium text-panel tabular-nums">{more}</span> : null}
          </Button>
          <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <span className="sr-only sm:not-sr-only sm:text-sm sm:text-mill-text">Sort</span>
            <select className={cx(selectClass, 'sm:w-auto sm:min-w-[200px]')} value={v.sort} onChange={(e) => setSort(e.target.value as BrowseSort)} data-testid="browse-sort" aria-label="Sort">
              <option value="newest">{SORT_LABELS.newest}</option>
              <option value="carbon">{SORT_LABELS.carbon}</option>
              <option value="price" disabled={!v.priceSortEnabled}>
                {v.priceSortEnabled ? SORT_LABELS.price : `${SORT_LABELS.price} (pick a family first)`}
              </option>
            </select>
          </label>
          <div className="flex w-full items-center justify-between gap-3 sm:ml-auto sm:w-auto">
            {filtered ? (
              <Button variant="quiet" size="lg" onClick={clear} data-testid="clear-filters" className="max-sm:-ml-3">
                Clear filters
              </Button>
            ) : (
              <span />
            )}
            <p className="m-0 text-sm text-mill-text" data-testid="browse-count" aria-live="polite">
              {filtered ? `${v.cards.length} of ${v.total} listings` : `${v.total} listings`}
            </p>
          </div>
        </div>

        {v.project ? (
          <p className="m-0 text-sm text-ink-soft">
            Fit tags check each lot against {v.project.name}, materials needed on site from {formatDate(v.project.startDate)}.{' '}
            <span className="text-mill-text" data-testid="label-L38">
              {LABELS.L38}
            </span>
          </p>
        ) : null}
      </div>

      {v.total === 0 ? (
        <EmptyState hint="Listings appear here when owners publish them to the marketplace." />
      ) : v.cards.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-rule bg-panel px-6 py-10" data-testid="browse-empty">
          <p className="m-0 text-base font-medium">No listings match these filters.</p>
          <p className="m-0 text-sm text-mill-text">Widen the search, or clear the filters to see all {v.total} listings.</p>
          <Button variant="primary" size="lg" className="text-panel" onClick={clear} data-testid="clear-filters-empty">
            Clear filters
          </Button>
        </div>
      ) : (
        <CardGrid testId="browse-grid">
          {v.cards.map((c) => (
            <li key={c.listing.publicId} className="flex">
              <MarketCard card={c} canSave={v.canSave} />
            </li>
          ))}
        </CardGrid>
      )}

      <Sheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        side={phone ? 'bottom' : 'right'}
        title="More filters"
        testId="more-filters"
        footer={
          <>
            <Button variant="quiet" size="lg" onClick={clear} disabled={!filtered}>
              Clear filters
            </Button>
            <Button variant="primary" size="lg" className="text-panel" onClick={() => setMoreOpen(false)} data-testid="more-filters-done">
              {`Show ${v.cards.length} listings`}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <FilterBlock title="Family">
            <ChipGroup<FamilyId | null>
              ariaLabel="Family"
              testId="filter-family"
              value={filters.family}
              onChange={(family) => patch({ family })}
              options={[{ value: null, label: 'All' }, ...v.filterOptions.families.map((id) => ({ value: id, label: FAMILIES[id].label }))]}
            />
          </FilterBlock>
          <FilterBlock title="Available by" hint="Lots in stock always show.">
            <ChipGroup<string | null>
              ariaLabel="Available by"
              testId="filter-available"
              value={filters.availableBy}
              onChange={(availableBy) => patch({ availableBy })}
              options={[{ value: null, label: 'Any time' }, ...v.filterOptions.availability.map((o) => ({ value: o.value, label: o.label }))]}
            />
          </FilterBlock>
          <FilterBlock title="Condition">
            <ChipGroup<Condition | null>
              ariaLabel="Condition"
              testId="filter-condition"
              value={filters.condition}
              onChange={(condition) => patch({ condition })}
              options={[{ value: null, label: 'All' }, ...v.filterOptions.conditions.map((c) => ({ value: c, label: `Condition ${c}` }))]}
            />
          </FilterBlock>
          <FilterBlock title="Location">
            <ChipGroup<string | null>
              ariaLabel="Location"
              testId="filter-region"
              value={filters.region}
              onChange={(region) => patch({ region })}
              options={[{ value: null, label: 'All' }, ...v.filterOptions.regions.map((r) => ({ value: r, label: r }))]}
            />
          </FilterBlock>
          <FilterBlock title="Sustainability band" hint={<span data-testid="label-L37">{LABELS.L37}</span>}>
            <ChipGroup<BandLevel | null>
              ariaLabel="Sustainability band"
              testId="filter-band"
              value={filters.band}
              onChange={(band) => patch({ band })}
              options={[{ value: null, label: 'All' }, ...(['high', 'medium', 'low', 'none'] as const).map((b) => ({ value: b, label: BAND_WORDS[b] }))]}
            />
          </FilterBlock>
          <FilterBlock title="Project start" hint={v.project ? `Hides lots not available in time for ${v.project.name}. Tight lots stay, with their tag.` : 'Choose a project in Checking against to use this filter.'}>
            <label className={cx('flex min-h-[44px] items-center gap-3 rounded-sm border px-3 text-sm', v.project ? 'cursor-pointer border-rule bg-panel' : 'cursor-not-allowed border-rule-soft bg-paper text-mill-text')}>
              <input
                type="checkbox"
                className="h-5 w-5 accent-steel"
                disabled={!v.project}
                checked={!!v.project && filters.fitsStartDate !== null}
                onChange={(e) => patch({ fitsStartDate: e.target.checked ? FITS_ON : null })}
                data-testid="filter-fits"
              />
              Fits the project start date
            </label>
          </FilterBlock>
        </div>
      </Sheet>
    </div>
  )
}

function FilterBlock({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold">{title}</legend>
      {children}
      {hint ? <p className="m-0 text-xs text-mill-text">{hint}</p> : null}
    </fieldset>
  )
}
