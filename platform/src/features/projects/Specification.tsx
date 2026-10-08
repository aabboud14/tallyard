// The specification schedule: one clause per approved material (the draft adds those shortlisted and with the
// client), every public field grouped by section, the architect's note per clause and for the whole schedule,
// the caveats, and two ways out: a spreadsheet and an A4 print.
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { FileSpreadsheet, Kanban, PackageCheck, Printer, ScrollText } from 'lucide-react'
import { formatDate } from '../../domain/dates'
import { act, useNow, useView } from '../../store'
import { specificationView, type SpecificationView, type SpecMode } from '../../store/selectors/shortlist'
import { Button, cx, EmptyState, SegmentedControl, StatusPill, Textarea, toast } from '../../ui'
import { downloadBlob } from '../../app/download'
import { ProjectPage } from './ProjectParts'
import { buildSpecWorkbook, XLSX_MIME } from './specExport'
import './spec-print.css'

/** A note that saves itself when the field loses focus, or on Cmd or Ctrl Enter. */
function NoteEditor({ value, onSave, label, placeholder, testId }: { value: string; onSave: (text: string) => boolean; label: string; placeholder: string; testId?: string }) {
  const [text, setText] = useState(value)
  const [shown, setShown] = useState(value)
  const [saved, setSaved] = useState(false)
  // A note changed elsewhere (another tab, an undo) replaces what is in the field.
  if (value !== shown) {
    setShown(value)
    setText(value)
  }
  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 1800)
    return () => clearTimeout(t)
  }, [saved])
  const commit = () => {
    if (text.trim() === value.trim()) return
    if (onSave(text)) setSaved(true)
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between print:hidden">
        <label className="text-xs font-medium text-muted" htmlFor={testId}>
          {label}
        </label>
        <span aria-live="polite" className={cx('text-xs text-brand-700 transition-opacity', saved ? 'opacity-100' : 'opacity-0')}>
          Saved
        </span>
      </div>
      <Textarea
        id={testId}
        data-testid={testId}
        rows={2}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            commit()
          }
        }}
        className="min-h-[60px] bg-page/60 text-sm print:hidden"
      />
      {value ? <p className="m-0 hidden whitespace-pre-wrap text-[9pt] text-ink print:block">{value}</p> : null}
    </div>
  )
}

function ReadNote({ value, label }: { value: string; label: string }) {
  if (!value) return null
  return (
    <div className="rounded-md bg-page px-3 py-2">
      <p className="m-0 text-xs font-medium text-muted">{label}</p>
      <p className="m-0 mt-0.5 whitespace-pre-wrap text-sm text-ink">{value}</p>
    </div>
  )
}

