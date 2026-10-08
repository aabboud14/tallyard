// The project workspace: a header with the project's facts and team, then the tabs for the person's side on the
// project (architect, client or consultant). Each tab is its own route.
import { Link, Outlet, useLocation, useParams } from 'react-router'
import { Building, CalendarClock, Compass, FolderOpen, MapPin, PencilLine } from 'lucide-react'
import { useView } from '../../store'
import { projectHeader } from '../../store/selectors/project'
import { AvatarStack, Button, Tabs, type AvatarColourName } from '../../ui'
import { AppNotFound } from '../../app/NoAccess'
import { discoverHref } from '../discover/links'
import { EditProjectDialog } from './EditProjectDialog'

const SIDE_LABEL = { architect: 'You are the architect', client: 'You are the client', consultant: 'You are the sustainability consultant' } as const

export function ProjectLayout() {
  const { projectId = '' } = useParams()
  const { pathname } = useLocation()
  const header = useView(projectHeader, projectId)
  if (!header) return <AppNotFound />
  const base = `/app/projects/${projectId}`
  return (
    <div data-testid="project-layout" data-side={header.side}>
      <div className="border-b border-line bg-gradient-to-b from-page to-surface print:hidden">
        <div className="mx-auto w-full max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(28_25_23/0.2)]">
                <FolderOpen aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="m-0 text-2xl font-semibold text-ink" data-testid="project-name">
                  {header.name}
                </h1>
                <p className="m-0 mt-1 text-base text-muted">
                  {header.typeLabel} for {header.clientName}
                  <span className="text-faint"> · </span>
                  {header.stageLabel}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <AvatarStack people={header.team.map((t) => ({ name: t.name, colour: t.colour as AvatarColourName }))} max={5} size="md" className="mr-2 max-sm:hidden" />
              {header.side === 'architect' ? (
                <>
                  <EditProjectDialog projectId={projectId} trigger={<Button icon={PencilLine}>Edit</Button>} />
                  <Button asChild variant="primary" icon={Compass}>
                    <Link to={discoverHref(projectId)} data-testid="find-materials">
                      Find materials
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock aria-hidden="true" className="size-4 text-faint" />
              Materials needed on site from <span className="font-medium text-ink">{header.startText}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 max-sm:hidden">
              <MapPin aria-hidden="true" className="size-4 text-faint" />
              {[header.localAuthority, header.region].filter(Boolean).join(', ')}
            </span>
            <span className="inline-flex items-center gap-1.5 max-sm:hidden">
              <Building aria-hidden="true" className="size-4 text-faint" />
              {header.architectName}
              {header.consultantName ? `, with ${header.consultantName}` : ''}
            </span>
            <span className="text-muted max-md:hidden">{SIDE_LABEL[header.side]}</span>
          </div>
          <div className="mt-5">
            <Tabs
              label="Project"
              items={header.tabs.map((t) => ({
                label: t.label,
                href: t.href,
                active: t.href === base ? pathname === base || pathname === `${base}/` : pathname === t.href || pathname.startsWith(`${t.href}/`),
                count: t.badge ?? undefined,
                testId: `tab-${t.id}`,
                adornment: t.soon ? <span className="rounded-full bg-subtle px-1.5 text-[11px] font-medium text-muted ring-1 ring-inset ring-line">Soon</span> : undefined,
              }))}
            />
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
