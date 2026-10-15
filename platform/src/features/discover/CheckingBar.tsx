// "Checking against": the project every card's timeline check uses, as a visible strip under the tabs. With no
// project it is a dashed prompt; with one it is a brand-tinted bar with the project's drawing, the fit counts over
// the shown cards in their fit colours, the "Only show what arrives in time" switch, and change and clear.
import { Link } from 'react-router'
import { CalendarRange, ChevronDown, FolderPlus, X } from 'lucide-react'
import type { Fit } from '../../domain/v1types'
import type { BuildingSketch } from '../../domain/sketch'
import type { ProjectRef } from '../../store/selectors/common'
import type { FitSummary } from '../../store/selectors/marketplace'
import { Button, cx, FIT, IconButton, IndicativeMarker, Pill, ProjectThumb, Switch } from '../../ui'
import { ProjectPicker } from './ProjectPicker'

const FIT_ORDER: Fit[] = ['now', 'in_time', 'tight', 'late']

const FIT_WORDS: Record<Fit, string> = { now: 'available now', in_time: 'in time', tight: 'tight', late: 'too late' }

export type CheckingBarProps = {
  projects: ProjectRef[]
  project: ProjectRef | null
  sketch: BuildingSketch | null
  summary: FitSummary | null
  fitsOnly: boolean
  canCreateProject: boolean
  onProject: (projectId: string | null) => void
  onFitsOnly: (on: boolean) => void
  className?: string
}

export function CheckingBar({ projects, project, sketch, summary, fitsOnly, canCreateProject, onProject, onFitsOnly, className }: CheckingBarProps) {
  if (projects.length === 0) {
    if (!canCreateProject) return null
    return (
      <div data-testid="checking-bar" data-state="none" className={cx('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-dashed border-line-strong px-4 py-3', className)}>
        <CalendarRange aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <p className="m-0 min-w-0 flex-1 text-sm text-ink-soft">Create a project to check materials against its start on site.</p>
        <Button asChild size="sm" icon={FolderPlus}>
          <Link to="/app/projects/new">New project</Link>
        </Button>
      </div>
    )
  }

  if (!project) {
    return (
      <div data-testid="checking-bar" data-state="prompt" className={cx('flex flex-col gap-3 rounded-lg border border-dashed border-line-strong px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4', className)}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <CalendarRange aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="m-0 font-medium text-ink">Check materials against a project</p>
            <p className="m-0 text-sm text-muted">See which arrive in time for its start on site.</p>
          </div>
        </div>
        <ProjectPicker
          projects={projects}
          value={null}
          onChange={onProject}
          align="end"
          trigger={
            <Button variant="primary" trailingIcon={ChevronDown} data-testid="checking-choose" className="max-sm:w-full">
              Choose a project
            </Button>
          }
        />
      </div>
    )
  }

  const chips = summary ? FIT_ORDER.filter((fit) => summary[fit] > 0) : []
  const clear = (testId: string) => <IconButton icon={X} label={`Stop checking against ${project.name}`} size="sm" onClick={() => onProject(null)} data-testid={testId} className="max-sm:size-11" />
  return (
    <div data-testid="checking-bar" data-state="checking" className={cx('flex flex-col gap-2.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-4', className)}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {sketch ? <ProjectThumb sketch={sketch} size="sm" className="bg-surface" /> : null}
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate font-medium text-ink">Checking against {project.name}</p>
          <p className="m-0 truncate text-sm text-ink-soft">Materials needed from {project.startText}</p>
        </div>
        <span className="lg:hidden">{clear('checking-clear-compact')}</span>
      </div>
      {chips.length > 0 ? (
        <ul aria-label="Fit of the materials shown" className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0" data-testid="fit-summary">
          {chips.map((fit) => (
            <li key={fit}>
              <Pill tone={FIT[fit].tone} icon={FIT[fit].icon} className="bg-surface" data-fit={fit}>
                <span className="tabular-nums">{summary![fit]}</span> {FIT_WORDS[fit]}
              </Pill>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 max-lg:border-t max-lg:border-brand-100 max-lg:pt-1.5">
        <Switch label="Only show what arrives in time" checked={fitsOnly} onCheckedChange={onFitsOnly} data-testid="fits-only" className="[&_label]:whitespace-nowrap [&_label]:text-sm" />
        <IndicativeMarker />
        <span className="ml-auto flex items-center gap-1">
          <ProjectPicker
            projects={projects}
            value={project}
            onChange={onProject}
            align="end"
            trigger={
              <Button variant="ghost" size="sm" trailingIcon={ChevronDown} data-testid="checking-change" className="max-sm:h-11">
                Change project
              </Button>
            }
          />
          <span className="max-lg:hidden">{clear('checking-clear')}</span>
        </span>
      </div>
    </div>
  )
}
