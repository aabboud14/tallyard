// A demolition engagement's waste and reuse: import the contractor's bill (the built-in sample or a workbook),
// review each row beside the original text, then read diversion, reuse and the carbon benefit, and export.
import { useRef, useState, type ChangeEvent } from 'react'
import { useParams } from 'react-router'
import { FileSpreadsheet, FileUp, Leaf, Recycle, RotateCcw, TableProperties, TriangleAlert } from 'lucide-react'
import type { Destination, WasteRow } from '../../domain/types'
import { LABELS } from '../../domain/reference/labels'
import { SAMPLE_BILL_XLSX_BASE64 } from '../../domain/reference/samples'
import { DESTINATIONS, streamLabel } from '../../domain/reference/wasteCodes'
import * as f from '../../domain/format'
import { act, selectors, useView } from '../../store'
import type { WasteView } from '../../store/selectors/consultant'
import { aimLabel, stacked } from '../../store/selectors/roles-views'
import { Button, Callout, Card, CardBody, CardHeader, cx, EmptyState, IndicativeMarker, PageHeader, Pill, Select, Switch, Table, TBody, TD, TH, THead, TR, toast } from '../../ui'
import { Page } from '../../app/Page'
import { StatStrip } from '../notifications/kit'
import { downloadFile } from '../compliance/exports'

const CONFIDENCE = { high: { label: 'High', tone: 'brand' }, medium: { label: 'Medium', tone: 'info' }, low: { label: 'Needs review', tone: 'warning' }, edited: { label: 'Edited', tone: 'neutral' } } as const

const DASH: { id: Destination; fill: string; dot: string }[] = [
  { id: 'reused_on_site', fill: 'fill-brand-700', dot: 'bg-brand-700' },
  { id: 'reused_off_site', fill: 'fill-brand-500', dot: 'bg-brand-500' },
  { id: 'recycled_on_site', fill: 'fill-brand-300', dot: 'bg-brand-300' },
  { id: 'recycled_off_site', fill: 'fill-brand-200', dot: 'bg-brand-200' },
  { id: 'recovered', fill: 'fill-[#d6d3d1]', dot: 'bg-[#d6d3d1]' },
  { id: 'landfill', fill: 'fill-[#c94a43]', dot: 'bg-[#c94a43]' },
]

export function Waste() {
  const { engagementId = '' } = useParams()
  const v = useView(selectors.wasteView, engagementId)
  const [busy, setBusy] = useState<'load' | 'upload' | 'export' | null>(null)
  const [reviewOnly, setReviewOnly] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  if (!v) return null
  const e = v.engagement

  const load = async (buffer: ArrayBuffer, which: 'load' | 'upload') => {
    setBusy(which)
    try {
      const { cellsFromArrayBuffer } = await import('../../domain/engines/billXlsx')
      const cells = await cellsFromArrayBuffer(buffer)
      const r = act.loadWasteBill(engagementId, cells)
      if (!r.ok) return toast.error(r.error ?? 'That bill could not be read.')
      toast.success(`${r.value} rows read`, { description: 'Review the rows marked for review, then export.', action: { label: 'Undo', onClick: r.undo } })
    } catch {
      toast.error('That file could not be read', { description: 'Use an .xlsx bill with a header row, or the sample bill.' })
    } finally {
      setBusy(null)
    }
  }
  const loadSample = async () => {
    const { base64ToArrayBuffer } = await import('../../domain/engines/billXlsx')
    await load(base64ToArrayBuffer(SAMPLE_BILL_XLSX_BASE64), 'load')
  }
  const upload = async (ev: ChangeEvent<HTMLInputElement>) => {
    const fileObj = ev.target.files?.[0]
    ev.target.value = ''
    if (fileObj) await load(await fileObj.arrayBuffer(), 'upload')
  }
  const exportWorkbook = async () => {
    setBusy('export')
    try {
      const { buildWasteWorkbook } = await import('./exports')
      downloadFile(await buildWasteWorkbook(v), v.fileName)
      toast.success('Workbook exported', { description: v.fileName })
    } catch {
      toast.error('The workbook could not be prepared. Try again.')
    } finally {
      setBusy(null)
    }
  }
  const clear = () => {
    const r = act.clearWasteBill(engagementId)
    if (r.ok) toast.success('Bill cleared', { action: { label: 'Undo', onClick: r.undo } })
  }

  const rows = (v.bill?.rows ?? []).filter((r) => !reviewOnly || r.confidence === 'low')

  return (
    <Page testId="waste">
      <PageHeader
        title={`${e.name}, waste and reuse`}
        subtitle={`For ${e.ownerName}. ${e.period}. GIA ${f.number(e.giaM2)} m2.`}
        meta={
          <Pill tone="info" size="sm" data-testid="label-L18">
            {LABELS.L18}
          </Pill>
        }
        actions={
          v.bill ? (
            <>
              <Button icon={RotateCcw} variant="ghost" onClick={clear}>
                Clear bill
              </Button>
              <Button variant="primary" icon={FileSpreadsheet} loading={busy === 'export'} onClick={exportWorkbook} data-testid="export-waste">
                Export workbook
              </Button>
            </>
          ) : null
        }
      />
      <input ref={file} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={upload} />

      {!v.bill || !v.rates || !v.benefit || !v.counts ? (
        <Card className="mt-6">
          <EmptyState
            icon={FileSpreadsheet}
            title="Import the demolition bill"
            text="Bring in the contractor's bill of arisings. Each row is read, coded to a waste stream and a destination, and marked for review where it is unclear."
            action={
              <>
                <Button variant="primary" icon={TableProperties} loading={busy === 'load'} onClick={loadSample} data-testid="load-sample-bill">
                  Use the sample bill
                </Button>
                <Button icon={FileUp} loading={busy === 'upload'} onClick={() => file.current?.click()}>
                  Upload a workbook
                </Button>
              </>
            }
          />
        </Card>
      ) : (
        <Loaded v={v} rows={rows} reviewOnly={reviewOnly} setReviewOnly={setReviewOnly} onUpload={() => file.current?.click()} engagementId={engagementId} />
      )}
    </Page>
  )
}

