// The architect's wish list for one project (brief/09-V1-PRODUCT.md sections 3.3, 5.8, 13.4 and 13.5).
// Every figure comes from wishlistView; the screen formats it. Approval and purchase sit with the client.
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useStore } from '../../store/store'
import { useProjectParam, NotAvailable } from '../../app/params'
import { geometryFor, wishlistView, type MoveTarget, type WishRow } from '../../store/v1selectors'
import { avoidedLine, geometryKinds, rowsForTab, storageLine, WISH_TAB_LABELS, WISH_TABS, wishTabCounts, type WishTab } from '../../store/views/architectProject'
import type { Fit, GeometryFile, WishStatus } from '../../domain/v1types'
import { LABELS } from '../../domain/reference/labels'
import { formatDate } from '../../domain/dates'
import { availabilityText, quantityText } from '../../domain/engines/specSheet'
import * as f from '../../domain/format'
import { Button, EmptyState, Tag, cx, inputClass } from '../../components/ui'
import { ChipGroup, Download, Sheet, SustainabilityBand } from '../../components/v1'
import { ListingVisual } from '../market/ListingVisual'

const STATUS_TONE: Record<WishStatus, 'grey' | 'steel' | 'teal' | 'oxide'> = { pending: 'grey', sent: 'steel', approved: 'teal', declined: 'oxide' }
const FIT_TONE: Record<Fit, 'teal' | 'survey' | 'oxide'> = { now: 'teal', in_time: 'teal', tight: 'survey', late: 'oxide' }

const TAB_HINTS: Record<WishTab, string> = {
  all: 'Save materials from Browse or Shared with you to this project. They arrive here as pending.',
  pending: 'Items you save to this project wait here until you send them to the client.',
  sent: 'Items sent to the client wait here for a decision.',
  approved: 'Items the client approves appear here. The spec sheet is compiled from them.',
  declined: 'Items the client declines appear here with the client note.',
}

type Flash = { tone: 'teal' | 'oxide'; text: string } | null

