import { Link, useParams } from 'react-router'
import { useWorld, usePersona, usePhotoSrc } from '../shared/hooks'
import { itemView, type ItemView } from '../../store/selectors'
import { useBuildingParam } from '../../app/params'
import { roleFor } from '../../app/nav'
import { PageTitle, Panel, Dl, Private, Tag, EmptyState, Note } from '../../components/ui'
import { ItemDrawing } from '../../components/drawings/ItemDrawing'
import { HowCalculated } from '../../components/HowCalculated'
import { ListingView } from '../market/ListingView'
import { TEST_STATUS_LABELS, VISIBILITY_LABELS, GRADE_UNKNOWN } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { carbonSections, guideSections } from '../shared/calc'
import type { Photo } from '../../domain/types'

export function PhotoThumb({ photo, item, canToggle, onToggle }: { photo: Photo; item: { id: string }; canToggle: boolean; onToggle?: (isPublic: boolean) => void }) {
  const src = usePhotoSrc(photo)
  const id = `photo-public-${item.id}-${photo.id}`
  return (
    <figure className="m-0 flex flex-col gap-1">
      {src ? <img src={src} alt="Item photo" className="h-24 w-auto rounded-sm border border-rule" data-testid={`photo-${photo.id}`} /> : <div className="h-24 w-32 rounded-sm border border-rule bg-rule-soft" />}
      <figcaption className="flex items-center gap-2 text-xs">
        {photo.isPublic ? <Tag tone="teal">Public</Tag> : <Private inline>{''}</Private>}
        {canToggle && onToggle ? (
          <label className="flex items-center gap-1" htmlFor={id}>
            <input id={id} type="checkbox" className="h-4 w-4" checked={photo.isPublic} onChange={(e) => onToggle(e.target.checked)} data-testid={`${id}-tick`} />
            Public
          </label>
        ) : null}
      </figcaption>
    </figure>
  )
}

export function HoldingLine({ v }: { v: ItemView }) {
  if (!v.holding) return null
  if (v.holding.holdMonths === null) return <span data-testid="holding-line">No gain over scrap at the guide price</span>
  return <span data-testid="holding-line">Holding unsold stock would use up the gain over scrap in about {f.months1(v.holding.holdMonths)}</span>
}

export function ItemDetail() {
  const { itemId } = useParams()
  const world = useWorld()
  const { persona } = usePersona()
  const { id: buildingId } = useBuildingParam()
  const found = itemId ? world.items[itemId] : undefined
  const item = found && found.buildingId === buildingId ? found : undefined
  if (!item) {
    return (
      <>
        <PageTitle title="Item" />
        <EmptyState hint="Choose an item from the inventory." />
      </>
    )
  }
  const v = itemView(world, item.id)
  const isOwner = roleFor(world, persona.id) === 'seller'
  return (
    <>
      <PageTitle
        title={
          <span className="flex items-center gap-3">
            <Tag>{item.tag}</Tag>
            {v.listing.title}
          </span>
        }
        sub={
          <Link to={`/buildings/${buildingId}/inventory`} className="text-steel">
            Back to inventory
          </Link>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Private record">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start gap-4">
              <ItemDrawing spec={item.spec} box={120} />
              <Dl
                rows={[
                  { label: 'Family', value: v.listing.title },
                  { label: 'Quantity', value: item.quantity.kind === 'pieces' ? f.quantity(item.quantity.pieces, item.family === 'clay_brick' ? 'brick' : item.family === 'raised_floor' ? 'panel' : 'pieces') : item.quantity.kind === 'area' ? f.quantity(item.quantity.areaM2, 'm2') : f.quantity(item.quantity.volumeM3, 'm3') },
                  { label: 'Mass', value: f.massT(v.measures.massT), testId: 'item-mass' },
                  { label: 'Condition', value: item.condition },
                  { label: 'Recoverability', value: item.recoverability },
                  { label: 'Test status', value: TEST_STATUS_LABELS[item.testStatus] },
                  ...(item.family === 'steel_section' ? [{ label: 'Grade', value: item.grade && item.grade !== 'unknown' ? item.grade : GRADE_UNKNOWN }] : []),
                  { label: 'Location in building', value: item.location || 'not recorded', isPrivate: true, testId: 'item-location' },
                  { label: 'Survey notes', value: item.notes || 'none', isPrivate: true },
                  { label: 'Captured by', value: `${item.capturedBy}, ${f.date(item.capturedOn)}`, isPrivate: true },
                ]}
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-sm text-mill-text">Avoided carbon</div>
                <div className="font-display text-2xl" data-testid="item-carbon">
                  {v.carbon ? f.carbon(v.carbon.avoided) : 'none'}
                </div>
                {v.carbon ? <HowCalculated title={`avoided carbon for ${item.tag}`} {...carbonSections(v.carbon)} testId="item-carbon-calc" /> : null}
              </div>
              <div>
                <div className="text-sm text-mill-text">Guide price</div>
                <div className="font-display text-2xl" data-testid="item-guide">
                  {f.unitPrice(v.guide.guide, item.family)}
                </div>
                <HowCalculated title={`guide price for ${item.tag}`} {...guideSections(v.guide, item.family, item.condition, item.testStatus, { value: v.sellerMandate.urgency, daysToClearBy: v.daysToClearBy })} testId="item-guide-calc" />
              </div>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold">Photos</h3>
              {item.photos.length ? (
                <div className="flex flex-wrap gap-3">
                  {item.photos.map((p) => (
                    <PhotoThumb key={p.id} photo={p} item={item} canToggle={false} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-mill-text">No photos.</p>
              )}
            </div>
            <Private>
              <h3 className="mb-1 text-sm font-semibold">Lot</h3>
              <Dl
                rows={[
                  { label: 'Public ID', value: v.lot.publicId, testId: 'lot-public-id' },
                  { label: 'Visibility', value: VISIBILITY_LABELS[v.lot.visibility], testId: 'lot-visibility' },
                  { label: 'Available from', value: v.lot.availableFrom ? f.date(v.lot.availableFrom) : 'In stock' },
                  ...(v.lot.askPerUnit !== null ? [{ label: 'Ask', value: f.unitPrice(v.lot.askPerUnit, item.family), testId: 'lot-ask' }] : []),
                  ...(v.lot.reservePerUnit !== null ? [{ label: 'Reserve', value: f.unitPrice(v.lot.reservePerUnit, item.family), testId: 'lot-reserve' }] : []),
                ]}
              />
              {v.holding ? (
                <div className="mt-2 text-sm">
                  <div className="text-mill-text">Holding view at the guide price via {v.holding.facility.name}</div>
                  <div>
                    Net {f.money(v.holding.net)}, gain over scrap {f.money(v.holding.upliftVsScrap)}. <HoldingLine v={v} />
                  </div>
                </div>
              ) : null}
              {isOwner ? (
                <div className="mt-2 text-sm">
                  <div className="text-mill-text">Suggested mandate</div>
                  <div data-testid="item-mandate">
                    Ask {f.unitPrice(v.sellerMandate.ask, item.family)}, reserve {f.unitPrice(v.sellerMandate.reserve, item.family)}
                  </div>
                </div>
              ) : null}
            </Private>
          </div>
        </Panel>
        <Panel title="As the market sees it">
          {v.lot.visibility === 'private' ? <Note tone="grey">This lot is private. The preview shows what the market would see if it were published.</Note> : null}
          <div className="mt-2">
            <ListingView listing={v.listing} testPrefix="preview" compact />
          </div>
        </Panel>
      </div>
    </>
  )
}
