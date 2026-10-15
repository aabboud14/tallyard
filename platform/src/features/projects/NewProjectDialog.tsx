// Create a project in one form: the project and its type, the client (who must accept) with a message, the
// programme (current stage, site start, practical completion, when materials are needed), the location with the
// planning and sustainability requirements that apply, and the team. Stage dates are suggested from the site start
// and confirmed later on the overview. The short form (first-run onboarding) asks only for name, client, type,
// site start and region; everything else takes its default.
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDown, FolderPlus } from 'lucide-react'
import type { ProjectType } from '../../domain/v1types'
import { PROJECT_TYPE_OTHER_MAX } from '../../domain/reference/projectTypes'
import { act, useView } from '../../store'
import { newProjectOptions } from '../../store/selectors/project'
import { requirementChoiceSummary, requirementChoices } from '../../store/selectors/requirements'
import { validateNewProject, type NewProjectInput, type ProjectField } from '../../store/actions/projects'
import { Button, Callout, cx, Dialog, Field, Input, Select, Textarea, toast } from '../../ui'
import { LocalAuthorityField } from './LocalAuthorityField'
import { RequirementsPicker } from './RequirementsPicker'

const NEW_CLIENT = '__new__'

type Props = { open: boolean; onOpenChange: (open: boolean) => void; short?: boolean; title?: string; description?: string }

