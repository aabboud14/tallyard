import { Link } from 'react-router'
import { useWorld } from '../shared/hooks'
import { browseListings } from '../../store/selectors'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { PageTitle, EmptyState, Tag } from '../../components/ui'
import { ItemDrawing } from '../../components/drawings/ItemDrawing'
import { scaleFor } from '../../components/drawings/SectionDrawing'
import { SIGNAL_LABELS, LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { availabilityText, quantityText, priceRangeText } from './ListingView'

export function Browse() {
  const world = useWorld()
  const listings = browseListings(world, A)
  const scale = scaleFor(listings.filter((l) => l.spec.family === 'steel_section').map((l) => (l.spec as { designation: string }).designation), 96)
  return (
    <>
      <PageTitle title="Browse" sub={`${listings.length} open listings, sorted by public ID. ${LABELS.L10}.`} />
      {listings.length === 0 ? (
        <EmptyState hint="Open listings appear here when sellers publish them." />
      ) : (
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3" data-testid="browse-grid">
          {listings.map((l) => (
            <li key={l.publicId} className="rounded-sm border border-rule bg-panel p-3" data-testid={`browse-card-${l.publicId}`}>
              <Link to={`/market/${l.publicId}`} className="flex flex-col gap-2 text-ink no-underline">
                <div className="flex h-44 items-center justify-center overflow-hidden">
                  <ItemDrawing spec={l.spec} scale={scale} box={96} caption={false} />
                </div>
                <div className="font-display text-xl">{l.title}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm">
                  <span className="text-mill-text">Quantity</span>
                  <span className="text-right">{quantityText(l)}</span>
                  <span className="text-mill-text">Mass</span>
                  <span className="text-right">{f.massT(l.massT)}</span>
                  <span className="text-mill-text">Location</span>
                  <span className="text-right">{l.location.label}</span>
                  <span className="text-mill-text">Availability</span>
                  <span className="text-right">{availabilityText(l)}</span>
                  <span className="text-mill-text">Guide</span>
                  <span className="text-right">{priceRangeText(l)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Tag tone={l.price.signal === 'high' ? 'survey' : l.price.signal === 'low' ? 'grey' : 'steel'}>{SIGNAL_LABELS[l.price.signal]}</Tag>
                  <span className="text-xs text-mill-text">{l.publicId}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
