// The building workspace: the header with the building's drawing, its survey and the people on it (or, for a building
// the surveying firm added, where it stands with its owner), the tabs for the person's side (owner, surveyor or
// deconstruction contractor), and the page for the tab.
import { useState, type FormEvent } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router'
import { Building, Building2, CalendarClock, Camera, MapPin, Pencil, UserRound } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { BuildingRef } from '../../store/selectors/owner'
import { BuildingThumb, Button, Callout, Dialog, Field, Input, Pill, Tabs, toast } from '../../ui'
import { buildingVisual } from '../../store/selectors/buildings-ui'
import { buildingMoveNote } from '../../store/selectors/buildingRequirements'
import { LocalAuthorityField, RegionField, type Place } from '../projects/LocalAuthorityField'
import { ClaimActions } from './ClaimDialog'
import { Page } from '../../app/Page'
import { SURVEY_TONE } from './labels'

export function BuildingLayout() {
  const { buildingId = '' } = useParams()
  const { pathname } = useLocation()
  const h = useView(selectors.buildingHeader, buildingId)
  const visual = useView(buildingVisual, buildingId)
  const [editing, setEditing] = useState(false)
  if (!h) return null
  const tab = pathname.split('/')[4] ?? 'overview'
  const owner = h.side === 'owner'
  const unlinked = h.claim && h.claim.status !== 'linked' ? h.claim : null
  const roleText = owner ? 'You own this building' : h.side === 'contractor' ? 'You set availability dates' : h.isContractor ? 'You survey it and set its dates' : 'You are the surveyor'
  return (
    <div data-testid="building" data-side={h.side}>
      <div className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto w-full max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              {visual ? <BuildingThumb sketch={visual.sketch} size="md" className="mt-0.5" testId="building-thumb" /> : <Building2 aria-hidden="true" className="mt-1 size-6 text-faint" />}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h1 className="m-0 text-2xl font-semibold text-ink" data-testid="building-name">
                    {h.name}
                  </h1>
                  {owner ? (
                    <Pill size="sm" variant="quiet" data-testid="building-kind">
                      {h.kindLabel}
                    </Pill>
                  ) : null}
                </div>
                <p className="m-0 mt-1 text-base text-muted">{h.address}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {owner ? (
                <Button icon={Pencil} onClick={() => setEditing(true)} data-testid="edit-building">
                  Edit details
                </Button>
              ) : h.side === 'contractor' ? (
                tab !== 'availability' ? (
                  <Button asChild variant="primary" icon={CalendarClock}>
                    <Link to={`/app/buildings/${h.id}/availability`}>Set dates</Link>
                  </Button>
                ) : null
              ) : tab !== 'capture' ? (
                <Button asChild variant="primary" icon={Camera}>
                  <Link to={`/app/buildings/${h.id}/capture`}>Capture item</Link>
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            <Pill tone={SURVEY_TONE[h.surveyStatus]} dot size="sm" data-testid="survey-status">
              Survey {h.surveyStatusLabel.toLowerCase()}
            </Pill>
            {owner ? (
              <span className="inline-flex items-center gap-1.5">
                <UserRound aria-hidden="true" className="size-4 text-faint" />
                {h.surveyorName ? `Surveyed by ${h.surveyorName}` : 'No surveyor appointed'}
              </span>
            ) : unlinked ? (
              <span className="inline-flex flex-wrap items-center gap-2" data-testid="building-client">
                <Building aria-hidden="true" className="size-4 text-faint" />
                <span className="font-medium text-ink">{unlinked.status === 'pending' ? `Waiting for ${unlinked.email}` : unlinked.status === 'declined' ? 'Not confirmed by the owner' : 'Owner not linked yet'}</span>
                <ClaimActions buildingId={h.id} buildingName={h.name} claim={unlinked} size="sm" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5" data-testid="building-client">
                <Building aria-hidden="true" className="size-4 text-faint" />
                For <span className="font-medium text-ink">{h.clientName}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4 text-faint" />
              {h.localAuthority ? `${h.localAuthority}, ${h.region}` : h.region}
            </span>
            <span className="text-muted">{roleText}</span>
          </div>
          <div className="mt-5">
            <Tabs label="Building" items={h.tabs.map((t) => ({ label: t.label, href: t.href, active: t.id === tab, testId: `tab-${t.id}`, count: t.badge ?? undefined }))} />
          </div>
        </div>
      </div>
      <Page className="lg:pt-7">
        <Outlet />
      </Page>
      {owner ? <EditBuildingDialog key={editing ? 'open' : 'closed'} header={h} open={editing} onOpenChange={setEditing} /> : null}
    </div>
  )
}

function EditBuildingDialog({ header, open, onOpenChange }: { header: BuildingRef; open: boolean; onOpenChange: (o: boolean) => void }) {
  const o = useView(selectors.buildingOverview, header.id)
  const date = (label: string) => o?.programme.find((p) => p.label === label)?.date ?? ''
  const [name, setName] = useState(header.name)
  const [address, setAddress] = useState(header.address)
  const [strip, setStrip] = useState(date('Strip-out starts'))
  const [dismantle, setDismantle] = useState(date('Dismantling starts'))
  const [clear, setClear] = useState(date('Site clear by'))
  const [place, setPlace] = useState<Place>({ region: header.region, localAuthority: header.localAuthority })
  const [error, setError] = useState<string | null>(null)
  const moveNote = buildingMoveNote(header, place)
  const save = (e: FormEvent) => {
    e.preventDefault()
    const r = act.updateBuilding(header.id, { name, address, region: place.region, localAuthority: place.localAuthority, stripOutStart: strip || null, dismantlingStart: dismantle || null, clearBy: clear || null })
    if (!r.ok) return setError(r.error)
    toast.success('Building details saved', { action: { label: 'Undo', onClick: r.undo } })
    onOpenChange(false)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit building details"
      description="Private to your organisation and your surveyor."
      size="lg"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" type="submit" form="edit-building-form">
            Save
          </Button>
        </>
      }
    >
      <form id="edit-building-form" onSubmit={save} className="flex flex-col gap-4" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Field label="Building name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Address" required>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <RegionField region={place.region} onChange={setPlace} required testId="edit-building-region" />
          <LocalAuthorityField key={place.region} region={place.region} value={place.localAuthority} onChange={setPlace} testId="edit-building-local-authority" />
        </div>
        {moveNote ? (
          <div data-testid="edit-building-requirements-note">
            <Callout tone="info" role="status">
              {moveNote}
            </Callout>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Strip-out starts" optional>
            <Input type="date" value={strip} onChange={(e) => setStrip(e.target.value)} />
          </Field>
          <Field label="Dismantling starts" optional>
            <Input type="date" value={dismantle} onChange={(e) => setDismantle(e.target.value)} />
          </Field>
          <Field label="Site clear by" optional>
            <Input type="date" value={clear} onChange={(e) => setClear(e.target.value)} />
          </Field>
        </div>
      </form>
    </Dialog>
  )
}

export default BuildingLayout
