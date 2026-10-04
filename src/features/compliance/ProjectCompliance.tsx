// Project compliance for Merrowgate Wharf (04 section 5.5): content by value, avoided carbon, reclaimed mass,
// bill of materials, reused items, the stage checklist and the certification mapping. Prints to A4.
import { useState } from 'react'
import './print.css'
import { useWorld } from '../shared/hooks'
import { complianceView } from '../../store/selectors'
import { MERROWGATE_ID, BILL_LINE_NAMES } from '../../domain/seed/world'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { LABELS, TEST_STATUS_LABELS, SOURCE_TYPE_LABELS } from '../../domain/reference/labels'
import { CERTIFICATION_ROWS, STAGE_CHECKLIST, RIBA_STAGES } from '../../domain/reference/policy'
import { PageTitle, Panel, Table, Num, Tag, Button, Note, EmptyState } from '../../components/ui'
import { BulletChart } from '../../components/charts'
import * as f from '../../domain/format'
import { buildComplianceWorkbook, complianceFileName, downloadWorkbook } from './exports'

const CHART_MAX = 0.3

function aimText(ratio: number): string {
  return `Aim: at least ${f.number(ratio * 100)}%`
}

export function ProjectCompliance() {
  const world = useWorld()
  const c = complianceView(world, MERROWGATE_ID)
  const p = c.project
  const developer = world.orgs[p.developerOrgId]
  const [busy, setBusy] = useState(false)

  const exportWorkbook = async () => {
    setBusy(true)
    try {
      downloadWorkbook(await buildComplianceWorkbook(world), complianceFileName(world))
    } finally {
      setBusy(false)
    }
  }

  if (p.billOfMaterials.length === 0) {
    return (
      <>
        <PageTitle title={`${p.name}, project compliance`} />
        <EmptyState hint="A bill of materials for the project will put content by value here." />
      </>
    )
  }

  const familyLines = c.secured.lines.filter((l) => l.line.family !== null)

  return (
    <div className="compliance-report">
      <div className="report-title">
        <PageTitle
          title={`${p.name}, project compliance`}
          sub={`For ${developer.name}. RIBA Stage ${p.ribaStage}, ${RIBA_STAGES[p.ribaStage]}. GIA ${f.number(p.giaM2)} m2.`}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone="survey">
                <span data-testid="label-L17">{LABELS.L17}</span>
              </Tag>
              <Button variant="primary" onClick={exportWorkbook} disabled={busy} className="print-hide" data-testid="export-compliance">
                {busy ? 'Preparing workbook' : 'Export compliance workbook'}
              </Button>
            </div>
          }
        />
        <Note tone="steel" testId="label-L16" className="mb-4">
          {LABELS.L16}
        </Note>
      </div>

      <div className="report-grid grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Reused and recycled content by value">
          <p className="font-display text-2xl leading-tight" data-testid="content-secured">
            Reused and recycled content by value: {f.percent2(c.secured.percent)} secured
          </p>
          <div className="mt-3">
            <BulletChart value={c.secured.percent} target={A.contentAim} secondary={c.withPlan.percent} max={CHART_MAX} label="Secured, with the plan behind it" valueLabel={f.percent2(c.secured.percent)} targetLabel={aimText(A.contentAim)} secondaryLabel={`With plan ${f.percent2(c.withPlan.percent)}`} testId="content-chart" />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span data-testid="content-aim">{aimText(A.contentAim)}</span>
            <span data-testid="content-with-plan">With plan {f.percent2(c.withPlan.percent)}</span>
          </div>
          <h3 className="mb-1 mt-4 text-sm font-semibold">Contributions</h3>
          <Table data-testid="contributions">
            <thead>
              <tr>
                <th>Line</th>
                <th className="text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="font-medium" data-testid="content-without-reuse">
                  Without reuse {f.percent2(c.secured.withoutReuse)}
                </td>
              </tr>
              {familyLines.map((l) => (
                <tr key={l.line.id}>
                  <td>{BILL_LINE_NAMES[l.line.id] ?? l.line.element}</td>
                  <Num testId={`contribution-${l.line.id}`}>{f.contribution(l.points / 100)}</Num>
                </tr>
              ))}
              <tr className="font-medium">
                <td>Secured</td>
                <Num>{f.percent2(c.secured.percent)}</Num>
              </tr>
            </tbody>
          </Table>
          <p className="mt-2 text-xs text-mill-text" data-testid="label-L15">
            {LABELS.L15}
          </p>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Upfront carbon and reclaimed mass">
            <p data-testid="avoided-carbon">
              <span className="text-sm text-mill-text">Upfront carbon avoided against buying new (A1-A4): </span>
              <span className="font-display text-2xl">{f.carbon(c.avoidedT)}</span>
            </p>
            <Note tone="survey" testId="label-L11" className="mt-2">
              {LABELS.L11}
            </Note>
            <p className="mt-3" data-testid="reclaimed-mass">
              <span className="text-sm text-mill-text">Reclaimed material secured: </span>
              <span className="font-display text-2xl">{f.massT(c.reclaimedMassT)}</span>
            </p>
            <p className="text-xs text-mill-text">Stock mass actually received, not the baseline mass used for content by value.</p>
          </Panel>
          <Panel title="Circular Economy Statement stages">
            <Table>
              <tbody>
                {STAGE_CHECKLIST.map((s) => (
                  <tr key={s}>
                    <td>{s}</td>
                    <td className="whitespace-nowrap text-right">
                      <Tag tone="grey">to validate</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        </div>
      </div>

      <Panel title="Reused items" className="mt-4">
        {c.reusedItems.length === 0 ? (
          <EmptyState hint="Confirmed deals for the project appear here." />
        ) : (
          <Table data-testid="reused-items">
            <thead>
              <tr>
                <th>Public ID</th>
                <th>Description</th>
                <th>Quantity</th>
                <th className="text-right">Mass (t)</th>
                <th>Condition</th>
                <th>Test status</th>
                <th>Source type</th>
                <th>Region</th>
                <th>Provenance</th>
                <th>Deal status</th>
                <th>Handover</th>
                <th className="text-right">Avoided carbon (tCO2e)</th>
              </tr>
            </thead>
            <tbody>
              {c.reusedItems.map((it) => (
                <tr key={it.publicId} data-testid={`reused-${it.publicId}`}>
                  <td className="whitespace-nowrap font-display text-base">{it.publicId}</td>
                  <td>{it.description}</td>
                  <td className="whitespace-nowrap">{it.quantityLabel}</td>
                  <Num>{f.number(it.massT, 2)}</Num>
                  <td>{it.listing?.condition ?? ''}</td>
                  <td>{it.listing ? TEST_STATUS_LABELS[it.listing.testStatus] : ''}</td>
                  <td>{it.listing ? SOURCE_TYPE_LABELS[it.listing.sourceType] : ''}</td>
                  <td>{it.listing?.location.label ?? ''}</td>
                  <td data-testid="label-L23">{LABELS.L23}</td>
                  <td>
                    <Tag tone="teal">{it.status}</Tag>
                  </td>
                  <td className="whitespace-nowrap">{f.date(it.handoverDate)}</td>
                  <Num>{f.number(it.avoidedT, 1)}</Num>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="Bill of materials by building element and layer" className="mt-4">
        <Table data-testid="bill-of-materials">
          <thead>
            <tr>
              <th>Line</th>
              <th>Building element</th>
              <th>Layer</th>
              <th className="text-right">Mass (t)</th>
              <th className="text-right">Material value (£)</th>
              <th className="text-right">Recycled share of new</th>
              <th className="text-right">Reused content (% by value)</th>
              <th className="text-right">Recycled content (% by value)</th>
              <th className="text-right">Reused and recycled value (£)</th>
            </tr>
          </thead>
          <tbody>
            {c.secured.lines.map((l) => (
              <tr key={l.line.id} data-testid={`bom-${l.line.id}`}>
                <td>{BILL_LINE_NAMES[l.line.id] ?? l.line.id}</td>
                <td>{l.line.element}</td>
                <td className="whitespace-nowrap">{l.line.layer}</td>
                <Num>{f.number(l.line.massT, 1)}</Num>
                <Num>{f.moneyWhole(l.line.valueGbp)}</Num>
                <Num>{f.percent(l.line.recycledShare)}</Num>
                <Num>{f.percent2(l.reusedPercent)}</Num>
                <Num>{f.percent2(l.recycledPercent)}</Num>
                <Num>{f.money(l.reusedAndRecycledValue)}</Num>
              </tr>
            ))}
            <tr className="font-medium">
              <td>Total</td>
              <td></td>
              <td></td>
              <td></td>
              <Num>{f.moneyWhole(c.secured.totalValue)}</Num>
              <td></td>
              <td></td>
              <Num>{f.percent2(c.secured.percent)}</Num>
              <Num>{f.money(c.secured.totalContribution)}</Num>
            </tr>
          </tbody>
        </Table>
        <p className="mt-2 text-xs text-mill-text">Material values exclude labour. Lines tied to a marketplace family carry the reused content.</p>
      </Panel>

      <Panel title="Certification mapping" className="mt-4">
        <Table data-testid="certification-mapping">
          <thead>
            <tr>
              <th>Scheme and requirement</th>
              <th>What the workbook provides</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {CERTIFICATION_ROWS.filter((r) => r.workbook === 'compliance').map((r) => (
              <tr key={r.requirement}>
                <td>{r.requirement}</td>
                <td>{r.provides}</td>
                <td className="text-xs text-mill-text" data-testid="label-L19">
                  {LABELS.L19}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      <div className="mt-4 flex flex-col gap-2">
        <div className="print-only text-sm">
          <p>Method notes. {LABELS.L15} {LABELS.L11}</p>
          <p>{LABELS.L16}</p>
        </div>
        <Note tone="survey" testId="label-L20">
          {LABELS.L20}
        </Note>
      </div>
    </div>
  )
}
