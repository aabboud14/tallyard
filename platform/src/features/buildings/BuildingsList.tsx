// Buildings. The owner sees their portfolio and adds buildings; the surveyor sees the buildings they are appointed
// to, grouped by client.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Building2, Camera, ClipboardList, Plus } from 'lucide-react'
import { act, selectors, useSession, useView } from '../../store'
import type { BuildingCard } from '../../store/selectors/owner'
import { formatDate } from '../../domain/dates'
import { Button, Card, Dialog, EmptyState, Field, Input, PageHeader, Pill, SegmentedBar, Select, Table, TBody, TD, TH, THead, TR, toast } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { SURVEY_TONE, visibilitySegments } from './labels'

export function BuildingsList() {
  const v = useView(selectors.buildingsList)
  const { role } = useSession()
  const [params, setParams] = useSearchParams()
  const open = params.get('new') === '1'
  const setOpen = (o: boolean) => {
    const next = new URLSearchParams(params)
    if (o) next.set('new', '1')
    else next.delete('new')
    setParams(next, { replace: true })
  }
  if (!v) return null
  const owner = role === 'owner'
  return (
    <Page testId="buildings">
      <PageHeader
        title={owner ? 'Buildings' : 'Appointments'}
        subtitle={owner ? 'What your buildings hold, and what you choose to recover and list.' : 'Buildings you are appointed to survey, by client.'}
        actions={
          v.canAdd ? (
            <Button variant="primary" icon={Plus} onClick={() => setOpen(true)} data-testid="add-building">
              Add building
            </Button>
          ) : null
        }
      />
      <div className="mt-6">
        {v.empty ? (
          owner ? (
            <EmptyState
              variant="page"
              icon={Building2}
              title="Add your first building"
              text="Record a building coming down, appoint a surveyor, and decide what to recover and who may see it."
              action={
                <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
                  Add building
                </Button>
              }
            />
          ) : (
            <EmptyState variant="page" icon={ClipboardList} title="No appointments yet" text="When an asset owner appoints your firm to survey a building, it appears here with everything you need to capture it." />
          )
        ) : owner ? (
          <OwnerTable rows={v.rows} />
        ) : (
          <SurveyorGroups rows={v.rows} />
        )}
      </div>
      {v.canAdd ? <NewBuildingDialog open={open} onOpenChange={setOpen} /> : null}
    </Page>
  )
}

