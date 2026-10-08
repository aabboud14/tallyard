// The sustainability consultant's home: projects with their carbon and content by value, waste engagements and
// recent activity.
import { Link } from 'react-router'
import { ArrowRight, FileSpreadsheet, FolderOpen, Recycle } from 'lucide-react'
import { selectors, useView } from '../../store'
import * as f from '../../domain/format'
import { Button, Card, CardHeader, EmptyState, IndicativeMarker, PageHeader, Pill, Table, TBody, TD, TH, THead, TR } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { ActivityFeed, StatStrip } from '../notifications/kit'

export function ConsultantHome() {
  const v = useView(selectors.consultantHome)
  if (!v) return null
  return (
    <Page testId="consultant-home">
      <PageHeader title={v.greeting} subtitle={v.dateText} />
      <StatStrip
        className="mt-6"
        items={[
          { label: 'Projects', value: v.stats.projects },
          { label: 'Avoided carbon, approved', value: f.number(v.stats.avoidedApprovedT, 1), unit: 'tCO2e', indicative: true },
          { label: 'On live shortlists', value: f.number(v.stats.avoidedShortlistedT, 1), unit: 'tCO2e', sub: 'Shortlisted, sent and approved' },
          { label: 'Waste engagements', value: v.stats.engagements },
        ]}
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="projects-title">
            <SectionTitle id="projects-title" title="Projects" description="Where reclaimed materials stand on each project you advise." actions={<IndicativeMarker />} />
            {v.projects.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No projects yet" text="When an architect adds your consultancy to a project, it appears here with its carbon and compliance figures." />
            ) : (
              <>
                <Table caption="Projects" className="max-md:hidden" data-testid="consultant-projects">
                  <THead>
                    <tr>
                      <TH>Project</TH>
                      <TH align="right">Content by value</TH>
                      <TH align="right">Approved</TH>
                      <TH align="right">Live shortlist</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {v.projects.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <Link to={p.href} className="font-medium text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4">
                            {p.name}
                          </Link>
                          <span className="block truncate text-sm text-muted">
                            {p.clientName} · Stage {p.stage}
                          </span>
                          <span className="mt-1 flex gap-3 text-sm">
                            <Link to={`${p.href}/carbon`} className="font-medium text-brand-700 hover:underline">
                              Carbon
                            </Link>
                            <Link to={`${p.href}/compliance`} className="font-medium text-brand-700 hover:underline">
                              Compliance
                            </Link>
                          </span>
                        </TD>
                        <TD align="right" className="whitespace-nowrap">
                          {p.contentPercent === null ? <span className="text-sm text-faint">No bill yet</span> : <span className="font-medium">{f.percent2(p.contentPercent)}</span>}
                        </TD>
                        <TD align="right" className="whitespace-nowrap">
                          {f.carbon(p.avoidedApprovedT)}
                        </TD>
                        <TD align="right" className="whitespace-nowrap text-ink-soft">
                          {f.carbon(p.avoidedShortlistedT)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
                  {v.projects.map((p) => (
                    <li key={p.id}>
                      <Card padding="md" className="flex flex-col gap-3">
                        <div>
                          <Link to={p.href} className="text-md font-semibold text-ink">
                            {p.name}
                          </Link>
                          <p className="m-0 text-sm text-muted">
                            {p.clientName} · {p.typeLabel}
                          </p>
                        </div>
                        <dl className="m-0 grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-xs text-muted">Content by value</dt>
                            <dd className="m-0 font-medium">{p.contentPercent === null ? 'No bill' : f.percent2(p.contentPercent)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">Approved</dt>
                            <dd className="m-0 font-medium">{f.carbon(p.avoidedApprovedT)}</dd>
                          </div>
                        </dl>
                        <div className="flex gap-2">
                          <Button asChild size="sm" className="flex-1">
                            <Link to={`${p.href}/carbon`}>Carbon</Link>
                          </Button>
                          <Button asChild size="sm" className="flex-1">
                            <Link to={`${p.href}/compliance`}>Compliance</Link>
                          </Button>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="engagements-title">
            <SectionTitle id="engagements-title" title="Waste engagements" description="Demolition bills for buildings coming down, reviewed for diversion and reuse." />
            {v.engagements.length === 0 ? (
              <EmptyState variant="inline" icon={Recycle} title="No engagements" text="Waste engagements you are given appear here." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {v.engagements.map((e) => (
                  <Card key={e.id} interactive padding="md" className="flex items-start gap-3.5">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-subtle text-muted ring-1 ring-inset ring-line-soft">
                      <FileSpreadsheet aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="m-0 text-base font-semibold text-ink">
                        <Link to={e.href} className="outline-none after:absolute after:inset-0 after:content-['']">
                          {e.name}
                        </Link>
                      </h3>
                      <p className="m-0 mt-0.5 text-sm text-muted">{e.period}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Pill tone={e.hasBill ? 'brand' : 'neutral'} dot size="sm">
                          {e.hasBill ? 'Bill reviewed' : 'No bill loaded'}
                        </Pill>
                        <ArrowRight aria-hidden="true" className="size-4 text-faint" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="min-w-0">
          <Card>
            <CardHeader title="Recent activity" />
            <div className="px-4 py-4 sm:px-5">
              <ActivityFeed rows={v.activity} compact emptyText="Decisions and reservations on your projects appear here." />
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  )
}

export default ConsultantHome
