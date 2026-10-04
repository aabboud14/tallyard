// Business model comparison (04 section 5.6, F12): for each deal confirmed in the session, agency, principal,
// the hybrid flag and the forward sale, each with the capital it employs.
import type { ReactNode } from 'react'
import { useWorld } from '../shared/hooks'
import { modelViews, type ModelView } from '../../store/selectors'
import { PageTitle, Panel, EmptyState, Table, Num, Dl, Note, Tag, RuleBased } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import type { FamilyId, World } from '../../domain/types'
import * as f from '../../domain/format'

function familyOfDeal(world: World, publicId: string): FamilyId | null {
  const deal = Object.values(world.deals).find((d) => d.lotPublicId === publicId)
  if (!deal) return null
  return world.items[world.lots[deal.lotId].itemId].family
}

function Model({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-sm border border-rule-soft p-3">
      <h3 className="font-display text-lg">{title}</h3>
      {children}
    </section>
  )
}

function DealComparison({ m, family }: { m: ModelView; family: FamilyId | null }) {
  const p = m.principal
  const guide = family ? f.unitPrice(p.testedGuide, family) : f.money(p.testedGuide)
  return (
    <Panel title={`Deal ${m.publicId}`} data-testid={`model-deal-${m.publicId}`}>
      <p className="mb-3 text-sm text-mill-text">
        Via {m.hubName}, storage for {f.months(m.storageMonths)}.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Model title="Agency">
          <p className="text-sm" data-testid="model-agency">
            {`Agency ${f.money(m.agency.total)}, no capital employed`}
          </p>
          <Dl
            rows={[
              { label: 'Commission', value: f.money(m.agency.commission) },
              { label: 'Storage brokerage', value: f.money(m.agency.storageBrokerage) },
              { label: 'Testing referral', value: f.money(m.agency.testingReferral) },
              { label: 'Transport margin', value: f.money(m.agency.transportMargin) },
              { label: 'Capital employed', value: 'None' },
            ]}
          />
        </Model>
        <Model title="Principal">
          <p className="text-sm" data-testid="model-principal">
            {`Principal: margin ${f.money(p.margin)} on capital of ${f.money(p.capital)} (${f.percent(p.returnRatio)})`}
          </p>
          <Table>
            <thead>
              <tr>
                <th>Part</th>
                <th className="text-right">Amount [£]</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Purchase</td>
                <Num>{f.money(p.purchase)}</Num>
              </tr>
              <tr>
                <td>Sale at the tested guide of {guide}</td>
                <Num>{f.money(p.sale)}</Num>
              </tr>
              <tr>
                <td>Costs</td>
                <Num>{f.money(p.costs)}</Num>
              </tr>
              <tr className="font-medium">
                <td>Margin</td>
                <Num>{f.money(p.margin)}</Num>
              </tr>
              <tr>
                <td>Capital employed</td>
                <Num>{f.money(p.capital)}</Num>
              </tr>
              <tr>
                <td>Return on capital</td>
                <Num>{f.percent(p.returnRatio)}</Num>
              </tr>
            </tbody>
          </Table>
          <Note tone="oxide" testId="label-L29">
            {LABELS.L29}
          </Note>
        </Model>
        <Model title="Hybrid flag">
          <p className="text-sm">
            <span data-testid="model-candidate">
              <Tag tone={p.candidateToBuy ? 'survey' : 'grey'}>{p.candidateToBuy ? 'Candidate to buy' : 'Not a candidate to buy'}</Tag>
            </span>
          </p>
          <Dl
            rows={[
              { label: 'Principal margin', value: `${f.number(p.multiple, 2)} times the agency deal total` },
              { label: 'Capital employed', value: p.candidateToBuy ? f.money(p.capital) : 'None' },
            ]}
          />
          <p className="text-xs text-mill-text">The flag is on when the market signal is High demand and the principal margin is at least the hybrid threshold on the Assumptions screen.</p>
          <RuleBased testId="label-L2" />
        </Model>
        <Model title="Forward sale">
          <p className="text-sm" data-testid="model-forward">
            {`Forward sale ${f.money(m.forward.total)}`}
          </p>
          <Dl
            rows={[
              { label: 'Agency deal total', value: f.money(m.agency.total) },
              { label: 'Matching fee', value: f.money(m.forward.matchingFee) },
              { label: 'Capital employed', value: 'None' },
            ]}
          />
          <p className="text-xs text-mill-text">The sale is agreed before deconstruction, so the donor pays no storage and the platform holds no stock.</p>
          <Note tone="survey" testId="label-L30">
            {LABELS.L30}
          </Note>
        </Model>
      </div>
    </Panel>
  )
}

export function Models() {
  const world = useWorld()
  const views = modelViews(world)
  return (
    <>
      <PageTitle title="Model comparison" sub="Agency, principal, hybrid flag and forward sale for each deal confirmed in this session." />
      {views.length === 0 ? (
        <div data-testid="models-empty">
          <EmptyState hint="Confirm a deal to compare models." />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {views.map((m, i) => (
            <DealComparison key={`${m.publicId}-${i}`} m={m} family={familyOfDeal(world, m.publicId)} />
          ))}
        </div>
      )}
    </>
  )
}
