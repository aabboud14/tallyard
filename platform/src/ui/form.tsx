// Form controls. Field wires its label, hint and error to the control inside it, so every input is labelled
// and described without passing ids by hand. Inputs grow to 44 px and 16 px text on phones (no zoom on focus).
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react'
import { Checkbox as C, Label as L, RadioGroup as R, Switch as S } from 'radix-ui'
import type { LucideIcon } from 'lucide-react'
import { Check, ChevronsUpDown, CircleAlert, Minus } from 'lucide-react'
import { cx } from './cx'

type FieldCtx = { id: string; describedBy: string | undefined; invalid: boolean; required: boolean }
const FieldContext = createContext<FieldCtx | null>(null)

/** Props a control takes from the Field around it, unless it sets its own. */
function useFieldProps<P extends { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: ComponentProps<'input'>['aria-invalid']; required?: boolean }>(props: P): P {
  const f = useContext(FieldContext)
  if (!f) return props
  return {
    ...props,
    id: props.id ?? f.id,
    'aria-describedby': cx(f.describedBy, props['aria-describedby']) || undefined,
    'aria-invalid': props['aria-invalid'] ?? (f.invalid || undefined),
    required: props.required ?? (f.required || undefined),
  }
}

export function Label({ className, ...rest }: ComponentProps<typeof L.Root>) {
  return <L.Root className={cx('text-sm font-medium text-ink', className)} {...rest} />
}

export type FieldProps = {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  /** Shows "Optional" beside the label. */
  optional?: boolean
  /** A small action on the label row, for example a "Forgot password" link. */
  labelAction?: ReactNode
  id?: string
  className?: string
}

