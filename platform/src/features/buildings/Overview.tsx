// The building's overview: programme, structure, what it holds by typology and recent activity in the main column;
// the owner link (for a building the surveying firm added), the survey, the deconstruction contractor, testing,
// visibility and the facts beside it. The owner appoints the surveyor here; the owner or the surveyor invites the
// contractor; a contractor alone sees the programme and its Availability tab.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, Activity as ActivityIcon, CalendarClock, Camera, CalendarRange, ClipboardCheck, FlaskConical, Layers, Share2 } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import { holdsChart } from '../../store/selectors/buildings-ui'
import { formatDate } from '../../domain/dates'
import { BarList, Button, Card, CardBody, CardHeader, CollapsiblePanel, DescriptionList, EmptyState, Pill, SegmentedBar, Select, toast, TYPOLOGY_VIZ } from '../../ui'
import { ActivityFeed } from '../notifications/kit'
import { SURVEY_TONE, visibilitySegments } from './labels'
import { StructureCard } from './StructureCard'
import { ContractorCard } from './ContractorCard'
import { OwnerLinkCard } from './ClaimDialog'

export function Overview() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.buildingOverview, buildingId)
  const holds = useView(holdsChart, buildingId)
  if (!v || !holds) return null
  const side = v.header.side
  const owner = side === 'owner'
  const records = side === 'owner' || side === 'surveyor'
  const base = `/app/buildings/${buildingId}`
  const claim = v.header.claim
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" data-testid="building-overview">
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader title="Programme" icon={CalendarRange} description={side === 'contractor' ? "The owner's dates for the strip-out and dismantling." : 'The dates materials can come out. Private to you and the firms on this building.'} />
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

        <StructureCard buildingId={buildingId} />

        <Card>
          <CardHeader
            title="What the building holds"
            icon={Layers}
            description={holds.empty ? undefined : holds.totalText}
            actions={
              records ? (
                <Button asChild variant="ghost" size="sm" trailingIcon={ArrowRight}>
                  <Link to={`${base}/inventory`}>Inventory</Link>
                </Button>
              ) : null
            }
          />
          <CardBody>
            {holds.empty ? (
              <EmptyState
                variant="inline"
                icon={Layers}
                title="Nothing captured yet"
                text={side === 'contractor' ? 'Items appear here as the surveyor captures them.' : 'Each item the survey records is counted here by typology and mass.'}
                action={
                  records ? (
                    <Button asChild size="sm" icon={Camera}>
                      <Link to={`${base}/capture`}>Capture</Link>
                    </Button>
                  ) : null
                }
              />
            ) : (
              <BarList label="Mass by typology" max={holds.max} items={holds.items.map((t) => ({ ...t, colour: TYPOLOGY_VIZ[t.key] }))} testId="holds-chart" />
            )}
          </CardBody>
        </Card>

        <CollapsiblePanel id="building-activity" title="Recent activity" icon={ActivityIcon} count={v.activity.length} testId="building-activity">
          <div className="px-4 pb-4 sm:px-5">
            <ActivityFeed rows={v.activity} emptyText="Captures, decisions and listings for this building appear here." />
          </div>
        </CollapsiblePanel>
      </div>

      <aside className="flex min-w-0 flex-col gap-6">
        {claim && claim.status !== 'linked' ? <OwnerLinkCard buildingId={buildingId} buildingName={v.header.name} claim={claim} /> : null}

        {side === 'contractor' ? (
          <Card>
            <CardHeader title="Your dates" icon={CalendarClock} />
            <CardBody className="flex flex-col gap-3">
              <p className="m-0 text-base text-ink-soft">
                {v.contractor ? `Dates set for ${v.contractor.datedCount} of ${v.contractor.itemCount} items.` : 'Say when each item is expected to come out.'} The owner sees your dates and decides what buyers see.
              </p>
              <Button asChild variant="primary" icon={CalendarClock} block>
                <Link to={`${base}/availability`}>Set availability dates</Link>
              </Button>
            </CardBody>
          </Card>
        ) : null}

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
            ) : side === 'surveyor' ? (
              <Button asChild variant="primary" icon={Camera} block>
                <Link to={`${base}/capture`}>Capture items</Link>
              </Button>
            ) : null}
          </CardBody>
        </Card>

        {records ? <ContractorCard buildingId={buildingId} /> : null}

        {v.testing ? (
          <Card data-testid="testing-card">
            <CardHeader title="Testing" icon={FlaskConical} actions={v.testing.open > 0 ? <Pill tone="info" dot size="sm">{v.testing.open} open</Pill> : null} />
            <CardBody className="flex flex-col gap-3">
              <p className="m-0 text-base text-ink-soft">
                {v.testing.open > 0 ? "A testing company is booked or waiting to book. Results update each item's test status." : 'Ask a testing company to confirm grade and condition. Buyers see the test status on each listing.'}
              </p>
              <Button asChild size="sm" className="self-start" trailingIcon={ArrowRight}>
                <Link to={v.testing.href}>{v.testing.open > 0 ? 'Open testing' : 'Request testing'}</Link>
              </Button>
            </CardBody>
          </Card>
        ) : null}

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
