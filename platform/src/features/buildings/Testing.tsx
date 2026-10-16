// The building's Testing tab, for the owner and the surveyor: ask one of the testing companies to inspect or test
// items, then record the site visit and the results. Results update each item's test status (and a steel grade),
// which buyers see on listings; on shared or published lots only the owner records them. Nothing is sent in the
// sandbox: the request is recorded here and the other side is told.
import { useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { CalendarCheck, ClipboardCheck, Copy, Download, FileText, FlaskConical, Mail, Plus, Quote, X } from 'lucide-react'
import type { SteelGrade } from '../../domain/types'
import { FAMILIES } from '../../domain/reference/families'
import { act, selectors, useView, type TestResult, type TestService } from '../../store'
import type { TestingRow } from '../../store/selectors/testing'
import { testingResultsForm } from '../../store/selectors/buildings-ui'
import { downloadText } from '../../app/download'
import { Button, Callout, Card, Checkbox, Dialog, EmptyState, Field, Input, Pill, RadioCards, Select, SegmentedControl, Textarea, toast } from '../../ui'

export function Testing() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.testingView, buildingId)
  const [params, setParams] = useSearchParams()
  const preselect = (params.get('items') ?? '').split(',').filter(Boolean)
  const [requesting, setRequesting] = useState(preselect.length > 0)
  const [booking, setBooking] = useState<TestingRow | null>(null)
  const [recording, setRecording] = useState<TestingRow | null>(null)
  const [cancelling, setCancelling] = useState<TestingRow | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  if (!v) return null
  const viewingRow = viewing ? (v.rows.find((r) => r.id === viewing) ?? null) : null
  const closeRequest = () => {
    setRequesting(false)
    if (params.has('items')) {
      const next = new URLSearchParams(params)
      next.delete('items')
      setParams(next, { replace: true })
    }
  }
  return (
    <div className="flex flex-col gap-6" data-testid="testing">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="m-0 max-w-2xl text-base text-ink-soft">Ask a testing company to inspect or test items. Results update each item's test status, which buyers see on listings.</p>
        {!v.empty ? (
          <Button variant="primary" icon={Plus} className="shrink-0" onClick={() => setRequesting(true)} data-testid="request-testing">
            Request testing
          </Button>
        ) : null}
      </div>
      {v.empty ? (
        <EmptyState
          variant="page"
          icon={FlaskConical}
          title="No testing requested yet"
          text="Testing confirms grade and condition. Buyers see the test status on each listing."
          action={
            <Button variant="primary" icon={Plus} onClick={() => setRequesting(true)} data-testid="request-testing">
              Request testing
            </Button>
          }
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {v.rows.map((r) => (
            <li key={r.id}>
              <RequestCard r={r} owner={v.header.side === 'owner'} onView={() => setViewing(r.id)} onBook={() => setBooking(r)} onRecord={() => setRecording(r)} onCancel={() => setCancelling(r)} />
            </li>
          ))}
        </ul>
      )}
      {requesting ? <RequestDialog buildingId={buildingId} preselect={preselect} onClose={closeRequest} /> : null}
      {viewingRow ? <SheetDialog row={viewingRow} onClose={() => setViewing(null)} /> : null}
      {booking ? <BookingDialog row={booking} onClose={() => setBooking(null)} /> : null}
      {recording ? <ResultsDialog row={recording} onClose={() => setRecording(null)} /> : null}
      {cancelling ? <CancelDialog row={cancelling} onClose={() => setCancelling(null)} /> : null}
    </div>
  )
}

const STEPS: { status: TestingRow['status']; label: string }[] = [
  { status: 'requested', label: 'Sent' },
  { status: 'booked', label: 'Visit booked' },
  { status: 'results', label: 'Results recorded' },
]

