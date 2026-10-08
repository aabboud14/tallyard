// The owner's decision for one lot: private, shared with selected projects, or published; the ask and reserve
// (with suggested values); the date it is available; the disclosure score with this lot; and a live preview of
// exactly what buyers would see, built by the real public projection.
import { useMemo, useState } from 'react'
import { CalendarClock, Eye, Lightbulb, Lock, PoundSterling, ShieldAlert } from 'lucide-react'
import type { FamilyId, Visibility } from '../../domain/types'
import * as f from '../../domain/format'
import { act, selectors, useView } from '../../store'
import type { ListingDraft } from '../../store/selectors/owner'
import type { LotVisibilityChoice } from '../../store/actions/owner'
import { disclosureMeter } from '../../store/selectors/roles-views'
import type { ListingCard } from '../../store/selectors/common'
import { Button, Callout, cx, Field, FitPill, Input, RadioCards, SustainabilityBand, toast } from '../../ui'
import { MaterialPicture } from './photos'
import { VISIBILITY_HELP, VISIBILITY_ICON } from './labels'

const CHOICE_OF: Record<Visibility, LotVisibilityChoice> = { private: 'private', matched_only: 'shared', open: 'published' }

const OPTIONS = [
  { value: 'private', label: 'Private', description: VISIBILITY_HELP.private, icon: VISIBILITY_ICON.private },
  { value: 'shared', label: 'Shared with selected projects', description: VISIBILITY_HELP.matched_only, icon: VISIBILITY_ICON.matched_only },
  { value: 'published', label: 'Published to the marketplace', description: VISIBILITY_HELP.open, icon: VISIBILITY_ICON.open },
]

export type ListingEditorLot = {
  lotId: string
  family: FamilyId
  visibility: Visibility
  ask: number | null
  reserve: number | null
  availableFrom: string | null
  suggested: { ask: number; reserve: number }
  guide: number
  unitLabel: string
  reserved: boolean
}

function initialDraft(lot: ListingEditorLot): ListingDraft {
  return { visibility: CHOICE_OF[lot.visibility], ask: String(lot.ask ?? lot.suggested.ask), reserve: String(lot.reserve ?? lot.suggested.reserve), availableFrom: lot.availableFrom ?? '' }
}

