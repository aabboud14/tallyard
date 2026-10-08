// Sharing: which projects may see the lots you share privately. Each project is a blind line: the kind of team and
// project, the region and when it needs materials, never who it is. Applies to every building you own.
import { Link, useParams } from 'react-router'
import { CalendarClock, EyeOff, FolderLock, MapPin, Users } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import { Card, Callout, EmptyState, Switch, toast } from '../../ui'
import { StatStrip } from '../notifications/kit'

export function Sharing() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.sharingView)
  if (!v) return null
  const toggle = (projectId: string, granted: boolean) => {
    const r = act.setProjectAccess(projectId, granted)
    if (!r.ok) return toast.error(r.error ?? 'Could not change sharing.')
    toast.success(granted ? 'Project can now see your shared lots' : 'Project can no longer see your shared lots', { description: granted && v.sharedLotCount > 0 ? 'Its team has been told, without your name.' : undefined, action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div className="flex flex-col gap-6" data-testid="sharing">
      <StatStrip
        items={[
          { label: 'Lots shared', value: v.sharedLotCount, sub: 'Across your buildings', href: `/app/buildings/${buildingId}/listings` },
          { label: 'Projects allowed', value: v.grantedCount, sub: `Of ${v.rows.length} on the platform` },
        ]}
      />
      <Callout icon={EyeOff} title="Both sides stay anonymous">
        You see each project as a blind line. Its team sees your lots in confidence, as listed by an asset owner, and agrees not to pass them on. Names are exchanged only when you accept a reservation.
      </Callout>
      {v.empty ? (
        <EmptyState icon={FolderLock} title="No projects to share with yet" text="Projects appear here as architects create them on the platform." />
      ) : (
        <Card>
          <ul className="m-0 list-none divide-y divide-line-soft p-0" aria-label="Projects">
            {v.rows.map((r) => (
              <li key={r.projectId} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5" data-testid={`share-${r.projectId}`}>
                <div className="min-w-0">
                  <p className="m-0 text-base font-medium text-ink">
                    {r.orgType}, {r.projectType}
                  </p>
                  <p className="m-0 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin aria-hidden="true" className="size-3.5 text-faint" />
                      {r.region}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock aria-hidden="true" className="size-3.5 text-faint" />
                      Needed by {r.needByQuarter}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users aria-hidden="true" className="size-3.5 text-faint" />
                      {r.granted ? 'Can see your shared lots' : 'Cannot see them'}
                    </span>
                  </p>
                </div>
                <Switch checked={r.granted} onCheckedChange={(on) => toggle(r.projectId, on)} aria-label={`Share with ${r.text}`} data-testid={`share-toggle-${r.projectId}`} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="m-0 text-sm text-muted">
        Choose which lots are shared in <Link to={`/app/buildings/${buildingId}/listings`} className="font-medium text-ink-soft underline decoration-line-strong underline-offset-4 hover:text-ink">Listings</Link>.
      </p>
    </div>
  )
}

export default Sharing
