// Goals and targets (/app/projects/:id/targets), the consultant's page: a default target for each goal from the
// requirements that apply, the consultant's override (or not targeted), a reset to the default, and the results
// Tallyard cannot measure, entered with a date and a source. Indicative; none of it is certification advice.
import { useState } from 'react'
import { useParams } from 'react-router'
import { ClipboardPen, Info, PencilLine, RotateCcw } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { GoalRow } from '../../store/selectors/sustainability'
import { goalInputText, goalInputUnit } from '../../store/selectors/sustainability-screens'
import { goalDef } from '../../domain/reference/goals'
import { parseGoalInput } from '../../domain/engines/goals'
import { today } from '../../sandbox/clock'
import { Button, Callout, Checkbox, Dialog, Field, IndicativeMarker, Input, Pill, Select, Textarea, toast, Tooltip } from '../../ui'
import { Page } from '../../app/Page'
import { GoalMeterView, TabHeader } from './parts'

type Editing = { row: GoalRow; kind: 'target' | 'actual' }

const COLS = 'xl:grid xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.15fr)_9.5rem] xl:items-start xl:gap-x-5'

function CellLabel({ children }: { children: string }) {
  return <p className="m-0 mb-0.5 text-xs text-muted xl:sr-only">{children}</p>
}

function basisText(row: GoalRow): string {
  return `${row.defaultBasis}${row.defaultStatus === 'published' ? '' : ' Indicative.'}`
}

