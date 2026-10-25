// Appointing an architecture practice to an owner's New project: a card on the overview and the Team tab, and a
// dialog from the buildings list. Shown only while the project has no architect and the viewer is its owner.
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { act, useView } from '../../store'
import { appointArchitectView, type AppointArchitectView } from '../../store/selectors/project'
import { Button, Card, Dialog, Field, Select, toast } from '../../ui'

const TITLE = 'Appoint an architect to start sourcing'
const TEXT = 'They shortlist reclaimed materials for this project and send them to you. You approve what they propose, then reserve it.'

function appoint(projectId: string, orgId: string): boolean {
  const r = act.appointProjectArchitect(projectId, orgId)
  if (!r.ok) {
    toast.error(r.error ?? 'Could not appoint the architect.')
    return false
  }
  toast.success('Architect appointed', { description: 'They have been told and can start shortlisting.' })
  return true
}

function practiceOptions(view: AppointArchitectView) {
  return view.options.map((a) => ({ value: a.orgId, label: a.name }))
}

/** The card on the overview and the Team tab. Renders nothing once an architect is appointed. */
export function AppointArchitectCard({ projectId, testId = 'appoint-architect-card' }: { projectId: string; testId?: string }) {
  const view = useView(appointArchitectView, projectId)
  const [value, setValue] = useState('')
  if (!view) return null
  return (
    <Card padding="md" className="flex flex-col gap-4 border-brand-200 bg-brand-50/40" data-testid={testId}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-700 ring-1 ring-inset ring-brand-200">
          <UserPlus aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-base font-semibold text-ink">{TITLE}</h2>
          <p className="m-0 mt-0.5 text-sm text-ink-soft">{TEXT}</p>
        </div>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (value && appoint(projectId, value)) setValue('')
        }}
      >
        <Field label="Architecture practice" className="min-w-0 flex-1 sm:max-w-sm">
          <Select value={value} onChange={(e) => setValue(e.target.value)} placeholder="Choose a practice" options={practiceOptions(view)} data-testid={`${testId}-select`} />
        </Field>
        <Button type="submit" variant="primary" icon={UserPlus} disabled={!value} data-testid={`${testId}-save`}>
          Appoint
        </Button>
      </form>
    </Card>
  )
}

/** The same choice in a dialog, opened from a row of the buildings list. */
export function AppointArchitectDialog({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const view = useView(appointArchitectView, projectId ?? '')
  const [value, setValue] = useState('')
  const close = () => {
    setValue('')
    onClose()
  }
  return (
    <Dialog
      open={!!projectId && !!view}
      onOpenChange={(o) => !o && close()}
      title={TITLE}
      description={view ? `${view.projectName}. They shortlist reclaimed materials; you approve what they propose.` : undefined}
      size="sm"
      testId="appoint-architect"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" disabled={!value} onClick={() => projectId && appoint(projectId, value) && close()} data-testid="appoint-architect-save">
            Appoint
          </Button>
        </>
      }
    >
      <Field label="Architecture practice">
        <Select value={value} onChange={(e) => setValue(e.target.value)} placeholder="Choose a practice" options={view ? practiceOptions(view) : []} data-testid="appoint-architect-select" />
      </Field>
    </Dialog>
  )
}
