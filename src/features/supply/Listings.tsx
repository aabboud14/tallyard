// Listings and privacy: disclosure settings, lots table, private record beside the market preview, publish control.
import { useEffect, useState } from 'react'
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { buildingItems, itemView, disclosureFor, previewListing, approvedProjectsBlind } from '../../store/selectors'
import { TIVERNE_ID, ORG_IDS } from '../../domain/seed/world'
import { PageTitle, Panel, Table, Num, Tag, Button, Dl, Private, Note, Field, selectClass, inputClass } from '../../components/ui'
import { ListingView } from '../market/ListingView'
import { PhotoThumb, HoldingLine } from './ItemDetail'
import { LABELS, VISIBILITY_LABELS } from '../../domain/reference/labels'
import { blindBuyerText } from '../../domain/privacy/blindBuyer'
import { FAMILIES } from '../../domain/reference/families'
import * as f from '../../domain/format'
import { ticksOf } from '../../domain/money'

export function Listings() {
  const world = useWorld()
  const s = useStore()
  const building = world.buildings[TIVERNE_ID]
  const items = buildingItems(world, TIVERNE_ID)
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? '')
  const selected = world.items[selectedId] ? itemView(world, selectedId) : null
  const [visibility, setVisibility] = useState<'open' | 'matched_only'>('matched_only')
  const [ask, setAsk] = useState<string>('')
  const [reserve, setReserve] = useState<string>('')
  useEffect(() => {
    if (!selected) return
    const fam = FAMILIES[selected.item.family]
    const d = fam.tick >= 1 ? 0 : 2
    setAsk((selected.lot.askPerUnit ?? selected.sellerMandate.ask).toFixed(d))
    setReserve((selected.lot.reservePerUnit ?? selected.sellerMandate.reserve).toFixed(d))
    setVisibility(selected.lot.visibility === 'open' ? 'open' : 'matched_only')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.lot.visibility])

  if (!selected) return <PageTitle title="Listings and privacy" />
  const fam = FAMILIES[selected.item.family]
  const pending = { lotId: selected.lot.id, visibility }
  const disclosure = disclosureFor(world, TIVERNE_ID, pending)
  const preview = previewListing(world, selected.lot.id, visibility)
  const askN = Number(ask)
  const reserveN = Number(reserve)
  const tick = fam.tick
  const pricesValid = Number.isFinite(askN) && Number.isFinite(reserveN) && askN > 0 && reserveN > 0 && Math.abs(askN / tick - Math.round(askN / tick)) < 1e-9 && Math.abs(reserveN / tick - Math.round(reserveN / tick)) < 1e-9 && ticksOf(reserveN, tick) <= ticksOf(askN, tick)
  const blocked = visibility === 'open' && disclosure.blocksPublishing
  const alreadyPublished = selected.lot.visibility !== 'private'
  const canPublish = pricesValid && !blocked && !alreadyPublished
  const blindBuyers = approvedProjectsBlind(world, ORG_IDS.ostlea)

  return (
    <>
      <PageTitle title={`Listings and privacy, ${building.name}`} sub="Disclosure settings apply to every lot from the building and take effect at once." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Building disclosure" actions={<Button onClick={() => s.resetDisclosureDefaults(TIVERNE_ID)} data-testid="reset-defaults">Reset to defaults</Button>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Location shown as" htmlFor="location-level">
                <select id="location-level" className={selectClass} value={building.locationLevel} onChange={(e) => s.setDisclosure(TIVERNE_ID, { locationLevel: e.target.value as 'region' | 'local_authority' })} data-testid="location-level">
                  <option value="region">Region</option>
                  <option value="local_authority">Local authority</option>
                </select>
              </Field>
              <Field label="Timing shown as" htmlFor="timing-level">
                <select id="timing-level" className={selectClass} value={building.timingLevel} onChange={(e) => s.setDisclosure(TIVERNE_ID, { timingLevel: e.target.value as 'quarter' | 'month' })} data-testid="timing-level">
                  <option value="quarter">Quarter</option>
                  <option value="month">Month</option>
                </select>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm text-mill-text">Disclosure score with the chosen visibility</span>
              <span className="font-display text-3xl" data-testid="disclosure-score">
                {disclosure.score}
              </span>
              <Tag tone={disclosure.band === 'Low' ? 'teal' : disclosure.band === 'Medium' ? 'survey' : 'oxide'} data-testid="disclosure-band">
                <span data-testid="disclosure-band-text">{disclosure.band}</span>
              </Tag>
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm" data-testid="disclosure-inferences">
              {disclosure.inferences.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            {disclosure.band === 'Medium' ? (
              <Note tone="survey" testId="label-L34" className="mt-2">
                {LABELS.L34}
              </Note>
            ) : null}
            {blocked ? (
              <Note tone="oxide" testId="publish-blocked" className="mt-2">
                Publishing is blocked at this disclosure level.
              </Note>
            ) : null}
            <p className="mt-2 text-xs text-mill-text" data-testid="label-L9">
              {LABELS.L9}
            </p>
          </Panel>
          <Panel title="Lots">
            <Table data-testid="lots-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Title</th>
                  <th>Visibility</th>
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
                    <tr key={item.id} className={active ? 'bg-steel-tint' : 'cursor-pointer hover:bg-rule-soft'} onClick={() => setSelectedId(item.id)} data-testid={`lot-row-${item.tag}`}>
                      <td>
                        <button type="button" className="font-display text-base text-steel" onClick={() => setSelectedId(item.id)} data-testid={`select-lot-${item.tag}`}>
                          {item.tag}
                        </button>
                      </td>
                      <td>{v.listing.title}</td>
                      <td data-testid={`lot-visibility-${item.tag}`}>
                        <Tag tone={v.lot.visibility === 'open' ? 'teal' : v.lot.visibility === 'matched_only' ? 'steel' : 'oxide'}>{VISIBILITY_LABELS[v.lot.visibility]}</Tag>
                      </td>
                      <td className="whitespace-nowrap" data-testid={`lot-public-id-${item.tag}`}>{v.lot.publicId}</td>
                      <Num>{v.lot.askPerUnit !== null ? f.priceOnly(v.lot.askPerUnit, item.family) : ''}</Num>
                      <Num>{v.lot.reservePerUnit !== null ? f.priceOnly(v.lot.reservePerUnit, item.family) : ''}</Num>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </Panel>
          <Panel title="Projects approved for private matching">
            <ul className="list-disc pl-5 text-sm" data-testid="approved-projects">
              {blindBuyers.map((b) => (
                <li key={blindBuyerText(b)}>{blindBuyerText(b)}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-mill-text">Shown as blind descriptions. Approving further projects is not part of this prototype.</p>
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel title={`Private record, ${selected.item.tag}`}>
            <Private>
              <Dl
                rows={[
                  { label: 'Title', value: selected.listing.title },
                  { label: 'Location in building', value: selected.item.location },
                  { label: 'Available from', value: selected.lot.availableFrom ? f.date(selected.lot.availableFrom) : 'In stock' },
                  { label: 'Visibility', value: VISIBILITY_LABELS[selected.lot.visibility], testId: 'selected-visibility' },
                  { label: 'Public ID', value: selected.lot.publicId, testId: 'selected-public-id' },
                  ...(selected.lot.askPerUnit !== null ? [{ label: 'Ask', value: f.unitPrice(selected.lot.askPerUnit, selected.item.family), testId: 'selected-ask' }] : []),
                  ...(selected.lot.reservePerUnit !== null ? [{ label: 'Reserve', value: f.unitPrice(selected.lot.reservePerUnit, selected.item.family), testId: 'selected-reserve' }] : []),
                ]}
              />
              {selected.holding ? (
                <p className="mt-2 text-sm">
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
                  <p className="text-sm text-mill-text">No photos.</p>
                )}
              </div>
            </Private>
          </Panel>
          <Panel title="Publish">
            {alreadyPublished ? (
              <Note tone="teal" testId="publish-done">
                Published as {VISIBILITY_LABELS[selected.lot.visibility]}, public ID {selected.lot.publicId}.
              </Note>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Visibility" htmlFor="publish-visibility">
                  <select id="publish-visibility" className={selectClass} value={visibility} onChange={(e) => setVisibility(e.target.value as 'open' | 'matched_only')} data-testid="publish-visibility">
                    <option value="matched_only">{VISIBILITY_LABELS.matched_only}</option>
                    <option value="open">{VISIBILITY_LABELS.open}</option>
                  </select>
                </Field>
                <Field label={`Ask (${fam.pricingUnitLabel})`} htmlFor="publish-ask" hint={`Whole ticks of ${f.priceOnly(tick, selected.item.family)}`}>
                  <input id="publish-ask" className={inputClass} inputMode="decimal" value={ask} onChange={(e) => setAsk(e.target.value)} data-testid="publish-ask" />
                </Field>
                <Field label={`Reserve (${fam.pricingUnitLabel})`} htmlFor="publish-reserve" hint="Not above the ask">
                  <input id="publish-reserve" className={inputClass} inputMode="decimal" value={reserve} onChange={(e) => setReserve(e.target.value)} data-testid="publish-reserve" />
                </Field>
                <div className="sm:col-span-3">
                  <Button variant="primary" size="lg" disabled={!canPublish} onClick={() => s.publishLot(selected.lot.id, { visibility, ask: askN, reserve: reserveN })} data-testid="publish">
                    Publish
                  </Button>
                </div>
              </div>
            )}
          </Panel>
          <Panel title="As the market sees it">
            <ListingView listing={preview} testPrefix="preview" compact />
          </Panel>
        </div>
      </div>
    </>
  )
}
