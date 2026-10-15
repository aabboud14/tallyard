// Certification (/app/projects/:id/certification), the consultant's page: for BREEAM, LEED, WELL and the circular
// economy measures, each credit's targeted switch, status, the status Tallyard's records suggest with the reason,
// what Tallyard provides, the materials mapped to it and a note; and the same mapping as a grid of materials
// against the targeted credits. Every summary is indicative and none of it is certification advice.
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Grid3x3, Lightbulb, ListChecks, Save, Target } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { CertificationView, CreditRow } from '../../store/selectors/sustainability'
import { readyText, schemeCard } from '../../store/selectors/sustainability-screens'
import { SCHEME_IDS, type SchemeId } from '../../domain/reference/certification'
import type { TrackStatus } from '../../domain/sustainabilityTypes'
import { Button, Callout, Card, Checkbox, cx, DescriptionList, EmptyState, Pill, Switch, Table, TBody, TD, TH, THead, TR, Tabs, Textarea, toast, TrackStatusSelect, type TrackStatusKey } from '../../ui'
import { Page } from '../../app/Page'
import { useMediaQuery } from '../../app/media'
import { TabHeader, TrackBar } from './parts'

const STATUS_OPTIONS: readonly TrackStatusKey[] = ['not_started', 'in_progress', 'at_risk', 'evidence_ready']
const ITEM_TONE: Record<string, 'brand' | 'info' | 'neutral'> = { Confirmed: 'brand', Reserved: 'info', Approved: 'neutral' }

function isScheme(s: string | null): s is SchemeId {
  return !!s && (SCHEME_IDS as readonly string[]).includes(s)
}

function itemHint(included: boolean, byDefault: boolean): string {
  if (included) return byDefault ? 'Included by the rule' : 'Added by you'
  return byDefault ? 'Left out by you' : 'Not covered by the rule'
}

function outcome(r: { ok: boolean; error: string | null }, fallback: string): boolean {
  if (!r.ok) toast.error(r.error ?? fallback)
  return r.ok
}