export function Field({ label, children, hint, error, required = false, optional = false, labelAction, id, className }: FieldProps) {
  const auto = useId()
  const fieldId = id ?? `f${auto.replace(/:/g, '')}`
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const ctx: FieldCtx = { id: fieldId, describedBy: cx(hintId, errorId) || undefined, invalid: !!error, required }
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={fieldId}>
          {label}
          {optional ? <span className="ml-1.5 font-normal text-muted">Optional</span> : null}
        </Label>
        {labelAction}
      </div>
      <FieldContext.Provider value={ctx}>{children}</FieldContext.Provider>
      {hint ? (
        <p id={hintId} className="m-0 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="m-0 flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

const control =
  'w-full min-w-0 rounded-lg border border-line bg-surface text-base text-ink shadow-xs outline-none transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-brand-600 focus:shadow-focus focus:hover:border-brand-600 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgb(185_28_28/0.14)] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted max-sm:text-[16px]'

export type InputProps = ComponentProps<'input'> & {
  /** A lucide icon inside the start of the field. */
  icon?: LucideIcon
  /** An element inside the end of the field, for example a Kbd hint or a clear button. */
  trailing?: ReactNode
  inputSize?: 'sm' | 'md' | 'lg'
}

const inputSizes = { sm: 'h-8 px-2.5 text-sm max-sm:h-11', md: 'h-9 px-3 max-sm:h-11', lg: 'h-11 px-3.5 text-md' }

export function Input({ icon: Icon, trailing, inputSize = 'md', className, ...props }: InputProps) {
  const p = useFieldProps(props)
  if (!Icon && !trailing) return <input className={cx(control, 'read-only:bg-subtle', inputSizes[inputSize], className)} {...p} />
  return (
    <div className={cx('relative flex min-w-0 items-center', className)}>
      {Icon ? <Icon aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-faint" /> : null}
      <input className={cx(control, 'read-only:bg-subtle', inputSizes[inputSize], Icon && 'pl-9', trailing ? 'pr-12' : null)} {...p} />
      {trailing ? <div className="absolute right-2 flex items-center">{trailing}</div> : null}
    </div>
  )
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<'textarea'>) {
  const p = useFieldProps(props)
  return <textarea rows={rows} className={cx(control, 'block resize-y px-3 py-2 leading-5 read-only:bg-subtle', className)} {...p} />
}

export type SelectOption = { value: string; label: string; disabled?: boolean }

export type SelectProps = Omit<ComponentProps<'select'>, 'children'> & {
  options: SelectOption[]
  /** Shown as a first, empty choice. */
  placeholder?: string
  selectSize?: 'sm' | 'md'
}

export function Select({ options, placeholder, selectSize = 'md', className, ...props }: SelectProps) {
  const p = useFieldProps(props)
  return (
    <div className={cx('relative min-w-0', className)}>
      <select className={cx(control, 'cursor-pointer appearance-none pr-9', selectSize === 'sm' ? 'h-8 pl-2.5 text-sm max-sm:h-11' : 'h-9 pl-3 max-sm:h-11')} {...p}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronsUpDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
    </div>
  )
}

export type CheckboxProps = Omit<ComponentProps<typeof C.Root>, 'children'> & { label?: ReactNode; description?: ReactNode }

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const auto = useId()
  const cid = id ?? `c${auto.replace(/:/g, '')}`
  const box = (
    <C.Root
      id={cid}
      className={cx(
        'peer relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border max-sm:after:absolute max-sm:after:-inset-3.5 border-line-strong bg-surface shadow-xs transition-colors duration-100 hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 data-[state=indeterminate]:border-brand-600 data-[state=indeterminate]:bg-brand-600',
        !label && className,
      )}
      {...props}
    >
      <C.Indicator className="text-white">{props.checked === 'indeterminate' ? <Minus aria-hidden="true" className="size-3" strokeWidth={3} /> : <Check aria-hidden="true" className="size-3" strokeWidth={3} />}</C.Indicator>
    </C.Root>
  )
  if (!label) return box
  return (
    <div className={cx('flex items-start gap-2.5 max-sm:min-h-11 max-sm:items-center', className)}>
      <div className="flex h-5 items-center">{box}</div>
      <div className="flex flex-col">
        <label htmlFor={cid} className="cursor-pointer select-none text-base text-ink peer-disabled:cursor-not-allowed">
          {label}
        </label>
        {description ? <span className="text-sm text-muted">{description}</span> : null}
      </div>
    </div>
  )
}

export type SwitchProps = Omit<ComponentProps<typeof S.Root>, 'children'> & { label?: ReactNode; description?: ReactNode }

export function Switch({ label, description, className, id, ...props }: SwitchProps) {
  const auto = useId()
  const sid = id ?? `s${auto.replace(/:/g, '')}`
  const sw = (
    <S.Root
      id={sid}
      className={cx(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full max-sm:after:absolute max-sm:after:-inset-3 bg-line-strong shadow-[inset_0_1px_2px_rgb(28_25_23/0.10)] transition-colors duration-150 hover:bg-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-brand-600 data-[state=checked]:hover:bg-brand-700',
        !label && className,
      )}
      {...props}
    >
      <S.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white shadow-[0_1px_2px_rgb(28_25_23/0.25)] transition-transform duration-150 ease-out data-[state=checked]:translate-x-[18px]" />
    </S.Root>
  )
  if (!label) return sw
  return (
    <div className={cx('flex items-start justify-between gap-4 max-sm:min-h-11 max-sm:items-center', className)}>
      <div className="flex flex-col">
        <label htmlFor={sid} className="cursor-pointer select-none text-base text-ink">
          {label}
        </label>
        {description ? <span className="text-sm text-muted">{description}</span> : null}
      </div>
      <div className="flex h-5 items-center">{sw}</div>
    </div>
  )
}

export type RadioCardOption = { value: string; label: ReactNode; description?: ReactNode; icon?: LucideIcon; disabled?: boolean }

/** A set of choices as cards, one selected. Used for organisation type and visibility. */
export function RadioCards({ options, value, onValueChange, columns = 1, className, ...rest }: Omit<ComponentProps<typeof R.Root>, 'children' | 'onValueChange'> & { options: RadioCardOption[]; value?: string; onValueChange?: (v: string) => void; columns?: 1 | 2 | 3 }) {
  return (
    <R.Root value={value} onValueChange={onValueChange} className={cx('grid gap-2', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-3', className)} {...rest}>
      {options.map((o) => {
        const Icon = o.icon
        return (
          <R.Item
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            className={cx(
              'group relative flex w-full items-start gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 text-left shadow-xs transition-[border-color,box-shadow,background-color] duration-150 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
              'data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-50/50 data-[state=checked]:shadow-[0_0_0_1px_var(--color-brand-600)]',
            )}
          >
            {Icon ? (
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-subtle text-ink-soft group-data-[state=checked]:border-brand-200 group-data-[state=checked]:bg-brand-100 group-data-[state=checked]:text-brand-700">
                <Icon aria-hidden="true" className="size-4" />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base font-medium text-ink">{o.label}</span>
              {o.description ? <span className="text-sm text-muted">{o.description}</span> : null}
            </span>
            <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface group-data-[state=checked]:border-brand-600 group-data-[state=checked]:bg-brand-600">
              <R.Indicator className="block size-1.5 rounded-full bg-white" />
            </span>
          </R.Item>
        )
      })}
    </R.Root>
  )
}
