// Discover: the marketplace as a calm showroom. Search, typology tabs with counts, one Filters surface, sort, the
// project every card is checked against, and "Shared with you" for lots owners shared privately with a project.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowDownWideNarrow, Compass, FolderOpen, LockKeyhole, PackageOpen, Search, SearchX, ShieldCheck, X } from 'lucide-react'
import { useNow, useView } from '../../store'
import { discoverView, type DiscoverQuery, type DiscoverView, type SharedGroup } from '../../store/selectors/discover'
import { clearDiscoverFilters } from '../../store/selectors/arch-discover'
import { Button, Card, cx, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, EmptyState, IndicativeMarker, Input, Kbd, Pill } from '../../ui'
import { Page } from '../../app/Page'
import { useHotkey } from '../../app/hotkeys'
import { useMediaQuery } from '../../app/media'
import { ListingTile } from './ListingTile'
import { ProjectPicker } from './ProjectPicker'
import { ActiveFilters, FiltersButton } from './DiscoverFilters'
import { TermsDialog } from './TermsDialog'
import { useDiscoverQuery } from './useDiscoverQuery'

const SORTS: { value: DiscoverQuery['sort']; label: string }[] = [
  { value: 'newest', label: 'Newest listed' },
  { value: 'carbon', label: 'Most carbon avoided' },
  { value: 'price', label: 'Lowest guide price' },
]

const TYPOLOGIES: { value: DiscoverQuery['typology']; key: 'all' | 'structure' | 'envelope' | 'finishes'; label: string }[] = [
  { value: null, key: 'all', label: 'All' },
  { value: 'structure', key: 'structure', label: 'Structure' },
  { value: 'envelope', key: 'envelope', label: 'Envelope' },
  { value: 'finishes', key: 'finishes', label: 'Finishes' },
]

function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  const last = useRef(value)
  // The address bar can change the search (Back, a link); follow it unless the person is typing.
  useEffect(() => {
    if (value !== last.current) {
      last.current = value
      setText(value)
    }
  }, [value])
  useEffect(() => {
    if (text === last.current) return
    const t = setTimeout(() => {
      last.current = text
      onChange(text)
    }, 120)
    return () => clearTimeout(t)
  }, [text, onChange])
  useHotkey('/', (e) => {
    e.preventDefault()
    ref.current?.focus()
  })
  return (
    <Input
      ref={ref}
      type="search"
      icon={Search}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && text) {
          e.stopPropagation()
          setText('')
        }
      }}
      placeholder="Search beams, brick, stone, a location"
      aria-label="Search materials"
      data-testid="discover-search"
      className="w-full min-w-0 xl:w-[320px] xl:shrink-0 [&_input::-webkit-search-cancel-button]:hidden"
      trailing={
        text ? (
          <button type="button" aria-label="Clear search" onClick={() => setText('')} className="inline-flex size-6 items-center justify-center rounded text-faint hover:bg-hover hover:text-ink max-sm:size-9">
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : (
          <Kbd className="mr-1 max-sm:hidden">/</Kbd>
        )
      }
    />
  )
}

function TypologyTabs({ view, onChange }: { view: DiscoverView; onChange: (t: DiscoverQuery['typology']) => void }) {
  return (
    <div role="group" aria-label="Typology" className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-none">
      {TYPOLOGIES.map((t) => {
        const active = view.query.typology === t.value
        const n = view.typologyCounts[t.key]
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.value)}
            data-testid={`typology-${t.key}`}
            className={cx(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:h-10',
              active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-hover hover:text-ink',
            )}
          >
            {t.label}
            <span className={cx('tabular-nums', active ? 'text-white/70' : 'text-faint')}>{n}</span>
          </button>
        )
      })}
    </div>
  )
}

