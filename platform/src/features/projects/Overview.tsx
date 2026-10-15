// The project overview, for everyone on the project. The architect of a new project sees a compact setup checklist
// with the waiting client folded into it (a decline gets the full client link banner), so the programme still
// starts on the first screen. The programme leads, full width: RIBA stages, milestones,
// today and each shortlisted material against them. Below it the shortlist, avoided carbon and the planning and
// sustainability requirements, the next steps and details, and the recent activity, collapsed by default.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Activity as ActivityIcon, ArrowRight, Leaf, ListChecks, ListTodo, ScrollText } from 'lucide-react'
import * as f from '../../domain/format'
import { act, useView } from '../../store'
import { projectOverview } from '../../store/selectors/project'
import { programmeForm } from '../../store/selectors/programme'
import { Card, CardBody, CardHeader, CollapsiblePanel, DescriptionList, IndicativeMarker, ProgressBar, toast } from '../../ui'
import { ActivityFeed, ProjectPage, ProjectProgress } from './ProjectParts'
import { SetupChecklist } from './SetupChecklist'
import { ChangeClientDialog, ClientLinkBanner, type ChangeClientMode } from './ClientLinkBanner'
import { ProgrammeCard } from './ProgrammeCard'
import { ProgrammeDialog } from './ProgrammeDialog'
import { RequirementsCard } from './RequirementsCard'
import { RequirementsDialog } from './RequirementsDialog'
import { AppointArchitectCard } from './AppointArchitect'

type DialogState = { kind: 'programme' } | { kind: 'requirements' } | { kind: 'client'; mode: ChangeClientMode } | null

