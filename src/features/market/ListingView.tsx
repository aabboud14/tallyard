// The public view of a listing, built only from a PublicListing (R3). The pieces here are shared by the listing page
// and the owner's compact market preview (supply ItemDetail and Listings), which keeps its test ids under "preview".
import type { PublicListing } from '../../domain/types'
import { ItemDrawing } from '../../components/drawings/ItemDrawing'
import { HowCalculated } from '../../components/HowCalculated'
import { Dl, Tag, Note } from '../../components/ui'
import { LABELS, SIGNAL_LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { carbonSections, guideSections } from '../shared/calc'
import { priceRangeText } from '../../domain/engines/specSheet'
import { factRows } from './listingFacts'
import { listingCalc } from '../../store/views/market'

/** Guide price as a secondary line: the range, the market signal, L10 and, outside the preview, the working. */
export function PriceLine({ listing: l, testPrefix, withCalc }: { listing: PublicListing; testPrefix: string; withCalc: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-sm text-mill-text">Guide price</span>
      <span className="font-display text-xl tabular-nums" data-testid={`${testPrefix}-price`}>
        {priceRangeText(l)}
      </span>
      <span className="text-sm" data-testid={`${testPrefix}-signal`}>
        Market signal: {SIGNAL_LABELS[l.price.signal]}
      </span>
      <span className="text-xs text-mill-text" data-testid="label-L10">
        {LABELS.L10}
      </span>
      {withCalc ? <HowCalculated title={`guide price for ${l.publicId}`} {...guideSections(listingCalc(l).guide, l.family, l.condition, l.testStatus)} testId={`${testPrefix}-price-calc`} /> : null}
    </div>
  )
}

/** "How this is calculated" for the avoided carbon, or nothing when no carbon is claimed. */
export function CarbonCalc({ listing: l, testPrefix }: { listing: PublicListing; testPrefix: string }) {
  const c = listingCalc(l).carbon
  if (!l.carbon || !c) return null
  return <HowCalculated title={`avoided carbon for ${l.publicId}`} {...carbonSections(c)} testId={`${testPrefix}-carbon-calc`} />
}

/** The listing as the market sees it, in one column. Used by the owner's market preview (compact) and as a fallback. */
export function ListingView({ listing: l, testPrefix = 'listing', compact = false, reserveNotes = false }: { listing: PublicListing; testPrefix?: string; compact?: boolean; reserveNotes?: boolean }) {
  return (
    <div className={compact ? 'flex flex-col gap-3' : 'grid gap-5 lg:grid-cols-[auto_1fr]'}>
      <div className="flex flex-col items-start gap-2">
        <ItemDrawing spec={l.spec} box={compact ? 90 : 140} caption={false} />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-2xl" data-testid={`${testPrefix}-title`}>
            {l.title}
          </span>
          <Tag tone={l.status === 'Available' ? 'teal' : 'grey'}>{l.status}</Tag>
          {l.sharing === 'in_confidence' ? <Tag tone="steel">{LABELS.L27}</Tag> : null}
        </div>
        <Dl testPrefix={testPrefix} rows={factRows(l, true)} />
        <PriceLine listing={l} testPrefix={testPrefix} withCalc={!compact} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm text-mill-text">Avoided carbon</span>
          {l.carbon ? (
            <>
              <span className="font-display text-xl" data-testid={`${testPrefix}-carbon`}>
                {f.carbon(l.carbon.avoidedT)}
              </span>
              <span className="text-sm text-ink-soft">{f.percent(l.carbon.percent)} of new, A1-A4</span>
              {!compact ? <CarbonCalc listing={l} testPrefix={testPrefix} /> : null}
            </>
          ) : (
            <span data-testid={`${testPrefix}-carbon`}>{LABELS.L14}</span>
          )}
        </div>
        <p className="text-sm" data-testid={`${testPrefix}-listed`}>
          Surveyed. Listed {f.month(l.listedMonth)}.
        </p>
        {reserveNotes ? <ReserveNote listing={l} /> : null}
      </div>
    </div>
  )
}

/** The buying owner's reserve copy (version 0.5 wording). Never shown to the architect (13.10). */
export function ReserveNote({ listing: l }: { listing: PublicListing }) {
  return l.family === 'steel_section' ? (
    <Note tone="steel" testId="reserve-steel">
      To reserve steel, match your schedule in the project workspace.
    </Note>
  ) : (
    <Note tone="grey" testId="label-L25">
      {LABELS.L25}
    </Note>
  )
}
