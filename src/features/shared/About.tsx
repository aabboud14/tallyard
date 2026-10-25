// About (04 section 5.7, 09 sections 3.6, 12 and 13): what the prototype is, what is real, what is rule-based and
// indicative, what is simulated, what is version 2, the AI steps and the rules that stand in for them, limits,
// what is not covered, and the open questions.
import type { ReactNode } from 'react'
import { PageTitle, Panel, Table } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import { OPEN_QUESTIONS } from '../../domain/reference/openQuestions'
import { PRODUCT_NAME } from '../../domain/constants'

const AUDIENCE: { tier: string; who: string; need: string }[] = [
  {
    tier: 'Active users',
    who: 'Developers and asset owners, deconstruction contractors, main contractors, waste management firms, manufacturers with surplus stock, property managers.',
    need: 'They list, buy or sell. In this prototype they pay a subscription, plus commission and service fees on transactions.',
  },
  {
    tier: 'Passive users',
    who: 'Architects and designers, structural and services engineers, sustainability consultants.',
    need: 'They do not trade. They need the data to deliver their own service: dimensions and materiality from the earliest design stages, and the carbon and reuse figures for compliance. Whether they pay is an open question.',
  },
]

const JOURNEY =
  'One developer has a building to take down. It is surveyed and the materials go on the platform, either by the owner or by a consultant on their behalf. A second developer, or the architect and sustainability consultant it appoints, finds those materials at RIBA Stages 1 and 2 and designs around their real dimensions. The consultant sets carbon and circularity targets at inception and refines them through planning to certification. The main contractor prices its bid on the same data. The materials are stored between the two programmes, tested, delivered and built in, and the project proves what it reused to the council and the certification bodies. The twelve demo steps walk this path once.'

const REVENUE: { stream: string; conceived: string; modelled: string }[] = [
  {
    stream: 'Subscriptions',
    conceived: 'Both tiers of user.',
    modelled: 'An annual figure on the ledger: suppliers, buyer organisations and professional seats.',
  },
  {
    stream: 'Commission on sales',
    conceived: 'A cut of each transaction.',
    modelled: '8% of the material price, on every confirmed deal.',
  },
  {
    stream: 'Storage brokerage',
    conceived: 'A share of partner storage fees.',
    modelled: '10% of storage and handling fees.',
  },
  {
    stream: 'Testing and survey services',
    conceived: 'On-site testing and sampling, surveys.',
    modelled: 'Testing as a 10% referral; survey not simulated.',
  },
  {
    stream: 'Data and market insights',
    conceived: 'Material demand sold to manufacturers; building vacancy and pipeline insight for real estate.',
    modelled: 'Left out on purpose. Selling pipeline data conflicts with keeping pipelines private; a placeholder ledger line stands in for it.',
  },
]

const INTEGRATIONS: { item: string; conceived: string; here: string }[] = [
  {
    item: 'Phone app',
    conceived: 'Photos and materials added on site.',
    here: 'Capture works at phone width with the device camera; photos are re-encoded so no metadata is stored.',
  },
  {
    item: 'BIM and CAD',
    conceived: "Dimensions flow into the designers' models.",
    here: 'Geometry files from the recorded dimensions: a 2D profile (DXF) and a simple 3D solid (OBJ). A BIM family (IFC or Revit) and matching a BIM model against the marketplace are version 2.',
  },
  {
    item: 'Spreadsheets',
    conceived: "The consultants' and architects' working tools.",
    here: 'Real: the demolition bill is read from a workbook, both compliance workbooks are written with formulas, and the spec sheet is written as a workbook.',
  },
  {
    item: 'Outputs before planning',
    conceived: 'Reports, presentations and schedules.',
    here: 'A4 prints of the compliance screen and the spec sheet, the spec sheet workbook and the two compliance workbooks. No presentation output.',
  },
  {
    item: 'Outputs after approval',
    conceived: 'The 3D model, detailed plans and the evidence uploaded to the certification platforms.',
    here: 'Not covered. The certification mapping shows which sheet feeds which requirement.',
  },
]

const ROLES: { role: string; here: string }[] = [
  {
    role: 'Architect',
    here: 'Browses the marketplace by typology, saves to a wish list per project, checks timing against the project, exports the spec sheet and downloads geometry. Never makes a deal.',
  },
  {
    role: 'Asset owner (client)',
    here: "Approves or declines the architect's wish list, and runs the reuse plan, negotiation, deals and delivery for the project.",
  },
  {
    role: 'Site surveyor',
    here: 'Captures materials and their expected availability, per client and building.',
  },
  {
    role: 'Asset owner (selling)',
    here: 'Decides what to recover, what is visible and when it is available, shares privately with selected projects and approves offers.',
  },
  {
    role: 'Sustainability consultant',
    here: 'Reads the wish list for its carbon and runs the compliance and waste outputs. To be refined with the partner.',
  },
  {
    role: 'Platform operator',
    here: 'Reads the revenue ledger and the business model comparison.',
  },
]