export function Overview() {
  const { projectId = '' } = useParams()
  const view = useView(projectOverview, projectId)
  const form = useView(programmeForm, projectId)
  const [dialog, setDialog] = useState<DialogState>(null)
  if (!view) return null
  const h = view.header
  const total = view.totals.all.count
  const link = view.link
  const latest = view.activity[0]

  const keepDates = () => {
    if (!form) return
    const r = act.setProjectProgramme(projectId, { ribaStage: form.ribaStage, programme: { stageStarts: form.stageStarts, siteStart: form.siteStart, practicalCompletion: form.practicalCompletion }, startDate: form.startDate })
    if (!r.ok) toast.error(r.error ?? 'The programme could not be saved.')
    else toast.success('Programme confirmed', { action: { label: 'Undo', onClick: r.undo } })
  }

  const clientValue = link ? `${link.clientName}, ${link.status === 'declined' ? 'declined' : 'waiting to accept'}` : h.clientName
  const changeClient = (mode: ChangeClientMode) => setDialog({ kind: 'client', mode })
  // While the client has not answered, the link folds into the checklist; when the checklist already leads with the
  // client step, that step says it.
  const inlineLink = !!view.setup?.visible && link?.status === 'pending'

  return (
    <ProjectPage testId="project-overview">
      <div className="flex flex-col gap-6">
        {view.setup?.visible ? (
          <SetupChecklist
            name={h.name}
            setup={view.setup}
            onIntent={(intent) => {
              if (intent === 'edit_programme') setDialog({ kind: 'programme' })
              else if (intent === 'keep_programme') keepDates()
              else if (intent === 'requirements') setDialog({ kind: 'requirements' })
              else if (intent === 'change_client') setDialog({ kind: 'client', mode: link?.status === 'declined' ? 'ask_again' : 'another' })
            }}
            footer={inlineLink && view.setup.focusId !== 'client' ? <ClientLinkBanner projectId={projectId} variant="inline" onChangeClient={changeClient} /> : null}
          />
        ) : null}

        {h.canAppointArchitect ? <AppointArchitectCard projectId={projectId} /> : null}

        {link && !inlineLink ? <ClientLinkBanner projectId={projectId} onChangeClient={changeClient} /> : null}

        <ProgrammeCard projectId={projectId} side={h.side} onEdit={() => setDialog({ kind: 'programme' })} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card className="flex flex-col" data-testid="overview-shortlist">
            <CardHeader
              title="Shortlist"
              icon={ListChecks}
              actions={
                h.side === 'architect' ? (
                  <Link to={`/app/projects/${projectId}/shortlist`} className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11">
                    Open <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                ) : undefined
              }
            />
            <CardBody className="flex flex-1 flex-col gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums text-ink">{total}</span>
                <span className="text-sm text-muted">
                  {total === 1 ? 'material' : 'materials'}, {f.massT(view.totals.all.massT)}
                </span>
              </div>
              <ProjectProgress counts={view.counts} total={total} />
            </CardBody>
          </Card>
          <Card className="flex flex-col" data-testid="overview-carbon">
            <CardHeader title="Avoided carbon" icon={Leaf} actions={<IndicativeMarker />} />
            <CardBody className="flex flex-1 flex-col gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums text-ink">{f.number(view.carbon.securedT, 1)}</span>
                <span className="text-sm text-muted">tCO2e secured by approval</span>
              </div>
              <ProgressBar value={view.carbon.securedT} max={view.carbon.shortlistedT} label="Avoided carbon secured by approval, against everything live on the shortlist" />
              <p className="m-0 text-xs text-muted">
                Of <span className="font-medium tabular-nums text-ink-soft">{f.number(view.carbon.shortlistedT, 1)} tCO2e</span> across shortlisted, sent and approved materials. Against buying the same new, A1 to A4.
              </p>
            </CardBody>
          </Card>
          <Card className="md:col-span-2 xl:col-span-1" data-testid="next-steps">
            <CardHeader title="Next steps" icon={ListTodo} />
            {view.nextSteps.length === 0 ? (
              <p className="m-0 px-5 py-5 text-sm text-muted">{link ? 'More steps appear here once the client accepts the project.' : 'You are up to date on this project.'}</p>
            ) : (
              <ul className="m-0 list-none divide-y divide-line-soft p-0">
                {view.nextSteps.map((s) => (
                  <li key={s.id}>
                    <Link to={s.href} className="group flex min-h-11 items-center gap-3 px-4 py-3 text-base text-ink transition-colors hover:bg-page focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:px-5">
                      <span className="min-w-0 flex-1">{s.text}</span>
                      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="min-w-0">
            <RequirementsCard view={view.requirements} projectId={projectId} onEdit={() => setDialog({ kind: 'requirements' })} />
          </div>
          <Card data-testid="project-details">
            <CardHeader title="Details" icon={ScrollText} />
            <CardBody>
              {h.description ? <p className="m-0 mb-4 text-sm text-ink-soft">{h.description}</p> : null}
              <DescriptionList
                layout="grid"
                items={[
                  { label: 'Client', value: clientValue },
                  { label: 'Architect', value: h.architectText },
                  { label: 'Consultant', value: h.consultantName || 'None yet' },
                  { label: 'Type', value: h.typeLabel },
                  { label: 'Stage', value: h.stageLabel },
                  { label: 'Region', value: h.region },
                  { label: 'Local authority', value: h.localAuthority || 'Not set' },
                  { label: 'Site start', value: h.siteStartText },
                  { label: 'Materials needed from', value: h.startText },
                  { label: 'Practical completion', value: h.completionText },
                ]}
              />
            </CardBody>
          </Card>
        </div>

        <CollapsiblePanel
          id="project-activity"
          title="Recent activity"
          icon={ActivityIcon}
          count={view.activityTotal}
          summary={latest ? `${latest.actor} ${latest.text}, ${latest.timeAgo}` : 'Nothing has happened on this project yet.'}
          testId="overview-activity"
          toggleTestId="overview-activity-toggle"
          actions={
            <Link to={`/app/projects/${projectId}/activity`} className="inline-flex min-h-11 items-center gap-1 rounded-sm px-2 text-sm font-medium text-ink-soft hover:text-ink max-sm:hidden">
              All activity <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
          className="[&>div:last-child]:p-0"
        >
          <ActivityFeed rows={view.activity} empty="Nothing has happened on this project yet." />
          <div className="border-t border-line-soft px-4 py-1 sm:hidden">
            <Link to={`/app/projects/${projectId}/activity`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
              All activity <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </CollapsiblePanel>
      </div>

      {h.side === 'architect' ? (
        <>
          <ProgrammeDialog projectId={projectId} open={dialog?.kind === 'programme'} onOpenChange={(o) => setDialog(o ? { kind: 'programme' } : null)} />
          <RequirementsDialog projectId={projectId} open={dialog?.kind === 'requirements'} onOpenChange={(o) => setDialog(o ? { kind: 'requirements' } : null)} />
          <ChangeClientDialog projectId={projectId} mode={dialog?.kind === 'client' ? dialog.mode : null} onClose={() => setDialog(null)} />
        </>
      ) : null}
    </ProjectPage>
  )
}
