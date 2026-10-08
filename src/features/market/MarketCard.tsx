// One showroom card, built from a BrowseCard view model (public listing, typology, band, fit). Formats only.
import type { ReactNode } from 'react'
import type { PublicListing } from '../../domain/types'
import type { Band, TimelineFit } from '../../domain/v1types'
import { ListingCard, SustainabilityBand, TagRow } from '../../components/v1'
import { Tag } from '../../components/ui'
import { FAMILIES } from '../../domain/reference/families'
import { LABELS } from '../../domain/reference/labels'
import { availabilityText, priceRangeText, quantityText } from '../../domain/engines/specSheet'
import { FIT_TAG, fitTone } from '../../store/views/market'
import * as f from '../../domain/format'
import { ListingVisual } from './ListingVisual'
import { SaveToWishlist } from '../architect/SaveToWishlist'

export type MarketCardData = { listing: PublicListing; typologyLabel: string; band: Band; fit: TimelineFit | null }

export function MarketCard({ card, canSave, testId, footerExtra }: { card: MarketCardData; canSave: boolean; testId?: string; footerExtra?: ReactNode }) {
  const l = card.listing
  return (
    <ListingCard
      to={`/market/${l.publicId}`}
      className="w-full"
      testId={testId ?? `browse-card-${l.publicId}`}
      visual={<ListingVisual listing={l} />}
      title={l.title}
      tags={
        <>
          <TagRow>
            <Tag tone="grey">{card.typologyLabel}</Tag>
            <Tag tone="grey">{FAMILIES[l.family].label}</Tag>
            {l.sharing === 'in_confidence' ? (
              <Tag tone="steel" data-testid="label-L27">
                {LABELS.L27}
              </Tag>
            ) : null}
          </TagRow>
          <TagRow>
            <SustainabilityBand band={card.band} size="sm" testId={`band-${l.publicId}`} />
            {card.fit ? (
              <Tag tone={fitTone(card.fit.fit)} className="ml-auto" data-testid={`fit-${l.publicId}`} data-fit={card.fit.fit} title={card.fit.text}>
                {FIT_TAG[card.fit.fit]}
              </Tag>
            ) : null}
          </TagRow>
        </>
      }
      facts={[
        { label: 'Quantity', value: quantityText(l) },
        { label: 'Availability', value: availabilityText(l) },
        { label: 'Location', value: l.location.label },
        { label: 'Mass', value: f.massT(l.massT) },
      ]}
      footer={
        <div className="flex w-full flex-col gap-2.5">
          <p className="m-0 border-t border-rule-soft pt-2.5 text-xs text-mill-text" data-testid={`guide-${l.publicId}`}>
            Guide {priceRangeText(l)}
          </p>
          {footerExtra || canSave ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {footerExtra}
              {canSave ? <SaveToWishlist publicId={l.publicId} title={l.title} /> : null}
            </div>
          ) : null}
        </div>
      }
    />
  )
}

/** The showroom grid: one column on a phone, then as many 280 px columns as fit. */
export function CardGrid({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] xl:gap-6" data-testid={testId}>
      {children}
    </ul>
  )
}
