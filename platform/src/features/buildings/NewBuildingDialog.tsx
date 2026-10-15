// Add building. A donor building owner chooses Donor building (coming down: survey it and offer what it holds) or New
// project (going up: source reclaimed materials for it, with an architect if they have one). A surveyor adds a
// building to survey before any appointment, and may ask its owner to confirm it by email.
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Building2, HardHat, Plus } from 'lucide-react'
import type { StructuralElement } from '../../domain/types'
import type { ProjectType } from '../../domain/v1types'
import { act, selectors, useView } from '../../store'
import { localAuthorityChoices } from '../../store/selectors/project'
import { blankElement } from '../../store/selectors/buildings-ui'
import { Button, Dialog, Field, Input, RadioCards, Select, Textarea, toast } from '../../ui'
import { StructureEditor } from './StructureCard'

type Kind = 'donor' | 'project'

type Draft = {
  name: string
  address: string
  postcodeDistrict: string
  localAuthority: string
  region: string
  yearBuilt: string
  storeys: string
  giaM2: string
  structureType: string
  stripOutStart: string
  dismantlingStart: string
  clearBy: string
  surveyorOrgId: string
  ownerName: string
  ownerEmail: string
  ownerMessage: string
  projectType: string
  projectTypeOther: string
  ribaStage: string
  startDate: string
  architectOrgId: string
}

const EMPTY: Draft = {
  name: '',
  address: '',
  postcodeDistrict: '',
  localAuthority: '',
  region: '',
  yearBuilt: '',
  storeys: '',
  giaM2: '',
  structureType: '',
  stripOutStart: '',
  dismantlingStart: '',
  clearBy: '',
  surveyorOrgId: '',
  ownerName: '',
  ownerEmail: '',
  ownerMessage: '',
  projectType: '',
  projectTypeOther: '',
  ribaStage: '2',
  startDate: '',
  architectOrgId: '',
}

const START_ROWS: StructuralElement[] = [blankElement('frame'), blankElement('floors')]

/** Another local authority, typed: the choice that reveals the text field outside London. */
const OTHER_LA = '__other'

function intOrNull(s: string): number | null {
  const t = s.replace(/,/g, '').trim()
  return t === '' ? null : Number(t)
}

export type Created = { kind: 'building' | 'project'; id: string; name: string }