function OwnerTable({ rows }: { rows: BuildingCard[] }) {
  return (
    <>
      <Table className="max-md:hidden" caption="Buildings">
        <THead>
          <tr>
            <TH>Building</TH>
            <TH>Survey</TH>
            <TH>Surveyor</TH>
            <TH align="right">Items</TH>
            <TH className="w-[28%]">Visibility</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((b) => (
            <TR key={b.id} interactive className="relative">
              <TD>
                <Link to={b.href} className="font-medium text-ink outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
                  {b.name}
                </Link>
                <span className="block text-sm text-muted">{b.address}</span>
              </TD>
              <TD>
                <Pill tone={SURVEY_TONE[b.surveyStatus]} dot size="sm">
                  {b.surveyStatusLabel}
                </Pill>
              </TD>
              <TD muted>{b.surveyorName || 'Not appointed'}</TD>
              <TD align="right">{b.itemCount}</TD>
              <TD>
                <SegmentedBar label="Lots by visibility" segments={visibilitySegments(b.counts)} legend={false} size="sm" />
                <span className="mt-1 block text-xs text-muted">
                  {b.counts.open} published · {b.counts.matched_only} shared · {b.counts.private} private
                </span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
        {rows.map((b) => (
          <li key={b.id}>
            <BuildingTile b={b} />
          </li>
        ))}
      </ul>
    </>
  )
}

function BuildingTile({ b, surveyor = false }: { b: BuildingCard; surveyor?: boolean }) {
  return (
    <Card interactive padding="md" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-lg font-semibold text-ink">
            <Link to={b.href} className="outline-none after:absolute after:inset-0 after:content-['']">
              {b.name}
            </Link>
          </h3>
          <p className="m-0 mt-0.5 text-sm text-muted">{b.address}</p>
        </div>
        <Pill tone={SURVEY_TONE[b.surveyStatus]} dot size="sm">
          {b.surveyStatusLabel}
        </Pill>
      </div>
      {surveyor ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
          <p className="m-0 text-sm text-ink-soft">
            <span className="font-medium tabular-nums text-ink">{b.itemCount}</span> {b.itemCount === 1 ? 'item' : 'items'} captured
            {b.lastCaptureOn ? <span className="text-muted"> · last {formatDate(b.lastCaptureOn)}</span> : null}
          </p>
          <div className="relative z-[2] flex gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to={`${b.href}/inventory`}>Inventory</Link>
            </Button>
            <Button asChild size="sm" variant="primary" icon={Camera}>
              <Link to={`${b.href}/capture`}>Capture</Link>
            </Button>
          </div>
        </div>
      ) : (
        <SegmentedBar label="Lots by visibility" segments={visibilitySegments(b.counts)} total={`${b.itemCount} items`} size="sm" />
      )}
    </Card>
  )
}

function SurveyorGroups({ rows }: { rows: BuildingCard[] }) {
  const clients = [...new Set(rows.map((r) => r.clientName))]
  return (
    <div className="flex flex-col gap-8">
      {clients.map((c) => (
        <section key={c} aria-label={c}>
          <SectionTitle title={c} description="Client" />
          <div className="grid gap-3 md:grid-cols-2">
            {rows
              .filter((r) => r.clientName === c)
              .map((b) => (
                <BuildingTile key={b.id} b={b} surveyor />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}

type Draft = { name: string; address: string; postcodeDistrict: string; localAuthority: string; region: string; yearBuilt: string; storeys: string; giaM2: string; structureType: string; stripOutStart: string; dismantlingStart: string; clearBy: string; surveyorOrgId: string }

const EMPTY: Draft = { name: '', address: '', postcodeDistrict: '', localAuthority: '', region: '', yearBuilt: '', storeys: '', giaM2: '', structureType: '', stripOutStart: '', dismantlingStart: '', clearBy: '', surveyorOrgId: '' }

function intOrNull(s: string): number | null {
  const t = s.replace(/,/g, '').trim()
  return t === '' ? null : Number(t)
}

function NewBuildingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const options = useView(selectors.newBuildingOptions)
  const navigate = useNavigate()
  const [d, setD] = useState<Draft>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }))
  const close = () => {
    setD(EMPTY)
    setError(null)
    onOpenChange(false)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const r = act.createBuilding({
      name: d.name,
      address: d.address,
      postcodeDistrict: d.postcodeDistrict,
      localAuthority: d.localAuthority,
      region: d.region,
      yearBuilt: intOrNull(d.yearBuilt),
      storeys: intOrNull(d.storeys),
      giaM2: intOrNull(d.giaM2),
      structureType: d.structureType,
      stripOutStart: d.stripOutStart || null,
      dismantlingStart: d.dismantlingStart || null,
      clearBy: d.clearBy || null,
      surveyorOrgId: d.surveyorOrgId || null,
    })
    if (!r.ok || !r.value) {
      setError(r.error)
      return
    }
    toast.success(`${d.name.trim()} added`, { description: d.surveyorOrgId ? 'The surveyor has been told.' : 'Appoint a surveyor when you are ready.' })
    close()
    navigate(`/app/buildings/${r.value}`)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      title="Add a building"
      description="Its record is private to your organisation. Nothing is listed until you decide."
      size="lg"
      testId="new-building"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-building-form" icon={Plus} data-testid="new-building-save">
            Add building
          </Button>
        </>
      }
    >
      <form id="new-building-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Building name" required className="sm:col-span-2">
            <Input value={d.name} onChange={set('name')} placeholder="For example, Calder House" autoFocus data-testid="nb-name" />
          </Field>
          <Field label="Address" required className="sm:col-span-2">
            <Input value={d.address} onChange={set('address')} placeholder="Street, town" data-testid="nb-address" />
          </Field>
          <Field label="Postcode district" optional>
            <Input value={d.postcodeDistrict} onChange={set('postcodeDistrict')} placeholder="EC2" />
          </Field>
          <Field label="Local authority" optional>
            <Input value={d.localAuthority} onChange={set('localAuthority')} placeholder="City of London" />
          </Field>
          <Field label="Region" required className="sm:col-span-2">
            <Select value={d.region} onChange={set('region')} placeholder="Choose a region" options={(options?.regions ?? []).map((r) => ({ value: r, label: r }))} data-testid="nb-region" />
          </Field>
        </div>
        <fieldset className="m-0 grid gap-4 border-0 p-0 sm:grid-cols-3">
          <legend className="mb-3 text-sm font-semibold text-ink">
            The building <span className="font-normal text-muted">Optional</span>
          </legend>
          <Field label="Year built">
            <Input inputMode="numeric" value={d.yearBuilt} onChange={set('yearBuilt')} placeholder="1987" />
          </Field>
          <Field label="Storeys">
            <Input inputMode="numeric" value={d.storeys} onChange={set('storeys')} />
          </Field>
          <Field label="Floor area (m2)">
            <Input inputMode="numeric" value={d.giaM2} onChange={set('giaM2')} />
          </Field>
          <Field label="Structure" className="sm:col-span-3">
            <Input value={d.structureType} onChange={set('structureType')} placeholder="Steel frame with precast floors" />
          </Field>
        </fieldset>
        <fieldset className="m-0 grid gap-4 border-0 p-0 sm:grid-cols-3">
          <legend className="mb-3 text-sm font-semibold text-ink">
            Programme <span className="font-normal text-muted">Optional</span>
          </legend>
          <Field label="Strip-out starts">
            <Input type="date" value={d.stripOutStart} onChange={set('stripOutStart')} />
          </Field>
          <Field label="Dismantling starts">
            <Input type="date" value={d.dismantlingStart} onChange={set('dismantlingStart')} />
          </Field>
          <Field label="Site clear by">
            <Input type="date" value={d.clearBy} onChange={set('clearBy')} />
          </Field>
        </fieldset>
        <Field label="Surveyor" optional hint="The firm can capture items as soon as you appoint them. You can do this later.">
          <Select value={d.surveyorOrgId} onChange={set('surveyorOrgId')} placeholder="Not yet" options={(options?.surveyors ?? []).map((s) => ({ value: s.orgId, label: s.name }))} />
        </Field>
      </form>
    </Dialog>
  )
}

export default BuildingsList
