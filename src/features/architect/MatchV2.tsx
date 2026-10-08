// The architect's match schedule (brief/09-V1-PRODUCT.md sections 1.8 and 3.3): a greyed version 2 panel and nothing else.
// The working matcher is the client's (src/features/project/Match.tsx).
import { useId } from 'react'
import { useProjectParam, NotAvailable } from '../../app/params'
import { LABELS } from '../../domain/reference/labels'
import { Tag } from '../../components/ui'

export function MatchV2() {
  const { allowed } = useProjectParam()
  const uid = useId()
  if (!allowed) return <NotAvailable />
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5" data-testid="match-v2">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Project</p>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold leading-tight">
          Match schedule
          <Tag tone="grey" className="text-sm" data-testid="match-v2-tag">
            V2
          </Tag>
        </h1>
      </header>

      <section aria-disabled="true" className="relative overflow-hidden rounded-md border border-dashed border-rule bg-panel/60 px-6 py-8 sm:px-10 sm:py-10" data-testid="match-v2-panel">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgba(123,138,151,0.06)_14px_15px)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 text-mill-text">
          <ScheduleGlyph />
          <p className="m-0 max-w-xl text-base text-ink-soft" data-testid="match-v2-text">
            Upload a BIM model or a steel schedule and match it against the whole marketplace.
          </p>
          <p className="m-0 text-sm font-medium" data-testid="label-L35">
            {LABELS.L35}
          </p>
          <div className="flex flex-col items-start gap-1.5">
            <label htmlFor={`${uid}-upload`} className="inline-flex min-h-[44px] cursor-not-allowed items-center rounded-sm border border-rule bg-paper px-4 text-sm font-medium text-mill-text">
              Upload a model or schedule
            </label>
            <input id={`${uid}-upload`} type="file" disabled aria-disabled="true" className="sr-only" data-testid="match-v2-upload" />
          </div>
        </div>
      </section>
    </div>
  )
}

/** A quiet drawing of a schedule sheet beside a model block, in mill grey. Decorative. */
function ScheduleGlyph() {
  return (
    <svg width="96" height="56" viewBox="0 0 96 56" fill="none" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="40" height="54" rx="2" stroke="#7B8A97" strokeWidth="1.5" />
      <path d="M8 12h26M8 20h26M8 28h26M8 36h18M8 44h22" stroke="#7B8A97" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M56 18l18-9 18 9v22l-18 9-18-9z" stroke="#7B8A97" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M56 18l18 9 18-9M74 27v22" stroke="#7B8A97" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