export function NewBuildingDialog({ open, onOpenChange, onCreated, donorOnly = false }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (c: Created) => void; donorOnly?: boolean }) {
  const options = useView(selectors.newBuildingOptions)
  const navigate = useNavigate()
  const [kind, setKind] = useState<Kind>('donor')
  const [d, setD] = useState<Draft>(EMPTY)
  const [rows, setRows] = useState<StructuralElement[]>(START_ROWS)
  const [otherLa, setOtherLa] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!options) return null
  const surveyor = options.mode === 'surveyor'
  const project = !surveyor && !donorOnly && kind === 'project'
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setD((x) => ({ ...x, [k]: e.target.value }))
  const close = () => {
    setD(EMPTY)
    setRows(START_ROWS)
    setKind('donor')
    setOtherLa(false)
    setError(null)
    onOpenChange(false)
  }
  const done = (c: Created, title: string, description: string) => {
    toast.success(title, { description })
    close()
    if (onCreated) onCreated(c)
    else navigate(c.kind === 'project' ? `/app/projects/${c.id}` : `/app/buildings/${c.id}`)
  }
  const details = () => ({
    name: d.name,
    address: d.address,
    postcodeDistrict: d.postcodeDistrict,
    localAuthority: d.localAuthority,
    region: d.region,
    yearBuilt: intOrNull(d.yearBuilt),
    storeys: intOrNull(d.storeys),
    giaM2: intOrNull(d.giaM2),
    structureType: d.structureType,
    structure: rows,
    stripOutStart: d.stripOutStart || null,
    dismantlingStart: d.dismantlingStart || null,
    clearBy: d.clearBy || null,
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = d.name.trim()
    if (project) {
      const r = act.createOwnerProject({
        name: d.name,
        projectType: (d.projectType || null) as ProjectType | null,
        projectTypeOther: d.projectTypeOther,
        localAuthority: d.localAuthority,
        region: d.region,
        ribaStage: Number(d.ribaStage),
        startDate: d.startDate,
        architectOrgId: d.architectOrgId || null,
      })
      if (!r.ok || !r.value) return setError(r.error)
      return done({ kind: 'project', id: r.value, name }, `${name} added`, d.architectOrgId ? 'Your architect has been told.' : 'Appoint an architect when you are ready.')
    }
    if (surveyor) {
      const asking = d.ownerEmail.trim() !== ''
      const r = act.createSurveyBuilding({ ...details(), owner: asking ? { email: d.ownerEmail, name: d.ownerName, message: d.ownerMessage } : null })
      if (!r.ok || !r.value) return setError(r.error)
      return done({ kind: 'building', id: r.value, name }, `${name} added`, asking ? 'The owner sees your request when they sign in with that email.' : 'Ask its owner to confirm it when you are ready.')
    }
    const r = act.createBuilding({ ...details(), surveyorOrgId: d.surveyorOrgId || null })
    if (!r.ok || !r.value) return setError(r.error)
    return done({ kind: 'building', id: r.value, name }, `${name} added`, d.surveyorOrgId ? 'The surveyor has been told.' : 'Appoint a surveyor when you are ready.')
  }
  const la = localAuthorityChoices(d.region)
  const title = surveyor ? 'Add a building to survey' : project ? 'Add a new project' : 'Add a building'
  const description = surveyor ? 'Private to your firm until its owner confirms it.' : project ? 'You are its client. Your architect shortlists; you approve and reserve.' : 'Its record is private to your organisation. Nothing is listed until you decide.'
  const saveLabel = surveyor ? 'Add building' : project ? 'Add new project' : donorOnly ? 'Add building' : 'Add donor building'
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      title={title}
      description={description}
      size="xl"
      testId="new-building"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-building-form" icon={Plus} data-testid="new-building-save">
            {saveLabel}
          </Button>
        </>
      }
    >
      <form id="new-building-form" onSubmit={submit} className="flex flex-col gap-6" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" data-testid="new-building-error">
            {error}
          </p>
        ) : null}
        {!surveyor && !donorOnly ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-semibold text-ink">What kind of building?</legend>
            <RadioCards
              aria-label="What kind of building?"
              value={kind}
              onValueChange={(v) => {
                setKind(v as Kind)
                setError(null)
              }}
              columns={2}
              options={options.kinds.map((k) => ({ value: k.value, label: k.label, description: k.description, icon: k.value === 'donor' ? Building2 : HardHat }))}
              data-testid="nb-kind"
            />
          </fieldset>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={project ? 'Project name' : 'Building name'} required className="sm:col-span-2">
            <Input value={d.name} onChange={set('name')} placeholder={project ? 'For example, Wexcombe House' : 'For example, Calder House'} autoFocus data-testid="nb-name" />
          </Field>
          {project ? null : (
            <>
              <Field label="Address" required className="sm:col-span-2">
                <Input value={d.address} onChange={set('address')} placeholder="Street, town" data-testid="nb-address" />
              </Field>
              <Field label="Postcode district" optional>
                <Input value={d.postcodeDistrict} onChange={set('postcodeDistrict')} placeholder="EC2" />
              </Field>
            </>
          )}
          <Field label="Region" required className={project ? undefined : 'sm:order-last sm:col-span-2'}>
            <Select
              value={d.region}
              onChange={(e) => {
                setD((x) => ({ ...x, region: e.target.value, localAuthority: '' }))
                setOtherLa(false)
              }}
              placeholder="Choose a region"
              options={options.regions.map((r) => ({ value: r, label: r }))}
              data-testid="nb-region"
            />
          </Field>
          <Field label="Local authority" optional>
            {project && d.region ? (
              <div className="flex flex-col gap-2">
                <Select
                  value={otherLa ? OTHER_LA : d.localAuthority}
                  onChange={(e) => {
                    const v = e.target.value
                    setOtherLa(v === OTHER_LA)
                    setD((x) => ({ ...x, localAuthority: v === OTHER_LA ? '' : v }))
                  }}
                  placeholder="Not set"
                  options={[...la.options.map((o) => ({ value: o, label: o })), ...(la.allowsOther ? [{ value: OTHER_LA, label: 'Another local authority' }] : [])]}
                  data-testid="nb-local-authority"
                />
                {otherLa ? <Input aria-label="Local authority name" value={d.localAuthority} onChange={set('localAuthority')} placeholder="Name of the local authority" /> : null}
              </div>
            ) : (
              <Input value={d.localAuthority} onChange={set('localAuthority')} placeholder={project ? 'Choose a region first' : 'City of London'} disabled={project} data-testid="nb-local-authority" />
            )}
          </Field>
        </div>

        {project ? (
          <ProjectFields d={d} set={set} options={options} />
        ) : (
          <>
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
            </fieldset>
            <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
              <legend className="mb-1 text-sm font-semibold text-ink">
                Structure <span className="font-normal text-muted">Optional</span>
              </legend>
              <p className="m-0 -mt-1 text-sm text-muted">The frame and floor slabs first; add the roof, stability, foundations or facade if you know them.</p>
              <StructureEditor rows={rows} options={options.structure} onChange={setRows} mode="compact" />
              <Field label="Other notes on the structure" optional>
                <Input value={d.structureType} onChange={set('structureType')} placeholder="For example: cores at the north and east corners" />
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
            {surveyor ? (
              <fieldset className="m-0 grid gap-4 rounded-lg border border-line-soft bg-page/60 p-4 sm:grid-cols-2">
                <legend className="px-1 text-sm font-semibold text-ink">
                  Ask the owner to confirm <span className="font-normal text-muted">Optional</span>
                </legend>
                <Field label="Owner's name">
                  <Input value={d.ownerName} onChange={set('ownerName')} autoComplete="off" data-testid="nb-owner-name" />
                </Field>
                <Field label="Owner's email">
                  <Input type="email" value={d.ownerEmail} onChange={set('ownerEmail')} autoComplete="off" data-testid="nb-owner-email" />
                </Field>
                <Field label="Message" className="sm:col-span-2" hint="Nothing is emailed in the sandbox. The owner sees the request when they sign in with this email.">
                  <Textarea rows={2} value={d.ownerMessage} onChange={set('ownerMessage')} placeholder="For example: we surveyed it ahead of the strip-out tender." />
                </Field>
              </fieldset>
            ) : (
              <Field label="Surveyor" optional hint="The firm can capture items as soon as you appoint them. You can do this later.">
                <Select value={d.surveyorOrgId} onChange={set('surveyorOrgId')} placeholder="Not yet" options={options.surveyors.map((s) => ({ value: s.orgId, label: s.name }))} data-testid="nb-surveyor" />
              </Field>
            )}
          </>
        )}
      </form>
    </Dialog>
  )
}