function SortMenu({ view, onChange }: { view: DiscoverView; onChange: (s: DiscoverQuery['sort']) => void }) {
  const current = SORTS.find((s) => s.value === view.sort) ?? SORTS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" icon={ArrowDownWideNarrow} data-testid="sort-menu" className="text-ink-soft">
          <span className="max-sm:sr-only">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={view.sort} onValueChange={(v) => onChange(v as DiscoverQuery['sort'])}>
          {SORTS.map((s) => (
            <DropdownMenuRadioItem key={s.value} value={s.value} disabled={s.value === 'price' && !view.priceSortEnabled} className="items-start py-2">
              <span className="flex flex-col">
                <span>{s.label}</span>
                {s.value === 'price' && view.priceSortHint ? <span className="whitespace-normal text-xs leading-4 text-muted">{view.priceSortHint}</span> : null}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Grid({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div className="@container">
      <div data-testid={testId} className="grid grid-cols-1 gap-x-6 gap-y-9 @lg:grid-cols-2 @3xl:grid-cols-3 @7xl:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

function SharedGroupSection({ group }: { group: SharedGroup }) {
  const p = group.project
  return (
    <section aria-labelledby={`shared-${p.id}`} className="flex flex-col gap-5" data-testid={`shared-group-${p.id}`}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line-soft pb-3">
        <div className="min-w-0">
          <h2 id={`shared-${p.id}`} className="m-0 flex items-center gap-2 text-lg font-semibold text-ink">
            <FolderOpen aria-hidden="true" className="size-4 text-muted" />
            <Link to={`/app/projects/${p.id}`} className="rounded-sm hover:underline hover:underline-offset-4">
              {p.name}
            </Link>
          </h2>
          <p className="m-0 mt-1 text-sm text-muted">Shared with this project by the owner, in confidence. Materials needed from {p.startText}.</p>
        </div>
        <Pill tone={group.termsAccepted ? 'brand' : 'neutral'} icon={group.termsAccepted ? ShieldCheck : LockKeyhole}>
          {group.termsAccepted ? 'Terms accepted' : 'Terms not yet accepted'}
        </Pill>
      </div>
      {group.termsAccepted ? (
        group.cards.length > 0 ? (
          <Grid>
            {group.cards.map((c) => (
              <ListingTile key={c.publicId} card={c} canSave projectId={p.id} />
            ))}
          </Grid>
        ) : (
          <EmptyState variant="inline" icon={PackageOpen} title="Nothing shared with this project right now" text="Lots come back here if an owner shares them again." />
        )
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-soft ring-1 ring-inset ring-line">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 font-semibold text-ink">
                {group.sharedCount} {group.sharedCount === 1 ? 'lot is' : 'lots are'} shared privately with {p.name}
              </p>
              <p className="m-0 mt-1 text-sm text-muted">Accept the confidentiality terms for this project to see them. They stay out of the open marketplace.</p>
            </div>
            <TermsDialog projectId={p.id} projectName={p.name} count={group.sharedCount} trigger={<Button variant="primary" icon={ShieldCheck} data-testid={`review-terms-${p.id}`}>Review terms</Button>} />
          </div>
        </Card>
      )}
    </section>
  )
}

export function Discover() {
  const { query, update, replace, setProject } = useDiscoverQuery()
  const view = useView(discoverView, query)
  const today = useNow().slice(0, 10)
  const wide = useMediaQuery('(min-width: 1280px)')
  if (!view) return null
  const shared = view.tab === 'shared'
  const clearFilters = () => replace(clearDiscoverFilters(query))
  const clearEverything = () => replace({ ...clearDiscoverFilters(query), q: '', typology: null })
  const pendingShared = view.pendingSharedCount
  const controls = (
    <>
      <FiltersButton query={query} options={view.filterOptions} project={view.project} today={today} onChange={update} activeCount={view.activeFilterCount} onClear={clearFilters} />
      <SortMenu view={view} onChange={(sort) => update({ sort })} />
    </>
  )

  return (
    <Page width="wide" testId="discover">
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-2xl font-semibold text-ink">Discover</h1>
            <p className="m-0 mt-1 max-w-xl text-base text-muted">Reclaimed structure, envelope and finishes from buildings coming down across London and the South East.</p>
          </div>
          {shared ? null : <ProjectPicker projects={view.projects} value={view.project} onChange={setProject} className="md:shrink-0" />}
        </div>
        <nav aria-label="Discover sections" className="-mb-px flex gap-6 border-b border-line">
          {[
            { tab: 'all' as const, label: 'Marketplace', count: view.total },
            { tab: 'shared' as const, label: 'Shared with you', count: view.sharedCount, dot: pendingShared > 0 },
          ].map((t) => {
            const active = view.tab === t.tab
            return (
              <button
                key={t.tab}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => update({ tab: t.tab })}
                data-testid={`tab-${t.tab}`}
                className={cx(
                  'relative inline-flex h-11 items-center gap-2 text-base transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600',
                  active ? 'font-medium text-ink after:bg-ink' : 'text-muted hover:text-ink',
                )}
              >
                {t.label}
                <span className={cx('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums', active ? 'bg-ink text-white' : 'bg-subtle text-muted ring-1 ring-inset ring-line-soft')}>{t.count}</span>
                {t.dot ? <span aria-label={`${pendingShared} waiting for the terms`} className="size-1.5 rounded-full bg-brand-600" /> : null}
              </button>
            )
          })}
        </nav>
      </header>

      {shared ? (
        <div className="mt-8 flex flex-col gap-12" data-testid="shared-with-you">
          {view.shared.length === 0 ? (
            <EmptyState
              variant="page"
              icon={LockKeyhole}
              title="Nothing is shared with your projects yet"
              text="When an asset owner shares lots privately with one of your projects, they appear here behind the confidentiality terms for that project."
              action={
                <Button onClick={() => update({ tab: 'all' })} icon={Compass}>
                  Browse the marketplace
                </Button>
              }
            />
          ) : (
            view.shared.map((g) => <SharedGroupSection key={g.project.id} group={g} />)
          )}
        </div>
      ) : (
        <>
          <div className="z-20 -mx-4 mt-5 flex flex-col gap-3 bg-surface/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:sticky md:top-14 lg:top-0 lg:-mx-8 lg:px-8">
            {wide ? (
              <div className="flex items-center gap-3">
                <SearchBox value={query.q} onChange={(q) => update({ q })} />
                <TypologyTabs view={view} onChange={(typology) => update({ typology, family: null })} />
                <div className="ml-auto flex shrink-0 items-center gap-1.5">{controls}</div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchBox value={query.q} onChange={(q) => update({ q })} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">{controls}</div>
                </div>
                <TypologyTabs view={view} onChange={(typology) => update({ typology, family: null })} />
              </>
            )}
            <ActiveFilters query={query} options={view.filterOptions} project={view.project} today={today} onChange={update} onClear={clearFilters} />
          </div>

          <div className="mb-5 mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted" data-testid="results-line">
            <span>
              <span className="font-medium tabular-nums text-ink">{view.cards.length}</span> {view.cards.length === 1 ? 'material' : 'materials'}
              {view.cards.length !== view.total ? <span> of {view.total}</span> : null}
            </span>
            {view.project ? (
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                Timeline checked against {view.project.name}, materials needed from {view.project.startText}
                <IndicativeMarker />
              </span>
            ) : (
              <span>Choose a project to check each material against its start date.</span>
            )}
          </div>

          {view.empty === 'no_listings' ? (
            <EmptyState variant="page" icon={PackageOpen} title="Nothing is listed yet" text="Materials appear here as asset owners publish them. Shared lots for your projects are under Shared with you." />
          ) : view.empty === 'no_results' ? (
            <EmptyState
              variant="page"
              icon={SearchX}
              title="No materials match"
              text={query.q ? `Nothing matches "${query.q}" with these filters. Try fewer words or clear the filters.` : 'Nothing matches these filters. Try removing one.'}
              action={<Button onClick={clearEverything}>Clear search and filters</Button>}
              testId="discover-no-results"
            />
          ) : (
            <Grid testId="discover-grid">
              {view.cards.map((c, i) => (
                <ListingTile key={c.publicId} card={c} canSave={view.canSave} projectId={view.project?.id ?? null} eager={i < 6} />
              ))}
            </Grid>
          )}
        </>
      )}
    </Page>
  )
}
