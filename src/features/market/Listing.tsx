import { Link, useParams } from 'react-router'
import { useWorld, usePersona } from '../shared/hooks'
import { useStore } from '../../store/store'
import { listingDetailView } from '../../store/v1selectors'
import { PageTitle, Note } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import { ListingView } from './ListingView'

export function Listing() {
  const { publicId } = useParams()
  const world = useWorld()
  const { persona } = usePersona()
  const browseProjectId = useStore((s) => s.browseProjectId)
  // Open lots for everyone; a shared lot when one of the persona's projects can see it (terms count for the project).
  const listing = publicId ? (listingDetailView(world, persona.id, publicId, browseProjectId)?.listing ?? null) : null
  return (
    <>
      <PageTitle
        title={listing ? `Listing ${listing.publicId}` : 'Listing'}
        sub={
          <Link to="/market" className="text-steel">
            Back to browse
          </Link>
        }
      />
      {!listing ? (
        <Note tone="grey" testId="listing-not-available">
          {LABELS.L26}
        </Note>
      ) : (
        <div className="rounded-sm border border-rule bg-panel p-4">
          <ListingView listing={listing} />
        </div>
      )}
    </>
  )
}
