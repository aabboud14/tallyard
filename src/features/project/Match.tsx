// Match schedule: load the sample schedule, accept the confidentiality terms, add allocations to the reuse plan.
import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { Link } from 'react-router'
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { PageTitle, Panel, Table, Num, Tag, Button, Note, RuleBased, EmptyState } from '../../components/ui'
import { Stub } from '../../components/Stub'
import { LABELS, GRADE_UNKNOWN } from '../../domain/reference/labels'
import * as f from '../../domain/format'

export function Match() {
  const world = useWorld()
  const s = useStore()
  const p = world.projects[MERROWGATE_ID]
  const r = p.matchResult
  const [termsOpen, setTermsOpen] = useState(false)
  const inPlan = (publicId: string, ref: string) => p.planItems.some((i) => i.lotPublicId === publicId && i.requirementRef === ref)
  return (
    <>
      <PageTitle title={`Match schedule, ${p.name}`} sub={`RIBA Stage ${p.ribaStage}. Steel needed on site from ${f.date(p.keyDates.steelNeedBy)}.`} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => s.loadSampleSchedule(MERROWGATE_ID)} data-testid="load-sample-schedule">
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
              <Button data-testid="open-terms">Accept the confidentiality terms</Button>
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
                    <Button>Not now</Button>
                  </Dialog.Close>
                  <Button
                    variant="primary"
                    data-testid="accept-terms"
                    onClick={() => {
                      s.acceptTerms(MERROWGATE_ID)
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
        <Note tone="steel" testId="label-L6" className="mb-3">
          {LABELS.L6}
        </Note>
      ) : null}
      {!r ? (
        <EmptyState hint="Load the sample schedule to match it against the stock the project can see." />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="font-display text-xl" data-testid="match-lines">
              {r.lines} lines, {r.members} members
            </span>
            <span className="font-display text-xl" data-testid="match-matched">
              {r.matched} of {r.members} members matched ({f.percent(r.coverage)})
            </span>
            {r.openOnly !== null ? (
              <span data-testid="match-open-only">
                Open market only: {r.openOnly} of {r.members}
              </span>
            ) : null}
          </div>
          <RuleBased testId="label-L2" />
          <Note tone="survey" testId="label-L4" className="mt-2">
            {LABELS.L4}
          </Note>
          <Panel title="Results, in reference order" className="mt-3">
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
                {r.results.map((res) => {
                  const req = p.requirements.find((q) => q.ref === res.ref)!
                  const rows = res.allocations.length ? res.allocations : [null]
                  return rows.map((a, i) => (
                    <tr key={`${res.ref}-${i}`} data-testid={a ? `alloc-${res.ref}-${a.publicId}` : `alloc-${res.ref}-none`}>
                      {i === 0 ? (
                        <>
                          <td rowSpan={rows.length}>
                            <Tag>{res.ref}</Tag>
                          </td>
                          <td rowSpan={rows.length}>
                            {req.designation}, {req.lengthM.toFixed(1)} m, {req.count} off, {req.minGrade}
                          </td>
                          <td rowSpan={rows.length} className="text-right font-display text-base" data-testid={`match-${res.ref}`}>
                            {res.matched} of {res.required}
                          </td>
                        </>
                      ) : null}
                      {a ? (
                        <>
                          <td>
                            <Link to={`/market/${a.publicId}`} className="text-steel" data-testid={`alloc-link-${res.ref}-${a.publicId}`}>
                              {a.publicId}
                            </Link>
                          </td>
                          <Num testId={`alloc-pieces-${res.ref}-${a.publicId}`}>{a.pieces}</Num>
                          <Num>{a.overSpecKgM.toFixed(1)}</Num>
                          <Num>{a.offcutM.toFixed(2)}</Num>
                          <td data-testid={`alloc-grade-${res.ref}-${a.publicId}`}>{a.gradeFlag ? `Grade ${GRADE_UNKNOWN.toLowerCase()}` : 'Grade known'}</td>
                          <td data-testid={`alloc-storage-${res.ref}-${a.publicId}`}>{a.storageMin === a.storageMax ? `Storage ${a.storageMin} months` : `Storage ${a.storageMin} to ${a.storageMax} months`}</td>
                          <td>
                            {inPlan(a.publicId, res.ref) ? (
                              <Tag tone="teal">In plan</Tag>
                            ) : (
                              <Button onClick={() => s.addToPlan(MERROWGATE_ID, a.publicId, res.ref)} data-testid={`add-to-plan-${res.ref}-${a.publicId}`}>
                                Add to reuse plan
                              </Button>
                            )}
                          </td>
                        </>
                      ) : (
                        <td colSpan={7} className="text-ink-soft" data-testid={`reason-${res.ref}`}>
                          {res.reason}
                        </td>
                      )}
                    </tr>
                  ))
                })}
              </tbody>
            </Table>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>Baseline mass of matched members {f.massT(r.baselineMassT)}</span>
              <span>Stock mass {f.massT(r.stockMassT)}</span>
              <span>Offcut mass {f.massT(r.offcutMassT)}</span>
              <span>Avoided carbon {f.carbon(r.avoidedT)}</span>
            </div>
            {r.results.some((x) => x.reason && x.matched > 0) ? (
              <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft">
                {r.results
                  .filter((x) => x.reason && x.matched > 0)
                  .map((x) => (
                    <li key={x.ref} data-testid={`reason-${x.ref}`}>
                      {x.ref}: {x.reason}
                    </li>
                  ))}
              </ul>
            ) : null}
          </Panel>
          <p className="mt-3 text-sm">
            The reuse plan has {p.planItems.length} {p.planItems.length === 1 ? 'item' : 'items'}.{' '}
            <Link to="/project/plan" className="text-steel">
              Open the reuse plan
            </Link>
          </p>
        </>
      )}
    </>
  )
}
