// About (04 section 5.7): what the prototype is, what is real and what is simulated, the AI steps and the rules
// that stand in for them, limits, what is not covered, and the open questions for the founder.
import type { ReactNode } from 'react'
import { PageTitle, Panel, Table } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import { OPEN_QUESTIONS } from '../../domain/reference/openQuestions'
import { PRODUCT_NAME } from '../../domain/constants'

const AUDIENCE: { tier: string; who: string; need: string }[] = [
  { tier: 'Active users', who: 'Developers and asset owners, deconstruction contractors, main contractors, waste management firms, manufacturers with surplus stock, property managers.', need: 'They list, buy or sell. In this prototype they pay a subscription, plus commission and service fees on transactions.' },
  { tier: 'Passive users', who: 'Architects and designers, structural and services engineers, sustainability consultants.', need: 'They do not trade. They need the data to deliver their own service: dimensions and materiality from the earliest design stages, and the carbon and reuse figures for compliance. Whether they pay is an open question.' },
]

const JOURNEY =
  'One developer has a building to take down. It is surveyed and the materials go on the platform, either by the owner or by a consultant on their behalf. A second developer, or the architect and sustainability consultant it appoints, finds those materials at RIBA Stages 1 and 2 and designs around their real dimensions. The consultant sets carbon and circularity targets at inception and refines them through planning to certification. The main contractor prices its bid on the same data. The materials are stored between the two programmes, tested, delivered and built in, and the project proves what it reused to the council and the certification bodies. The twelve demo steps walk this path once.'

const REVENUE: { stream: string; conceived: string; modelled: string }[] = [
  { stream: 'Subscriptions', conceived: 'Both tiers of user.', modelled: 'An annual figure on the ledger: suppliers, buyer organisations and professional seats.' },
  { stream: 'Commission on sales', conceived: 'A cut of each transaction.', modelled: '8% of the material price, on every confirmed deal.' },
  { stream: 'Storage brokerage', conceived: 'A share of partner storage fees.', modelled: '10% of storage and handling fees.' },
  { stream: 'Testing and survey services', conceived: 'On-site testing and sampling, surveys.', modelled: 'Testing as a 10% referral; survey not simulated.' },
  { stream: 'Data and market insights', conceived: 'Material demand sold to manufacturers; building vacancy and pipeline insight for real estate.', modelled: 'Left out on purpose. Selling pipeline data conflicts with keeping pipelines private; a placeholder ledger line stands in for it.' },
]

const INTEGRATIONS: { item: string; conceived: string; here: string }[] = [
  { item: 'Phone app', conceived: 'Photos and materials added on site.', here: 'Capture works at phone width with the device camera; photos are re-encoded so no metadata is stored.' },
  { item: 'BIM and CAD', conceived: 'Dimensions flow into the designers\' models.', here: 'A stub. The schedule import behind it is a real CSV parser.' },
  { item: 'Spreadsheets', conceived: 'The consultants\' working tools.', here: 'Real: the demolition bill is read from a workbook and both compliance workbooks are written with formulas.' },
  { item: 'Outputs before planning', conceived: 'Reports, presentations and schedules.', here: 'An A4 print of the compliance screen and the two workbooks. No presentation output.' },
  { item: 'Outputs after approval', conceived: 'The 3D model, detailed plans and the evidence uploaded to the certification platforms.', here: 'Not covered. The certification mapping shows which sheet feeds which requirement.' },
]

const REAL = ['The calculations: mass, carbon, prices, package costs, priority, disclosure score, waste rates, content by value and platform revenue.', 'The privacy projections: the public listing and the blind buyer.', 'Schedule matching.', 'Spreadsheet import and export.', 'Text parsing in Capture Assist and the bill import.']

const SIMULATED = ['The negotiation and logistics agents, which follow scripted rules.', 'Haulier quotes.', 'Partner services: storage, testing and survey.', 'The deposit.', 'The identity exchange on confirmation.', 'The confidentiality step.', 'Client sign-off.']

const AI_STEPS: { step: string; rule: string }[] = [
  { step: 'Categorising materials', rule: 'Capture Assist (F14) parses the note into fields, and the bill import (F13) maps each row to a waste stream by code and keyword.' },
  { step: 'Ranking and suggesting what to recover first', rule: 'The deconstruction priority score (F6): fixed weights on net value, carbon, demand and ease.' },
  { step: 'Dynamic pricing', rule: 'Price guidance (F5): the new price, a base reuse ratio and fixed factors for condition, test status and the market signal.' },
  { step: 'Estimating embodied carbon where the seller has none', rule: 'Upfront carbon avoided (F2): published and indicative factors per family, fixed transport distances.' },
  { step: 'Negotiating', rule: 'The negotiation agent (F9): a scripted protocol with a fixed concession rate and a move limit.' },
  { step: 'Arranging transport', rule: 'The logistics rule: each haulier is quoted at fixed plus rate times distance, and the cheapest that meets the dates is booked.' },
  { step: 'Choosing stock to buy', rule: 'The hybrid flag (F12): High demand and a principal margin of at least the threshold times the agency revenue.' },
  { step: 'Generating reports', rule: 'Templates and formulas: the workbooks and the report are filled from the same domain functions as the screens.' },
]