const REAL = [
  'The calculations: mass, carbon, prices, package costs, priority, disclosure score, waste rates, content by value and platform revenue.',
  'The privacy projections: the public listing and the blind buyer.',
  'Access by role: each persona sees only their own clients, buildings, projects and engagements.',
  'Wish lists per project and the general saved list, with their states: pending, sent to client, approved, declined.',
  'Browse filters and sorting.',
  'The spec sheet workbook and its print view, and the geometry files.',
  'Schedule matching for the sample steel schedule.',
  'Spreadsheet import and export.',
  'Text parsing in Capture Assist and the bill import.',
]

const INDICATIVE: { item: string; how: string; label: string }[] = [
  {
    item: 'Sustainability band',
    how: "High, Medium or Low from the share of the new product's carbon avoided, by fixed placeholder thresholds; Not claimed for unused surplus. The office's diagram will replace it.",
    label: LABELS.L37,
  },
  {
    item: 'Timeline check',
    how: 'The public availability window against the date materials are needed on site, with a fixed tight band and the months of storage implied.',
    label: LABELS.L38,
  },
  {
    item: 'Geometry',
    how: 'Steel profiles with square corners from the section table; panels, bricks and floor tiles as dimensioned rectangles or boxes. Timber joists have no recorded section, so no file.',
    label: LABELS.L42,
  },
  {
    item: 'Decision tree route',
    how: "The priority ranking's two routes shown on the five-step UK decision tree.",
    label: LABELS.L41,
  },
  {
    item: 'Illustrations',
    how: 'A picture drawn from the survey record when a lot has no public photo.',
    label: LABELS.L36,
  },
]

const SIMULATED = [
  'The negotiation and logistics agents, which follow scripted rules.',
  'Haulier quotes.',
  'Partner services: storage, testing and survey.',
  'The deposit.',
  'The identity exchange on confirmation.',
  'The confidentiality step.',
]

const VERSION_2: { item: string; here: string }[] = [
  {
    item: 'Matching an uploaded BIM model or steel schedule against the whole marketplace',
    here: "Shown greyed in the architect's project. The steel schedule matcher from version 0.5 still runs in the client's workspace, labelled advanced, and matches the sample schedule only.",
  },
  {
    item: 'BIM family download (IFC or Revit)',
    here: 'Shown greyed on the listing. The 2D and 3D geometry files work.',
  },
]

const AI_STEPS: { step: string; rule: string }[] = [
  {
    step: 'Categorising materials',
    rule: 'Capture Assist (F14) parses the note into fields, and the bill import (F13) maps each row to a waste stream by code and keyword.',
  },
  {
    step: 'Ranking and suggesting what to recover first',
    rule: 'The deconstruction priority score (F6): fixed weights on net value, carbon, demand and ease.',
  },
  {
    step: 'Dynamic pricing',
    rule: 'Price guidance (F5): the new price, a base reuse ratio and fixed factors for condition, test status and the market signal.',
  },
  {
    step: 'Estimating embodied carbon where the seller has none',
    rule: 'Upfront carbon avoided (F2): published and indicative factors per family, fixed transport distances.',
  },
  {
    step: 'Negotiating',
    rule: 'The negotiation agent (F9): a scripted protocol with a fixed concession rate and a move limit.',
  },
  {
    step: 'Arranging transport',
    rule: 'The logistics rule: each haulier is quoted at fixed plus rate times distance, and the cheapest that meets the dates is booked.',
  },
  {
    step: 'Choosing stock to buy',
    rule: 'The hybrid flag (F12): High demand and a principal margin of at least the threshold times the agency revenue.',
  },
  {
    step: 'Generating reports',
    rule: 'Templates and formulas: the workbooks and the report are filled from the same domain functions as the screens.',
  },
]

