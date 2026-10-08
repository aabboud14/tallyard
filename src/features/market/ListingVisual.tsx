// The lead visual for a listing: the first public photo when there is one, otherwise the generated swatch.
import type { PublicListing } from '../../domain/types'
import { MaterialSwatch } from '../../components/v1'
import { usePublicPhotoSrc } from './usePublicPhotoSrc'

export function ListingVisual({ listing, testId, className }: { listing: PublicListing; testId?: string; className?: string }) {
  const src = usePublicPhotoSrc(listing.photos[0])
  if (src) return <img src={src} alt={`Public photo of ${listing.title}`} className={className ?? 'h-full w-full object-cover'} data-testid={testId} data-visual="photo" />
  return <MaterialSwatch spec={listing.spec} publicId={listing.publicId} testId={testId} className={className} />
}
