// Moving a surveyor's early captures into an appointment (audit 16 October, note 26). When an owner appoints the firm
// to a building the firm had already added itself, the firm is asked whether to move what it captured into the
// appointment, so it does not end up with two records of one building. Keep separate is remembered in this browser
// for the person; the matcher's pairs come from mergeCandidates, and 'Move into an appointment' covers what it misses.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { FolderInput, GitMerge, X } from 'lucide-react'
import { act, useView, useViewer } from '../../store'
import { mergeCandidates, mergeTargets, type MergeCandidate } from '../../store/selectors/claims'
import { Button, Callout, Dialog, Field, Select, toast, usePersistentToggle } from '../../ui'

function dismissId(userId: string, c: Pick<MergeCandidate, 'fromId' | 'intoId'>): string {
  return `merge-kept-separate:${userId}:${c.fromId}:${c.intoId}`
}

function useMerge() {
  const navigate = useNavigate()
  return (fromId: string, intoId: string) => {
    const r = act.mergeSurveyBuilding(fromId, intoId)
    if (!r.ok || !r.value) return toast.error(r.error ?? 'Could not move the items.')
    const { moved, intoId: to, intoName: name, retagged } = r.value
    toast.success(moved === 0 ? `Merged into ${name}` : `${moved} ${moved === 1 ? 'item' : 'items'} moved to ${name}`, {
      description: retagged ? 'They continue its numbering. The owner has been told.' : moved > 0 ? 'The owner has been told. They stay private until the owner decides.' : undefined,
      action: { label: 'Undo', onClick: r.undo },
    })
    navigate(`/app/buildings/${to}`)
  }
}

/** One callout for one pair, with Move items here and Keep separate. */
function CandidateCallout({ c, userId, where }: { c: MergeCandidate; userId: string; where: 'appointment' | 'unlinked' }) {
  const [kept, setKept] = usePersistentToggle(dismissId(userId, c), false)
  const merge = useMerge()
  if (kept) return null
  return (
    <Callout
      tone="warning"
      icon={GitMerge}
      title={where === 'unlinked' ? c.mergeTitle : `${c.fromName} is here twice`}
      className="max-sm:flex-wrap"
    >
      <div className="flex flex-col gap-3" data-testid={`merge-callout-${c.fromId}`}>
        <p className="m-0">{c.prompt}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" icon={FolderInput} onClick={() => merge(c.fromId, c.intoId)} data-testid={`merge-move-${c.fromId}`}>
            {c.actionLabel}
          </Button>
          <Button size="sm" icon={X} onClick={() => setKept(true)} data-testid={`merge-keep-${c.fromId}`}>
            Keep separate
          </Button>
        </div>
      </div>
    </Callout>
  )
}

/** The callouts for an appointed building (on the home and Appointments), or for an unlinked building's overview. */
export function MergeCallouts({ intoId, fromId, className }: { intoId?: string; fromId?: string; className?: string }) {
  const viewer = useViewer()
  const all = useView(mergeCandidates)
  if (!viewer || !all) return null
  const shown = all.filter((c) => (intoId ? c.intoId === intoId : true) && (fromId ? c.fromId === fromId : true))
  if (shown.length === 0) return null
  return (
    <div className={className ?? 'flex flex-col gap-2'} data-testid="merge-callouts">
      {shown.map((c) => (
        <CandidateCallout key={`${c.fromId}-${c.intoId}`} c={c} userId={viewer.userId} where={fromId ? 'unlinked' : 'appointment'} />
      ))}
    </div>
  )
}

/** For the unlinked building's Owner card: move its captures into any appointment of the firm's, when the matcher misses. */
export function MoveIntoAppointment({ fromId, fromName }: { fromId: string; fromName: string }) {
  const targets = useView(mergeTargets, fromId)
  const [open, setOpen] = useState(false)
  const [intoId, setIntoId] = useState('')
  const merge = useMerge()
  if (!targets || targets.length === 0) return null
  return (
    <>
      <Button size="sm" icon={FolderInput} onClick={() => setOpen(true)} data-testid="move-into-appointment">
        Move into an appointment
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Move ${fromName} into an appointment`}
        description="When an owner has since appointed your firm to this building, move what you captured into their record. This record is then removed."
        size="sm"
        testId="move-into-dialog"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              icon={FolderInput}
              disabled={!intoId}
              onClick={() => {
                setOpen(false)
                merge(fromId, intoId)
              }}
              data-testid="move-into-confirm"
            >
              Move items
            </Button>
          </>
        }
      >
        <Field label="Appointed building" required>
          <Select value={intoId} onChange={(e) => setIntoId(e.target.value)} placeholder="Choose a building" options={targets.map((t) => ({ value: t.id, label: t.label }))} data-testid="move-into-select" />
        </Field>
      </Dialog>
    </>
  )
}
