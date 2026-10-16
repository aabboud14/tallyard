// The architect edits a project's details: name, type (with a description for 'Other'), region, local authority
// and description. The RIBA stage and every date live in the programme dialog. A new location keeps only the
// requirements that still apply there: the dialog says how many go and how many are new, and saving opens the
// requirements to review, starting from what still applies plus the new suggestions.
// While the architect has not chosen, the suggestions for the new place are tracked with nothing to review.
import { useState, type FormEvent, type ReactElement } from 'react'
import type { ProjectType } from '../../domain/v1types'
import { PROJECT_TYPE_OTHER_MAX } from '../../domain/reference/projectTypes'
import { act, useView } from '../../store'
import { newProjectOptions } from '../../store/selectors/project'
import { projectFields, type ProjectFields } from '../../store/selectors/arch-project'
import { projectRequirementsView, requirementsAfterMove } from '../../store/selectors/requirements'
import { Button, Callout, Dialog, Field, Input, Select, Textarea, toast } from '../../ui'
import { LocalAuthorityField, RegionField, type Place } from './LocalAuthorityField'
import { RequirementsDialog } from './RequirementsDialog'

const BLANK: ProjectFields = { name: '', projectType: 'office', projectTypeOther: '', ribaStage: 2, startDate: '', region: '', localAuthority: '', description: '' }

export function EditProjectDialog({ projectId, trigger }: { projectId: string; trigger: ReactElement }) {
  const options = useView(newProjectOptions)
  const fields = useView(projectFields, projectId)
  const requirements = useView(projectRequirementsView, projectId)
  const [open, setOpen] = useState(false)
  const [review, setReview] = useState<string[] | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('office')
  const [typeOther, setTypeOther] = useState('')
  const [region, setRegion] = useState('')
  const [localAuthority, setLocalAuthority] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    const v = fields ?? BLANK
    setName(v.name)
    setType(v.projectType)
    setTypeOther(v.projectTypeOther)
    setRegion(v.region)
    setLocalAuthority(v.localAuthority)
    setDescription(v.description)
    setError(null)
  }

  const chosen = requirements ? requirements.selected.map((x) => x.id) : []
  const move = fields && requirements?.reviewed ? requirementsAfterMove(chosen, fields, { region, localAuthority }) : null
  const setPlace = (next: Place) => {
    setRegion(next.region)
    setLocalAuthority(next.localAuthority)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = act.updateProject(projectId, { name, projectType: type, projectTypeOther: type === 'other' ? typeOther : '', region, localAuthority, description })
    if (!r.ok) {
      setError(r.error ?? 'The project could not be saved.')
      return
    }
    setOpen(false)
    if (move?.text) {
      // The review opens at once; a short toast, so it never covers the dialog's buttons.
      setReview(move.preselect)
      toast.success('Project details saved')
    } else toast.success('Project details saved', { action: { label: 'Undo', onClick: r.undo } })
  }

  if (!options || !fields) return null
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (o) load()
          setOpen(o)
        }}
        trigger={trigger}
        title="Project details"
        description="The RIBA stage and dates are in Edit programme, on the overview."
        size="lg"
        testId="edit-project-dialog"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="edit-project-form" variant="primary" data-testid="edit-project-save">
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
            <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="edit-project-name" />
          </Field>
          <Field label="Project type" className={type === 'other' ? '' : 'sm:col-span-2'}>
            <Select value={type} onChange={(e) => setType(e.target.value as ProjectType)} options={options.types} data-testid="edit-project-type" />
          </Field>
          {type === 'other' ? (
            <Field label="Describe the type" optional hint="Seen by your project team only.">
              <Input value={typeOther} onChange={(e) => setTypeOther(e.target.value)} placeholder="For example, data centre" maxLength={PROJECT_TYPE_OTHER_MAX} data-testid="edit-project-type-other" />
            </Field>
          ) : null}
          <RegionField region={region} onChange={setPlace} testId="edit-project-region" />
          <LocalAuthorityField key={region} region={region} value={localAuthority} onChange={setPlace} testId="edit-project-local-authority" />
          {open && move?.text ? (
            <div className="sm:col-span-2" data-testid="edit-project-requirements-note">
              <Callout tone="info" role="status">
                {move.text} Saving opens the requirements so you can review them.
              </Callout>
            </div>
          ) : null}
          <Field label="Description" optional className="sm:col-span-2">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </form>
      </Dialog>
      <RequirementsDialog projectId={projectId} open={review !== null} onOpenChange={(o) => (o ? undefined : setReview(null))} preselect={review} />
    </>
  )
}
