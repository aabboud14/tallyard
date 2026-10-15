// Goals and targets (/app/projects/:id/targets), the consultant's page: default targets from the requirements, overrides and results, from goalsView.
// Placeholder until the screen is built; the route, access check and view model are in place.
import { PageHeader } from '../../ui'
import { Page } from '../../app/Page'

export function Targets() {
  return (
    <Page testId="targets-page" className="lg:pt-7">
      <PageHeader title="Goals and targets" subtitle="This page is being built." />
    </Page>
  )
}

export default Targets
