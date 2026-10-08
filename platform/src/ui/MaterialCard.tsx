// The showroom card for Discover and every row of materials: the picture leads, then the title, a quiet line
// of typology and family, the facts and the fit. The whole card opens the material; the action (Save) sits
// over the picture, shown on hover and focus, always on touch screens.
import type { ReactNode } from 'react'
import { Link, useInRouterContext } from 'react-router'
import type { Band, Fit } from '../domain/v1types'
import { cx } from './cx'
import { FitPill } from './Badge'
import { SustainabilityBand } from './SustainabilityBand'

export type MaterialCardProps = {
  href: string
  title: string
  /** For example "Structure, steel section". */
  eyebrow?: ReactNode
  /** Usually <MaterialImage />. */
  image: ReactNode
  /** Short facts in one line: quantity, availability, location. */
  facts?: ReactNode[]
  fit?: Fit
  band?: Band
  /** A control over the picture, for example the Save button. */
  action?: ReactNode
  /** A mark over the picture, top left, for example "Shared with you". */
  badge?: ReactNode
  size?: 'md' | 'lg'
  className?: string
  testId?: string
}

export function MaterialCard({ href, title, eyebrow, image, facts = [], fit, band, action, badge, size = 'md', className, testId }: MaterialCardProps) {
  const inRouter = useInRouterContext()
  const linkCls = 'text-ink outline-none after:absolute after:inset-0 after:z-[1] after:rounded-xl after:content-[""]'
  return (
    <article data-testid={testId} className={cx('group relative flex min-w-0 flex-col gap-3 rounded-xl has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-brand-600', className)}>
      <div className="relative overflow-hidden rounded-xl bg-subtle shadow-[0_0_0_1px_rgb(28_25_23/0.06)] transition-shadow duration-300 ease-out group-hover:shadow-[0_0_0_1px_rgb(28_25_23/0.08),0_18px_40px_-20px_rgb(28_25_23/0.35)]">
        <div className="transition-transform duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transform-none">{image}</div>
        {badge ? <div className="absolute left-3 top-3 z-[2]">{badge}</div> : null}
        {action ? <div className="absolute right-3 top-3 z-[2] opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">{action}</div> : null}
        {fit ? (
          <div className="absolute bottom-3 left-3 z-[2]">
            <FitPill fit={fit} size="sm" className="bg-white/90! shadow-sm backdrop-blur-sm" />
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1 px-0.5">
        {eyebrow ? <div className="truncate text-sm text-muted">{eyebrow}</div> : null}
        <h3 className={cx('m-0 font-semibold leading-snug text-ink', size === 'lg' ? 'text-lg' : 'text-md')}>
          {inRouter ? (
            <Link to={href} className={linkCls}>
              {title}
            </Link>
          ) : (
            <a href={href} className={linkCls}>
              {title}
            </a>
          )}
        </h3>
        {facts.length > 0 ? (
          <p className="m-0 min-w-0 text-sm leading-5 text-ink-soft">
            {facts.map((f, i) => (
              <span key={i}>
                <span className="whitespace-nowrap tabular-nums">
                  {f}
                  {i < facts.length - 1 ? (
                    <span aria-hidden="true" className="ml-1.5 mr-0.5 text-faint">
                      ·
                    </span>
                  ) : null}
                </span>{' '}
              </span>
            ))}
          </p>
        ) : null}
        {band ? <SustainabilityBand band={band} size="sm" className="mt-1" /> : null}
      </div>
    </article>
  )
}
