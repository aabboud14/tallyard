// A material as a showroom card, from the public listing's view model: the picture, typology and family, the facts
// (quantity, when it is available as an approximate date, where it is), the fit against the project being checked,
// the band and, for architects, Save. An optional note sits under the card, for example why it is new for you.
import type { ReactNode } from 'react'
import { BookmarkCheck, LockKeyhole } from 'lucide-react'
import type { ListingCard } from '../../store/selectors/common'
import { MaterialCard, MaterialImage, Pill } from '../../ui'
import { CardSaveButton } from './SaveMenu'
import { usePhotoSrc } from './photo'
import { listingHref } from './links'

export function ListingTile({ card, canSave, projectId = null, size = 'md', eager = false, note, testIdPrefix = '', showFit = true }: { card: ListingCard; /** The fit pill on the picture; off where a caption already says the fit. */ showFit?: boolean; canSave: boolean; projectId?: string | null; size?: 'md' | 'lg'; eager?: boolean; note?: ReactNode; /** Keeps test ids unique when a material shows twice on a page. */ testIdPrefix?: string }) {
  const photo = usePhotoSrc(card.photo)
  const tile = (
    <MaterialCard
      testId={`${testIdPrefix}card-${card.publicId}`}
      href={listingHref(card.publicId, projectId)}
      title={card.title}
      size={size}
      eyebrow={`${card.typologyLabel}, ${card.familyLabel}`}
      image={<MaterialImage spec={card.listing.spec} publicId={card.publicId} photo={photo} alt={`Photo of ${card.title}`} aspect="4/3" eager={eager} />}
      facts={[card.quantityText, card.availabilityShort, card.locationLabel]}
      fit={showFit ? card.fit?.fit : undefined}
      band={card.band}
      badge={
        card.sharedInConfidence || (canSave && card.savedIn.length > 0) ? (
          <span className="flex flex-wrap gap-1.5">
            {canSave && card.savedIn.length > 0 ? (
              <Pill size="sm" icon={BookmarkCheck} title={`Saved to ${card.savedIn.map((x) => x.label).join(', ')}`} className="bg-brand-600! text-white! ring-brand-700/30!" data-testid={`${testIdPrefix}saved-badge-${card.publicId}`}>
                {card.savedIn.length === 1 ? card.savedIn[0].label : `${card.savedIn.length} lists`}
              </Pill>
            ) : null}
            {card.sharedInConfidence ? (
              <Pill size="sm" icon={LockKeyhole} className="bg-surface! text-ink-soft! ring-line!">
                Shared in confidence
              </Pill>
            ) : null}
          </span>
        ) : undefined
      }
      action={canSave ? <CardSaveButton card={card} testId={`${testIdPrefix}save-${card.publicId}`} /> : undefined}
    />
  )
  if (!note) return tile
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {tile}
      <div className="px-0.5 text-sm">{note}</div>
    </div>
  )
}
