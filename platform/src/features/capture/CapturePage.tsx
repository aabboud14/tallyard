// Standalone capture (/app/capture): a building picker above the capture form, for surveyors and owners.
// Placeholder until the screen is built from captureTargets and the extracted capture form; the route, access
// check and data are in place.
import { PageHeader } from '../../ui'
import { Page } from '../../app/Page'

export function CapturePage() {
  return (
    <Page testId="capture-page">
      <PageHeader title="Capture" subtitle="This page is being built." />
    </Page>
  )
}

export default CapturePage
