// Listing detail (brief/09-V1-PRODUCT.md sections 3.3, 6.3, 13.8 and 13.10). Built from listingDetailView only.
// The architect sees the visual beside the dimensioned drawing, the facts, the timeline for the chosen project, and
// the action row (save, geometry, BIM greyed, spec sheet). The buying owner keeps the version 0.5 reserve copy.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useStore } from '../../store/store'
import { geometryFor, listingDetailView, type ListingDetailView } from '../../store/v1selectors'
import { fitTone, storageText, stripWindow } from '../../store/views/market'
import { Button, Dl, Note, Tag, selectClass } from '../../components/ui'
import { Download, Sheet, SustainabilityBand, TimelineStrip } from '../../components/v1'
import { ItemDrawing } from '../../components/drawings/ItemDrawing'
import { FAMILIES } from '../../domain/reference/families'
import { LABELS } from '../../domain/reference/labels'
import { DEMO_TODAY } from '../../domain/constants'
import { formatDate } from '../../domain/dates'
import { SPEC_SECTIONS, quantityText, specSheetRows } from '../../domain/engines/specSheet'
import * as f from '../../domain/format'
import { ListingVisual } from './ListingVisual'
import { usePublicPhotoSrc } from './usePublicPhotoSrc'
import { CarbonCalc, PriceLine, ReserveNote } from './ListingView'
import { factRows } from './listingFacts'
import { SaveToWishlist } from '../architect/SaveToWishlist'

export function Listing() {
  const { publicId } = useParams()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const projectId = useStore((s) => s.browseProjectId)
  // Open lots for everyone; a shared lot when one of the persona's projects can see it (terms count for the project).
  const v = publicId ? listingDetailView(world, personaId, publicId, projectId) : null
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/market" className="inline-flex min-h-[44px] items-center text-steel lg:min-h-0">
          Back to the marketplace
        </Link>
      </nav>
      {!v ? (
        <div className="max-w-xl">
          <h1 className="mb-3 text-xl font-semibold leading-tight">Listing</h1>
          <Note tone="grey" testId="listing-not-available">
            {LABELS.L26}
          </Note>
        </div>
      ) : (
        <Detail v={v} />
      )}
    </div>
  )
}

