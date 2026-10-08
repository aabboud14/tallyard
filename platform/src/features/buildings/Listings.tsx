// Listings: for each lot, private, shared with selected projects, or published, with the ask, reserve and date;
// and the building's disclosure settings with the score they give. Owner only.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, Pencil, RotateCcw, Store } from 'lucide-react'
import { formatDate } from '../../domain/dates'
import * as f from '../../domain/format'
import { act, selectors, useView } from '../../store'
import type { ListingRow } from '../../store/selectors/owner'
import { disclosureMeter } from '../../store/selectors/roles-views'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Pill, SegmentedControl, Sheet, Table, TBody, TD, TH, THead, TR, toast } from '../../ui'
import { DisclosureBox, ListingEditor } from './ListingEditor'
import { VISIBILITY_SHORT, VISIBILITY_TONE } from './labels'

type Tab = 'all' | 'private' | 'matched_only' | 'open'

export function Listings() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.listingsView, buildingId)
  const [tab, setTab] = useState<Tab>('all')
  const [editing, setEditing] = useState<string | null>(null)
  if (!v) return null
  if (v.empty) return <EmptyState variant="page" icon={Store} title="Nothing to list yet" text="Captured items appear here, private. You decide which to share with selected projects or publish." />
  const meter = disclosureMeter(v.disclosure)
  const rows = v.rows.filter((r) => tab === 'all' || r.visibility === tab)
  const current = v.rows.find((r) => r.lotId === editing) ?? null
  const disclose = (patch: { locationLevel?: 'region' | 'local_authority'; timingLevel?: 'quarter' | 'month' }) => {
    const r = act.setDisclosure(buildingId, patch)
    if (!r.ok) return toast.error(r.error ?? 'Could not change the setting.')
    toast.success('Disclosure updated', { description: 'Published listings now show it this way.', action: { label: 'Undo', onClick: r.undo } })
  }
  const reset = () => {
    const r = act.resetDisclosure(buildingId)
    if (!r.ok) return toast.error(r.error ?? 'Could not reset.')
    toast.success('Back to region, quarter and private photos', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div className="flex flex-col gap-6" data-testid="listings">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Disclosure settings"
            description="How precisely published listings say where and when. The less you show, the harder the building is to identify."
            actions={
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={reset}>
                Reset
              </Button>
            }
          />
          <CardBody className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="m-0 text-base font-medium text-ink">Location</p>
                <p className="m-0 text-sm text-muted">Shown as the region or the local authority</p>
              </div>
              <SegmentedControl label="Location shown" value={v.locationLevel} onValueChange={(x) => disclose({ locationLevel: x as 'region' | 'local_authority' })} items={[{ value: 'region', label: 'Region' }, { value: 'local_authority', label: 'Local authority' }]} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="m-0 text-base font-medium text-ink">Timing</p>
                <p className="m-0 text-sm text-muted">Availability shown as a quarter or a month</p>
              </div>
              <SegmentedControl label="Timing shown" value={v.timingLevel} onValueChange={(x) => disclose({ timingLevel: x as 'quarter' | 'month' })} items={[{ value: 'quarter', label: 'Quarter' }, { value: 'month', label: 'Month' }]} />
            </div>
          </CardBody>
        </Card>
        <DisclosureBox meter={meter} inferences={v.disclosure.inferences} blocked={v.disclosure.blocksPublishing} title="Disclosure score for this building" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl
            label="Show"
            value={tab}
            onValueChange={(x) => setTab(x as Tab)}
            items={[
              { value: 'all', label: `All ${v.rows.length}` },
              { value: 'private', label: `Private ${v.counts.private}` },
              { value: 'matched_only', label: `Shared ${v.counts.matched_only}` },
              { value: 'open', label: `Published ${v.counts.open}` },
            ]}
            className="max-w-full overflow-x-auto"
          />
          <Link to={`/app/buildings/${buildingId}/sharing`} className="inline-flex items-center gap-1 rounded-sm text-sm text-ink-soft hover:text-ink">
            Shared lots are visible to {v.sharedProjectCount} {v.sharedProjectCount === 1 ? 'project' : 'projects'}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
        <Table caption="Listings" data-testid="listings-table">
          <THead>
            <tr>
              <TH>Item</TH>
              <TH>Visibility</TH>
              <TH align="right">Ask</TH>
              <TH align="right">Reserve</TH>
              <TH>Available from</TH>
              <TH align="right">
                <span className="sr-only">Actions</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.lotId} data-testid={`listing-${r.tag}`}>
                <TD>
                  <span className="flex items-baseline gap-2">
                    <span className="text-xs font-medium tabular-nums text-muted">{r.tag}</span>
                    <span className="font-medium text-ink">{r.title}</span>
                  </span>
                </TD>
                <TD>
                  <span className="flex items-center gap-1.5">
                    <Pill tone={VISIBILITY_TONE[r.visibility]} dot size="sm">
                      {VISIBILITY_SHORT[r.visibility]}
                    </Pill>
                    {r.reserved ? <Badge tone="brand">Reserved</Badge> : null}
                  </span>
                </TD>
                <TD align="right" className="whitespace-nowrap">
                  {r.ask !== null && r.visibility !== 'private' ? (
                    <>
                      {f.priceOnly(r.ask, r.family)}
                      <span className="block text-xs text-muted">{r.unitLabel}</span>
                    </>
                  ) : (
                    <span className="text-faint">Not set</span>
                  )}
                </TD>
                <TD align="right" className="whitespace-nowrap">
                  {r.reserve !== null && r.visibility !== 'private' ? (
                    <>
                      {f.priceOnly(r.reserve, r.family)}
                      <span className="block text-xs text-muted">{r.unitLabel}</span>
                    </>
                  ) : (
                    <span className="text-faint">Not set</span>
                  )}
                </TD>
                <TD muted className="whitespace-nowrap">
                  {r.availableFrom ? formatDate(r.availableFrom) : `Expected ${r.expectedText}`}
                </TD>
                <TD align="right">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(r.lotId)} disabled={!r.canChange} data-testid={`edit-${r.tag}`}>
                    {r.visibility === 'private' ? 'List' : 'Edit'}
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {rows.length === 0 ? <p className="m-0 text-sm text-muted">No lots here.</p> : null}
      </div>

      <Sheet open={!!current} onOpenChange={(o) => !o && setEditing(null)} width="lg" title={current ? `${current.tag} · ${current.title}` : ''} description="Visibility, prices and availability" testId="listing-sheet">
        {current ? <ListingEditor key={current.lotId + current.visibility} lot={toEditorLot(current)} onSaved={() => setEditing(null)} compact /> : null}
      </Sheet>
    </div>
  )
}

function toEditorLot(r: ListingRow) {
  return { lotId: r.lotId, family: r.family, visibility: r.visibility, ask: r.ask, reserve: r.reserve, availableFrom: r.availableFrom, suggested: r.suggested, guide: r.guide, unitLabel: r.unitLabel, reserved: r.reserved }
}

export default Listings
