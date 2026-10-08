// Project compliance for the sustainability consultant: reused and recycled content by value against the aim,
// avoided carbon and reclaimed mass, the reused items, the bill of materials and the certification mapping.
// Exports the workbook and prints to A4. Indicative, from public listings and the project's own records.
import { useState } from 'react'
import { useParams } from 'react-router'
import { FileSpreadsheet, Leaf, Printer, Scale } from 'lucide-react'
import './print.css'
import { LABELS } from '../../domain/reference/labels'
import { CERTIFICATION_ROWS, STAGE_CHECKLIST } from '../../domain/reference/policy'
import { formatDate } from '../../domain/dates'
import * as f from '../../domain/format'
import { selectors, useView } from '../../store'
import { complianceWorkbookModel, contentChart, OUTPUT_CAVEAT, type ContentChart } from '../../store/selectors/roles-views'
import type { ReusedItem } from '../../store/selectors/consultant'
import { Button, Callout, Card, CardBody, CardHeader, EmptyState, IndicativeMarker, Pill, Table, TBody, TD, TH, THead, TR, toast } from '../../ui'
import { Page } from '../../app/Page'
import { buildComplianceWorkbook, downloadFile } from './exports'

const ITEM_TONE: Record<ReusedItem['status'], 'brand' | 'info' | 'neutral'> = { Confirmed: 'brand', Reserved: 'info', Approved: 'neutral' }

