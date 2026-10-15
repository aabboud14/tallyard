// The deconstruction contractor on a building's overview: who it is, how many items it has dated, and (for the owner
// and the surveyor) the invitation itself. The contractor's dates stay private; the owner decides what buyers see.
import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, HardHat } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import { Button, Card, CardBody, CardHeader, ProgressBar, Select, toast } from '../../ui'

export function ContractorCard({ buildingId }: { buildingId: string }) {
  const o = useView(selectors.buildingOverview, buildingId)
  if (!o) return null
  const side = o.header.side
  const c = o.contractor
  const canAppoint = side === 'owner' || side === 'surveyor'
  if (!canAppoint && !c) return null
  return (
    <Card data-testid="contractor-card">
      <CardHeader title="Deconstruction contractor" icon={HardHat} />
      <CardBody className="flex flex-col gap-4">
        {c ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-base font-medium text-ink">{c.name}</p>
            <ProgressBar value={c.datedCount} max={c.itemCount} label={`Dates set for ${c.datedCount} of ${c.itemCount} items`} valueText={`${c.datedCount} of ${c.itemCount}`} showLabel size="sm" />
            {side === 'owner' && c.datedCount > 0 ? (
              <Link to={`/app/buildings/${buildingId}/inventory`} className="inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11">
                Review their dates in the inventory
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="m-0 text-base text-muted">None invited yet. A contractor says when each item is expected to come out.</p>
        )}
        {canAppoint ? <AppointContractor key={c?.orgId ?? 'none'} buildingId={buildingId} current={c?.orgId ?? null} options={o.contractorOptions} /> : null}
      </CardBody>
    </Card>
  )
}

function AppointContractor({ buildingId, current, options }: { buildingId: string; current: string | null; options: { orgId: string; name: string }[] }) {
  const [value, setValue] = useState(current ?? '')
  const changed = value !== (current ?? '')
  const save = () => {
    const r = act.appointContractor(buildingId, value || null)
    if (!r.ok) return toast.error(r.error ?? 'Could not change the contractor.')
    toast.success(value ? 'Contractor invited' : 'Contractor removed', { description: value ? 'They have been told and can set dates now.' : undefined, action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
      <label htmlFor="appoint-contractor" className="text-sm font-medium text-ink">
        {current ? 'Change contractor' : 'Invite a contractor'}
      </label>
      <div className="flex gap-2">
        <Select id="appoint-contractor" className="flex-1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="None" options={options.map((o) => ({ value: o.orgId, label: o.name }))} data-testid="contractor-select" />
        <Button variant={changed ? 'primary' : 'secondary'} disabled={!changed} onClick={save} data-testid="contractor-save">
          Save
        </Button>
      </div>
      <p className="m-0 text-sm text-muted">They set when each item is expected to come out. You decide what buyers see.</p>
    </div>
  )
}
