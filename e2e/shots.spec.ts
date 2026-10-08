// npm run shots: the screenshots in 05 section 2.7, after runDemoSteps(1, 12), into docs/screens/.
import { test, open, go, setPersona, setUpTo } from './helpers'
import { TIVERNE_ID, MERROWGATE_ID, DURNLEY_ID } from '../src/domain/seed/world'

const P = { tom: 'per_tom', dana: 'per_dana', priya: 'per_priya', isla: 'per_isla', marcus: 'per_marcus', operator: 'per_operator' }
const out = (name: string) => `docs/screens/${name}.png`

test('screenshots after the full demo', async ({ page, entry }) => {
  test.setTimeout(300_000)
  await open(page, entry)
  await setUpTo(page, 12)
  await page.setViewportSize({ width: 1440, height: 900 })
  const shot = async (persona: string, route: string, name: string, before?: () => Promise<void>) => {
    await setPersona(page, persona)
    await go(page, route)
    await page.waitForSelector('main h1')
    if (before) await before()
    await page.screenshot({ path: out(name), fullPage: true })
  }
  await go(page, '/')
  await page.screenshot({ path: out('01-landing'), fullPage: true })
  await shot(P.tom, `/buildings/${TIVERNE_ID}/inventory`, '02-inventory')
  await shot(P.tom, `/buildings/${TIVERNE_ID}/priority`, '03-priority')
  await shot(P.tom, `/buildings/${TIVERNE_ID}/listings`, '04-listings-and-privacy', async () => {
    await page.getByTestId('select-lot-TH-01').click()
  })
  await shot(P.priya, '/market', '05-browse')
  await shot(P.priya, '/market/L-9F4CQQ', '06-listing-L-9F4CQQ')
  await shot(P.isla, `/projects/${MERROWGATE_ID}/match`, '07-match-schedule')
  await shot(P.isla, `/projects/${MERROWGATE_ID}/plan`, '08-reuse-plan-package')
  await shot(P.isla, `/projects/${MERROWGATE_ID}/plan`, '09-negotiation-thread', async () => {
    await page.getByTestId('negotiation-panel').scrollIntoViewIfNeeded()
  })
  await shot(P.tom, '/offers', '10-offers-and-deals')
  await shot(P.isla, `/projects/${MERROWGATE_ID}/deals`, '11-deals-custody')
  await shot(P.marcus, `/projects/${MERROWGATE_ID}/compliance`, '12-project-compliance')
  await shot(P.marcus, `/engagements/${DURNLEY_ID}/waste`, '13-waste-dashboard')
  await shot(P.marcus, `/engagements/${DURNLEY_ID}/waste`, '14-bill-review', async () => {
    await page.getByTestId('row-20-stream').scrollIntoViewIfNeeded()
  })
  await shot(P.operator, '/operator/ledger', '15-ledger')
  await shot(P.operator, '/operator/models', '16-model-comparison')
  await shot(P.operator, '/assumptions', '17-assumptions')
  await shot(P.operator, '/about', '18-about')
  await page.setViewportSize({ width: 390, height: 844 })
  await setPersona(page, P.dana)
  await go(page, `/buildings/${TIVERNE_ID}/capture`)
  await page.getByTestId('capture-text').fill('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
  await page.getByTestId('capture-assist').click()
  await page.screenshot({ path: out('19-capture-390'), fullPage: true })
})
