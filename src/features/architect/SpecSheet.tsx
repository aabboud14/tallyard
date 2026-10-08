// The architect's specification schedule (brief/09-V1-PRODUCT.md sections 3.3, 5.6 and 13.14): a print-ready page of
// specSheetView, approved items by default, with a draft from the items awaiting approval. Print uses print.css (A4);
// the spreadsheet comes from specExport.ts. Public listing fields and the project line only.
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../../store/store'
import { useProjectParam, NotAvailable } from '../../app/params'
import { specSheetView, wishlistView } from '../../store/v1selectors'
import { blockSections, caveatLabelId, specGroups, SPEC_HEADING_LABELS, type SpecGroup, type SpecWhich } from '../../store/views/architectProject'
import type { SpecBlock, WishStatus } from '../../domain/v1types'
import { DEMO_TODAY } from '../../domain/constants'
import { ERROR_STATE, WISH_STATUS_LABELS } from '../../domain/reference/labels'
import { formatDate } from '../../domain/dates'
import { Button, EmptyState, Tag, cx } from '../../components/ui'
import { ChipGroup, Download } from '../../components/v1'
import { downloadWorkbook } from '../compliance/exports'
import { buildSpecWorkbook, specFileName } from './specExport'
import './print.css'

const STATUS_TONE: Record<WishStatus, 'grey' | 'steel' | 'teal' | 'oxide'> = { pending: 'grey', sent: 'steel', approved: 'teal', declined: 'oxide' }

