// The setup checklist on a new project, for its architect: check the programme, wait for the client, choose the
// requirements, add a consultant, shortlist and send. It hides once the programme, the client and the shortlist
// are done. It sits straight under the programme card, which carries the programme step's own buttons, and stays
// one strip: the progress, the next step the project needs with its buttons, and the waiting client in one sentence.
// The six steps are listed for screen readers only until 'Show all steps' opens each as a tile, remembered in this
// browser.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, Circle, CircleAlert, CircleCheck, Hourglass } from 'lucide-react'
import type { ProjectSetup, SetupIntent, SetupStep, SetupStepState } from '../../store/selectors/project'
import { Button, cx, IndicativeMarker, Pill, ProgressBar, usePersistentToggle } from '../../ui'

const STATE_ICON: Record<SetupStepState, { icon: LucideIcon; cls: string; word: string }> = {
  done: { icon: CircleCheck, cls: 'text-brand-600', word: 'Done' },
  current: { icon: Circle, cls: 'text-brand-600', word: 'Next' },
  todo: { icon: Circle, cls: 'text-faint', word: 'To do' },
  waiting: { icon: Hourglass, cls: 'text-info', word: 'Waiting' },
  attention: { icon: CircleAlert, cls: 'text-warning', word: 'Needs you' },
}

type Props = {
  name: string
  setup: ProjectSetup
  onIntent: (intent: Exclude<SetupIntent, null>) => void
  /** A line under the steps, for example the client link while the client has not answered. */
  footer?: ReactNode
}

export function SetupChecklist({ name, setup, onIntent, footer }: Props) {
  const [open, , toggle] = usePersistentToggle('project-setup-steps', false)
  const focus = open ? null : (setup.steps.find((s) => s.id === setup.focusId) ?? null)
  return (
    <section aria-labelledby="setup-title" data-testid="project-setup" data-expanded={open} className="rounded-xl bg-brand-50/70 p-4 ring-1 ring-inset ring-brand-100 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h2 id="setup-title" className="m-0 min-w-0 text-md font-semibold text-ink">
          Set up {name}
        </h2>
        <div className="flex min-w-0 flex-1 basis-48 items-center gap-3 sm:max-w-72">
          <ProgressBar value={setup.done} max={setup.total} label="Setup progress" valueText={`${setup.done} of ${setup.total} done`} size="sm" className="flex-1" />
          <span className="shrink-0 text-sm font-medium tabular-nums text-ink" data-testid="setup-progress">
            {setup.done} of {setup.total} done
          </span>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="setup-steps"
          onClick={toggle}
          data-testid="setup-toggle"
          className="-my-1.5 ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink-soft outline-none hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          {open ? 'Show fewer' : 'Show all steps'}
          <ChevronDown aria-hidden="true" className={cx('size-4 transition-transform duration-150', open && 'rotate-180')} />
        </button>
      </div>
      {open ? <p className="m-0 mt-1 text-sm text-ink-soft">A few steps to get this project working. You can come back to any of them.</p> : null}

      <ol id="setup-steps" aria-label="Setup steps" className={cx('m-0 list-none p-0', open ? 'mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3' : 'sr-only')}>
        {setup.steps.map((s) => (open ? <StepTile key={s.id} step={s} onIntent={onIntent} /> : <StepChip key={s.id} step={s} focused={s.id === setup.focusId} />))}
      </ol>

      {focus ? <FocusRow step={focus} onIntent={onIntent} /> : null}
      {footer}
    </section>
  )
}

/** One step while the list is folded: its state and short name, for screen readers. */
function StepChip({ step, focused }: { step: SetupStep; focused: boolean }) {
  const meta = STATE_ICON[step.state]
  const Icon = meta.icon
  const done = step.state === 'done'
  return (
    <li
      data-testid={`setup-step-${step.id}`}
      data-state={step.state}
      title={step.title}
      className={cx(
        'flex min-w-0 flex-auto items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-sm ring-1 ring-inset',
        focused ? (step.state === 'attention' ? 'ring-warning' : 'ring-brand-600') : 'ring-line',
        done ? 'text-ink-soft' : 'font-medium text-ink',
      )}
    >
      <Icon aria-hidden="true" className={cx('size-3.5 shrink-0', meta.cls)} />
      <span className="sr-only">{meta.word}: </span>
      <span className="truncate">{step.short}</span>
    </li>
  )
}

/** The step that needs the architect now, with its buttons. */
function FocusRow({ step, onIntent }: { step: SetupStep; onIntent: Props['onIntent'] }) {
  const meta = STATE_ICON[step.state]
  const Icon = meta.icon
  const attention = step.state === 'attention'
  const next = step.state === 'current' || step.state === 'todo'
  return (
    <div data-testid="setup-current" data-step={step.id} className={cx('mt-3 flex flex-col gap-2 rounded-lg border bg-surface px-3.5 py-2.5 md:flex-row md:items-center md:justify-between md:gap-3', attention ? 'border-warning' : step.state === 'waiting' ? 'border-line' : 'border-brand-600')}>
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon aria-hidden="true" className={cx('mt-0.5 size-4 shrink-0', meta.cls)} />
        <div className="min-w-0">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-ink">
            <span>
              {/* The step the checklist leads with is the next one, whether or not it comes first in the list. */}
              {next ? <span className="font-medium text-brand-700">Next: </span> : <span className="sr-only">{meta.word}: </span>}
              {step.title}
            </span>
            {step.optional ? <Pill size="sm">Optional</Pill> : null}
          </p>
          <p className="m-0 mt-0.5 text-sm text-muted max-md:hidden">
            {step.text}
            {step.id === 'programme' ? <IndicativeMarker className="ml-1.5 align-middle" /> : null}
          </p>
        </div>
      </div>
      <StepButtons step={step} primary={step.state !== 'waiting'} onIntent={onIntent} className="pl-6.5 md:shrink-0 md:pl-0" />
    </div>
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
      {!done ? <StepButtons step={step} primary={current} onIntent={onIntent} className="mt-auto pl-6.5" /> : null}
    </li>
  )
}

function StepButtons({ step, primary, onIntent, className }: { step: SetupStep; primary: boolean; onIntent: Props['onIntent']; className?: string }) {
  if (!step.action && !step.secondary) return null
  return (
    <div className={cx('flex flex-wrap gap-2', className)}>
      {step.action ? <StepAction label={step.action.label} href={step.action.href} intent={step.action.intent} primary={primary} onIntent={onIntent} testId={`setup-action-${step.id}`} /> : null}
      {step.secondary ? <StepAction label={step.secondary.label} href={null} intent={step.secondary.intent} primary={false} ghost onIntent={onIntent} testId={`setup-secondary-${step.id}`} /> : null}
    </div>
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
