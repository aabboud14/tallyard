// Certification (/app/projects/:id/certification), the consultant's page: credits per scheme and the materials mapped to them, from certificationView.
// Placeholder until the screen is built; the route, access check and view model are in place.
import { PageHeader } from '../../ui'
import { Page } from '../../app/Page'

export function Certification() {
  return (
    <Page testId="certification-page" className="lg:pt-7">
      <PageHeader title="Certification" subtitle="This page is being built." />
    </Page>
  )
}

export default Certification
