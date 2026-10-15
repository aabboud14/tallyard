// The RIBA Plan of Work as eight small cells, stages 0 to 7: done in a light green, the current stage in the
// action green, stages ahead as an outlined cell. Named in words, so the cells are never the only signal.
import { RIBA_STAGES } from '../../domain/reference/policy'
import { cx } from '../cx'
import { ribaStageText } from '../labels'

export type RibaStageStripProps = {
  /** The current stage, 0 to 7, or null before stage 0 starts. */
  stage: number | null
  /** The stage names, 0 to 7. Defaults to the RIBA Plan of Work 2020. */
  labels?: readonly string[]
  /** Prints "Stage 2, Concept Design" beside the cells. */
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
  testId?: string
}

export function RibaStageStrip({ stage, labels = RIBA_STAGES, showLabel = false, size = 'md', className, testId }: RibaStageStripProps) {
  const name = stage === null ? 'RIBA stage not started' : `RIBA stage ${stage} of 7, ${labels[stage] ?? ''}`.replace(/, $/, '')
  return (
    <div data-testid={testId} data-stage={stage ?? undefined} className={cx('flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1', className)}>
      <div role="img" aria-label={name} className="flex shrink-0 items-center gap-[2px]">
        {labels.slice(0, 8).map((_, i) => {
          const state = stage === null || i > stage ? 'ahead' : i === stage ? 'current' : 'done'
          return (
            <span
              key={i}
              data-part="stage"
              data-state={state}
              className={cx(
                'rounded-[2px]',
                size === 'sm' ? 'h-1.5 w-2.5' : 'h-2 w-4',
                state === 'done' && 'bg-brand-200',
                state === 'current' && 'bg-brand-600',
                state === 'ahead' && 'bg-subtle ring-1 ring-inset ring-line',
              )}
            />
          )
        })}
      </div>
      {showLabel ? <span className={cx('min-w-0 truncate text-ink-soft', size === 'sm' ? 'text-xs' : 'text-sm')}>{ribaStageText(stage, labels)}</span> : null}
    </div>
  )
}
