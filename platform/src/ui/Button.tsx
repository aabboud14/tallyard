// Buttons. Four variants, three sizes, optional icons, a loading state and asChild for links styled as buttons.
// On phone-width layouts every button is at least 44 px tall (P9).
import type { ComponentProps, ReactNode } from 'react'
import { Slot } from 'radix-ui'
import type { LucideIcon } from 'lucide-react'
import { LoaderCircle } from 'lucide-react'
import { cx } from './cx'
import { Tooltip } from './Tooltip'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.10),0_1px_2px_rgb(28_25_23/0.14)] hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-subtle active:bg-hover',
  ghost: 'text-ink-soft hover:bg-hover hover:text-ink active:bg-line-soft',
  danger:
    'bg-danger text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.10),0_1px_2px_rgb(28_25_23/0.14)] hover:bg-danger-strong',
  link: 'h-auto! px-0! text-brand-700 underline-offset-4 hover:underline',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-md px-2.5 text-sm [&_svg]:size-3.5 max-sm:min-h-11',
  md: 'h-9 rounded-md px-3.5 text-base [&_svg]:size-4 max-sm:min-h-11',
  lg: 'h-11 rounded-lg px-5 text-md [&_svg]:size-[18px]',
}

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** A lucide icon before the label. */
  icon?: LucideIcon
  /** A lucide icon after the label. */
  trailingIcon?: LucideIcon
  loading?: boolean
  /** Full width. */
  block?: boolean
  /** Render the single child (for example a router Link) with button styling. */
  asChild?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, trailingIcon: Trailing, loading = false, block = false, asChild = false, className, children, disabled, type, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      {...(asChild ? {} : { type: type ?? 'button', disabled: disabled || loading })}
      aria-busy={loading || undefined}
      className={cx(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : Icon ? <Icon aria-hidden="true" /> : null}
      <Slot.Slottable>{children}</Slot.Slottable>
      {Trailing ? <Trailing aria-hidden="true" /> : null}
    </Comp>
  )
}

export type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: LucideIcon
  /** The accessible name. Also shown as a tooltip unless `tooltip` is false. */
  label: string
  variant?: Exclude<ButtonVariant, 'link'>
  size?: ButtonSize
  tooltip?: boolean
  /** Optional element inside the button, for example a count badge. */
  children?: ReactNode
}

const iconSizes: Record<ButtonSize, string> = {
  sm: 'size-8 rounded-md [&_svg]:size-4 max-sm:size-11',
  md: 'size-9 rounded-md [&_svg]:size-[18px] max-sm:size-11',
  lg: 'size-11 rounded-lg [&_svg]:size-5',
}

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', tooltip = true, className, type, children, ...rest }: IconButtonProps) {
  const button = (
    <button type={type ?? 'button'} aria-label={label} className={cx(base, variants[variant], iconSizes[size], className)} {...rest}>
      <Icon aria-hidden="true" />
      {children}
    </button>
  )
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button
}
