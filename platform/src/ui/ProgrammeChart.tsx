// The project programme as the visual anchor of the overview: a tick row, a lane of RIBA stage bands, a lane
// of milestones and one row per shortlisted material coloured by its fit, with a today line through all lanes.
// Every position comes in as a fraction from 0 to 1 (the programme selector works them out with axisAt); the
// browser turns fractions into widths. The figure is one image with a full description in words.
import type { ReactNode } from 'react'
import { cx } from './cx'
import { FIT, MARK } from './labels'
import { HATCH_STYLE } from './charts/tones'

export type ProgrammeTick = { iso: string; at: number; label: string | null; major: boolean }

export type ProgrammeStageBandView = {
  stage: number
  /** For example "Stage 2". */
  label: string
  /** For example "Concept Design". */
  name: string
  from: number
  to: number
  state: 'past' | 'current' | 'future'
  /** True for stage 7, which has no end: drawn with an open, dashed edge. */
  open?: boolean
}

export type ProgrammeMilestoneView = { id: string; label: string; dateText: string; at: number }

export type ProgrammeMaterialView = {
  itemId: string
  title: string
  kind: 'now' | 'window'
  from: number
  to: number
  fit: 'in_time' | 'tight' | 'late' | 'now'
  /** For example "Expected January to March 2027". */
  windowText: string
  storage: { from: number; to: number } | null
}

export type ProgrammeChartProps = {
  axis: { ticks: readonly ProgrammeTick[] }
  today: { at: number }
  /** For example "Today: stage 2, Concept Design". */
  todayLabel: string
  stages: readonly ProgrammeStageBandView[]
  milestones: readonly ProgrammeMilestoneView[]
  materials: readonly ProgrammeMaterialView[]
  /** The whole chart in words, read as the figure's accessible name. */
  description: string
  /** Shown in the materials lane when there are none. */
  emptyText?: string
  /** A button beside the empty text, for example "Find materials". */
  emptyAction?: ReactNode
  className?: string
  testId?: string
}

const pos = (at: number): string => `calc(${at} * 100%)`
const span = (from: number, to: number) => ({ left: `calc(${from} * 100%)`, right: `calc(100% - ${to} * 100%)` })

const BAND: Record<ProgrammeStageBandView['state'], string> = {
  past: 'bg-subtle text-muted',
  current: 'bg-brand-50 text-brand-700 shadow-[inset_0_2px_0_var(--color-brand-600)]',
  future: 'bg-surface text-ink-soft ring-1 ring-inset ring-line-soft',
}

function LaneLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex items-center truncate text-sm text-ink-soft', className)}>{children}</div>
}

