// Waste and reuse for Durnley House (04 section 5.5, F13): the bill import with review, then the dashboard.
import { useState } from 'react'
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { wasteView } from '../../store/selectors'
import { DURNLEY_ID } from '../../domain/seed/world'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { LABELS } from '../../domain/reference/labels'
import { STREAMS, DESTINATIONS, destinationLabel } from '../../domain/reference/wasteCodes'
import { cellsFromArrayBuffer, base64ToArrayBuffer } from '../../domain/engines/billXlsx'
import { SAMPLE_BILL_XLSX_BASE64 } from '../../domain/reference/samples'
import { unresolvedNotice } from '../../domain/engines/waste'
import type { Destination, WasteRow } from '../../domain/types'
import { PageTitle, Panel, Table, Num, Tag, Button, Note, EmptyState, RuleBased, selectClass, cx } from '../../components/ui'
import { BulletChart, StackedBar } from '../../components/charts'
import { Stub } from '../../components/Stub'
import * as f from '../../domain/format'
import { buildWasteWorkbook, wasteFileName, downloadWorkbook } from './exports'

const CONFIDENCE = { high: { label: 'High', tone: 'teal' }, medium: { label: 'Medium', tone: 'survey' }, low: { label: 'Needs review', tone: 'oxide' }, edited: { label: 'Edited', tone: 'steel' } } as const

const DASHBOARD_DESTINATIONS: Destination[] = ['reused_on_site', 'reused_off_site', 'recycled_on_site', 'recycled_off_site', 'recovered', 'landfill']

const compactSelect = cx(selectClass, 'min-h-9 text-sm')

function aimText(ratio: number): string {
  return `Aim: at least ${f.number(ratio * 100)}%`
}

