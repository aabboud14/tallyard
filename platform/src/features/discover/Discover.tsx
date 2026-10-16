// The Marketplace (code name Discover): a calm showroom. It opens on three category folders, then New for your
// projects (architects), then every material. The checking strip shows the project every card is checked against
// with its fit counts; the sticky toolbar holds search, typology tabs, Filters (with the availability month slider)
// and the sort each role is offered. "Shared with you" holds lots owners shared privately with a project.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigationType } from 'react-router'
import { ArrowDownWideNarrow, FolderOpen, LockKeyhole, PackageOpen, Search, ShieldCheck, Store, X } from 'lucide-react'
import { useView } from '../../store'
import { NEW_FOR_PROJECTS_ANCHOR } from '../../store/paths'
import { discoverView, type DiscoverQuery, type DiscoverView, type SharedGroup } from '../../store/selectors/discover'
import { clearDiscoverFilters } from '../../store/selectors/arch-discover'
import { Button, Card, cx, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, EmptyState, Input, Kbd, Pill } from '../../ui'
import { Page } from '../../app/Page'
import { useHotkey } from '../../app/hotkeys'
import { useMediaQuery } from '../../app/media'
import { ListingTile } from './ListingTile'
import { ActiveFilters, FiltersButton } from './DiscoverFilters'
import { CheckingBar } from './CheckingBar'
import { CategoryFolders } from './CategoryFolders'
import { NewForProjectsJumpLink, NewForProjectsRow } from './NewForProjectsRow'
import { scrollToNewForProjects } from './scrollToRow'
import { FolderHeader } from './FamilyChips'
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

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (q: string) => void; placeholder: string }) {
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
      placeholder={placeholder}
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
    <div role="group" aria-label="Typology" className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-none max-sm:gap-0.5">
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
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 max-sm:h-11 max-sm:px-2',
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
        <Button variant="ghost" icon={ArrowDownWideNarrow} data-testid="sort-menu" aria-label={`Sort: ${current.label}`} className="text-ink-soft max-sm:size-11 max-sm:px-0">
          <span className="max-sm:sr-only">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={view.sort} onValueChange={(v) => onChange(v as DiscoverQuery['sort'])}>
          {SORTS.filter((s) => view.sortOptions.includes(s.value)).map((s) => (
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

function SharedGroupSection({ group, canSave }: { group: SharedGroup; canSave: boolean }) {
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
              <ListingTile key={c.publicId} card={c} canSave={canSave} projectId={p.id} />
            ))}
          </Grid>
        ) : (
          <EmptyState variant="inline" icon={PackageOpen} title="Nothing shared with this project right now" text="Lots come back here if an owner shares them again." />
        )
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <LockKeyhole aria-hidden="true" className="size-5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="m-0 font-semibold text-ink">
                {group.sharedCount} {group.sharedCount === 1 ? 'lot is' : 'lots are'} shared privately with {p.name}
              </p>
              <p className="m-0 mt-1 text-sm text-muted">
                {group.canAccept ? 'Accept the confidentiality terms for this project to see them. They stay out of the open marketplace.' : 'They show here once the architect or the client accepts the confidentiality terms for this project. They stay out of the open marketplace.'}
              </p>
            </div>
            {group.canAccept ? <TermsDialog projectId={p.id} projectName={p.name} count={group.sharedCount} trigger={<Button variant="primary" icon={ShieldCheck} data-testid={`review-terms-${p.id}`}>Review terms</Button>} /> : null}
          </div>
        </Card>
      )}
    </section>
  )
}

function ResultsLine({ view }: { view: DiscoverView }) {
  return (
    <p className="m-0 text-sm text-muted" data-testid="results-line" aria-live="polite">
      <span className="font-medium tabular-nums text-ink">{view.cards.length}</span> {view.cards.length === 1 ? 'material' : 'materials'}
      {view.cards.length !== view.total ? <span> of {view.total}</span> : null}
    </p>
  )
}

