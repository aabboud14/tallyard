// About (04 section 5.7): what the prototype is, what is real and what is simulated, the AI steps and the rules
// that stand in for them, limits, what is not covered, and the open questions for the founder.
import type { ReactNode } from 'react'
import { PageTitle, Panel, Table } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import { OPEN_QUESTIONS } from '../../domain/reference/openQuestions'
import { PRODUCT_NAME } from '../../domain/constants'

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
      <PageTitle title="About" sub={`${PRODUCT_NAME}, prototype v0.5.`} />
      <div className="flex flex-col gap-4">
        <Panel>
          <p className="text-sm">
            {PRODUCT_NAME} is a clickable prototype of a marketplace for salvaged construction materials, with the data and tools around it for reuse planning and sustainability reporting. It runs from one file in one browser on sample data, and a fixed, transparent rule stands in for every step
            the concept gives to AI.
          </p>
        </Panel>
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
