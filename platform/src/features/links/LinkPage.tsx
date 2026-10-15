// A share link (/app/links/:linkId), for anyone signed in. Placeholder until the screen is built from linkView;
// the route, access check, data and actions (openShareLink) are in place.
import { PageHeader } from '../../ui'
import { Page } from '../../app/Page'

export function LinkPage() {
  return (
    <Page testId="link-page">
      <PageHeader title="Shared with you by link" subtitle="This page is being built." />
    </Page>
  )
}

export default LinkPage