function Loaded({ v, rows, reviewOnly, setReviewOnly, onUpload, engagementId }: { v: WasteView; rows: WasteRow[]; reviewOnly: boolean; setReviewOnly: (b: boolean) => void; onUpload: () => void; engagementId: string }) {
  const r = v.rates!
  const benefit = v.benefit!
  const counts = v.counts!
  const bill = v.bill!
  const segs = stacked(DASH.map((d) => r.shares[d.id]))
  return (
    <div className="mt-6 flex flex-col gap-6">
      <StatStrip
        items={[
          { label: 'Diversion from landfill', value: f.percent(r.diversionRate), sub: aimLabel(v.diversionTarget), tone: r.diversionRate >= v.diversionTarget ? 'attention' : 'default', testId: 'diversion' },
          { label: 'Reuse rate', value: f.percent(r.reuseRate), sub: 'Reused on and off site' },
          { label: 'Counted demolition waste', value: f.massWaste(r.totalNonHaz), sub: f.intensity(r.tonnesPerM2) },
          { label: 'Potential carbon benefit', value: f.number(benefit.total, 1), unit: 'tCO2e', indicative: true, sub: 'Module D, reported separately' },
        ]}
      />
      {v.unresolvedText ? (
        <Callout tone="warning" icon={TriangleAlert} title="Rows to review" data-testid="unresolved-notice">
          {v.unresolvedText}. Set the stream or destination on each to count it.
        </Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader title="Where the waste goes" icon={Recycle} description="Counted rows: resolved, not hazardous and not excavation." />
          <CardBody className="flex flex-col gap-4">
            <svg viewBox="0 0 1 10" preserveAspectRatio="none" className="block h-3 w-full overflow-hidden rounded-full bg-subtle" role="img" aria-label={DASH.map((d) => `${DESTINATIONS.find((y) => y.id === d.id)?.label} ${f.massWaste(r.byDestination[d.id])}`).join(', ')}>
              {DASH.map((d, i) => (
                <rect key={d.id} x={segs[i].at} y="0" width={segs[i].size} height="10" className={d.fill} />
              ))}
            </svg>
            <ul className="m-0 grid list-none gap-x-6 gap-y-2 p-0 sm:grid-cols-2">
              {DASH.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-ink-soft">
                    <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', d.dot)} />
                    <span className="truncate">{DESTINATIONS.find((y) => y.id === d.id)?.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink">
                    {f.massWaste(r.byDestination[d.id])} <span className="text-muted">{f.percent(r.shares[d.id])}</span>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="m-0 grid grid-cols-2 gap-3 border-t border-line-soft pt-3 text-sm">
              <div>
                <dt className="text-muted">Hazardous, reported separately</dt>
                <dd className="m-0 font-medium tabular-nums">{f.massWaste(r.hazardousT)}</dd>
              </div>
              <div>
                <dt className="text-muted">Excavation, listed separately</dt>
                <dd className="m-0 font-medium tabular-nums">{f.massWaste(r.excavationT)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Potential carbon benefit" icon={Leaf} actions={<IndicativeMarker />} />
          <CardBody className="flex flex-col gap-3">
            <p className="m-0 text-3xl font-semibold tabular-nums text-ink" data-testid="carbon-benefit">
              {f.number(benefit.total, 1)} <span className="text-base font-medium text-muted">tCO2e</span>
            </p>
            {benefit.rows.length > 0 ? (
              <ul className="m-0 list-none divide-y divide-line-soft rounded-lg border border-line-soft p-0">
                {benefit.rows.map((b) => (
                  <li key={b.row} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-ink-soft">
                      Row {b.row}, {streamLabel(b.stream)}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink">{f.number(b.benefit, 1)} tCO2e</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-muted">No counted rows are reused off site.</p>
            )}
            <p className="m-0 text-xs text-muted">{LABELS.L13}</p>
          </CardBody>
        </Card>
      </div>

      <section aria-labelledby="review-title" className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="review-title" className="m-0 text-md font-semibold text-ink">
              Review the bill
            </h2>
            <p className="m-0 mt-0.5 text-sm text-muted" data-testid="import-summary">
              {bill.rows.length} rows read, {bill.titleRows} title rows and {bill.totalRows} total row skipped. {counts.high} high confidence, {counts.medium} medium, {counts.low} to review{counts.edited > 0 ? `, ${counts.edited} edited` : ''}.{' '}
              {bill.statedTotal === null ? 'No stated total on the bill.' : bill.statedTotalMatches ? `The stated total of ${f.massWaste(bill.statedTotal)} matches the rows.` : `The stated total of ${f.massWaste(bill.statedTotal)} does not match the rows (${f.massWaste(v.sum ?? 0)}).`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Switch label="Only rows to review" checked={reviewOnly} onCheckedChange={setReviewOnly} className="gap-3" />
            <Button size="sm" icon={FileUp} onClick={onUpload}>
              Replace
            </Button>
          </div>
        </div>
        <Table caption="Bill rows" density="compact" data-testid="review-table">
          <THead>
            <tr>
              <TH className="w-10">Row</TH>
              <TH>As written on the bill</TH>
              <TH align="right">Tonnes</TH>
              <TH className="min-w-48">Stream</TH>
              <TH className="min-w-48">Destination</TH>
              <TH>Confidence</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <ReviewRow key={row.row} row={row} v={v} engagementId={engagementId} />
            ))}
          </TBody>
        </Table>
        {rows.length === 0 ? <p className="m-0 text-sm text-muted">No rows need review.</p> : null}
      </section>
    </div>
  )
}

function ReviewRow({ row: r, v, engagementId }: { row: WasteRow; v: WasteView; engagementId: string }) {
  const c = CONFIDENCE[r.confidence]
  const edit = (patch: { stream?: string | null; destination?: Destination | null }) => {
    const out = act.editWasteRow(engagementId, r.row, patch)
    if (!out.ok) toast.error(out.error ?? 'Could not change the row.')
  }
  return (
    <TR className={r.confidence === 'low' ? 'bg-warning-soft/30' : undefined} data-testid={`row-${r.row}`}>
      <TD muted className="tabular-nums">
        {r.row}
      </TD>
      <TD className="min-w-64">
        <span className="block text-ink">{r.original.description}</span>
        <span className="block text-xs text-muted">
          {[r.original.code, `${r.original.quantity} ${r.original.unit}`.trim(), r.original.route].filter(Boolean).join(' · ')}
          {r.hazardous ? ' · Hazardous' : ''}
        </span>
      </TD>
      <TD align="right" className="whitespace-nowrap">
        {r.tonnes === null ? <span className="text-faint">Unknown</span> : f.massWaste(r.tonnes)}
      </TD>
      <TD>
        <Select selectSize="sm" aria-label={`Stream for row ${r.row}`} value={r.stream ?? ''} onChange={(e) => edit({ stream: e.target.value || null })} placeholder="Not set" options={v.streams.map((s) => ({ value: s.id, label: s.label }))} data-testid={`row-${r.row}-stream`} />
        {r.code ? <span className="mt-0.5 block text-xs text-muted">EWC {r.code}</span> : null}
      </TD>
      <TD>
        <Select selectSize="sm" aria-label={`Destination for row ${r.row}`} value={r.destination ?? ''} onChange={(e) => edit({ destination: (e.target.value || null) as Destination | null })} placeholder="Not set" options={v.destinations.map((d) => ({ value: d.id, label: d.label }))} data-testid={`row-${r.row}-destination`} />
      </TD>
      <TD>
        <Pill tone={c.tone} size="sm" dot>
          {c.label}
        </Pill>
      </TD>
    </TR>
  )
}

export default Waste
