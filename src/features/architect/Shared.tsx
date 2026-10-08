// Shared with you (brief/09-V1-PRODUCT.md sections 3.3 and 13.4): lots owners shared in confidence, grouped by project.
// Each group carries its own terms. Before acceptance it shows L6 and the terms button; after, the shared cards (L27).
import { useStore } from '../../store/store'
import { sharedView, type SharedGroup } from '../../store/v1selectors'
import { MarketCard, CardGrid } from '../market/MarketCard'
import { TermsDialog } from '../market/TermsDialog'
import { EmptyState, Note, PageTitle, Tag } from '../../components/ui'
import { FolderOpen, Lock } from '../../components/v1'
import { LABELS } from '../../domain/reference/labels'
import { formatDate } from '../../domain/dates'

export function Shared() {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const v = sharedView(world, personaId)
  return (
    <div className="flex flex-col gap-8">
      <PageTitle title="Shared with you" sub="Lots that owners have shared privately with one of your projects. Terms and sharing are per project." />
      {v.groups.length === 0 ? (
        <EmptyState hint="Lots shared with your projects appear here, grouped by project." />
      ) : (
        v.groups.map((g) => <Group key={g.project.id} group={g} canAccept={v.canAccept} canSave={v.canSave} />)
      )}
    </div>
  )
}

function Group({ group: g, canAccept, canSave }: { group: SharedGroup; canAccept: boolean; canSave: boolean }) {
  const accept = useStore((s) => s.acceptProjectTerms)
  const setProjectId = useStore((s) => s.setBrowseProjectId)
  return (
    <section className="flex flex-col gap-4" data-testid={`shared-group-${g.project.id}`} aria-labelledby={`shared-h-${g.project.id}`}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-rule-soft pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 text-steel">
            <FolderOpen size={22} />
          </span>
          <div className="min-w-0">
            <h2 id={`shared-h-${g.project.id}`} className="m-0 font-display text-2xl leading-tight tracking-wide">
              {g.project.name}
            </h2>
            <p className="m-0 text-sm text-mill-text">
              {g.project.typeLabel} project. Materials needed on site from {formatDate(g.project.startDate)}.
            </p>
          </div>
        </div>
        <p className="m-0 flex items-center gap-1.5 text-sm text-ink-soft">
          <Lock />
          Shared with this project by the owner, in confidence
        </p>
      </header>

      {!g.termsAccepted ? (
        <div className="flex flex-col items-start gap-4 rounded-md border border-rule-soft bg-panel px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Note tone="steel" testId="label-L6" className="max-w-2xl">
            {LABELS.L6}
          </Note>
          {canAccept ? <TermsDialog projectName={g.project.name} onAccept={() => accept(g.project.id)} triggerTestId={`open-terms-${g.project.id}`} /> : null}
        </div>
      ) : g.cards.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-rule px-5 py-5 text-sm text-mill-text" data-testid={`shared-none-${g.project.id}`}>
          <Tag tone="teal">Terms accepted</Tag>
          No owner has shared lots with this project.
        </div>
      ) : (
        <>
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-mill-text">
            <Tag tone="teal" data-testid={`terms-accepted-${g.project.id}`}>
              Terms accepted
            </Tag>
            {g.cards.length === 1 ? '1 lot shared with this project.' : `${g.cards.length} lots shared with this project.`}
          </p>
          <CardGrid testId={`shared-grid-${g.project.id}`}>
            {g.cards.map((c) => (
              <li
                key={c.listing.publicId}
                className="flex"
                // Opening a shared lot checks it against this project, which is how the listing resolves.
                onClickCapture={(e) => {
                  if ((e.target as HTMLElement).closest('a')) setProjectId(g.project.id)
                }}
              >
                <MarketCard card={c} canSave={canSave} testId={`shared-card-${g.project.id}-${c.listing.publicId}`} />
              </li>
            ))}
          </CardGrid>
        </>
      )}
    </section>
  )
}
