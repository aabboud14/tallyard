// One inventory item on its own page, for a link that can be shared within the organisation.
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { selectors, useView } from '../../store'
import { ItemPanel } from './ItemPanel'

export function ItemDetail() {
  const { buildingId = '', itemId = '' } = useParams()
  const d = useView(selectors.itemDetail, buildingId, itemId)
  return (
    <div className="flex flex-col gap-5" data-testid="item-detail">
      <div className="flex flex-col gap-1">
        <Link to={`/app/buildings/${buildingId}/inventory`} className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted hover:text-ink max-sm:min-h-11">
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Inventory
        </Link>
        {d ? (
          <h2 className="m-0 flex flex-wrap items-baseline gap-x-2.5 text-xl font-semibold text-ink">
            <span className="text-base font-medium tabular-nums text-muted">{d.tag}</span>
            {d.title}
          </h2>
        ) : null}
      </div>
      <ItemPanel buildingId={buildingId} itemId={itemId} layout="page" />
    </div>
  )
}

export default ItemDetail
