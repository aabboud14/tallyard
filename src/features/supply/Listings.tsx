// Listings and visibility (brief/09-V1-PRODUCT.md sections 3.2, 13.2 to 13.4): the owner's three visibility options,
// the building's disclosure settings and score, the lot's available-from date while it is private, the private record
// beside the market preview, and the blind projects the owner shares with. Every figure comes from a selector.
import { useState } from 'react'
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { buildingItems, itemView, type ItemView } from '../../store/selectors'
import { clientName, ownerVisibility, publishDefaults, publishView, sellerOrgId, sharingView, supplyAccess, type PublishChoice, type PublishDraft } from '../../store/views/supply'
import { useBuildingParam, NotAvailable } from '../../app/params'
import { Panel, Table, Num, Tag, Button, Dl, Private, Note, Field, selectClass, inputClass, cx } from '../../components/ui'
import { ListingView } from '../market/ListingView'
import { PhotoThumb, HoldingLine } from './ItemDetail'
import { VisibilityMark } from './Inventory'
import { LABELS, OWNER_VISIBILITY_LABELS } from '../../domain/reference/labels'
import { FAMILIES } from '../../domain/reference/families'
import type { SourceBuilding } from '../../domain/types'
import * as f from '../../domain/format'
import { formatDateShort } from '../../domain/dates'

const CHOICE_HINTS: Record<PublishChoice, string> = {
  private: 'Only you and your surveyor see this lot. Nothing reaches the marketplace.',
  matched_only: 'Only the projects you share with can see it, after their team accepts the confidentiality terms.',
  open: 'Anyone browsing the marketplace can see it.',
}

export function Listings() {
  const world = useWorld()
  const personaId = useStore((s) => s.personaId)
  const { id, record: building } = useBuildingParam()
  const ownerOrgId = sellerOrgId(world, personaId)
  if (!building || !ownerOrgId || !supplyAccess(world, personaId, id).listings) return <NotAvailable />
  return <ListingsBody key={building.id} building={building} ownerOrgId={ownerOrgId} />
}

/** The form draft belongs to one lot at one visibility; selecting another lot, or publishing, starts a fresh draft. */
type Draft = PublishDraft & { key: string }

function draftKey(v: ItemView): string {
  return `${v.lot.id}:${v.lot.visibility}`
}

