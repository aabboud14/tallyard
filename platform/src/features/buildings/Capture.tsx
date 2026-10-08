// Capture on site, phone first: describe the item and the fields fill from the words, then grade it, say when it
// comes out, add photos and save. "Save and capture another" keeps the place and the month for the next item.
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowRight, Camera, Check, CircleAlert, ImagePlus, LoaderCircle, MapPin, Plus, Trash2 } from 'lucide-react'
import type { FamilyId } from '../../domain/types'
import { LABELS } from '../../domain/reference/labels'
import { formatDateShort } from '../../domain/dates'
import { act, getData, newPhotoId, putPhoto, reencodePhoto, selectors, useView } from '../../store'
import { CAPTURE_FIELD_LABELS, captureInputOf, checkCaptureForm, emptyCaptureForm, fillFromDescription, measureFields, MORTAR_OPTIONS, nextCaptureForm, SPECIES_OPTIONS, type AssistFill, type CaptureField, type CaptureForm, type MeasureField } from '../../store/selectors/roles-capture'
import { Button, Card, cx, Field, Input, RadioCards, Select, Textarea, toast } from '../../ui'
import { PhotoTile } from './photos'
import { MonthPicker } from './MonthPicker'
import { SurveyBar } from './SurveyBar'
import { CONDITION_TEXT, RECOVERABILITY_TEXT } from './labels'

type DraftPhoto = { id: string; src: null }

export function Capture() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.captureView, buildingId)
  if (!v) return null
  return <CaptureForm_ key={buildingId} buildingId={buildingId} defaultMonth={v.defaultMonth} />
}