/** Hands a generated geometry file to the browser as a download. */
function downloadText(file: Extract<GeometryFile, { kind: 'file' }>): void {
  const blob = new Blob([file.text], { type: file.mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function Wishlist() {
  const { id, allowed } = useProjectParam()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const sendWishlist = useStore((s) => s.sendWishlist)
  const view = useMemo(() => (allowed ? wishlistView(world, personaId, id) : null), [world, personaId, id, allowed])
  const [tab, setTab] = useState<WishTab>('all')
  const [flash, setFlash] = useState<Flash>(null)

  if (!view) return <NotAvailable />
  const p = view.project
  const counts = wishTabCounts(view.rows)
  const rows = rowsForTab(view.rows, tab)
  const totals = view.totals[tab]
  const hidden = rows.some((r) => r.state !== 'ok')

  const send = () => {
    const error = sendWishlist(p.id)
    setFlash(error ? { tone: 'oxide', text: error } : { tone: 'teal', text: `Sent to ${p.clientName} for a decision on each item.` })
    if (!error) setTab('sent')
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6" data-testid="wishlist">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Wish list</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight" data-testid="wishlist-project-name">
            {p.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft" data-testid="wishlist-project-line">
            {p.typeLabel} project for {p.clientName}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft" data-testid="wishlist-start">
            Materials needed on site from <span className="font-medium text-ink">{formatDate(p.startDate)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/projects/${p.id}/spec`} className="inline-flex min-h-[44px] items-center rounded-sm border border-rule bg-panel px-4 text-sm font-medium text-ink no-underline hover:bg-steel-tint" data-testid="wishlist-open-spec">
            Spec sheet
          </Link>
          <Button variant="primary" size="lg" className="text-panel" onClick={send} disabled={!view.canSend} data-testid="wishlist-send">
            {view.canSend ? `Send ${view.sendableCount} pending to the client` : 'Send pending to the client'}
          </Button>
        </div>
      </header>

      <p className="-mt-2 flex items-start gap-2 border-l-2 border-mill pl-3 text-sm text-ink-soft" data-testid="label-L40">
        {LABELS.L40}
      </p>

      <section aria-label="Totals" className="grid grid-cols-3 divide-x divide-rule-soft rounded-md border border-rule-soft bg-panel" data-testid="wish-totals">
        <TotalFigure label="Items" value={String(totals.count)} testId="wish-total-count" />
        <TotalFigure label="Mass" value={f.fixed(totals.massT, 2)} unit="t" testId="wish-total-mass" />
        <TotalFigure label="Avoided carbon" value={f.fixed(totals.avoidedT, 1)} unit="tCO2e" testId="wish-total-avoided" />
      </section>

      <div className="flex flex-col gap-3">
        <ChipGroup<WishTab> className="[&>[aria-pressed=true]]:text-panel" ariaLabel="Show items by state" testId="wish-tabs" value={tab} onChange={setTab} options={WISH_TABS.map((t) => ({ value: t, label: WISH_TAB_LABELS[t], count: counts[t] }))} />
        <p className="text-xs text-mill-text">
          Totals for {tab === 'all' ? 'every state' : WISH_TAB_LABELS[tab].toLowerCase()}
          {hidden ? '. Items no longer shared or available are left out of the totals.' : '.'}
        </p>
      </div>

      {flash ? (
        <p role="status" className={cx('rounded-sm border-l-2 px-3 py-2 text-sm', flash.tone === 'teal' ? 'border-teal bg-teal-tint' : 'border-oxide bg-oxide-tint')} data-testid="wishlist-flash">
          {flash.text}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <EmptyState hint={TAB_HINTS[tab]} />
          {tab === 'all' ? (
            <Link to="/market" className="inline-flex min-h-[44px] items-center rounded-sm border border-steel bg-steel px-4 text-sm font-medium text-panel no-underline hover:bg-steel-deep" data-testid="wishlist-browse">
              Browse the marketplace
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0" data-testid="wish-rows">
          {rows.map((r) => (
            <WishRowCard key={r.item.id} row={r} onFlash={setFlash} />
          ))}
        </ul>
      )}

      <footer className="flex flex-col gap-1.5 border-t border-rule-soft pt-4 text-xs text-mill-text">
        <p className="m-0">
          <span className="font-medium text-ink-soft">Timeline fit. </span>
          <span data-testid="label-L38">{LABELS.L38}</span>
        </p>
        <p className="m-0">
          <span className="font-medium text-ink-soft">Sustainability band. </span>
          <span data-testid="label-L37">{LABELS.L37}</span>
        </p>
        <p className="m-0">
          <span className="font-medium text-ink-soft">Geometry. </span>
          <span data-testid="label-L42">{LABELS.L42}</span>
        </p>
      </footer>
    </div>
  )
}

function TotalFigure({ label, value, unit, testId }: { label: string; value: string; unit?: string; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-3 py-3 sm:px-5 sm:py-4">
      <span className="text-xs text-mill-text">{label}</span>
      <span className="flex flex-wrap items-baseline gap-x-1 font-display leading-none tabular-nums" data-testid={testId}>
        <span className="text-[22px] sm:text-[28px]">{value}</span>
        {unit ? <span className="text-sm text-ink-soft sm:text-base">{unit}</span> : null}
      </span>
    </div>
  )
}

function Fact({ label, children, testId, className }: { label: string; children: ReactNode; testId?: string; className?: string }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1', className)}>
      <dt className="text-xs text-mill-text">{label}</dt>
      <dd className="m-0 text-sm font-medium tabular-nums text-ink" data-testid={testId}>
        {children}
      </dd>
    </div>
  )
}

function WishRowCard({ row, onFlash }: { row: WishRow; onFlash: (f: Flash) => void }) {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const removeWish = useStore((s) => s.removeWish)
  const editWishNote = useStore((s) => s.editWishNote)
  const reopenWish = useStore((s) => s.reopenWish)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row.item.note)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [moving, setMoving] = useState(false)
  const l = row.listing
  const item = row.item
  const declined = item.status === 'declined'

  const remove = () => {
    const error = removeWish(item.id)
    onFlash(error ? { tone: 'oxide', text: error } : { tone: 'teal', text: `Removed ${row.title} from this list.` })
  }

  const saveNote = () => {
    const error = declined ? reopenWish(item.id, draft.trim()) : editWishNote(item.id, draft.trim())
    if (error) onFlash({ tone: 'oxide', text: error })
    else {
      setEditing(false)
      if (declined) onFlash({ tone: 'teal', text: `${row.title} is pending again. Send it to the client when ready.` })
    }
  }

  const download = (kind: 'dxf' | 'obj') => {
    const file = geometryFor(world, personaId, item.publicId, kind)
    if (file && file.kind === 'file') downloadText(file)
    else onFlash({ tone: 'oxide', text: file?.reason ?? 'This listing is not available.' })
  }

  const status = (
    <Tag tone={STATUS_TONE[item.status]} data-testid="wish-status">
      {row.statusLabel}
    </Tag>
  )

  // A row the project can no longer see: the title and the reason, no figures (13.4).
  if (!l || row.state !== 'ok') {
    return (
      <li className="rounded-md border border-dashed border-rule bg-panel/70 p-3 sm:p-4" data-testid={`wish-row-${item.publicId}`} data-status={item.status} data-state={row.state}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 font-display text-lg leading-tight tracking-wide text-ink-soft">{row.title}</h3>
            <p className="m-0 mt-1 text-sm text-oxide" data-testid="wish-state-text">
              {row.stateText}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status}
            {row.canRemove ? (
              <Button variant="quiet" className="min-h-[44px]" onClick={remove} data-testid="wish-remove">
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </li>
    )
  }

  const geo = geometryKinds(l)
  const avoided = avoidedLine(l)
  const storage = storageLine(row.fit)

  return (
    <li className="rounded-md border border-rule-soft bg-panel p-3 transition-shadow hover:shadow-[0_0_0_1px_rgba(20,32,43,0.04),0_10px_24px_-18px_rgba(20,32,43,0.35)] sm:p-4" data-testid={`wish-row-${item.publicId}`} data-status={item.status} data-state={row.state}>
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-3 md:grid-cols-[152px_minmax(0,1fr)]">
        <Link to={`/market/${l.publicId}`} className="row-span-1 block aspect-[4/3] self-start overflow-hidden rounded-sm bg-rule-soft md:row-span-2" aria-label={`Open ${row.title}`} tabIndex={-1}>
          <ListingVisual listing={l} className="h-full w-full object-cover" />
        </Link>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <h3 className="m-0 min-w-0 font-display text-xl leading-tight tracking-wide">
              <Link to={`/market/${l.publicId}`} className="text-ink no-underline hover:text-steel" data-testid="wish-open">
                {row.title}
              </Link>
            </h3>
            {status}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-mill-text">
            <span className="font-medium tabular-nums">{l.publicId}</span>
            <Tag tone="steel" className="text-xs">
              {row.typologyLabel}
            </Tag>
            {l.sharing === 'in_confidence' ? (
              <Tag tone="grey" className="text-xs" data-testid="label-L27">
                {LABELS.L27}
              </Tag>
            ) : null}
          </div>
        </div>

        <div className="col-span-2 flex min-w-0 flex-col gap-3 md:col-span-1 md:col-start-2">
          <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3 rounded-sm bg-paper px-3 py-2.5 sm:grid-cols-3 lg:grid-cols-[1fr_1.2fr_1.5fr_1fr_1fr]">
            <Fact label="Quantity" testId="wish-quantity">
              {quantityText(l)}
            </Fact>
            <Fact label="Availability" testId="wish-availability">
              {availabilityText(l)}
            </Fact>
            <Fact label="Timeline fit" className="col-span-2 sm:col-span-1">
              <span className="flex flex-col items-start gap-1">
                {row.fit ? (
                  <Tag tone={FIT_TONE[row.fit.fit]} className="whitespace-normal text-left" data-testid="wish-fit" data-fit={row.fit.fit}>
                    {row.fit.text}
                  </Tag>
                ) : null}
                {storage ? (
                  <span className="text-xs font-normal text-ink-soft" data-testid="wish-storage">
                    {storage}
                  </span>
                ) : null}
              </span>
            </Fact>
            <Fact label="Sustainability band">{row.band ? <SustainabilityBand band={row.band} size="sm" testId="wish-band" /> : null}</Fact>
            <Fact label="Avoided carbon" testId="wish-avoided">
              <span className={avoided.claimed ? '' : 'font-normal text-mill-text'}>{avoided.value}</span>
            </Fact>
          </dl>

          {item.decisionNote || (declined && item.decidedOn) ? (
            <div className={cx('rounded-sm border-l-2 px-3 py-2 text-sm', declined ? 'border-oxide bg-oxide-tint' : 'border-teal bg-teal-tint')} data-testid="wish-decision">
              <span className="font-medium">
                {declined ? 'Declined by the client' : 'Approved by the client'}
                {item.decidedOn ? ` on ${formatDate(item.decidedOn)}` : ''}.
              </span>{' '}
              {item.decisionNote ? <span>{item.decisionNote}</span> : null}
            </div>
          ) : null}

          {editing ? (
            <div className="flex flex-col gap-2">
              <label htmlFor={`note-${item.id}`} className="text-xs font-medium text-ink-soft">
                {declined ? 'New note for the client' : 'Note'}
              </label>
              <textarea id={`note-${item.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} className={cx(inputClass, 'py-2 text-sm')} data-testid="wish-note-input" />
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" className="min-h-[44px] text-panel" onClick={saveNote} data-testid="wish-note-save">
                  {declined ? 'Save and reopen' : 'Save note'}
                </Button>
                <Button
                  variant="quiet"
                  className="min-h-[44px]"
                  onClick={() => {
                    setDraft(item.note)
                    setEditing(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : item.note ? (
            <p className="m-0 text-sm text-ink" data-testid="wish-note">
              <span className="mr-1.5 text-xs font-medium uppercase tracking-[0.06em] text-mill-text">Note</span>
              {item.note}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-rule-soft pt-2.5">
            {row.canEditNote && !editing ? (
              <Button
                variant={declined ? 'secondary' : 'quiet'}
                className="min-h-[44px]"
                onClick={() => {
                  setDraft(item.note)
                  setEditing(true)
                }}
                data-testid={declined ? 'wish-reopen' : 'wish-edit-note'}
              >
                {declined ? 'Edit note and reopen' : item.note ? 'Edit note' : 'Add a note'}
              </Button>
            ) : null}
            {row.canMove ? (
              <Button variant="quiet" className="min-h-[44px]" onClick={() => setMoving(true)} data-testid="wish-move">
                Move
              </Button>
            ) : null}
            <span className="inline-flex items-center gap-1" role="group" aria-label="Download geometry">
              {geo.dxf ? (
                <Button variant="quiet" className="min-h-[44px] gap-1.5" onClick={() => download('dxf')} data-testid="wish-dxf" title="2D profile, DXF">
                  <Download size={16} />
                  DXF
                </Button>
              ) : null}
              {geo.obj ? (
                <Button variant="quiet" className="min-h-[44px] gap-1.5" onClick={() => download('obj')} data-testid="wish-obj" title="3D model, OBJ">
                  <Download size={16} />
                  OBJ
                </Button>
              ) : null}
              {!geo.dxf && !geo.obj && geo.reason ? (
                <span className="px-2 text-xs text-mill-text" data-testid="wish-geometry-none">
                  Geometry: {geo.reason}
                </span>
              ) : null}
            </span>
            <Link to={`/market/${l.publicId}`} className="inline-flex min-h-[44px] items-center rounded-sm px-3 text-sm font-medium text-steel no-underline hover:bg-steel-tint" data-testid="wish-open-listing">
              Open listing
            </Link>
            <span className="ml-auto inline-flex items-center gap-1">
              {row.canRemove && !confirmRemove ? (
                <Button variant="quiet" className="min-h-[44px] text-ink-soft hover:text-oxide" onClick={() => setConfirmRemove(true)} data-testid="wish-remove">
                  Remove
                </Button>
              ) : null}
              {confirmRemove ? (
                <>
                  <span className="text-sm text-ink-soft">Remove from this list?</span>
                  <Button variant="danger" className="min-h-[44px]" onClick={remove} data-testid="wish-remove-confirm">
                    Remove
                  </Button>
                  <Button variant="quiet" className="min-h-[44px]" onClick={() => setConfirmRemove(false)}>
                    Keep
                  </Button>
                </>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      {row.canMove ? <MoveSheet open={moving} onOpenChange={setMoving} row={row} onFlash={onFlash} /> : null}
    </li>
  )
}

function MoveSheet({ open, onOpenChange, row, onFlash }: { open: boolean; onOpenChange: (open: boolean) => void; row: WishRow; onFlash: (f: Flash) => void }) {
  const moveWish = useStore((s) => s.moveWish)
  const move = (t: MoveTarget) => {
    const error = moveWish(row.item.id, t.projectId)
    onOpenChange(false)
    onFlash(error ? { tone: 'oxide', text: error } : { tone: 'teal', text: `Moved ${row.title} to ${t.label}.` })
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Move to another list" description={row.title} testId="wish-move-sheet">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {row.moveTargets.map((t) => (
          <li key={t.projectId ?? 'saved'}>
            <button
              type="button"
              disabled={!t.allowed}
              onClick={() => move(t)}
              className="flex min-h-[44px] w-full flex-col items-start justify-center rounded-sm border border-rule bg-panel px-3 py-2 text-left text-sm font-medium text-ink hover:border-steel hover:bg-steel-tint disabled:cursor-not-allowed disabled:border-rule-soft disabled:bg-paper disabled:text-mill-text"
              data-testid={`wish-move-to-${t.projectId ?? 'saved'}`}
            >
              {t.label}
              {t.reason ? <span className="mt-0.5 text-xs font-normal text-mill-text">{t.reason}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
