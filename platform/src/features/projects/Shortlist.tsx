// The project's shortlist: a board with Shortlisted, Sent to client, Approved and Declined (or a list). Select
// shortlisted materials and send them to the client with a message; a declined card shows the client's note and
// can be reopened; an approved card is locked. Notes, moves and removals confirm with a toast that can undo.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CircleCheck, Compass, Ellipsis, ExternalLink, FolderInput, Kanban, List, LockKeyhole, MessageSquareQuote, PencilLine, RotateCcw, Send, Trash2, TriangleAlert, X } from 'lucide-react'
import * as f from '../../domain/format'
import { formatDateShort } from '../../domain/dates'
import type { WishStatus } from '../../domain/v1types'
import { act, useApp, useView } from '../../store'
import { shortlistBoard, type ShortlistBoard, type ShortlistRow } from '../../store/selectors/shortlist'
import {
  Button,
  Checkbox,
  cx,
  Dialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  FitPill,
  IndicativeMarker,
  MaterialImage,
  SegmentedControl,
  StatusPill,
  SustainabilityBand,
  Table,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  toast,
  TR,
} from '../../ui'
import { discoverHref, listingHref } from '../discover/links'
import { usePhotoSrc } from '../discover/photo'
import { ProjectPage } from './ProjectParts'

type DialogState = { kind: 'note' | 'reopen'; row: ShortlistRow } | { kind: 'send'; ids: string[] } | null

const COLUMN_LINES: Record<WishStatus, (client: string) => string> = {
  pending: () => 'Not yet sent to the client',
  sent: (client) => `Waiting on ${client}`,
  approved: () => 'Ready to specify',
  declined: () => 'Reopen one to send it again',
}

function remove(row: ShortlistRow) {
  const r = act.removeFromList(row.itemId)
  if (!r.ok) toast.error(r.error ?? 'That could not be removed.')
  else toast({ title: 'Removed from the shortlist', description: row.title, action: { label: 'Undo', onClick: r.undo } })
}

function move(row: ShortlistRow, projectId: string | null, label: string) {
  const r = act.moveItem(row.itemId, projectId)
  if (!r.ok) toast.error(r.error ?? 'That could not be moved.')
  else toast.success(`Moved to ${label}`, { description: row.title, action: { label: 'Undo', onClick: r.undo } })
}

