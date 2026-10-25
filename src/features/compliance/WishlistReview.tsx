// The consultant's wish list review (brief/09-V1-PRODUCT.md sections 3.5 and 13.12): the architect's list for the project,
// read only, by state, with counts, mass and avoided carbon totals. No targets and no comparison with them.
import { useStore } from '../../store/store'
import { useProjectParam, NotAvailable } from '../../app/params'
import { reviewScreen, type ReviewLine, type ReviewSection } from '../../store/views/consultant'
import { LABELS } from '../../domain/reference/labels'
import { PageTitle, Panel, Table, Num, Tag, EmptyState } from '../../components/ui'
import { MaterialSwatch, SustainabilityBand } from '../../components/v1'
import type { WishStatus, WishTotals } from '../../domain/v1types'
import * as f from '../../domain/format'

const STATE_TONES: Record<WishStatus, 'teal' | 'steel' | 'grey' | 'oxide'> = {
  approved: 'teal',
  sent: 'steel',
  pending: 'grey',
  declined: 'oxide',
}

const EMPTY_SECTION: Record<WishStatus, string> = {
  approved: 'The client has approved nothing yet.',
  sent: 'Nothing is waiting for the client.',
  pending: 'Nothing is pending with the architect.',
  declined: 'The client has declined nothing.',
}

export function WishlistReview() {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const { record: project } = useProjectParam()
  const v = project ? reviewScreen(world, personaId, project.id) : null
  if (!project || !v) return <NotAvailable />

  return (
    <div data-testid="wishlist-review">
      <PageTitle
        title={`${v.project.name}, wish list review`}
        sub={`${v.project.projectLine} ${v.stageLine}`}
        right={
          <Tag tone="grey" data-testid="review-read-only">
            Read only
          </Tag>
        }
      />
      <p className="-mt-2 mb-4 max-w-3xl text-sm text-ink-soft">
        The architect's wish list for this project, grouped by where each item stands with the client. Figures come from the public listings. Items no longer shared with the project or no longer
        available are left out.
      </p>

      {v.isEmpty ? (
        <div data-testid="review-empty">
          <EmptyState hint="The architect has not added anything to this project's wish list yet. Items appear here as soon as they are saved." />
        </div>
      ) : (
        <>
          <Panel title="Totals by state" data-testid="review-totals">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="grid grid-cols-3 gap-4 self-start">
                <Total label="Items" value={f.number(v.totals.count)} testId="review-total-count" />
                <Total label="Mass" value={f.massT(v.totals.massT)} testId="review-total-mass" />
                <Total label="Avoided carbon" value={f.carbon(v.totals.avoidedT)} testId="review-total-carbon" />
              </div>
              <Table data-testid="review-totals-table">
                <thead>
                  <tr>
                    <th>State</th>
                    <th className="text-right">Items</th>
                    <th className="text-right">Mass (t)</th>
                    <th className="text-right">Avoided carbon (tCO2e)</th>
                  </tr>
                </thead>
                <tbody>
                  {v.sections.map((s) => (
                    <TotalsRow key={s.status} label={s.label} status={s.status} t={s.totals} />
                  ))}
                  <TotalsRow label="All states" status={null} t={v.totals} />
                </tbody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-mill-text" data-testid="label-L11">
              {LABELS.L11}
            </p>
          </Panel>
          <div className="mt-4 flex flex-col gap-3">
            {v.sections.map((s) => (
              <StateSection key={s.status} s={s} />
            ))}
          </div>
        </>
      )}

      <div className="mt-4 flex flex-col gap-1 text-xs text-mill-text">
        <p data-testid="label-L37">{LABELS.L37}</p>
        <p data-testid="label-L38">{LABELS.L38}</p>
      </div>
    </div>
  )
}

function Total({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="text-xs text-mill-text">{label}</div>
      <div className="whitespace-nowrap font-display text-[28px] leading-none tabular-nums" data-testid={testId}>
        {value}
      </div>
    </div>
  )
}

