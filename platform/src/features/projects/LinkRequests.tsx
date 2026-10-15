// Project requests (/app/projects/requests): architects ask before they add a client organisation to a project.
// The client sees the project's name, the practice, who asked, its type, place, stage and key dates and the
// message, never a shortlist, a listing or a figure, then accepts or declines. PendingLinkRequests shows the
// waiting cards alone, for the top of the client home.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Check, FolderOpen, Inbox, MessageSquareQuote, X } from 'lucide-react'
import { act, useView } from '../../store'
import { clientLinkRequests, type LinkRequestRow } from '../../store/selectors/project'
import { Button, Card, cx, DescriptionList, Dialog, EmptyState, Field, PageHeader, Pill, Textarea, toast } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'

export function LinkRequests() {
  const v = useView(clientLinkRequests)
  if (!v) return null
  const nothing = v.pending.length === 0 && v.answered.length === 0
  return (
    <Page testId="link-requests" width="narrow">
      <PageHeader
        title="Project requests"
        subtitle="Architects ask before they add you as the client on a project. Accept to see the project and approve materials for it."
        leading={
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <Inbox aria-hidden="true" className="size-5" />
          </span>
        }
      />
      {v.pending.length === 0 ? (
        nothing ? (
          <EmptyState
            variant="page"
            illustration="inbox"
            title="No project requests"
            text="When an architect asks to add you as the client on a project, it appears here for you to accept or decline."
            className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface"
            testId="link-requests-empty"
          />
        ) : (
          <EmptyState variant="inline" icon={Inbox} title="Nothing waiting for your answer" text="New requests from architects appear here for you to accept or decline." className="mt-8" testId="link-requests-empty" />
        )
      ) : (
        <section aria-labelledby="pending-title" className="mt-8">
          <SectionTitle id="pending-title" title="Waiting for your answer" description={v.pending.length === 1 ? 'One request' : `${v.pending.length} requests`} />
          <div className="flex flex-col gap-4">
            {v.pending.map((r) => (
              <RequestCard key={r.projectId} row={r} />
            ))}
          </div>
        </section>
      )}
      {v.answered.length > 0 ? (
        <section aria-labelledby="answered-title" className="mt-10">
          <SectionTitle id="answered-title" title="Answered" />
          <Card as="section">
            <ul className="m-0 list-none divide-y divide-line-soft p-0" data-testid="link-requests-answered">
              {v.answered.map((r) => (
                <li key={r.projectId} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5" data-testid={`answered-${r.projectId}`}>
                  <span className={cx('inline-flex size-7 shrink-0 items-center justify-center rounded-full', r.status === 'accepted' ? 'bg-brand-50 text-brand-700' : 'bg-subtle text-muted')}>
                    {r.status === 'accepted' ? <Check aria-hidden="true" className="size-3.5" /> : <X aria-hidden="true" className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 text-base text-ink">
                    {r.href ? (
                      <Link to={r.href} className="font-medium hover:underline">
                        {r.projectName}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.projectName}</span>
                    )}
                    <span className="text-muted">, {r.architectName}</span>
                  </span>
                  <Pill size="sm" tone={r.status === 'accepted' ? 'brand' : 'neutral'} dot>
                    {r.statusText}
                  </Pill>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </Page>
  )
}

/** The waiting requests alone, for the client home. Renders nothing when there are none. */
export function PendingLinkRequests({ className }: { className?: string }) {
  const v = useView(clientLinkRequests)
  if (!v || v.pending.length === 0) return null
  return (
    <section aria-label="Project requests" className={cx('flex flex-col gap-4', className)} data-testid="pending-link-requests">
      {v.pending.map((r) => (
        <RequestCard key={r.projectId} row={r} />
      ))}
    </section>
  )
}

function RequestCard({ row }: { row: LinkRequestRow }) {
  const navigate = useNavigate()
  const [declining, setDeclining] = useState(false)
  const [note, setNote] = useState('')
  const accept = () => {
    const r = act.decideClientLink(row.projectId, 'accepted', '')
    if (!r.ok) {
      toast.error(r.error ?? 'That could not be done.')
      return
    }
    toast.success(`You joined ${row.projectName}`, { action: { label: 'Open project', onClick: () => navigate(`/app/projects/${row.projectId}`) } })
  }
  const decline = () => {
    const r = act.decideClientLink(row.projectId, 'declined', note)
    if (!r.ok) {
      toast.error(r.error ?? 'That could not be done.')
      return
    }
    setDeclining(false)
    toast.success('Request declined')
  }
  return (
    <Card as="article" className="overflow-hidden" data-testid={`link-request-${row.projectId}`}>
      <div className="flex flex-col gap-4 border-l-[3px] border-l-info p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info-strong ring-1 ring-inset ring-info-line">
            <FolderOpen aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-lg font-semibold text-ink">{row.projectName}</h2>
            <p className="m-0 text-base text-ink-soft">{row.architectName} wants to add you as client</p>
            <p className="m-0 mt-0.5 text-sm text-muted">
              Asked by {row.requestedBy || row.architectName}, {row.requestedText}
            </p>
          </div>
          <Pill tone="info" size="sm" dot className="max-sm:hidden">
            {row.statusText}
          </Pill>
        </div>
        <DescriptionList
          layout="grid"
          columns={3}
          items={[
            { label: 'Type', value: row.typeLabel },
            { label: 'Location', value: row.locationText || 'Not set' },
            { label: 'Stage', value: row.stageText },
            { label: 'Site start', value: row.siteStartText },
            { label: 'Practical completion', value: row.completionText },
          ]}
        />
        {row.message ? (
          <blockquote className="m-0 flex gap-2.5 rounded-lg bg-subtle/70 px-3.5 py-3 text-base text-ink-soft ring-1 ring-inset ring-line-soft">
            <MessageSquareQuote aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" />
            <span className="min-w-0 whitespace-pre-line">{row.message}</span>
          </blockquote>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          <Button variant="primary" icon={Check} onClick={accept} data-testid={`accept-link-${row.projectId}`}>
            Accept
          </Button>
          <Button onClick={() => setDeclining(true)} data-testid={`decline-link-${row.projectId}`}>
            Decline
          </Button>
          <p className="m-0 text-sm text-muted sm:ml-2">Accepting shows you the project and lets you approve materials for it.</p>
        </div>
      </div>
      <Dialog
        open={declining}
        onOpenChange={setDeclining}
        title={`Decline ${row.projectName}?`}
        description={`${row.architectName} is told your organisation declined, with your note if you add one. The project stays out of your workspace.`}
        size="sm"
        testId="decline-link-dialog"
        footer={
          <>
            <Button onClick={() => setDeclining(false)}>Cancel</Button>
            <Button variant="danger" onClick={decline} data-testid="decline-link-confirm">
              Decline
            </Button>
          </>
        }
      >
        <Field label={`Tell ${row.architectName} why`} optional>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example, we are not the client on this scheme" data-testid="decline-link-note" />
        </Field>
      </Dialog>
    </Card>
  )
}
