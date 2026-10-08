// Projects: every project the person works on, as cards or a table (name, client, type, RIBA stage, when materials
// are needed, shortlist by status, last activity). Architects create projects here.
import { Link } from 'react-router'
import { Clock, FolderOpen, FolderPlus, LayoutGrid, List } from 'lucide-react'
import { formatDateShort } from '../../domain/dates'
import { useApp, useNow, useView } from '../../store'
import { projectsListView, type ProjectListRow } from '../../store/selectors/project'
import { timeAgo } from '../../store/selectors/common'
import { Button, Card, EmptyState, SegmentedControl, Table, TBody, TD, TH, THead, TR } from '../../ui'
import { Page } from '../../app/Page'
import { ProjectProgress } from './ProjectParts'

const SIDE_EMPTY = {
  architect: 'Create a project to start shortlisting materials against its programme.',
  client: 'Projects appear here when your architect adds you as the client.',
  consultant: 'Projects appear here when an architect adds you as the sustainability consultant.',
} as const

function ProjectCardLarge({ p, now }: { p: ProjectListRow; now: string }) {
  return (
    <Card interactive as="article" className="flex flex-col" data-testid={`project-card-${p.id}`}>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <FolderOpen aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-md font-semibold text-ink">
              <Link to={p.href} className="outline-none after:absolute after:inset-0 after:rounded-lg">
                {p.name}
              </Link>
            </h2>
            <p className="m-0 truncate text-sm text-muted">{p.clientName}</p>
          </div>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-muted">Type</dt>
            <dd className="m-0 font-medium text-ink">{p.typeLabel}</dd>
          </div>
          <div>
            <dt className="text-muted">RIBA stage</dt>
            <dd className="m-0 font-medium text-ink">Stage {p.stage}</dd>
          </div>
          <div>
            <dt className="text-muted">Needed from</dt>
            <dd className="m-0 font-medium tabular-nums text-ink">{p.startText}</dd>
          </div>
          <div>
            <dt className="text-muted">Region</dt>
            <dd className="m-0 truncate font-medium text-ink">{p.region}</dd>
          </div>
        </dl>
        <div className="mt-auto flex flex-col gap-3 border-t border-line-soft pt-4">
          <ProjectProgress counts={p.counts} total={p.total} size="sm" />
          {p.lastActivityAt ? (
            <p className="m-0 flex items-center gap-1.5 truncate text-xs text-muted">
              <Clock aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">
                {timeAgo(p.lastActivityAt, now)}: {p.lastActivity}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function ProjectsTable({ rows, now }: { rows: ProjectListRow[]; now: string }) {
  return (
    <Table caption="Projects" data-testid="projects-table">
      <THead>
        <tr>
          <TH>Project</TH>
          <TH>Type</TH>
          <TH>Stage</TH>
          <TH>Needed from</TH>
          <TH align="right">Shortlisted</TH>
          <TH align="right">With client</TH>
          <TH align="right">Approved</TH>
          <TH>Last activity</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((p) => (
          <TR key={p.id} className="relative hover:bg-page">
            <TD>
              <Link to={p.href} className="font-medium text-ink outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-brand-600">
                {p.name}
              </Link>
              <div className="text-sm text-muted">{p.clientName}</div>
            </TD>
            <TD muted>{p.typeLabel}</TD>
            <TD muted>Stage {p.stage}</TD>
            <TD className="whitespace-nowrap">{formatDateShort(p.startDate)}</TD>
            <TD align="right">{p.counts.pending}</TD>
            <TD align="right">{p.counts.sent}</TD>
            <TD align="right">{p.counts.approved}</TD>
            <TD muted className="whitespace-nowrap">
              {p.lastActivityAt ? timeAgo(p.lastActivityAt, now) : 'No activity'}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

export function ProjectsList() {
  const view = useView(projectsListView)
  const layout = useApp((s) => s.ui.projectsLayout)
  const setUi = useApp((s) => s.setUi)
  const now = useNow()
  if (!view) return null
  const side = view.canCreate ? 'architect' : (view.rows[0]?.side ?? 'client')
  return (
    <Page testId="projects-list">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink">Projects</h1>
          <p className="m-0 mt-1 text-base text-muted">
            {view.rows.length} {view.rows.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view.rows.length > 0 ? (
            <SegmentedControl
              label="Layout"
              value={layout}
              onValueChange={(v) => setUi({ projectsLayout: v as 'cards' | 'table' })}
              items={[
                { value: 'cards', label: 'Cards', icon: LayoutGrid, iconOnly: true },
                { value: 'table', label: 'Table', icon: List, iconOnly: true },
              ]}
              className="max-md:hidden"
            />
          ) : null}
          {view.canCreate ? (
            <Button asChild variant="primary" icon={FolderPlus}>
              <Link to="/app/projects/new" data-testid="new-project">
                New project
              </Link>
            </Button>
          ) : null}
        </div>
      </header>
      {view.empty ? (
        <EmptyState
          variant="page"
          icon={FolderOpen}
          title="No projects yet"
          text={SIDE_EMPTY[side]}
          action={
            view.canCreate ? (
              <Button asChild variant="primary" icon={FolderPlus}>
                <Link to="/app/projects/new">New project</Link>
              </Button>
            ) : undefined
          }
          className="mt-6"
        />
      ) : layout === 'table' ? (
        <div className="mt-8 max-md:hidden">
          <ProjectsTable rows={view.rows} now={now} />
        </div>
      ) : null}
      {!view.empty ? (
        <div className={layout === 'table' ? 'mt-8 grid grid-cols-1 gap-4 md:hidden' : 'mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'} data-testid="projects-cards">
          {view.rows.map((p) => (
            <ProjectCardLarge key={p.id} p={p} now={now} />
          ))}
        </div>
      ) : null}
    </Page>
  )
}
