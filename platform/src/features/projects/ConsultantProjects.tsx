// The consultant's reading of each project on the Projects list (audit note 42): content by value and avoided
// carbon against the targets, the statement's status and the requirements at risk, in place of the client's
// shortlist and approval counts. Every figure comes from consultantProjectSummaries (P2); indicative.
import { Link } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import type { ProjectListRow } from '../../store/selectors/project'
import type { ConsultantGoalLine, ConsultantProjectSummary } from '../../store/selectors/consultant-projects'
import { inSentence } from '../../domain/reference/sustainabilityCopy'
import { IndicativeMarker, METRIC_STATE, Pill, Table, TBody, TD, TH, THead, TR } from '../../ui'

function StatePill({ g }: { g: ConsultantGoalLine }) {
  const m = METRIC_STATE[g.state]
  return (
    <Pill size="sm" tone={m.tone} icon={m.icon}>
      {g.stateText}
    </Pill>
  )
}

/** A state pill only where there is a state to show; "No result yet" and "No target set" read as plain words. */
function GoalLine({ g }: { g: ConsultantGoalLine }) {
  const judged = g.state !== 'neutral'
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted">{g.label}</dt>
      <dd className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium tabular-nums text-ink">{g.valueText}</span>
        {judged ? <StatePill g={g} /> : null}
      </dd>
      <dd className="m-0 text-xs text-muted">{g.targetText ?? g.stateText}</dd>
    </div>
  )
}

/** The foot of a project card for the consultant: two goals, the statement and the requirements. */
export function ConsultantCardSummary({ s, projectId }: { s: ConsultantProjectSummary; projectId: string }) {
  return (
    <div className="flex flex-col gap-3" data-testid={`consultant-summary-${projectId}`}>
      <p className="m-0 flex items-center gap-2 text-xs font-medium text-muted">
        Secured, against the targets <IndicativeMarker />
      </p>
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <GoalLine g={s.content} />
        <GoalLine g={s.carbon} />
      </dl>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Pill size="sm" dot tone={s.statement.tone}>
          Statement: {inSentence(s.statement.label)}
        </Pill>
        <span className="text-ink-soft">Requirements {inSentence(s.requirements.text)}</span>
        {s.requirements.atRisk > 0 ? (
          <Pill size="sm" tone="warning" icon={TriangleAlert}>
            {s.requirements.atRisk} at risk
          </Pill>
        ) : null}
      </div>
    </div>
  )
}

/** The Projects table for the consultant: the same rows, with the targets and the statement in place of the counts. */
export function ConsultantProjectsTable({ rows, summaries, lastActivity }: { rows: ProjectListRow[]; summaries: Record<string, ConsultantProjectSummary>; lastActivity: (p: ProjectListRow) => string }) {
  return (
    <Table caption="Projects against their targets" data-testid="projects-table">
      <THead>
        <tr>
          <TH>Project</TH>
          <TH>Content by value</TH>
          <TH>Avoided carbon, secured</TH>
          <TH>Statement</TH>
          <TH>Requirements</TH>
          <TH className="max-xl:hidden">Last activity</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((p) => {
          const s = summaries[p.id]
          return (
            <TR key={p.id} className="relative hover:bg-page [&>td]:align-top" data-testid={`consultant-row-${p.id}`}>
              <TD>
                <Link to={p.href} className="font-medium text-ink outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-brand-600">
                  {p.name}
                </Link>
                <div className="text-sm text-muted">
                  {p.clientName}, stage {p.stage}
                </div>
              </TD>
              {s ? (
                <>
                  <TD>
                    <span className="flex flex-col items-start gap-1">
                      <span className="font-medium tabular-nums">{s.content.valueText}</span>
                      {s.content.state !== 'neutral' ? <StatePill g={s.content} /> : <span className="text-xs text-muted">{s.content.targetText ?? s.content.stateText}</span>}
                    </span>
                  </TD>
                  <TD>
                    <span className="flex flex-col items-start gap-1">
                      <span className="font-medium tabular-nums">{s.carbon.valueText}</span>
                      {s.carbon.state !== 'neutral' ? <StatePill g={s.carbon} /> : <span className="text-xs text-muted">{s.carbon.stateText}</span>}
                    </span>
                  </TD>
                  <TD>
                    <Pill size="sm" dot tone={s.statement.tone}>
                      {s.statement.label}
                    </Pill>
                  </TD>
                  <TD>
                    <span className="flex flex-col items-start gap-1">
                      <span>{s.requirements.text}</span>
                      {s.requirements.atRisk > 0 ? (
                        <Pill size="sm" tone="warning" icon={TriangleAlert}>
                          {s.requirements.atRisk} at risk
                        </Pill>
                      ) : null}
                    </span>
                  </TD>
                </>
              ) : (
                <TD colSpan={4} muted>
                  No figures yet
                </TD>
              )}
              <TD muted className="whitespace-nowrap max-xl:hidden">
                {lastActivity(p)}
              </TD>
            </TR>
          )
        })}
      </TBody>
    </Table>
  )
}
