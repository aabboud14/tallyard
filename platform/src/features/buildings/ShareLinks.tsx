// Share by link, on the Sharing tab: the owner sends a revocable link to chosen shared lots of this building. People
// who open it see those lots as anonymous listings once they accept the terms. The owner sees only how many
// organisations opened it and their types, never who.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Copy, Eye, Link2, Link2Off, Plus, Share2 } from 'lucide-react'
import { act, useView } from '../../store'
import { shareLinksView, type ShareLinkRow, type ShareLinksView } from '../../store/selectors/links'
import { Button, Callout, Card, CardHeader, Checkbox, Dialog, Field, Input, Pill, toast } from '../../ui'

export function ShareLinks({ buildingId }: { buildingId: string }) {
  const v = useView(shareLinksView, buildingId)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<ShareLinkRow | null>(null)
  if (!v) return null
  const copy = async (row: ShareLinkRow) => {
    const url = `${window.location.origin}${row.href}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied', { description: url })
    } catch {
      toast({ title: 'Copy this link', description: url, tone: 'info' })
    }
  }
  const revoke = () => {
    if (!revoking) return
    const r = act.revokeShareLink(revoking.id)
    setRevoking(null)
    if (!r.ok) return toast.error(r.error ?? 'Could not revoke the link.')
    toast.success('Link revoked', { description: 'People who opened it no longer see these lots.' })
  }
  return (
    <Card data-testid="share-links">
      <CardHeader
        title="Share by link"
        icon={Link2}
        description="Send a link to anyone on Tallyard. People who open it see the lots you choose as anonymous listings until you revoke it. Links work only in this browser while the sandbox lasts."
        actions={
          v.canCreate ? (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setCreating(true)} data-testid="create-link">
              Create link
            </Button>
          ) : null
        }
      />
      {!v.canCreate && v.rows.length === 0 ? (
        <div className="p-4 sm:p-5">
          <Callout
            icon={Share2}
            title="Share lots first"
            action={
              <Button asChild size="sm">
                <Link to={`/app/buildings/${buildingId}/listings`}>Listings</Link>
              </Button>
            }
          >
            A link holds lots that are shared in confidence. Set some lots to Shared in Listings, then come back.
          </Callout>
        </div>
      ) : v.rows.length === 0 ? (
        <p className="m-0 px-4 py-4 text-base text-muted sm:px-5">No links yet. Create one for the lots you want to show to someone outside your shared projects.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-line-soft p-0" aria-label="Share links">
          {v.rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" data-testid={`link-${r.id}`}>
              <div className="min-w-0">
                <p className="m-0 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{r.label}</span>
                  <Pill tone={r.status === 'active' ? 'brand' : 'neutral'} dot size="sm" variant="quiet" data-testid="link-status">
                    {r.statusLabel}
                  </Pill>
                </p>
                <p className="m-0 mt-1 text-sm text-muted">
                  {r.status === 'active' && r.activeLotCount !== r.lotCount ? `${r.activeLotCount} of ${r.lotCount} lots still shared` : `${r.lotCount} ${r.lotCount === 1 ? 'lot' : 'lots'}`}. Created {r.createdText} by {r.createdByName}
                  {r.revokedText ? `. Revoked ${r.revokedText}` : ''}.
                </p>
                <p className="m-0 mt-0.5 text-sm text-ink-soft" data-testid="link-opened">
                  {r.openedText}
                </p>
              </div>
              {r.canRevoke ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" icon={Copy} onClick={() => copy(r)} data-testid={`copy-${r.id}`}>
                    Copy link
                  </Button>
                  <Button asChild size="sm" variant="ghost" icon={Eye}>
                    <Link to={r.href} data-testid={`preview-${r.id}`}>
                      Preview
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" icon={Link2Off} onClick={() => setRevoking(r)} data-testid={`revoke-${r.id}`}>
                    Revoke
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {creating ? <CreateLinkDialog buildingId={buildingId} eligible={v.eligible} onClose={() => setCreating(false)} /> : null}
      <Dialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revoke this link?"
        description="People who opened it lose access to these lots at once."
        size="sm"
        footer={
          <>
            <Button onClick={() => setRevoking(null)}>Cancel</Button>
            <Button variant="danger" icon={Link2Off} onClick={revoke} data-testid="revoke-confirm">
              Revoke link
            </Button>
          </>
        }
      />
    </Card>
  )
}

function CreateLinkDialog({ buildingId, eligible, onClose }: { buildingId: string; eligible: ShareLinksView['eligible']; onClose: () => void }) {
  const [label, setLabel] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const open = eligible.filter((e) => !e.reserved)
  const all = open.length > 0 && open.every((e) => chosen.includes(e.lotId))
  const toggle = (id: string, on: boolean) => setChosen((x) => (on ? [...x, id] : x.filter((y) => y !== id)))
  const create = async (e: FormEvent) => {
    e.preventDefault()
    const r = act.createShareLink({ buildingId, lotIds: chosen, label })
    if (!r.ok || !r.value) return setError(r.error)
    const url = `${window.location.origin}/app/links/${r.value}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link created and copied', { description: url, action: { label: 'Undo', onClick: r.undo } })
    } catch {
      toast.success('Link created', { description: url, action: { label: 'Undo', onClick: r.undo } })
    }
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Create a share link"
      description="Choose the shared lots the link shows. You can revoke it at any time."
      testId="create-link-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Link2} type="submit" form="create-link-form" disabled={chosen.length === 0} data-testid="create-link-save">
            Create link
          </Button>
        </>
      }
    >
      <form id="create-link-form" onSubmit={create} className="flex flex-col gap-5" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Field label="Name" optional hint="For your reference. Never shown to people who open the link.">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="For example: steel for the Hackney enquiry" maxLength={80} data-testid="link-label" />
        </Field>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <div className="flex items-center justify-between gap-3">
            <legend className="text-sm font-medium text-ink">Shared lots</legend>
            <Checkbox label="Select all" checked={all} onCheckedChange={(on) => setChosen(on === true ? open.map((e) => e.lotId) : [])} data-testid="link-select-all" />
          </div>
          <ul className="m-0 flex max-h-72 list-none flex-col divide-y divide-line-soft overflow-y-auto rounded-lg border border-line p-0">
            {eligible.map((e) => (
              <li key={e.lotId} className="px-3 py-2">
                <Checkbox
                  checked={chosen.includes(e.lotId)}
                  disabled={e.reserved}
                  onCheckedChange={(on) => toggle(e.lotId, on === true)}
                  label={
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs font-medium tabular-nums text-muted">{e.tag}</span>
                      <span>{e.title}</span>
                    </span>
                  }
                  description={e.reserved ? 'Reserved' : e.quantityText}
                  data-testid={`link-lot-${e.tag}`}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      </form>
    </Dialog>
  )
}
