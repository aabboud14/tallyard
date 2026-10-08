// The client's approvals for one project (brief/09-V1-PRODUCT.md sections 3.4, 13.4 and 13.5).
// Every figure comes from approvalsView over the public listings; the screen formats it. Approval changes the
// item's state only: reserving steel goes through the project's Match schedule (advanced).
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useStore } from '../../store/store'
import { useProjectParam, NotAvailable } from '../../app/params'
import { approvalsView, type ApprovalRow } from '../../store/v1selectors'
import { decisionText, fitStorageText } from '../../store/views/client'
import type { Fit } from '../../domain/v1types'
import { LABELS } from '../../domain/reference/labels'
import { formatDate } from '../../domain/dates'
import { availabilityText, avoidedCarbonText, quantityText, specFieldRows } from '../../domain/engines/specSheet'
import * as f from '../../domain/format'
import { Button, EmptyState, Tag, cx, inputClass } from '../../components/ui'
import { SustainabilityBand } from '../../components/v1'
import { ListingVisual } from '../market/ListingVisual'
import { ClientHeader } from '../project/ClientHeader'

const FIT_TONE: Record<Fit, 'teal' | 'survey' | 'oxide'> = { now: 'teal', in_time: 'teal', tight: 'survey', late: 'oxide' }

type Flash = { tone: 'teal' | 'oxide'; text: string } | null

export function Approvals() {
  const { id, allowed } = useProjectParam()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const view = useMemo(() => (allowed ? approvalsView(world, personaId, id) : null), [world, personaId, id, allowed])
  const [flash, setFlash] = useState<Flash>(null)

  if (!view) return <NotAvailable />
  const p = view.project
  const nothingSent = view.sent.length === 0 && view.approved.length === 0 && view.declined.length === 0
  const approvedTotals = view.totals.approved

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6" data-testid="approvals">
      <ClientHeader
        testId="approvals-header"
        eyebrow={p.name}
        title="Approvals"
        sub={
          <span data-testid="approvals-project-line">
            {p.typeLabel} project. Materials needed on site from <span className="font-medium text-ink">{formatDate(p.startDate)}</span>. The architect chooses on function, appearance and carbon; you decide what the project buys.
          </span>
        }
      />

      {nothingSent ? null : (
        <section aria-label="Summary" className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule-soft bg-rule-soft sm:grid-cols-4" data-testid="approvals-summary">
          <Stat label="Awaiting your decision" value={String(view.sent.length)} testId="approvals-count-sent" strong={view.sent.length > 0} />
          <Stat label="Approved" value={String(view.approved.length)} testId="approvals-count-approved" />
          <Stat label="Approved mass" value={f.fixed(approvedTotals.massT, 2)} unit="t" testId="approvals-approved-mass" />
          <Stat label="Approved avoided carbon" value={f.fixed(approvedTotals.avoidedT, 1)} unit="tCO2e" testId="approvals-approved-avoided" />
        </section>
      )}

      {flash ? (
        <p role="status" className={cx('m-0 rounded-sm border-l-2 px-3 py-2 text-sm', flash.tone === 'teal' ? 'border-teal bg-teal-tint' : 'border-oxide bg-oxide-tint')} data-testid="approvals-flash">
          {flash.text}
        </p>
      ) : null}

      {nothingSent ? (
        <div data-testid="approvals-empty">
          <EmptyState hint="Materials appear here when the architect sends them from the project's wish list for your decision." />
        </div>
      ) : (
        <section className="flex flex-col gap-3" aria-labelledby="approvals-sent-heading">
          <SectionHeading id="approvals-sent-heading" count={view.sent.length}>
            Awaiting your decision
          </SectionHeading>
          {view.sent.length === 0 ? (
            <p className="m-0 rounded-md border border-dashed border-rule px-4 py-4 text-sm text-mill-text" data-testid="approvals-none-sent">
              Nothing is waiting for a decision. New items from the architect will appear here.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-4 p-0" data-testid="approvals-sent">
              {view.sent.map((r) => (
                <DecisionCard key={r.item.id} row={r} projectId={p.id} onFlash={setFlash} />
              ))}
            </ul>
          )}
        </section>
      )}

      <aside className="flex flex-col gap-3 rounded-md border border-rule-soft bg-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid="approvals-match">
        <p className="m-0 max-w-2xl text-sm text-ink-soft">
          <span className="font-medium text-ink">Reserving steel. </span>
          Approving an item does not reserve it. For steel, the match schedule checks the project's steel schedule against the stock and adds allocations to the reuse plan.
        </p>
        <Link to={`/projects/${p.id}/match`} className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-sm border border-rule bg-panel px-4 text-sm font-medium text-steel no-underline hover:bg-steel-tint" data-testid="approvals-match-link">
          Open Match schedule (advanced)
        </Link>
      </aside>

      {view.approved.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="approvals-approved-heading">
          <SectionHeading id="approvals-approved-heading" count={view.approved.length}>
            Approved
          </SectionHeading>
          <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="approvals-approved">
            {view.approved.map((r) => (
              <DecidedRow key={r.item.id} row={r} />
            ))}
          </ul>
        </section>
      ) : null}

      {view.declined.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="approvals-declined-heading">
          <SectionHeading id="approvals-declined-heading" count={view.declined.length}>
            Declined
          </SectionHeading>
          <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="approvals-declined">
            {view.declined.map((r) => (
              <DecidedRow key={r.item.id} row={r} />
            ))}
          </ul>
        </section>
      ) : null}

      {nothingSent ? null : (
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
            <span className="font-medium text-ink-soft">Avoided carbon. </span>
            <span data-testid="label-L11">{LABELS.L11}</span>
          </p>
        </footer>
      )}
    </div>
  )
}