function Clause({ clause, index, view, projectId }: { clause: SpecificationView['clauses'][number]; index: number; view: SpecificationView; projectId: string }) {
  const sections: { section: string; rows: { label: string; value: string }[] }[] = []
  for (const r of clause.rows) {
    // The heading already carries the title and the public ID.
    if (r.section === 'Identity' && (r.label === 'Public ID' || r.label === 'Title')) continue
    const s = sections.find((x) => x.section === r.section)
    if (s) s.rows.push(r)
    else sections.push({ section: r.section, rows: [r] })
  }
  return (
    <article className="spec-clause border-t border-line pt-6" data-testid={`clause-${clause.publicId}`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-ink px-1.5 text-xs font-semibold tabular-nums text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-md font-semibold text-ink">{clause.title}</h3>
          <p className="m-0 mt-0.5 font-mono text-xs text-muted">{clause.publicId}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {clause.reserved ? (
            <span className="inline-flex h-5 items-center gap-1 rounded-full bg-brand-50 px-2 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
              <PackageCheck aria-hidden="true" className="size-3" />
              Reserved
            </span>
          ) : null}
          <StatusPill status={clause.status} size="sm" />
        </div>
      </div>
      <div className="spec-sections mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <div key={s.section} className="min-w-0">
            <h4 className="m-0 mb-1.5 text-xs font-medium uppercase tracking-[0.04em] text-faint">{s.section}</h4>
            <dl className="m-0 flex flex-col gap-1">
              {s.rows.map((r) => (
                <div key={r.label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-3 text-sm">
                  <dt className="text-muted">{r.label}</dt>
                  <dd className="m-0 break-words text-ink">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="mt-4">
        {view.canEdit ? (
          <NoteEditor
            value={clause.note}
            label="Architect's note"
            placeholder="Add a note for this clause: fixing, testing, finish, tolerances"
            testId={`clause-note-${clause.publicId}`}
            onSave={(text) => {
              const r = act.editSpecClauseNote(projectId, clause.publicId, text)
              if (!r.ok) toast.error(r.error ?? 'The note could not be saved.')
              return r.ok
            }}
          />
        ) : (
          <ReadNote value={clause.note} label="Architect's note" />
        )}
      </div>
    </article>
  )
}

export function Specification() {
  const { projectId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const approved = useView(specificationView, projectId, 'approved' as SpecMode)
  const draft = useView(specificationView, projectId, 'draft' as SpecMode)
  const today = useNow().slice(0, 10)
  const [exporting, setExporting] = useState(false)
  if (!approved || !draft) return null
  const asked = params.get('mode')
  const mode: SpecMode = asked === 'draft' || asked === 'approved' ? asked : approved.counts.approved === 0 && draft.counts.draft > 0 ? 'draft' : 'approved'
  const view = mode === 'approved' ? approved : draft

  const exportXlsx = async () => {
    setExporting(true)
    try {
      const buf = await buildSpecWorkbook(view, today)
      downloadBlob(new Blob([buf], { type: XLSX_MIME }), view.fileName)
      toast.success('Specification exported', { description: view.fileName })
    } catch {
      toast.error('The spreadsheet could not be made. Try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <ProjectPage testId="specification">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <SegmentedControl
          label="Which materials"
          value={mode}
          onValueChange={(v) => setParams(v === 'approved' ? { mode: 'approved' } : { mode: 'draft' }, { replace: true })}
          items={[
            { value: 'approved', label: `Approved ${view.counts.approved}` },
            { value: 'draft', label: `Draft ${view.counts.draft}` },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={Printer} onClick={() => window.print()} disabled={view.empty} data-testid="print-spec">
            Print
          </Button>
          <Button variant="primary" icon={FileSpreadsheet} onClick={() => void exportXlsx()} loading={exporting} disabled={view.empty} data-testid="export-spec">
            Export spreadsheet
          </Button>
        </div>
      </div>

      <div className="spec-paper mx-auto mt-6 max-w-[920px] rounded-xl border border-line bg-surface px-5 py-7 shadow-sm sm:px-10 sm:py-10" data-testid="spec-paper" data-mode={mode}>
        <header className="spec-head flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="m-0 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">
              <ScrollText aria-hidden="true" className="size-3.5" />
              {mode === 'approved' ? 'Specification schedule' : 'Draft specification schedule'}
            </p>
            <h2 className="m-0 mt-2 text-xl font-semibold text-ink">{view.project.name}</h2>
            <p className="m-0 mt-1 text-sm text-ink-soft">{view.sheet.projectLine}</p>
          </div>
          <div className="shrink-0 text-sm text-muted sm:text-right">
            <p className="m-0">{view.project.clientName}</p>
            <p className="m-0 tabular-nums">{formatDate(today)}</p>
          </div>
        </header>

        {view.canEdit || view.headerNote ? (
          <div className={cx('mt-6', !view.headerNote && 'print:hidden')}>
            {view.canEdit ? (
              <NoteEditor
                value={view.headerNote}
                label="Notes for this schedule"
                placeholder="General notes: what this schedule is for, who should check it, what to confirm before tender"
                testId="spec-header-note"
                onSave={(text) => {
                  const r = act.editSpecHeader(projectId, text)
                  if (!r.ok) toast.error(r.error ?? 'The note could not be saved.')
                  return r.ok
                }}
              />
            ) : (
              <ReadNote value={view.headerNote} label="Notes for this schedule" />
            )}
          </div>
        ) : null}

        {view.empty ? (
          <EmptyState
            icon={Kanban}
            title={mode === 'approved' ? 'Nothing approved yet' : 'Nothing shortlisted yet'}
            text={mode === 'approved' ? 'Clauses appear here when the client approves materials. The draft shows what is shortlisted now.' : 'Shortlist materials for this project and they appear here as draft clauses.'}
            action={
              mode === 'approved' && view.counts.draft > 0 ? (
                <Button onClick={() => setParams({ mode: 'draft' }, { replace: true })}>See the draft</Button>
              ) : view.canEdit ? (
                <Button asChild>
                  <Link to={`/app/projects/${projectId}/shortlist`}>Open the shortlist</Link>
                </Button>
              ) : undefined
            }
            className="print:hidden"
          />
        ) : (
          <div className={cx('mt-8 flex flex-col gap-8', !view.canEdit && !view.headerNote && '[&>article:first-child]:border-t-0 [&>article:first-child]:pt-0')}>
            {view.clauses.map((c, i) => (
              <Clause key={c.publicId} clause={c} index={i} view={view} projectId={projectId} />
            ))}
          </div>
        )}

        <footer className="mt-10 border-t border-line pt-5">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs leading-5 text-muted" data-testid="spec-caveats">
            {view.sheet.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </footer>
      </div>
    </ProjectPage>
  )
}
