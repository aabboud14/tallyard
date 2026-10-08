// The building's overview: programme, survey, what it holds by typology, the facts and recent activity.
// The owner can appoint or change the surveyor here.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, Camera, CalendarRange, ClipboardCheck, Layers, Share2 } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import { formatDate } from '../../domain/dates'
import * as f from '../../domain/format'
import { Button, Card, CardBody, CardHeader, DescriptionList, Pill, SegmentedBar, Select, toast } from '../../ui'
import { ActivityFeed } from '../notifications/kit'
import { SURVEY_TONE, visibilitySegments } from './labels'

export function Overview() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.buildingOverview, buildingId)
  if (!v) return null
  const owner = v.header.side === 'owner'
  const base = `/app/buildings/${buildingId}`
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" data-testid="building-overview">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader title="Programme" icon={CalendarRange} description="The dates materials can come out. Private to you and your surveyor." />
          <CardBody>
            <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3 sm:gap-0">
              {v.programme.map((p, i) => (
                <li key={p.label} className="relative flex gap-3 sm:flex-col sm:gap-2 sm:pr-4">
                  <div className="flex items-center sm:w-full">
                    <span aria-hidden="true" className={`relative z-[1] inline-flex size-3 shrink-0 rounded-full ring-4 ring-surface ${p.date ? 'bg-brand-600' : 'border border-dashed border-line-strong bg-surface'}`} />
                    {i < v.programme.length - 1 ? <span aria-hidden="true" className="ml-2 hidden h-px flex-1 bg-line sm:block" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-sm text-muted">{p.label}</p>
                    <p className={`m-0 mt-0.5 text-base font-medium ${p.date ? 'text-ink' : 'text-faint'}`}>{p.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="What the building holds"
            icon={Layers}
            actions={
              <Button asChild variant="ghost" size="sm" trailingIcon={ArrowRight}>
                <Link to={`${base}/inventory`}>Inventory</Link>
              </Button>
            }
          />
          <ul className="m-0 list-none divide-y divide-line-soft p-0">
            {v.byTypology.map((t) => (
              <li key={t.typology} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <span className="text-base font-medium text-ink">{t.label}</span>
                <span className="flex items-baseline gap-4 text-sm tabular-nums text-muted">
                  <span>
                    <span className="font-medium text-ink">{t.count}</span> {t.count === 1 ? 'item' : 'items'}
                  </span>
                  <span className="w-20 text-right">{f.massT(t.massT)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Activity" />
          <CardBody>
            <ActivityFeed rows={v.activity} emptyText="Captures, decisions and listings for this building appear here." />
          </CardBody>
        </Card>
      </div>

      <aside className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader title="Survey" icon={ClipboardCheck} actions={<Pill tone={SURVEY_TONE[v.survey.status]} dot size="sm">{v.survey.label}</Pill>} />
          <CardBody className="flex flex-col gap-4">
            <DescriptionList
              items={[
                { label: 'Surveyor', value: v.survey.surveyorName || 'Not appointed' },
                { label: 'Items captured', value: v.survey.itemCount },
                { label: 'Submitted', value: v.survey.submittedAt ? formatDate(v.survey.submittedAt.slice(0, 10)) : 'Not yet' },
              ]}
            />
            {owner ? (
              <AppointSurveyor buildingId={buildingId} current={v.surveyorOrgId} options={v.surveyorOptions} />
            ) : (
              <Button asChild variant="primary" icon={Camera} block>
                <Link to={`${base}/capture`}>Capture items</Link>
              </Button>
            )}
          </CardBody>
        </Card>

        {owner ? (
          <Card>
            <CardHeader title="Visibility" icon={Share2} />
            <CardBody className="flex flex-col gap-4">
              <SegmentedBar label="Lots by visibility" segments={visibilitySegments(v.counts)} />
              {v.counts.reserved > 0 ? <p className="m-0 text-sm text-muted">{v.counts.reserved} reserved by a buyer.</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to={`${base}/listings`}>Listings</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to={`${base}/sharing`}>Sharing</Link>
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Building" />
          <CardBody>
            <DescriptionList layout="grid" items={v.facts.map((x) => ({ label: x.label, value: x.value }))} />
          </CardBody>
        </Card>
      </aside>
    </div>
  )
}

function AppointSurveyor({ buildingId, current, options }: { buildingId: string; current: string | null; options: { orgId: string; name: string }[] }) {
  const [value, setValue] = useState(current ?? '')
  const changed = value !== (current ?? '')
  const save = () => {
    const r = act.appointSurveyor(buildingId, value || null)
    if (!r.ok) return toast.error(r.error ?? 'Could not change the surveyor.')
    toast.success(value ? 'Surveyor appointed' : 'Appointment removed', { description: value ? 'They have been told and can start capturing.' : undefined, action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
      <label htmlFor="appoint-surveyor" className="text-sm font-medium text-ink">
        Surveying firm
      </label>
      <div className="flex gap-2">
        <Select id="appoint-surveyor" className="flex-1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="None" options={options.map((o) => ({ value: o.orgId, label: o.name }))} />
        <Button variant={changed ? 'primary' : 'secondary'} disabled={!changed} onClick={save} data-testid="appoint-save">
          Save
        </Button>
      </div>
    </div>
  )
}

export default Overview
