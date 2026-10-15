// The circular economy statement (/app/projects/:id/statement), the consultant's page: generated sections, edits, sending for review and the Word export, from statementView.
// Placeholder until the screen is built; the route, access check and view model are in place.
import { PageHeader } from '../../ui'
import { Page } from '../../app/Page'

export function Statement() {
  return (
    <Page testId="statement-page" className="lg:pt-7">
      <PageHeader title="Circular economy statement" subtitle="This page is being built." />
    </Page>
  )
}

export default Statement
