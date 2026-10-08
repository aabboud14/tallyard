// The building workspace: the header with the building, its survey and the people on it, the tabs for the
// person's side (owner or surveyor), and the page for the tab.
import { useState, type FormEvent } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router'
import { Building, Building2, Camera, MapPin, Pencil, UserRound } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { BuildingRef } from '../../store/selectors/owner'
import { Button, Dialog, Field, Input, Pill, Tabs, toast } from '../../ui'
import { Page } from '../../app/Page'
import { SURVEY_TONE } from './labels'

export function BuildingLayout() {
  const { buildingId = '' } = useParams()
  const { pathname } = useLocation()
  const h = useView(selectors.buildingHeader, buildingId)
  const [editing, setEditing] = useState(false)
  if (!h) return null
  const tab = pathname.split('/')[4] ?? 'overview'
  const owner = h.side === 'owner'
  return (
    <div data-testid="building" data-side={h.side}>
      <div className="border-b border-line bg-gradient-to-b from-page to-surface print:hidden">
        <div className="mx-auto w-full max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="mt-0.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_1px_2px_rgb(28_25_23/0.2)]">
                <Building2 aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="m-0 text-2xl font-semibold text-ink" data-testid="building-name">
                  {h.name}
                </h1>
                <p className="m-0 mt-1 text-base text-muted">{h.address}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {owner ? (
                <Button icon={Pencil} onClick={() => setEditing(true)} data-testid="edit-building">
                  Edit details
                </Button>
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
            <span className="text-muted">{owner ? 'You own this building' : 'You are the surveyor'}</span>
          </div>
          <div className="mt-5">
            <Tabs label="Building" items={h.tabs.map((t) => ({ label: t.label, href: t.href, active: t.id === tab, testId: `tab-${t.id}` }))} />
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
  const [error, setError] = useState<string | null>(null)
  const save = (e: FormEvent) => {
    e.preventDefault()
    const r = act.updateBuilding(header.id, { name, address, stripOutStart: strip || null, dismantlingStart: dismantle || null, clearBy: clear || null })
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
