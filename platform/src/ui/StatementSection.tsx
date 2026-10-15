// One section of a generated document that a person may edit: the heading and text, an "Edited" pill, and for
// editors Edit, Save, Cancel and "Reset to generated text". When the figures behind an edited section have
// moved on, a warning offers the updated text or keeps the person's own. The component holds only the draft
// being typed; saving, resetting and the stale check belong to the caller's store actions.
import { useId, useState } from 'react'
import { Pencil, RotateCcw, TriangleAlert } from 'lucide-react'
import { cx } from './cx'
import { Button } from './Button'
import { Pill } from './Badge'
import { Textarea } from './form'

export type StatementSectionProps = {
  /** The section id, used in the test ids: statement-section-{id}, statement-edit-{id} and so on. */
  id: string
  heading: string
  text: string
  /** The person changed this section from the generated text. */
  edited?: boolean
  /** The figures behind an edited section have changed since it was edited. */
  stale?: boolean
  canEdit?: boolean
  onSave?: (text: string) => void
  /** Go back to the generated text. */
  onReset?: () => void
  /** Keep the person's text and accept the new figures as its basis. */
  onKeep?: () => void
  /** For example h2 inside a document. */
  headingAs?: 'h2' | 'h3'
  className?: string
}

export function StatementSection({ id, heading, text, edited = false, stale = false, canEdit = false, onSave, onReset, onKeep, headingAs: H = 'h2', className }: StatementSectionProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const fieldId = useId()
  const editing = draft !== null
  return (
    <section data-testid={`statement-section-${id}`} aria-labelledby={`${fieldId}-h`} className={cx('flex min-w-0 flex-col gap-3 border-t border-line-soft pt-6 first:border-t-0 first:pt-0', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <H id={`${fieldId}-h`} className="m-0 text-lg font-semibold text-ink">
            {heading}
          </H>
          {edited ? (
            <Pill size="sm" tone="info">
              Edited
            </Pill>
          ) : null}
        </div>
        {canEdit && !editing ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setDraft(text)} data-testid={`statement-edit-${id}`}>
              Edit
            </Button>
            {edited && onReset ? (
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={onReset} data-testid={`statement-reset-${id}`}>
                Reset to generated text
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {stale && canEdit && !editing ? (
        <div data-testid={`statement-stale-${id}`} role="status" className="flex flex-wrap items-start gap-3 rounded-lg border border-warning-line bg-warning-soft/70 px-3.5 py-3">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="m-0 min-w-0 flex-1 text-ink-soft">The project's figures have changed since this section was edited.</p>
          <div className="flex flex-wrap items-center gap-2">
            {onReset ? (
              <Button size="sm" onClick={onReset}>
                Use updated text
              </Button>
            ) : null}
            {onKeep ? (
              <Button size="sm" variant="ghost" onClick={onKeep}>
                Keep my text
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {editing ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${fieldId}-text`} className="sr-only">
            {heading}
          </label>
          <Textarea id={`${fieldId}-text`} rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} data-testid={`statement-text-${id}`} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={draft.trim() === ''}
              onClick={() => {
                onSave?.(draft)
                setDraft(null)
              }}
              data-testid={`statement-save-${id}`}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className="m-0 whitespace-pre-line text-base leading-6 text-ink">{text}</p>
      )}
    </section>
  )
}
