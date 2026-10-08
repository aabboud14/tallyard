// "Checking against": the project whose start date every card's timeline check uses.
import { CalendarRange, Check, ChevronDown } from 'lucide-react'
import type { ProjectRef } from '../../store/selectors/common'
import { cx, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../ui'

export function ProjectPicker({ projects, value, onChange, className }: { projects: ProjectRef[]; value: ProjectRef | null; onChange: (projectId: string | null) => void; className?: string }) {
  if (projects.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="project-picker"
        className={cx(
          'group inline-flex h-9 min-w-0 max-w-full items-center gap-2 rounded-lg border border-line bg-surface pl-2.5 pr-2 text-sm shadow-xs outline-none transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 data-[state=open]:border-line-strong max-sm:h-11',
          className,
        )}
      >
        <CalendarRange aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <span className="shrink-0 text-muted">Checking against</span>
        <span className="truncate font-medium text-ink">{value ? value.name : 'No project'}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-faint transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Check availability against a project start</DropdownMenuLabel>
        {projects.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => onChange(p.id)} data-testid={`pick-${p.id}`} className="py-2">
            <span className="flex w-full min-w-0 items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-ink">{p.name}</span>
                <span className="truncate text-xs text-muted">Materials needed from {p.startText}</span>
              </span>
              {value?.id === p.id ? <Check aria-label="Selected" className="size-4 shrink-0 text-brand-600!" /> : null}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange(null)} className="py-2">
          <span className="flex w-full items-center gap-3">
            <span className="flex-1 text-ink-soft">No project</span>
            {value === null ? <Check aria-label="Selected" className="size-4 shrink-0 text-brand-600!" /> : null}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