export function Waste() {
  const world = useWorld()
  const s = useStore()
  const e = world.engagements[DURNLEY_ID]
  const v = wasteView(world, DURNLEY_ID)
  const owner = world.orgs[e.ownerOrgId]
  const [busy, setBusy] = useState<'load' | 'export' | null>(null)

  const loadSample = async () => {
    setBusy('load')
    try {
      const cells = await cellsFromArrayBuffer(base64ToArrayBuffer(SAMPLE_BILL_XLSX_BASE64))
      s.loadSampleBillCells(DURNLEY_ID, cells)
    } finally {
      setBusy(null)
    }
  }

  const exportWorkbook = async () => {
    setBusy('export')
    try {
      downloadWorkbook(await buildWasteWorkbook(world), wasteFileName(world))
    } finally {
      setBusy(null)
    }
  }

  const rows = e.bill?.rows ?? []
  const notice = v ? unresolvedNotice(v.rates.unresolved) : null

  return (
    <>
      <PageTitle
        title={`${e.name}, waste and reuse`}
        sub={`For ${owner.name}. ${e.period}. GIA ${f.number(e.giaM2)} m2.`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="survey">
              <span data-testid="label-L18">{LABELS.L18}</span>
            </Tag>
            <Button variant="primary" onClick={exportWorkbook} disabled={!v || busy !== null} data-testid="export-waste">
              {busy === 'export' ? 'Preparing workbook' : 'Export waste and reuse workbook'}
            </Button>
          </div>
        }
      />
      <Note tone="steel" testId="label-L16" className="mb-4">
        {LABELS.L16}
      </Note>

      <Panel
        title="Demolition bill import"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={loadSample} disabled={busy !== null} data-testid="load-sample-bill">
              {busy === 'load' ? 'Reading the bill' : 'Load sample bill'}
            </Button>
            <Stub name="Read a PDF bill or archive drawing" would="The real feature would read a scanned PDF bill or an archive drawing, pick out the rows, codes and quantities, and bring them into the same review table." testId="stub-pdf" />
          </div>
        }
      >
        <RuleBased testId="label-L2" />
        {!v ? (
          <div className="mt-3">
            <EmptyState hint="Load the sample bill to read the contractor's demolition bill and review each row." />
          </div>
        ) : (
          <>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm" data-testid="import-summary">
              <li data-testid="rows-read">{`${v.rowsRead} rows read`}</li>
              <li data-testid="rows-skipped">{`${v.titleRows} title rows and ${v.totalRows} total row skipped`}</li>
              <li data-testid="confidence-counts">{`${v.counts.high} high confidence, ${v.counts.medium} medium, ${v.counts.low} needs review`}</li>
              <li data-testid="stated-total">{v.statedTotal === null ? 'No stated total on the bill' : v.statedTotalMatches ? `Stated total ${f.massWaste(v.statedTotal)} matches the rows` : `Stated total ${f.massWaste(v.statedTotal)} does not match the rows (${f.massWaste(v.sum)})`}</li>
              <li data-testid="awaiting-review">{v.rates.unresolved.count === 0 ? 'No rows awaiting review' : `${v.rates.unresolved.count} ${v.rates.unresolved.count === 1 ? 'row' : 'rows'} awaiting review`}</li>
            </ul>
            {notice ? (
              <Note tone="oxide" testId="unresolved-notice" className="mt-2">
                {notice}
              </Note>
            ) : null}
            <h3 className="mb-1 mt-4 text-sm font-semibold">Review</h3>
            <p className="mb-2 text-xs text-mill-text">Original text beside the normalised values. Correct the stream or destination on any row; the totals update at once.</p>
            <Table data-testid="review-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Original description</th>
                  <th>Original code</th>
                  <th className="text-right">Original quantity</th>
                  <th>Unit</th>
                  <th>Original route</th>
                  <th>Stream</th>
                  <th>EWC code</th>
                  <th className="text-right">Tonnes</th>
                  <th>Destination</th>
                  <th>Hazardous</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <ReviewRow key={r.row} r={r} onEdit={(patch) => s.editBillRow(DURNLEY_ID, r.row, patch)} />
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Panel>

      {v ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel title="Diversion and reuse">
            <p className="font-display text-2xl leading-tight" data-testid="diversion">
              Diversion from landfill {f.percent(v.rates.diversionRate)}
            </p>
            <div className="mt-3">
              <BulletChart value={v.rates.diversionRate} target={A.diversionTarget} max={1} label="Demolition waste reused, recycled or recovered" valueLabel={f.percent(v.rates.diversionRate)} targetLabel={aimText(A.diversionTarget)} testId="diversion-chart" />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span data-testid="diversion-aim">{aimText(A.diversionTarget)}</span>
              <span data-testid="reuse-rate">Reuse rate {f.percent(v.rates.reuseRate)}</span>
            </div>
            <p className="mt-1 text-xs text-mill-text">Counted rows are resolved, not hazardous and not excavation. Diversion is counted tonnes less landfill, over counted tonnes.</p>
            <div className="mt-4">
              <StackedBar parts={DASHBOARD_DESTINATIONS.map((d) => ({ id: d, label: destinationLabel(d), value: v.rates.byDestination[d] }))} total={v.rates.totalNonHaz} formatValue={f.massWaste} label={`Tonnes by destination, ${f.massWaste(v.rates.totalNonHaz)} counted`} />
            </div>
            <ul className="mt-4 flex flex-col gap-1 text-sm">
              <li data-testid="reused-off-site">Components reused off site {f.massWaste(v.rates.byDestination.reused_off_site)}</li>
              <li data-testid="recycled-on-site">Recycled on site {f.massWaste(v.rates.byDestination.recycled_on_site)}</li>
              <li data-testid="hazardous">Hazardous waste {f.massWaste(v.rates.hazardousT)}, reported separately</li>
              {v.rates.excavationT > 0 ? <li data-testid="excavation">Excavation waste {f.massWaste(v.rates.excavationT)}, listed separately</li> : null}
              <li data-testid="intensity">{f.intensity(v.rates.tonnesPerM2)}</li>
            </ul>
          </Panel>
          <Panel title="Potential carbon benefit">
            <p data-testid="carbon-benefit">
              <span className="text-sm text-mill-text">Potential carbon benefit of reuse </span>
              <span className="font-display text-2xl">{f.carbon(v.benefit.total)}</span>
            </p>
            <Note tone="survey" testId="label-L13" className="mt-2">
              {LABELS.L13}
            </Note>
            {v.benefit.rows.length ? (
              <Table className="mt-3">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Stream</th>
                    <th className="text-right">Tonnes</th>
                    <th className="text-right">Benefit (tCO2e)</th>
                  </tr>
                </thead>
                <tbody>
                  {v.benefit.rows.map((b) => (
                    <tr key={b.row}>
                      <td>{b.row}</td>
                      <td>{STREAMS.find((x) => x.id === b.stream)?.label ?? b.stream}</td>
                      <Num>{f.massWaste(b.tonnes)}</Num>
                      <Num>{f.number(b.benefit, 1)}</Num>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="mt-3 text-sm text-mill-text">No counted rows are reused off site.</p>
            )}
            <p className="mt-2 text-xs text-mill-text">A1-A3 only: a demolition bill has no transport data. Rows reused on site and rows with no marketplace family claim nothing.</p>
          </Panel>
        </div>
      ) : null}
    </>
  )
}

function ReviewRow({ r, onEdit }: { r: WasteRow; onEdit: (patch: { stream?: string | null; destination?: Destination | null }) => void }) {
  const conf = CONFIDENCE[r.confidence]
  return (
    <tr data-testid={`row-${r.row}`} className={r.confidence === 'low' ? 'bg-oxide-tint/40' : undefined}>
      <td className="font-display text-base">{r.row}</td>
      <td>{r.original.description}</td>
      <td className="whitespace-nowrap">{r.original.code}</td>
      <Num className="whitespace-nowrap">{r.original.quantity}</Num>
      <td>{r.original.unit}</td>
      <td>{r.original.route}</td>
      <td className="min-w-44">
        <select className={compactSelect} value={r.stream ?? ''} onChange={(ev) => onEdit({ stream: ev.target.value || null })} aria-label={`Stream for row ${r.row}`} data-testid={`row-${r.row}-stream`}>
          <option value="">Not set</option>
          {STREAMS.map((st) => (
            <option key={st.id} value={st.id}>
              {st.label}
            </option>
          ))}
        </select>
      </td>
      <td className="whitespace-nowrap">{r.code ?? ''}</td>
      <Num className="whitespace-nowrap">{r.tonnes === null ? 'Unknown' : f.massWaste(r.tonnes)}</Num>
      <td className="min-w-44">
        <select className={compactSelect} value={r.destination ?? ''} onChange={(ev) => onEdit({ destination: (ev.target.value || null) as Destination | null })} aria-label={`Destination for row ${r.row}`} data-testid={`row-${r.row}-destination`}>
          <option value="">Not set</option>
          {DESTINATIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </td>
      <td>{r.hazardous ? 'Yes' : 'No'}</td>
      <td>
        <Tag tone={conf.tone}>{conf.label}</Tag>
      </td>
    </tr>
  )
}
