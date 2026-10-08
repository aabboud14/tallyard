// A material, from its public listing only: the pictures, the key facts, when it is available against the
// project being checked, the sustainability panel, the full specification, where it is, the guide price as a
// secondary line, and the actions: save to a project, download 2D and 3D geometry.
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Bookmark, BookmarkCheck, Box, CalendarRange, ChevronDown, Download, FileText, Leaf, LockKeyhole, MapPin, PackageCheck, PenLine, ScrollText, Tag } from 'lucide-react'
import { LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { getData, useNow, useView, useViewer } from '../../store'
import { geometryFile, materialView, type MaterialView } from '../../store/selectors/discover'
import { Badge, Button, Callout, Card, CardBody, cx, DescriptionList, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, FitPill, IndicativeMarker, METHODOLOGY_HREF, SustainabilityBand, TimelineStrip, toast, Tooltip } from '../../ui'
import { Page } from '../../app/Page'
import { downloadText } from '../../app/download'
import { AppNotFound } from '../../app/NoAccess'
import { ListingTile } from '../discover/ListingTile'
import { ProjectPicker } from '../discover/ProjectPicker'
import { SaveMenu } from '../discover/SaveMenu'
import { useCheckingProject } from '../discover/useDiscoverQuery'
import { MaterialGallery } from './MaterialGallery'

function SaveButton({ view }: { view: MaterialView }) {
  const saved = view.saveTargets.filter((t) => t.saved)
  const label = saved.length === 0 ? 'Save to project' : saved.length === 1 ? `Saved to ${saved[0].label}` : `Saved to ${saved.length} lists`
  return (
    <SaveMenu
      publicId={view.card.publicId}
      title={view.card.title}
      align="start"
      trigger={
        <Button variant={saved.length ? 'secondary' : 'primary'} size="lg" icon={saved.length ? BookmarkCheck : Bookmark} trailingIcon={ChevronDown} data-testid="material-save" className={cx('min-w-0 max-w-full', saved.length > 0 && 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-50')}>
          <span className="truncate max-sm:hidden">{label}</span>
          <span className="truncate sm:hidden">{saved.length ? 'Saved' : 'Save'}</span>
        </Button>
      }
    />
  )
}

function useGeometryDownload(publicId: string) {
  const viewer = useViewer()
  return (kind: 'dxf' | 'obj') => {
    if (!viewer) return
    const file = geometryFile(getData(), viewer, publicId, kind)
    if (!file) return
    if (file.kind === 'unavailable') {
      toast.error(file.reason)
      return
    }
    downloadText(file.text, file.filename, file.mime)
    toast.success(`Downloaded ${file.filename}`, { description: kind === 'dxf' ? '2D profile, in millimetres.' : '3D model, in millimetres.' })
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
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Geometry from the recorded dimensions</DropdownMenuLabel>
        <DropdownMenuItem icon={PenLine} disabled={!view.geometry.dxf} onSelect={() => get('dxf')} shortcut="DXF">
          2D drawing
        </DropdownMenuItem>
        <DropdownMenuItem icon={Box} disabled={!view.geometry.obj} onSelect={() => get('obj')} shortcut="OBJ">
          3D model
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
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={cx('inline-flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', locked ? 'bg-subtle text-faint ring-line-soft' : 'bg-page text-ink-soft ring-line')}>
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx('m-0 font-medium', locked ? 'text-muted' : 'text-ink')}>{name}</p>
        <p className="m-0 text-xs text-muted">{format}</p>
      </div>
      {locked ? (
        <Tooltip content={LABELS.L35}>
          <span tabIndex={0} data-testid={testId} aria-label={`${name}: ${LABELS.L35}`} className="rounded-full bg-subtle px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-line">
            Coming in version 2
          </span>
        </Tooltip>
      ) : (
        <Button size="sm" icon={Download} onClick={onGet} disabled={disabled} data-testid={testId}>
          Download
        </Button>
      )}
    </li>
  )
}

function Downloads({ view }: { view: MaterialView }) {
  const get = useGeometryDownload(view.card.publicId)
  return (
    <div className="flex flex-col gap-2" data-testid="downloads">
      <Card>
        <ul className="m-0 list-none divide-y divide-line-soft p-0">
          <FileRow icon={PenLine} name="2D drawing" format="DXF, profile in millimetres" onGet={() => get('dxf')} disabled={!view.geometry.dxf} testId="download-dxf" />
          <FileRow icon={Box} name="3D model" format="OBJ, extruded to the recorded length" onGet={() => get('obj')} disabled={!view.geometry.obj} testId="download-obj" />
          <FileRow icon={LockKeyhole} name="BIM family" format="IFC or Revit" testId="bim-family" locked />
        </ul>
      </Card>
      <p className="m-0 text-xs text-muted">{view.geometry.reason ?? LABELS.L42}</p>
    </div>
  )
}

function Section({ id, title, icon: Icon, children, aside }: { id: string; title: string; icon: typeof Leaf; children: ReactNode; aside?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20">
      <div className="mb-3 flex items-center justify-between gap-3">
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

export function MaterialPage() {
  const { publicId = '' } = useParams()
  const [projectId, setProject] = useCheckingProject()
  const view = useView(materialView, publicId, projectId)
  const today = useNow().slice(0, 10)
  if (!view) return <AppNotFound />
  const { card, listing } = view
  const approvedIn = view.saveTargets.filter((t) => t.status === 'Approved' && t.projectId)

  return (
    <Page width="wide" testId="material-page">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:gap-10">
        <div className="xl:col-span-7">
          <div className="mx-auto max-w-[760px] xl:sticky xl:top-8">
            <MaterialGallery entries={view.gallery} spec={listing.spec} publicId={card.publicId} title={card.title} />
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
              <span data-testid="seller-line">{view.sellerLine}</span>
            </p>
          </div>

          {view.reservedFor ? (
            <Callout tone="brand" icon={PackageCheck} title={`Reserved for ${view.reservedFor}`}>
              The client's reservation was accepted by the seller.
            </Callout>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">
            {view.saveTargets.length > 0 ? <SaveButton view={view} /> : null}
            <DownloadMenu view={view} />
            {approvedIn.map((t) => (
              <Button key={t.projectId} asChild size="lg" icon={ScrollText}>
                <Link to={`/app/projects/${t.projectId}/specification`}>Specification</Link>
              </Button>
            ))}
          </div>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-soft">Availability</span>
                {view.projects.length > 0 ? <ProjectPicker projects={view.projects} value={view.project} onChange={setProject} className="h-8" /> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-lg font-semibold text-ink">{view.availability.text}</span>
                {card.fit ? <FitPill fit={card.fit.fit} /> : null}
              </div>
              {view.availability.fitText ? (
                <p className="m-0 text-sm text-ink-soft" data-testid="fit-text">
                  {view.availability.fitText} for {view.project?.name}, materials needed from {view.project?.startText}.{view.availability.storageText ? ` ${view.availability.storageText}.` : ''}
                </p>
              ) : (
                <p className="m-0 text-sm text-muted">Choose a project to check this against its start date.</p>
              )}
            </CardBody>
          </Card>

          <DescriptionList layout="grid" columns={2} items={view.keyFacts.map((f) => ({ label: f.label, value: f.value }))} className="rounded-lg border border-line px-4 py-4" />

          <div className="flex flex-col gap-1 border-t border-line-soft pt-4" data-testid="guide-price">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
              <span className="text-muted">
                Guide price <span className="font-medium tabular-nums text-ink-soft">{view.price.range}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-muted">
                {view.price.signal}
                <IndicativeMarker />
              </span>
            </div>
            {view.saveTargets.length > 0 ? <p className="m-0 text-xs text-muted">{LABELS.L40}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-12 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-12 xl:col-span-7">
          <Section id="timeline-h" title="Timeline" icon={CalendarRange}>
            {view.project && card.fit ? (
              <Card padding="md">
                <TimelineStrip today={today} startDate={view.project.startDate} startLabel={`${view.project.name} start`} items={[{ id: card.publicId, window: view.availability.windowStart && view.availability.windowEnd ? { start: view.availability.windowStart, end: view.availability.windowEnd } : null, fit: card.fit.fit }]} testId="material-timeline" />
              </Card>
            ) : (
              <Card padding="md">
                <p className="m-0 text-sm text-muted">{view.availability.text}. Choose a project above to see this against its programme.</p>
              </Card>
            )}
          </Section>

          <Section id="spec-h" title="Specification" icon={FileText}>
            <Card className="overflow-hidden" data-testid="spec-table">
              {view.specSections.map((s, i) => (
                <div key={s.section} className={cx('grid grid-cols-1 gap-x-6 px-4 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:px-5', i > 0 && 'border-t border-line-soft')}>
                  <h3 className="m-0 mb-2 text-sm font-medium text-muted sm:mb-0">{s.section}</h3>
                  <dl className="m-0 grid grid-cols-1 gap-y-2">
                    {s.rows.map((r) => (
                      <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
                        <dt className="text-sm text-muted">{r.label}</dt>
                        <dd className="m-0 break-words text-sm font-medium tabular-nums text-ink">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </Card>
          </Section>

        </div>

        <div className="flex min-w-0 flex-col gap-12 xl:col-span-5">
          <Section id="sustainability-h" title="Sustainability" icon={Leaf} aside={<IndicativeMarker />}>
            <Card data-testid="sustainability">
              <CardBody className="flex flex-col gap-4">
                {view.sustainability.claimed && view.sustainability.avoidedT !== null ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted">Avoided carbon</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-semibold tabular-nums text-ink">{f.number(view.sustainability.avoidedT, 1)}</span>
                        <span className="text-sm text-muted">tCO2e</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted">Compared with new</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-semibold tabular-nums text-ink">{view.sustainability.percent !== null ? f.percent(view.sustainability.percent) : 'Not given'}</span>
                        <span className="text-sm text-muted">avoided</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="m-0 text-sm text-ink-soft">{LABELS.L14}</p>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                  <span className="text-sm text-muted">Sustainability band</span>
                  <SustainabilityBand band={card.band} />
                </div>
                <p className="m-0 text-xs leading-5 text-muted">
                  {LABELS.L11}{' '}
                  <Link to={METHODOLOGY_HREF} className="font-medium text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink">
                    How this is worked out
                  </Link>
                </p>
              </CardBody>
            </Card>
          </Section>

          <Section id="location-h" title="Location and collection" icon={MapPin}>
            <Card>
              <CardBody>
                <DescriptionList
                  items={[
                    { label: 'Location', value: view.location.label },
                    { label: 'Collection point', value: view.location.collectionPoint },
                    { label: 'Seller', value: listing.sellerType },
                  ]}
                />
              </CardBody>
            </Card>
            <p className="m-0 mt-2 text-xs text-muted">The seller and the exact site are shared with the client once a reservation is accepted.</p>
          </Section>

          <Section id="downloads-h" title="Geometry" icon={PenLine}>
            <Downloads view={view} />
          </Section>
        </div>
      </div>

      {view.similar.length > 0 ? (
        <section aria-labelledby="similar-h" className="mt-16 border-t border-line-soft pt-10">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 id="similar-h" className="m-0 text-lg font-semibold text-ink">
              Similar materials
            </h2>
            <Link to="/app/discover" className="text-sm font-medium text-ink-soft hover:text-ink">
              Browse all
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