function TotalsRow({ label, status, t }: { label: string; status: WishStatus | null; t: WishTotals }) {
  const key = status ?? 'all'
  return (
    <tr className={status === null ? 'font-medium' : undefined} data-testid={`review-totals-${key}`}>
      <td>{status ? <Tag tone={STATE_TONES[status]}>{label}</Tag> : label}</td>
      <Num testId={`review-totals-${key}-count`}>{f.number(t.count)}</Num>
      <Num testId={`review-totals-${key}-mass`}>{f.number(t.massT, 2)}</Num>
      <Num testId={`review-totals-${key}-carbon`}>{f.number(t.avoidedT, 1)}</Num>
    </tr>
  )
}

function StateSection({ s }: { s: ReviewSection }) {
  if (s.lines.length === 0) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-sm border border-rule-soft bg-panel px-4 py-3 text-sm" data-testid={`review-state-${s.status}`}>
        <h2 className="text-base font-semibold">{s.label}</h2>
        <span className="text-mill-text">{EMPTY_SECTION[s.status]}</span>
      </div>
    )
  }
  return (
    <Panel title={s.label} actions={<span className="text-sm text-mill-text">{s.totals.count === 1 ? '1 item' : `${f.number(s.totals.count)} items`}</span>} data-testid={`review-state-${s.status}`}>
      <Table>
        <thead>
          <tr>
            <th className="hidden w-20 xl:table-cell">
              <span className="sr-only">Illustration</span>
            </th>
            <th>Item</th>
            <th>Quantity</th>
            <th className="text-right">Mass (t)</th>
            <th className="text-right">Avoided carbon (tCO2e)</th>
            <th>Band</th>
            <th>Availability and timeline</th>
          </tr>
        </thead>
        <tbody>
          {s.lines.map((l) => (
            <Line key={l.itemId} l={l} />
          ))}
          <tr className="font-medium">
            <td className="hidden xl:table-cell"></td>
            <td colSpan={2}>Total, {s.label.toLowerCase()}</td>
            <Num testId={`review-state-${s.status}-mass`}>{f.number(s.totals.massT, 2)}</Num>
            <Num testId={`review-state-${s.status}-carbon`}>{f.number(s.totals.avoidedT, 1)}</Num>
            <td colSpan={2}></td>
          </tr>
        </tbody>
      </Table>
    </Panel>
  )
}

function Line({ l }: { l: ReviewLine }) {
  return (
    <tr data-testid={`review-row-${l.publicId}`}>
      <td className="hidden !py-2 xl:table-cell">
        <MaterialSwatch spec={l.spec} publicId={l.publicId} className="w-16 rounded-sm" />
      </td>
      <td className="min-w-52 !py-2">
        <div className="font-display text-base leading-tight tracking-wide">{l.title}</div>
        <div className="text-xs text-mill-text">
          {l.publicId}, {l.typologyLabel}. Added {l.addedOn}.
        </div>
        {l.note ? <div className="mt-1 text-xs text-ink-soft">Architect: {l.note}</div> : null}
        {l.decisionNote ? <div className="mt-0.5 text-xs text-ink-soft">Client: {l.decisionNote}</div> : null}
      </td>
      <td className="whitespace-nowrap !py-2" data-testid={`review-${l.publicId}-quantity`}>
        {l.quantity}
      </td>
      <Num className="whitespace-nowrap !py-2" testId={`review-${l.publicId}-mass`}>
        {f.number(l.massT, 2)}
      </Num>
      <Num className="whitespace-nowrap !py-2" testId={`review-${l.publicId}-carbon`}>
        {l.avoidedT === null ? <span className="text-xs text-mill-text">{LABELS.L14}</span> : f.number(l.avoidedT, 1)}
      </Num>
      <td className="whitespace-nowrap !py-2">
        <SustainabilityBand band={l.band} size="sm" testId={`review-${l.publicId}-band`} />
      </td>
      <td className="min-w-52 !py-2" data-testid={`review-${l.publicId}-fit`}>
        <div className="whitespace-nowrap">{l.availability}</div>
        {l.fit && l.fitTone ? (
          <>
            <Tag tone={l.fitTone} className="mt-1 !whitespace-normal">
              {l.fit.text}
            </Tag>
            {l.storage ? <div className="mt-1 text-xs text-mill-text">{l.storage}</div> : null}
          </>
        ) : null}
      </td>
    </tr>
  )
}
