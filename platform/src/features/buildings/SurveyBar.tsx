// The surveyor's hand-over: submit the survey to the building's owner, or reopen it to add more.
import { useState } from 'react'
import { CircleCheck, RotateCcw, Send } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import { formatDate } from '../../domain/dates'
import { Button, Dialog, toast } from '../../ui'

export function SurveyBar({ buildingId, compact = false }: { buildingId: string; compact?: boolean }) {
  const inv = useView(selectors.inventoryView, buildingId)
  const o = useView(selectors.buildingOverview, buildingId)
  const [confirming, setConfirming] = useState(false)
  if (!inv || !o || inv.header.side !== 'surveyor' || inv.rows.length === 0) return null
  const client = inv.header.clientName
  const submitted = inv.header.surveyStatus === 'submitted'
  const submit = () => {
    const r = act.submitSurvey(buildingId)
    setConfirming(false)
    if (!r.ok) return toast.error(r.error ?? 'Could not submit the survey.')
    toast.success('Survey submitted', { description: `${client} has been told and can review the inventory.` })
  }
  const reopen = () => {
    const r = act.reopenSurvey(buildingId)
    if (!r.ok) return toast.error(r.error ?? 'Could not reopen the survey.')
    toast.success('Survey reopened', { description: 'Capture more items, then submit again.', action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div className={compact ? 'flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 shadow-sm' : 'flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between'} data-testid="survey-bar">
      {submitted ? (
        <p className="m-0 flex items-start gap-2 text-base text-ink">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <span>
            Submitted to {client}
            {o.survey.submittedAt ? ` on ${formatDate(o.survey.submittedAt.slice(0, 10))}` : ''}. <span className="text-muted">Items you capture now still reach them. Reopen the survey to mark it as in progress.</span>
          </span>
        </p>
      ) : (
        <p className="m-0 text-base text-ink">
          <span className="font-medium">{inv.rows.length} {inv.rows.length === 1 ? 'item' : 'items'} captured.</span> <span className="text-muted">Submit the survey when the walk-round is done. {client} is told at once.</span>
        </p>
      )}
      {submitted ? (
        <Button icon={RotateCcw} onClick={reopen} data-testid="reopen-survey">
          Reopen survey
        </Button>
      ) : (
        <Button variant="primary" icon={Send} onClick={() => setConfirming(true)} disabled={!inv.canSubmit} data-testid="submit-survey">
          Submit survey
        </Button>
      )}
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Submit the survey to ${client}?`}
        description={`${inv.rows.length} ${inv.rows.length === 1 ? 'item' : 'items'} at ${inv.header.name}. You can reopen it later to add more.`}
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="primary" icon={Send} onClick={submit} data-testid="submit-survey-confirm">
              Submit survey
            </Button>
          </>
        }
      />
    </div>
  )
}
