// Edit the programme: the declared RIBA stage, the start of stages 0 to 4, site start, practical completion and
// when materials are needed on site. Lengths and errors come from programmeDraftView as the architect types;
// 'Suggest stage dates' fills the five starts from the typical stage lengths.
import { useState } from 'react'
import { CalendarCheck, RotateCcw } from 'lucide-react'
import type { StageStarts } from '../../domain/types'
import { act, useView } from '../../store'
import { programmeDraftView, programmeForm, suggestedStageStarts, type ProgrammeDraft, type ProgrammeForm } from '../../store/selectors/programme'
import { Button, Callout, Dialog, Field, Input, Select, toast } from '../../ui'

type Props = { projectId: string; open: boolean; onOpenChange: (open: boolean) => void }

export function ProgrammeDialog({ projectId, open, onOpenChange }: Props) {
  const form = useView(programmeForm, projectId)
  if (!form) return null
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit programme"
      description="Set the RIBA stage dates, site start and practical completion. Every timeline check on this project uses the date materials are needed on site."
      size="lg"
      testId="programme-dialog"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="programme-form" variant="primary" icon={CalendarCheck} data-testid="programme-save">
            Save programme
          </Button>
        </>
      }
    >
      {open ? <ProgrammeFormBody projectId={projectId} form={form} onDone={() => onOpenChange(false)} /> : null}
    </Dialog>
  )
}

function ProgrammeFormBody({ projectId, form, onDone }: { projectId: string; form: ProgrammeForm; onDone: () => void }) {
  const [draft, setDraft] = useState<ProgrammeDraft>(() => ({ ribaStage: form.ribaStage, stageStarts: [...form.stageStarts] as StageStarts, siteStart: form.siteStart, practicalCompletion: form.practicalCompletion, startDate: form.startDate }))
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const view = programmeDraftView(draft)
  const err = (f: keyof typeof view.errors) => (submitted ? view.errors[f] : undefined)
  const setStart = (i: number, v: string) => setDraft((d) => ({ ...d, stageStarts: d.stageStarts.map((x, j) => (j === i ? v : x)) as StageStarts }))

  const suggest = () => {
    const r = suggestedStageStarts(form.today, draft.ribaStage, draft.siteStart, draft.practicalCompletion)
    if ('error' in r) {
      setNotice(r.error)
      return
    }
    setNotice(null)
    setDraft((d) => ({ ...d, stageStarts: r.stageStarts }))
  }

  return (
    <form
      id="programme-form"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
        if (!view.valid) return
        const r = act.setProjectProgramme(projectId, { ribaStage: draft.ribaStage, programme: { stageStarts: draft.stageStarts, siteStart: draft.siteStart, practicalCompletion: draft.practicalCompletion }, startDate: draft.startDate })
        if (!r.ok) {
          setError(r.error ?? 'The programme could not be saved.')
          return
        }
        onDone()
        toast.success('Programme saved', { action: { label: 'Undo', onClick: r.undo } })
      }}
    >
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      <Field label="Current RIBA stage" hint="The stage the project is at now. The programme check compares it with the planned stage.">
        <Select value={String(draft.ribaStage)} onChange={(e) => setDraft((d) => ({ ...d, ribaStage: Number(e.target.value) }))} options={form.stageOptions.map((s) => ({ value: String(s.value), label: `Stage ${s.label}` }))} data-testid="programme-stage" />
      </Field>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">Design stages</legend>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span aria-hidden="true" className="text-sm font-medium text-ink">
            Design stages
          </span>
          <Button size="sm" icon={RotateCcw} onClick={suggest} data-testid="programme-suggest">
            Suggest stage dates
          </Button>
        </div>
        {notice ? (
          <Callout tone="warning" role="status" className="mt-3">
            {notice}
          </Callout>
        ) : null}
        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,168px)_88px] gap-3 border-b border-line-soft bg-page px-3.5 py-2 text-xs font-medium text-muted sm:grid">
            <span>Stage</span>
            <span>Starts</span>
            <span className="text-right">Length</span>
          </div>
          <ul className="m-0 list-none divide-y divide-line-soft p-0">
            {view.rows.map((r) => (
              <li key={r.stage} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,168px)_88px]">
                <label htmlFor={`programme-${r.field}`} className="min-w-0 text-sm text-ink">
                  <span className="font-medium tabular-nums">{r.label}</span>
                  <span className="text-ink-soft">, {r.name}</span>
                </label>
                <span className="text-right text-sm tabular-nums text-muted sm:order-last">{r.lengthText}</span>
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <Input id={`programme-${r.field}`} type="date" value={r.start} onChange={(e) => setStart(r.stage, e.target.value)} aria-invalid={err(r.field) ? true : undefined} aria-describedby={err(r.field) ? `programme-${r.field}-error` : undefined} data-testid={`programme-${r.field}`} />
                  {err(r.field) ? (
                    <p id={`programme-${r.field}-error`} className="m-0 mt-1 text-sm text-danger">
                      {err(r.field)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Site start" hint="Stage 5, Manufacturing and Construction, starts here." error={err('siteStart')}>
          <Input type="date" value={draft.siteStart} onChange={(e) => setDraft((d) => ({ ...d, siteStart: e.target.value }))} data-testid="programme-site-start" />
        </Field>
        <Field label="Practical completion" hint={view.constructionText ? `Stage 6, Handover, starts here. Construction runs ${view.constructionText}.` : 'Stage 6, Handover, starts here.'} error={err('practicalCompletion')}>
          <Input type="date" value={draft.practicalCompletion} onChange={(e) => setDraft((d) => ({ ...d, practicalCompletion: e.target.value }))} data-testid="programme-completion" />
        </Field>
        <Field label="Materials needed on site from" hint="Between site start and practical completion." error={err('startDate')} className="sm:col-span-2">
          <Input type="date" value={draft.startDate} onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))} data-testid="programme-materials-from" />
        </Field>
      </div>
    </form>
  )
}
