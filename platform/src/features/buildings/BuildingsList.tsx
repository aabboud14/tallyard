// Buildings. The donor building owner sees their donor buildings and their New projects, and adds either; the
// surveyor sees the buildings they are appointed to (to survey or to set dates), grouped by client, then the
// buildings the firm added that no owner has confirmed yet.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CalendarClock, Camera, ClipboardList, HardHat, Plus, UserPlus } from 'lucide-react'
import type { BuildingSketch } from '../../domain/sketch'
import { selectors, useSession, useView } from '../../store'
import type { BuildingCard, BuildingsList as BuildingsListView, OwnerProjectRow } from '../../store/selectors/owner'
import type { ClaimState } from '../../store/selectors/claims'
import { buildingSketches } from '../../store/selectors/buildings-ui'
import { formatDate } from '../../domain/dates'
import { BuildingThumb, Button, Card, EmptyState, PageHeader, Pill, SegmentedBar, Table, TBody, TD, TH, THead, TR } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { SURVEY_TONE, visibilitySegments } from './labels'
import { NewBuildingDialog, type Kind } from './NewBuildingDialog'
import { ClaimActions, ClaimPill } from './ClaimDialog'
import { AppointArchitectDialog } from '../projects/AppointArchitect'
import { MergeCallouts } from './MergeCallout'

export function BuildingsList() {
  const v = useView(selectors.buildingsList)
  const sketches = useView(buildingSketches)
  const { role } = useSession()
  const [params, setParams] = useSearchParams()
  // ?new=1 opens Add building on Donor building; ?new=project opens it on New project.
  const mode = params.get('new')
  const open = mode === '1' || mode === 'project'
  const setOpen = (o: boolean, kind: Kind = 'donor') => {
    const next = new URLSearchParams(params)
    if (o) next.set('new', kind === 'project' ? 'project' : '1')
    else next.delete('new')
    setParams(next, { replace: true })
  }
  if (!v || !sketches) return null
  const owner = role === 'owner'
  return (
    <Page testId="buildings">
      <PageHeader
        title={owner ? 'Buildings' : 'Appointments'}
        subtitle={owner ? 'Donor buildings you recover materials from, and new projects you source them for.' : 'Buildings you survey or date for each client, and the ones you added yourself.'}
        actions={
          v.canAdd ? (
            <Button variant="primary" icon={Plus} onClick={() => setOpen(true)} data-testid="add-building">
              Add building
            </Button>
          ) : null
        }
      />
      <div className="mt-6">
        {v.empty ? (
          owner ? (
            <EmptyState
              variant="page"
              illustration="building"
              title="Add your first building"
              text="Record a building coming down to survey and offer what it holds, or a new project to source reclaimed materials for."
              action={
                <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
                  Add building
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="page"
              icon={ClipboardList}
              title="No appointments yet"
              text="When an owner appoints your firm, buildings appear here. You can also add a building yourself and start capturing now."
              action={
                <Button variant="primary" icon={Plus} onClick={() => setOpen(true)} data-testid="add-building-empty">
                  Add building
                </Button>
              }
            />
          )
        ) : owner ? (
          <OwnerSections v={v} sketches={sketches} onAdd={() => setOpen(true)} onAddProject={() => setOpen(true, 'project')} />
        ) : (
          <SurveyorGroups v={v} sketches={sketches} />
        )}
      </div>
      {v.canAdd ? <NewBuildingDialog open={open} onOpenChange={(o) => setOpen(o)} initialKind={owner && mode === 'project' ? 'project' : 'donor'} /> : null}
    </Page>
  )
}

function OwnerSections({ v, sketches, onAdd, onAddProject }: { v: BuildingsListView; sketches: Record<string, BuildingSketch>; onAdd: () => void; onAddProject: () => void }) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="donor-title" data-testid="donor-buildings">
        <SectionTitle id="donor-title" title="Donor buildings" description="Coming down or being stripped out. What each holds, and what you choose to recover and list." />
        {v.rows.length === 0 ? (
          <EmptyState variant="inline" icon={ClipboardList} title="No donor buildings yet" text="Add a building that is coming down to survey it and offer what it holds." action={<Button size="sm" icon={Plus} onClick={onAdd}>Add donor building</Button>} />
        ) : (
          <OwnerTable rows={v.rows} sketches={sketches} />
        )}
      </section>
      <section aria-labelledby="projects-title" data-testid="new-projects">
        <SectionTitle id="projects-title" title="New projects" description="Being built or refurbished. Your architect shortlists; you approve and reserve." />
        {v.projects.length === 0 ? (
          <Card padding="md" className="flex flex-col gap-3 bg-page/60 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0 text-base text-ink-soft">Building something too? Add a new project to source reclaimed materials for it.</p>
            <Button icon={Plus} onClick={onAddProject} className="shrink-0" data-testid="add-new-project">
              Add new project
            </Button>
          </Card>
        ) : (
          <ProjectsTable rows={v.projects} />
        )}
      </section>
    </div>
  )
}

