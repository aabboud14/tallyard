// The architect picks which planning and sustainability requirements the project tracks. Saving an empty list
// counts as skipping; the setup checklist then marks the step done.
import { useState } from 'react'
import { Save } from 'lucide-react'
import { act, useView } from '../../store'
import { projectRequirementsView, requirementChoiceSummary } from '../../store/selectors/requirements'
import { Button, Callout, Dialog, toast } from '../../ui'
import { RequirementsPicker } from './RequirementsPicker'

type Props = { projectId: string; open: boolean; onOpenChange: (open: boolean) => void }

export function RequirementsDialog({ projectId, open, onOpenChange }: Props) {
  const view = useView(projectRequirementsView, projectId)
  if (!view || !view.canEdit) return null
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Planning and sustainability requirements"
      description={`Pick what to track on this project. Based on ${view.locationText || 'the project region'}.`}
      size="xl"
      testId="requirements-dialog"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="requirements-form" variant="primary" icon={Save} data-testid="requirements-save">
            Save
          </Button>
        </>
      }
    >
      {open ? <RequirementsForm projectId={projectId} initial={view.selected.map((r) => r.id)} onDone={() => onOpenChange(false)} /> : null}
    </Dialog>
  )
}

/** Mounted each time the dialog opens, so the ticks start from what the project tracks now. */
function RequirementsForm({ projectId, initial, onDone }: { projectId: string; initial: string[]; onDone: () => void }) {
  const view = useView(projectRequirementsView, projectId)
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initial))
  const [error, setError] = useState<string | null>(null)
  if (!view) return null
  const summary = requirementChoiceSummary(view.choices, [...picked], view.locationText)
  return (
    <form
      id="requirements-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const r = act.setProjectRequirements(projectId, [...picked])
        if (!r.ok) {
          setError(r.error ?? 'The requirements could not be saved.')
          return
        }
        onDone()
        toast.success('Requirements saved', { action: { label: 'Undo', onClick: r.undo } })
      }}
      className="flex flex-col gap-4"
    >
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      <RequirementsPicker choices={view.choices} selected={picked} onChange={setPicked} selectedText={summary.selectedText} />
    </form>
  )
}

