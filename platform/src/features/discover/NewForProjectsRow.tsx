// New for your projects (architects, on the Marketplace landing): listed in the last 30 days and in time for at
// least one of the practice's projects, or for the project being checked. Hidden when there is nothing new. The
// row opens on the first few; Show all reaches the rest, so the count on the home is the count the row can show.
// The home's "{n} new materials fit" link and the jump link at the top of the landing open the page at this row.
import { useState } from 'react'
import { CalendarCheck, ChevronDown, ChevronUp, PackagePlus } from 'lucide-react'
import { NEW_FOR_PROJECTS_ANCHOR } from '../../store/paths'
import type { ProjectRef } from '../../store/selectors/common'
import type { NewForProjects, NewForProjectsJump } from '../../store/selectors/marketplace'
import { Button, cx } from '../../ui'
import { ListingTile } from './ListingTile'
import { scrollToNewForProjects } from './scrollToRow'

/**
 * "10 new for Merrowgate Wharf" at the top of the landing, jumping down to the row. The chip is drawn at the size of
 * the fit chips beside it; on a phone its hit area grows to 44 px around it.
 */
export function NewForProjectsJumpLink({ jump, className }: { jump: NewForProjectsJump; className?: string }) {
  return (
    <a
      href={`#${NEW_FOR_PROJECTS_ANCHOR}`}
      onClick={(e) => {
        if (scrollToNewForProjects({ smooth: true, focus: true })) e.preventDefault()
      }}
      data-testid="new-for-projects-jump"
      className={cx(
        'group/jump inline-flex min-w-0 max-w-full items-center rounded-[6px] outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:min-h-11',
        className,
      )}
    >
      <span className="inline-flex min-h-6 min-w-0 items-center gap-1.5 rounded-[5px] bg-surface px-2.5 py-0.5 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition-colors group-hover/jump:bg-brand-50 group-hover/jump:text-brand-800">
        <PackagePlus aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="min-w-0 tabular-nums underline-offset-4 group-hover/jump:underline">{jump.text}</span>
      </span>
    </a>
  )
}

function caption(card: NewForProjects, project: ProjectRef | null): string {
  if (project) return `In time for ${project.name}`
  if (card.fitsProjects.length === 1) return `In time for ${card.fitsProjects[0].name}`
  return `In time for ${card.fitsProjects.length} of your projects`
}

export function NewForProjectsRow({ cards, more = [], total, project }: { cards: NewForProjects[]; more?: NewForProjects[]; total?: number; project: ProjectRef | null }) {
  const [expanded, setExpanded] = useState(false)
  if (cards.length === 0) return null
  const shown = expanded ? [...cards, ...more] : cards
  return (
    <section id={NEW_FOR_PROJECTS_ANCHOR} tabIndex={-1} aria-labelledby="new-for-projects-h" data-testid="new-for-projects" className="flex scroll-mt-20 flex-col gap-4 outline-none md:scroll-mt-72 lg:scroll-mt-56">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id="new-for-projects-h" className="m-0 flex items-center gap-2 text-lg font-semibold text-ink">
            <PackagePlus aria-hidden="true" className="size-4 text-muted" />
            {project ? `New for ${project.name}` : 'New for your projects'}
          </h2>
          <p className="m-0 mt-0.5 text-sm text-muted">{project ? 'Listed in the last 30 days and in time for its start on site.' : 'Listed in the last 30 days and in time for at least one of your projects.'}</p>
        </div>
        {more.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            icon={expanded ? ChevronUp : ChevronDown}
            onClick={() => setExpanded((x) => !x)}
            aria-expanded={expanded}
            aria-controls="new-for-projects-grid"
            data-testid="new-for-projects-more"
            className="max-sm:h-11"
          >
            {expanded ? 'Show fewer' : `Show all ${total ?? cards.length + more.length}`}
          </Button>
        ) : null}
      </div>
      <div className="@container">
        <div id="new-for-projects-grid" className="grid grid-cols-1 gap-x-6 gap-y-8 @lg:grid-cols-2 @4xl:grid-cols-4">
          {shown.map((c) => (
            <ListingTile
              key={c.publicId}
              card={c}
              canSave
              testIdPrefix="new-"
              showFit={project !== null}
              projectId={project?.id ?? null}
              note={
                <span className="inline-flex items-center gap-1.5 font-medium text-brand-700" data-testid={`new-for-${c.publicId}`}>
                  <CalendarCheck aria-hidden="true" className="size-3.5" />
                  {caption(c, project)}
                </span>
              }
            />
          ))}
        </div>
      </div>
    </section>
  )
}
