// A material as the client reviews it: the picture, the key facts from the public listing, the timeline check,
// the sustainability band with avoided carbon, and the guide price range. Every figure is from the public projection.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { TEST_STATUS_LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { fitText, storageText, type ListingCard } from '../../store/selectors/common'
import { cx, FitPill, IndicativeMarker, SustainabilityBand } from '../../ui'
import { MaterialPicture } from '../buildings/photos'

export function MaterialFacts({ card, className }: { card: ListingCard; className?: string }) {
  const l = card.listing
  const facts: [string, ReactNode][] = [
    ['Quantity', card.quantityText],
    ['Mass', f.massT(card.massT)],
    ['Availability', card.availabilityText],
    ['Location', card.locationLabel],
    ['Condition', `Grade ${l.condition}`],
    ['Testing', TEST_STATUS_LABELS[l.testStatus]],
  ]
  return (
    <dl className={cx('m-0 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3', className)}>
      {facts.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="m-0 mt-0.5 truncate text-base font-medium tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The three indicative checks in one band: timeline, sustainability and price. */
export function MaterialSignals({ card, className }: { card: ListingCard; className?: string }) {
  const storage = storageText(card.fit)
  return (
    <div className={cx('grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft sm:grid-cols-3', className)}>
      <div className="flex min-w-0 flex-col gap-1.5 bg-page/60 px-3.5 py-3">
        <span className="text-xs text-muted">Timeline</span>
        {card.fit ? <FitPill fit={card.fit.fit} size="sm" className="self-start" /> : <span className="text-sm text-muted">No project start set</span>}
        <span className="text-sm text-ink-soft">{storage ?? fitText(card.fit) ?? ''}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 bg-page/60 px-3.5 py-3">
        <span className="flex items-center justify-between gap-2 text-xs text-muted">
          Carbon avoided
          <IndicativeMarker />
        </span>
        <span className="text-lg font-semibold tabular-nums text-ink">{card.avoidedT !== null ? f.carbon(card.avoidedT) : 'Not claimed'}</span>
        <SustainabilityBand band={card.band} size="sm" />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 bg-page/60 px-3.5 py-3">
        <span className="flex items-center justify-between gap-2 text-xs text-muted">
          Guide price
          <IndicativeMarker />
        </span>
        <span className="text-base font-semibold tabular-nums text-ink">{card.priceRange}</span>
        <span className="text-xs text-muted">Before storage, testing and delivery</span>
      </div>
    </div>
  )
}

/** Picture, title and facts side by side; the picture leads on a phone. */
export function MaterialSummary({ card, title, eyebrow, children, aside, testId }: { card: ListingCard; title: string; eyebrow?: ReactNode; children?: ReactNode; aside?: ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} className="grid gap-5 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <MaterialPicture spec={card.listing.spec} publicId={card.publicId} photo={card.photo} aspect="4/3" rounded="lg" showKind />
        {aside}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="min-w-0">
          <p className="m-0 text-sm text-muted">{eyebrow ?? `${card.typologyLabel} · ${card.familyLabel}`}</p>
          <h3 className="m-0 mt-0.5 text-xl font-semibold text-ink">{title}</h3>
          <Link to={`/app/discover/${card.publicId}`} className="mt-1 inline-flex items-center gap-1 rounded-sm text-sm text-muted hover:text-ink">
            {card.publicId}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Open the material page</span>
          </Link>
        </div>
        <MaterialFacts card={card} />
        <MaterialSignals card={card} />
        {children}
      </div>
    </div>
  )
}