export function Discover() {
  const { query, update, replace, setProject } = useDiscoverQuery()
  const view = useView(discoverView, query)
  const wide = useMediaQuery('(min-width: 1280px)')
  const phone = useMediaQuery('(max-width: 639px)')
  const placeholder = phone ? 'Search' : 'Search beams, brick, stone'
  // A link to #new-for-projects (the home's "{n} new materials fit") lands on the row, clear of the sticky toolbar.
  // Back keeps the position it returns to, so only a new visit scrolls.
  const location = useLocation()
  const navigationType = useNavigationType()
  const rowShown = !!view && view.landing && view.newForProjects.length > 0
  useEffect(() => {
    if (navigationType === 'POP' || location.hash !== `#${NEW_FOR_PROJECTS_ANCHOR}` || !rowShown) return
    const frame = requestAnimationFrame(() => scrollToNewForProjects())
    return () => cancelAnimationFrame(frame)
  }, [location.key, location.hash, navigationType, rowShown])
  if (!view) return null
  const shared = view.tab === 'shared'
  const clearFilters = () => replace(clearDiscoverFilters(query))
  const clearEverything = () => replace({ ...clearDiscoverFilters(query), q: '', typology: null })
  const pendingShared = view.pendingSharedCount
  const folder = query.typology && !query.q.trim() ? (view.folders.find((f) => f.typology === query.typology) ?? null) : null
  const controls = (
    <>
      <FiltersButton query={query} options={view.filterOptions} availability={view.availability} onChange={update} activeCount={view.activeFilterCount} onClear={clearFilters} />
      <SortMenu view={view} onChange={(sort) => update({ sort })} />
    </>
  )
  const checking = (
    <CheckingBar
      projects={view.projects}
      project={view.project}
      sketch={view.projectSketch}
      summary={view.fitSummary}
      fitsOnly={query.fitsOnly}
      canCreateProject={view.canCreateProject}
      onProject={setProject}
      onFitsOnly={(fitsOnly) => update({ fitsOnly })}
      jump={view.landing ? view.newForProjectsJump : null}
    />
  )

  return (
    <Page width="wide" testId="discover">
      <header className="flex flex-col gap-5">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-semibold text-ink">Marketplace</h1>
          <p className="m-0 mt-1 max-w-2xl text-base text-muted">Reclaimed structure, envelope and finishes from buildings coming down across London and the South East.</p>
        </div>
        <nav aria-label="Marketplace sections" className="-mb-px flex gap-6 border-b border-line">
          {[
            { tab: 'all' as const, label: 'All listings', count: view.total },
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
                  'relative inline-flex h-11 items-center gap-2 text-base transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600',
                  active ? 'font-medium text-ink after:bg-ink' : 'text-muted hover:text-ink',
                )}
              >
                {t.label}
                <span className={cx('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] px-1.5 text-2xs font-medium tabular-nums', active ? 'bg-ink text-white' : 'bg-subtle text-muted ring-1 ring-inset ring-line-soft')}>{t.count}</span>
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
              illustration="inbox"
              title={view.sharedNote ? 'Shared lots stay with the architect and client' : 'Nothing is shared with your projects yet'}
              text={view.sharedNote ?? 'When a donor building owner shares lots privately with one of your projects, they appear here behind the confidentiality terms for that project.'}
              action={
                <Button onClick={() => update({ tab: 'all' })} icon={Store}>
                  Browse the Marketplace
                </Button>
              }
            />
          ) : (
            view.shared.map((g) => <SharedGroupSection key={g.project.id} group={g} canSave={view.canSave} />)
          )}
        </div>
      ) : (
        <>
          {view.project ? null : <div className="mt-6">{checking}</div>}
          <div className={cx('z-20 -mx-4 flex flex-col gap-3 bg-surface px-4 py-3 sm:-mx-6 sm:px-6 md:sticky md:top-14 lg:top-0 lg:-mx-8 lg:px-8', view.project ? 'mt-6' : 'mt-3')} data-testid="discover-toolbar">
            {view.project ? checking : null}
            {wide ? (
              <div className="flex items-center gap-3">
                <SearchBox value={query.q} onChange={(q) => update({ q })} placeholder={placeholder} />
                <TypologyTabs view={view} onChange={(typology) => update({ typology, family: null })} />
                <div className="ml-auto flex shrink-0 items-center gap-1.5">{controls}</div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchBox value={query.q} onChange={(q) => update({ q })} placeholder={placeholder} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">{controls}</div>
                </div>
                <TypologyTabs view={view} onChange={(typology) => update({ typology, family: null })} />
              </>
            )}
            <ActiveFilters query={query} availableByLabel={view.availableByLabel} project={view.project} onChange={update} onClear={clearFilters} />
          </div>

          {view.landing && view.empty !== 'no_listings' ? (
            <div className="mt-6 flex flex-col gap-12">
              <CategoryFolders
                folders={view.folders}
                project={view.project}
                onOpen={(typology) => update({ typology, family: null }, { push: true })}
                aside={!view.project && view.newForProjectsJump ? <NewForProjectsJumpLink jump={view.newForProjectsJump} /> : null}
              />
              <NewForProjectsRow key={view.project?.id ?? 'all'} cards={view.newForProjects} more={view.newForProjectsMore} total={view.newForProjectsTotal} project={view.project} />
            </div>
          ) : null}

          {folder && view.familyChips ? (
            <div className="mt-4">
              <FolderHeader folder={folder} chips={view.familyChips} total={view.typologyCounts[folder.typology]} onAll={() => update({ typology: null, family: null })} onFamily={(family) => update({ family })} />
            </div>
          ) : null}

          <div className={cx('mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1', view.landing ? 'mt-12 border-t border-line-soft pt-8' : 'mt-5')}>
            {view.landing ? (
              <h2 className="m-0 text-lg font-semibold text-ink" id="all-materials-h">
                All materials
              </h2>
            ) : null}
            <ResultsLine view={view} />
          </div>

          {view.empty === 'no_listings' ? (
            <EmptyState variant="page" illustration="materials" title="Nothing is listed yet" text="Materials appear here as donor building owners publish them. Shared lots for your projects are under Shared with you." />
          ) : view.empty === 'no_results' ? (
            <EmptyState
              variant="page"
              illustration="search"
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
