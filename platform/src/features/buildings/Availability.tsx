// The deconstruction contractor's Availability tab: say when each item is expected to come out, beside the
// surveyor's estimate and the owner's programme. The owner sees these dates and decides what buyers see; nothing
// here reaches a listing.
import { useState } from 'react'
import { useParams } from 'react-router'
import { CalendarClock, CalendarRange, Eraser, PackageOpen, Save } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { AvailabilityView } from '../../store/selectors/contractor'
import { availabilityDraft, changedDates, fillBlankMonths } from '../../store/selectors/buildings-ui'
import { Button, Card, EmptyState, IconButton, Table, TBody, TD, TH, THead, TR, toast } from '../../ui'
import { MonthPicker } from './MonthPicker'

export function Availability() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.availabilityView, buildingId)
  if (!v) return null
  return <AvailabilityForm key={buildingId} v={v} buildingId={buildingId} />
}

function AvailabilityForm({ v, buildingId }: { v: AvailabilityView; buildingId: string }) {
  const [draft, setDraft] = useState<Record<string, string | null>>(() => availabilityDraft(v.rows))
  const [saved, setSaved] = useState(v.rows)
  // Saving or another person's change brings new rows: start again from them.
  if (saved !== v.rows) {
    setSaved(v.rows)
    setDraft(availabilityDraft(v.rows))
  }
  const changes = changedDates(v.rows, draft)
  const setMonth = (itemId: string, month: string | null) => setDraft((d) => ({ ...d, [itemId]: month }))
  const save = () => {
    const r = act.setContractorDates(buildingId, changes)
    if (!r.ok) return toast.error(r.error ?? 'Could not save the dates.')
    toast.success(`${r.value ?? changes.length} ${r.value === 1 ? 'date' : 'dates'} saved`, { description: 'The owner has been told.', action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div className="flex flex-col gap-6 pb-24 sm:pb-0" data-testid="availability">
      <p className="m-0 max-w-2xl text-base text-ink-soft">Say when each item is expected to come out. The owner sees your dates and decides what buyers see.</p>
      <Card padding="md" className="flex flex-col gap-3">
        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarRange aria-hidden="true" className="size-4 text-faint" />
          The owner's programme
        </p>
        <dl className="m-0 grid gap-3 sm:grid-cols-3">
          {v.programme.map((p) => (
            <div key={p.label}>
              <dt className="text-sm text-muted">{p.label}</dt>
              <dd className="m-0 mt-0.5 text-base font-medium text-ink">{p.text}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {v.empty ? (
        <EmptyState variant="page" icon={PackageOpen} title="No items captured yet" text="Items appear here as the surveyor captures them. Come back to date each one." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted" data-testid="availability-count">
              Dates set for {v.datedCount} of {v.rows.length} items
            </p>
            <Button size="sm" icon={CalendarClock} onClick={() => setDraft((d) => fillBlankMonths(v.rows, d, v.defaultMonth))} data-testid="fill-blanks">
              Fill blanks from the programme
            </Button>
          </div>
          <Table className="max-md:hidden" caption="Expected months" data-testid="availability-table">
            <THead>
              <tr>
                <TH>Item</TH>
                <TH align="right">Quantity</TH>
                <TH>Location</TH>
                <TH>Surveyor expects</TH>
                <TH className="w-[300px]">Your month</TH>
              </tr>
            </THead>
            <TBody>
              {v.rows.map((r) => {
                const month = draft[r.itemId] ?? null
                return (
                  <TR key={r.itemId} data-testid={`avail-${r.tag}`}>
                    <TD>
                      <span className="text-xs font-medium tabular-nums text-muted">{r.tag}</span>
                      <span className="block font-medium text-ink">{r.title}</span>
                      <span className="block text-sm text-muted">{r.typologyLabel}</span>
                    </TD>
                    <TD align="right" className="whitespace-nowrap">
                      {r.quantityText}
                    </TD>
                    <TD muted>{r.location || 'Not recorded'}</TD>
                    <TD muted className="whitespace-nowrap">
                      {r.surveyorText}
                    </TD>
                    <TD>
                      <MonthCell idPrefix={`avail-${r.tag}`} month={month} fallback={v.defaultMonth} years={v.yearOptions} onChange={(m) => setMonth(r.itemId, m)} />
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden" data-testid="availability-cards">
            {v.rows.map((r) => (
              <li key={r.itemId} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3.5">
                <div>
                  <p className="m-0 text-xs font-medium tabular-nums text-muted">{r.tag}</p>
                  <p className="m-0 font-medium text-ink">{r.title}</p>
                  <p className="m-0 text-sm text-muted">
                    {r.quantityText}
                    {r.location ? `, ${r.location}` : ''}. Surveyor expects {r.surveyorText}.
                  </p>
                </div>
                <MonthCell idPrefix={`avail-m-${r.tag}`} month={draft[r.itemId] ?? null} fallback={v.defaultMonth} years={v.yearOptions} onChange={(m) => setMonth(r.itemId, m)} />
              </li>
            ))}
          </ul>
          <div data-bottom-bar="" className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
            <span className="text-sm text-muted" aria-live="polite">
              {changes.length === 0 ? 'No unsaved changes' : `${changes.length} ${changes.length === 1 ? 'change' : 'changes'} to save`}
            </span>
            <Button variant="primary" size="lg" icon={Save} disabled={changes.length === 0} onClick={save} data-testid="save-dates">
              Save dates
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/** A month, or a button to set one; set months can be cleared. */
function MonthCell({ idPrefix, month, fallback, years, onChange }: { idPrefix: string; month: string | null; fallback: string; years: number[]; onChange: (m: string | null) => void }) {
  if (!month)
    return (
      <Button size="sm" variant="ghost" icon={CalendarClock} onClick={() => onChange(fallback)} title="Starts at the dismantling month" data-testid={`${idPrefix}-set`}>
        Set month
      </Button>
    )
  return (
    <div className="flex items-center gap-1.5">
      <MonthPicker idPrefix={idPrefix} value={month} years={years} onChange={onChange} className="flex-1" />
      <IconButton icon={Eraser} label="Clear the month" size="sm" onClick={() => onChange(null)} />
    </div>
  )
}

export default Availability
