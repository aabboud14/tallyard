// The one filter surface (09 section 13.9): a Filters button that opens a popover (a sheet on a phone) with the
// availability month slider, family, condition, location and sustainability band, plus the active filters as
// removable chips above the grid. "Only show what arrives in time" lives on the checking strip.
import { useState, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { BrowseOptions } from '../../domain/engines/browse'
import { FAMILIES } from '../../domain/reference/families'
import { BAND_WORDS } from '../../domain/reference/labels'
import type { DiscoverQuery } from '../../store/selectors/discover'
import type { ProjectRef } from '../../store/selectors/common'
import type { AvailabilityFilterView } from '../../store/selectors/marketplace'
import { Button, cx, Field, Popover, PopoverContent, PopoverTrigger, SegmentedControl, Select, Sheet } from '../../ui'
import { usePhone } from '../../app/media'
import { AvailabilitySlider } from './AvailabilitySlider'

type FilterProps = { query: DiscoverQuery; options: BrowseOptions; availability: AvailabilityFilterView; onChange: (patch: Partial<DiscoverQuery>) => void }

const BAND_OPTIONS = (['high', 'medium', 'low', 'none'] as const).map((b) => ({ value: b, label: BAND_WORDS[b] }))

function FilterFields({ query, options, availability, onChange }: FilterProps) {
  return (
    <div className="flex flex-col gap-5">
      <AvailabilitySlider view={availability} onChange={(availableBy) => onChange({ availableBy })} />
      <div className="border-t border-line-soft" />
      <Field label="Family">
        <Select value={query.family ?? ''} onChange={(e) => onChange({ family: (e.target.value || null) as DiscoverQuery['family'] })} placeholder="Any family" options={options.families.map((f) => ({ value: f, label: FAMILIES[f].label }))} data-testid="filter-family" />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Condition</span>
        <SegmentedControl
          label="Condition"
          value={query.condition ?? 'any'}
          onValueChange={(v) => onChange({ condition: v === 'any' ? null : (v as DiscoverQuery['condition']) })}
          items={[{ value: 'any', label: 'Any' }, ...options.conditions.map((c) => ({ value: c, label: c }))]}
          className="w-full [&>*]:flex-1"
        />
      </div>
      <Field label="Location">
        <Select value={query.region ?? ''} onChange={(e) => onChange({ region: e.target.value || null })} placeholder="Anywhere" options={options.regions.map((r) => ({ value: r, label: r }))} data-testid="filter-region" />
      </Field>
      <Field label="Sustainability band">
        <Select value={query.band ?? ''} onChange={(e) => onChange({ band: (e.target.value || null) as DiscoverQuery['band'] })} placeholder="Any band" options={BAND_OPTIONS} data-testid="filter-band" />
      </Field>
    </div>
  )
}

export function FiltersButton(props: FilterProps & { activeCount: number; onClear: () => void }) {
  const [open, setOpen] = useState(false)
  const phone = usePhone()
  const trigger = (
    <Button icon={SlidersHorizontal} data-testid="filters-button" aria-label={props.activeCount > 0 ? `Filters, ${props.activeCount} on` : 'Filters'} className={cx(props.activeCount > 0 && 'border-ink/25 bg-subtle')}>
      Filters
      {props.activeCount > 0 ? <span className="-mr-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-semibold tabular-nums text-white">{props.activeCount}</span> : null}
    </Button>
  )
  const footer = (
    <>
      <Button variant="ghost" onClick={props.onClear} disabled={props.activeCount === 0}>
        Clear filters
      </Button>
      <Button variant="primary" onClick={() => setOpen(false)}>
        Done
      </Button>
    </>
  )
  if (phone) {
    return (
      <Sheet open={open} onOpenChange={setOpen} side="bottom" title="Filters" trigger={trigger} footer={footer} testId="filters-sheet">
        <FilterFields {...props} />
      </Sheet>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="flex max-h-(--radix-popover-content-available-height) w-[380px] flex-col p-0" data-testid="filters-popover">
        <div className="flex shrink-0 items-center justify-between border-b border-line-soft px-4 py-3">
          <h2 className="m-0 text-base font-semibold text-ink">Filters</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FilterFields {...props} />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line-soft bg-page/70 px-4 py-3">{footer}</div>
      </PopoverContent>
    </Popover>
  )
}

function Chip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface pl-2.5 pr-1 text-sm text-ink max-sm:h-11">
      {children}
      <button type="button" onClick={onRemove} aria-label={`Remove filter: ${label}`} className="inline-flex size-5 items-center justify-center rounded text-faint transition-colors hover:bg-hover hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-brand-600 max-sm:size-9">
        <X aria-hidden="true" className="size-3" />
      </button>
    </span>
  )
}

/** The filters in force, each removable, and Clear all. Nothing when no filter is on. */
export function ActiveFilters({ query, availableByLabel, project, onChange, onClear }: { query: DiscoverQuery; availableByLabel: string | null; project: ProjectRef | null; onChange: (patch: Partial<DiscoverQuery>) => void; onClear: () => void }) {
  const chips: { key: string; label: string; remove: Partial<DiscoverQuery> }[] = []
  if (query.family) chips.push({ key: 'family', label: FAMILIES[query.family].label, remove: { family: null } })
  if (query.availableBy && availableByLabel) chips.push({ key: 'by', label: availableByLabel, remove: { availableBy: null } })
  if (query.condition) chips.push({ key: 'condition', label: `Condition ${query.condition}`, remove: { condition: null } })
  if (query.region) chips.push({ key: 'region', label: query.region, remove: { region: null } })
  if (query.band) chips.push({ key: 'band', label: `Band: ${BAND_WORDS[query.band]}`, remove: { band: null } })
  if (query.fitsOnly && project) chips.push({ key: 'fits', label: `In time for ${project.name}`, remove: { fitsOnly: false } })
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="active-filters">
      {chips.map((c) => (
        <Chip key={c.key} label={c.label} onRemove={() => onChange(c.remove)}>
          {c.label}
        </Chip>
      ))}
      <button type="button" onClick={onClear} className="ml-1 rounded-sm px-1 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-brand-600 max-sm:min-h-11">
        Clear all
      </button>
    </div>
  )
}
