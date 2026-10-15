// The setup checklist on a new project, for its architect: check the programme, wait for the client, choose the
// requirements, add a consultant, shortlist and send. It hides once the programme, the client and the shortlist
// are done. The current step carries the primary action.
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { Circle, CircleAlert, CircleCheck, Hourglass } from 'lucide-react'
import type { ProjectSetup, SetupIntent, SetupStep, SetupStepState } from '../../store/selectors/project'
import { Button, cx, IndicativeMarker, Pill, ProgressBar } from '../../ui'

const STATE_ICON: Record<SetupStepState, { icon: LucideIcon; cls: string; word: string }> = {
  done: { icon: CircleCheck, cls: 'text-brand-600', word: 'Done' },
  current: { icon: Circle, cls: 'text-brand-600', word: 'Next' },
  todo: { icon: Circle, cls: 'text-faint', word: 'To do' },
  waiting: { icon: Hourglass, cls: 'text-info', word: 'Waiting' },
  attention: { icon: CircleAlert, cls: 'text-warning', word: 'Needs you' },
}

type Props = { name: string; setup: ProjectSetup; onIntent: (intent: Exclude<SetupIntent, null>) => void }

export function SetupChecklist({ name, setup, onIntent }: Props) {
  return (
    <section aria-labelledby="setup-title" data-testid="project-setup" className="rounded-xl bg-brand-50/70 p-4 ring-1 ring-inset ring-brand-100 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 id="setup-title" className="m-0 text-lg font-semibold text-ink">
            Set up {name}
          </h2>
          <p className="m-0 mt-0.5 text-sm text-ink-soft">A few steps to get this project working. You can come back to any of them.</p>
        </div>
        <div className="flex w-full flex-col gap-1.5 md:w-56">
          <span className="text-sm font-medium tabular-nums text-ink" data-testid="setup-progress">
            {setup.done} of {setup.total} done
          </span>
          <ProgressBar value={setup.done} max={setup.total} label="Setup progress" valueText={`${setup.done} of ${setup.total} done`} size="sm" />
        </div>
      </div>
      <ol className="m-0 mt-4 grid list-none grid-cols-1 gap-2.5 p-0 md:grid-cols-2 xl:grid-cols-3">
        {setup.steps.map((s) => (
          <StepTile key={s.id} step={s} onIntent={onIntent} />
        ))}
      </ol>
    </section>
  )
}

function StepTile({ step, onIntent }: { step: SetupStep; onIntent: Props['onIntent'] }) {
  const meta = STATE_ICON[step.state]
  const Icon = meta.icon
  const current = step.state === 'current' || step.state === 'attention'
  const done = step.state === 'done'
  return (
    <li
      data-testid={`setup-step-${step.id}`}
      data-state={step.state}
      className={cx(
        'flex min-w-0 flex-col gap-2 rounded-lg border bg-surface p-3.5',
        current ? 'border-brand-600 shadow-[0_0_0_1px_var(--color-brand-600)]' : 'border-line',
        step.state === 'attention' && 'border-warning shadow-[0_0_0_1px_var(--color-warning)]',
        done && 'bg-surface/70',
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon aria-hidden="true" className={cx('mt-0.5 size-4 shrink-0', meta.cls)} />
        <div className="min-w-0 flex-1">
          <p className={cx('m-0 text-sm font-semibold', done ? 'text-ink-soft' : 'text-ink')}>
            <span className="sr-only">{meta.word}: </span>
            {step.title}
          </p>
          <p className="m-0 mt-0.5 text-sm text-muted">
            {step.text}
            {step.id === 'programme' && !done ? <IndicativeMarker className="ml-1.5 align-middle" /> : null}
          </p>
        </div>
        {step.optional ? (
          <Pill size="sm" className="shrink-0">
            Optional
          </Pill>
        ) : null}
      </div>
      {!done && (step.action || step.secondary) ? (
        <div className="mt-auto flex flex-wrap gap-2 pl-6.5">
          {step.action ? <StepAction label={step.action.label} href={step.action.href} intent={step.action.intent} primary={current} onIntent={onIntent} testId={`setup-action-${step.id}`} /> : null}
          {step.secondary ? <StepAction label={step.secondary.label} href={null} intent={step.secondary.intent} primary={false} ghost onIntent={onIntent} testId={`setup-secondary-${step.id}`} /> : null}
        </div>
      ) : null}
    </li>
  )
}

function StepAction({ label, href, intent, primary, ghost = false, onIntent, testId }: { label: string; href: string | null; intent: SetupIntent; primary: boolean; ghost?: boolean; onIntent: Props['onIntent']; testId: string }) {
  const variant = primary ? 'primary' : ghost ? 'ghost' : 'secondary'
  if (href)
    return (
      <Button asChild size="sm" variant={variant} className="max-sm:min-h-11">
        <Link to={href} data-testid={testId}>
          {label}
        </Link>
      </Button>
    )
  return (
    <Button size="sm" variant={variant} className="max-sm:min-h-11" onClick={() => (intent ? onIntent(intent) : undefined)} data-testid={testId}>
      {label}
    </Button>
  )
}
