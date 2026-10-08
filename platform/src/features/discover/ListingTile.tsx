// A material as a showroom card, from the public listing's view model: the picture, typology and family, the facts,
// the fit against the project being checked, the band and, for architects, Save.
import { BookmarkCheck, LockKeyhole } from 'lucide-react'
import type { ListingCard } from '../../store/selectors/common'
import { MaterialCard, MaterialImage, Pill } from '../../ui'
import { CardSaveButton } from './SaveMenu'
import { usePhotoSrc } from './photo'
import { listingHref } from './links'

export function ListingTile({ card, canSave, projectId = null, size = 'md', eager = false }: { card: ListingCard; canSave: boolean; projectId?: string | null; size?: 'md' | 'lg'; eager?: boolean }) {
  const photo = usePhotoSrc(card.photo)
  return (
    <MaterialCard
      testId={`card-${card.publicId}`}
      href={listingHref(card.publicId, projectId)}
      title={card.title}
      size={size}
      eyebrow={`${card.typologyLabel}, ${card.familyLabel}`}
      image={<MaterialImage spec={card.listing.spec} publicId={card.publicId} photo={photo} alt={`Photo of ${card.title}`} aspect="4/3" eager={eager} />}
      facts={[card.quantityText, card.availabilityText, card.locationLabel]}
      fit={card.fit?.fit}
      band={card.band}
      badge={
        card.sharedInConfidence || (canSave && card.savedIn.length > 0) ? (
          <span className="flex flex-wrap gap-1.5">
            {canSave && card.savedIn.length > 0 ? (
              <Pill size="sm" icon={BookmarkCheck} title={`Saved to ${card.savedIn.map((x) => x.label).join(', ')}`} className="bg-brand-600! text-white! shadow-sm ring-brand-700/30!" data-testid={`saved-badge-${card.publicId}`}>
                {card.savedIn.length === 1 ? card.savedIn[0].label : `${card.savedIn.length} lists`}
              </Pill>
            ) : null}
            {card.sharedInConfidence ? (
              <Pill size="sm" icon={LockKeyhole} className="bg-white/90! text-ink-soft! shadow-sm ring-black/5! backdrop-blur-sm">
                Shared in confidence
              </Pill>
            ) : null}
          </span>
        ) : undefined
      }
      action={canSave ? <CardSaveButton card={card} /> : undefined}
    />
  )
}
