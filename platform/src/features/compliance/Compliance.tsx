// Project compliance for the sustainability consultant: reused and recycled content by value against the aim,
// avoided carbon and reclaimed mass, the circular economy statement, the certification summary per scheme, the
// reused items and the bill of materials. Exports the compliance workbook (with the targets, requirements and the
// certification mapping from the tracked credits) and prints to A4. Indicative, from public listings and the
// project's own records; not certification advice.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, FileSpreadsheet, FileText, Leaf, Printer, Scale, ShieldCheck, Table2 } from 'lucide-react'
import './print.css'
import { LABELS } from '../../domain/reference/labels'
import { CERT_CAVEAT } from '../../domain/reference/sustainabilityCopy'
import { formatDate } from '../../domain/dates'
import * as f from '../../domain/format'
import { selectors, useView } from '../../store'
import { complianceFigures, schemeCard, STATEMENT_TONE } from '../../store/selectors/sustainability-screens'
import { OUTPUT_CAVEAT } from '../../store/selectors/roles-views'
import type { ReusedItem } from '../../store/selectors/consultant'
import { BarList, Button, Callout, Card, CardBody, CardHeader, CollapsiblePanel, EmptyState, IndicativeMarker, MARK, Pill, Table, TargetMeter, TBody, TD, TH, THead, TR, toast } from '../../ui'
import { Page } from '../../app/Page'
import { TabHeader, TrackBar } from '../sustainability/parts'
import { buildComplianceWorkbook, downloadFile } from './exports'

const ITEM_TONE: Record<ReusedItem['status'], 'brand' | 'info' | 'neutral'> = { Confirmed: 'brand', Reserved: 'info', Approved: 'neutral' }

function ComplianceBody() {
  const { projectId = '' } = useParams()
  const c = useView(selectors.complianceView, projectId)
  const m = useView(selectors.complianceWorkbook, projectId)
  const schemes = useView(selectors.certificationSummary, projectId)
  const sus = useView(selectors.sustainabilityView, projectId)
  const [busy, setBusy] = useState(false)
  if (!c) return null
  const base = `/app/projects/${projectId}`

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

  const fig = complianceFigures(c)
  const statement = sus?.statement ?? null

  return (
    <div className="compliance-report flex flex-col gap-8" data-testid="compliance">
      <p className="m-0 hidden text-2xl font-semibold text-ink print:block">{c.header.name}, compliance</p>
      <TabHeader
        title={
          <>
            Compliance
            <Pill tone="warning" size="sm" data-testid="label-L17">
              {LABELS.L17}
            </Pill>
          </>
        }
        subtitle={LABELS.L16}
        actions={
          <>
            <Button icon={Printer} onClick={() => window.print()} data-testid="print-compliance">
              Print
            </Button>
            <Button variant="primary" icon={FileSpreadsheet} loading={busy} onClick={exportWorkbook} data-testid="export-compliance">
              Export workbook
            </Button>
          </>
        }
      />

      <div className="report-grid grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="avoid-break">
          <CardHeader title="Reused and recycled content by value" icon={Scale} actions={<IndicativeMarker />} />
          <CardBody className="flex flex-col gap-5">
            {fig.content ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="m-0 text-sm text-muted">Secured</p>
                    <p className="m-0 text-4xl font-semibold tabular-nums text-ink" data-testid="content-secured">
                      {fig.content.valueText}
                    </p>
                  </div>
                  <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <dt className="text-muted">With approved</dt>
                    <dd className="m-0 text-right font-medium tabular-nums text-ink">{fig.content.withApprovedText}</dd>
                    <dt className="text-muted">Without reuse</dt>
                    <dd className="m-0 text-right font-medium tabular-nums text-ink" data-testid="content-without-reuse">
                      {f.percent2(c.secured.withoutReuse)}
                    </dd>
                  </dl>
                </div>
                <TargetMeter
                  label="Secured against the aim"
                  value={fig.content.value}
                  max={fig.content.max}
                  target={fig.content.target}
                  valueText={fig.content.valueText}
                  targetText={fig.content.targetText}
                  state={fig.content.state}
                  stateText={fig.content.stateText}
                  axis={fig.content.axis}
                  testId="content-chart"
                />
                {fig.contribution.items.length > 0 ? (
                  <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
                    <p className="m-0 text-sm font-medium text-ink">Contribution of reuse, by line</p>
                    <BarList label="Contribution of reuse to content by value, by bill line" max={fig.contribution.max} items={fig.contribution.items.map((it, i) => ({ ...it, key: `contribution-${i}`, colour: MARK.brand }))} testId="contribution-bars" />
                  </div>
                ) : null}
                <p className="m-0 text-xs text-muted">{LABELS.L15}</p>
              </>
            ) : (
              <EmptyState variant="inline" icon={Scale} title="No bill of materials yet" text="Content by value needs the project's bill of materials. Avoided carbon and reused items are still counted below." />
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
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
          {statement ? (
            <Card className="avoid-break" data-testid="compliance-statement">
              <CardHeader title="Circular economy statement" icon={FileText} />
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={STATEMENT_TONE[statement.status]} dot size="sm">
                    {statement.label}
                  </Pill>
                  {statement.sentText ? <span className="text-sm text-muted">{statement.sentText}</span> : null}
                </div>
                <Button asChild size="sm" trailingIcon={ArrowRight} className="self-start print:hidden">
                  <Link to={`${base}/statement`}>Open the statement</Link>
                </Button>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      {schemes ? (
        <section aria-labelledby="cert-title" className="flex flex-col gap-3" data-testid="compliance-certification">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 id="cert-title" className="m-0 flex items-center gap-2.5 text-md font-semibold text-ink">
                Certification
                <IndicativeMarker />
              </h3>
              <p className="m-0 mt-0.5 max-w-[90ch] text-sm text-muted">{CERT_CAVEAT}</p>
            </div>
            <Button asChild size="sm" trailingIcon={ArrowRight} className="print:hidden">
              <Link to={`${base}/certification`}>Open certification</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {schemes.map((s) => {
              const card = schemeCard(s)
              return (
                <Card key={s.scheme} padding="md" className="avoid-break flex min-w-0 flex-col gap-2.5" data-testid={`compliance-scheme-${s.scheme}`}>
                  <p className="m-0 flex items-center gap-1.5 font-semibold text-ink">
                    <ShieldCheck aria-hidden="true" className="size-4 text-faint" />
                    {s.label}
                  </p>
                  <p className="m-0 text-sm text-ink-soft">
                    {card.targetText}
                    <span className="text-muted">. {card.predictedText}</span>
                  </p>
                  <TrackBar counts={s.counts} label={`${s.label} credits by status`} size="sm" legend={false} />
                  <p className="m-0 text-sm text-muted">
                    {card.readyText}
                    {card.atRiskText ? `, ${card.atRiskText}` : ''}
                  </p>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}

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
                    <Pill tone={ITEM_TONE[it.status]} dot size="sm" variant="quiet">
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
        <CollapsiblePanel
          id="compliance-bill"
          title="Bill of materials"
          icon={Table2}
          count={c.secured.lines.length}
          summary={`Total ${f.moneyWhole(c.secured.totalValue)}, ${f.percent2(c.secured.percent)} reused and recycled by value`}
          className="avoid-break"
        >
          <Table caption="Bill of materials" density="compact" bare data-testid="bill-of-materials">
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
        </CollapsiblePanel>
      ) : null}

      <Callout tone="warning" title="Indicative">
        {LABELS.L11} {OUTPUT_CAVEAT}
      </Callout>
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
