// Help, Updated on 16 October: the changes from the 14 October review, the viewer's own first with a link to
// where each one is, then the other workspaces'. The list comes from whatChangedView.
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useView } from '../../store'
import { whatChangedView, type ChangeItem } from '../../store/selectors/whatChanged'

function ChangeRow({ item }: { item: ChangeItem }) {
  return (
    <li className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6" data-testid={`change-${item.id}`}>
      <div className="min-w-0 flex-1">
        <h3 className="m-0 text-base font-semibold text-ink">{item.title}</h3>
        <p className="m-0 mt-0.5 text-sm text-ink-soft">{item.text}</p>
        <p className="m-0 mt-1 text-xs text-muted">{item.forText}</p>
      </div>
      {item.link ? (
        <Link
          to={item.link.href}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-sm text-sm font-medium text-brand-700 hover:underline max-sm:-mx-2 max-sm:min-h-11 max-sm:px-2 sm:mt-0.5"
          data-testid={`change-link-${item.id}`}
        >
          {item.link.label}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      ) : null}
    </li>
  )
}

export function WhatChanged() {
  const v = useView(whatChangedView)
  if (!v) return null
  return (
    <div className="flex flex-col gap-8" data-testid="what-changed">
      <div>
        <h2 className="m-0 text-xl font-semibold text-ink">{v.title}</h2>
        <p className="m-0 mt-1 max-w-2xl text-base text-muted">{v.intro}</p>
      </div>
      <section aria-labelledby="changes-yours">
        <h3 id="changes-yours" className="m-0 text-md font-semibold text-ink">
          In your workspace
        </h3>
        <ul className="m-0 mt-3 list-none divide-y divide-line-soft rounded-lg border border-line bg-surface p-4 sm:p-5" data-testid="changes-yours">
          {v.yours.map((c) => (
            <ChangeRow key={c.id} item={c} />
          ))}
        </ul>
      </section>
      {v.others.length > 0 ? (
        <section aria-labelledby="changes-others">
          <h3 id="changes-others" className="m-0 text-md font-semibold text-ink">
            In other workspaces
          </h3>
          <ul className="m-0 mt-3 list-none divide-y divide-line-soft rounded-lg border border-line bg-surface p-4 sm:p-5" data-testid="changes-others">
            {v.others.map((c) => (
              <ChangeRow key={c.id} item={c} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
