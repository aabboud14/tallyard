// Capture on site: one column, large touch targets, Assist with its evidence (F14), and the month the surveyor
// expects the material to be free (brief/09-V1-PRODUCT.md sections 3.1 and 13.3).
import { useMemo, useState } from 'react'
import { useStore } from '../../store/store'
import { useWorld, usePersona } from '../shared/hooks'
import { itemView } from '../../store/selectors'
import { clientName, expectedDefaultMonth, expectedFromMonth, expectedText, expectedYearOptions, monthKeyOf, MONTH_NAMES, supplyAccess } from '../../store/views/supply'
import { captureAssist, type AssistResult } from '../../domain/engines/assist'
import { captureInputFromAssist, specFromAssist, quantityFromAssist } from '../../store/capture'
import { useBuildingParam, NotAvailable } from '../../app/params'
import { FAMILIES, FAMILY_IDS } from '../../domain/reference/families'
import { LABELS } from '../../domain/reference/labels'
import type { Condition, FamilyId, Photo, Recoverability, SourceBuilding } from '../../domain/types'
import { putPhoto, reencodePhoto } from '../../store/photoDb'
import { Button, Field, Note, RuleBased, Tag, inputClass, selectClass, Private } from '../../components/ui'
import { Stub } from '../../components/Stub'
import { PhotoThumb } from './ItemDetail'
import * as f from '../../domain/format'

type Draft = { family: FamilyId | ''; section: string; pieces: string; lengthM: string; areaM2: string; volumeM3: string; thicknessMm: string; panelW: string; panelH: string; condition: Condition | ''; recoverability: Recoverability | ''; location: string; notes: string }

const empty: Draft = { family: '', section: '', pieces: '', lengthM: '', areaM2: '', volumeM3: '', thicknessMm: '', panelW: '', panelH: '', condition: '', recoverability: '', location: '', notes: '' }

function fromAssist(r: AssistResult): Draft {
  return {
    family: r.family ?? '',
    section: r.section ?? '',
    pieces: r.pieces === null ? '' : String(r.pieces),
    lengthM: r.lengthM === null ? '' : String(r.lengthM),
    areaM2: r.areaM2 === null ? '' : String(r.areaM2),
    volumeM3: r.volumeM3 === null ? '' : String(r.volumeM3),
    thicknessMm: r.thicknessMm === null ? '' : String(r.thicknessMm),
    panelW: r.panelWidthM === null ? '' : String(r.panelWidthM),
    panelH: r.panelHeightM === null ? '' : String(r.panelHeightM),
    condition: '',
    recoverability: r.recoverability ?? '',
    location: r.location ?? '',
    notes: '',
  }
}

function toAssist(d: Draft): AssistResult {
  const n = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))
  return {
    family: d.family || null,
    section: d.section || null,
    sectionFlag: null,
    pieces: n(d.pieces),
    lengthM: n(d.lengthM),
    areaM2: n(d.areaM2),
    volumeM3: n(d.volumeM3),
    thicknessMm: n(d.thicknessMm),
    panelWidthM: n(d.panelW),
    panelHeightM: n(d.panelH),
    recoverability: d.recoverability || null,
    location: d.location || null,
    evidence: {},
    missing: [],
  }
}

const FIELD_LABELS: Record<string, string> = { section: 'Section', pieces: 'Pieces', lengthM: 'Length', areaM2: 'Area', volumeM3: 'Volume', thicknessMm: 'Thickness', panelWidthM: 'Panel width', panelHeightM: 'Panel height', recoverability: 'Recoverability', location: 'Location', family: 'Family', panel: 'Panel size' }

/** A random photo ID. Photos live in IndexedDB across reloads, so a counter could collide; the clock is never read. */
function photoId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return 'pho_' + Array.from(bytes, (b) => (b % 36).toString(36)).join('')
}

export function Capture() {
  const world = useWorld()
  const personaId = useStore((s) => s.personaId)
  const { id, record: building } = useBuildingParam()
  if (!building || !supplyAccess(world, personaId, id).capture) return <NotAvailable />
  return <CaptureForm key={building.id} building={building} />
}