function GoalLine({ row, onEdit }: { row: GoalRow; onEdit: (e: Editing) => void }) {
  const projectId = useParams().projectId ?? ''
  const reset = () => {
    const r = act.resetGoalTarget(projectId, row.id)
    if (!r.ok) {
      toast.error(r.error ?? 'Could not reset the target.')
      return
    }
    toast.success('Target reset to the default', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <li data-testid={`goal-${row.id}`} className={`grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4 sm:px-5 ${COLS}`}>
      <div className="col-span-2 min-w-0 xl:col-span-1">
        <p className="m-0 flex flex-wrap items-center gap-2 font-medium text-ink">
          {row.label}
          {row.indicative ? <IndicativeMarker /> : null}
        </p>
        <p className="m-0 mt-0.5 text-sm text-muted">{row.unitLabel}</p>
      </div>
      <div className="min-w-0 text-sm">
        <CellLabel>Default</CellLabel>
        <p className="m-0 flex items-start gap-1.5 text-ink-soft">
          <span className="min-w-0">{row.defaultText}</span>
          {row.defaultBasis ? (
            <Tooltip content={basisText(row)}>
              <button type="button" aria-label={`Basis: ${row.defaultBasis}`} className="relative mt-0.5 hidden size-4 shrink-0 items-center justify-center rounded-sm text-faint hover:text-ink xl:inline-flex">
                <Info aria-hidden="true" className="size-3.5" />
              </button>
            </Tooltip>
          ) : null}
        </p>
        {/* A tooltip does not open on touch, so below the table layout the basis is written out. */}
        {row.defaultBasis ? (
          <p className="m-0 mt-0.5 text-xs text-muted xl:hidden" data-testid={`goal-basis-${row.id}`}>
            {basisText(row)}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 text-sm">
        <CellLabel>For this project</CellLabel>
        <p className="m-0 flex flex-wrap items-center gap-2 font-medium text-ink">
          {row.targetText}
          {row.source === 'override' ? (
            <Pill size="sm" tone="info" variant="quiet">
              Overridden
            </Pill>
          ) : row.source === 'default' ? (
            <Pill size="sm" variant="quiet">
              Default
            </Pill>
          ) : null}
        </p>
        {row.overriddenText ? <p className="m-0 mt-0.5 text-xs text-muted">{row.overriddenText}</p> : null}
        {row.overrideNote ? <p className="m-0 mt-0.5 text-xs text-ink-soft">{row.overrideNote}</p> : null}
      </div>
      <div className="min-w-0 text-sm">
        <CellLabel>Now</CellLabel>
        <p className="m-0 font-medium text-ink">{row.actualText}</p>
        {row.actualNote ? <p className="m-0 mt-0.5 text-xs text-muted">{row.actualNote}</p> : null}
      </div>
      <div className="col-span-2 min-w-0 xl:col-span-1">
        <CellLabel>Status</CellLabel>
        <GoalMeterView row={row} size="sm" label={row.label} hideLabel testId={`goal-meter-${row.id}`} />
      </div>
      {row.canEdit ? (
        <div className="col-span-2 flex flex-wrap items-center gap-1.5 xl:col-span-1 xl:flex-col xl:items-start">
          <Button size="sm" icon={PencilLine} onClick={() => onEdit({ row, kind: 'target' })} data-testid={`goal-edit-${row.id}`}>
            Edit target
          </Button>
          {row.canEnterActual ? (
            <Button size="sm" variant="ghost" icon={ClipboardPen} onClick={() => onEdit({ row, kind: 'actual' })} data-testid={`goal-actual-${row.id}`}>
              Enter result
            </Button>
          ) : null}
          {row.source === 'override' ? (
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset} data-testid={`goal-reset-${row.id}`}>
              Reset to default
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function ValueField({ row, value, onChange, label, error, testId }: { row: GoalRow; value: string; onChange: (v: string) => void; label: string; error: string | null; testId: string }) {
  const unit = goalInputUnit(row)
  return (
    <Field label={label} error={error ?? undefined}>
      {row.scale ? (
        <Select value={value} onChange={(e) => onChange(e.target.value)} placeholder="Choose a level" options={row.scale.map((l) => ({ value: l, label: l }))} data-testid={testId} />
      ) : (
        <div className="flex items-center gap-2">
          <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="max-w-40" data-testid={testId} />
          <span className="text-sm text-muted">{unit}</span>
        </div>
      )}
    </Field>
  )
}

function TargetDialog({ editing, onClose }: { editing: GoalRow; onClose: () => void }) {
  const projectId = useParams().projectId ?? ''
  const [value, setValue] = useState(goalInputText(editing, editing.target))
  const [notTargeted, setNotTargeted] = useState(editing.source === 'override' && editing.target === null)
  const previousNote = editing.overrideNote ?? ''
  const [note, setNote] = useState(previousNote)
  const [error, setError] = useState<string | null>(null)
  // The reason belongs to the value it was given for: a new value starts without it, unless the consultant has edited it.
  const changeValue = (v: string) => {
    setValue(v)
    setError(null)
    if (note === previousNote) setNote('')
  }
  const save = () => {
    let next: string | number | null = null
    if (!notTargeted) {
      const parsed = parseGoalInput(goalDef(editing.id), value)
      if ('error' in parsed) {
        setError(parsed.error)
        return
      }
      next = parsed.value
    }
    const r = act.setGoalTarget(projectId, editing.id, next, note)
    if (!r.ok) {
      setError(r.error)
      return
    }
    toast.success('Target updated', { description: editing.label, action: { label: 'Undo', onClick: r.undo } })
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title="Target for this project"
      description={editing.label}
      testId="goal-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} data-testid="goal-save">
            Save target
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-sm text-muted">Default: {editing.defaultText}. The default stays on record.</p>
        {!notTargeted ? <ValueField row={editing} value={value} onChange={changeValue} label="Target" error={error} testId="goal-value" /> : null}
        <Checkbox
          checked={notTargeted}
          onCheckedChange={(c) => {
            setNotTargeted(c === true)
            setError(null)
            if (note === previousNote) setNote('')
          }}
          label="Not targeted on this project"
          data-testid="goal-not-targeted"
        />
        {notTargeted && error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
        <Field label="Reason" optional hint="Seen by the project team with the target.">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={previousNote && note === '' ? `Before: ${previousNote}` : 'For example: agreed with the client at stage 2.'} data-testid="goal-note" />
        </Field>
      </div>
    </Dialog>
  )
}

function ResultDialog({ editing, onClose }: { editing: GoalRow; onClose: () => void }) {
  const projectId = useParams().projectId ?? ''
  const max = today()
  const [value, setValue] = useState(goalInputText(editing, editing.actual))
  const [asOf, setAsOf] = useState(max)
  const [source, setSource] = useState('')
  const [error, setError] = useState<string | null>(null)
  const save = () => {
    const parsed = parseGoalInput(goalDef(editing.id), value)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    const r = act.setGoalActual(projectId, editing.id, parsed.value, asOf, source)
    if (!r.ok) {
      setError(r.error)
      return
    }
    toast.success('Result recorded', { description: editing.label, action: { label: 'Undo', onClick: r.undo } })
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title="Enter a result"
      description={editing.label}
      testId="goal-actual-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} data-testid="goal-actual-save">
            Save result
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ValueField row={editing} value={value} onChange={(v) => { setValue(v); setError(null) }} label="Result" error={error} testId="goal-actual-value" />
        <Field label="As at">
          <Input type="date" value={asOf} max={max} onChange={(e) => setAsOf(e.target.value)} className="max-w-48" data-testid="goal-actual-date" />
        </Field>
        <Field label="Source" required hint="For example: Stage 2 life cycle assessment.">
          <Input value={source} onChange={(e) => setSource(e.target.value)} data-testid="goal-actual-source" />
        </Field>
      </div>
    </Dialog>
  )
}

export function Targets() {
  const { projectId = '' } = useParams()
  const v = useView(selectors.goalsView, projectId)
  const [editing, setEditing] = useState<Editing | null>(null)
  if (!v) return null
  return (
    <Page testId="targets-page" className="lg:pt-7">
      <div className="flex flex-col gap-6">
        <TabHeader title="Goals and targets" subtitle={`Targets start from the requirements that apply to ${v.header.name}. Override any of them for this project; the default stays on record.`}>
          {v.requirements.length > 0 ? (
            <ul aria-label="Requirements that apply" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {v.requirements.map((r) => (
                <li key={r.id}>
                  <Pill size="sm" variant="quiet">
                    {r.title}
                  </Pill>
                </li>
              ))}
            </ul>
          ) : null}
        </TabHeader>
        <Callout tone="neutral" title="Indicative">
          {v.caveat}
        </Callout>
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div aria-hidden="true" className={`hidden border-b border-line bg-page/70 px-5 py-2.5 text-xs font-medium text-muted ${COLS}`}>
            <span>Goal</span>
            <span>Default</span>
            <span>For this project</span>
            <span>Now</span>
            <span>Status</span>
            <span />
          </div>
          <ul aria-label="Goals" className="m-0 list-none divide-y divide-line-soft p-0" data-testid="goals">
            {v.rows.map((row) => (
              <GoalLine key={row.id} row={row} onEdit={setEditing} />
            ))}
          </ul>
        </div>
      </div>
      {editing?.kind === 'target' ? <TargetDialog key={editing.row.id} editing={editing.row} onClose={() => setEditing(null)} /> : null}
      {editing?.kind === 'actual' ? <ResultDialog key={editing.row.id} editing={editing.row} onClose={() => setEditing(null)} /> : null}
    </Page>
  )
}

export default Targets
