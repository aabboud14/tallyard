// The programme across several projects on one time axis: one row per project with RIBA stages 0 to 6 as
// segments (done, current, ahead), markers for site start, practical completion and materials needed from, and
// one today line through every row. Every position comes in as a fraction from 0 to 1 (portfolioTimeline in the
// domain works them out); the browser turns fractions into widths. The markers are also listed as text.
import { Link, useInRouterContext } from 'react-router'
import { cx } from '../cx'
import { Legend } from './Legend'
import { MARK } from '../labels'

export type PortfolioSegment = { stage: number; from: number; to: number; state: 'done' | 'current' | 'ahead' }

export type PortfolioRowView = {
  id: string
  name: string
  href?: string | null
  /** For example "Stage 4, Technical Design". */
  stageText?: string
  segments: readonly PortfolioSegment[]
  siteStart: number | null
  completion: number | null
  materialsFrom: number | null
  hasProgramme: boolean
  siteStartText?: string | null
  completionText?: string | null
  materialsFromText?: string | null
}

export type PortfolioTimelineProps = {
  ticks: readonly { iso: string; at: number; label: string | null }[]
  /** Today as a fraction of the axis. */
  today: number
  /** For example "Today, 7 Oct 2026". */
  todayText: string
  rows: readonly PortfolioRowView[]
  /** Shown in a row without a programme. */
  emptyText?: string
  className?: string
  testId?: string
}

const pos = (at: number): string => `calc(${at} * 100%)`

const SEGMENT: Record<PortfolioSegment['state'], string> = {
  done: 'bg-brand-200',
  current: 'bg-brand-600 text-white',
  ahead: 'bg-subtle ring-1 ring-inset ring-line',
}

function Markers({ row }: { row: PortfolioRowView }) {
  return (
    <>
      {row.materialsFrom !== null ? <span data-part="materials" className="absolute top-0.5 bottom-0.5 w-0.5 -translate-x-1/2 rounded-full" style={{ left: pos(row.materialsFrom), background: MARK.warning }} /> : null}
      {row.siteStart !== null ? <span data-part="site-start" className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-2 ring-surface" style={{ left: pos(row.siteStart), background: MARK.info }} /> : null}
      {row.completion !== null ? (
        <span data-part="completion" className="absolute top-0 bottom-0 -translate-x-1/2" style={{ left: pos(row.completion) }}>
          <span className="absolute inset-y-0 left-0 w-0.5 bg-ink" />
          <span className="absolute left-0.5 top-0 h-2 w-2 bg-ink [clip-path:polygon(0_0,100%_50%,0_100%)]" />
        </span>
      ) : null}
    </>
  )
}

export function PortfolioTimeline({ ticks, today, todayText, rows, emptyText = 'Programme not set', className, testId = 'portfolio-timeline' }: PortfolioTimelineProps) {
  const inRouter = useInRouterContext()
  return (
    <div data-testid={testId} className={cx('flex min-w-0 flex-col gap-4', className)}>
      <Legend
        label="Key"
        items={[
          { key: 'stages', label: 'Design stages', colour: 'var(--color-brand-200)' },
          { key: 'site', label: 'Site start', colour: MARK.info },
          { key: 'pc', label: 'Practical completion', colour: 'var(--color-ink)' },
          { key: 'materials', label: 'Materials needed from', colour: MARK.warning },
          { key: 'today', label: todayText, colour: 'var(--color-brand-600)' },
        ]}
      />
      <div className="grid min-w-0 gap-x-5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
        <div className="max-sm:hidden">
          <div className="h-6" />
          {rows.map((r) => (
            <div key={r.id} className="flex h-12 min-w-0 flex-col justify-center">
              <RowName row={r} inRouter={inRouter} />
            </div>
          ))}
        </div>
        <div className="relative min-w-0 overflow-x-clip">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {ticks.map((t) => (
              <div key={t.iso} className={cx('absolute bottom-0 top-5 w-px bg-line-soft', t.label === null && 'max-sm:hidden')} style={{ left: pos(t.at) }} />
            ))}
          </div>
          <div aria-hidden="true" className="relative h-6 text-2xs tabular-nums text-muted">
            {ticks
              .filter((t) => t.label !== null)
              .map((t) => (
                <span key={t.iso} className={cx('absolute top-0 whitespace-nowrap', t.at > 0.85 ? '-translate-x-full pr-1' : 'pl-1')} style={{ left: pos(t.at) }}>
                  {t.label}
                </span>
              ))}
          </div>
          {rows.map((r) => (
            <div key={r.id} data-testid={`portfolio-row-${r.id}`} className="relative">
              <div className="relative z-[1] bg-surface pt-2 sm:hidden">
                <RowName row={r} inRouter={inRouter} />
              </div>
              <div className="relative h-12">
                {r.hasProgramme ? (
                  <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2">
                    {r.segments.map((s) => (
                      <span
                        key={s.stage}
                        data-part="segment"
                        data-state={s.state}
                        className={cx('absolute inset-y-0 flex items-center justify-center overflow-hidden whitespace-nowrap rounded-[2px] text-2xs font-semibold', SEGMENT[s.state])}
                        style={{ left: `calc(${s.from} * 100% + 1px)`, right: `calc(100% - ${s.to} * 100% + 1px)` }}
                      >
                        {s.state === 'current' ? s.stage : null}
                      </span>
                    ))}
                    <Markers row={r} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center gap-3">
                    <span className="text-sm text-muted">{emptyText}</span>
                    <div aria-hidden="true" className="relative h-4 flex-1">
                      <Markers row={r} />
                    </div>
                  </div>
                )}
              </div>
              <ul className="sr-only">
                {r.hasProgramme ? null : <li>{emptyText}</li>}
                {r.siteStartText ? <li>Site start {r.siteStartText}</li> : null}
                {r.completionText ? <li>Practical completion {r.completionText}</li> : null}
                {r.materialsFromText ? <li>Materials needed from {r.materialsFromText}</li> : null}
              </ul>
            </div>
          ))}
          <div aria-hidden="true" data-part="today" className="pointer-events-none absolute bottom-0 top-5 w-0.5 -translate-x-1/2 bg-brand-600" style={{ left: pos(today) }} />
        </div>
      </div>
    </div>
  )
}

function RowName({ row, inRouter }: { row: PortfolioRowView; inRouter: boolean }) {
  const cls = 'block truncate rounded-sm text-sm font-medium text-ink hover:underline max-sm:py-2.5'
  return (
    <>
      {row.href ? (
        inRouter ? (
          <Link to={row.href} className={cls}>
            {row.name}
          </Link>
        ) : (
          <a href={row.href} className={cls}>
            {row.name}
          </a>
        )
      ) : (
        <span className="block truncate text-sm font-medium text-ink">{row.name}</span>
      )}
      {row.stageText ? <span className="block truncate text-xs text-muted">{row.stageText}</span> : null}
    </>
  )
}
