// New for your projects (architects, on the Marketplace landing): listed in the last 30 days and in time for at
// least one of the practice's projects, or for the project being checked. Hidden when there is nothing new.
import { CalendarCheck, Sparkles } from 'lucide-react'
import type { ProjectRef } from '../../store/selectors/common'
import type { NewForProjects } from '../../store/selectors/marketplace'
import { ListingTile } from './ListingTile'

function caption(card: NewForProjects, project: ProjectRef | null): string {
  if (project) return `In time for ${project.name}`
  if (card.fitsProjects.length === 1) return `In time for ${card.fitsProjects[0].name}`
  return `In time for ${card.fitsProjects.length} of your projects`
}

export function NewForProjectsRow({ cards, project }: { cards: NewForProjects[]; project: ProjectRef | null }) {
  if (cards.length === 0) return null
  return (
    <section aria-labelledby="new-for-projects-h" data-testid="new-for-projects" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id="new-for-projects-h" className="m-0 flex items-center gap-2 text-lg font-semibold text-ink">
            <Sparkles aria-hidden="true" className="size-4 text-brand-600" />
            {project ? `New for ${project.name}` : 'New for your projects'}
          </h2>
          <p className="m-0 mt-0.5 text-sm text-muted">{project ? 'Listed in the last 30 days and in time for its start on site.' : 'Listed in the last 30 days and in time for at least one of your projects.'}</p>
        </div>
      </div>
      <div className="@container">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 @lg:grid-cols-2 @4xl:grid-cols-4">
          {cards.map((c) => (
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
