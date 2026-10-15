// Requirements (/app/projects/:id/requirements) for every side: the planning and sustainability requirements that
// apply to the project, each with its status, the live figures Tallyard holds for it and an evidence log. The client
// and the consultant edit; the architect reads. Indicative summaries of policy, to check against the current text.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { FilePlus2, Landmark, Link2, ScrollText, Trash2 } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { RequirementsView, RequirementTrackRow } from '../../store/selectors/sustainability'
import { requirementFilters, type RequirementFilterKey } from '../../store/selectors/sustainability-screens'
import type { OutputRef } from '../../domain/sustainabilityTypes'
import { Button, Callout, Card, cx, EmptyState, Pill, Select, Textarea, toast, TRACK_STATUS, TrackStatusPill, TrackStatusSelect } from '../../ui'
import { Page } from '../../app/Page'
import { TabHeader, TrackBar } from './parts'

function EvidenceForm({ row, v, projectId }: { row: RequirementTrackRow; v: RequirementsView; projectId: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setText('')
    setOutput('')
    setError(null)
    setOpen(false)
  }
  const add = () => {
    const r = act.addRequirementEvidence(projectId, row.id, { text, output: output ? (output as OutputRef) : null })
    if (!r.ok) {
      setError(r.error)
      return
    }
    close()
    toast.success('Evidence added', { description: row.title, action: { label: 'Undo', onClick: r.undo } })
  }
  if (!open)
    return (
      <Button size="sm" variant="ghost" icon={FilePlus2} onClick={() => setOpen(true)} className="self-start" data-testid={`evidence-open-${row.id}`}>
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
        data-testid={`evidence-text-${row.id}`}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select aria-label={`Output for ${row.title}`} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="No output linked" options={v.outputs.map((o) => ({ value: o.value, label: o.label }))} className="sm:w-64" data-testid={`evidence-output-${row.id}`} />
        <div className="flex gap-2 sm:justify-end">
          <Button size="sm" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" icon={FilePlus2} onClick={add} data-testid={`evidence-add-${row.id}`}>
            Add evidence
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function RequirementCard({ row, v, projectId }: { row: RequirementTrackRow; v: RequirementsView; projectId: string }) {
  const setStatus = (s: RequirementTrackRow['status']) => {
    const r = act.setRequirementStatus(projectId, row.id, s)
    if (!r.ok) {
      toast.error(r.error ?? 'Could not change the status.')
      return
    }
    toast.success(`Marked ${TRACK_STATUS[s].label.toLowerCase()}`, { description: row.title, action: { label: 'Undo', onClick: r.undo } })
  }
  const remove = (evidenceId: string) => {
    const r = act.removeRequirementEvidence(projectId, row.id, evidenceId)
    if (!r.ok) {
      toast.error(r.error ?? 'Could not remove the evidence.')
      return
    }
    toast.success('Evidence removed', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <Card as="article" id={`requirement-${row.id}`} data-testid={`requirement-${row.id}`} data-status={row.status} className={cx('scroll-mt-24', row.status === 'at_risk' && 'border-warning-line')}>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill size="sm" variant="quiet" icon={Landmark}>
              {row.scopeLabel}
            </Pill>
            <span className="text-xs text-muted">{row.source}</span>
          </div>
          <h3 className="m-0 mt-1.5 text-md font-semibold text-ink">{row.title}</h3>
          <p className="m-0 mt-1 max-w-[80ch] text-sm text-ink-soft">{row.summary}</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          {v.canEdit ? <TrackStatusSelect value={row.status} onChange={setStatus} label={`Status of ${row.title}`} testId={`requirement-status-${row.id}`} /> : <TrackStatusPill status={row.status} testId={`requirement-pill-${row.id}`} />}
          {row.updatedText ? <span className="text-xs text-muted">{row.updatedText}</span> : null}
        </div>
      </div>
      {row.heldInTallyard.length === 0 && row.evidence.length === 0 ? (
        <div className="flex flex-col gap-2 border-t border-line-soft px-4 py-3 sm:px-5" data-testid={`requirement-quiet-${row.id}`}>
          <p className="m-0 text-sm text-muted">No figures held in Tallyard and no evidence recorded yet.</p>
          {v.canEdit ? <EvidenceForm row={row} v={v} projectId={projectId} /> : null}
        </div>
      ) : (
        <div className="grid gap-5 border-t border-line-soft px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-w-0">
            <p className="m-0 text-xs font-medium text-muted">Held in Tallyard</p>
            {row.heldInTallyard.length === 0 ? (
              <p className="m-0 mt-1 text-sm text-muted">None for this requirement.</p>
            ) : (
              <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0 max-sm:gap-2">
                {row.heldInTallyard.map((h) => (
                  <li key={h.label} className="text-sm">
                    {h.href ? (
                      <Link to={h.href} className="rounded-sm text-ink-soft hover:text-ink hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:flex-wrap max-sm:items-center max-sm:gap-x-1">
                        {h.label}: <span className="font-medium text-ink">{h.value}</span>
                      </Link>
                    ) : (
                      <span className="text-ink-soft">
                        {h.label}: <span className="font-medium text-ink">{h.value}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <p className="m-0 text-xs font-medium text-muted">Evidence</p>
            {row.evidence.length === 0 ? (
              <p className="m-0 -mt-2 text-sm text-muted">No evidence recorded yet.</p>
            ) : (
              <ul className="m-0 -mt-1 flex list-none flex-col gap-2 p-0" data-testid={`evidence-${row.id}`}>
                {row.evidence.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 rounded-md border border-line-soft px-3 py-2.5">
                    <ScrollText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
                    <div className="min-w-0 flex-1 text-sm">
                      {e.text ? <p className="m-0 text-ink">{e.text}</p> : null}
                      {e.outputLabel ? (
                        e.outputHref ? (
                          <Link to={e.outputHref} className="mt-0.5 inline-flex items-center gap-1 rounded-sm text-brand-700 hover:underline max-sm:min-h-11">
                            <Link2 aria-hidden="true" className="size-3.5" />
                            {e.outputLabel}
                          </Link>
                        ) : (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-ink-soft">
                            <Link2 aria-hidden="true" className="size-3.5" />
                            {e.outputLabel}
                          </span>
                        )
                      ) : null}
                      <p className="m-0 mt-0.5 text-xs text-muted">
                        Added by {e.by} on {e.onText}
                      </p>
                    </div>
                    {e.canRemove ? (
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(e.id)} data-testid={`evidence-remove-${e.id}`} aria-label={`Remove this evidence from ${row.title}`}>
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {v.canEdit ? <EvidenceForm row={row} v={v} projectId={projectId} /> : null}
          </div>
        </div>
      )}
    </Card>
  )
}

export function Requirements() {
  const { projectId = '' } = useParams()
  const v = useView(selectors.requirementsView, projectId)
  const [filter, setFilter] = useState<RequirementFilterKey>('all')
  if (!v) return null
  const filters = requirementFilters(v.rows)
  const shown = new Set(filters.find((x) => x.key === filter)?.ids ?? [])
  const rows = v.rows.filter((r) => shown.has(r.id))
  return (
    <Page testId="requirements-page" className="lg:pt-7">
      <div className="flex flex-col gap-6">
        <TabHeader title="Planning and sustainability requirements" subtitle={v.locationText ? `${v.locationText}. ${v.canEdit ? 'Keep the status and the evidence current for the whole team.' : 'The client and the consultant keep the status and evidence current.'}` : undefined} />
        {v.header.canAppointArchitect ? (
          <Callout
            tone="info"
            title="Appoint an architect to choose which requirements apply"
            action={
              <Link to={`/app/projects/${projectId}/team`} className="inline-flex min-h-8 items-center rounded-sm text-sm font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline max-sm:min-h-11" data-testid="requirements-appoint">
                Appoint an architect
              </Link>
            }
          >
            The statutory requirements below apply whoever designs the project. Your architect adds the local plan policies and standards that fit it.
          </Callout>
        ) : null}
        <Callout tone="neutral" title="Indicative">
          {v.caveat}
        </Callout>
        {v.empty ? (
          <EmptyState variant="card" illustration="targets" title="No requirements recorded yet" text="No requirements recorded for this project yet. The architect chooses them from the local authority and region in the project settings." testId="requirements-empty" />
        ) : (
          <>
            <Card padding="lg" data-testid="requirements-summary">
              <TrackBar counts={v.summary} label="Requirements by status" withNotApplicable={v.summary.notApplicable > 0} total={`${v.summary.ready} of ${v.summary.total} ready`} />
            </Card>
            <div role="group" aria-label="Show requirements" className="flex flex-wrap gap-2">
              {filters.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  aria-pressed={filter === x.key}
                  onClick={() => setFilter(x.key)}
                  data-testid={`requirements-filter-${x.key}`}
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
                  <RequirementCard key={row.id} row={row} v={v} projectId={projectId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  )
}

export default Requirements