function RequestCard({ r, owner, onView, onBook, onRecord, onCancel }: { r: TestingRow; owner: boolean; onView: () => void; onBook: () => void; onRecord: () => void; onCancel: () => void }) {
  const reached = STEPS.findIndex((s) => s.status === r.status)
  return (
    <Card className="overflow-hidden" data-testid={`testing-${r.id}`}>
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-lg font-semibold text-ink">{r.companyName}</h3>
            <p className="m-0 mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <Mail aria-hidden="true" className="size-3.5 text-faint" />
              {r.companyEmail}
            </p>
          </div>
          <Pill tone={r.statusTone} dot size="sm" data-testid="testing-status">
            {r.statusLabel}
          </Pill>
        </div>
        {r.status !== 'cancelled' ? (
          <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s.status} className="flex flex-col gap-1.5">
                <span aria-hidden="true" className={`h-1 rounded-full ${i <= reached ? 'bg-brand-600' : 'bg-line'}`} />
                <span className={`text-xs ${i <= reached ? 'font-medium text-ink' : 'text-muted'}`}>
                  {s.label}
                  {i <= reached ? <span className="sr-only">, done</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <dl className="m-0 grid gap-4 sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-xs text-muted">Tests</dt>
            <dd className="m-0 mt-0.5 text-base text-ink">{r.services.join(', ')}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Items</dt>
            <dd className="m-0 mt-1 flex flex-wrap gap-1">
              {r.items.map((i) => (
                <span key={i.itemId} title={i.title} className="rounded bg-subtle px-1.5 py-0.5 text-xs font-medium tabular-nums text-ink-soft ring-1 ring-inset ring-line-soft">
                  {i.tag}
                </span>
              ))}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Requested</dt>
            <dd className="m-0 mt-0.5 text-base text-ink">
              {r.requestedByName}, {r.requestedText}
            </dd>
            {r.preferredText ? (
              <dd className="m-0 text-sm text-muted" data-testid="testing-preferred">
                Preferred from {r.preferredText}
              </dd>
            ) : null}
            {r.bookedText ? <dd className="m-0 text-sm font-medium text-info">Visit {r.bookedText}</dd> : null}
          </div>
        </dl>
        {r.message ? (
          <blockquote className="m-0 flex gap-2 rounded-md bg-subtle px-3 py-2 text-sm text-ink-soft" data-testid="testing-message">
            <Quote aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-faint" />
            <span className="min-w-0 break-words">{r.message}</span>
          </blockquote>
        ) : null}
        {r.results.length > 0 ? (
          <table className="w-full border-collapse text-left text-sm" data-testid="testing-results">
            <caption className="sr-only">Results</caption>
            <thead>
              <tr className="border-b border-line-soft text-xs text-muted">
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  Item
                </th>
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  Result
                </th>
                <th scope="col" className="py-1.5 font-medium">
                  Grade and note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {r.results.map((x) => (
                <tr key={x.tag}>
                  <th scope="row" className="py-1.5 pr-3 font-medium tabular-nums text-ink">
                    {x.tag}
                  </th>
                  <td className="py-1.5 pr-3 text-ink-soft">{x.statusLabel}</td>
                  <td className="py-1.5 text-ink-soft">{[x.gradeText, x.note].filter(Boolean).join('. ') || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
          <p className="m-0 text-sm text-muted">{r.canRecord && r.recordLocked && !owner ? 'Some items are shared or published. The owner records those results.' : r.canBook ? 'Record what the company tells you. Nothing is sent from the sandbox.' : 'What was asked of the company stays here for reference.'}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" icon={FileText} onClick={onView} data-testid="testing-view">
              View request
            </Button>
              {r.canCancel ? (
                <Button size="sm" variant="ghost" icon={X} onClick={onCancel} data-testid="testing-cancel">
                  Cancel
                </Button>
              ) : null}
              {r.canBook ? (
                <Button size="sm" variant={r.canRecord ? 'secondary' : 'primary'} icon={CalendarCheck} onClick={onBook} data-testid="testing-book">
                  {r.bookedText ? 'Change booking' : 'Record booking'}
                </Button>
              ) : null}
              {r.canRecord ? (
                <Button size="sm" variant="primary" icon={ClipboardCheck} onClick={onRecord} data-testid="testing-record">
                  Record results
                </Button>
              ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}

/** What the testing company would receive, with copy and download. Nothing is sent from the sandbox. */
function SheetDialog({ row, onClose }: { row: TestingRow; onClose: () => void }) {
  const sh = row.sheet
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(row.sheetText)
      toast.success('Request copied', { description: 'Paste it into an email to the company.' })
    } catch {
      toast.error('Could not copy here. Use Download .txt instead.')
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(x) => !x && onClose()}
      title={`Request to ${sh.companyName}`}
      description="Nothing is sent from the sandbox. This is what the company would receive."
      size="lg"
      testId="testing-sheet"
      footer={
        <>
          <Button icon={Copy} onClick={copy} data-testid="testing-sheet-copy">
            Copy text
          </Button>
          <Button icon={Download} onClick={() => downloadText(row.sheetText, row.fileName, 'text/plain')} data-testid="testing-sheet-download">
            Download .txt
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 text-base">
        <dl className="m-0 grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted">To</dt>
            <dd className="m-0 mt-0.5 break-words text-ink">
              {sh.companyName}
              <span className="block text-sm text-muted">{sh.companyEmail}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">From</dt>
            <dd className="m-0 mt-0.5 break-words text-ink">
              {[sh.fromName, sh.fromOrg].filter(Boolean).join(', ')}
              <span className="block text-sm text-muted">{sh.fromEmail}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Building</dt>
            <dd className="m-0 mt-0.5 break-words text-ink">
              {sh.buildingName}
              <span className="block text-sm text-muted">{sh.buildingAddress}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Requested</dt>
            <dd className="m-0 mt-0.5 text-ink">{sh.requestedText}</dd>
            <dd className="m-0 text-sm text-muted">Preferred from {sh.preferredText ?? 'any date'}</dd>
          </div>
        </dl>
        <div>
          <h3 className="m-0 text-sm font-semibold text-ink">Tests</h3>
          <ul className="m-0 mt-1 list-disc pl-5 text-ink-soft">
            {sh.tests.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="m-0 text-sm font-semibold text-ink">Items ({sh.items.length})</h3>
          <ul className="m-0 mt-1 flex list-none flex-col divide-y divide-line-soft rounded-lg border border-line p-0" data-testid="testing-sheet-items">
            {sh.items.map((i) => (
              <li key={i.tag} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted">{i.tag}</span>
                <span className="min-w-0 flex-1 text-ink">
                  {i.title}, {i.quantityText}
                </span>
                {i.location ? <span className="text-sm text-muted">{i.location}</span> : null}
              </li>
            ))}
          </ul>
        </div>
        {sh.message ? (
          <div>
            <h3 className="m-0 text-sm font-semibold text-ink">Message</h3>
            <p className="m-0 mt-1 whitespace-pre-line break-words text-ink-soft" data-testid="testing-sheet-message">
              {sh.message}
            </p>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

function RequestDialog({ buildingId, preselect, onClose }: { buildingId: string; preselect: string[]; onClose: () => void }) {
  const [itemIds, setItemIds] = useState<string[]>(preselect)
  const [services, setServices] = useState<TestService[]>([])
  const [companyId, setCompanyId] = useState('')
  const [family, setFamily] = useState('all')
  const [preferredFrom, setPreferredFrom] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const o = useView(selectors.testingDraftOptions, buildingId, { itemIds, services })
  if (!o) return null
  const families = [...new Set(o.items.map((i) => i.family))]
  const shown = family === 'all' ? o.items : o.items.filter((i) => i.family === family)
  const offered = new Set(o.services.map((s) => s.id))
  const chosenServices = services.filter((s) => offered.has(s))
  const company = o.companies.some((c) => c.id === companyId) ? companyId : ''
  const toggleItem = (id: string, on: boolean) => setItemIds((x) => (on ? [...x, id] : x.filter((y) => y !== id)))
  const toggleService = (id: TestService, on: boolean) => setServices((x) => (on ? [...x, id] : x.filter((y) => y !== id)))
  const send = (e: FormEvent) => {
    e.preventDefault()
    const r = act.requestTesting({ buildingId, itemIds, services: chosenServices, companyId: company, preferredFrom: preferredFrom || null, message })
    if (!r.ok) return setError(r.error)
    const to = o.companies.find((c) => c.id === company)?.name ?? 'the testing company'
    toast.success(`Request to ${to} recorded`, { description: o.otherSideName ? `${o.otherSideName} has been told. Open View request to see what the company would receive.` : 'Recorded here. Open View request to see what the company would receive.', action: { label: 'Undo', onClick: r.undo } })
    onClose()
  }
  const footnote = o.otherSideName ? `Nothing is sent in the sandbox. The request is recorded here and ${o.otherSideName} is told.` : 'Nothing is sent in the sandbox. The request is recorded here.'
  return (
    <Dialog
      open
      onOpenChange={(x) => !x && onClose()}
      title="Request testing"
      description="Choose the items, the tests and the company. The tests and companies follow the items you choose."
      size="lg"
      testId="testing-dialog"
      footer={
        <>
          <p className="m-0 mr-auto hidden text-sm text-muted sm:block" data-testid="testing-footnote">
            {footnote}
          </p>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={FlaskConical} type="submit" form="testing-form" data-testid="testing-send">
            Send request
          </Button>
        </>
      }
    >
      <form id="testing-form" onSubmit={send} className="flex flex-col gap-6" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-semibold text-ink">
              Items <span className="font-normal text-muted">{itemIds.length} chosen</span>
            </legend>
            {families.length > 1 ? (
              <Select aria-label="Show family" selectSize="sm" className="w-52" value={family} onChange={(e) => setFamily(e.target.value)} options={[{ value: 'all', label: 'All families' }, ...families.map((x) => ({ value: x, label: FAMILIES[x].label }))]} />
            ) : null}
          </div>
          <ul className="m-0 grid max-h-60 list-none gap-x-4 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
            {shown.map((i) => (
              <li key={i.itemId} className="px-1 py-1">
                <Checkbox
                  checked={itemIds.includes(i.itemId)}
                  onCheckedChange={(on) => toggleItem(i.itemId, on === true)}
                  label={
                    <span>
                      <span className="mr-1.5 text-xs font-medium tabular-nums text-muted">{i.tag}</span>
                      {i.title}
                    </span>
                  }
                  data-testid={`testing-item-${i.tag}`}
                />
              </li>
            ))}
          </ul>
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold text-ink">Tests</legend>
          {o.services.length === 0 ? (
            <p className="m-0 text-sm text-muted">Choose items to see the tests that suit them.</p>
          ) : (
            <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
              {o.services.map((s) => (
                <li key={s.id}>
                  <Checkbox checked={chosenServices.includes(s.id)} onCheckedChange={(on) => toggleService(s.id, on === true)} label={s.label} description={s.description} data-testid={`testing-service-${s.id}`} />
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold text-ink">Company</legend>
          {o.noCompanyText ? (
            <Callout tone="warning">{o.noCompanyText}</Callout>
          ) : chosenServices.length === 0 ? (
            <p className="m-0 text-sm text-muted">Choose the tests to see who can do them in this region.</p>
          ) : (
            <RadioCards
              aria-label="Company"
              value={company}
              onValueChange={setCompanyId}
              columns={o.companies.length > 1 ? 2 : 1}
              options={o.companies.map((c) => ({ value: c.id, label: c.name, description: `${c.services.join(', ')}. ${c.email}` }))}
              data-testid="testing-company"
            />
          )}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <Field label="Preferred from" optional>
            <Input type="date" value={preferredFrom} onChange={(e) => setPreferredFrom(e.target.value)} />
          </Field>
          <Field label="Message" optional>
            <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="For example: grade unconfirmed from the archive drawings." />
          </Field>
        </div>
        <p className="m-0 text-sm text-muted sm:hidden">{footnote}</p>
      </form>
    </Dialog>
  )
}

function BookingDialog({ row, onClose }: { row: TestingRow; onClose: () => void }) {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const save = (e: FormEvent) => {
    e.preventDefault()
    const r = act.recordTestingBooked(row.id, { date, note })
    if (!r.ok) return setError(r.error)
    toast.success('Visit booked', { description: 'The other side has been told.', action: { label: 'Undo', onClick: r.undo } })
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(x) => !x && onClose()}
      title="Record the booking"
      description={`${row.companyName} confirmed a site visit.`}
      size="sm"
      testId="testing-book-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="testing-book-form" data-testid="testing-book-save">
            Save booking
          </Button>
        </>
      }
    >
      <form id="testing-book-form" onSubmit={save} className="flex flex-col gap-4" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Field label="Visit date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="testing-book-date" />
        </Field>
        <Field label="Note" optional>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: coupon cutting on levels 1 and 2" />
        </Field>
      </form>
    </Dialog>
  )
}

type Draft = { testStatus: 'inspected' | 'tested'; grade: SteelGrade | ''; note: string }

function ResultsDialog({ row, onClose }: { row: TestingRow; onClose: () => void }) {
  const f = useView(testingResultsForm, row.id)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [error, setError] = useState<string | null>(null)
  if (!f) return null
  const draftOf = (id: string): Draft => drafts[id] ?? { testStatus: f.statuses[f.statuses.length - 1].value, grade: '', note: '' }
  const set = (id: string, patch: Partial<Draft>) => setDrafts((x) => ({ ...x, [id]: { ...draftOf(id), ...patch } }))
  const save = (e: FormEvent) => {
    e.preventDefault()
    const results: TestResult[] = f.items.map((i) => {
      const d = draftOf(i.itemId)
      return { itemId: i.itemId, testStatus: d.testStatus, grade: f.grades && i.steel && d.grade ? d.grade : null, note: d.note }
    })
    const r = act.recordTestResults(row.id, results)
    if (!r.ok) return setError(r.error)
    toast.success('Results recorded', { description: 'Each item shows its test status on any listing.', action: { label: 'Undo', onClick: r.undo } })
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(x) => !x && onClose()}
      title="Record results"
      description={`From ${f.companyName}, one line per item.`}
      size="lg"
      testId="testing-results-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="testing-results-form" disabled={f.locked} data-testid="testing-results-save">
            Save results
          </Button>
        </>
      }
    >
      <form id="testing-results-form" onSubmit={save} className="flex flex-col gap-4" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {f.locked ? <Callout tone="warning">Some items are shared or published. The owner records results for those, as only the owner changes what a listing says.</Callout> : null}
        <ul className="m-0 flex list-none flex-col divide-y divide-line-soft rounded-lg border border-line p-0">
          {f.items.map((i) => {
            const d = draftOf(i.itemId)
            return (
              <li key={i.itemId} className="flex flex-col gap-3 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" data-testid={`result-${i.tag}`}>
                <div className="min-w-0">
                  <p className="m-0 font-medium text-ink">
                    <span className="mr-1.5 text-xs tabular-nums text-muted">{i.tag}</span>
                    {i.title}
                  </p>
                  {i.locked ? <p className="m-0 text-sm text-muted">The owner records this one.</p> : null}
                </div>
                {i.locked ? null : (
                  <div className="flex flex-wrap items-center gap-2">
                    {f.statuses.length > 1 ? (
                      <SegmentedControl label={`${i.tag} result`} size="sm" value={d.testStatus} onValueChange={(x) => set(i.itemId, { testStatus: x as Draft['testStatus'] })} items={f.statuses} />
                    ) : (
                      <Pill size="sm">{f.statuses[0].label}</Pill>
                    )}
                    {f.grades && i.steel ? (
                      <Select
                        aria-label={`${i.tag} steel grade`}
                        selectSize="sm"
                        className="w-32"
                        value={d.grade}
                        placeholder="Grade"
                        onChange={(e) => set(i.itemId, { grade: e.target.value as Draft['grade'] })}
                        options={[
                          { value: 'S275', label: 'S275' },
                          { value: 'S355', label: 'S355' },
                          { value: 'unknown', label: 'Unknown' },
                        ]}
                        data-testid={`result-grade-${i.tag}`}
                      />
                    ) : null}
                    <Input aria-label={`${i.tag} note`} inputSize="sm" className="w-full sm:w-44" value={d.note} onChange={(e) => set(i.itemId, { note: e.target.value })} placeholder="Note" />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </form>
    </Dialog>
  )
}

function CancelDialog({ row, onClose }: { row: TestingRow; onClose: () => void }) {
  const [note, setNote] = useState('')
  const cancel = () => {
    const r = act.cancelTesting(row.id, note)
    if (!r.ok) return toast.error(r.error ?? 'Could not cancel the request.')
    toast.success('Testing request cancelled', { action: { label: 'Undo', onClick: r.undo } })
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(x) => !x && onClose()}
      title="Cancel this testing request?"
      description={`${row.companyName}, ${row.items.length} ${row.items.length === 1 ? 'item' : 'items'}. Tell the company yourself; nothing is sent from the sandbox.`}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Keep it</Button>
          <Button variant="danger" icon={X} onClick={cancel} data-testid="testing-cancel-confirm">
            Cancel request
          </Button>
        </>
      }
    >
      <Field label="Reason" optional>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Dialog>
  )
}

export default Testing