export function ListingEditor({ lot, onSaved, compact = false }: { lot: ListingEditorLot; onSaved?: () => void; compact?: boolean }) {
  const [draft, setDraft] = useState<ListingDraft>(() => initialDraft(lot))
  const v = useView(selectors.listingDraftView, lot.lotId, draft)
  const meter = useMemo(() => (v ? disclosureMeter(v.disclosure) : null), [v])
  const [error, setError] = useState<string | null>(null)
  if (!v || !meter) return null
  const selling = draft.visibility !== 'private'
  const initial = initialDraft(lot)
  const dirty = draft.visibility !== initial.visibility || draft.availableFrom !== initial.availableFrom || (selling && (draft.ask !== initial.ask || draft.reserve !== initial.reserve))
  const set = (patch: Partial<ListingDraft>) => {
    setError(null)
    setDraft((d) => ({ ...d, ...patch }))
  }
  const save = () => {
    const r = act.setLotVisibility(lot.lotId, {
      visibility: draft.visibility,
      ask: selling ? Number(draft.ask) : undefined,
      reserve: selling ? Number(draft.reserve) : undefined,
      availableFrom: v.dateEditable && draft.availableFrom ? draft.availableFrom : undefined,
    })
    if (!r.ok) return setError(r.error)
    const word = draft.visibility === 'published' ? 'Published to the marketplace' : draft.visibility === 'shared' ? 'Shared with selected projects' : 'Saved as private'
    toast.success(word, { action: { label: 'Undo', onClick: r.undo } })
    onSaved?.()
  }

  if (lot.reserved) {
    return (
      <Callout tone="brand" icon={Lock} title="Reserved by a buyer">
        Its visibility, prices and date are fixed while the reservation stands. See Requests for the buyer's details.
      </Callout>
    )
  }

  return (
    <div className="flex flex-col gap-5" data-testid="listing-editor">
      <RadioCards aria-label="Visibility" value={draft.visibility} onValueChange={(x) => set({ visibility: x as LotVisibilityChoice })} options={OPTIONS} />

      {selling ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Ask ${lot.unitLabel}`}>
              <Input inputMode="decimal" icon={PoundSterling} value={draft.ask} onChange={(e) => set({ ask: e.target.value })} data-testid="listing-ask" />
            </Field>
            <Field label={`Reserve ${lot.unitLabel}`}>
              <Input inputMode="decimal" icon={PoundSterling} value={draft.reserve} onChange={(e) => set({ reserve: e.target.value })} data-testid="listing-reserve" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-subtle/70 px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <Lightbulb aria-hidden="true" className="size-3.5 text-faint" />
              Suggested: ask {f.priceOnly(lot.suggested.ask, lot.family)}, reserve {f.priceOnly(lot.suggested.reserve, lot.family)}. Guide {f.unitPrice(lot.guide, lot.family)}.
            </span>
            <button type="button" className="rounded-sm font-medium text-brand-700 hover:underline max-sm:min-h-11" onClick={() => set({ ask: String(lot.suggested.ask), reserve: String(lot.suggested.reserve) })} data-testid="use-suggested">
              Use suggested
            </button>
          </div>
          <p className="m-0 text-xs text-muted">Buyers never see your ask or reserve, only the guide price range.</p>
        </div>
      ) : null}

      <Field label="Available from" hint={v.dateEditable ? 'Buyers see it as a quarter or a month, as set in your disclosure settings.' : 'The date can change only while the lot is private.'}>
        <Input type="date" value={draft.availableFrom} disabled={!v.dateEditable} onChange={(e) => set({ availableFrom: e.target.value })} icon={CalendarClock} data-testid="listing-date" />
      </Field>

      {selling ? (
        <div className={cx('grid gap-4', compact ? '' : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
          <DisclosureBox meter={meter} inferences={v.disclosure.inferences} blocked={v.blocked} />
          <PreviewCard card={v.preview} shared={draft.visibility === 'shared'} />
        </div>
      ) : null}

      {error || (v.problem && !v.canSubmit) ? (
        <p role="alert" className="m-0 flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error ?? v.problem}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {dirty ? (
          <Button variant="ghost" onClick={() => setDraft(initial)}>
            Discard changes
          </Button>
        ) : null}
        <Button variant="primary" disabled={!dirty || !v.canSubmit} onClick={save} data-testid="listing-save">
          {draft.visibility === 'published' && lot.visibility !== 'open' ? 'Publish' : draft.visibility === 'shared' && lot.visibility !== 'matched_only' ? 'Share' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

const BAND_FILL = { Low: 'fill-brand-500', Medium: 'fill-[#d08a2c]', High: 'fill-danger' } as const

export function DisclosureBox({ meter, inferences, blocked, title = 'Disclosure with this lot' }: { meter: ReturnType<typeof disclosureMeter>; inferences: string[]; blocked: boolean; title?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-4" data-testid="disclosure">
      <div className="flex items-baseline justify-between gap-2">
        <p className="m-0 text-sm font-medium text-ink">{title}</p>
        <p className="m-0 text-sm">
          <span className="font-semibold tabular-nums text-ink">{meter.score}</span>
          <span className="text-muted"> of {meter.max}, </span>
          <span className={cx('font-medium', meter.band === 'High' ? 'text-danger' : meter.band === 'Medium' ? 'text-warning' : 'text-brand-700')}>{meter.band}</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${meter.max} 6`} preserveAspectRatio="none" className="h-1.5 w-full overflow-hidden rounded-full" role="img" aria-label={`Disclosure score ${meter.score} of ${meter.max}, ${meter.band}`}>
        <rect x="0" y="0" width={meter.max} height="6" className="fill-subtle" />
        <rect x="0" y="0" width={Math.min(meter.score, meter.max)} height="6" className={BAND_FILL[meter.band]} />
        <rect x={meter.mediumFrom} y="0" width="0.4" height="6" className="fill-surface" />
        <rect x={meter.highFrom} y="0" width="0.4" height="6" className="fill-surface" />
      </svg>
      <dl className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {meter.parts.map((p) => (
          <div key={p.label} className="flex gap-1">
            <dt>{p.label}</dt>
            <dd className={cx('m-0 font-medium tabular-nums', p.points > 0 ? 'text-ink' : 'text-faint')}>{p.points}</dd>
          </div>
        ))}
      </dl>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-ink-soft">
        {inferences.map((x) => (
          <li key={x} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-faint" />
            {x}
          </li>
        ))}
      </ul>
      {blocked ? <p className="m-0 text-sm font-medium text-danger">Publishing is blocked at a High score. Share it with selected projects instead, or reduce what is disclosed.</p> : null}
    </div>
  )
}

export function PreviewCard({ card, shared }: { card: ListingCard; shared: boolean }) {
  return (
    <div className="flex flex-col gap-2" data-testid="buyer-preview">
      <p className="m-0 flex items-center gap-1.5 text-sm font-medium text-ink">
        <Eye aria-hidden="true" className="size-3.5 text-muted" />
        What buyers see
      </p>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="relative">
          <MaterialPicture spec={card.listing.spec} publicId={card.publicId} photo={card.photo} aspect="16/10" />
          {shared ? <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-info-strong shadow-sm">Shared in confidence</span> : null}
          {card.fit ? <FitPill fit={card.fit.fit} size="sm" className="absolute bottom-2 left-2" /> : null}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <p className="m-0 text-xs text-muted">
            {card.typologyLabel} · {card.familyLabel}
          </p>
          <p className="m-0 text-base font-semibold text-ink">{card.title}</p>
          <p className="m-0 text-sm text-ink-soft">
            {card.quantityText} · {card.availabilityText}
          </p>
          <p className="m-0 text-sm text-ink-soft">
            {card.locationLabel} · {card.listing.sellerType === 'Asset owner' ? 'Listed by an asset owner' : card.listing.sellerType}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <SustainabilityBand band={card.band} size="sm" />
            <span className="text-sm tabular-nums text-ink-soft">{card.priceRange}</span>
          </div>
        </div>
      </div>
      <p className="m-0 text-xs text-muted">Built from the public record only: no building name, address, tag or photo you keep private.</p>
    </div>
  )
}
