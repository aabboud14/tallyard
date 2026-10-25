// Sustainability tracking across the client's projects: BREEAM, LEED and WELL targets with the credits ready and at
// risk, content by value against its target with the statement's status, and the requirements ready. Read from the
// consultant's records; indicative, and not certification advice.
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import type { TrackingRow, TrackingScheme } from '../../../store/selectors/sustainability'
import { readyText } from '../../../store/selectors/sustainability-screens'
import { CERT_CAVEAT, inSentence } from '../../../domain/reference/sustainabilityCopy'
import { Card, IndicativeMarker, METRIC_STATE, Pill, Table, TBody, TD, TH, THead, TR, type Tone } from '../../../ui'
import { GoalMeterView } from '../../sustainability/parts'

const SCHEMES = [
  ['breeam', 'BREEAM'],
  ['leed', 'LEED'],
  ['well', 'WELL'],
] as const

const TONES: readonly Tone[] = ['neutral', 'brand', 'info', 'warning', 'danger']
const toneOf = (t: string): Tone => (TONES as readonly string[]).includes(t) ? (t as Tone) : 'neutral'

/** The table needs about 56rem; below that (a phone, or a laptop with the sidebar open) each project is a card. */
const TABLE_MIN_WIDTH = 896

/** Whether the element is at least min px wide, from its own width rather than the window's. */
function useWideEnough(ref: RefObject<HTMLElement | null>, min: number): boolean {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setWide(el.getBoundingClientRect().width >= min)
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, min])
  return wide
}

/** Under the project name when no consultant is on it: the scheme cells still show the targets that apply. */
const NO_CONSULTANT = 'No consultant appointed yet'

function SchemeCell({ s }: { s: TrackingScheme }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className={s.targetText === 'Not targeted' ? 'text-sm text-muted' : 'text-sm font-medium text-ink'}>{s.targetText}</span>
      {s.targeted > 0 ? (
        <span className="text-xs text-muted">
          {readyText(s.ready, s.targeted)}
          {s.predictedText ? `. Latest ${s.predictedText}` : ''}
        </span>
      ) : null}
      {s.state || s.atRisk > 0 ? (
        <span className="mt-1 flex flex-wrap gap-1">
          {s.state ? (
            <Pill size="sm" tone={METRIC_STATE[s.state.state].tone} icon={METRIC_STATE[s.state.state].icon}>
              {s.state.label}
            </Pill>
          ) : null}
          {s.atRisk > 0 ? (
            <Pill size="sm" tone="warning" icon={TriangleAlert}>
              {s.atRisk} at risk
            </Pill>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

function CircularCell({ r }: { r: TrackingRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {r.circular.content ? <GoalMeterView row={r.circular.content} size="sm" label="Content by value" /> : null}
      <Pill size="sm" dot tone={toneOf(r.circular.statementTone)} className="self-start">
        Statement: {inSentence(r.circular.statementLabel)}
      </Pill>
    </div>
  )
}

function RequirementsCell({ r }: { r: TrackingRow }) {
  const q = r.requirements
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-medium text-ink">{q.total === 0 ? 'None recorded' : `${q.ready} of ${q.total} ready`}</span>
      {q.inProgress > 0 ? <span className="text-xs text-muted">{q.inProgress} in progress</span> : null}
      {q.atRisk > 0 ? (
        <Pill size="sm" tone="warning" icon={TriangleAlert} className="mt-1 self-start">
          {q.atRisk} at risk
        </Pill>
      ) : null}
      {r.locationText ? (
        <span className="mt-1 text-xs text-muted" data-testid={`tracking-location-${r.projectId}`}>
          For {r.locationText}
        </span>
      ) : null}
    </div>
  )
}

export function TrackingTable({ rows }: { rows: TrackingRow[] }) {
  const ref = useRef<HTMLElement>(null)
  const wide = useWideEnough(ref, TABLE_MIN_WIDTH)
  return (
    <section ref={ref} aria-labelledby="tracking-title" data-testid="sustainability-tracking" data-layout={wide ? 'table' : 'cards'} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id="tracking-title" className="m-0 flex flex-wrap items-center gap-2.5 text-md font-semibold text-ink">
            Sustainability tracking
            <IndicativeMarker />
          </h2>
          <p className="m-0 mt-0.5 max-w-[90ch] text-sm text-muted">{CERT_CAVEAT}</p>
        </div>
      </div>
      {wide ? (
        <Table caption="Sustainability tracking by project">
          <THead>
            <tr>
              <TH>Project</TH>
              {SCHEMES.map(([, label]) => (
                <TH key={label}>{label}</TH>
              ))}
              <TH>Circular economy</TH>
              <TH>Requirements</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.projectId} data-testid={`tracking-${r.projectId}`} className="[&>td]:align-top [&>td]:py-3.5">
                <TD>
                  <Link to={r.href} className="rounded-sm font-medium text-ink hover:underline">
                    {r.projectName}
                  </Link>
                  <span className="block text-xs text-muted">{r.consultantName ?? NO_CONSULTANT}</span>
                </TD>
                {SCHEMES.map(([id]) => (
                  <TD key={id}>
                    <SchemeCell s={r.schemes[id]} />
                  </TD>
                ))}
                <TD className="min-w-48">
                  <CircularCell r={r} />
                </TD>
                <TD>
                  <RequirementsCell r={r} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((r) => (
            <li key={r.projectId} data-testid={`tracking-${r.projectId}`}>
              <Card padding="md" className="flex flex-col gap-4">
                <div>
                  <Link to={r.href} className="inline-flex min-h-11 items-center rounded-sm font-semibold text-ink hover:underline">
                    {r.projectName}
                  </Link>
                  <p className="m-0 text-xs text-muted">{r.consultantName ?? NO_CONSULTANT}</p>
                </div>
                <dl className="m-0 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                  {SCHEMES.map(([id, label]) => (
                    <div key={id} className="min-w-0">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="m-0">
                        <SchemeCell s={r.schemes[id]} />
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="border-t border-line-soft pt-3">
                  <p className="m-0 mb-2 text-xs text-muted">Circular economy</p>
                  <CircularCell r={r} />
                </div>
                <div className="border-t border-line-soft pt-3">
                  <p className="m-0 mb-1 text-xs text-muted">Requirements</p>
                  <RequirementsCell r={r} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
