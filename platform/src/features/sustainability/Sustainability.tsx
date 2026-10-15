// The Sustainability tab (/app/projects/:id/sustainability) for every side, in place of Carbon. The full screen is
// being built from sustainabilityView; until then it keeps the carbon by status and by typology.
import { PageHeader } from '../../ui'
import { Page } from '../../app/Page'
import { CarbonSection } from '../carbon/ProjectCarbon'

export function Sustainability() {
  return (
    <Page testId="sustainability-page" className="lg:pt-7">
      <PageHeader title="Sustainability" subtitle="This page is being built." className="mb-6" />
      <CarbonSection />
    </Page>
  )
}

export default Sustainability
