import { Link, useParams } from 'react-router'
import { useWorld, usePersona } from '../shared/hooks'
import { listingForProject } from '../../store/selectors'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { MERROWGATE_ID, PERSONA_IDS } from '../../domain/seed/world'
import { PageTitle, Note } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import { ListingView } from './ListingView'

export function Listing() {
  const { publicId } = useParams()
  const world = useWorld()
  const { persona } = usePersona()
  const project = persona.id === PERSONA_IDS.priya ? world.projects[MERROWGATE_ID] : null
  const listing = publicId ? listingForProject(world, project, publicId, A) : null
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
