// Pieces the sustainability, targets, certification, requirements and statement tabs share: the tab heading, one
// goal as a meter, counts by status as a bar, and the methodology footer. They format what the view models give.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BookOpen } from 'lucide-react'
import { LABELS } from '../../domain/reference/labels'
import type { TrackerSummary } from '../../domain/engines/tracker'
import type { TrackStatus } from '../../domain/sustainabilityTypes'
import type { GoalRow } from '../../store/selectors/sustainability'
import { goalMeter, TRACK_BAR_ORDER } from '../../store/selectors/sustainability-screens'
import { cx, IndicativeMarker, METHODOLOGY_HREF, SegmentedBar, TargetMeter, TRACK_STATUS, type Segment } from '../../ui'

/** The heading of a project tab: the project's own name is the page's h1 in the project header. */
export function TabHeader({ title, subtitle, actions, children, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={cx('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="m-0 flex flex-wrap items-center gap-2.5 text-xl font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="m-0 mt-1 max-w-[72ch] text-base text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">{actions}</div> : null}
      </div>
      {children}
    </header>
  )
}

/** A section inside a tab: a heading with an optional line and actions, then its content. */
export function TabSection({ id, title, description, actions, indicative = false, children, className, testId }: { id?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode; indicative?: boolean; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} data-testid={testId} className={cx('flex min-w-0 scroll-mt-24 flex-col gap-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 id={id ? `${id}-title` : undefined} className="m-0 flex flex-wrap items-center gap-2.5 text-md font-semibold text-ink">
            {title}
            {indicative ? <IndicativeMarker /> : null}
          </h3>
          {description ? <p className="m-0 mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** One goal against its target, with the state in words. */
export function GoalMeterView({ row, size = 'md', label, hideLabel = false, testId }: { row: GoalRow; size?: 'sm' | 'md'; label?: string; /** Keeps the label and figure for screen readers only, where the row already shows them. */ hideLabel?: boolean; testId?: string }) {
  const m = goalMeter(row)
  return (
    <TargetMeter
      label={label ?? row.label}
      value={m.value}
      max={m.max}
      target={m.target}
      valueText={m.valueText}
      targetText={m.targetText}
      state={m.state}
      stateText={m.stateText}
      axis={size === 'md' ? m.axis : undefined}
      size={size}
      testId={testId}
      className={hideLabel ? '[&>div:first-child]:sr-only' : undefined}
    />
  )
}

const COUNT_OF: Record<TrackStatus, keyof TrackerSummary> = { evidence_ready: 'ready', in_progress: 'inProgress', at_risk: 'atRisk', not_started: 'notStarted', not_applicable: 'notApplicable' }

/** Counts by tracking status as one bar with a word legend. */
export function TrackBar({ counts, label, size = 'md', legend = true, withNotApplicable = false, total }: { counts: Record<TrackStatus, number> | TrackerSummary; label: string; size?: 'sm' | 'md'; legend?: boolean; withNotApplicable?: boolean; total?: ReactNode }) {
  const get = (s: TrackStatus): number => ('evidence_ready' in counts ? (counts as Record<TrackStatus, number>)[s] : (counts as TrackerSummary)[COUNT_OF[s]] as number)
  const segments: Segment[] = TRACK_BAR_ORDER.filter((s) => withNotApplicable || s !== 'not_applicable').map((s) => ({ key: s, label: TRACK_STATUS[s].label, count: get(s), tone: TRACK_STATUS[s].tone }))
  return <SegmentedBar segments={segments} label={label} size={size} legend={legend} total={total} />
}

/** The methodology line under carbon and content figures. */
export function MethodologyFooter({ text = LABELS.L11 }: { text?: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 max-w-[80ch]">{text}</p>
      <Link to={METHODOLOGY_HREF} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm font-medium text-ink hover:underline sm:min-h-0">
        <BookOpen aria-hidden="true" className="size-3.5" />
        Methodology
      </Link>
    </div>
  )
}