function CaptureForm_({ buildingId, defaultMonth }: { buildingId: string; defaultMonth: string }) {
  const v = useView(selectors.captureView, buildingId)!
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [form, setForm] = useState<CaptureForm>(() => emptyCaptureForm(defaultMonth))
  const [touched, setTouched] = useState<CaptureField[]>([])
  const [assist, setAssist] = useState<AssistFill | null>(null)
  const [photos, setPhotos] = useState<DraftPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [tried, setTried] = useState(false)
  const [saved, setSaved] = useState<{ itemId: string; tag: string } | null>(null)
  const top = useRef<HTMLDivElement>(null)
  const describe = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const check = checkCaptureForm(form)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(null), 8000)
    return () => clearTimeout(t)
  }, [saved])

  const onDescribe = (value: string) => {
    setText(value)
    const r = fillFromDescription(form, value, touched)
    setForm(r.form)
    setAssist(value.trim() ? r : null)
  }
  const setField = (k: CaptureField, value: string) => {
    setForm((x) => ({ ...x, [k]: value }))
    setTouched((t) => (t.includes(k) ? t : [...t, k]))
  }
  const filled = (k: CaptureField) => !!assist?.filled.includes(k) && !touched.includes(k)
  const show = (k: CaptureField) => tried && (check.missing.includes(k) || !!check.problems[k])
  const errorFor = (k: CaptureField) => (tried ? (check.problems[k] ?? (check.missing.includes(k) ? 'Required.' : undefined)) : undefined)

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const blob = await reencodePhoto(file)
        const id = newPhotoId()
        await putPhoto(id, blob)
        setPhotos((p) => [...p, { id, src: null }])
      }
    } catch {
      toast.error('That photo could not be read', { description: 'Try another photo, or a JPEG or PNG file.' })
    } finally {
      setUploading(false)
    }
  }

  const save = (another: boolean) => {
    setTried(true)
    const expected = selectors.expectedFromMonth(getData(), buildingId, form.expectedMonth)
    const input = captureInputOf(form, buildingId, photos.map((p) => p.id), expected)
    if (!input) {
      toast.error('A few fields still need you', { description: check.missing.map((k) => CAPTURE_FIELD_LABELS[k] ?? k).join(', ') || 'Check the highlighted fields.' })
      return
    }
    const r = act.captureItem(input)
    if (!r.ok || !r.value) {
      toast.error(r.error ?? 'Could not save the item.')
      return
    }
    const { itemId, tag } = r.value
    toast.success(`${tag} captured`, { description: 'Private until the owner decides.', action: { label: 'Undo', onClick: r.undo } })
    if (!another) {
      navigate(`/app/buildings/${buildingId}/inventory?item=${itemId}`)
      return
    }
    setSaved({ itemId, tag })
    setForm(nextCaptureForm(form))
    setText('')
    setTouched([])
    setAssist(null)
    setPhotos([])
    setTried(false)
    top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    describe.current?.focus({ preventScroll: true })
  }

  const family = form.family || null
  const fields = family ? measureFields(family) : []

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_300px]" data-testid="capture">
    <div ref={top} className="flex min-w-0 scroll-mt-24 flex-col gap-6 pb-28 sm:pb-0">
      {saved ? (
        <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-base text-brand-800" data-testid="capture-saved">
          <span className="flex items-center gap-2">
            <Check aria-hidden="true" className="size-4" />
            <span>
              <span className="font-semibold">{saved.tag}</span> saved. Next item.
            </span>
          </span>
          <Link to={`/app/buildings/${buildingId}/inventory?item=${saved.itemId}`} className="text-sm font-medium underline-offset-4 hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center">
            View
          </Link>
        </div>
      ) : null}

      <section aria-labelledby="describe-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="describe-title" className="m-0 text-lg font-semibold text-ink">
            New item
          </h2>
          <span className="text-sm text-muted">
            {v.itemCount} captured at {v.header.name}
          </span>
        </div>
        <Field label="Describe what you see" hint={assist ? undefined : 'Type or dictate it. The fields below fill as you write; change any of them.'}>
          <Textarea
            ref={describe}
            rows={3}
            value={text}
            onChange={(e) => onDescribe(e.target.value)}
            placeholder="48 no. UB 457x191x67, 7.5 m long, bolted, levels 1 to 6"
            className="text-md max-sm:text-[16px]"
            data-testid="capture-text"
          />
        </Field>
        {assist ? <AssistSummary assist={assist} /> : null}
      </section>

      <Card padding="md" className="flex flex-col gap-4">
        <Field label="Family" error={errorFor('family')}>
          <Select
            value={form.family}
            onChange={(e) => setField('family', e.target.value)}
            placeholder="Choose a family"
            options={v.families.map((x) => ({ value: x.id, label: x.label }))}
            data-testid="capture-family"
          />
        </Field>
        {family ? (
          <div className="grid grid-cols-2 gap-3">
            {fields.map((fd) => (
              <MeasureInput key={fd.key} fd={fd} form={form} family={family} sections={v.sections} filled={filled(fd.key)} error={errorFor(fd.key)} invalid={show(fd.key)} onChange={(val) => setField(fd.key, val)} />
            ))}
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Size and quantity fields appear for the family you choose.</p>
        )}
      </Card>

      <section aria-labelledby="condition-title" className="flex flex-col gap-2">
        <GradeHeading id="condition-title" title="Condition" hint="How it looks and performs now." error={errorFor('condition')} />
        <RadioCards
          aria-labelledby="condition-title"
          value={form.condition}
          onValueChange={(x) => setField('condition', x)}
          columns={3}
          options={(['A', 'B', 'C'] as const).map((g) => ({ value: g, label: `${g} · ${CONDITION_TEXT[g].label}`, description: CONDITION_TEXT[g].text }))}
          data-testid="capture-condition"
        />
      </section>

      <section aria-labelledby="recov-title" className="flex flex-col gap-2">
        <GradeHeading id="recov-title" title="Recoverability" hint={filled('recoverability') ? 'Suggested from the description. Change it if needed.' : 'How likely it is to come out intact.'} error={errorFor('recoverability')} />
        <RadioCards
          aria-labelledby="recov-title"
          value={form.recoverability}
          onValueChange={(x) => setField('recoverability', x)}
          columns={3}
          options={(['A', 'B', 'C'] as const).map((g) => ({ value: g, label: `${g} · ${RECOVERABILITY_TEXT[g].label}`, description: RECOVERABILITY_TEXT[g].text }))}
          data-testid="capture-recoverability"
        />
      </section>

      <Card padding="md" className="flex flex-col gap-4">
        <Field label="Expected to come out" hint={`${LABELS.L43} The programme says ${v.defaultMonthText}.`} error={errorFor('expectedMonth')}>
          <MonthPicker idPrefix="capture-expected" value={form.expectedMonth} years={v.yearOptions} onChange={(k) => setField('expectedMonth', k)} />
        </Field>
        <Field label="Location in the building" optional>
          <Input icon={MapPin} value={form.location} onChange={(e) => setField('location', e.target.value)} placeholder="Level 3, east core" data-testid="capture-location" />
        </Field>
      </Card>

      <section aria-labelledby="photos-title" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="photos-title" className="m-0 text-base font-semibold text-ink">
            Photos
          </h3>
          <span className="text-xs text-muted">Kept private. The owner decides what is shown.</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {photos.map((p, i) => (
            <PhotoTile key={p.id} photo={p} alt={`New photo ${i + 1}`} size="lg">
              <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))} aria-label={`Remove photo ${i + 1}`} className="absolute right-1 top-1 inline-flex size-9 items-center justify-center rounded-md bg-white/90 text-ink-soft shadow-sm hover:text-danger">
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </PhotoTile>
          ))}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="flex size-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-surface text-sm font-medium text-ink-soft transition-colors hover:border-muted hover:text-ink disabled:opacity-60"
            data-testid="capture-add-photo"
          >
            {uploading ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : photos.length === 0 ? <Camera aria-hidden="true" className="size-5" /> : <ImagePlus aria-hidden="true" className="size-5" />}
            {photos.length === 0 ? 'Take photo' : 'Add another'}
          </button>
          <input ref={fileInput} type="file" accept="image/*" capture="environment" multiple className="sr-only" tabIndex={-1} aria-label="Photo" onChange={addPhotos} data-testid="capture-photo" />
        </div>
      </section>

      <Field label="Notes" optional>
        <Textarea rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Connections, coatings, access, anything the owner should know." data-testid="capture-notes" />
      </Field>

      {tried && !check.ok ? (
        <p role="alert" className="m-0 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {check.missing.length > 0 ? `Still needed: ${check.missing.map((k) => CAPTURE_FIELD_LABELS[k] ?? k).join(', ')}.` : 'Check the highlighted fields.'}
        </p>
      ) : null}

      <div data-bottom-bar="" className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-line bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:z-auto sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button size="lg" className="flex-1 sm:flex-none" onClick={() => save(false)} data-testid="capture-save">
          Save
        </Button>
        <Button size="lg" variant="primary" icon={Plus} className="flex-[2] sm:flex-none" onClick={() => save(true)} data-testid="capture-save-another">
          Save and capture another
        </Button>
      </div>

    </div>
    <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
      {v.recent.length > 0 ? (
        <section aria-labelledby="recent-title" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 id="recent-title" className="m-0 text-base font-semibold text-ink">
              Recently captured
            </h3>
            <Link to={`/app/buildings/${buildingId}/inventory`} className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11">
              Inventory
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
          <ul className="m-0 list-none divide-y divide-line-soft rounded-lg border border-line bg-surface p-0">
            {v.recent.map((r) => (
              <li key={r.itemId}>
                <Link to={r.href} className="flex min-h-12 flex-col justify-center px-3.5 py-2.5 hover:bg-page">
                  <span className="truncate text-base text-ink">{r.title}</span>
                  <span className="text-xs text-muted">
                    <span className="font-medium tabular-nums">{r.tag}</span> · {formatDateShort(r.capturedOn)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SurveyBar buildingId={buildingId} compact />
    </aside>
    </div>
  )
}

function GradeHeading({ id, title, hint, error }: { id: string; title: string; hint: string; error?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <h3 id={id} className="m-0 text-base font-semibold text-ink">
        {title}
      </h3>
      <span className={cx('text-sm', error ? 'text-danger' : 'text-muted')}>{error ? 'Choose one.' : hint}</span>
    </div>
  )
}

function AssistSummary({ assist }: { assist: AssistFill }) {
  if (!assist.recognised)
    return (
      <p className="m-0 text-sm text-muted" data-testid="assist-evidence">
        Nothing recognised yet. Mention the material, its size and how many, or fill the fields below.
      </p>
    )
  return (
    <div className="flex flex-col gap-2" data-testid="assist-evidence">
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Read from the description">
        {assist.evidence.map((e) => (
          <li key={e.field} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-brand-50 px-2.5 text-sm text-brand-800 ring-1 ring-inset ring-brand-100">
            <Check aria-hidden="true" className="size-3 shrink-0" />
            <span className="text-brand-700/80">{e.label}</span>
            <span className="truncate font-medium">{e.text}</span>
          </li>
        ))}
      </ul>
      {assist.sectionFlag ? <p className="m-0 text-sm text-warning">Section: {assist.sectionFlag}.</p> : null}
      {assist.missing.length > 0 ? <p className="m-0 text-sm text-ink-soft">Still to fill: {assist.missing.map((m) => m.label.toLowerCase()).join(', ')}.</p> : null}
    </div>
  )
}

function MeasureInput({ fd, form, family, sections, filled, error, invalid, onChange }: { fd: MeasureField; form: CaptureForm; family: FamilyId; sections: string[]; filled: boolean; error?: string; invalid: boolean; onChange: (v: string) => void }) {
  const value = form[fd.key] as string
  const label = fd.unit ? `${fd.label} (${fd.unit})` : fd.label
  const wide = fd.kind === 'section' || (family === 'stone_cladding' && fd.key === 'stone') || fd.kind === 'mortar' || fd.kind === 'species' || fd.key === 'panelSize'
  const cls = cx(filled && '[&_input]:border-brand-200 [&_input]:bg-brand-50/40 [&_select]:border-brand-200 [&_select]:bg-brand-50/40')
  return (
    <Field label={label} error={error} className={cx(wide && 'col-span-2', cls)} labelAction={filled ? <span className="text-xs font-medium text-brand-700">Filled</span> : undefined}>
      {fd.kind === 'mortar' || fd.kind === 'species' ? (
        <Select value={value} onChange={(e) => onChange(e.target.value)} options={(fd.kind === 'mortar' ? MORTAR_OPTIONS : SPECIES_OPTIONS).map((o) => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))} aria-invalid={invalid || undefined} />
      ) : (
        <>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode={fd.kind === 'integer' ? 'numeric' : fd.kind === 'decimal' ? 'decimal' : 'text'}
            list={fd.kind === 'section' ? 'capture-sections' : undefined}
            placeholder={fd.kind === 'section' ? 'UB 457x191x67' : undefined}
            autoCapitalize={fd.kind === 'section' ? 'characters' : undefined}
            aria-invalid={invalid || undefined}
            data-testid={`capture-${fd.key}`}
          />
          {fd.kind === 'section' ? (
            <datalist id="capture-sections">
              {sections.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          ) : null}
        </>
      )}
    </Field>
  )
}

export default Capture