function Detail({ v }: { v: ListingDetailView }) {
  const l = v.listing
  const hasPhoto = !!usePublicPhotoSrc(l.photos[0])
  return (
    <article className="flex flex-col gap-8" data-testid="listing-detail">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-4">
          <figure className="m-0 overflow-hidden rounded-md border border-rule-soft bg-panel">
            <div className="aspect-[4/3] w-full [&>*]:h-full [&>*]:w-full">
              <ListingVisual listing={l} testId="listing-visual" className="h-full w-full object-cover" />
            </div>
            {!hasPhoto ? (
              <figcaption className="border-t border-rule-soft px-4 py-2 text-xs text-mill-text" data-testid="label-L36">
                {LABELS.L36}
              </figcaption>
            ) : null}
          </figure>
          {l.photos.length > 1 ? <PhotoStrip listing={l} /> : null}
          <section className="rounded-md border border-rule-soft bg-panel px-4 py-4" aria-label="Dimensioned drawing">
            <h2 className="m-0 mb-2 text-sm font-semibold">Dimensioned drawing</h2>
            <div className="flex min-h-[160px] items-center justify-center overflow-x-auto" data-testid="listing-drawing">
              <ItemDrawing spec={l.spec} box={150} caption={false} />
            </div>
            <p className="m-0 mt-2 text-center font-display text-base tracking-wide text-ink-soft">{l.title}</p>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag tone="grey">{v.typologyLabel}</Tag>
              <Tag tone="grey">{FAMILIES[l.family].label}</Tag>
              {l.sharing === 'in_confidence' ? (
                <Tag tone="steel" data-testid="label-L27">
                  {LABELS.L27}
                </Tag>
              ) : null}
              {l.status !== 'Available' ? <Tag tone="oxide">{l.status}</Tag> : null}
            </div>
            <h1 className="m-0 font-display text-4xl leading-none tracking-wide" data-testid="listing-title">
              {l.title}
            </h1>
            <p className="m-0 flex flex-wrap gap-x-2 text-sm text-mill-text">
              <span>Public ID {l.publicId}.</span>
              <span data-testid="listing-listed">Surveyed. Listed {f.month(l.listedMonth)}.</span>
            </p>
          </header>

          <div className="flex flex-col gap-1.5">
            <SustainabilityBand band={v.band} testId="listing-band" />
            <p className="m-0 text-xs text-mill-text" data-testid="label-L37">
              {LABELS.L37}
            </p>
          </div>

          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-rule-soft py-5 xl:grid-cols-3">
            <KeyFigure label="Quantity" value={quantityText(l)} testId="listing-quantity" />
            <KeyFigure label="Mass" value={f.massT(l.massT)} testId="listing-mass" />
            <div className="col-span-2 flex min-w-0 flex-col gap-1 xl:col-span-1">
              <dt className="text-xs text-mill-text">Avoided carbon</dt>
              {l.carbon ? (
                <dd className="m-0 flex flex-col items-start">
                  <span className="font-display text-3xl leading-none tabular-nums" data-testid="listing-carbon">
                    {f.carbon(l.carbon.avoidedT)}
                  </span>
                  <span className="mt-1 text-xs text-ink-soft">{f.percent(l.carbon.percent)} of new, A1-A4</span>
                  <span className="-ml-3 mt-1 max-w-full [&_button]:text-left">
                    <CarbonCalc listing={l} testPrefix="listing" />
                  </span>
                </dd>
              ) : (
                <dd className="m-0 text-sm" data-testid="listing-carbon">
                  {LABELS.L14}
                </dd>
              )}
            </div>
          </dl>
          {v.isArchitect ? <Actions v={v} /> : null}
          {v.isClient ? <ReserveNote listing={l} /> : null}

          <div className="border-t border-rule-soft pt-4">
            <PriceLine listing={l} testPrefix="listing" withCalc />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TimelinePanel v={v} />
        <section className="rounded-md border border-rule-soft bg-panel px-5 py-4" aria-labelledby="facts-h">
          <h2 id="facts-h" className="m-0 mb-3 text-base font-semibold">
            Specification
          </h2>
          <Dl testPrefix="listing" rows={factRows(l, false)} className="gap-y-2" />
        </section>
      </div>
    </article>
  )
}

