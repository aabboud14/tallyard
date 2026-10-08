// One inventory item: its photos, the surveyor's record (editable while the lot is private), and for the owner the
// figures, the decision on visibility and availability, and any requests. Used in the inventory side panel and on
// the item's own page.
import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Globe, ImagePlus, Inbox, Lock, LoaderCircle, Trash2 } from 'lucide-react'
import type { Condition, Recoverability } from '../../domain/types'
import { LABELS } from '../../domain/reference/labels'
import { FAMILIES } from '../../domain/reference/families'
import { formatDate } from '../../domain/dates'
import * as f from '../../domain/format'
import { act, getData, newPhotoId, putPhoto, reencodePhoto, selectors, useView } from '../../store'
import type { ItemDetail } from '../../store/selectors/owner'
import { Button, Card, CardBody, cx, DescriptionList, Field, IndicativeMarker, Input, Pill, SegmentedControl, Textarea, toast, Tooltip } from '../../ui'
import { PhotoTile } from './photos'
import { MonthPicker } from './MonthPicker'
import { ListingEditor } from './ListingEditor'
import { CONDITION_TEXT, RECOVERABILITY_TEXT, VISIBILITY_TONE } from './labels'

const GRADES = ['A', 'B', 'C'] as const

export function ItemPanel({ buildingId, itemId, layout = 'sheet' }: { buildingId: string; itemId: string; layout?: 'sheet' | 'page' }) {
  const d = useView(selectors.itemDetail, buildingId, itemId)
  if (!d) return <p className="m-0 text-base text-muted">This item could not be found. It may have been removed.</p>
  const record = (
    <>
      <Photos d={d} />
      <RecordFacts d={d} />
      <EditRecord key={`${d.item.condition}${d.item.recoverability}${d.item.expectedAvailableFrom}${d.item.location}${d.item.notes}`} d={d} buildingId={buildingId} />
    </>
  )
  if (layout === 'sheet')
    return (
      <div className="flex flex-col gap-6" data-testid="item-panel">
        <Photos d={d} />
        {d.owner ? <OwnerSide d={d} buildingId={buildingId} /> : null}
        <div className={cx('flex flex-col gap-6', d.owner && 'border-t border-line-soft pt-6')}>
          {d.owner ? <h3 className="m-0 text-sm font-semibold text-ink">The record</h3> : null}
          <RecordFacts d={d} />
          <EditRecord key={`${d.item.condition}${d.item.recoverability}${d.item.expectedAvailableFrom}${d.item.location}${d.item.notes}`} d={d} buildingId={buildingId} />
        </div>
      </div>
    )
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]" data-testid="item-page">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardBody className="flex flex-col gap-6">{record}</CardBody>
        </Card>
      </div>
      {d.owner ? (
        <Card>
          <CardBody>
            <OwnerSide d={d} buildingId={buildingId} />
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}

function Photos({ d }: { d: ItemDetail }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const owner = !!d.owner
  const add = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      for (const file of files) {
        const blob = await reencodePhoto(file)
        const id = newPhotoId()
        await putPhoto(id, blob)
        const r = act.addPhoto(d.itemId, id)
        if (!r.ok) throw new Error(r.error ?? 'Could not add the photo.')
      }
      toast.success(files.length === 1 ? 'Photo added' : `${files.length} photos added`, { description: 'Photos start private.' })
    } catch (err) {
      toast.error('Could not add the photo', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-label="Photos">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold text-ink">Photos</h3>
        <span className="text-xs text-muted">{owner ? 'Private unless you make one public' : 'Private to the owner and you'}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {d.photos.map((p, i) => (
          <div key={p.id} className="flex shrink-0 flex-col gap-1.5">
            <PhotoTile photo={p} alt={`Photo ${i + 1} of ${d.tag}`} size="lg">
              {owner ? null : (
                <button type="button" onClick={() => act.removePhoto(d.itemId, p.id)} aria-label={`Remove photo ${i + 1}`} className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-md bg-white/90 text-ink-soft shadow-sm hover:text-danger max-sm:size-9">
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </PhotoTile>
            {owner ? (
              <Tooltip content={p.isPublic ? 'Shown on the listing. Click to make private.' : 'Private. Click to show it on the listing.'}>
                <button
                  type="button"
                  onClick={() => {
                    const r = act.setPhotoPublic(d.itemId, p.id, !p.isPublic)
                    if (!r.ok) toast.error(r.error ?? 'Could not change the photo.')
                  }}
                  aria-pressed={p.isPublic}
                  className={cx('inline-flex h-7 items-center justify-center gap-1 rounded-md text-xs font-medium ring-1 ring-inset max-sm:h-10', p.isPublic ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-surface text-muted ring-line')}
                  data-testid="photo-public"
                >
                  {p.isPublic ? <Globe aria-hidden="true" className="size-3" /> : <Lock aria-hidden="true" className="size-3" />}
                  {p.isPublic ? 'Public' : 'Private'}
                </button>
              </Tooltip>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex size-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-page text-sm text-muted transition-colors hover:border-muted hover:text-ink disabled:opacity-60"
          data-testid="add-photo"
        >
          {busy ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <ImagePlus aria-hidden="true" className="size-5" />}
          Add photo
        </button>
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={add} />
      </div>
    </section>
  )
}

function RecordFacts({ d }: { d: ItemDetail }) {
  const i = d.item
  return (
    <section aria-label="Record">
      <DescriptionList
        items={[
          { label: 'Material', value: d.familyLabel, hint: d.typologyLabel },
          { label: 'Quantity', value: d.quantityText, hint: f.massT(d.massT) },
          { label: 'Condition', value: `${i.condition}, ${CONDITION_TEXT[i.condition].label.toLowerCase()}` },
          { label: 'Recoverability', value: `${i.recoverability}, ${RECOVERABILITY_TEXT[i.recoverability].label.toLowerCase()}` },
          { label: 'Expected', value: d.expectedText, hint: 'Set by the surveyor' },
          { label: 'Location', value: i.location || 'Not recorded' },
          { label: 'Captured', value: `${formatDate(i.capturedOn)}`, hint: i.capturedBy },
        ]}
      />
    </section>
  )
}

function EditRecord({ d, buildingId }: { d: ItemDetail; buildingId: string }) {
  const cap = useView(selectors.captureView, buildingId)
  const i = d.item
  const startMonth = (i.expectedAvailableFrom ?? cap?.defaultMonth ?? '2027-01').slice(0, 7)
  const [condition, setCondition] = useState<Condition>(i.condition)
  const [recov, setRecov] = useState<Recoverability>(i.recoverability)
  const [month, setMonth] = useState(startMonth)
  const [location, setLocation] = useState(i.location)
  const [notes, setNotes] = useState(i.notes)
  const dirty = condition !== i.condition || recov !== i.recoverability || month !== startMonth || location !== i.location || notes !== i.notes
  const save = () => {
    const patch: Parameters<typeof act.updateItem>[1] = { location, notes }
    if (d.canEditGrades) {
      if (condition !== i.condition) patch.condition = condition
      if (recov !== i.recoverability) patch.recoverability = recov
      if (month !== startMonth) patch.expectedAvailableFrom = selectors.expectedFromMonth(getData(), buildingId, month)
    }
    const r = act.updateItem(d.itemId, patch)
    if (!r.ok) return toast.error(r.error ?? 'Could not save the record.')
    toast.success(`${d.tag} updated`, { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <section aria-label="Edit the record" className="flex flex-col gap-4 rounded-lg border border-line-soft bg-page/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold text-ink">Survey record</h3>
        {!d.canEditGrades ? <span className="text-xs text-muted">Grades are fixed once the lot is shared or published</span> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Condition">
          <SegmentedControl label="Condition" value={condition} onValueChange={(x) => d.canEditGrades && setCondition(x as Condition)} items={GRADES.map((g) => ({ value: g, label: g }))} className={cx('w-full [&>*]:flex-1', !d.canEditGrades && 'pointer-events-none opacity-60')} />
        </Field>
        <Field label="Recoverability">
          <SegmentedControl label="Recoverability" value={recov} onValueChange={(x) => d.canEditGrades && setRecov(x as Recoverability)} items={GRADES.map((g) => ({ value: g, label: g }))} className={cx('w-full [&>*]:flex-1', !d.canEditGrades && 'pointer-events-none opacity-60')} />
        </Field>
      </div>
      <Field label="Expected availability" hint={LABELS.L43}>
        <MonthPicker idPrefix={`expected-${d.itemId}`} value={month} years={cap?.yearOptions ?? []} onChange={setMonth} disabled={!d.canEditGrades} />
      </Field>
      <Field label="Location in the building">
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {dirty ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setCondition(i.condition)
              setRecov(i.recoverability)
              setMonth(startMonth)
              setLocation(i.location)
              setNotes(i.notes)
            }}
          >
            Discard
          </Button>
          <Button variant="primary" onClick={save} data-testid="record-save">
            Save changes
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function OwnerSide({ d, buildingId }: { d: ItemDetail; buildingId: string }) {
  const o = d.owner!
  const fig = o.figures
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Figures">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="m-0 text-sm font-semibold text-ink">Your figures</h3>
          <IndicativeMarker />
        </div>
        <dl className="m-0 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft">
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-xs text-muted">Guide price</dt>
            <dd className="m-0 mt-0.5 text-base font-semibold tabular-nums text-ink">{f.priceOnly(fig.guide.guide, d.item.family)}</dd>
            <dd className="m-0 text-xs text-muted">{FAMILIES[d.item.family].pricingUnitLabel}</dd>
          </div>
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-xs text-muted">Carbon avoided</dt>
            <dd className="m-0 mt-0.5 text-base font-semibold tabular-nums text-ink">{fig.carbon ? f.number(fig.carbon.avoided, 1) : 'None'}</dd>
            <dd className="m-0 text-xs text-muted">{fig.carbon ? 'tCO2e if reused' : 'Not claimed'}</dd>
          </div>
          <div className="bg-surface px-3 py-2.5">
            <dt className="text-xs text-muted">Route</dt>
            <dd className="m-0 mt-0.5 text-base font-semibold text-ink">{o.routeLabel}</dd>
            <dd className="m-0 text-xs text-muted">Decision tree</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Visibility and availability">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="m-0 text-sm font-semibold text-ink">Visibility and availability</h3>
          <Pill tone={VISIBILITY_TONE[o.visibility]} dot size="sm">
            {o.visibilityLabel}
          </Pill>
        </div>
        <ListingEditor
          key={`${o.visibility}${o.ask}${o.reserve}${o.availableFrom}`}
          compact
          lot={{ lotId: d.lotId, family: d.item.family, visibility: o.visibility, ask: o.ask, reserve: o.reserve, availableFrom: o.availableFrom, suggested: { ask: fig.sellerMandate.ask, reserve: fig.sellerMandate.reserve }, guide: fig.guide.guide, unitLabel: FAMILIES[d.item.family].pricingUnitLabel, reserved: o.reserved }}
        />
      </section>

      {o.requests.length > 0 ? (
        <section aria-label="Requests">
          <h3 className="m-0 mb-2 text-sm font-semibold text-ink">Requests</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {o.requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-medium text-ink">{r.buyer.kind === 'blind' ? r.buyer.text : r.buyer.org}</p>
                  <p className="m-0 text-xs text-muted">
                    {r.statusLabel} · {r.timeAgo}
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost" icon={Inbox}>
                  <Link to="/app/requests">Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Link to={`/app/buildings/${buildingId}/priorities`} className="inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium text-ink-soft hover:text-ink">
        See where it ranks in Priorities
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </Link>
    </div>
  )
}