function OwnerTable({ rows, sketches }: { rows: BuildingCard[]; sketches: Record<string, BuildingSketch> }) {
  return (
    <>
      <Table className="max-md:hidden" caption="Donor buildings">
        <THead>
          <tr>
            <TH>Building</TH>
            <TH>Kind</TH>
            <TH>Survey</TH>
            <TH>Surveyor</TH>
            <TH align="right">Items</TH>
            <TH className="w-[26%]">Visibility</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((b) => (
            <TR key={b.id} interactive className="relative" data-testid={`building-row-${b.id}`}>
              <TD>
                <span className="flex items-center gap-3">
                  {sketches[b.id] ? <BuildingThumb sketch={sketches[b.id]} size="sm" /> : null}
                  <span className="min-w-0">
                    <Link to={b.href} className="font-medium text-ink outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
                      {b.name}
                    </Link>
                    <span className="block text-sm text-muted">{b.address}</span>
                  </span>
                </span>
              </TD>
              <TD>
                <Pill size="sm" variant="quiet">
                  {b.kindLabel}
                </Pill>
              </TD>
              <TD>
                <Pill tone={SURVEY_TONE[b.surveyStatus]} dot size="sm" variant="quiet">
                  {b.surveyStatusLabel}
                </Pill>
              </TD>
              <TD muted>{b.surveyorName || 'Not appointed'}</TD>
              <TD align="right">{b.itemCount}</TD>
              <TD>
                <SegmentedBar label="Lots by visibility" segments={visibilitySegments(b.counts)} legend={false} size="sm" />
                <span className="mt-1 block text-xs text-muted">
                  {b.counts.open} published, {b.counts.matched_only} shared, {b.counts.private} private
                </span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
        {rows.map((b) => (
          <li key={b.id}>
            <BuildingTile b={b} sketch={sketches[b.id]} />
          </li>
        ))}
      </ul>
    </>
  )
}

function ProjectsTable({ rows }: { rows: OwnerProjectRow[] }) {
  const [appointing, setAppointing] = useState<string | null>(null)
  return (
    <>
      <Table className="max-md:hidden" caption="New projects">
        <THead>
          <tr>
            <TH>Project</TH>
            <TH>Architect</TH>
            <TH>RIBA stage</TH>
            <TH>Materials needed from</TH>
            <TH align="right">Waiting for approval</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((p) => (
            <TR key={p.id} interactive className="relative" data-testid={`project-row-${p.id}`}>
              <TD>
                <Link to={p.href} className="font-medium text-ink outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
                  {p.name}
                </Link>
                <span className="block text-sm text-muted">{p.typeLabel}</span>
              </TD>
              <TD>
                {p.architectName ? (
                  p.architectName
                ) : (
                  <span className="relative z-[2] inline-flex items-center gap-2">
                    <span className="text-muted">No architect yet</span>
                    <Button size="sm" variant="ghost" icon={UserPlus} onClick={() => setAppointing(p.id)} data-testid={`appoint-architect-${p.id}`}>
                      Appoint
                    </Button>
                  </span>
                )}
              </TD>
              <TD muted>{p.stageText}</TD>
              <TD muted className="whitespace-nowrap">
                {p.startText}
              </TD>
              <TD align="right">{p.waitingApprovals > 0 ? <Pill tone="warning" size="sm">{p.waitingApprovals}</Pill> : <span className="text-muted">None</span>}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
        {rows.map((p) => (
          <li key={p.id}>
            <Card interactive padding="md" className="flex flex-col gap-2">
              <h3 className="m-0 text-lg font-semibold text-ink">
                <Link to={p.href} className="outline-none after:absolute after:inset-0 after:content-['']">
                  {p.name}
                </Link>
              </h3>
              <p className="m-0 text-sm text-muted">
                {p.typeLabel}, {p.stageText}
              </p>
              <p className="m-0 text-sm text-ink-soft">
                {p.architectName ?? 'No architect yet'}. Materials needed from {p.startText}.
              </p>
              {p.architectName ? null : (
                <Button size="sm" icon={UserPlus} className="relative z-[2] self-start" onClick={() => setAppointing(p.id)}>
                  Appoint an architect
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>
      <AppointArchitectDialog projectId={appointing} onClose={() => setAppointing(null)} />
    </>
  )
}

function BuildingTile({ b, sketch, claim = null, surveyor = false }: { b: BuildingCard; sketch?: BuildingSketch; claim?: ClaimState | null; surveyor?: boolean }) {
  const contractorOnly = b.side === 'contractor'
  return (
    <Card interactive padding="md" className="flex flex-col gap-4" data-testid={`building-tile-${b.id}`}>
      <div className="flex items-start gap-3">
        {sketch ? <BuildingThumb sketch={sketch} size="md" /> : null}
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-lg font-semibold text-ink">
            <Link to={b.href} className="outline-none after:absolute after:inset-0 after:content-['']">
              {b.name}
            </Link>
          </h3>
          <p className="m-0 mt-0.5 text-sm text-muted">{b.address}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {claim ? <ClaimPill claim={claim} /> : <Pill tone={SURVEY_TONE[b.surveyStatus]} dot size="sm" variant="quiet">{b.surveyStatusLabel}</Pill>}
          {b.isContractor ? (
            <Pill size="sm" icon={HardHat} variant="quiet">
              Contractor
            </Pill>
          ) : null}
        </div>
      </div>
      {surveyor ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
          <p className="m-0 text-sm text-ink-soft">
            <span className="font-medium tabular-nums text-ink">{b.itemCount}</span> {b.itemCount === 1 ? 'item' : 'items'} captured
            {b.lastCaptureOn ? <span className="text-muted">, last on {formatDate(b.lastCaptureOn)}</span> : null}
          </p>
          <div className="relative z-[2] flex flex-wrap gap-2">
            {contractorOnly ? (
              <Button asChild size="sm" variant="primary" icon={CalendarClock}>
                <Link to={`${b.href}/availability`}>Set dates</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link to={`${b.href}/inventory`}>Inventory</Link>
                </Button>
                {b.isContractor ? (
                  <Button asChild size="sm" variant="ghost" icon={CalendarClock}>
                    <Link to={`${b.href}/availability`}>Set dates</Link>
                  </Button>
                ) : null}
                {claim ? <ClaimActions buildingId={b.id} buildingName={b.name} claim={claim} size="sm" /> : null}
                <Button asChild size="sm" variant={claim && claim.status !== 'pending' ? 'secondary' : 'primary'} icon={Camera}>
                  <Link to={`${b.href}/capture`}>Capture</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <SegmentedBar label="Lots by visibility" segments={visibilitySegments(b.counts)} total={`${b.itemCount} items`} size="sm" />
      )}
    </Card>
  )
}

function SurveyorGroups({ v, sketches }: { v: BuildingsListView; sketches: Record<string, BuildingSketch> }) {
  const clients = [...new Set(v.rows.map((r) => r.clientName))]
  return (
    <div className="grid items-start gap-x-6 gap-y-8 lg:grid-cols-2">
      {clients.map((c) => (
        <section key={c} aria-label={c}>
          <SectionTitle title={c} description="Client" />
          <div className="grid gap-3">
            {v.rows
              .filter((r) => r.clientName === c)
              .map((b) => (
                <div key={b.id} className="flex flex-col gap-2">
                  <BuildingTile b={b} sketch={sketches[b.id]} surveyor />
                  <MergeCallouts intoId={b.id} />
                </div>
              ))}
          </div>
        </section>
      ))}
      {v.unlinked.length > 0 ? (
        <section aria-label="Not yet linked" data-testid="unlinked-buildings">
          <SectionTitle title="Not yet linked" description="Buildings your firm added. Private to you until each owner confirms it." />
          <div className="grid gap-3">
            {v.unlinked.map((b) => (
              <BuildingTile key={b.id} b={b} sketch={sketches[b.id]} claim={b.claim} surveyor />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default BuildingsList
