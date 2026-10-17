// The project programme as the visual anchor of the overview: a tick row, a lane of RIBA stage bands, a lane
// of milestones and one row per shortlisted material coloured by its fit, with a today line through all lanes.
// Every position comes in as a fraction from 0 to 1 (the programme selector works them out with axisAt); the
// browser turns fractions into widths. The plot is a labelled group with a full description in words, so its stage
// band buttons stay reachable by keyboard and screen readers (an image would hide them). From 640 px each
// material's name in the label column is a link to the material, with its availability window under it. Axis
// labels come in tiers (programmeAxis) and a container query on the plot shows each tier from the width it was
// fitted to, so no two labels ever collide. A stage band shows its name whenever the band is wide enough; today's
// stage always shows its name, running past a narrow band's edge into the chart. Each band names itself and its
// dates on hover and keyboard focus, and in a small panel on a tap or click. A key under the lane names every
// stage drawn, so a band too narrow for its name can still be read.
import type { ReactNode } from 'react'
import { Link, useInRouterContext } from 'react-router'
import { cx } from './cx'
import { FIT, MARK } from './labels'
import { HATCH_STYLE } from './charts/tones'
import { Tooltip } from './Tooltip'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { TICK_TIER_CLASS } from './programmeTiers'

/** tier: from which plot width the label shows; 0 or absent shows at every width. */
export type ProgrammeTick = { iso: string; at: number; label: string | null; major: boolean; tier?: number }

export type ProgrammeStageBandView = {
  stage: number
  /** For example "Stage 2". */
  label: string
  /** For example "Concept Design". */
  name: string
  from: number
  to: number
  state: 'past' | 'current' | 'future'
  /** True when the stage runs on past the right edge (stage 7, and stage 6 on the whole programme): drawn with an open, dashed edge. */
  open?: boolean
  /** "Stage 2, Concept Design, 1 Jun 2026 to 1 Nov 2026": shown on hover and focus, and as the band's name. */
  hoverText?: string
  /** "1 Jun 2026 to 1 Nov 2026": under the name in the panel a tap or click opens. */
  datesText?: string
  /** False when the stage lies outside the axis or is too narrow to draw: the band is not drawn. */
  visible?: boolean
  /** Where the name sits: 'end' for a band in the right half, so a name wider than the band runs into the chart. */
  nameAlign?: 'start' | 'end'
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
  /** For example "Expected Jan to Mar 2027": shown under the name in the label column when given. */
  windowShort?: string
  /** For example "Tight". */
  fitLabel?: string
  storage: { from: number; to: number } | null
  /** The material's page. The name in the label column links to it. */
  href?: string | null
}

export type ProgrammeChartProps = {
  /** startLabel names the month at the left edge when the first tick has no label, for example "Sep 2025". */
  axis: { ticks: readonly ProgrammeTick[]; startLabel?: string | null }
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
  current: 'bg-brand-600 text-white',
  future: 'bg-surface text-ink-soft ring-1 ring-inset ring-line-soft',
}

/** The band's own fill behind its number and name. */
const BAND_TEXT: Record<ProgrammeStageBandView['state'], string> = { past: 'bg-subtle', current: 'bg-brand-600', future: 'bg-surface' }

/** The name shows once the band is wide enough for a few letters of it. Today's stage always shows its name. */
const BAND_NAME: Record<Exclude<ProgrammeStageBandView['state'], 'current'>, string> = { past: 'hidden @min-[60px]:block', future: 'hidden @min-[60px]:block' }

/** A visible focus ring, raised above the neighbouring bands so none of it is hidden. */
const BAND_FOCUS = 'outline-none focus-visible:z-[4] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'

function StageBandBody({ s }: { s: ProgrammeStageBandView }) {
  if (s.state === 'current') {
    // Today's stage names itself in full. On a band narrower than its name, the name runs past the band's edge into
    // the chart, over its neighbours: from its start, or from its end on a band in the right half.
    return (
      // On a band narrower than a long name, a surface edge sets the name apart from the bands it runs over.
      <span data-part="stage-text" className="relative z-[3] flex shrink-0 items-center whitespace-nowrap rounded-[3px] bg-brand-600 px-1 py-0.5 @max-[180px]:shadow-[0_0_0_2px_var(--color-surface)]">
        <span data-part="stage-number" className="tabular-nums">
          {s.stage}
        </span>
        <span data-part="stage-name" className="ml-1 block" data-always="true">
          {s.name}
        </span>
      </span>
    )
  }
  return (
    // Above the today line, on the band's own colour, so the line never runs through the words.
    <span data-part="stage-text" className={cx('relative z-[2] flex min-w-0 items-center rounded-[2px] px-0.5', BAND_TEXT[s.state])}>
      {/* A band too narrow for its number shows none rather than a clipped one; the key and its hover text name it. */}
      <span data-part="stage-number" className="hidden whitespace-nowrap tabular-nums @min-[10px]:block">
        {s.stage}
      </span>
      <span data-part="stage-name" className={cx('ml-1 min-w-0 truncate', BAND_NAME[s.state])}>
        {s.name}
      </span>
    </span>
  )
}