export function SpecSheet() {
  const { id, allowed } = useProjectParam()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const [which, setWhich] = useState<SpecWhich>('approved')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sheet = useMemo(() => (allowed ? specSheetView(world, personaId, id, which) : null), [world, personaId, id, which, allowed])
  const header = useMemo(() => (allowed ? wishlistView(world, personaId, id) : null), [world, personaId, id, allowed])
  const draftSheet = useMemo(() => (allowed ? specSheetView(world, personaId, id, 'draft') : null), [world, personaId, id, allowed])

  if (!sheet || !header) return <NotAvailable />
  const groups = specGroups(sheet, which)
  const shown = which === 'approved' ? groups : groups.filter((g) => g.blocks.length > 0)
  const empty = sheet.blocks.length === 0
  const hasDraft = (draftSheet?.blocks.length ?? 0) > 0

  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      downloadWorkbook(await buildSpecWorkbook(sheet, which), specFileName(header.project.name))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="spec-sheet mx-auto flex max-w-[1080px] flex-col gap-5" data-testid="spec-sheet" data-which={which}>
      <div className="print-hide flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Spec sheet</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight">{header.project.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" className="gap-2" onClick={() => window.print()} disabled={empty} data-testid="spec-print">
            Print
          </Button>
          <Button variant="primary" size="lg" className="gap-2 text-panel" onClick={download} disabled={empty || busy} data-testid="spec-download">
            <Download size={18} />
            {busy ? 'Preparing spreadsheet' : 'Download spreadsheet'}
          </Button>
        </div>
      </div>

      <div className="print-hide flex flex-wrap items-center justify-between gap-3">
        <ChipGroup<SpecWhich>
          className="[&>[aria-pressed=true]]:text-panel"
          ariaLabel="Which items to compile"
          testId="spec-toggle"
          value={which}
          onChange={setWhich}
          options={[
            { value: 'approved', label: 'Approved' },
            { value: 'draft', label: 'Draft from pending' },
          ]}
        />
        <p className="m-0 text-sm text-mill-text">
          {which === 'approved' ? 'Items the client has approved.' : 'Approved items, then the items sent to the client and the items still pending. Declined items are left out.'}
        </p>
      </div>

      {error ? (
        <details className="print-hide rounded-sm border-l-2 border-oxide bg-oxide-tint px-3 py-2 text-sm" data-testid="spec-error">
          <summary>{ERROR_STATE}</summary>
          <p className="mt-1">{error}</p>
        </details>
      ) : null}

      <article className="spec-paper rounded-md border border-rule-soft bg-panel px-5 py-6 shadow-[0_1px_0_rgba(20,32,43,0.04),0_18px_40px_-28px_rgba(20,32,43,0.35)] sm:px-10 sm:py-9" data-testid="spec-paper">
        <header className="spec-head flex flex-col gap-3 border-b-2 border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="m-0 text-xl font-semibold leading-tight" data-testid="spec-title">
              {sheet.title}
            </h2>
            <p className="m-0 mt-1 text-sm text-ink-soft" data-testid="spec-project-line">
              {sheet.projectLine}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 text-xs text-mill-text sm:items-end">
            {which === 'draft' ? (
              <Tag tone="survey" data-testid="spec-draft-tag">
                Draft
              </Tag>
            ) : null}
            <span>Compiled {formatDate(DEMO_TODAY)}</span>
            <span>
              {sheet.blocks.length} {sheet.blocks.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </header>

        <ul className="spec-caveats m-0 mt-4 flex list-none flex-col gap-1.5 p-0" data-testid="spec-caveats">
          {sheet.caveats.map((c) => {
            const lid = caveatLabelId(c)
            return (
              <li key={c} className="border-l-2 border-survey bg-survey-tint/60 px-3 py-1.5 text-sm text-ink" data-testid={lid ? `label-${lid}` : undefined}>
                {c}
              </li>
            )
          })}
        </ul>

        {empty ? (
          <div className="mt-6">
            <EmptyState
              hint={
                which === 'approved'
                  ? hasDraft
                    ? 'Nothing approved yet. Switch to the draft to compile the items awaiting the client.'
                    : 'Save materials to this project, send them to the client, and the approved ones are compiled here.'
                  : 'Save materials to this project wish list to start a draft.'
              }
            />
            <div className="print-hide mt-3 flex flex-wrap gap-2">
              {which === 'approved' && hasDraft ? (
                <Button size="lg" onClick={() => setWhich('draft')} data-testid="spec-show-draft">
                  Show the draft
                </Button>
              ) : null}
              <Link to={`/projects/${header.project.id}/wishlist`} className="inline-flex min-h-[44px] items-center rounded-sm border border-rule bg-panel px-4 text-sm font-medium text-ink no-underline hover:bg-steel-tint">
                Open the wish list
              </Link>
            </div>
          </div>
        ) : (
          shown.map((g) => <GroupSection key={g.status} group={g} />)
        )}

        <p className="spec-foot m-0 mt-8 border-t border-rule-soft pt-3 text-xs text-mill-text">
          Public listing fields only. Seller, building and programme details are not part of this schedule.
        </p>
      </article>
    </div>
  )
}

function GroupSection({ group }: { group: SpecGroup }) {
  return (
    <section className="spec-group mt-8" data-testid={`spec-group-${group.status}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
        <h3 className="m-0 text-base font-semibold">
          {group.label} <span className="font-display text-lg font-normal tabular-nums text-mill-text">{group.blocks.length}</span>
        </h3>
        <p className="m-0 text-sm text-mill-text">{group.line}</p>
      </header>
      {group.blocks.length === 0 ? (
        <p className="m-0 mt-3 text-sm text-mill-text">Nothing approved yet.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {group.blocks.map((b, i) => (
            <SpecBlockView key={b.publicId} block={b} index={i + 1} />
          ))}
        </ol>
      )}
    </section>
  )
}

function SpecBlockView({ block, index }: { block: SpecBlock; index: number }) {
  return (
    <li className="spec-block border-b border-rule-soft pb-1 pt-5 last:border-b-0" data-testid={`spec-block-${block.publicId}`}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-lg tabular-nums text-mill-text">{String(index).padStart(2, '0')}</span>
        <h4 className="m-0 font-display text-xl leading-tight tracking-wide">{block.title}</h4>
        <span className="text-xs font-medium tabular-nums text-mill-text" data-testid={`spec-${block.publicId}-public-id`}>
          {block.publicId}
        </span>
        <Tag tone={STATUS_TONE[block.status]} className="ml-auto">
          {WISH_STATUS_LABELS[block.status]}
        </Tag>
      </div>
      <div className="spec-sections gap-x-10 sm:columns-2 lg:columns-3">
        {blockSections(block, SPEC_HEADING_LABELS).map((s) => (
          <div key={s.section} className="mb-4 min-w-0 break-inside-avoid">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-mill-text">{s.section}</div>
            <dl className="m-0 grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
              {s.rows.map((r) => (
                <div key={r.label} className="contents">
                  <dt className="text-ink-soft">{r.label}</dt>
                  <dd className={cx('m-0 tabular-nums text-ink')} data-testid={`spec-${block.publicId}-${r.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </li>
  )
}
