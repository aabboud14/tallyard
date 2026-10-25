// The Sustainability tab (/app/projects/:id/sustainability) for every side, in place of Carbon: secured carbon and
// content against the targets, carbon by status and by typology, a certification snapshot per scheme, the
// requirements roll-up and the circular economy statement. Read only; the consultant edits on their own tabs. No
// money figure appears here for anyone. Every summary is indicative and none is certification advice.
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowRight, BookOpenCheck, CircleCheck, FileText, Gauge, Leaf, Recycle, Scale, ShieldCheck, Target, TriangleAlert, Weight } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { SustainabilityView } from '../../store/selectors/sustainability'
import { goalMeter, schemeCard, STATEMENT_TONE } from '../../store/selectors/sustainability-screens'
import * as f from '../../domain/format'
import { CERT_CAVEAT } from '../../domain/reference/sustainabilityCopy'
import { Button, Callout, Card, Dialog, Field, MetricGrid, MetricTile, Pill, ProgressRing, StatementText, Textarea, toast } from '../../ui'
import { Page } from '../../app/Page'
import { CarbonSection } from '../carbon/ProjectCarbon'
import { GoalMeterView, MethodologyFooter, TabHeader, TabSection, TrackBar, TrackLegend } from './parts'

const SCHEME_ICON = { breeam: ShieldCheck, leed: ShieldCheck, well: ShieldCheck, circular: Recycle } as const

function shareText(share: number): string {
  return `${f.fixed(share * 100, 0)}%`
}

export function Metrics({ v }: { v: SustainabilityView }) {
  const carbonRow = v.metrics.carbon
  const contentRow = v.metrics.content
  const carbon = carbonRow ? goalMeter(carbonRow) : null
  const content = contentRow ? goalMeter(contentRow) : null
  const carbonTarget = carbon?.target ?? null
  const contentTarget = content?.target ?? null
  const hasContent = v.metrics.contentSecured !== null
  return (
    <MetricGrid label="Sustainability figures" testId="sustainability-metrics">
      <MetricTile
        label="Avoided carbon, secured"
        icon={Leaf}
        value={f.number(v.metrics.avoidedSecuredT, 1)}
        unit="tCO2e"
        state={carbon && carbonTarget !== null ? carbon.state : undefined}
        stateLabel={carbon?.stateText}
        sub={carbon && carbonTarget !== null ? carbon.targetText : 'No carbon target set'}
        chart={carbon && carbonRow && carbonTarget !== null ? <ProgressRing value={carbon.value} max={carbonTarget} label="Avoided carbon against the target" valueText={`${carbon.valueText} of ${carbonRow.targetText}`} state={carbon.state} centre={shareText(carbonRow.share)} /> : undefined}
        indicative
        testId="sus-metric-carbon"
      />
      <MetricTile label="Avoided carbon, live list" icon={Gauge} value={f.number(v.metrics.avoidedLiveT, 1)} unit="tCO2e" sub="Shortlisted, sent and approved" indicative testId="sus-metric-live" />
      <MetricTile
        label="Content by value"
        icon={Scale}
        value={v.metrics.contentSecured === null ? 'No bill yet' : f.percent(v.metrics.contentSecured)}
        state={content && contentTarget !== null && hasContent ? content.state : undefined}
        stateLabel={content?.stateText}
        sub={!hasContent ? 'Needs the bill of materials' : content && contentTarget !== null ? `Reused and recycled. ${content.targetText}` : 'Reused and recycled, no target set'}
        chart={content && contentRow && contentTarget !== null && hasContent ? <ProgressRing value={content.value} max={contentTarget} label="Content by value against the target" valueText={`${content.valueText} of ${contentRow.targetText}`} state={content.state} centre={shareText(contentRow.share)} /> : undefined}
        indicative
        testId="sus-metric-content"
      />
      <MetricTile label="Reclaimed mass, secured" icon={Weight} value={f.number(v.metrics.reclaimedSecuredT, 1)} unit="t" sub="Earlier deals and accepted reservations" testId="sus-metric-mass" />
    </MetricGrid>
  )
}

