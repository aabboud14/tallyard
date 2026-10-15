// The circular economy statement (/app/projects/:id/statement), the consultant's page: eight sections written from
// the project's records, each editable. An edit keeps the generated text it replaced, so the page can say when the
// figures have moved on and offer the updated text. Sends to the client for review, exports to Word, prints to A4
// and copies as text. Drafted from Tallyard's records; every figure is indicative and checked before submission.
import { useState } from 'react'
import { useParams } from 'react-router'
import { Copy, FileDown, MessageSquareText, Printer, Send, SendHorizontal } from 'lucide-react'
import './print.css'
import { act, selectors, useView } from '../../store'
import type { StatementSectionId } from '../../domain/sustainabilityTypes'
import { Button, Callout, Pill, StatementSection, toast } from '../../ui'
import { Page } from '../../app/Page'
import { downloadBlob } from '../../app/download'
import { STATEMENT_TONE } from '../../store/selectors/sustainability-screens'
import { buildStatementDocx, DOCX_MIME } from './statementExport'
import { TabHeader } from './parts'

export function Statement() {
  const { projectId = '' } = useParams()
  const v = useView(selectors.statementView, projectId)
  const [busy, setBusy] = useState(false)
  if (!v) return null
  const clientName = v.header.clientName || 'the client'

  const save = (id: StatementSectionId, text: string, generated: string) => {
    const r = act.editStatementSection(projectId, id, text, generated)
    if (!r.ok) {
      toast.error(r.error ?? 'Could not save the section.')
      return
    }
    toast.success('Section saved', { description: v.status !== 'draft' ? 'The statement is back to draft.' : undefined, action: { label: 'Undo', onClick: r.undo } })
  }
  const reset = (id: StatementSectionId) => {
    const r = act.resetStatementSection(projectId, id)
    if (!r.ok) {
      toast.error(r.error ?? 'Could not reset the section.')
      return
    }
    toast.success('Section uses the generated text', { action: { label: 'Undo', onClick: r.undo } })
  }
  const send = () => {
    const r = act.sendStatementForReview(projectId)
    if (!r.ok) {
      toast.error(r.error ?? 'Could not send the statement.')
      return
    }
    toast.success(`Sent to ${clientName} for review`, { description: 'They get a notification and a to-do on their home.', action: { label: 'Undo', onClick: r.undo } })
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(v.plainText)
      toast.success('Statement copied as text')
    } catch {
      toast.error('The text could not be copied. Select it and copy it instead.')
    }
  }
  const docx = async () => {
    setBusy(true)
    try {
      const buf = await buildStatementDocx(v.docx)
      downloadBlob(new Blob([buf], { type: DOCX_MIME }), v.fileName)
      toast.success('Statement downloaded for Word', { description: v.fileName })
    } catch {
      toast.error('The Word file could not be prepared. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const sent = v.status === 'ready_for_review'
  return (
    <Page testId="statement-page" className="lg:pt-7">
      <div className="flex flex-col gap-6">
        <div className="statement-screen-only flex flex-col gap-6 print:hidden">
          <TabHeader
            title={
              <>
                Circular economy statement
                <Pill tone={STATEMENT_TONE[v.status]} dot size="sm" data-testid="statement-status">
                  {v.statusLabel}
                </Pill>
              </>
            }
            subtitle={v.sentText ? `${v.sentText}.${v.reviewedText ? ` ${v.reviewedText}.` : ''}` : 'Written from the project records. Edit any section, then send it to the client for review.'}
            actions={
              <>
                <Button icon={Copy} onClick={copy} data-testid="statement-copy">
                  Copy text
                </Button>
                <Button icon={Printer} onClick={() => window.print()} data-testid="statement-print">
                  Print
                </Button>
                <Button icon={FileDown} loading={busy} onClick={docx} data-testid="statement-docx">
                  Download for Word
                </Button>
                {v.canEdit ? (
                  <Button variant="primary" icon={sent ? SendHorizontal : Send} disabled={!v.canSend} onClick={send} data-testid="statement-send">
                    {sent ? 'Sent for review' : `Send to ${clientName} for review`}
                  </Button>
                ) : null}
              </>
            }
          />
          <Callout tone="warning" title="Check before you submit">
            {v.caveat}
          </Callout>
          {v.reviewedText ? (
            <Callout tone="brand" icon={MessageSquareText} title={v.reviewedText}>
              {v.reviewNote ? `"${v.reviewNote}"` : 'No comments.'}
            </Callout>
          ) : null}
        </div>
        <article className="statement-doc mx-auto w-full max-w-[860px] rounded-lg border border-line bg-surface px-5 py-7 sm:px-10 sm:py-10" data-testid="statement-document">
          <header className="border-b border-line pb-6">
            <h2 className="m-0 text-2xl font-semibold text-ink">{v.title}</h2>
            <p className="m-0 mt-1.5 text-base text-muted">{v.subtitle}</p>
          </header>
          <div className="mt-6 flex flex-col gap-6">
            {v.sections.map((s) => (
              <StatementSection
                key={`${s.id}-${s.text.length}-${s.edited}`}
                id={s.id}
                heading={s.heading}
                text={s.text}
                edited={s.edited}
                stale={s.stale}
                canEdit={v.canEdit}
                onSave={(text) => save(s.id, text, s.generated)}
                onReset={() => reset(s.id)}
                onKeep={() => save(s.id, s.text, s.generated)}
                headingAs="h3"
              />
            ))}
          </div>
          <p className="m-0 mt-8 border-t border-line pt-4 text-sm text-muted">{v.caveat}</p>
        </article>
      </div>
    </Page>
  )
}

export default Statement