function KeyFigure({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-mill-text">{label}</dt>
      <dd className="m-0 font-display text-3xl leading-none tabular-nums" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}

function PhotoStrip({ listing: l }: { listing: ListingDetailView['listing'] }) {
  return (
    <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0" aria-label="Public photos">
      {l.photos.slice(1).map((p) => (
        <li key={p.id} className="shrink-0">
          <Thumb photo={p} title={l.title} />
        </li>
      ))}
    </ul>
  )
}

function Thumb({ photo, title }: { photo: { id: string; src: string | null }; title: string }) {
  const src = usePublicPhotoSrc(photo)
  if (!src) return null
  return <img src={src} alt={`Public photo of ${title}`} className="h-20 w-auto rounded-sm border border-rule-soft" />
}

function TimelinePanel({ v }: { v: ListingDetailView }) {
  const setProjectId = useStore((s) => s.setBrowseProjectId)
  const l = v.listing
  return (
    <section className="flex flex-col gap-4 rounded-md border border-rule-soft bg-panel px-5 py-4" aria-labelledby="timeline-h" data-testid="listing-timeline">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="timeline-h" className="m-0 text-base font-semibold">
          Timeline
        </h2>
        {v.projects.length > 0 ? (
          <label className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[240px]">
            <span className="text-xs font-medium text-mill-text">Checking against</span>
            <select className={selectClass} value={v.project?.id ?? ''} onChange={(e) => setProjectId(e.target.value || null)} data-testid="listing-project-picker">
              <option value="">No project</option>
              {v.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {v.project && v.fit ? (
        <>
          <TimelineStrip today={DEMO_TODAY} startDate={v.project.startDate} window={stripWindow(l.availability)} fit={v.fit.fit} testId="listing-strip" />
          <div className="flex flex-col gap-1">
            <p className="m-0 flex flex-wrap items-center gap-2">
              <Tag tone={fitTone(v.fit.fit)} data-testid="listing-fit" data-fit={v.fit.fit}>
                {v.fit.text}
              </Tag>
            </p>
            <p className="m-0 text-sm text-ink-soft">
              {v.project.name}: materials needed on site from {formatDate(v.project.startDate)}. {storageText(v.fit.storageMonths) ?? ''}
            </p>
          </div>
          <p className="m-0 text-xs text-mill-text" data-testid="label-L38">
            {LABELS.L38}
          </p>
        </>
      ) : (
        <p className="m-0 text-sm text-mill-text">{v.projects.length > 0 ? 'Choose a project to check this lot against its start date.' : 'Available as stated in the specification.'}</p>
      )}
    </section>
  )
}

function download(file: { filename: string; mime: string; text: string }) {
  const url = URL.createObjectURL(new Blob([file.text], { type: file.mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = file.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function Actions({ v }: { v: ListingDetailView }) {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const [specOpen, setSpecOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const l = v.listing
  const get = (kind: 'dxf' | 'obj') => {
    const file = geometryFor(world, personaId, l.publicId, kind)
    if (!file) return setError(LABELS.L26)
    if (file.kind === 'unavailable') return setError(file.reason)
    setError(null)
    download(file)
  }
  const rows = specSheetRows(l, v.fit)
  return (
    <section className="flex flex-col gap-4" aria-label="Actions">
      <div className="flex flex-wrap items-center gap-2">
        <SaveToWishlist publicId={l.publicId} title={l.title} variant="detail" />
        <Button size="lg" onClick={() => setSpecOpen(true)} data-testid="open-item-spec">
          Spec sheet for this item
        </Button>
      </div>
      <div className="flex flex-col gap-3 rounded-md border border-rule-soft bg-panel px-4 py-3.5" data-testid="listing-geometry">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="m-0 text-sm font-semibold">Geometry</h2>
          <p className="m-0 text-xs text-mill-text" data-testid="label-L42">
            {LABELS.L42}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" className="gap-2" disabled={!v.geometry.dxf} onClick={() => get('dxf')} data-testid="download-dxf">
            <Download size={18} />
            Download 2D (DXF)
          </Button>
          <Button size="lg" className="gap-2" disabled={!v.geometry.obj} onClick={() => get('obj')} data-testid="download-obj">
            <Download size={18} />
            Download 3D (OBJ)
          </Button>
        </div>
        {v.geometry.reason ? (
          <p className="m-0 text-sm text-ink-soft" data-testid="geometry-reason">
            {v.geometry.reason}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule-soft pt-3" data-testid="bim-family">
          <button type="button" disabled aria-disabled="true" className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-2 rounded-sm border border-dashed border-rule bg-paper px-3 text-sm font-medium text-mill-text">
            BIM family (IFC or Revit)
            <span className="rounded-sm border border-mill px-1 font-display text-xs leading-tight tracking-wide text-mill-text">V2</span>
          </button>
          <span className="text-xs text-mill-text" data-testid="label-L35">
            {LABELS.L35}
          </span>
        </div>
      </div>
      {error ? (
        <Note tone="oxide" testId="listing-action-error">
          {error}
        </Note>
      ) : null}
      <Sheet
        open={specOpen}
        onOpenChange={setSpecOpen}
        title="Spec sheet for this item"
        description={v.project ? `Checked against ${v.project.name}.` : 'Choose a project in the timeline panel to add the timeline check.'}
        testId="item-spec"
        footer={
          v.project ? (
            <Link to={`/projects/${v.project.id}/spec`} className="inline-flex min-h-[44px] items-center rounded-sm border border-rule bg-panel px-4 text-sm font-medium text-ink no-underline hover:bg-steel-tint">
              Open the spec sheet for {v.project.name}
            </Link>
          ) : null
        }
      >
        <div className="flex flex-col gap-5">
          {SPEC_SECTIONS.map((section) => {
            const inSection = rows.filter((r) => r.section === section)
            if (inSection.length === 0) return null
            return (
              <section key={section}>
                <h3 className="m-0 mb-1.5 text-sm font-semibold text-ink">{section}</h3>
                <Dl rows={inSection.map((r) => ({ label: r.label, value: r.value }))} />
              </section>
            )
          })}
          <p className="m-0 rounded-sm border-l-2 border-survey bg-survey-tint px-3 py-2 text-sm" data-testid="label-L39">
            {LABELS.L39}
          </p>
        </div>
      </Sheet>
    </section>
  )
}