export function Targets({ v }: { v: SustainabilityView }) {
  return (
    <TabSection
      id="targets"
      title="Targets"
      description={v.side === 'consultant' ? 'From the requirements that apply and your overrides.' : v.targetsNote}
      indicative
      testId="sustainability-targets"
      actions={
        v.links.targets ? (
          <Button asChild size="sm" icon={Target}>
            <Link to={v.links.targets}>Edit targets</Link>
          </Button>
        ) : null
      }
    >
      {v.goals.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-line-strong px-4 py-3.5 text-sm text-muted">No targets set for this project yet.</p>
      ) : (
        <Card padding="lg" className="grid gap-x-10 gap-y-7 md:grid-cols-2">
          {v.goals.map((g) => (
            <GoalMeterView key={g.id} row={g} testId={`meter-${g.id}`} />
          ))}
        </Card>
      )}
    </TabSection>
  )
}

export function Schemes({ v }: { v: SustainabilityView }) {
  return (
    <TabSection
      id="certification"
      title="Certification"
      description={CERT_CAVEAT}
      indicative
      testId="sustainability-schemes"
      actions={
        v.links.certification ? (
          <Button asChild size="sm" trailingIcon={ArrowRight}>
            <Link to={v.links.certification}>Open certification</Link>
          </Button>
        ) : null
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {v.schemes.map((s) => {
          const c = schemeCard(s, v.side)
          const Icon = SCHEME_ICON[s.scheme]
          return (
            <Card key={s.scheme} padding="md" className="flex min-w-0 flex-col gap-3" data-testid={`scheme-${s.scheme}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="m-0 flex items-center gap-1.5 text-base font-semibold text-ink">
                    <Icon aria-hidden="true" className="size-4 text-faint" />
                    {s.label}
                  </p>
                  <p className="m-0 mt-0.5 line-clamp-2 text-xs text-muted" title={s.version}>
                    {s.version}
                  </p>
                </div>
                {c.atRiskText ? (
                  <Pill tone="warning" size="sm" icon={TriangleAlert} className="shrink-0">
                    {c.atRiskText}
                  </Pill>
                ) : null}
              </div>
              <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
                <div className="min-w-0">
                  <dt className="text-muted">Target</dt>
                  <dd className="m-0 font-medium text-ink">{c.targetText}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted">{c.latestLabel}</dt>
                  <dd className="m-0 font-medium text-ink">{c.predictedText}</dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-col gap-1.5 border-t border-line-soft pt-3">
                <TrackBar counts={s.counts} label={`${s.label} credits by status`} size="sm" legend={false} />
                <p className="m-0 text-sm text-ink-soft">{c.readyText}</p>
              </div>
            </Card>
          )
        })}
      </div>
      <TrackLegend />
    </TabSection>
  )
}

export function RequirementsRollup({ v }: { v: SustainabilityView }) {
  const r = v.requirements
  return (
    <TabSection
      id="requirements"
      title="Planning and sustainability requirements"
      description={r.total === 0 ? 'No requirements recorded for this project yet.' : `${r.ready} of ${r.total} with evidence ready`}
      testId="sustainability-requirements"
      actions={
        <Button asChild size="sm" trailingIcon={ArrowRight}>
          <Link to={r.href}>Open requirements</Link>
        </Button>
      }
    >
      <Card padding="lg" className="flex flex-col gap-4">
        <TrackBar counts={r} label="Requirements by status" />
        {r.atRiskItems.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 border-t border-line-soft p-0 pt-4">
            {r.atRiskItems.map((x) => (
              <li key={x.id} className="flex min-w-0 items-center gap-2 text-sm">
                <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
                <Link to={r.href} className="min-w-0 rounded-sm font-medium text-ink hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center sm:truncate">
                  {x.title}
                </Link>
                <span className="shrink-0 text-muted">At risk</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </TabSection>
  )
}

export function StatementCard({ v, projectId }: { v: SustainabilityView; projectId: string }) {
  const [open, setOpen] = useState(false)
  const s = v.statement
  if (!s) return null
  const isClient = v.side === 'client'
  const line = s.line
  return (
    <section id="statement" aria-labelledby="statement-title" className="scroll-mt-24" data-testid="statement-card">
      <div className={`flex flex-col gap-4 rounded-lg border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${s.canReview ? 'border-info-line bg-info-soft/60' : 'border-line bg-surface'}`}>
        <div className="flex min-w-0 items-start gap-3.5">
          <FileText aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${s.canReview ? 'text-info' : 'text-faint'}`} />
          <div className="min-w-0">
            <h3 id="statement-title" className="m-0 flex flex-wrap items-center gap-2.5 text-md font-semibold text-ink">
              Circular economy statement
              <Pill tone={STATEMENT_TONE[s.status]} size="sm" dot data-testid="statement-card-status">
                {s.label}
              </Pill>
            </h3>
            <p className="m-0 mt-1 text-sm text-ink-soft">{line}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {s.canReview ? (
            <Button variant="primary" icon={BookOpenCheck} onClick={() => setOpen(true)} data-testid="statement-review">
              Read and review
            </Button>
          ) : isClient && s.href ? (
            <Button icon={FileText} onClick={() => setOpen(true)} data-testid="statement-read">
              Read the statement
            </Button>
          ) : null}
          {!isClient && s.href ? (
            <Button asChild trailingIcon={ArrowRight}>
              <Link to={s.href}>Open the statement</Link>
            </Button>
          ) : null}
        </div>
      </div>
      {isClient ? <ReviewDialog projectId={projectId} open={open} onClose={() => setOpen(false)} /> : null}
    </section>
  )
}

function ReviewDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const st = useView(selectors.statementView, projectId)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!st) return null
  const close = () => {
    setNote('')
    setError(null)
    onClose()
  }
  const confirm = () => {
    const r = act.reviewStatement(projectId, note)
    if (!r.ok) {
      setError(r.error)
      return
    }
    toast.success('Statement reviewed', { description: 'The consultant sees your comments.', action: { label: 'Undo', onClick: r.undo } })
    close()
  }
  const consultant = st.header.consultantName || 'the consultant'
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close()
      }}
      title={st.title}
      description={st.subtitle}
      size="xl"
      testId="statement-review-dialog"
      footer={
        st.canReview ? (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" icon={CircleCheck} onClick={confirm} data-testid="statement-review-confirm">
              Mark as reviewed
            </Button>
          </>
        ) : (
          <Button onClick={close}>Close</Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <Callout tone="warning">{st.caveat}</Callout>
        {st.changedSinceSent ? (
          <div data-testid="statement-review-changed">
            <Callout tone="info" role="status">
              {st.changedSinceSent}
            </Callout>
          </div>
        ) : null}
        {st.sections.map((s) => (
          <section key={s.id} className="flex flex-col gap-1.5">
            <h3 className="m-0 text-base font-semibold text-ink">{s.heading}</h3>
            <StatementText text={s.text} className="text-ink-soft" />
          </section>
        ))}
        {st.reviewedText ? (
          <p className="m-0 border-t border-line-soft pt-4 text-sm text-muted">
            {st.reviewedText}.{st.reviewNote ? ` Your comments: ${st.reviewNote}` : ''}
          </p>
        ) : null}
        {st.canReview ? (
          <Field label={`Comments for ${consultant}`} optional error={error ?? undefined}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="For example: please add the brick reuse on the podium." data-testid="statement-review-note" />
          </Field>
        ) : null}
      </div>
    </Dialog>
  )
}

/** Scrolls to the section the address names, for links such as /sustainability#statement. */
function useHashScroll(ready: boolean) {
  const { hash } = useLocation()
  useEffect(() => {
    if (!ready || !hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' })
  }, [hash, ready])
}

const SUBTITLE = {
  consultant: 'What the project has secured against its targets, and where the evidence stands. Indicative, not certification advice.',
  client: 'Carbon, content by value, targets, certification and requirements, from your consultant and the materials you approve. Indicative.',
  architect: 'Carbon, content by value, targets and certification for this project. Read only and indicative.',
} as const

export function Sustainability() {
  const { projectId = '' } = useParams()
  const v = useView(selectors.sustainabilityView, projectId)
  useHashScroll(!!v)
  if (!v) return null
  return (
    <Page testId="sustainability-page" className="lg:pt-7">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-5">
          <TabHeader title="Sustainability" subtitle={SUBTITLE[v.side]} />
          <Metrics v={v} />
        </div>
        {v.side !== 'architect' ? <StatementCard v={v} projectId={projectId} /> : null}
        <Targets v={v} />
        <TabSection id="carbon" title="Avoided carbon" description="Against buying new, modules A1 to A4, from the public listings.">
          <CarbonSection />
        </TabSection>
        <Schemes v={v} />
        <RequirementsRollup v={v} />
        <MethodologyFooter />
      </div>
    </Page>
  )
}

export default Sustainability