function ListingsBody({ building, ownerOrgId }: { building: SourceBuilding; ownerOrgId: string }) {
  const world = useWorld()
  const s = useStore()
  const items = buildingItems(world, building.id)
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? '')
  const selected = world.items[selectedId] ? itemView(world, selectedId) : null
  const [stored, setStored] = useState<Draft | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const sharing = sharingView(world, ownerOrgId)

  if (!selected) {
    return (
      <div className="flex flex-col gap-5">
        <Header building={building} client={clientName(world, building)} />
        <Note>No lots yet. Capture an item to list it here.</Note>
      </div>
    )
  }

  const key = draftKey(selected)
  const draft: PublishDraft = stored && stored.key === key ? stored : publishDefaults(selected)
  const edit = (patch: Partial<PublishDraft>) => setStored({ ...draft, ...patch, key })
  const view = publishView(world, building.id, selected, draft)
  const { disclosure, state } = view
  const fam = FAMILIES[selected.item.family]
  const select = (itemId: string) => {
    setSelectedId(itemId)
    setDateError(null)
  }
  const setDate = () => setDateError(s.setLotAvailability(selected.lot.id, draft.date))
  const toggleShare = (projectId: string, approved: boolean) => setShareError(s.setOwnerProjectApproval(projectId, approved))

  return (
    <div className="flex flex-col gap-5">
      <Header building={building} client={clientName(world, building)} />
      {/* Below 1280 px the two columns become one, ordered lot, visibility, disclosure, preview, record, sharing. */}
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
          <Panel title="Lots" className="order-1">
            <Table data-testid="lots-table">
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Visibility</th>
                  <th>Available from</th>
                  <th>Public ID</th>
                  <th className="text-right">Ask</th>
                  <th className="text-right">Reserve</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const v = itemView(world, item.id)
                  const active = item.id === selectedId
                  return (
                    <tr key={item.id} className={active ? 'bg-steel-tint' : 'cursor-pointer hover:bg-rule-soft'} onClick={() => select(item.id)} aria-selected={active} data-testid={`lot-row-${item.tag}`}>
                      <td className={cx('min-w-[10rem] border-l-2', active ? 'border-l-steel' : 'border-l-transparent')}>
                        <button type="button" className="flex min-h-[44px] flex-col items-start justify-center text-left" onClick={() => select(item.id)} aria-pressed={active} data-testid={`select-lot-${item.tag}`}>
                          <span className="whitespace-nowrap font-display text-base leading-tight text-steel">{item.tag}</span>
                          <span className="text-xs leading-snug text-ink-soft">{v.listing.title}</span>
                        </button>
                      </td>
                      <td>
                        <VisibilityMark visibility={v.lot.visibility} testId={`lot-visibility-${item.tag}`} />
                      </td>
                      <td className="whitespace-nowrap" data-testid={`lot-available-${item.tag}`}>
                        {v.lot.availableFrom ? formatDateShort(v.lot.availableFrom) : 'In stock'}
                      </td>
                      <td className="whitespace-nowrap" data-testid={`lot-public-id-${item.tag}`}>
                        {v.lot.publicId}
                      </td>
                      <Num className="whitespace-nowrap">{v.lot.askPerUnit !== null ? f.priceOnly(v.lot.askPerUnit, item.family) : ''}</Num>
                      <Num className="whitespace-nowrap">{v.lot.reservePerUnit !== null ? f.priceOnly(v.lot.reservePerUnit, item.family) : ''}</Num>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </Panel>

          <Panel
            className="order-3"
            title="Building disclosure"
            actions={
              <Button onClick={() => s.resetDisclosureDefaults(building.id)} data-testid="reset-defaults">
                Reset to defaults
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Location shown as" htmlFor="location-level">
                <select id="location-level" className={selectClass} value={building.locationLevel} onChange={(e) => s.setDisclosure(building.id, { locationLevel: e.target.value as 'region' | 'local_authority' })} data-testid="location-level">
                  <option value="region">Region</option>
                  <option value="local_authority">Local authority</option>
                </select>
              </Field>
              <Field label="Timing shown as" htmlFor="timing-level">
                <select id="timing-level" className={selectClass} value={building.timingLevel} onChange={(e) => s.setDisclosure(building.id, { timingLevel: e.target.value as 'quarter' | 'month' })} data-testid="timing-level">
                  <option value="quarter">Quarter</option>
                  <option value="month">Month</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="font-display text-4xl leading-none" data-testid="disclosure-score">
                {disclosure.score}
              </span>
              <Tag tone={disclosure.band === 'Low' ? 'teal' : disclosure.band === 'Medium' ? 'survey' : 'oxide'} data-testid="disclosure-band">
                <span data-testid="disclosure-band-text">{disclosure.band}</span>
              </Tag>
              <span className="text-sm text-mill-text">Disclosure score with the chosen visibility for {selected.item.tag}</span>
            </div>
            <ul className="mt-3 list-disc pl-5 text-sm" data-testid="disclosure-inferences">
              {disclosure.inferences.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            {disclosure.band === 'Medium' ? (
              <Note tone="survey" testId="label-L34" className="mt-3">
                {LABELS.L34}
              </Note>
            ) : null}
            {state.blocked ? (
              <Note tone="oxide" testId="publish-blocked" className="mt-3">
                Publishing is blocked at this disclosure level.
              </Note>
            ) : null}
            <p className="m-0 mt-3 text-xs text-mill-text" data-testid="label-L9">
              {LABELS.L9}
            </p>
          </Panel>

          <Panel title="Shared privately with" className="order-6" data-testid="sharing-panel">
            <p className="m-0 text-sm text-ink-soft">
              Lots marked as shared are offered, in confidence, only to the projects you share with here. Each project is shown blind: organisation type, project type, region and the quarter it needs materials.
            </p>
            <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-rule-soft border-y border-rule-soft p-0" data-testid="approved-projects">
              {sharing.rows.map((r) => (
                <li key={r.projectId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5" data-testid={`share-row-${r.projectId}`}>
                  <span className="min-w-0 flex-1 text-sm font-medium" data-testid={`share-text-${r.projectId}`}>
                    {r.text}
                  </span>
                  <Tag tone={r.approved ? 'teal' : 'grey'} data-testid={`share-status-${r.projectId}`}>
                    {r.approved ? 'Shared' : 'Not shared'}
                  </Tag>
                  <Button size="lg" variant={r.approved ? 'danger' : 'secondary'} className="min-w-[6.5rem]" onClick={() => toggleShare(r.projectId, !r.approved)} aria-pressed={r.approved} data-testid={`share-toggle-${r.projectId}`}>
                    {r.approved ? 'Revoke' : 'Share'}
                  </Button>
                </li>
              ))}
            </ul>
            {shareError ? (
              <Note tone="oxide" className="mt-3">
                {shareError}
              </Note>
            ) : null}
            <p className="m-0 mt-3 text-xs text-mill-text" data-testid="sharing-summary">
              {sharing.sharedLotCount} {sharing.sharedLotCount === 1 ? 'lot' : 'lots'} from your buildings {sharing.sharedLotCount === 1 ? 'is' : 'are'} shared privately, with {sharing.approvedCount} {sharing.approvedCount === 1 ? 'project' : 'projects'}. Revoking takes effect at once: the project no longer sees your shared lots, and any already on its wish list show as no longer shared.
            </p>
          </Panel>
        </div>

        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
          <Panel title={`Visibility, ${selected.item.tag}`} className="order-2" data-testid="publish-panel">
            {state.done ? (
              <Note tone="teal" testId="publish-done">
                {ownerVisibility(selected.lot.visibility)}. Public ID {selected.lot.publicId}.
              </Note>
            ) : (
              <div className="flex flex-col gap-4">
                <Field label="Visibility" htmlFor="publish-visibility" hint={<span data-testid="publish-visibility-hint">{CHOICE_HINTS[draft.visibility]}</span>}>
                  <select id="publish-visibility" className={selectClass} value={draft.visibility} onChange={(e) => edit({ visibility: e.target.value as PublishChoice })} data-testid="publish-visibility">
                    <option value="private">{OWNER_VISIBILITY_LABELS.private}</option>
                    <option value="matched_only">{OWNER_VISIBILITY_LABELS.matched_only}</option>
                    <option value="open">{OWNER_VISIBILITY_LABELS.open}</option>
                  </select>
                </Field>
                <Field label="Available from" htmlFor="lot-available-from" hint={selected.item.expectedAvailableFrom ? `The surveyor expected ${f.month(selected.item.expectedAvailableFrom)}. The market sees this date at the building's timing level.` : "The market sees this date at the building's timing level."}>
                  <div className="flex gap-2">
                    <input id="lot-available-from" type="date" className={cx(inputClass, 'min-w-0 flex-1')} value={draft.date} onChange={(e) => edit({ date: e.target.value })} data-testid="lot-available-from" />
                    <Button size="lg" disabled={!view.date.changed} onClick={setDate} data-testid="lot-available-from-save">
                      Set date
                    </Button>
                  </div>
                </Field>
                {dateError ? (
                  <Note tone="oxide" testId="lot-available-from-error">
                    {dateError}
                  </Note>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={`Ask (${fam.pricingUnitLabel})`} htmlFor="publish-ask" hint={`Whole steps of ${f.priceOnly(fam.tick, selected.item.family)}`}>
                    <input id="publish-ask" className={inputClass} inputMode="decimal" value={draft.ask} onChange={(e) => edit({ ask: e.target.value })} data-testid="publish-ask" />
                  </Field>
                  <Field label={`Reserve (${fam.pricingUnitLabel})`} htmlFor="publish-reserve" hint="Not above the ask">
                    <input id="publish-reserve" className={inputClass} inputMode="decimal" value={draft.reserve} onChange={(e) => edit({ reserve: e.target.value })} data-testid="publish-reserve" />
                  </Field>
                </div>
                {view.prices.problem && !state.keepPrivate ? (
                  <p className="m-0 text-sm text-oxide" data-testid="publish-price-problem">
                    {view.prices.problem}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="lg" className="text-panel" disabled={!state.canPublish} onClick={() => s.publishLot(selected.lot.id, { visibility: draft.visibility === 'open' ? 'open' : 'matched_only', ask: view.prices.ask, reserve: view.prices.reserve })} data-testid="publish">
                    {draft.visibility === 'matched_only' ? 'Share privately' : 'Publish'}
                  </Button>
                  {state.keepPrivate ? <span className="text-sm text-mill-text">The lot stays private. Choose how to share it to list it.</span> : null}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="As the market sees it" className="order-4">
            {state.keepPrivate ? (
              <Note tone="grey" className="mb-3">
                This lot stays private. The preview shows what the market would see if it were published.
              </Note>
            ) : null}
            <ListingView listing={view.preview} testPrefix="preview" compact />
          </Panel>

          <Panel title={`Private record, ${selected.item.tag}`} className="order-5">
            <Private>
              <Dl
                rows={[
                  { label: 'Title', value: selected.listing.title },
                  { label: 'Location in building', value: selected.item.location || 'not recorded' },
                  { label: 'Expected by the surveyor', value: selected.item.expectedAvailableFrom ? f.month(selected.item.expectedAvailableFrom) : 'Not set' },
                  { label: 'Available from', value: selected.lot.availableFrom ? f.date(selected.lot.availableFrom) : 'In stock', testId: 'selected-available-from' },
                  { label: 'Visibility', value: ownerVisibility(selected.lot.visibility), testId: 'selected-visibility' },
                  { label: 'Public ID', value: selected.lot.publicId, testId: 'selected-public-id' },
                  ...(selected.lot.askPerUnit !== null ? [{ label: 'Ask', value: f.unitPrice(selected.lot.askPerUnit, selected.item.family), testId: 'selected-ask' }] : []),
                  ...(selected.lot.reservePerUnit !== null ? [{ label: 'Reserve', value: f.unitPrice(selected.lot.reservePerUnit, selected.item.family), testId: 'selected-reserve' }] : []),
                ]}
              />
              {selected.holding ? (
                <p className="m-0 mt-3 text-sm">
                  Holding view via {selected.holding.facility.name} at the guide price: net {f.money(selected.holding.net)}, gain over scrap {f.money(selected.holding.upliftVsScrap)}. <HoldingLine v={selected} />
                </p>
              ) : null}
              <div className="mt-3">
                <h3 className="mb-1 text-sm font-semibold">Photos</h3>
                {selected.item.photos.length ? (
                  <div className="flex flex-wrap gap-3">
                    {selected.item.photos.map((p) => (
                      <PhotoThumb key={p.id} photo={p} item={selected.item} canToggle onToggle={(pub) => s.setPhotoPublic(selected.item.id, p.id, pub)} />
                    ))}
                  </div>
                ) : (
                  <p className="m-0 text-sm text-mill-text">No photos.</p>
                )}
              </div>
            </Private>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Header({ building, client }: { building: SourceBuilding; client: string }) {
  return (
    <header className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Listings and visibility</p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight">{building.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Client <span className="font-medium text-ink">{client}</span>. Disclosure settings apply to every lot from the building and take effect at once.
      </p>
    </header>
  )
}