function CreditCard({ c, projectId }: { c: CreditRow; projectId: string }) {
  const [note, setNote] = useState(c.note)
  const dirty = note.trim() !== c.note
  const setStatus = (s: TrackStatus) => outcome(act.setCreditStatus(projectId, c.id, s), 'Could not change the status.')
  const suggestion = c.targeted && c.suggested && c.suggested.status !== c.status ? c.suggested : null
  return (
    <Card as="article" data-testid={`credit-${c.id}`} data-targeted={c.targeted} className={cx('flex min-w-0 flex-col', !c.targeted && 'bg-page/60')}>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <Switch checked={c.targeted} onCheckedChange={(on) => outcome(act.setCreditTargeted(projectId, c.id, on), 'Could not change the credit.')} aria-label={`Target ${c.code}`} data-testid={`credit-targeted-${c.id}`} className="mt-0.5" />
          <div className="min-w-0">
            <p className="m-0 text-xs font-medium tabular-nums text-muted">{c.code}</p>
            <h3 className={cx('m-0 text-base font-semibold', c.targeted ? 'text-ink' : 'text-ink-soft')}>{c.title}</h3>
            {!c.targeted ? <p className="m-0 mt-0.5 text-sm text-muted">Not targeted on this project</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 max-sm:pl-12">
          <TrackStatusSelect value={c.status} onChange={setStatus} label={`Status of ${c.code}`} options={STATUS_OPTIONS} disabled={!c.targeted} testId={`credit-status-${c.id}`} />
        </div>
      </div>
      {suggestion ? (
        <div className="mx-4 mb-4 flex flex-col gap-2 rounded-md border border-info-line bg-info-soft/60 px-3.5 py-2.5 sm:mx-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 flex min-w-0 items-start gap-2 text-sm text-ink-soft">
            <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
            <span className="min-w-0">
              <span className="font-medium text-ink">Suggested: {suggestion.label}.</span> {suggestion.reason}
            </span>
          </p>
          <Button size="sm" onClick={() => setStatus(suggestion.status)} data-testid={`credit-suggest-${c.id}`} className="self-start sm:self-auto">
            Use suggestion
          </Button>
        </div>
      ) : null}
      <div className="grid gap-5 border-t border-line-soft px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="m-0 text-sm text-ink-soft">{c.summary}</p>
          <div>
            <p className="m-0 text-xs font-medium text-muted">What Tallyard provides</p>
            <p className="m-0 mt-0.5 text-sm text-ink">{c.provides}</p>
          </div>
          {c.metrics.length > 0 ? <DescriptionList className="text-sm" items={c.metrics.map((m) => ({ label: m.label, value: m.value }))} /> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 text-xs font-medium text-muted">Materials</p>
          {c.items.length === 0 ? (
            <p className="m-0 text-sm text-muted">This credit does not map individual materials.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col divide-y divide-line-soft rounded-md border border-line-soft p-0">
              {c.items.map((it) => (
                <li key={it.publicId} className="flex min-w-0 items-start gap-3 px-3 py-2.5">
                  <Checkbox
                    checked={it.included}
                    disabled={!c.targeted}
                    onCheckedChange={(on) => outcome(act.setCreditItem(projectId, c.id, it.publicId, on === true), 'Could not change the mapping.')}
                    aria-label={`Include ${it.publicId} in ${c.code}`}
                    data-testid={`credit-item-${c.id}-${it.publicId}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm font-medium text-ink">
                      {it.publicId} <span className="font-normal text-ink-soft">{it.description}</span>
                    </p>
                    <p className="m-0 text-xs text-muted">{itemHint(it.included, it.byDefault)}</p>
                  </div>
                  <Pill size="sm" variant="quiet" tone={ITEM_TONE[it.status] ?? 'neutral'} className="shrink-0">
                    {it.status}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-line-soft px-4 py-3.5 sm:px-5">
        <label htmlFor={`note-${c.id}`} className="text-xs font-medium text-muted">
          Note
        </label>
        <Textarea id={`note-${c.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: evidence held by the assessor." data-testid={`credit-note-${c.id}`} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted">{c.updatedText ?? ''}</span>
          <Button
            size="sm"
            icon={Save}
            disabled={!dirty}
            onClick={() => {
              if (outcome(act.setCreditNote(projectId, c.id, note), 'Could not save the note.')) toast.success('Note saved')
            }}
            data-testid={`credit-note-save-${c.id}`}
          >
            Save note
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Matrix({ v, projectId }: { v: CertificationView; projectId: string }) {
  const wide = useMediaQuery('(min-width: 768px)')
  const m = v.matrix
  if (m.credits.length === 0)
    return <EmptyState variant="card" icon={Grid3x3} title="No targeted credits map materials" text="Target a credit that maps reclaimed materials, such as reuse or materials transparency, to see it here." testId="cert-matrix" />
  const toggle = (creditId: string, publicId: string, on: boolean) => outcome(act.setCreditItem(projectId, creditId, publicId, on), 'Could not change the mapping.')
  const box = (creditId: string, label: string, publicId: string) => (
    <Checkbox checked={m.included[`${creditId}:${publicId}`] ?? false} onCheckedChange={(on) => toggle(creditId, publicId, on === true)} aria-label={`Include ${publicId} in ${label}`} data-testid={`matrix-${creditId}-${publicId}`} />
  )
  if (wide)
    return (
      <Table caption="Materials against the targeted credits" data-testid="cert-matrix">
        <THead>
          <tr>
            <TH>Material</TH>
            <TH>Status</TH>
            {m.credits.map((c) => (
              <TH key={c.id} align="center">
                {c.label}
              </TH>
            ))}
          </tr>
        </THead>
        <TBody>
          {m.items.map((it) => (
            <TR key={it.publicId}>
              <TD className="min-w-0">
                <span className="font-medium">{it.publicId}</span>
                <span className="block max-w-[28ch] truncate text-sm text-muted">{it.description}</span>
              </TD>
              <TD>
                <Pill size="sm" variant="quiet" tone={ITEM_TONE[it.status] ?? 'neutral'}>
                  {it.status}
                </Pill>
              </TD>
              {m.credits.map((c) => (
                <TD key={c.id} align="center">
                  <span className="inline-flex justify-center">{box(c.id, c.label, it.publicId)}</span>
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    )
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0" data-testid="cert-matrix">
      {m.items.map((it) => (
        <li key={it.publicId}>
          <Card padding="md" className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 font-medium text-ink">{it.publicId}</p>
                <p className="m-0 text-sm text-muted">{it.description}</p>
              </div>
              <Pill size="sm" variant="quiet" tone={ITEM_TONE[it.status] ?? 'neutral'} className="shrink-0">
                {it.status}
              </Pill>
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {m.credits.map((c) => (
                <li key={c.id} className="flex min-h-11 items-center gap-3">
                  {box(c.id, c.label, it.publicId)}
                  <span className="text-sm text-ink-soft">{c.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function ViewSwitch({ value, onChange }: { value: 'credit' | 'item'; onChange: (v: 'credit' | 'item') => void }) {
  const items = [
    { v: 'credit' as const, label: 'By credit', icon: ListChecks, testId: 'view-by-credit' },
    { v: 'item' as const, label: 'By material', icon: Grid3x3, testId: 'view-by-item' },
  ]
  return (
    <div role="group" aria-label="Show" className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-subtle p-0.5 ring-1 ring-inset ring-line-soft">
      {items.map((it) => (
        <button
          key={it.v}
          type="button"
          aria-pressed={value === it.v}
          onClick={() => onChange(it.v)}
          data-testid={it.testId}
          className={cx(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors max-sm:min-h-11 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 [&_svg]:size-4',
            value === it.v ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(28_25_23/0.08),0_0_0_1px_rgb(28_25_23/0.04)]' : 'text-muted hover:text-ink',
          )}
        >
          <it.icon aria-hidden="true" />
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Certification() {
  const { projectId = '' } = useParams()
  const [params] = useSearchParams()
  const raw = params.get('scheme')
  const scheme: SchemeId = isScheme(raw) ? raw : 'breeam'
  const v = useView(selectors.certificationView, projectId, scheme)
  const [view, setView] = useState<'credit' | 'item'>('credit')
  if (!v) return null
  const current = v.schemes.find((s) => s.scheme === v.scheme)!
  const card = schemeCard(current)
  const base = `/app/projects/${projectId}`
  return (
    <Page testId="certification-page" className="lg:pt-7">
      <div className="flex flex-col gap-6">
        <TabHeader title="Certification" subtitle="Map the project's reclaimed materials to the credits you are targeting, and keep each credit's status and evidence current." />
        <Callout tone="neutral" title="Indicative, not certification advice">
          {v.caveat}
        </Callout>
        <div className="border-b border-line">
          <Tabs
            label="Scheme"
            wrapOnPhone
            items={v.schemes.map((s) => ({ label: s.label, href: `${base}/certification?scheme=${s.scheme}`, active: s.scheme === v.scheme, count: s.targeted, testId: `scheme-tab-${s.scheme}` }))}
          />
        </div>
        <Card padding="lg" className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]" data-testid="scheme-summary">
          <div className="min-w-0">
            <p className="m-0 text-sm text-muted">Target</p>
            <p className="m-0 text-lg font-semibold text-ink">{card.targetText}</p>
            {current.scheme !== 'circular' ? (
              <Link to={`${base}/targets`} className="mt-0.5 inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-brand-700 hover:underline sm:min-h-0">
                <Target aria-hidden="true" className="size-3.5" />
                Change in Goals and targets
              </Link>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="m-0 text-sm text-muted">{card.latestLabel}</p>
            <p className="m-0 text-lg font-semibold text-ink">{card.predictedText}</p>
            <p className="m-0 mt-0.5 text-sm text-muted">{current.version}</p>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-2">
            <TrackBar counts={current.counts} label={`${current.label} credits by status`} total={readyText(current.ready, current.targeted)} />
          </div>
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-muted">{view === 'credit' ? `${v.credits.length} credits and measures. Switch one off when the project is not seeking it.` : 'Tick a material to map it to a targeted credit.'}</p>
          <ViewSwitch value={view} onChange={setView} />
        </div>
        {v.empty ? (
          <Callout tone="info" title="No reclaimed materials yet">
            Credits that rely on reused items fill in as the client approves and reserves materials.
          </Callout>
        ) : null}
        {view === 'credit' ? (
          <div className="flex flex-col gap-4" data-testid="cert-credits">
            {v.credits.map((c) => (
              <CreditCard key={`${c.id}-${c.note}`} c={c} projectId={projectId} />
            ))}
          </div>
        ) : v.empty ? null : (
          <Matrix v={v} projectId={projectId} />
        )}
      </div>
    </Page>
  )
}

export default Certification
