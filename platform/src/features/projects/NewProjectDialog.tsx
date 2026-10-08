// Create a project: name, client (one of yours or a new one), type, location, RIBA stage and when materials are
// needed on site. The short form (first-run onboarding) asks only for what the timeline check needs.
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { FolderPlus } from 'lucide-react'
import type { ProjectType } from '../../domain/v1types'
import { act, useView } from '../../store'
import { newProjectOptions } from '../../store/selectors/project'
import { validateNewProject, type NewProjectInput, type ProjectField } from '../../store/actions/projects'
import { Button, Callout, Dialog, Field, Input, Select, Textarea, toast } from '../../ui'

const NEW_CLIENT = '__new__'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; short?: boolean; title?: string; description?: string }

export function NewProjectDialog({ open, onOpenChange, short = false, title = 'New project', description = 'Each project gets its own shortlist and specification. Every material is checked against the date materials are needed on site.' }: Props) {
  const options = useView(newProjectOptions)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState<string>('')
  const [clientName, setClientName] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('office')
  const [region, setRegion] = useState('Central London')
  const [localAuthority, setLocalAuthority] = useState('')
  const [stage, setStage] = useState(2)
  const [startDate, setStartDate] = useState('')
  const [consultant, setConsultant] = useState('')
  const [description2, setDescription2] = useState('')
  const [errors, setErrors] = useState<Partial<Record<ProjectField, string>>>({})
  const [error, setError] = useState<string | null>(null)

  if (!options) return null
  const hasClients = options.clients.length > 0
  const pickedClient = hasClients ? clientId || options.clients[0].orgId : NEW_CLIENT
  const newClient = pickedClient === NEW_CLIENT

  const reset = () => {
    setName('')
    setClientId('')
    setClientName('')
    setProjectType('office')
    setLocalAuthority('')
    setStartDate('')
    setDescription2('')
    setErrors({})
    setError(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!options) return
    const input: NewProjectInput = {
      name,
      client: newClient ? { name: clientName } : { orgId: pickedClient },
      projectType,
      localAuthority,
      region,
      ribaStage: stage,
      startDate,
      description: description2,
      consultantOrgId: consultant || null,
    }
    const invalid = validateNewProject(input, options.minStartDate)
    setErrors(Object.fromEntries(invalid))
    if (invalid.length > 0) return
    const r = act.createProject(input)
    if (!r.ok || !r.value) {
      setError(r.error ?? 'The project could not be created.')
      return
    }
    onOpenChange(false)
    reset()
    toast.success(`${name.trim()} created`, { description: 'Find materials for it in Discover.' })
    navigate(`/app/projects/${r.value}`)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
      title={title}
      description={description}
      size="lg"
      testId="new-project-dialog"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="new-project-form" variant="primary" icon={FolderPlus} data-testid="create-project">
            Create project
          </Button>
        </>
      }
    >
      <form id="new-project-form" noValidate onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {error ? (
          <Callout tone="danger" role="alert" className="sm:col-span-2">
            {error}
          </Callout>
        ) : null}
        <Field label="Project name" error={errors.name} className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, Riverside Works" autoFocus data-testid="project-name" />
        </Field>
        {hasClients ? (
          <Field label="Client" error={!newClient ? errors.client : undefined} className={newClient ? '' : 'sm:col-span-2'}>
            <Select value={pickedClient} onChange={(e) => setClientId(e.target.value)} options={[...options.clients.map((c) => ({ value: c.orgId, label: c.name })), { value: NEW_CLIENT, label: 'A new client' }]} data-testid="project-client" />
          </Field>
        ) : null}
        {newClient ? (
          <Field label={hasClients ? 'New client name' : 'Client'} error={errors.client} hint={hasClients ? undefined : 'The developer or organisation you are designing for.'} className={hasClients ? '' : 'sm:col-span-2'}>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client organisation" data-testid="project-client-name" />
          </Field>
        ) : null}
        <Field label="Project type" error={errors.projectType}>
          <Select value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)} options={options.types} data-testid="project-type" />
        </Field>
        <Field label="Materials needed on site from" error={errors.startDate}>
          <Input type="date" value={startDate} min={options.minStartDate} onChange={(e) => setStartDate(e.target.value)} data-testid="project-start" />
        </Field>
        <Field label="Region" error={errors.region}>
          <Select value={region} onChange={(e) => setRegion(e.target.value)} options={options.regions.map((r) => ({ value: r, label: r }))} data-testid="project-region" />
        </Field>
        {short ? null : (
          <>
            <Field label="Local authority" optional>
              <Input value={localAuthority} onChange={(e) => setLocalAuthority(e.target.value)} placeholder="For example, Southwark" />
            </Field>
            <Field label="RIBA stage" error={errors.ribaStage}>
              <Select value={String(stage)} onChange={(e) => setStage(Number(e.target.value))} options={options.stages.map((s) => ({ value: String(s.value), label: `Stage ${s.label}` }))} />
            </Field>
            <Field label="Sustainability consultant" optional>
              <Select value={consultant} onChange={(e) => setConsultant(e.target.value)} placeholder="None yet" options={options.consultants.map((c) => ({ value: c.orgId, label: c.name }))} />
            </Field>
            <Field label="Description" optional className="sm:col-span-2">
              <Textarea rows={3} value={description2} onChange={(e) => setDescription2(e.target.value)} placeholder="What you are building and what you hope to reuse" />
            </Field>
          </>
        )}
      </form>
    </Dialog>
  )
}
