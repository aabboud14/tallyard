// A material, from its public listing only, in the order an architect decides: the pictures and the 3D view, then
// save to a project and the geometry downloads, when it is available (against the chosen project, or every
// project), the sustainability panel, the key facts, the full specification, where it is and how it is collected,
// and similar materials. A plain white stage and sections divided by hairlines. The guide price and the seller's
// details are for clients only; architects and consultants do not get them.
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Bookmark, BookmarkCheck, Box, CalendarRange, ChevronDown, Download, FileBox, FileText, Leaf, LockKeyhole, MapPin, PackageCheck, PenLine, ScrollText, Tag, Wallet } from 'lucide-react'
import { LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { getData, useNow, useView, useViewer } from '../../store'
import { MARKETPLACE_PATH } from '../../store/paths'
import { geometryFile, materialView, type MaterialView } from '../../store/selectors/discover'
import { SELLER_TYPE_LABELS } from '../../store/selectors/common'
import { Badge, Button, Callout, cx, DescriptionList, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, FitPill, IndicativeMarker, METHODOLOGY_HREF, Pill, ProgressBar, SustainabilityBand, TimelineStrip, toast, Tooltip } from '../../ui'
import { Page } from '../../app/Page'
import { downloadText } from '../../app/download'
import { AppNotFound } from '../../app/NoAccess'
import { ListingTile } from '../discover/ListingTile'
import { ProjectPicker } from '../discover/ProjectPicker'
import { SaveMenu } from '../discover/SaveMenu'
import { useCheckingProject } from '../discover/useDiscoverQuery'
import { MaterialGallery } from './MaterialGallery'

type GeometryKind = 'dxf' | 'obj' | 'ifc'

const DOWNLOAD_NOTE: Record<GeometryKind, string> = { dxf: '2D profile, in millimetres.', obj: '3D model, in millimetres.', ifc: 'BIM model, in millimetres.' }

/** The stored seller type as the product names it: "Donor building owner". */
function sellerTypeText(sellerType: string): string {
  const label = SELLER_TYPE_LABELS[sellerType] ?? sellerType
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function SaveButton({ view }: { view: MaterialView }) {
  const saved = view.saveTargets.filter((t) => t.saved)
  return (
    <SaveMenu
      publicId={view.card.publicId}
      title={view.card.title}
      align="start"
      trigger={
        <Button variant={saved.length ? 'secondary' : 'primary'} size="lg" icon={saved.length ? BookmarkCheck : Bookmark} trailingIcon={ChevronDown} data-testid="material-save" className={cx('min-w-0 max-w-full', saved.length > 0 && 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-50')}>
          <span className="truncate max-sm:hidden">{saved.length ? 'Saved' : 'Save to project'}</span>
          <span className="truncate sm:hidden">{saved.length ? 'Saved' : 'Save'}</span>
        </Button>
      }
    />
  )
}

function useGeometryDownload(publicId: string) {
  const viewer = useViewer()
  return (kind: GeometryKind) => {
    if (!viewer) return
    const file = geometryFile(getData(), viewer, publicId, kind)
    if (!file) return
    if (file.kind === 'unavailable') {
      toast.error(file.reason)
      return
    }
    downloadText(file.text, file.filename, file.mime)
    toast.success(`Downloaded ${file.filename}`, { description: DOWNLOAD_NOTE[kind] })
  }
}

function DownloadMenu({ view }: { view: MaterialView }) {
  const get = useGeometryDownload(view.card.publicId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="lg" icon={Download} trailingIcon={ChevronDown} data-testid="download-menu">
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Geometry from the recorded dimensions</DropdownMenuLabel>
        <DropdownMenuItem icon={PenLine} disabled={!view.geometry.dxf} onSelect={() => get('dxf')} shortcut="DXF" data-testid="menu-dxf">
          2D drawing
        </DropdownMenuItem>
        <DropdownMenuItem icon={Box} disabled={!view.geometry.obj} onSelect={() => get('obj')} shortcut="OBJ" data-testid="menu-obj">
          3D model
        </DropdownMenuItem>
        <DropdownMenuItem icon={FileBox} disabled={!view.geometry.ifc} onSelect={() => get('ifc')} shortcut="IFC" data-testid="menu-ifc">
          BIM model
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={LockKeyhole} disabled shortcut="Version 2">
          BIM family
        </DropdownMenuItem>
        {view.geometry.reason ? <p className="m-0 px-2 pb-1.5 pt-1 text-xs text-muted">{view.geometry.reason}</p> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FileRow({ icon: Icon, name, format, onGet, disabled, testId, locked = false }: { icon: typeof Box; name: string; format: string; onGet?: () => void; disabled?: boolean; testId: string; locked?: boolean }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Icon aria-hidden="true" className={cx('size-4 shrink-0', locked ? 'text-faint' : 'text-muted')} />
      <div className="min-w-0 flex-1">
        <p className={cx('m-0 font-medium', locked ? 'text-muted' : 'text-ink')}>{name}</p>
        <p className="m-0 text-sm text-muted">{format}</p>
      </div>
      {locked ? (
        <Tooltip content={LABELS.L35}>
          <span tabIndex={0} data-testid={testId} aria-label={`${name}: ${LABELS.L35}`} className="inline-flex h-6 items-center gap-1 rounded-[5px] bg-subtle px-2 text-xs font-medium text-muted ring-1 ring-inset ring-line focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            <LockKeyhole aria-hidden="true" className="size-3" />
            Coming in version 2
          </span>
        </Tooltip>
      ) : (
        <Button size="sm" icon={Download} onClick={onGet} disabled={disabled} data-testid={testId} aria-label={`Download ${name}`} className="max-sm:h-11">
          <span className="max-sm:sr-only">Download</span>
        </Button>
      )}
    </li>
  )
}

function Section({ id, title, icon: Icon, children, aside, testId, className }: { id: string; title: string; icon: typeof Leaf; children: ReactNode; aside?: ReactNode; testId?: string; className?: string }) {
  return (
    <section aria-labelledby={id} data-testid={testId} className={cx('scroll-mt-20 border-t border-line-soft pt-6', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={id} className="m-0 flex items-center gap-2 text-md font-semibold text-ink">
          <Icon aria-hidden="true" className="size-4 text-muted" />
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Availability({ view, today, onProject }: { view: MaterialView; today: string; onProject: (id: string | null) => void }) {
  const { card } = view
  const a = view.availability
  return (
    <Section
      id="availability-h"
      title="Availability"
      icon={CalendarRange}
      testId="availability"
      aside={
        <span className="flex items-center gap-3">
          <IndicativeMarker />
          {view.projects.length > 0 ? <ProjectPicker projects={view.projects} value={view.project} onChange={onProject} className="h-8" /> : null}
        </span>
      }
    >
      <p className="m-0 text-xl font-semibold text-ink" data-testid="availability-text">
        {a.phrase.text}
      </p>
      {view.project && card.fit ? (
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex items-start gap-2.5">
            <FitPill fit={card.fit.fit} className="mt-px" />
            <p className="m-0 text-sm text-ink-soft" data-testid="fit-text">
              {a.fitText} for {view.project.name}, materials needed from {view.project.startText}.{a.storageText ? ` ${a.storageText}.` : ''}
            </p>
          </div>
          <TimelineStrip
            today={today}
            startDate={view.project.startDate}
            startLabel={`${view.project.name} start`}
            indicative={false}
            items={[{ id: card.publicId, window: a.windowStart && a.windowEnd ? { start: a.windowStart, end: a.windowEnd } : null, fit: card.fit.fit }]}
            testId="material-timeline"
          />
        </div>
      ) : a.byProject.length > 0 ? (
        <div className="mt-4" data-testid="fit-text">
          <p className="m-0 mb-2 text-sm text-muted">Against your projects</p>
          <ul className="m-0 flex list-none flex-col divide-y divide-line-soft border-y border-line-soft p-0" aria-label="Against your projects">
            {a.byProject.map((p) => (
              <li key={p.projectId} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 py-2.5">
                <span>
                  <FitPill fit={p.fit} size="sm" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">{p.name}</span>
                  <span className="text-sm text-muted">needed from {p.startText}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  )
}

function Sustainability({ view }: { view: MaterialView }) {
  const s = view.sustainability
  return (
    <Section id="sustainability-h" title="Sustainability" icon={Leaf} aside={<IndicativeMarker />} testId="sustainability">
      {s.claimed && s.avoidedT !== null ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-muted">Avoided carbon</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tabular-nums text-ink">{f.number(s.avoidedT, 1)}</span>
                <span className="text-base text-muted">tCO2e</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted">Compared with new</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tabular-nums text-ink">{s.percent !== null ? f.percent(s.percent) : 'Not given'}</span>
                {s.percent !== null ? <span className="text-base text-muted">avoided</span> : null}
              </div>
            </div>
          </div>
          {s.percent !== null ? <ProgressBar value={s.percent} max={1} label="Carbon avoided compared with buying new" valueText={`${f.percent(s.percent)} avoided`} tone="brand" /> : null}
        </div>
      ) : (
        <p className="m-0 text-sm text-ink-soft">{LABELS.L14}</p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Sustainability band</span>
        <SustainabilityBand band={view.card.band} />
      </div>
      <p className="m-0 mt-3 text-xs leading-5 text-muted">
        {LABELS.L11}{' '}
        <Link to={METHODOLOGY_HREF} className="font-medium text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink">
          How this is worked out
        </Link>
      </p>
    </Section>
  )
}

export function MaterialPage() {
  const { publicId = '' } = useParams()
  const [projectId, setProject] = useCheckingProject()
  const view = useView(materialView, publicId, projectId)
  const today = useNow().slice(0, 10)
  const get = useGeometryDownload(publicId)
  if (!view) return <AppNotFound />
  const { card, listing } = view
  const approvedIn = view.saveTargets.filter((t) => t.status === 'Approved' && t.projectId)
  const savedIn = view.saveTargets.filter((t) => t.saved)

  return (
    <Page width="wide" testId="material-page">
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <div className="mx-auto max-w-[760px] xl:sticky xl:top-8">
            <MaterialGallery entries={view.gallery} spec={listing.spec} family={listing.family} publicId={card.publicId} title={card.title} model={view.model} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-5">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {view.tags.map((t) => (
                <Badge key={t} tone={t === 'Shared in confidence' ? 'outline' : 'neutral'} icon={t === 'Shared in confidence' ? LockKeyhole : undefined}>
                  {t}
                </Badge>
              ))}
            </div>
            <h1 className="m-0 mt-3 text-3xl font-semibold text-ink" data-testid="material-title">
              {card.title}
            </h1>
            <p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted">
              <span className="inline-flex items-center gap-1.5 font-mono text-sm text-ink-soft">
                <Tag aria-hidden="true" className="size-3.5" />
                {card.publicId}
              </span>
              <span>
                {card.quantityText}, {card.locationLabel}
              </span>
            </p>
            {view.sellerLine ? (
              <p className="m-0 mt-1 text-sm text-muted" data-testid="seller-line">
                {view.sellerLine}
              </p>
            ) : null}
          </div>

          {view.reservedFor ? (
            <Callout tone="brand" icon={PackageCheck} title={`Reserved for ${view.reservedFor}`}>
              The client's reservation was accepted by the seller.
            </Callout>
          ) : null}

          <div className="flex flex-col gap-3" data-testid="material-actions">
            <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">
              {view.saveTargets.length > 0 ? <SaveButton view={view} /> : null}
              <DownloadMenu view={view} />
              {approvedIn.map((t) => (
                <Button key={t.projectId} asChild size="lg" icon={ScrollText}>
                  <Link to={`/app/projects/${t.projectId}/specification`}>Specification</Link>
                </Button>
              ))}
            </div>
            {savedIn.length > 0 ? (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Saved to" data-testid="saved-to">
                {savedIn.map((t) => (
                  <li key={t.projectId ?? 'saved'}>
                    <Pill tone="brand" icon={BookmarkCheck} size="sm">
                      {t.status ? `Saved to ${t.label}, ${t.status.toLowerCase()}` : `Saved to ${t.label}`}
                    </Pill>
                  </li>
                ))}
              </ul>
            ) : null}
            {view.showPurchaseNote ? <p className="m-0 text-sm text-muted">{LABELS.L40}</p> : null}
          </div>

          <Availability view={view} today={today} onProject={setProject} />
          <Sustainability view={view} />

          <Section id="facts-h" title="Key facts" icon={FileText} testId="key-facts">
            <DescriptionList layout="grid" columns={2} items={view.keyFacts.map((k) => ({ label: k.label, value: k.value }))} />
          </Section>

          {view.price ? (
            <Section id="price-h" title="Guide price" icon={Wallet} aside={<IndicativeMarker />} testId="guide-price">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-xl font-semibold tabular-nums text-ink">{view.price.range}</span>
                <span className="text-sm text-muted">{view.price.signal}</span>
              </div>
              <p className="m-0 mt-1 text-sm text-muted">Guide {view.price.guide}</p>
            </Section>
          ) : null}
        </div>
      </div>

      <section aria-labelledby="spec-h" className="mt-14 border-t border-line-soft pt-8">
        <h2 id="spec-h" className="m-0 mb-5 text-lg font-semibold text-ink">
          Specification
        </h2>
        <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2" data-testid="spec-table">
          {view.specSections.map((s) => (
            <div key={s.section} className="min-w-0">
              <h3 className="m-0 mb-2 text-sm font-medium text-muted">{s.section}</h3>
              <dl className="m-0 divide-y divide-line-soft border-y border-line-soft">
                {s.rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4 py-2.5">
                    <dt className="text-sm text-muted">{r.label}</dt>
                    <dd className="m-0 break-words text-sm font-medium tabular-nums text-ink">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
        <section aria-labelledby="location-h" className="min-w-0 border-t border-line-soft pt-6">
          <h2 id="location-h" className="m-0 mb-4 flex items-center gap-2 text-md font-semibold text-ink">
            <MapPin aria-hidden="true" className="size-4 text-muted" />
            Location and collection
          </h2>
          <DescriptionList
            items={[
              { label: 'Location', value: view.location.label },
              { label: 'Collection point', value: view.location.collectionPoint },
              ...(view.location.seller ? [{ label: 'Seller', value: sellerTypeText(view.location.seller) }] : []),
            ]}
          />
          {view.location.seller ? <p className="m-0 mt-3 text-sm text-muted">The seller and the exact site are shared with the client once a reservation is accepted.</p> : null}
        </section>

        <section aria-labelledby="downloads-h" className="min-w-0 border-t border-line-soft pt-6" data-testid="downloads">
          <h2 id="downloads-h" className="m-0 mb-1 flex items-center gap-2 text-md font-semibold text-ink">
            <PenLine aria-hidden="true" className="size-4 text-muted" />
            Geometry files
          </h2>
          <ul className="m-0 list-none divide-y divide-line-soft p-0">
            <FileRow icon={PenLine} name="2D drawing" format="DXF, profile in millimetres" onGet={() => get('dxf')} disabled={!view.geometry.dxf} testId="download-dxf" />
            <FileRow icon={Box} name="3D model" format="OBJ, extruded to the recorded length" onGet={() => get('obj')} disabled={!view.geometry.obj} testId="download-obj" />
            <FileRow icon={FileBox} name="BIM model" format="IFC4, opens in Revit and other BIM tools" onGet={() => get('ifc')} disabled={!view.geometry.ifc} testId="download-ifc" />
            <FileRow icon={LockKeyhole} name="BIM family" format="Native Revit family" testId="bim-family" locked />
          </ul>
          <p className="m-0 mt-2 text-sm text-muted">{view.geometry.reason ?? LABELS.L42}</p>
        </section>
      </div>

      {view.similar.length > 0 ? (
        <section aria-labelledby="similar-h" className="mt-14 border-t border-line-soft pt-8">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 id="similar-h" className="m-0 text-lg font-semibold text-ink">
              Similar materials
            </h2>
            <Link to={MARKETPLACE_PATH} className="rounded-sm text-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:py-3">
              Browse the Marketplace
            </Link>
          </div>
          <div className="@container">
            <div className="grid grid-cols-1 gap-x-6 gap-y-9 @lg:grid-cols-2 @4xl:grid-cols-4" data-testid="similar">
              {view.similar.map((c) => (
                <ListingTile key={c.publicId} card={c} canSave={view.saveTargets.length > 0} projectId={view.project?.id ?? null} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </Page>
  )
}
