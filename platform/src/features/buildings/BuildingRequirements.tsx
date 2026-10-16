// The building's Requirements tab, for the owner and the surveyor: the planning and sustainability requirements that
// apply before the building comes down at its location (national, London Plan and the local authority), each with a
// status and an evidence log both sides keep. Indicative summaries to check; placeholders say they summarise
// nothing yet. Every figure and state comes from buildingRequirementsView (P2).
import { useState } from 'react'
import { useParams } from 'react-router'
import { ChevronDown, FilePlus2, Landmark, ScrollText, Trash2 } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { BuildingRequirementRow } from '../../store/selectors/buildingRequirements'
import { requirementFilters, type RequirementFilterKey } from '../../store/selectors/sustainability-screens'
import { PLACEHOLDER_LABEL } from '../../domain/reference/requirements'
import { PRODUCT_NAME } from '../../domain/constants'
import { Button, Card, cx, IndicativeMarker, Pill, Textarea, toast, TRACK_STATUS, TrackStatusSelect } from '../../ui'
import { TrackBar } from '../sustainability/parts'

function EvidenceForm({ row, buildingId }: { row: BuildingRequirementRow; buildingId: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setText('')
    setError(null)
    setOpen(false)
  }
  if (!open)
    return (
      <Button size="sm" variant="ghost" icon={FilePlus2} onClick={() => setOpen(true)} className="self-start" data-testid={`building-evidence-open-${row.id}`}>
        Add evidence
      </Button>
    )
  return (
    <div className="flex flex-col gap-2.5 rounded-md bg-page/70 p-3 ring-1 ring-inset ring-line-soft">
      <Textarea
        aria-label={`Evidence for ${row.title}`}
        rows={2}
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError(null)
        }}
        placeholder="What was done, and where the evidence is held"
        data-testid={`building-evidence-text-${row.id}`}
      />
      <div className="flex gap-2 sm:justify-end">
        <Button size="sm" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={FilePlus2}
          onClick={() => {
            const r = act.addBuildingRequirementEvidence(buildingId, row.id, text)
            if (!r.ok) return setError(r.error)
            close()
            toast.success('Evidence added', { description: row.title, action: { label: 'Undo', onClick: r.undo } })
          }}
          data-testid={`building-evidence-add-${row.id}`}
        >
          Add evidence
        </Button>
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function RequirementCard({ row, buildingId, canEdit }: { row: BuildingRequirementRow; buildingId: string; canEdit: boolean }) {
  const setStatus = (s: BuildingRequirementRow['status']) => {
    const r = act.setBuildingRequirementStatus(buildingId, row.id, s)
    if (!r.ok) {
      toast.error(r.error ?? 'Could not change the status.')
      return
    }
    toast.success(`Marked ${TRACK_STATUS[s].label.toLowerCase()}`, { description: row.title, action: { label: 'Undo', onClick: r.undo } })
  }
  const remove = (evidenceId: string) => {
    const r = act.removeBuildingRequirementEvidence(buildingId, row.id, evidenceId)
    if (!r.ok) {
      toast.error(r.error ?? 'Could not remove the evidence.')
      return
    }
    toast.success('Evidence removed', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <Card as="article" id={`requirement-${row.id}`} data-testid={`building-requirement-${row.id}`} data-status={row.status} className={cx('scroll-mt-24', row.status === 'at_risk' && 'border-warning-line')}>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill size="sm" variant="quiet" icon={Landmark}>
              {row.scopeLabel}
            </Pill>
            <Pill size="sm">{row.kindLabel}</Pill>
            {row.placeholder ? (
              <Pill size="sm" tone="info">
                {PLACEHOLDER_LABEL}
              </Pill>
            ) : null}
          </div>
          <h3 className="m-0 mt-1.5 text-md font-semibold text-ink">
            {row.code}, {row.title}
          </h3>
          <p className="m-0 mt-0.5 text-xs text-muted">{row.source}</p>
          <p className="m-0 mt-1.5 max-w-[80ch] text-sm text-ink-soft">{row.summary}</p>
          <details className="group mt-1">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11 [&::-webkit-details-marker]:hidden">
              When it applies and what it asks for
              <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-1.5 flex max-w-[80ch] flex-col gap-1.5 text-sm text-ink-soft">
              {row.trigger ? <p className="m-0">When it applies: {row.trigger}</p> : null}
              {row.asks.length > 0 ? (
                <ul className="m-0 list-disc pl-5">
                  {row.asks.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : null}
              {row.helps ? (
                <p className="m-0">
                  How {PRODUCT_NAME} helps: {row.helps}
                </p>
              ) : null}
            </div>
          </details>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <TrackStatusSelect value={row.status} onChange={setStatus} label={`Status of ${row.title}`} disabled={!canEdit} testId={`building-requirement-status-${row.id}`} />
          {row.updatedText ? <span className="text-xs text-muted">{row.updatedText}</span> : null}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-line-soft px-4 py-3.5 sm:px-5">
        <p className="m-0 text-xs font-medium text-muted">Evidence</p>
        {row.evidence.length === 0 ? (
          <p className="m-0 -mt-2 text-sm text-muted">No evidence recorded yet.</p>
        ) : (
          <ul className="m-0 -mt-1 flex list-none flex-col gap-2 p-0" data-testid={`building-evidence-${row.id}`}>
            {row.evidence.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-md border border-line-soft px-3 py-2.5">
                <ScrollText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="m-0 text-ink">{e.text}</p>
                  <p className="m-0 mt-0.5 text-xs text-muted">
                    Added by {e.by} on {e.onText}
                  </p>
                </div>
                {e.canRemove ? (
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(e.id)} aria-label={`Remove this evidence from ${row.title}`}>
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canEdit ? <EvidenceForm row={row} buildingId={buildingId} /> : null}
      </div>
    </Card>
  )
}

export function BuildingRequirements() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.buildingRequirementsView, buildingId)
  const [filter, setFilter] = useState<RequirementFilterKey>('all')
  if (!v) return null
  const filters = requirementFilters(v.rows)
  const shown = new Set(filters.find((x) => x.key === filter)?.ids ?? [])
  const rows = v.rows.filter((r) => shown.has(r.id))
  return (
    <div className="flex flex-col gap-6" data-testid="building-requirements">
      <div className="flex flex-col gap-2">
        <h2 className="m-0 flex flex-wrap items-center gap-2.5 text-xl font-semibold text-ink">
          Requirements before demolition
          <IndicativeMarker />
        </h2>
        <p className="m-0 max-w-[72ch] text-base text-ink-soft">{v.introText}</p>
        <p className="m-0 max-w-[72ch] text-sm text-muted">{v.caveat}</p>
      </div>
      <Card padding="lg" data-testid="building-requirements-summary">
        <TrackBar counts={v.summary} label="Requirements by status" withNotApplicable={v.summary.notApplicable > 0} total={v.readyText} />
      </Card>
      <div role="group" aria-label="Show requirements" className="flex flex-wrap gap-2">
        {filters.map((x) => (
          <button
            key={x.key}
            type="button"
            aria-pressed={filter === x.key}
            onClick={() => setFilter(x.key)}
            data-testid={`building-requirements-filter-${x.key}`}
            className={cx(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium ring-1 ring-inset transition-colors max-sm:min-h-11 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              filter === x.key ? 'bg-ink text-white ring-ink' : 'bg-surface text-ink-soft ring-line hover:text-ink hover:ring-line-strong',
            )}
          >
            {x.label}
            <span className={cx('tabular-nums', filter === x.key ? 'text-white/80' : 'text-muted')}>{x.count}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-line-strong px-4 py-3.5 text-sm text-muted">Nothing here with this filter.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <RequirementCard key={row.id} row={row} buildingId={buildingId} canEdit={v.canEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

export default BuildingRequirements