function ComplianceBody() {
  const { projectId = '' } = useParams()
  const c = useView(selectors.complianceView, projectId)
  const m = useView(complianceWorkbookModel, projectId)
  const [busy, setBusy] = useState(false)
  if (!c) return null

  const exportWorkbook = async () => {
    setBusy(true)
    try {
      if (!m) throw new Error('Not available')
      const buffer = await buildComplianceWorkbook(m)
      downloadFile(buffer, m.fileName)
      toast.success('Workbook exported', { description: m.fileName })
    } catch {
      toast.error('The workbook could not be prepared. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const lines = c.secured.lines.filter((l) => l.line.family !== null)
  const chart = contentChart(c.secured.percent, c.withApproved.percent, c.aim)

  return (
    <div className="compliance-report flex flex-col gap-6" data-testid="compliance">
      <p className="m-0 hidden text-2xl font-semibold text-ink print:block">{c.header.name}, compliance</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="m-0 flex flex-wrap items-center gap-2 text-md font-semibold text-ink">
            Compliance
            <Pill tone="warning" size="sm" data-testid="label-L17">
              {LABELS.L17}
            </Pill>
          </h2>
          <p className="m-0 mt-0.5 text-sm text-muted">{LABELS.L16}</p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <Button icon={Printer} onClick={() => window.print()} data-testid="print-compliance">
            Print
          </Button>
          <Button variant="primary" icon={FileSpreadsheet} loading={busy} onClick={exportWorkbook} data-testid="export-compliance">
            Export workbook
          </Button>
        </div>
      </div>

      <div className="report-grid grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="avoid-break">
          <CardHeader title="Reused and recycled content by value" icon={Scale} actions={<IndicativeMarker />} />
          <CardBody className="flex flex-col gap-5">
            {c.hasBill ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="m-0 text-sm text-muted">Secured</p>
                    <p className="m-0 text-4xl font-semibold tabular-nums text-ink" data-testid="content-secured">
                      {f.percent2(c.secured.percent)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="m-0 text-muted">Aim</p>
                    <p className="m-0 font-semibold tabular-nums text-ink">{chart.aimLabel}</p>
                  </div>
                </div>
                <BulletChart chart={chart} label={`Secured ${f.percent2(c.secured.percent)}, with approved ${f.percent2(c.withApproved.percent)}, aim ${chart.aimLabel.toLowerCase()}`} />
                <dl className="m-0 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <span aria-hidden="true" className="size-2 rounded-full bg-brand-600" />
                      Secured
                    </dt>
                    <dd className="m-0 font-medium tabular-nums">{f.percent2(c.secured.percent)}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <span aria-hidden="true" className="size-2 rounded-full bg-brand-200" />
                      With approved
                    </dt>
                    <dd className="m-0 font-medium tabular-nums">{f.percent2(c.withApproved.percent)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Without reuse</dt>
                    <dd className="m-0 font-medium tabular-nums" data-testid="content-without-reuse">
                      {f.percent2(c.secured.withoutReuse)}
                    </dd>
                  </div>
                </dl>
                {lines.length > 0 ? (
                  <div>
                    <p className="m-0 mb-1.5 text-sm font-medium text-ink">Contribution of reuse, by line</p>
                    <ul className="m-0 list-none divide-y divide-line-soft rounded-lg border border-line-soft p-0">
                      {lines.map((l, i) => (
                        <li key={l.line.id} className="flex items-center justify-between gap-3 px-3 py-2 text-base">
                          <span className="min-w-0 truncate text-ink-soft">{c.billLines.find((b) => b.id === l.line.id)?.name ?? l.line.element}</span>
                          <span className="shrink-0 font-medium tabular-nums text-ink" data-testid={`contribution-${i}`}>
                            {f.signedPoints(l.points)} points
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="m-0 text-xs text-muted">{LABELS.L15}</p>
              </>
            ) : (
              <EmptyState variant="inline" icon={Scale} title="No bill of materials yet" text="Content by value needs the project's bill of materials. Avoided carbon and reused items are still counted below." />
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="avoid-break">
            <CardHeader title="Upfront carbon and reclaimed mass" icon={Leaf} actions={<IndicativeMarker />} />
            <CardBody className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="m-0 text-sm text-muted">Avoided, secured</p>
                  <p className="m-0 text-2xl font-semibold tabular-nums text-ink" data-testid="avoided-carbon">
                    {f.number(c.avoidedT, 1)} <span className="text-base font-medium text-muted">tCO2e</span>
                  </p>
                </div>
                <div>
                  <p className="m-0 text-sm text-muted">Reclaimed, secured</p>
                  <p className="m-0 text-2xl font-semibold tabular-nums text-ink" data-testid="reclaimed-mass">
                    {f.number(c.reclaimedMassT, 1)} <span className="text-base font-medium text-muted">t</span>
                  </p>
                </div>
              </div>
              <p className="m-0 text-xs text-muted">{LABELS.L11}</p>
            </CardBody>
          </Card>
          <Card className="avoid-break">
            <CardHeader title="Circular Economy Statement stages" />
            <ul className="m-0 list-none divide-y divide-line-soft p-0">
              {STAGE_CHECKLIST.map((s) => (
                <li key={s} className="flex items-start justify-between gap-3 px-4 py-3 text-sm text-ink-soft sm:px-5">
                  <span>{s}</span>
                  <Pill size="sm" className="shrink-0">
                    To validate
                  </Pill>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <section aria-labelledby="reused-title" className="flex flex-col gap-3">
        <h3 id="reused-title" className="m-0 text-md font-semibold text-ink">
          Reused items
        </h3>
        {c.reusedItems.length === 0 ? (
          <EmptyState variant="inline" title="No reused items yet" text="Earlier deals, accepted reservations and approved materials appear here." />
        ) : (
          <Table caption="Reused items" density="compact" data-testid="reused-items">
            <THead>
              <tr>
                <TH>Public ID</TH>
                <TH>Description</TH>
                <TH>Quantity</TH>
                <TH align="right">Mass</TH>
                <TH>Status</TH>
                <TH>Date</TH>
                <TH align="right">Avoided carbon</TH>
              </tr>
            </THead>
            <TBody>
              {c.reusedItems.map((it) => (
                <TR key={`${it.publicId}-${it.source}`}>
                  <TD className="whitespace-nowrap font-medium tabular-nums">{it.publicId}</TD>
                  <TD>{it.description}</TD>
                  <TD muted className="whitespace-nowrap">
                    {it.quantityLabel}
                  </TD>
                  <TD align="right" className="whitespace-nowrap">
                    {f.massT(it.massT)}
                  </TD>
                  <TD>
                    <Pill tone={ITEM_TONE[it.status]} dot size="sm">
                      {it.status}
                    </Pill>
                  </TD>
                  <TD muted className="whitespace-nowrap">
                    {it.date ? formatDate(it.date) : ''}
                  </TD>
                  <TD align="right" className="whitespace-nowrap">
                    {f.carbon(it.avoidedT)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <p className="m-0 text-xs text-muted">Approved materials are not yet secured: they count in "With approved" only.</p>
      </section>

      {c.hasBill ? (
        <section aria-labelledby="bom-title" className="flex flex-col gap-3">
          <h3 id="bom-title" className="m-0 text-md font-semibold text-ink">
            Bill of materials
          </h3>
          <Table caption="Bill of materials" density="compact" data-testid="bill-of-materials">
            <THead>
              <tr>
                <TH>Line</TH>
                <TH>Layer</TH>
                <TH align="right">Mass</TH>
                <TH align="right">Value</TH>
                <TH align="right">Recycled share</TH>
                <TH align="right">Reused</TH>
                <TH align="right">Recycled</TH>
                <TH align="right">Reused and recycled value</TH>
              </tr>
            </THead>
            <TBody>
              {c.secured.lines.map((l) => (
                <TR key={l.line.id}>
                  <TD>
                    {c.billLines.find((b) => b.id === l.line.id)?.name ?? l.line.element}
                    <span className="block text-xs text-muted">{l.line.element}</span>
                  </TD>
                  <TD muted className="whitespace-nowrap">
                    {l.line.layer}
                  </TD>
                  <TD align="right" className="whitespace-nowrap">
                    {f.massWaste(l.line.massT)}
                  </TD>
                  <TD align="right">{f.moneyWhole(l.line.valueGbp)}</TD>
                  <TD align="right">{f.percent(l.line.recycledShare)}</TD>
                  <TD align="right">{f.percent2(l.reusedPercent)}</TD>
                  <TD align="right">{f.percent2(l.recycledPercent)}</TD>
                  <TD align="right">{f.money(l.reusedAndRecycledValue)}</TD>
                </TR>
              ))}
              <TR className="[&_td]:font-semibold">
                <TD>Total</TD>
                <TD />
                <TD />
                <TD align="right">{f.moneyWhole(c.secured.totalValue)}</TD>
                <TD />
                <TD />
                <TD align="right">{f.percent2(c.secured.percent)}</TD>
                <TD align="right">{f.money(c.secured.totalContribution)}</TD>
              </TR>
            </TBody>
          </Table>
        </section>
      ) : null}

      <section aria-labelledby="cert-title" className="flex flex-col gap-3">
        <h3 id="cert-title" className="m-0 text-md font-semibold text-ink">
          Certification mapping
        </h3>
        <Table caption="Certification mapping" density="compact">
          <THead>
            <tr>
              <TH>Scheme and requirement</TH>
              <TH>In the workbook</TH>
            </tr>
          </THead>
          <TBody>
            {CERTIFICATION_ROWS.filter((r) => r.workbook === 'compliance').map((r) => (
              <TR key={r.requirement}>
                <TD className="whitespace-normal">{r.requirement}</TD>
                <TD muted>{r.provides}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <p className="m-0 text-xs text-muted">{LABELS.L19}</p>
      </section>

      <Callout tone="warning" title="Indicative">
        {LABELS.L11} {OUTPUT_CAVEAT}
      </Callout>
    </div>
  )
}

function BulletChart({ chart, label }: { chart: ContentChart; label: string }) {
  return (
    <div>
      <svg viewBox="0 0 1000 12" preserveAspectRatio="none" className="block h-3 w-full overflow-hidden rounded-full bg-subtle" role="img" aria-label={label} data-testid="content-chart">
        <rect x="0" y="0" width={chart.approvedAt * 1000} height="12" className="fill-brand-200" />
        <rect x="0" y="0" width={chart.securedAt * 1000} height="12" className="fill-brand-600" />
        <rect x={chart.aimAt * 1000 - 2} y="0" width="4" height="12" className="fill-ink" />
      </svg>
      <div className="relative mt-1 h-4 text-xs text-muted">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2 font-medium text-ink" style={{ left: `${chart.aimAt * 100}%` }}>
          Aim
        </span>
        <span className="absolute right-0">{chart.scaleLabel}</span>
      </div>
    </div>
  )
}

/** A tab of the project workspace, framed like the other tabs. */
export function Compliance() {
  return (
    <Page className="lg:pt-7">
      <ComplianceBody />
    </Page>
  )
}

export default Compliance
