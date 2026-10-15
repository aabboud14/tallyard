// The programme card that leads the overview: RIBA stage bands, milestones, a today line labelled with the planned
// stage and each shortlisted material's availability coloured by its fit, over the whole programme or from today.
// The pills compare the planned stage with the declared one and say when the dates are only suggested.
import { useState } from 'react'
import { Link } from 'react-router'
import { CalendarRange, ChevronDown, Compass, PencilLine } from 'lucide-react'
import type { ProgrammeStatus } from '../../domain/engines/programme'
import { formatDateShort } from '../../domain/dates'
import { useView } from '../../store'
import { programmeView, type ProgrammeRange } from '../../store/selectors/programme'
import { Button, Card, cx, IndicativeMarker, Pill, ProgrammeChart, SegmentedControl, Table, TBody, TD, TH, THead, Tooltip, TR, type Tone } from '../../ui'
import { marketplaceHref } from '../discover/links'

const CHECK_TONE: Record<ProgrammeStatus, Tone> = { on: 'brand', behind: 'warning', ahead: 'info', not_started: 'neutral' }

type Props = { projectId: string; side: 'architect' | 'client' | 'consultant'; onEdit: () => void }

export function ProgrammeCard({ projectId, side, onEdit }: Props) {
  const [range, setRange] = useState<ProgrammeRange>('whole')
  const view = useView(programmeView, projectId, range)
  if (!view) return null
  const architect = side === 'architect'
  return (
    <Card as="section" aria-labelledby="programme-title" data-testid="programme-card" data-range={range}>
      <div className="flex flex-col gap-3 border-b border-line-soft px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <CalendarRange aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted" />
          <div className="min-w-0">
            <h2 id="programme-title" className="m-0 text-md font-semibold text-ink">
              Programme
            </h2>
            <p className="m-0 mt-0.5 text-sm text-muted">RIBA Plan of Work stages, site start and completion, with when each shortlisted material is available.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SegmentedControl
            label="Programme range"
            value={range}
            onValueChange={(v) => setRange(v as ProgrammeRange)}
            items={[
              { value: 'whole', label: 'Whole programme' },
              { value: 'ahead', label: 'From today' },
            ]}
            size="sm"
          />
          {architect ? (
            <Button size="sm" icon={PencilLine} onClick={onEdit} data-testid="edit-programme">
              Edit programme
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-5" data-testid="programme-status">
        <Tooltip content={view.check.text || 'The stage you declare matches the stage the programme plans for today.'}>
          <span tabIndex={0} className="inline-flex items-center rounded-[5px] outline-none max-sm:min-h-11 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            <Pill tone={CHECK_TONE[view.check.status]} dot data-testid="programme-check" data-status={view.check.status}>
              {view.check.label}
            </Pill>
          </span>
        </Tooltip>
        {view.source === 'suggested' ? (
          <Tooltip content="Worked out from your site start and typical stage lengths. Edit to match your plan.">
            <span tabIndex={0} className="inline-flex items-center rounded-[5px] outline-none max-sm:min-h-11 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
              <Pill tone="warning" data-testid="programme-suggested">
                Suggested dates
              </Pill>
            </span>
          </Tooltip>
        ) : null}
        <IndicativeMarker />
        {view.check.text ? <span className="w-full text-sm text-ink-soft sm:w-auto">{view.check.text}</span> : null}
      </div>

      <div className="px-4 pb-2 pt-5 sm:px-5">
        <ProgrammeChart
          axis={{ ticks: view.axis.ticks.map((t, i) => ({ ...t, iso: `tick-${i}` })), startLabel: view.axis.startLabel }}
          today={view.today}
          todayLabel={view.plannedStageText}
          stages={view.stages.map((s) => ({ ...s, open: s.end === null }))}
          milestones={view.milestones}
          materials={view.materials}
          description={view.description}
          emptyText={architect ? 'No materials on the programme yet. Shortlist materials and each one appears here against your programme.' : 'Materials appear here as the architect shortlists them.'}
          emptyAction={
            architect ? (
              <Button asChild size="sm" variant="primary" icon={Compass}>
                <Link to={marketplaceHref(projectId)}>Find materials</Link>
              </Button>
            ) : undefined
          }
        />
        {view.materials.length > 0 ? (
          <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0 text-sm sm:hidden">
            {view.materials.map((m) => (
              <li key={m.itemId}>
                {m.href ? (
                  <Link to={m.href} className="inline-flex min-h-11 items-center gap-2 text-ink-soft hover:text-ink">
                    <span className="font-medium text-ink">{m.title}</span>
                    <span className="text-muted">{m.fitLabel}</span>
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center gap-2 text-ink-soft">
                    <span className="font-medium text-ink">{m.title}</span>
                    <span className="text-muted">{m.fitLabel}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <details className="group border-t border-line-soft" data-testid="stage-dates">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-ink-soft outline-none hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span>Stage dates</span>
          <ChevronDown aria-hidden="true" className="size-4 text-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 sm:px-5">
          <Table caption="Stage dates" density="compact">
            <THead>
              <tr>
                <TH>Stage</TH>
                <TH>Name</TH>
                <TH>From</TH>
                <TH>To</TH>
                <TH align="right">Length</TH>
              </tr>
            </THead>
            <TBody>
              {view.stages.map((s) => (
                <TR key={s.stage} className={cx(s.state === 'current' && 'bg-brand-50/60')}>
                  <TD className="whitespace-nowrap font-medium tabular-nums">
                    {s.stage}
                    {s.state === 'current' ? <span className="ml-2 text-xs font-medium text-brand-700">Today</span> : null}
                  </TD>
                  <TD muted>{s.name}</TD>
                  <TD className="whitespace-nowrap tabular-nums">{formatDateShort(s.start)}</TD>
                  <TD className="whitespace-nowrap tabular-nums">{s.end ? formatDateShort(s.end) : 'Ongoing'}</TD>
                  <TD align="right" className="whitespace-nowrap tabular-nums">
                    {s.weeksText}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </details>
      <p className="m-0 border-t border-line-soft px-4 py-2.5 text-xs text-muted sm:px-5">Stages from the RIBA Plan of Work 2020. Dates are the architect&apos;s plan. Indicative.</p>
    </Card>
  )
}
