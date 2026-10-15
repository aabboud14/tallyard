// Requirements (/app/projects/:id/requirements) for every side: status and evidence per requirement, from requirementsView. The architect reads; the client and the consultant edit.
// Placeholder until the screen is built; the route, access check and view model are in place.
import { PageHeader } from '../../ui'
import { Page } from '../../app/Page'

export function Requirements() {
  return (
    <Page testId="requirements-page" className="lg:pt-7">
      <PageHeader title="Planning and sustainability requirements" subtitle="This page is being built." />
    </Page>
  )
}

export default Requirements
