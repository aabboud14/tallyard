// Match schedule (advanced), the client's working matcher: load the sample schedule, accept the confidentiality
// terms, add allocations to the reuse plan (brief/09-V1-PRODUCT.md sections 3.4 and 13.5; steps 5 of 02).
import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { Link } from 'react-router'
import { useStore } from '../../store/store'
import { useProjectParam, NotAvailable } from '../../app/params'
import { Panel, Table, Num, Tag, Button, Note, RuleBased, EmptyState } from '../../components/ui'
import { Stub } from '../../components/Stub'
import { LABELS } from '../../domain/reference/labels'
import { clientCanOpen, matchTable } from '../../store/views/client'
import { ClientHeader } from './ClientHeader'
import * as f from '../../domain/format'

export function Match() {
  const s = useStore()
  const { record: p } = useProjectParam()
  const [termsOpen, setTermsOpen] = useState(false)
  if (!p || !clientCanOpen(s.world, s.personaId, p.id)) return <NotAvailable />
  const r = p.matchResult
  const table = matchTable(p)
  return (
    <div className="flex flex-col gap-4" data-testid="client-match">
      <ClientHeader eyebrow={p.name} title="Match schedule (advanced)" sub={`RIBA Stage ${p.ribaStage}. Steel needed on site from ${f.date(p.keyDates.steelNeedBy)}.`} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="lg" className="text-panel" onClick={() => s.loadSampleSchedule(p.id)} data-testid="load-sample-schedule">
          Load sample schedule
        </Button>
        <Stub name="Import from a BIM model (IFC or Revit)" would="The real feature would read the member schedule from the model. The CSV import behind the sample schedule is real." testId="stub-bim" />
        {p.termsAccepted ? (
          <Tag tone="teal" data-testid="terms-accepted">
            Confidentiality terms accepted
          </Tag>
        ) : (
          <Dialog.Root open={termsOpen} onOpenChange={setTermsOpen}>
            <Dialog.Trigger asChild>
              <Button size="lg" className="text-sm" data-testid="open-terms">
                Accept the confidentiality terms
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-sm border border-rule bg-panel p-5 shadow-lg focus:outline-none">
                <Dialog.Title className="text-lg font-semibold">Confidentiality terms</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm" data-testid="label-L7">
                  {LABELS.L7}
                </Dialog.Description>
                <div className="mt-4 flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <Button size="lg" className="text-sm">
                      Not now
                    </Button>
                  </Dialog.Close>
                  <Button
                    variant="primary"
                    size="lg"
                    className="text-sm text-panel"
                    data-testid="accept-terms"
                    onClick={() => {
                      s.acceptTerms(p.id)
                      setTermsOpen(false)
                    }}
                  >
                    Accept
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>
      {!p.termsAccepted ? (
        <Note tone="steel" testId="label-L6">
          {LABELS.L6}
        </Note>
      ) : null}
      {!r || !table ? (
        <EmptyState hint="Load the sample schedule to match it against the stock the project can see." />
      ) : (
        <>
          <section aria-label="Match summary" className="grid gap-px overflow-hidden rounded-md border border-rule-soft bg-rule-soft sm:grid-cols-3">
            <div className="flex flex-col gap-1 bg-panel px-4 py-3">
              <span className="text-xs text-mill-text">Schedule</span>
              <span className="font-display text-2xl leading-none" data-testid="match-lines">
                {r.lines} lines, {r.members} members
              </span>
            </div>
            <div className="flex flex-col gap-1 bg-panel px-4 py-3">
              <span className="text-xs text-mill-text">Matched</span>
              <span className="font-display text-2xl leading-none text-steel" data-testid="match-matched">
                {r.matched} of {r.members} members matched ({f.percent(r.coverage)})
              </span>
            </div>
            <div className="flex flex-col gap-1 bg-panel px-4 py-3">
              <span className="text-xs text-mill-text">Without shared lots</span>
              {r.openOnly !== null ? (
                <span className="text-base font-medium" data-testid="match-open-only">
                  Open market only: {r.openOnly} of {r.members}
                </span>
              ) : (
                <span className="text-sm text-mill-text">Shown once the terms are accepted</span>
              )}
            </div>
          </section>
          <div className="grid gap-2 lg:grid-cols-2">
            <RuleBased testId="label-L2" />
            <Note tone="survey" testId="label-L4">
              {LABELS.L4}
            </Note>
          </div>
          <Panel title="Results, in reference order">
            <Table data-testid="match-results">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Required</th>
                  <th className="text-right">Matched</th>
                  <th>Allocation</th>
                  <th className="text-right">Pieces</th>
                  <th className="text-right">Over-specification (kg per m)</th>
                  <th className="text-right">Offcut (m)</th>
                  <th>Grade</th>
                  <th>Storage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => {
                  const a = row.allocation
                  return (
                    <tr key={row.key} data-testid={a ? `alloc-${row.ref}-${a.publicId}` : `alloc-${row.ref}-none`} className="[&>td]:align-middle">
                      {row.first ? (
                        <>
                          <td rowSpan={row.rowSpan} className="!align-top">
                            <Tag>{row.ref}</Tag>
                          </td>
                          <td rowSpan={row.rowSpan} className="!align-top min-w-[180px]">
                            {row.requirementText}
                          </td>
                          <td rowSpan={row.rowSpan} className="!align-top whitespace-nowrap text-right font-display text-base" data-testid={`match-${row.ref}`}>
                            {row.matchedText}
                          </td>
                        </>
                      ) : null}
                      {a ? (
                        <>
                          <td className="whitespace-nowrap">
                            <Link to={`/market/${a.publicId}`} className="text-steel" data-testid={`alloc-link-${row.ref}-${a.publicId}`}>
                              {a.publicId}
                            </Link>
                          </td>
                          <Num testId={`alloc-pieces-${row.ref}-${a.publicId}`}>{a.pieces}</Num>
                          <Num>{a.overSpecKgM.toFixed(1)}</Num>
                          <Num>{a.offcutM.toFixed(2)}</Num>
                          <td className="min-w-[150px]" data-testid={`alloc-grade-${row.ref}-${a.publicId}`}>
                            {row.gradeText}
                          </td>
                          <td className="whitespace-nowrap" data-testid={`alloc-storage-${row.ref}-${a.publicId}`}>
                            {row.storageText}
                          </td>
                          <td className="text-right">
                            {row.inPlan ? (
                              <Tag tone="teal">In plan</Tag>
                            ) : (
                              <Button className="min-h-[44px] whitespace-nowrap" onClick={() => s.addToPlan(p.id, a.publicId, row.ref)} data-testid={`add-to-plan-${row.ref}-${a.publicId}`}>
                                Add to reuse plan
                              </Button>
                            )}
                          </td>
                        </>
                      ) : (
                        <td colSpan={7} className="text-ink-soft" data-testid={`reason-${row.ref}`}>
                          {row.reason}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </Table>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
              <span>
                Baseline mass of matched members <span className="font-medium text-ink">{f.massT(r.baselineMassT)}</span>
              </span>
              <span>
                Stock mass <span className="font-medium text-ink">{f.massT(r.stockMassT)}</span>
              </span>
              <span>
                Offcut mass <span className="font-medium text-ink">{f.massT(r.offcutMassT)}</span>
              </span>
              <span>
                Avoided carbon <span className="font-medium text-ink">{f.carbon(r.avoidedT)}</span>
              </span>
            </div>
            {table.partialReasons.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft">
                {table.partialReasons.map((x) => (
                  <li key={x.ref} data-testid={`reason-${x.ref}`}>
                    {x.ref}: {x.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>{table.planCountText}</span>
            <Link to={`/projects/${p.id}/plan`} className="inline-flex min-h-[44px] items-center rounded-sm border border-rule bg-panel px-4 font-medium text-steel no-underline hover:bg-steel-tint" data-testid="open-plan">
              Open the reuse plan
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