function RowMenu({ row, projectId, onDialog }: { row: ShortlistRow; projectId: string; onDialog: (d: DialogState) => void }) {
  const navigate = useNavigate()
  const targets = row.moveTargets
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Actions for ${row.title}`} data-testid={`row-menu-${row.publicId}`} className="relative z-[2] inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600 data-[state=open]:bg-hover max-sm:size-10">
          <Ellipsis aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem icon={ExternalLink} onSelect={() => navigate(listingHref(row.publicId, projectId))}>
          Open material
        </DropdownMenuItem>
        {row.canEditNote ? (
          <DropdownMenuItem icon={PencilLine} onSelect={() => onDialog({ kind: 'note', row })}>
            {row.note ? 'Edit note' : 'Add a note'}
          </DropdownMenuItem>
        ) : null}
        {row.canReopen ? (
          <DropdownMenuItem icon={RotateCcw} onSelect={() => onDialog({ kind: 'reopen', row })}>
            Reopen
          </DropdownMenuItem>
        ) : null}
        {row.canMove && targets.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger icon={FolderInput}>Move to</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-60">
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {targets.map((t) => (
                <DropdownMenuItem key={t.projectId ?? 'saved'} disabled={!t.allowed} onSelect={() => move(row, t.projectId, t.label)} className="items-start py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{t.label}</span>
                    {t.reason ? <span className="whitespace-normal text-xs text-muted">{t.reason}</span> : null}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {row.canRemove ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => remove(row)} data-testid={`remove-${row.publicId}`}>
              Remove from shortlist
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Thumb({ row, className }: { row: ShortlistRow; className?: string }) {
  const photo = usePhotoSrc(row.card?.photo ?? null)
  if (!row.card) return <div className={cx('flex items-center justify-center bg-subtle text-faint', className)}><TriangleAlert aria-hidden="true" className="size-4" /></div>
  return (
    <div className={cx('relative overflow-hidden', className)}>
      <MaterialImage spec={row.card.listing.spec} publicId={row.publicId} photo={photo} aspect="fill" />
    </div>
  )
}

function StatusDetail({ row }: { row: ShortlistRow }) {
  if (row.status === 'sent' && row.sentOn) return <p className="m-0 text-xs text-muted">Sent {formatDateShort(row.sentOn)}</p>
  if (row.status === 'approved')
    return (
      <div className="flex flex-col gap-1.5">
        <p className="m-0 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700">
          <LockKeyhole aria-hidden="true" className="size-3" />
          Approved{row.decidedOn ? ` ${formatDateShort(row.decidedOn)}` : ''}
          {row.reservation ? `, ${row.reservation.statusLabel.toLowerCase()}` : ''}
        </p>
        {row.decisionNote ? <p className="m-0 text-xs text-ink-soft">{row.decisionNote}</p> : null}
      </div>
    )
  if (row.status === 'declined')
    return (
      <div className="rounded-md border border-danger-line bg-danger-soft/60 px-2.5 py-2" data-testid={`decline-note-${row.publicId}`}>
        <p className="m-0 text-xs font-medium text-danger">Declined{row.decidedOn ? ` ${formatDateShort(row.decidedOn)}` : ''}</p>
        <p className="m-0 mt-0.5 text-xs text-ink-soft">{row.decisionNote ? row.decisionNote : 'No note from the client.'}</p>
      </div>
    )
  return null
}

function BoardCard({ row, projectId, selected, onToggle, onDialog }: { row: ShortlistRow; projectId: string; selected: boolean; onToggle: () => void; onDialog: (d: DialogState) => void }) {
  return (
    <article data-testid={`shortlist-card-${row.publicId}`} data-status={row.status} className={cx('group relative overflow-hidden rounded-lg border bg-surface shadow-sm transition-[border-color,box-shadow] hover:shadow-md', selected ? 'border-brand-600 shadow-[0_0_0_1px_var(--color-brand-600)]' : 'border-line')}>
      <div className="relative aspect-[16/9] overflow-hidden">
        <Thumb row={row} className="size-full" />
        {row.card?.fit ? (
          <div className="absolute bottom-2 left-2">
            <FitPill fit={row.card.fit.fit} size="sm" className="bg-white/90! shadow-sm backdrop-blur-sm" />
          </div>
        ) : null}
        {row.canSelect ? (
          <div className={cx('absolute left-2 top-2 z-[2] rounded-[5px] bg-white/90 p-1 shadow-sm backdrop-blur-sm transition-opacity', selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100')}>
            <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${row.title}`} data-testid={`select-${row.publicId}`} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <h3 className="m-0 min-w-0 flex-1 text-base font-semibold leading-snug text-ink">
            <Link to={listingHref(row.publicId, projectId)} className="outline-none after:absolute after:inset-0 after:z-[1] focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-brand-600">
              {row.title}
            </Link>
          </h3>
          <RowMenu row={row} projectId={projectId} onDialog={onDialog} />
        </div>
        {row.card ? (
          <>
            <p className="m-0 text-xs text-ink-soft">
              {row.card.quantityText} · {row.card.availabilityText}
            </p>
            <SustainabilityBand band={row.card.band} size="sm" />
          </>
        ) : (
          <p className="m-0 inline-flex items-center gap-1.5 text-xs font-medium text-warning">
            <TriangleAlert aria-hidden="true" className="size-3.5" />
            {row.stateText}
          </p>
        )}
        {row.note ? (
          <p className="m-0 flex gap-1.5 text-xs text-muted">
            <MessageSquareQuote aria-hidden="true" className="mt-px size-3.5 shrink-0 text-faint" />
            <span className="line-clamp-3">{row.note}</span>
          </p>
        ) : null}
        <StatusDetail row={row} />
        {row.canReopen ? (
          <div className="relative z-[2]">
            <Button size="sm" icon={RotateCcw} onClick={() => onDialog({ kind: 'reopen', row })} data-testid={`reopen-${row.publicId}`}>
              Reopen
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function Board({ board, projectId, selected, toggle, onDialog }: { board: ShortlistBoard; projectId: string; selected: Set<string>; toggle: (id: string) => void; onDialog: (d: DialogState) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="grid grid-cols-1 gap-4 md:min-w-[960px] md:grid-cols-4" data-testid="shortlist-board">
        {board.columns.map((col) => (
          <section key={col.status} aria-labelledby={`col-${col.status}`} className="flex min-w-0 flex-col rounded-xl bg-page p-2 ring-1 ring-inset ring-line-soft" data-testid={`column-${col.status}`}>
            <header className="flex items-center justify-between gap-2 px-1.5 pb-2.5 pt-1">
              <div className="min-w-0">
                <h2 id={`col-${col.status}`} className="m-0 flex items-center gap-2 text-sm font-semibold text-ink">
                  <StatusPill status={col.status} size="sm" />
                  <span className="tabular-nums text-muted">{col.rows.length}</span>
                </h2>
                <p className="m-0 mt-1 truncate text-xs text-muted">{COLUMN_LINES[col.status](board.clientName)}</p>
              </div>
            </header>
            <div className="flex flex-col gap-2.5">
              {col.rows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line-strong px-3 py-6 text-center text-xs text-faint">Nothing here</div>
              ) : (
                col.rows.map((r) => <BoardCard key={r.itemId} row={r} projectId={projectId} selected={selected.has(r.itemId)} onToggle={() => toggle(r.itemId)} onDialog={onDialog} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function ListView({ board, projectId, selected, toggle, onDialog }: { board: ShortlistBoard; projectId: string; selected: Set<string>; toggle: (id: string) => void; onDialog: (d: DialogState) => void }) {
  return (
    <Table caption="Shortlist" data-testid="shortlist-list">
      <THead>
        <tr>
          <TH className="w-10">
            <span className="sr-only">Select</span>
          </TH>
          <TH>Material</TH>
          <TH>Status</TH>
          <TH>Timeline</TH>
          <TH>Quantity</TH>
          <TH align="right">Avoided carbon</TH>
          <TH>Note</TH>
          <TH className="w-10">
            <span className="sr-only">Actions</span>
          </TH>
        </tr>
      </THead>
      <TBody>
        {board.rows.map((r) => (
          <TR key={r.itemId} selected={selected.has(r.itemId)}>
            <TD>{r.canSelect ? <Checkbox checked={selected.has(r.itemId)} onCheckedChange={() => toggle(r.itemId)} aria-label={`Select ${r.title}`} /> : null}</TD>
            <TD>
              <div className="flex min-w-[220px] items-center gap-3">
                <Thumb row={r} className="size-10 shrink-0 rounded-md" />
                <div className="min-w-0">
                  <Link to={listingHref(r.publicId, projectId)} className="block truncate font-medium text-ink hover:underline">
                    {r.title}
                  </Link>
                  <span className="text-sm text-muted">{r.card ? r.card.availabilityText : r.stateText}</span>
                </div>
              </div>
            </TD>
            <TD>
              <StatusPill status={r.status} size="sm" />
            </TD>
            <TD>{r.card?.fit ? <FitPill fit={r.card.fit.fit} size="sm" /> : <span className="text-muted">Not available</span>}</TD>
            <TD muted className="whitespace-nowrap">
              {r.card?.quantityText ?? ''}
            </TD>
            <TD align="right" className="whitespace-nowrap">
              {r.card?.avoidedT !== null && r.card?.avoidedT !== undefined ? f.carbon(r.card.avoidedT) : 'Not claimed'}
            </TD>
            <TD muted className="max-w-[260px]">
              <span className="line-clamp-2 text-sm">{r.status === 'declined' && r.decisionNote ? `Client: ${r.decisionNote}` : r.note}</span>
            </TD>
            <TD>
              <RowMenu row={r} projectId={projectId} onDialog={onDialog} />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

function NoteDialog({ state, onClose }: { state: { kind: 'note' | 'reopen'; row: ShortlistRow }; onClose: () => void }) {
  const [text, setText] = useState(state.row.note)
  const reopen = state.kind === 'reopen'
  const save = () => {
    const r = reopen ? act.reopenItem(state.row.itemId, text) : act.editItemNote(state.row.itemId, text)
    if (!r.ok) {
      toast.error(r.error ?? 'That could not be saved.')
      return
    }
    onClose()
    toast.success(reopen ? 'Back on the shortlist' : 'Note saved', { description: state.row.title, action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={reopen ? 'Reopen this material' : state.row.note ? 'Edit note' : 'Add a note'}
      description={reopen ? 'It goes back to Shortlisted, ready to send again. Say what changed for the client.' : state.row.title}
      testId={reopen ? 'reopen-dialog' : 'note-dialog'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={reopen ? RotateCcw : CircleCheck} onClick={save} data-testid="save-note">
            {reopen ? 'Reopen' : 'Save note'}
          </Button>
        </>
      }
    >
      {reopen && state.row.decisionNote ? (
        <div className="mb-4 rounded-lg border border-danger-line bg-danger-soft/60 px-3 py-2.5 text-sm">
          <span className="font-medium text-danger">The client said: </span>
          <span className="text-ink-soft">{state.row.decisionNote}</span>
        </div>
      ) : null}
      <Field label={reopen ? 'Your note' : 'Note'} hint="The client sees this note with the material.">
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} autoFocus data-testid="note-text" />
      </Field>
    </Dialog>
  )
}

function SendDialog({ board, ids, projectId, onClose, onSent }: { board: ShortlistBoard; ids: string[]; projectId: string; onClose: () => void; onSent: () => void }) {
  const [message, setMessage] = useState('')
  const rows = board.rows.filter((r) => ids.includes(r.itemId))
  const send = () => {
    const r = act.sendToClient(projectId, ids, message)
    if (!r.ok) {
      toast.error(r.error ?? 'Nothing could be sent.')
      return
    }
    onSent()
    toast.success(`Sent ${r.value === 1 ? 'one material' : `${r.value} materials`} to ${board.clientName}`, { description: 'They can approve or decline each one.', action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={`Send to ${board.clientName}`}
      description={`${rows.length === 1 ? 'One material goes' : `${rows.length} materials go`} to the client for approval. You cannot change them while they decide.`}
      size="lg"
      testId="send-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Send} onClick={send} data-testid="confirm-send">
            Send for approval
          </Button>
        </>
      }
    >
      <ul className="m-0 mb-5 flex list-none flex-col divide-y divide-line-soft rounded-lg border border-line p-0">
        {rows.map((r) => (
          <li key={r.itemId} className="flex items-center gap-3 px-3 py-2.5">
            <Thumb row={r} className="size-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-base font-medium text-ink">{r.title}</p>
              <p className="m-0 truncate text-sm text-muted">{r.card ? `${r.card.quantityText} · ${r.card.availabilityText}` : r.stateText}</p>
            </div>
            {r.card?.fit ? <FitPill fit={r.card.fit.fit} size="sm" /> : null}
          </li>
        ))}
      </ul>
      <Field label="Message" optional hint="Shown to the client with the materials.">
        <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="For example: tested steel for the podium, in stock and in time for the frame." data-testid="send-message" />
      </Field>
    </Dialog>
  )
}

export function Shortlist() {
  const { projectId = '' } = useParams()
  const board = useView(shortlistBoard, projectId)
  const layout = useApp((s) => s.ui.shortlistLayout)
  const setUi = useApp((s) => s.setUi)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<DialogState>(null)
  const sendable = useMemo(() => new Set(board?.sendableIds ?? []), [board])
  if (!board) return null
  const chosen = [...selected].filter((id) => sendable.has(id))
  const chosenSet = new Set(chosen)
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const all = board.totals.all

  return (
    <ProjectPage width="wide" testId="shortlist">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted" data-testid="shortlist-totals">
          <span>
            <span className="font-medium tabular-nums text-ink">{all.count}</span> {all.count === 1 ? 'material' : 'materials'}
          </span>
          <span className="font-medium tabular-nums text-ink">{f.massT(all.massT)}</span>
          <span className="inline-flex items-center gap-2">
            <span>
              <span className="font-medium tabular-nums text-ink">{f.carbon(all.avoidedT)}</span> avoided
            </span>
            <IndicativeMarker />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Layout"
            value={layout}
            onValueChange={(v) => setUi({ shortlistLayout: v as 'board' | 'list' })}
            items={[
              { value: 'board', label: 'Board', icon: Kanban },
              { value: 'list', label: 'List', icon: List },
            ]}
            className="max-md:hidden"
          />
          <Button asChild icon={Compass}>
            <Link to={discoverHref(projectId)}>Add materials</Link>
          </Button>
          <Button variant="primary" icon={Send} disabled={sendable.size === 0} onClick={() => setDialog({ kind: 'send', ids: chosen.length > 0 ? chosen : board.sendableIds })} data-testid="send-to-client">
            {chosen.length > 0 ? `Send ${chosen.length} to client` : 'Send to client'}
          </Button>
        </div>
      </div>

      {chosen.length > 0 ? (
        <div className="sticky top-16 z-20 mt-4 flex items-center gap-3 rounded-lg bg-ink px-3 py-2 text-sm text-white shadow-overlay lg:top-3" role="status" data-testid="selection-bar">
          <span className="font-medium tabular-nums">{chosen.length} selected</span>
          <button type="button" onClick={() => setSelected(new Set(board.sendableIds))} className="rounded px-1.5 py-0.5 text-white/80 hover:bg-white/10 hover:text-white">
            Select all {board.sendableIds.length}
          </button>
          <span className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="primary" icon={Send} onClick={() => setDialog({ kind: 'send', ids: chosen })} className="bg-white! text-ink! hover:bg-white/90!">
              Send to client
            </Button>
            <button type="button" aria-label="Clear selection" onClick={() => setSelected(new Set())} className="inline-flex size-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white">
              <X aria-hidden="true" className="size-4" />
            </button>
          </span>
        </div>
      ) : null}

      <div className="mt-6">
        {board.empty ? (
          <EmptyState
            variant="page"
            icon={Kanban}
            title="Your shortlist is empty"
            text={`Save materials to ${board.project.name} from Discover. Each one is checked against the date materials are needed on site.`}
            action={
              <Button asChild variant="primary" icon={Compass}>
                <Link to={discoverHref(projectId)}>Find materials</Link>
              </Button>
            }
            testId="shortlist-empty"
          />
        ) : layout === 'list' ? (
          <>
            <div className="max-md:hidden">
              <ListView board={board} projectId={projectId} selected={chosenSet} toggle={toggle} onDialog={setDialog} />
            </div>
            <div className="md:hidden">
              <Board board={board} projectId={projectId} selected={chosenSet} toggle={toggle} onDialog={setDialog} />
            </div>
          </>
        ) : (
          <Board board={board} projectId={projectId} selected={chosenSet} toggle={toggle} onDialog={setDialog} />
        )}
      </div>

      {dialog?.kind === 'send' ? (
        <SendDialog
          board={board}
          ids={dialog.ids}
          projectId={projectId}
          onClose={() => setDialog(null)}
          onSent={() => {
            setDialog(null)
            setSelected(new Set())
          }}
        />
      ) : null}
      {dialog && dialog.kind !== 'send' ? <NoteDialog key={dialog.row.itemId + dialog.kind} state={dialog} onClose={() => setDialog(null)} /> : null}
    </ProjectPage>
  )
}
