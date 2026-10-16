// A first-run card for a dashboard with nothing on it yet: a drawing, what the space is for, and the next steps in
// order, the first one marked. Used where a new account would otherwise see an empty page.
import type { ReactNode } from 'react'
import { Card, cx, SpotIllustration } from '../../ui'
import type { SpotKind } from '../../ui/illustration/spotKinds'

export type FirstRunStep = { title: string; text: string }

export function FirstRunCard({ title, text, steps, spot = 'project', actions, testId, stepsLabel = 'What happens next', titleAs: Title = 'h2' }: { title: string; text: string; steps: readonly FirstRunStep[]; spot?: SpotKind; actions?: ReactNode; testId?: string; stepsLabel?: string; /** h3 when the card sits under a section heading. */ titleAs?: 'h2' | 'h3' }) {
  return (
    <Card className="overflow-hidden" data-testid={testId}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
          <SpotIllustration kind={spot} className="h-[88px] w-[120px]" />
          <div>
            <Title className="m-0 text-xl font-semibold text-ink">{title}</Title>
            <p className="m-0 mt-1.5 max-w-md text-base text-muted">{text}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <ol className="m-0 flex list-none flex-col border-t border-line-soft bg-page p-0 lg:border-l lg:border-t-0" aria-label={stepsLabel}>
          {steps.map((s, i) => (
            <li key={s.title} className={cx('flex items-start gap-4 px-6 py-5 sm:px-8', i > 0 && 'border-t border-line-soft')}>
              <span className={cx('inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums', i === 0 ? 'bg-brand-600 text-white' : 'bg-surface text-ink-soft ring-1 ring-inset ring-line')}>{i + 1}</span>
              <div>
                <p className="m-0 font-medium text-ink">{s.title}</p>
                <p className="m-0 mt-0.5 text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  )
}
