// The confidentiality terms for lots an owner shares privately with one project. Accepted once per project; then
// the lots appear under "Shared with you".
import { useState, type ReactElement } from 'react'
import { ShieldCheck } from 'lucide-react'
import { LABELS } from '../../domain/reference/labels'
import { act } from '../../store'
import { Button, Checkbox, Dialog, toast } from '../../ui'

export function TermsDialog({ projectId, projectName, count, trigger }: { projectId: string; projectName: string; count: number; trigger: ReactElement }) {
  const [open, setOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const accept = () => {
    const r = act.acceptTerms(projectId)
    if (!r.ok) {
      toast.error(r.error ?? 'The terms could not be accepted.')
      return
    }
    setOpen(false)
    toast.success(`Terms accepted for ${projectName}`, { description: `${count} shared ${count === 1 ? 'lot is' : 'lots are'} now in Shared with you.` })
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setAgreed(false)
      }}
      trigger={trigger}
      title="Confidentiality terms"
      description={`For lots shared privately with ${projectName}.`}
      testId="terms-dialog"
      footer={
        <>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" icon={ShieldCheck} disabled={!agreed} onClick={accept} data-testid="accept-terms">
            Accept and show lots
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-base text-ink-soft">{LABELS.L6}</p>
        <blockquote className="m-0 rounded-lg border border-line bg-page px-4 py-3 text-base text-ink">{LABELS.L7}</blockquote>
        <Checkbox label={`I accept these terms for ${projectName}`} checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} data-testid="terms-checkbox" />
      </div>
    </Dialog>
  )
}
