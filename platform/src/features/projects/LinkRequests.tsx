// Project requests (/app/projects/requests): architects ask before they add a client organisation to a project.
// Placeholder until the screen is built from clientLinkRequests; the route, access check and data are in place.
import { PageHeader } from '../../ui'
import { Page } from '../../app/Page'

export function LinkRequests() {
  return (
    <Page testId="link-requests">
      <PageHeader title="Project requests" subtitle="This page is being built." />
    </Page>
  )
}

/** Pending requests for the client home. Placeholder: renders nothing until the screen is built. */
export function PendingLinkRequests() {
  return null
}
