// Avatars: initials on a soft tint of the person's hue. Round for people, square for organisations.
import type { ComponentProps } from 'react'
import { cx } from './cx'
import { hueFor, initialsOf } from './illustration/rng'
import type { AvatarColourName } from './labels'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'


type Paint = { top: string; bottom: string; ink: string; ring: string }

function paint(h: number, s: number, s2: number): Paint {
  return { top: `hsl(${h} ${s}% 93%)`, bottom: `hsl(${h} ${s2}% 88%)`, ink: `hsl(${h} 42% 28%)`, ring: `hsl(${h} 35% 80% / 0.7)` }
}

const NAMED: Record<AvatarColourName, Paint> = {
  forest: paint(152, 46, 40),
  blue: paint(212, 60, 54),
  amber: paint(36, 70, 64),
  rose: paint(345, 56, 50),
  violet: paint(262, 50, 44),
  slate: { top: 'hsl(215 16% 93%)', bottom: 'hsl(215 14% 87%)', ink: 'hsl(215 22% 30%)', ring: 'hsl(215 14% 80% / 0.7)' },
  teal: paint(182, 46, 40),
}

const sizes: Record<AvatarSize, string> = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
  xl: 'size-14 text-lg',
}

export type AvatarProps = Omit<ComponentProps<'span'>, 'children'> & {
  name: string
  /** A named colour from the person's profile. Wins over `hue`. */
  colour?: AvatarColourName
  /** 0 to 360. Defaults to a hue chosen from the name. */
  hue?: number
  size?: AvatarSize
  shape?: 'circle' | 'square'
  /** Hide from assistive technology when the name is already next to it. */
  decorative?: boolean
}

export function Avatar({ name, colour, hue, size = 'md', shape = 'circle', decorative = false, className, style, ...rest }: AvatarProps) {
  const p = colour ? NAMED[colour] : paint(hue ?? hueFor(name), 52, 46)
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      title={decorative ? undefined : name}
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold uppercase leading-none tracking-wide',
        shape === 'circle' ? 'rounded-full' : size === 'xl' || size === 'lg' ? 'rounded-lg' : 'rounded-md',
        sizes[size],
        className,
      )}
      style={{
        background: `linear-gradient(180deg, ${p.top}, ${p.bottom})`,
        color: p.ink,
        boxShadow: `inset 0 0 0 1px ${p.ring}`,
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true">{initialsOf(name)}</span>
    </span>
  )
}

export type AvatarStackPerson = { name: string; hue?: number; colour?: AvatarColourName }

/** Overlapping avatars with a count of the rest. */
export function AvatarStack({ people, max = 4, size = 'sm', className }: { people: AvatarStackPerson[]; max?: number; size?: AvatarSize; className?: string }) {
  const shown = people.slice(0, max)
  const rest = people.slice(max)
  const names = people.map((p) => p.name).join(', ')
  return (
    <span role="group" aria-label={names} className={cx('inline-flex items-center', className)}>
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} hue={p.hue} colour={p.colour} size={size} decorative className={cx('ring-2 ring-surface', i > 0 && '-ml-1.5')} />
      ))}
      {rest.length > 0 ? (
        <span aria-hidden="true" className={cx('-ml-1.5 inline-flex items-center justify-center rounded-full bg-subtle font-medium text-ink-soft ring-2 ring-surface', sizes[size])}>
          +{rest.length}
        </span>
      ) : null}
    </span>
  )
}