const LIMITS = [
  'All data sits in one browser. There is no backend, and nothing leaves the machine.',
  'The role switcher and the Assumptions screen are demonstration devices. A real service would not let one person switch between organisations or read every parameter.',
  'A scripted, published negotiation protocol is not a secure negotiation. Anyone who reads the rules can predict the agent.',
  '"Shared privately with selected projects" means "not in Browse": only the projects the owner approves can see the lot, and the confidentiality step is simulated.',
  'The owner sees a shared project only as a blind line: organisation type, project type, region and the quarter it needs materials by.',
  'A full structural frame listed at region and quarter level may still be identifiable to someone who knows the local stock.',
  'A reduced quantity on a listing shows that part of a lot has sold.',
  'A seller can infer coarse demand from the signal on their own items.',
  'The operator is a trusted party. Operator screens label deals by public ID and show no building names, addresses or tenants, but the operator can still derive prices and distances from the ledger.',
  'An adviser acting for both a buyer and a seller is outside the model.',
  "The founder's notes give rent uplift for sustainable buildings and ESG-backed investment as the developer's motive. No rent or yield figure appears here because none has been verified.",
  'The band thresholds, the tight band in the timeline check and the spec sheet columns are placeholders until the office sends its own.',
  'A real service would enforce all of this, including access by role, on a server.',
]

const NOT_COVERED = [
  'A backend, user accounts, permissions, notifications, payments, deposits and escrow.',
  'Real AI model calls and real partner integrations.',
  'Maps, native mobile apps, other languages, dark mode.',
  'Material passports with QR codes or NFC tags, and digital twins.',
  'Requesting a survey or a testing visit from a partner.',
  'Storage owned by the platform (only partner storage is modelled).',
  'Comparisons with, or figures about, other reuse platforms.',
  "The contractor's role, the bid pack and the design team summary from version 0.5.",
  "Targets in the consultant's wish list review: it reads the list by state and nothing more.",
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

/** Open with the partner after the version 1.0 calls (09 sections 12 and 13.4). No vendor names. */
const V1_QUESTIONS = {
  group: 'Open with the partner after the version 1.0 calls',
  items: [
    'The product name. The partner says the current name is already taken and will propose another.',
    "The office's specification template, which replaces the first cut of the spec sheet columns.",
    'Screenshots of the tools the office uses today.',
    "The office's sustainability diagram, which replaces the placeholder band.",
    'The list of UK and London frameworks and the decision tree the office works to.',
    "The sustainability consultant's workflow, for the next call.",
    "Which to test first, the marketplace or the architect's workflow, and how finding materials connects to the tools architects already use.",
    'Whether the engineer or the testing partner gets a role as the spec sheet grows through the stages.',
    'Whether a life cycle assessment database with Environmental Product Declarations becomes the carbon source, as an integration in version 2 or later.',
    "Should the owner see which practice a shared project's architect is?",
    "The reuse plan, package, negotiation and logistics on the client's side: keep, simplify or drop. The partner questioned the reuse plan on the second call.",
  ],
}

/** Question groups with continuous numbering across groups. */
const QUESTION_GROUPS = [V1_QUESTIONS, ...OPEN_QUESTIONS].reduce<{ group: string; items: string[]; start: number }[]>((acc, g) => {
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
            {PRODUCT_NAME} is a working prototype of a marketplace for salvaged construction materials, with the workflow around it for each role on a project. Version 1.0 starts with the architect:
            browse, wish lists per project, the timeline check, spec sheets and geometry. Decision rights are fixed: the architect chooses, the asset owner approves, buys and controls what is visible.
            It runs from one file in one browser on sample data, and a fixed, transparent rule stands in for every step the concept gives to AI.
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
        <Section id="about-roles" title="Roles in version 1.0">
          <Table>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r.role}>
                  <td className="w-[24%] font-medium">{r.role}</td>
                  <td>{r.here}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
        <div className="grid gap-4 md:grid-cols-2">
          <Section id="about-real" title="What is real">
            <List items={REAL} testId="about-real-list" />
          </Section>
          <Section id="about-simulated" title="What is simulated">
            <List items={SIMULATED} testId="about-simulated-list" />
          </Section>
        </div>
        <Section id="about-indicative" title="Rule-based and indicative">
          <Table data-testid="about-indicative-list">
            <thead>
              <tr>
                <th className="w-[18%]">Item</th>
                <th>How it works here</th>
                <th className="w-[30%]">Label on screen</th>
              </tr>
            </thead>
            <tbody>
              {INDICATIVE.map((r) => (
                <tr key={r.item}>
                  <td className="font-medium">{r.item}</td>
                  <td>{r.how}</td>
                  <td className="text-xs text-mill-text">{r.label}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
        <Section id="about-version-2" title="Version 2">
          <p className="mb-2 text-sm text-mill-text" data-testid="label-L35">
            {LABELS.L35}
          </p>
          <Table data-testid="about-version-2-list">
            <tbody>
              {VERSION_2.map((r) => (
                <tr key={r.item}>
                  <td className="w-[36%] font-medium">{r.item}</td>
                  <td>{r.here}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
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
        <Section id="about-questions" title="Open questions">
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