function SectionHeading({ id, count, children }: { id: string; count: number; children: ReactNode }) {
  return (
    <h2 id={id} className="m-0 flex items-baseline gap-2 text-base font-semibold">
      {children}
      <span className="font-display text-lg leading-none text-mill-text tabular-nums">{count}</span>
    </h2>
  )
}

function Stat({ label, value, unit, testId, strong = false }: { label: string; value: string; unit?: string; testId: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-panel px-4 py-3 sm:px-5 sm:py-4">
      <span className="text-xs text-mill-text">{label}</span>
      <span className={cx('flex flex-wrap items-baseline gap-x-1 font-display leading-none tabular-nums', strong ? 'text-steel' : 'text-ink')} data-testid={testId}>
        <span className="text-[24px] sm:text-[28px]">{value}</span>
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

function Avoided({ row }: { row: ApprovalRow }) {
  const l = row.listing!
  if (l.carbon === null)
    return (
      <span className="font-normal text-mill-text" data-testid="label-L14">
        {LABELS.L14}
      </span>
    )
  return <span>{avoidedCarbonText(l)}</span>
}

function TitleTags({ row }: { row: ApprovalRow }) {
  const l = row.listing!
  return (
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
  )
}

function DecisionCard({ row, projectId, onFlash }: { row: ApprovalRow; projectId: string; onFlash: (f: Flash) => void }) {
  const decideWish = useStore((s) => s.decideWish)
  const [note, setNote] = useState('')
  const l = row.listing!
  const item = row.item
  const storage = fitStorageText(row.fit)
  const spec = specFieldRows(l.spec)

  const decide = (decision: 'approved' | 'declined') => {
    const error = decideWish(projectId, item.id, decision, note)
    if (error) onFlash({ tone: 'oxide', text: error })
    else onFlash({ tone: 'teal', text: `${decision === 'approved' ? 'Approved' : 'Declined'} ${row.title}. The architect sees your decision on the wish list.` })
  }

  return (
    <li className="overflow-hidden rounded-md border border-rule-soft bg-panel" data-testid={`approval-card-${l.publicId}`}>
      <div className="grid gap-0 md:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <Link to={`/market/${l.publicId}`} className="block aspect-[4/3] overflow-hidden bg-rule-soft md:aspect-auto md:h-full md:min-h-[240px]" aria-label={`Open ${row.title}`} tabIndex={-1}>
          <ListingVisual listing={l} className="h-full w-full object-cover" />
        </Link>

        <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            <h3 className="m-0 font-display text-2xl leading-tight tracking-wide">
              <Link to={`/market/${l.publicId}`} className="text-ink no-underline hover:text-steel" data-testid="approval-open">
                {row.title}
              </Link>
            </h3>
            <TitleTags row={row} />
            <p className="m-0 text-sm text-ink-soft" data-testid="approval-spec">
              {spec.map((s, i) => (
                <span key={s.label}>
                  {i > 0 ? <span className="text-mill">, </span> : null}
                  <span className="text-mill-text">{s.label}</span> {s.value}
                </span>
              ))}
              <span className="text-mill">, </span>
              <span className="text-mill-text">Condition</span> {l.condition}
            </p>
          </div>

          <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3 rounded-sm bg-paper px-3 py-3 lg:grid-cols-3">
            <Fact label="Quantity" testId="approval-quantity">
              {quantityText(l)}
              <span className="block text-xs font-normal text-ink-soft">{f.massT(l.massT)}</span>
            </Fact>
            <Fact label="Availability" testId="approval-availability">
              {availabilityText(l)}
            </Fact>
            <Fact label="Timeline fit" className="col-span-2 lg:col-span-1">
              <span className="flex flex-col items-start gap-1">
                {row.fit ? (
                  <Tag tone={FIT_TONE[row.fit.fit]} className="whitespace-normal text-left" data-testid="approval-fit" data-fit={row.fit.fit}>
                    {row.fit.text}
                  </Tag>
                ) : null}
                {storage ? (
                  <span className="text-xs font-normal text-ink-soft" data-testid="approval-storage">
                    {storage}
                  </span>
                ) : null}
              </span>
            </Fact>
            <Fact label="Sustainability band">{row.band ? <SustainabilityBand band={row.band} size="sm" testId="approval-band" /> : null}</Fact>
            <Fact label="Avoided carbon" testId="approval-avoided">
              <Avoided row={row} />
            </Fact>
            <Fact label="Guide price range" testId="approval-price">
              {row.priceRange}
            </Fact>
          </dl>

          {item.note ? (
            <blockquote className="m-0 border-l-2 border-steel pl-3 text-sm text-ink" data-testid="approval-architect-note">
              <span className="block text-xs text-mill-text">Note from the architect</span>
              {item.note}
            </blockquote>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-rule-soft pt-4">
            <label htmlFor={`decision-note-${item.id}`} className="text-xs font-medium text-ink-soft">
              Note to the architect, optional
            </label>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
              <textarea id={`decision-note-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={cx(inputClass, 'py-2 text-sm lg:flex-1')} data-testid={`approval-note-${l.publicId}`} />
              <div className="flex gap-2">
                <Button variant="primary" size="lg" className="min-w-[120px] text-panel" onClick={() => decide('approved')} data-testid={`approve-${l.publicId}`}>
                  Approve
                </Button>
                <Button variant="danger" size="lg" className="min-w-[120px]" onClick={() => decide('declined')} data-testid={`decline-${l.publicId}`}>
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

function DecidedRow({ row }: { row: ApprovalRow }) {
  const l = row.listing!
  const item = row.item
  const approved = item.status === 'approved'
  return (
    <li className="rounded-md border border-rule-soft bg-panel p-3" data-testid={`${approved ? 'approved' : 'declined'}-row-${l.publicId}`}>
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 md:grid-cols-[128px_minmax(0,1fr)]">
        <Link to={`/market/${l.publicId}`} className="block aspect-[4/3] self-start overflow-hidden rounded-sm bg-rule-soft" aria-label={`Open ${row.title}`} tabIndex={-1}>
          <ListingVisual listing={l} className="h-full w-full object-cover" />
        </Link>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="m-0 font-display text-lg leading-tight tracking-wide">
                <Link to={`/market/${l.publicId}`} className="text-ink no-underline hover:text-steel">
                  {row.title}
                </Link>
              </h3>
              <TitleTags row={row} />
            </div>
            <Tag tone={approved ? 'teal' : 'oxide'} data-testid="approval-decision">
              {decisionText(item)}
            </Tag>
          </div>
          <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-2 lg:grid-cols-[1fr_1fr_1.4fr_1fr]">
            <Fact label="Quantity">{quantityText(l)}</Fact>
            <Fact label="Availability">{availabilityText(l)}</Fact>
            <Fact label="Avoided carbon">
              <Avoided row={row} />
            </Fact>
            <Fact label="Guide price range">{row.priceRange}</Fact>
          </dl>
          {item.decisionNote ? (
            <p className={cx('m-0 border-l-2 pl-3 text-sm text-ink', approved ? 'border-teal' : 'border-oxide')} data-testid="approval-decision-note">
              <span className="text-mill-text">Your note: </span>
              {item.decisionNote}
            </p>
          ) : null}
          {approved && l.family !== 'steel_section' ? (
            <p className="m-0 text-xs text-mill-text" data-testid="label-L25">
              {LABELS.L25}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