export function ProgrammeChart({ axis, today, todayLabel, stages, milestones, materials, description, emptyText, emptyAction, className, testId = 'programme-chart' }: ProgrammeChartProps) {
  const labelled = axis.ticks.filter((t) => t.label !== null)
  const milestoneRows = Math.max(1, milestones.length)
  return (
    <div data-testid={testId} className={cx('flex min-w-0 flex-col gap-3', className)}>
      <div role="img" aria-label={description} className="grid min-w-0 gap-x-5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
        {/* Lane names, from 640 px. On phones each lane's name sits above it. */}
        <div aria-hidden="true" className="max-sm:hidden">
          <div className="h-12" />
          <LaneLabel className="h-12">RIBA stages</LaneLabel>
          <LaneLabel className="h-6 pt-3">Milestones</LaneLabel>
          <div style={{ height: `${milestoneRows * 22}px` }} />
          {materials.length > 0 ? <LaneLabel className="h-6 pt-3">Materials</LaneLabel> : null}
          {materials.map((m) => (
            <div key={m.itemId} className="flex h-8 min-w-0 items-center gap-2 text-sm text-ink-soft">
              <span className="size-2 shrink-0 rounded-full" style={{ background: MARK[FIT[m.fit].tone] }} />
              <span className="truncate">{m.title}</span>
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="relative min-w-0 overflow-x-clip">
          {/* Grid lines at the ticks, stronger on major ticks. */}
          <div className="pointer-events-none absolute inset-0">
            {axis.ticks.map((t) => (
              <div key={t.iso} className={cx('absolute bottom-0 top-5 w-px', t.major ? 'bg-line' : 'bg-line-soft', t.label === null && !t.major && 'max-sm:hidden')} style={{ left: pos(t.at) }} />
            ))}
          </div>
          <div className="relative h-5" />
          <div className="relative h-7 text-2xs tabular-nums text-muted">
            {labelled.map((t) => (
              <span key={t.iso} className={cx('absolute top-1 whitespace-nowrap', t.at > 0.85 ? '-translate-x-full pr-1' : 'pl-1')} style={{ left: pos(t.at) }}>
                {t.label}
              </span>
            ))}
          </div>
          <div className="pt-1 text-xs text-muted sm:hidden">RIBA stages</div>
          <div className="relative h-12">
            {stages.map((s) => (
              <div
                key={s.stage}
                data-part="stage-band"
                data-state={s.state}
                className={cx('absolute inset-y-1 flex min-w-0 items-center overflow-hidden rounded-[3px] px-1.5 text-2xs font-medium', BAND[s.state], s.open && 'border-r border-dashed border-line-strong')}
                style={span(s.from, s.to)}
              >
                <span className="whitespace-nowrap tabular-nums">{s.stage}</span>
                {s.to - s.from >= 0.12 ? <span className="ml-1 truncate max-lg:hidden">{s.name}</span> : null}
              </div>
            ))}
          </div>
          <div className="pt-3 text-xs text-muted sm:hidden">Milestones</div>
          <div className="h-6 max-sm:hidden" />
          <div className="relative" style={{ height: `${milestoneRows * 22}px` }}>
            {milestones.map((m, i) => {
              const right = m.at > 0.5
              return (
                <div key={m.id} data-part="milestone" className="absolute h-[22px]" style={{ top: `${i * 22}px`, left: pos(m.at) }}>
                  <span className="absolute left-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink ring-2 ring-surface" />
                  <span className={cx('absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-2xs text-ink-soft max-sm:hidden', right ? 'right-2.5' : 'left-2.5')}>
                    <span className="font-medium text-ink">{m.label}</span> {m.dateText}
                  </span>
                </div>
              )
            })}
          </div>
          {materials.length > 0 ? (
            <>
              <div className="pt-3 text-xs text-muted sm:hidden">Materials</div>
              <div className="h-6 max-sm:hidden" />
            </>
          ) : null}
          {materials.map((m) => {
            const fill = MARK[FIT[m.fit].tone]
            return (
              <div key={m.itemId} data-part="material" data-fit={m.fit}>
                <div className="truncate pt-1 text-xs text-ink-soft sm:hidden">{m.title}</div>
                <div className="relative h-8">
                  {m.storage ? <div className="absolute top-1/2 border-t-[1.5px] border-dashed border-mark-neutral" style={span(m.storage.from, m.storage.to)} /> : null}
                  {m.kind === 'window' ? (
                    <div data-part="window" className="absolute top-1/2 h-3 min-w-1.5 -translate-y-1/2 overflow-hidden rounded-[3px]" style={{ ...span(m.from, m.to), background: fill }}>
                      {m.fit === 'late' ? <span className="absolute inset-0" style={HATCH_STYLE} /> : null}
                    </div>
                  ) : (
                    <div data-part="window" className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface" style={{ left: pos(m.from), background: fill }} />
                  )}
                </div>
              </div>
            )
          })}
          {/* Today runs through every lane, labelled at the top. */}
          <div data-part="today" className="pointer-events-none absolute bottom-0 top-4 w-0.5 -translate-x-1/2 bg-brand-600" style={{ left: pos(today.at) }} />
          <div className={cx('pointer-events-none absolute top-0 whitespace-nowrap rounded-[3px] bg-brand-600 px-1.5 py-px text-2xs font-medium text-white', today.at > 0.5 ? '-translate-x-full' : null)} style={{ left: pos(today.at) }}>
            {todayLabel}
          </div>
        </div>
      </div>
      {milestones.length > 0 ? (
        <ul aria-hidden="true" className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-ink-soft sm:hidden">
          {milestones.map((m) => (
            <li key={m.id} className="inline-flex items-center gap-2">
              <span className="size-2 rotate-45 bg-ink" />
              <span className="font-medium text-ink">{m.label}</span> {m.dateText}
            </li>
          ))}
        </ul>
      ) : null}
      {materials.length === 0 && emptyText ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-muted sm:ml-[200px]">
          <span className="min-w-0 flex-1">{emptyText}</span>
          {emptyAction}
        </div>
      ) : null}
      <ul aria-hidden="true" className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-sm text-ink-soft">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-brand-600" />
          Today
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2 rotate-45 bg-ink" />
          Milestone
        </li>
        {(['in_time', 'tight', 'late', 'now'] as const).map((f) => (
          <li key={f} className="inline-flex items-center gap-1.5">
            <span className="relative size-2.5 overflow-hidden rounded-[2px]" style={{ background: MARK[FIT[f].tone] }}>
              {f === 'late' ? <span className="absolute inset-0" style={HATCH_STYLE} /> : null}
            </span>
            {FIT[f].label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-[1.5px] border-dashed border-mark-neutral" />
          In storage
        </li>
      </ul>
    </div>
  )
}