const LIMITS = [
  'All data sits in one browser. There is no backend, and nothing leaves the machine.',
  'The role switcher and the Assumptions screen are demonstration devices. A real service would not let one person switch between organisations or read every parameter.',
  'A scripted, published negotiation protocol is not a secure negotiation. Anyone who reads the rules can predict the agent.',
  '"Private matching only" means "not in Browse", and the confidentiality step is simulated.',
  'A full structural frame listed at region and quarter level may still be identifiable to someone who knows the local stock.',
  'A reduced quantity on a listing shows that part of a lot has sold.',
  'A seller can infer coarse demand from the signal on their own items.',
  'The operator is a trusted party. Operator screens label deals by public ID and show no building names, addresses or tenants, but the operator can still derive prices and distances from the ledger.',
  'An adviser acting for both a buyer and a seller is outside the model.',
  "The founder's notes give rent uplift for sustainable buildings and ESG-backed investment as the developer's motive. No rent or yield figure appears here because none has been verified.",
  'A real service would enforce all of this on a server.',
]

const NOT_COVERED = [
  'A backend, user accounts, permissions, notifications, payments, deposits and escrow.',
  'Real AI model calls and real partner integrations.',
  'Maps, native mobile apps, other languages, dark mode.',
  'Material passports with QR codes or NFC tags, and digital twins.',
  'Requesting a survey or a testing visit from a partner.',
  'Storage owned by the platform (only partner storage is modelled).',
  'Comparisons with, or figures about, other reuse platforms.',
  'Rent premium and rental yield figures for sustainable buildings (unverified).',
  'Vacancy and future pipeline insights as a data product.',
]

function List({ items, testId }: { items: string[]; testId: string }) {
  return (
    <ul className="list-disc pl-5 text-sm" data-testid={testId}>
      {items.map((x) => (
        <li key={x} className="py-0.5">
          {x}
        </li>
      ))}
    </ul>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Panel title={title} id={id} data-testid={id}>
      {children}
    </Panel>
  )
}

/** Question groups with continuous numbering across groups. */
const QUESTION_GROUPS = OPEN_QUESTIONS.reduce<{ group: string; items: string[]; start: number }[]>((acc, g) => {
  const prev = acc[acc.length - 1]
  const start = prev ? prev.start + prev.items.length : 1
  return [...acc, { ...g, start }]
}, [])

export function About() {
  return (
    <>
      <PageTitle title="About" sub={`${PRODUCT_NAME}, prototype version 1.0.`} />
      <div className="flex flex-col gap-4">
        <Panel>
          <p className="text-sm">
            {PRODUCT_NAME} is a clickable prototype of a marketplace for salvaged construction materials, with the data and tools around it for reuse planning and sustainability reporting. It runs from one file in one browser on sample data, and a fixed, transparent rule stands in for every step
            the concept gives to AI.
          </p>
        </Panel>
        <Section id="about-concept" title="The concept in full">
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <h3 className="mb-1 font-semibold">Who it is for</h3>
              <Table>
                <tbody>
                  {AUDIENCE.map((a) => (
                    <tr key={a.tier}>
                      <td className="w-[18%] font-medium">{a.tier}</td>
                      <td className="w-[40%]">{a.who}</td>
                      <td>{a.need}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">The journey</h3>
              <p data-testid="about-journey">{JOURNEY}</p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Revenue as conceived and as modelled here</h3>
              <Table>
                <thead>
                  <tr>
                    <th className="w-[22%]">Stream</th>
                    <th className="w-[36%]">In the concept</th>
                    <th>In this prototype</th>
                  </tr>
                </thead>
                <tbody>
                  {REVENUE.map((r) => (
                    <tr key={r.stream}>
                      <td className="font-medium">{r.stream}</td>
                      <td>{r.conceived}</td>
                      <td>{r.modelled}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Integrations and outputs</h3>
              <Table>
                <thead>
                  <tr>
                    <th className="w-[22%]">Item</th>
                    <th className="w-[36%]">In the concept</th>
                    <th>In this prototype</th>
                  </tr>
                </thead>
                <tbody>
                  {INTEGRATIONS.map((r) => (
                    <tr key={r.item}>
                      <td className="font-medium">{r.item}</td>
                      <td>{r.conceived}</td>
                      <td>{r.here}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </Section>
        <div className="grid gap-4 md:grid-cols-2">
          <Section id="about-real" title="What is real">
            <List items={REAL} testId="about-real-list" />
          </Section>
          <Section id="about-simulated" title="What is simulated">
            <List items={SIMULATED} testId="about-simulated-list" />
          </Section>
        </div>
        <Section id="about-ai-steps" title="AI steps in the concept and the rules that stand in for them">
          <Table>
            <thead>
              <tr>
                <th className="w-[22%]">AI step in the concept</th>
                <th>Rule in this prototype</th>
                <th className="w-[24%]">Label</th>
              </tr>
            </thead>
            <tbody>
              {AI_STEPS.map((r) => (
                <tr key={r.step}>
                  <td className="font-medium">{r.step}</td>
                  <td>{r.rule}</td>
                  <td className="text-xs text-mill-text">{LABELS.L2}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
        <Section id="about-limits" title="Limits">
          <List items={LIMITS} testId="about-limits-list" />
        </Section>
        <Section id="about-not-covered" title="Not covered">
          <List items={NOT_COVERED} testId="about-not-covered-list" />
        </Section>
        <Panel>
          <p className="text-sm font-medium" data-testid="about-fictional">
            Every company, person, building and address in this prototype is fictional.
          </p>
        </Panel>
        <Section id="about-questions" title="Open questions for the founder">
          <div className="flex flex-col gap-3">
            {QUESTION_GROUPS.map((g) => (
              <div key={g.group}>
                <h3 className="mb-1 text-sm font-semibold">{g.group}</h3>
                <ol className="list-decimal pl-6 text-sm" start={g.start}>
                  {g.items.map((q) => (
                    <li key={q} className="py-0.5">
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}
