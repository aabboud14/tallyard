import type { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from 'react'
import { LABELS, EMPTY_STATE } from '../../domain/reference/labels'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'md' | 'lg' }

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-sm border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const sizes = size === 'lg' ? 'min-h-[44px] px-4 text-base' : 'min-h-9 px-3 text-sm'
  const look =
    variant === 'primary'
      ? 'border-steel bg-steel text-white hover:bg-steel-deep'
      : variant === 'danger'
        ? 'border-oxide text-oxide bg-panel hover:bg-oxide-tint'
        : variant === 'quiet'
          ? 'border-transparent bg-transparent text-steel hover:bg-steel-tint'
          : 'border-rule bg-panel text-ink hover:bg-steel-tint'
  return <button type="button" className={cx(base, sizes, look, className)} {...rest} />
}

export function Panel({ title, children, className, actions, ...rest }: HTMLAttributes<HTMLElement> & { title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cx('rounded-sm border border-rule bg-panel', className)} {...rest}>
      {title !== undefined ? (
        <header className="flex items-center justify-between gap-3 border-b border-rule-soft px-4 py-2.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

export function Tag({ children, tone = 'survey', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode; tone?: 'survey' | 'teal' | 'oxide' | 'steel' | 'grey' }) {
  const look =
    tone === 'teal' ? 'bg-teal-tint text-ink' : tone === 'oxide' ? 'bg-oxide-tint text-ink' : tone === 'steel' ? 'bg-steel-tint text-ink' : tone === 'grey' ? 'bg-rule-soft text-ink' : 'bg-survey text-ink'
  return (
    <span className={cx('inline-block whitespace-nowrap rounded-sm px-1.5 py-0.5 font-display text-sm leading-tight tracking-wide', look, className)} {...rest}>
      {children}
    </span>
  )
}

export function Figure({ label, value, sub, testId, size = 'md' }: { label: ReactNode; value: ReactNode; sub?: ReactNode; testId?: string; size?: 'md' | 'lg' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-sm text-mill-text">{label}</div>
      <div className={cx('font-display leading-none', size === 'lg' ? 'text-3xl' : 'text-2xl')} data-testid={testId}>
        {value}
      </div>
      {sub ? <div className="text-sm text-ink-soft">{sub}</div> : null}
    </div>
  )
}

/** The mark on private fields in owner views (05 section 1): oxide rule, lock, the word "Private". */
export function Private({ children, className, inline = false }: { children: ReactNode; className?: string; inline?: boolean }) {
  if (inline) {
    return (
      <span className={cx('inline-flex items-center gap-1 border-l-2 border-oxide pl-1.5', className)}>
        {children}
        <Lock />
        <span className="text-xs font-medium text-oxide" data-testid="label-L28">
          {LABELS.L28}
        </span>
      </span>
    )
  }
  return (
    <div className={cx('border-l-2 border-oxide pl-3', className)}>
      <div className="mb-1 flex items-center gap-1 text-xs font-medium text-oxide" data-testid="label-L28">
        <Lock />
        {LABELS.L28}
      </div>
      {children}
    </div>
  )
}

export function Lock() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true" className="shrink-0">
      <rect x="1" y="5" width="8" height="6.5" rx="1" fill="#A63A22" />
      <path d="M3 5V3.5a2 2 0 0 1 4 0V5" fill="none" stroke="#A63A22" strokeWidth="1.3" />
    </svg>
  )
}

export function Note({ children, tone = 'grey', className, testId }: { children: ReactNode; tone?: 'grey' | 'oxide' | 'teal' | 'steel' | 'survey'; className?: string; testId?: string }) {
  const look = tone === 'oxide' ? 'border-oxide bg-oxide-tint' : tone === 'teal' ? 'border-teal bg-teal-tint' : tone === 'steel' ? 'border-steel bg-steel-tint' : tone === 'survey' ? 'border-survey bg-survey-tint' : 'border-mill bg-rule-soft'
  return (
    <p className={cx('rounded-sm border-l-2 px-3 py-2 text-sm', look, className)} data-testid={testId}>
      {children}
    </p>
  )
}

/** The fixed label for every rule-based step (L2). */
export function RuleBased({ testId }: { testId?: string }) {
  return (
    <Note tone="survey" testId={testId}>
      {LABELS.L2}
    </Note>
  )
}

export function SimulatedAgent({ testId }: { testId?: string }) {
  return (
    <Note tone="survey" testId={testId}>
      {LABELS.L3}
    </Note>
  )
}

export function EmptyState({ hint }: { hint: string }) {
  return (
    <div className="rounded-sm border border-dashed border-rule px-4 py-6 text-sm text-mill-text">
      <p className="font-medium text-ink">{EMPTY_STATE}</p>
      <p>{hint}</p>
    </div>
  )
}

export function PageTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold leading-tight">{title}</h1>
        {sub ? <p className="text-sm text-mill-text">{sub}</p> : null}
      </div>
      {right}
    </div>
  )
}

export function Table({ children, className, dense = true, ...rest }: HTMLAttributes<HTMLTableElement> & { dense?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className={cx('w-full border-collapse text-sm tabular-nums', dense ? '[&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5' : '[&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2', '[&_th]:border-b [&_th]:border-rule [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-mill-text [&_td]:border-b [&_td]:border-rule-soft [&_td]:align-top', className)} {...rest}>
        {children}
      </table>
    </div>
  )
}

export function Num({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <td className={cx('text-right', className)} data-testid={testId}>
      {children}
    </td>
  )
}

export function Dl({ rows, className, testPrefix }: { rows: { label: ReactNode; value: ReactNode; testId?: string; isPrivate?: boolean }[]; className?: string; testPrefix?: string }) {
  return (
    <dl className={cx('grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm', className)}>
      {rows.map((r, i) => (
        <RowPair key={i} r={r} testPrefix={testPrefix} />
      ))}
    </dl>
  )
}

function RowPair({ r, testPrefix }: { r: { label: ReactNode; value: ReactNode; testId?: string; isPrivate?: boolean }; testPrefix?: string }) {
  const id = r.testId ? (testPrefix ? `${testPrefix}-${r.testId}` : r.testId) : undefined
  return (
    <>
      <dt className="text-mill-text">{r.label}</dt>
      <dd className={cx('m-0', r.isPrivate && 'border-l-2 border-oxide pl-2')} data-testid={id}>
        {r.value}
        {r.isPrivate ? (
          <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-medium text-oxide">
            <Lock />
            {LABELS.L28}
          </span>
        ) : null}
      </dd>
    </>
  )
}

export function Field({ label, children, hint, htmlFor, className }: { label: ReactNode; children: ReactNode; hint?: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <div className="text-xs text-mill-text">{hint}</div> : null}
    </div>
  )
}

export const inputClass = 'min-h-[44px] w-full rounded-sm border border-rule bg-panel px-3 text-base text-ink focus:border-steel'
export const selectClass = 'min-h-[44px] w-full rounded-sm border border-rule bg-panel px-2 text-base text-ink focus:border-steel'