function CaptureForm({ building }: { building: SourceBuilding }) {
  const world = useWorld()
  const { persona } = usePersona()
  const capture = useStore((s) => s.capture)
  const defaultMonth = expectedDefaultMonth(building)
  const [expYear, setExpYear] = useState(Number(defaultMonth.slice(0, 4)))
  const [expMonth, setExpMonth] = useState(Number(defaultMonth.slice(5, 7)))
  const [text, setText] = useState('')
  const [assist, setAssist] = useState<AssistResult | null>(null)
  const [draft, setDraft] = useState<Draft>(empty)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saved = savedId && world.items[savedId] ? itemView(world, savedId) : null

  const runAssist = () => {
    const r = captureAssist(text)
    setAssist(r)
    setDraft(fromAssist(r))
    setSavedId(null)
  }
  const missing = useMemo(() => requiredMissing(toAssist(draft)), [draft])
  const canSave = draft.family !== '' && draft.condition !== '' && missing.length === 0 && specFromAssist(toAssist(draft)) !== null && quantityFromAssist(toAssist(draft)) !== null

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      const blob = await reencodePhoto(file)
      const id = photoId()
      await putPhoto(id, blob)
      setPhotos((p) => [...p, { id, kind: 'blob', src: null, isPublic: false }])
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  const save = () => {
    try {
      const r = toAssist(draft)
      const input = captureInputFromAssist(r, { buildingId: building.id, condition: draft.condition as Condition, recoverability: (draft.recoverability || undefined) as Recoverability | undefined, capturedBy: persona.name, notes: draft.notes, location: draft.location, expectedAvailableFrom: expectedFromMonth(building, monthKeyOf(expYear, expMonth)) })
      const id = capture({ ...input, photos })
      setSavedId(id)
      setPhotos([])
      setError(null)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    }
  }

  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }))
  const fam = draft.family ? FAMILIES[draft.family] : null
  const ev = assist?.evidence ?? {}

  const client = clientName(world, building)

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <header className="flex flex-col gap-1" data-testid="capture-header">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Capture</p>
        <h1 className="text-2xl font-semibold leading-tight" data-testid="capture-building">
          {building.name}
        </h1>
        <dl className="m-0 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-mill-text">Client</dt>
            <dd className="m-0 font-medium" data-testid="capture-client">
              {client}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-mill-text">Surveyor</dt>
            <dd className="m-0 font-medium">{persona.name}</dd>
          </div>
        </dl>
      </header>
      <Note tone="oxide" testId="label-L8">
        {LABELS.L8}
      </Note>
      <Field label="Description" htmlFor="capture-text" hint="Type or dictate what you see. Assist fills the fields and shows which words it used.">
        <textarea id="capture-text" className={`${inputClass} min-h-24 py-2`} value={text} onChange={(e) => setText(e.target.value)} data-testid="capture-text" />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="lg" className="text-panel" onClick={runAssist} data-testid="capture-assist">
          Assist
        </Button>
        <Stub name="Recognise materials from a photo" would="The real feature would read a site photo and propose the family, section and count for the surveyor to confirm." testId="stub-photo" />
      </div>
      <RuleBased testId="label-L2" />
      {assist ? (
        <div className="rounded-sm border border-rule bg-panel p-3 text-sm" data-testid="assist-evidence">
          <div className="mb-1 font-medium">Assist evidence</div>
          {Object.keys(ev).length ? (
            <ul className="flex flex-wrap gap-2">
              {Object.entries(ev).map(([k, v]) => (
                <li key={k} className="rounded-sm bg-steel-tint px-2 py-0.5">
                  <span className="text-mill-text">{FIELD_LABELS[k] ?? k}:</span> "{v}"
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-mill-text">No fields recognised.</p>
          )}
          {assist.sectionFlag ? <p className="mt-1 text-oxide">Section: {assist.sectionFlag}</p> : null}
          {assist.missing.length ? <p className="mt-1 text-oxide">Not filled: {assist.missing.map((m) => FIELD_LABELS[m] ?? m).join(', ')}. Assist never guesses silently.</p> : null}
        </div>
      ) : null}
      <Field label="Photo" htmlFor="capture-photo" hint="Re-encoded through a canvas on capture, so embedded metadata never reaches the store. Private until ticked public.">
        <input id="capture-photo" type="file" accept="image/*" capture="environment" className="min-h-[44px] w-full text-base" onChange={(e) => onPhoto(e.target.files?.[0])} data-testid="capture-photo" />
      </Field>
      {photos.length ? (
        <div className="flex flex-wrap gap-3" data-testid="capture-photos">
          {photos.map((p) => (
            <PhotoThumb key={p.id} photo={p} item={{ id: 'draft' }} canToggle={false} />
          ))}
        </div>
      ) : null}
      <Field label="Family" htmlFor="capture-family">
        <select id="capture-family" className={selectClass} value={draft.family} onChange={(e) => set('family', e.target.value)} data-testid="capture-family">
          <option value="">Choose a family</option>
          {FAMILY_IDS.map((id) => (
            <option key={id} value={id}>
              {FAMILIES[id].label}
            </option>
          ))}
        </select>
      </Field>
      {draft.family === 'steel_section' ? (
        <>
          <Field label="Section" htmlFor="capture-section" className={missing.includes('section') ? 'rounded-sm bg-oxide-tint p-2' : ''}>
            <input id="capture-section" className={inputClass} value={draft.section} onChange={(e) => set('section', e.target.value)} data-testid="capture-section" />
          </Field>
          <Field label="Pieces" htmlFor="capture-pieces" className={missing.includes('pieces') ? 'rounded-sm bg-oxide-tint p-2' : ''}>
            <input id="capture-pieces" inputMode="numeric" className={inputClass} value={draft.pieces} onChange={(e) => set('pieces', e.target.value)} data-testid="capture-pieces" />
          </Field>
          <Field label="Length (m)" htmlFor="capture-length" className={missing.includes('lengthM') ? 'rounded-sm bg-oxide-tint p-2' : ''}>
            <input id="capture-length" inputMode="decimal" className={inputClass} value={draft.lengthM} onChange={(e) => set('lengthM', e.target.value)} data-testid="capture-length" />
          </Field>
        </>
      ) : null}
      {draft.family === 'curtain_wall' ? (
        <>
          <Field label="Panels" htmlFor="capture-pieces">
            <input id="capture-pieces" inputMode="numeric" className={inputClass} value={draft.pieces} onChange={(e) => set('pieces', e.target.value)} data-testid="capture-pieces" />
          </Field>
          <Field label="Panel width (m)" htmlFor="capture-panel-w">
            <input id="capture-panel-w" inputMode="decimal" className={inputClass} value={draft.panelW} onChange={(e) => set('panelW', e.target.value)} />
          </Field>
          <Field label="Panel height (m)" htmlFor="capture-panel-h">
            <input id="capture-panel-h" inputMode="decimal" className={inputClass} value={draft.panelH} onChange={(e) => set('panelH', e.target.value)} />
          </Field>
        </>
      ) : null}
      {draft.family === 'precast_cladding' || draft.family === 'stone_cladding' ? (
        <>
          <Field label="Area (m2)" htmlFor="capture-area">
            <input id="capture-area" inputMode="decimal" className={inputClass} value={draft.areaM2} onChange={(e) => set('areaM2', e.target.value)} />
          </Field>
          <Field label="Thickness (mm)" htmlFor="capture-thickness">
            <input id="capture-thickness" inputMode="numeric" className={inputClass} value={draft.thicknessMm} onChange={(e) => set('thicknessMm', e.target.value)} />
          </Field>
        </>
      ) : null}
      {draft.family === 'clay_brick' || draft.family === 'raised_floor' ? (
        <Field label={draft.family === 'clay_brick' ? 'Bricks' : 'Panels'} htmlFor="capture-pieces">
          <input id="capture-pieces" inputMode="numeric" className={inputClass} value={draft.pieces} onChange={(e) => set('pieces', e.target.value)} data-testid="capture-pieces" />
        </Field>
      ) : null}
      {draft.family === 'timber_joist' ? (
        <Field label="Volume (m3)" htmlFor="capture-volume">
          <input id="capture-volume" inputMode="decimal" className={inputClass} value={draft.volumeM3} onChange={(e) => set('volumeM3', e.target.value)} />
        </Field>
      ) : null}
      <Field label="Condition" htmlFor="capture-condition" hint="Always chosen by the surveyor.">
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Condition">
          {(['A', 'B', 'C'] as Condition[]).map((c) => (
            <Button key={c} size="lg" variant={draft.condition === c ? 'primary' : 'secondary'} className={draft.condition === c ? 'text-panel' : undefined} onClick={() => set('condition', c)} data-testid={`capture-condition-${c}`} aria-pressed={draft.condition === c}>
              {c}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Recoverability" htmlFor="capture-recoverability" hint="A comes out intact, B with care, C unlikely.">
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Recoverability">
          {(['A', 'B', 'C'] as Recoverability[]).map((c) => (
            <Button key={c} size="lg" variant={draft.recoverability === c ? 'primary' : 'secondary'} className={draft.recoverability === c ? 'text-panel' : undefined} onClick={() => set('recoverability', c)} data-testid={`capture-recoverability-${c}`} aria-pressed={draft.recoverability === c}>
              {c}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Expected availability" htmlFor="capture-expected-month" hint={<span data-testid="label-L43">{LABELS.L43}</span>}>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
          <select id="capture-expected-month" aria-label="Expected month" className={selectClass} value={expMonth} onChange={(e) => setExpMonth(Number(e.target.value))} data-testid="capture-expected-month">
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select aria-label="Expected year" className={selectClass} value={expYear} onChange={(e) => setExpYear(Number(e.target.value))} data-testid="capture-expected-year">
            {expectedYearOptions(building).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </Field>
      <Private>
        <Field label="Location in building" htmlFor="capture-location">
          <input id="capture-location" className={inputClass} value={draft.location} onChange={(e) => set('location', e.target.value)} data-testid="capture-location" />
        </Field>
        <Field label="Notes" htmlFor="capture-notes" className="mt-2">
          <textarea id="capture-notes" className={`${inputClass} min-h-16 py-2`} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </Private>
      {error ? <Note tone="oxide">{error}</Note> : null}
      <Button variant="primary" size="lg" className="text-panel" disabled={!canSave} onClick={save} data-testid="capture-save">
        Save
      </Button>
      {saved ? (
        <div className="rounded-sm border border-teal bg-teal-tint p-3" data-testid="capture-saved">
          <div className="flex items-center gap-2">
            <Tag data-testid="saved-tag">{saved.item.tag}</Tag>
            <span>{saved.listing.title}</span>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
            <dt className="text-mill-text">Mass</dt>
            <dd data-testid="saved-mass">{f.massT(saved.measures.massT)}</dd>
            <dt className="text-mill-text">Avoided carbon</dt>
            <dd data-testid="saved-carbon">{saved.carbon ? f.carbon(saved.carbon.avoided) : 'none'}</dd>
            <dt className="text-mill-text">Guide price</dt>
            <dd data-testid="saved-guide">{f.unitPrice(saved.guide.guide, saved.item.family)}</dd>
            <dt className="text-mill-text">Expected</dt>
            <dd data-testid="saved-expected">{expectedText(saved.item.expectedAvailableFrom)}</dd>
            <dt className="text-mill-text">Photos</dt>
            <dd data-testid="saved-photos">{saved.item.photos.length ? `${saved.item.photos.length} photo${saved.item.photos.length === 1 ? '' : 's'}, ${LABELS.L28}` : 'none'}</dd>
          </dl>
          {saved.item.photos.length ? (
            <div className="mt-2 flex flex-wrap gap-3">
              {saved.item.photos.map((p) => (
                <PhotoThumb key={p.id} photo={p} item={saved.item} canToggle={false} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {fam ? <p className="text-xs text-mill-text">Priced {fam.pricingUnitLabel}. Mass rule: {fam.massRule}.</p> : null}
    </div>
  )
}

const REQUIRED: Record<FamilyId, (keyof AssistResult)[]> = {
  steel_section: ['section', 'pieces', 'lengthM'],
  curtain_wall: ['pieces', 'panelWidthM', 'panelHeightM'],
  precast_cladding: ['areaM2'],
  stone_cladding: ['areaM2'],
  clay_brick: ['pieces'],
  raised_floor: ['pieces'],
  timber_joist: ['volumeM3'],
}

function requiredMissing(r: AssistResult): string[] {
  if (!r.family) return []
  return REQUIRED[r.family].filter((k) => r[k] === null)
}