function StageBand({ s }: { s: ProgrammeStageBandView }) {
  const current = s.state === 'current'
  const hidden = s.visible === false
  const className = cx(
    '@container absolute inset-y-0.5 flex min-w-0 items-center rounded-[3px] px-1 text-left text-2xs font-medium',
    BAND[s.state],
    current ? 'min-w-2.5' : 'overflow-hidden',
    current && s.nameAlign === 'end' && 'justify-end @min-[180px]:justify-start',
    s.open && 'rounded-r-none border-r-2 border-dashed border-line-strong',
    hidden && 'hidden',
  )
  if (hidden || !s.hoverText) {
    return (
      <div data-part="stage-band" data-state={s.state} data-visible={hidden ? 'false' : undefined} className={className} style={span(s.from, s.to)}>
        <StageBandBody s={s} />
      </div>
    )
  }
  // A button, so the band takes keyboard focus: its tooltip names it on hover and focus, and a tap or click opens a
  // small panel with the same words, as tooltips do not open on touch.
  return (
    <Popover>
      <Tooltip content={s.hoverText}>
        <PopoverTrigger asChild>
          <button type="button" data-part="stage-band" data-state={s.state} aria-label={s.hoverText} className={cx(className, BAND_FOCUS, 'cursor-pointer')} style={span(s.from, s.to)}>
            <StageBandBody s={s} />
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent side="bottom" align="center" className="w-auto max-w-64 p-2.5 text-sm" data-testid="stage-panel">
        <p className="m-0 font-medium text-ink">
          {s.label}, {s.name}
        </p>
        <p className="m-0 tabular-nums text-muted">{s.datesText ?? s.hoverText}</p>
      </PopoverContent>
    </Popover>
  )
}

/** Every stage drawn, by number and name, so a band too narrow for its name can still be read. */
function StageKey({ stages, className }: { stages: readonly ProgrammeStageBandView[]; className?: string }) {
  const shown = stages.filter((s) => s.visible !== false)
  if (shown.length === 0) return null
  return (
    <ol aria-hidden="true" data-part="stage-key" className={cx('m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-ink-soft', className)}>
      {shown.map((s) => (
        <li key={s.stage} className="relative z-[2] inline-flex items-center gap-1.5 rounded-[2px] bg-surface pr-1">
          <span className={cx('inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] px-1 text-2xs font-medium tabular-nums', BAND[s.state])}>{s.stage}</span>
          <span className={s.state === 'current' ? 'font-medium text-ink' : undefined}>{s.name}</span>
        </li>
      ))}
    </ol>
  )
}

function LaneLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={cx('flex items-center truncate text-sm text-ink-soft', className)}>
      {children}
    </div>
  )
}

/** "UB 457x191x67, Expected January to March 2027, tight": the hover text on a bar and its label. */
function materialTitle(m: ProgrammeMaterialView): string {
  return [m.title, m.windowText, m.fitLabel ? m.fitLabel.toLowerCase() : null].filter((x) => x).join(', ')
}

/** A material's name and window in the label column: a link when it has a page. */
function MaterialLabel({ m }: { m: ProgrammeMaterialView }) {
  const inRouter = useInRouterContext()
  const body = (
    <>
      <span className="size-2 shrink-0 rounded-full" style={{ background: MARK[FIT[m.fit].tone] }} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm text-ink">{m.title}</span>
        <span className="truncate text-2xs text-muted">{m.windowShort ?? m.windowText}</span>
      </span>
    </>
  )
  const cls = 'flex h-11 min-w-0 items-center gap-2 rounded-sm'
  if (!m.href) return <div className={cls}>{body}</div>
  const linkCls = cx(cls, 'outline-none hover:[&_span>span:first-child]:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600')
  return inRouter ? (
    <Link to={m.href} className={linkCls} title={materialTitle(m)} data-part="material-link">
      {body}
    </Link>
  ) : (
    <a href={m.href} className={linkCls} title={materialTitle(m)} data-part="material-link">
      {body}
    </a>
  )
}

