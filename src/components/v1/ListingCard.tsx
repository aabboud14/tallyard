// The showroom card: a 4:3 visual, the title in display type, tags, facts in two columns and a footer slot.
// Purely presentational. The whole card opens the listing; the footer (the save control) sits above that link.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '../ui'

export type CardFact = { label: string; value: ReactNode; testId?: string }

export function ListingCard({ to, visual, title, tags, facts, footer, testId, className }: { to: string; visual: ReactNode; title: ReactNode; tags?: ReactNode; facts: CardFact[]; footer?: ReactNode; testId?: string; className?: string }) {
  return (
    <article
      data-testid={testId}
      className={cx(
        'group relative flex flex-col overflow-hidden rounded-md border border-rule-soft bg-panel transition-shadow duration-200',
        'hover:shadow-[0_0_0_1px_rgba(20,32,43,0.06),0_12px_28px_-16px_rgba(20,32,43,0.30)]',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-steel',
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-rule-soft">
        <div className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.015] [&>*]:h-full [&>*]:w-full [&>img]:object-cover">{visual}</div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-3 pt-3.5">
        <h3 className="m-0 font-display text-xl leading-tight tracking-wide text-ink">
          <Link to={to} className="text-ink no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {title}
          </Link>
        </h3>
        {tags ? <div className="flex flex-col gap-1.5">{tags}</div> : null}
        {facts.length > 0 ? (
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {facts.map((f, i) => (
              <div key={i} className="flex min-w-0 flex-col">
                <dt className="text-xs text-mill-text">{f.label}</dt>
                <dd className="m-0 truncate font-medium tabular-nums text-ink" data-testid={f.testId}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {footer ? <div className="relative z-10 mt-auto flex items-center justify-end gap-2 pt-1">{footer}</div> : null}
      </div>
    </article>
  )
}

/** A row of tags on a card: typology and family on one row, the band on the next. */
export function TagRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>
}
