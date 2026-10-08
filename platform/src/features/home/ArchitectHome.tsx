// The architect's home: the day, three figures, the projects with their shortlist progress, what is new for them,
// what waits on the client and what happened lately. A practice with no projects gets a short first-run setup.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, Clock, Compass, FolderKanban, FolderOpen, FolderPlus, Hourglass, Layers, Leaf, Send, Sparkle } from 'lucide-react'
import * as f from '../../domain/format'
import { useView } from '../../store'
import { architectHome, type ProjectCardView, type WaitingItem } from '../../store/selectors/architect'
import { Button, Card, CardHeader, cx, EmptyState, PageHeader, Stat } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { ListingTile } from '../discover/ListingTile'
import { NewProjectDialog } from '../projects/NewProjectDialog'
import { ActivityFeed, ProjectProgress } from '../projects/ProjectParts'

function ProjectCard({ p }: { p: ProjectCardView }) {
  return (
    <Card interactive as="article" className="flex flex-col" data-testid={`home-project-${p.id}`}>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <FolderOpen aria-hidden="true" className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="m-0 truncate text-md font-semibold text-ink">
              <Link to={p.href} className="outline-none after:absolute after:inset-0 after:rounded-lg">
                {p.name}
              </Link>
            </h3>
            <p className="m-0 truncate text-sm text-muted">
              {p.clientName} · {p.typeLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Clock aria-hidden="true" className="size-3.5 text-faint" />
          Needed on site from <span className="font-medium text-ink">{p.startText}</span>
        </div>
        <div className="mt-auto">
          <ProjectProgress counts={p.counts} total={p.total} size="sm" />
        </div>
      </div>
    </Card>
  )
}

function sentText(w: WaitingItem): string {
  if (w.daysWaiting === null) return 'Sent'
  if (w.daysWaiting === 0) return 'Sent today'
  if (w.daysWaiting === 1) return 'Sent yesterday'
  return `Sent ${w.daysWaiting} days ago`
}

function Waiting({ items }: { items: WaitingItem[] }) {
  return (
    <Card>
      <CardHeader title="Waiting on your client" icon={Hourglass} titleAs="h2" actions={items.length > 0 ? <span className="text-sm tabular-nums text-muted">{items.length}</span> : undefined} />
      {items.length === 0 ? (
        <p className="m-0 px-5 py-6 text-sm text-muted">Nothing is waiting. Materials you send for approval appear here until the client decides.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-line-soft p-0" data-testid="waiting-on-client">
          {items.map((w) => (
            <li key={w.itemId}>
              <Link to={w.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:px-5">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info ring-1 ring-inset ring-info-line">
                  <Send aria-hidden="true" className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-medium text-ink">{w.title}</span>
                  <span className="truncate text-sm text-muted">
                    {w.projectName}, {w.clientName}
                  </span>
                </span>
                <span className={cx('shrink-0 text-sm tabular-nums', (w.daysWaiting ?? 0) >= 7 ? 'font-medium text-warning' : 'text-muted')}>{sentText(w)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Welcome({ onCreate }: { onCreate: () => void }) {
  const steps = [
    { icon: FolderPlus, title: 'Create your first project', text: 'Name it, add the client and the date materials are needed on site.' },
    { icon: Compass, title: 'Find materials in Discover', text: 'Every material is checked against your start date.' },
    { icon: Send, title: 'Send your shortlist to the client', text: 'They approve; you export the specification.' },
  ]
  return (
    <Card className="overflow-hidden" data-testid="architect-welcome">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <Sparkle aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="m-0 text-xl font-semibold text-ink">Welcome to your workspace</h2>
            <p className="m-0 mt-1.5 text-base text-muted">Start with a project. Everything you shortlist, send and specify lives inside one.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={FolderPlus} onClick={onCreate} data-testid="welcome-create-project">
              Create a project
            </Button>
            <Button asChild icon={Compass}>
              <Link to="/app/discover">Browse materials first</Link>
            </Button>
          </div>
        </div>
        <ol className="m-0 flex list-none flex-col gap-0 border-t border-line-soft bg-page p-0 lg:border-l lg:border-t-0">
          {steps.map((s, i) => (
            <li key={s.title} className={cx('flex items-start gap-4 px-6 py-5 sm:px-8', i > 0 && 'border-t border-line-soft')}>
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold tabular-nums text-ink-soft ring-1 ring-inset ring-line">{i + 1}</span>
              <div>
                <p className="m-0 font-medium text-ink">{s.title}</p>
                <p className="m-0 mt-0.5 text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  )
}

export function ArchitectHome() {
  const view = useView(architectHome)
  const [params, setParams] = useSearchParams()
  const welcome = params.get('welcome') === '1'
  const [creating, setCreating] = useState(() => welcome)
  if (!view) return null
  const first = view.projects.length === 0
  const closeDialog = (open: boolean) => {
    setCreating(open)
    if (!open && welcome) setParams({}, { replace: true })
  }

  return (
    <Page testId="architect-home">
      <PageHeader
        title={view.greeting}
        subtitle={view.dateText}
        actions={
          <>
            <Button asChild icon={Compass}>
              <Link to="/app/discover">Discover materials</Link>
            </Button>
            <Button variant="primary" icon={FolderPlus} onClick={() => setCreating(true)} data-testid="home-new-project">
              New project
            </Button>
          </>
        }
      />

      {first ? (
        <div className="mt-8">
          <Welcome onCreate={() => setCreating(true)} />
        </div>
      ) : (
        <>
          <dl className="m-0 mt-6 grid grid-cols-3 divide-x divide-line-soft rounded-lg border border-line bg-surface shadow-sm sm:hidden" data-testid="home-stats-compact">
            {[
              { label: 'Projects', value: String(view.stats.activeProjects) },
              { label: 'Shortlisted', value: String(view.stats.shortlisted) },
              { label: 'tCO2e approved', value: f.number(view.stats.avoidedApprovedT, 1) },
            ].map((x) => (
              <div key={x.label} className="flex flex-col gap-0.5 px-3 py-3">
                <dt className="order-2 text-xs text-muted">{x.label}</dt>
                <dd className="order-1 m-0 text-xl font-semibold tabular-nums text-ink">{x.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 grid grid-cols-1 gap-4 max-sm:hidden sm:grid-cols-3" data-testid="home-stats">
            <Stat label="Active projects" value={view.stats.activeProjects} icon={FolderKanban} sub="Where you are the architect" />
            <Stat label="Materials shortlisted" value={view.stats.shortlisted} icon={Layers} sub="Shortlisted, with the client or approved" />
            <Stat label="Carbon avoided" value={f.number(view.stats.avoidedApprovedT, 1)} unit="tCO2e" icon={Leaf} indicative sub="On approved materials, against buying new" />
          </div>

          <section aria-labelledby="your-projects" className="mt-10">
            <SectionTitle
              id="your-projects"
              title="Your projects"
              actions={
                <Link to="/app/projects" className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
                  All projects <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              }
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {view.projects.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        </>
      )}

      <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="new-for-you" className="min-w-0">
          <SectionTitle
            id="new-for-you"
            title="New for your projects"
            description="Listed in the last 30 days and in time for at least one of your projects."
            actions={
              <Link to="/app/discover" className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
                Discover <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            }
          />
          {view.newForProjects.length === 0 ? (
            <EmptyState variant="inline" icon={Compass} title={first ? 'Create a project to see what fits it' : 'Nothing new fits your projects this month'} text="New listings that arrive before your start dates show up here." />
          ) : (
            <div className="@container mt-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-9 @lg:grid-cols-2" data-testid="new-for-projects">
                {view.newForProjects.slice(0, 4).map((c) => (
                  <div key={c.publicId} className="flex flex-col gap-2">
                    <ListingTile card={c} canSave projectId={c.fitsProjects[0]?.id ?? null} />
                    <p className="m-0 px-0.5 text-xs text-muted">
                      In time for {c.fitsProjects.length === 1 ? c.fitsProjects[0].name : `${c.fitsProjects.length} of your projects`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        {first ? null : (
          <div className="flex min-w-0 flex-col gap-6">
            <Waiting items={view.waitingOnClient} />
            <Card>
              <CardHeader title="Recent activity" titleAs="h2" />
              <ActivityFeed rows={view.activity.slice(0, 6)} />
            </Card>
          </div>
        )}
      </div>

      <NewProjectDialog open={creating} onOpenChange={closeDialog} short={first} title={first ? 'Create your first project' : 'New project'} />
    </Page>
  )
}
