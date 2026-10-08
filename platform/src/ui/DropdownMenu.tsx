// Dropdown menu on radix: arrow keys move, typeahead jumps, Escape closes and returns focus to the trigger.
import type { ComponentProps, ReactNode } from 'react'
import { DropdownMenu as M } from 'radix-ui'
import type { LucideIcon } from 'lucide-react'
import { Check, ChevronRight } from 'lucide-react'
import { cx } from './cx'

export const DropdownMenu = M.Root
export const DropdownMenuTrigger = M.Trigger
export const DropdownMenuGroup = M.Group
export const DropdownMenuSub = M.Sub
export const DropdownMenuRadioGroup = M.RadioGroup

const panel =
  'z-[60] min-w-48 max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-line bg-surface p-1 text-base text-ink shadow-pop outline-none data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out'

const item =
  'relative flex min-h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2 py-1.5 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-hover max-sm:min-h-11 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted'

export function DropdownMenuContent({ className, align = 'end', sideOffset = 6, children, ...rest }: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content align={align} sideOffset={sideOffset} collisionPadding={12} className={cx(panel, 'origin-(--radix-dropdown-menu-content-transform-origin)', className)} {...rest}>
        {children}
      </M.Content>
    </M.Portal>
  )
}

export function DropdownMenuItem({ className, icon: Icon, shortcut, tone = 'default', children, ...rest }: ComponentProps<typeof M.Item> & { icon?: LucideIcon; shortcut?: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <M.Item className={cx(item, tone === 'danger' && 'text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger', className)} {...rest}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <span className="ml-auto pl-4 text-xs text-faint">{shortcut}</span> : null}
    </M.Item>
  )
}

export function DropdownMenuCheckboxItem({ className, children, ...rest }: ComponentProps<typeof M.CheckboxItem>) {
  return (
    <M.CheckboxItem className={cx(item, 'pl-8', className)} {...rest}>
      <span className="absolute left-2 inline-flex size-4 items-center justify-center">
        <M.ItemIndicator>
          <Check aria-hidden="true" className="text-brand-600!" />
        </M.ItemIndicator>
      </span>
      {children}
    </M.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({ className, children, ...rest }: ComponentProps<typeof M.RadioItem>) {
  return (
    <M.RadioItem className={cx(item, 'pl-8', className)} {...rest}>
      <span className="absolute left-2 inline-flex size-4 items-center justify-center">
        <M.ItemIndicator>
          <span className="block size-1.5 rounded-full bg-brand-600" />
        </M.ItemIndicator>
      </span>
      {children}
    </M.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...rest }: ComponentProps<typeof M.Label>) {
  return <M.Label className={cx('px-2 pb-1 pt-2 text-xs font-medium text-muted', className)} {...rest} />
}

export function DropdownMenuSeparator({ className, ...rest }: ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cx('-mx-1 my-1 h-px bg-line-soft', className)} {...rest} />
}

export function DropdownMenuSubTrigger({ className, icon: Icon, children, ...rest }: ComponentProps<typeof M.SubTrigger> & { icon?: LucideIcon }) {
  return (
    <M.SubTrigger className={cx(item, 'data-[state=open]:bg-hover', className)} {...rest}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRight aria-hidden="true" className="ml-auto" />
    </M.SubTrigger>
  )
}

export function DropdownMenuSubContent({ className, ...rest }: ComponentProps<typeof M.SubContent>) {
  return (
    <M.Portal>
      <M.SubContent collisionPadding={12} className={cx(panel, className)} {...rest} />
    </M.Portal>
  )
}
