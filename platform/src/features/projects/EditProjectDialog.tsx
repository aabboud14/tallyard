// The architect edits a project's details. A new start date changes every timeline check on the project.
import { useState, type FormEvent, type ReactElement } from 'react'
import type { ProjectType } from '../../domain/v1types'
import { act, useView } from '../../store'
import { newProjectOptions } from '../../store/selectors/project'
import { projectFields, type ProjectFields } from '../../store/selectors/arch-project'
import { Button, Callout, Dialog, Field, Input, Select, Textarea, toast } from '../../ui'

const BLANK: ProjectFields = { name: '', projectType: 'office', ribaStage: 2, startDate: '', region: '', localAuthority: '', description: '' }

export function EditProjectDialog({ projectId, trigger }: { projectId: string; trigger: ReactElement }) {
  const options = useView(newProjectOptions)
  const fields = useView(projectFields, projectId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('office')
  const [stage, setStage] = useState(2)
  const [startDate, setStartDate] = useState('')
  const [region, setRegion] = useState('')
  const [localAuthority, setLocalAuthority] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    const v = fields ?? BLANK
    setName(v.name)
    setType(v.projectType)
    setStage(v.ribaStage)
    setStartDate(v.startDate)
    setRegion(v.region)
    setLocalAuthority(v.localAuthority)
    setDescription(v.description)
    setError(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = act.updateProject(projectId, { name, projectType: type, ribaStage: stage, startDate, region, localAuthority, description })
    if (!r.ok) {
      setError(r.error ?? 'The project could not be saved.')
      return
    }
    setOpen(false)
    toast.success('Project details saved', { action: { label: 'Undo', onClick: r.undo } })
  }

  if (!options || !fields) return null
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) load()
        setOpen(o)
      }}
      trigger={trigger}
      title="Project details"
      size="lg"
      testId="edit-project-dialog"
      footer={
        <>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-project-form" variant="primary">
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-project-form" noValidate onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {error ? (
          <Callout tone="danger" role="alert" className="sm:col-span-2">
            {error}
          </Callout>
        ) : null}
        <Field label="Project name" className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Project type">
          <Select value={type} onChange={(e) => setType(e.target.value as ProjectType)} options={options.types} />
        </Field>
        <Field label="Materials needed on site from" hint="Every timeline check on this project uses this date.">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Region">
          <Select value={region} onChange={(e) => setRegion(e.target.value)} options={options.regions.map((r) => ({ value: r, label: r }))} />
        </Field>
        <Field label="Local authority" optional>
          <Input value={localAuthority} onChange={(e) => setLocalAuthority(e.target.value)} />
        </Field>
        <Field label="RIBA stage" className="sm:col-span-2">
          <Select value={String(stage)} onChange={(e) => setStage(Number(e.target.value))} options={options.stages.map((s) => ({ value: String(s.value), label: `Stage ${s.label}` }))} />
        </Field>
        <Field label="Description" optional className="sm:col-span-2">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  )
}
