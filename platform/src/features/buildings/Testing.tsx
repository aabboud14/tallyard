// The building's Testing tab (/app/buildings/:buildingId/testing), for the owner and the surveyor. Placeholder until
// the screen is built from testingView and testingDraftOptions; the route, access check, data and actions are in place.
import { PageHeader } from '../../ui'

export function Testing() {
  return (
    <div data-testid="testing">
      <PageHeader title="Testing" subtitle="This page is being built." />
    </div>
  )
}

export default Testing