function Section({ title, children, first = false }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <fieldset className={cx('m-0 min-w-0 border-0 p-0', !first && 'border-t border-line-soft pt-5')}>
      <legend className="sr-only">{title}</legend>
      <h3 aria-hidden="true" className="m-0 mb-3 text-sm font-semibold text-ink">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export function NewProjectDialog({ open, onOpenChange, short = false, title = 'New project', description = 'Each project gets its own programme, shortlist and specification. Every material is checked against the date materials are needed on site.' }: Props) {
  const options = useView(newProjectOptions)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState<string>('')
  const [clientName, setClientName] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('office')
  const [typeOther, setTypeOther] = useState('')
  const [region, setRegion] = useState('Central London')
  const [localAuthority, setLocalAuthority] = useState('')
  const [stage, setStage] = useState(2)
  const [siteStart, setSiteStart] = useState('')
  const [completion, setCompletion] = useState('')
  const [materialsFrom, setMaterialsFrom] = useState('')
  const [consultant, setConsultant] = useState('')
  const [description2, setDescription2] = useState('')
  const [requirementsOpen, setRequirementsOpen] = useState(false)
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [errors, setErrors] = useState<Partial<Record<ProjectField, string>>>({})
  const [error, setError] = useState<string | null>(null)

  if (!options) return null
  const hasClients = options.clients.length > 0
  const pickedClient = hasClients ? clientId || options.clients[0].orgId : NEW_CLIENT
  const newClient = pickedClient === NEW_CLIENT
  const clientLabel = newClient ? clientName.trim() : (options.clients.find((c) => c.orgId === pickedClient)?.name ?? '')
  const choices = requirementChoices(region, localAuthority, [])
  // Until the architect touches the picker, the suggestions for the current location are the ticks.
  const ticks = picked ?? new Set(choices.suggestedIds)
  const place = [localAuthority, region].filter(Boolean).join(', ')
  const summary = requirementChoiceSummary(choices, [...ticks], place)

  const reset = () => {
    setName('')
    setClientId('')
    setClientName('')
    setClientMessage('')
    setProjectType('office')
    setTypeOther('')
    setLocalAuthority('')
    setStage(2)
    setSiteStart('')
    setCompletion('')
    setMaterialsFrom('')
    setDescription2('')
    setRequirementsOpen(false)
    setPicked(null)
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
      projectTypeOther: projectType === 'other' ? typeOther : '',
      localAuthority: short ? '' : localAuthority,
      region,
      ribaStage: stage,
      startDate: materialsFrom || siteStart,
      siteStart: siteStart || undefined,
      practicalCompletion: completion || undefined,
      requirementIds: !short && requirementsOpen ? [...ticks] : undefined,
      clientMessage,
      description: description2,
      consultantOrgId: consultant || null,
    }
    const invalid = validateNewProject(input, options.minStartDate)
    const map: Partial<Record<ProjectField, string>> = {}
    for (const [field, message] of invalid) {
      // The materials date falls back to site start, so its errors show on site start when it was left blank.
      const shown: ProjectField = field === 'startDate' && !materialsFrom ? 'siteStart' : field
      if (!map[shown]) map[shown] = message
    }
    setErrors(map)
    if (invalid.length > 0) return
    const r = act.createProject(input)
    if (!r.ok || !r.value) {
      setError(r.error ?? 'The project could not be created.')
      return
    }
    onOpenChange(false)
    reset()
    toast.success(`${name.trim()} created`, { description: `Waiting for ${clientLabel || 'the client'} to accept. Set up the programme while you wait.` })
    navigate(`/app/projects/${r.value}`)
  }

  const clientFields = (
    <>
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
    </>
  )

  const typeFields = (
    <>
      <Field label="Project type" error={errors.projectType}>
        <Select value={projectType} onChange={(e) => setProjectType(e.target.value as ProjectType)} options={options.types} data-testid="project-type" />
      </Field>
      {projectType === 'other' ? (
        <Field label="Describe the type" optional error={errors.projectTypeOther} hint="Seen by your project team only.">
          <Input value={typeOther} onChange={(e) => setTypeOther(e.target.value)} placeholder="For example, data centre" maxLength={PROJECT_TYPE_OTHER_MAX} data-testid="project-type-other" />
        </Field>
      ) : null}
    </>
  )

  const regionField = (
    <Field label="Region" error={errors.region}>
      <Select
        value={region}
        onChange={(e) => {
          setRegion(e.target.value)
          setLocalAuthority('')
        }}
        options={options.regions.map((r) => ({ value: r, label: r }))}
        data-testid="project-region"
      />
    </Field>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
      title={title}
      description={description}
      size={short ? 'lg' : 'xl'}
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
      <form id="new-project-form" noValidate onSubmit={submit} className="flex flex-col gap-5">
        {error ? (
          <Callout tone="danger" role="alert">
            {error}
          </Callout>
        ) : null}
        {short ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Project name" error={errors.name} className="sm:col-span-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, Riverside Works" autoFocus data-testid="project-name" />
            </Field>
            {clientFields}
            {typeFields}
            <Field label="Site start" error={errors.siteStart ?? errors.startDate} hint="When work starts on site. Stage dates are suggested from it.">
              <Input type="date" value={siteStart} min={options.minStartDate} onChange={(e) => setSiteStart(e.target.value)} data-testid="project-start" />
            </Field>
            {regionField}
          </div>
        ) : (
          <>
            <Section title="Project" first>
              <Field label="Project name" error={errors.name} className="sm:col-span-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, Riverside Works" autoFocus data-testid="project-name" />
              </Field>
              {typeFields}
            </Section>

            <Section title="Client">
              {clientFields}
              <Field label="Message to the client" optional hint={`${clientLabel || 'The client'} must accept before the project appears in their workspace.`} className="sm:col-span-2">
                <Textarea rows={2} value={clientMessage} onChange={(e) => setClientMessage(e.target.value)} placeholder="Why you are adding them, and what you will send for approval" data-testid="project-client-message" />
              </Field>
            </Section>

            <Section title="Programme">
              <Field label="Current RIBA stage" error={errors.ribaStage}>
                <Select value={String(stage)} onChange={(e) => setStage(Number(e.target.value))} options={options.stages.map((s) => ({ value: String(s.value), label: `Stage ${s.label}` }))} data-testid="project-stage" />
              </Field>
              <Field label="Site start" error={errors.siteStart} hint="When work starts on site.">
                <Input type="date" value={siteStart} min={options.minStartDate} onChange={(e) => setSiteStart(e.target.value)} data-testid="project-start" />
              </Field>
              <Field label="Practical completion" optional error={errors.practicalCompletion} hint="Leave blank to use 18 months after site start.">
                <Input type="date" value={completion} min={siteStart || options.minStartDate} onChange={(e) => setCompletion(e.target.value)} data-testid="project-completion" />
              </Field>
              <Field label="Materials needed on site from" optional error={errors.startDate} hint="Leave blank to use the site start.">
                <Input type="date" value={materialsFrom} min={siteStart || options.minStartDate} onChange={(e) => setMaterialsFrom(e.target.value)} data-testid="project-materials-from" />
              </Field>
            </Section>

            <Section title="Location and requirements">
              {regionField}
              <LocalAuthorityField key={region} region={region} value={localAuthority} onChange={setLocalAuthority} error={errors.localAuthority} />
              <div className="sm:col-span-2">
                <div className="rounded-lg border border-line">
                  <button
                    type="button"
                    aria-expanded={requirementsOpen}
                    aria-controls="new-project-requirements"
                    onClick={() => setRequirementsOpen((o) => !o)}
                    data-testid="project-requirements-toggle"
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">
                        Planning and sustainability requirements <span className="font-normal text-muted">Optional</span>
                      </span>
                      <span className="block text-sm text-muted" data-testid="project-requirements-summary">
                        {summary.text}
                      </span>
                    </span>
                    <ChevronDown aria-hidden="true" className={cx('size-4 shrink-0 text-muted transition-transform', requirementsOpen && 'rotate-180')} />
                  </button>
                  <div id="new-project-requirements" hidden={!requirementsOpen} className="border-t border-line-soft p-3.5">
                    {requirementsOpen ? <RequirementsPicker choices={choices} selected={ticks} onChange={setPicked} selectedText={summary.selectedText} /> : null}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Team">
              <Field label="Sustainability consultant" optional>
                <Select value={consultant} onChange={(e) => setConsultant(e.target.value)} placeholder="None yet" options={options.consultants.map((c) => ({ value: c.orgId, label: c.name }))} data-testid="project-consultant" />
              </Field>
              <Field label="Description" optional className="sm:col-span-2">
                <Textarea rows={3} value={description2} onChange={(e) => setDescription2(e.target.value)} placeholder="What you are building and what you hope to reuse" />
              </Field>
            </Section>
          </>
        )}
      </form>
    </Dialog>
  )
}