function ProjectFields({ d, set, options }: { d: Draft; set: (k: keyof Draft) => (e: { target: { value: string } }) => void; options: NonNullable<ReturnType<typeof selectors.newBuildingOptions>> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Project type" required>
        <Select value={d.projectType} onChange={set('projectType')} placeholder="Choose a type" options={options.projectTypes} data-testid="nb-project-type" />
      </Field>
      {d.projectType === 'other' ? (
        <Field label="Describe the project" optional hint="For your team only. Sellers never see it.">
          <Input value={d.projectTypeOther} onChange={set('projectTypeOther')} />
        </Field>
      ) : (
        <Field label="RIBA stage" required>
          <Select value={d.ribaStage} onChange={set('ribaStage')} options={options.stages.map((s) => ({ value: String(s.value), label: s.label }))} data-testid="nb-stage" />
        </Field>
      )}
      {d.projectType === 'other' ? (
        <Field label="RIBA stage" required>
          <Select value={d.ribaStage} onChange={set('ribaStage')} options={options.stages.map((s) => ({ value: String(s.value), label: s.label }))} data-testid="nb-stage" />
        </Field>
      ) : null}
      <Field label="Materials needed on site from" required hint="Stage dates are suggested from this. You can change them later.">
        <Input type="date" value={d.startDate} onChange={set('startDate')} data-testid="nb-start" />
      </Field>
      <Field label="Architect" optional className="sm:col-span-2" hint="They can start shortlisting at once. You approve what they propose.">
        <Select value={d.architectOrgId} onChange={set('architectOrgId')} placeholder="Not yet" options={options.architects.map((a) => ({ value: a.orgId, label: a.name }))} data-testid="nb-architect" />
      </Field>
    </div>
  )
}