export function ProgrammeChart({ axis, today, todayLabel, stages, milestones, materials, description, emptyText, emptyAction, className, testId = 'programme-chart' }: ProgrammeChartProps) {
  const labelled = axis.ticks.filter((t) => t.label !== null)
  const milestoneRows = Math.max(1, milestones.length)
  return (
    <div data-testid={testId} className={cx('flex min-w-0 flex-col gap-3', className)}>
      {axis.startLabel ? (
        <p aria-hidden="true" className="m-0 text-2xs tabular-nums text-muted sm:hidden">
          From {axis.startLabel}
        </p>
      ) : null}
      <div className="grid min-w-0 gap-x-5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
        {/* Lane names, from 640 px. On phones each lane's name sits above it. */}
        <div className="max-sm:hidden">
          <div aria-hidden="true" className="flex h-12 items-start justify-end pt-6 text-2xs tabular-nums text-muted" data-part="start-label">
            {axis.startLabel}
          </div>
          <LaneLabel className="h-12">RIBA stages</LaneLabel>
          <LaneLabel className="h-6 pt-3">Milestones</LaneLabel>
          <div style={{ height: `${milestoneRows * 22}px` }} />
          {materials.length > 0 ? <LaneLabel className="h-6 pt-3">Materials</LaneLabel> : null}
          {materials.length > 0 ? (
            <ul aria-label="Materials on the programme" className="m-0 list-none p-0">
              {materials.map((m) => (
                <li key={m.itemId}>
                  <MaterialLabel m={m} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div role="group" aria-label={description} data-part="plot" className="@container relative min-w-0 overflow-x-clip">
          {/* Grid lines at the ticks, stronger on major ticks. */}
          <div className="pointer-events-none absolute inset-0">
            {axis.ticks.map((t) => (
              <div key={t.iso} className={cx('absolute bottom-0 top-5 w-px', t.major ? 'bg-line' : 'bg-line-soft', t.label === null && !t.major && 'max-sm:hidden')} style={{ left: pos(t.at) }} />
            ))}
          </div>
          <div className="relative h-5" />
          <div className="relative h-7 text-2xs tabular-nums text-muted">
            {labelled.map((t) => (
              <span key={t.iso} data-part="tick-label" data-tier={t.tier ?? 0} className={cx('absolute top-1 whitespace-nowrap pl-1', TICK_TIER_CLASS[t.tier ?? 0])} style={{ left: pos(t.at) }}>
                {/* On the surface and above the today line, so the line never strikes through a label. */}
                <span className="relative z-[2] rounded-[2px] bg-surface">{t.label}</span>
              </span>
            ))}
          </div>
          <div className="relative z-[2] w-fit bg-surface pr-1 pt-1 text-xs text-muted sm:hidden">RIBA stages</div>
          <div className="relative h-12">
            {stages.map((s) => (
              <StageBand key={s.stage} s={s} />
            ))}
          </div>
          {/* On phones the key sits straight under the lane; from 640 px it sits under the chart. */}
          <StageKey stages={stages} className="pt-2 sm:hidden" />
          <div className="relative z-[2] w-fit bg-surface pr-1 pt-3 text-xs text-muted sm:hidden">Milestones</div>
          <div className="h-6 max-sm:hidden" />
          <div className="relative" style={{ height: `${milestoneRows * 22}px` }}>
            {milestones.map((m, i) => {
              const right = m.at > 0.5
              return (
                <div key={m.id} data-part="milestone" className="absolute h-[22px]" style={{ top: `${i * 22}px`, left: pos(m.at) }}>
                  <span className="absolute left-0 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink ring-2 ring-surface" />
                  <span className={cx('absolute top-1/2 z-[2] -translate-y-1/2 whitespace-nowrap rounded-[2px] bg-surface px-0.5 text-2xs text-ink-soft max-sm:hidden', right ? 'right-2' : 'left-2')}>
                    <span className="font-medium text-ink">{m.label}</span> {m.dateText}
                  </span>
                </div>
              )
            })}
          </div>
          {materials.length > 0 ? (
            <>
              <div className="relative z-[2] w-fit bg-surface pr-1 pt-3 text-xs text-muted sm:hidden">Materials</div>
              <div className="h-6 max-sm:hidden" />
            </>
          ) : null}
          {materials.map((m) => {
            const fill = MARK[FIT[m.fit].tone]
            return (
              <div key={m.itemId} data-part="material" data-fit={m.fit}>
                <div className="relative z-[2] w-fit max-w-full truncate bg-surface pr-1 pt-1 text-xs text-ink-soft sm:hidden">{m.title}</div>
                <div className="relative h-8 sm:h-11" title={materialTitle(m)}>
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
          {/* A thin surface edge keeps the line visible where it crosses today's stage, which is the same colour. */}
          <div data-part="today" className="pointer-events-none absolute bottom-0 top-4 z-[1] w-0.5 -translate-x-1/2 bg-brand-600 shadow-[0_0_0_1px_var(--color-surface)]" style={{ left: pos(today.at) }} />
          <div className={cx('pointer-events-none absolute top-0 z-[3] whitespace-nowrap rounded-[3px] bg-brand-600 px-1.5 py-px text-2xs font-medium text-white', today.at > 0.5 ? '-translate-x-full' : null)} style={{ left: pos(today.at) }}>
            {todayLabel}
          </div>
        </div>
      </div>
      <StageKey stages={stages} className="max-sm:hidden sm:ml-[200px]" />
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
          <span className="min-w-48 flex-1">{emptyText}</span>
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
