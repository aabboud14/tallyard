import { Link } from 'react-router'
import { useWorld, usePersona } from '../shared/hooks'
import { buildingItems, itemView } from '../../store/selectors'
import { useBuildingParam, NotAvailable } from '../../app/params'
import { PageTitle, Table, Num, Tag, EmptyState } from '../../components/ui'
import { ItemDrawing } from '../../components/drawings/ItemDrawing'
import { scaleFor } from '../../components/drawings/SectionDrawing'
import { FAMILIES } from '../../domain/reference/families'
import { TEST_STATUS_LABELS, VISIBILITY_LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'

export function Inventory() {
  const world = useWorld()
  const { persona } = usePersona()
  const { record: building } = useBuildingParam()
  if (!building) return <NotAvailable />
  const items = buildingItems(world, building.id)
  const owner = building.ownerOrgId ? world.orgs[building.ownerOrgId] : undefined
  const scale = scaleFor(items.filter((i) => i.spec.family === 'steel_section').map((i) => (i.spec as { designation: string }).designation), 64)
  return (
    <>
      <PageTitle title={`Inventory, ${building.name}`} sub={`${owner ? owner.name + '. ' : ''}${building.surveyedBy ? `First survey tranche, surveyed ${f.date(building.surveyedBy.date)} by ${building.surveyedBy.personaName}. ` : ''}Viewing as ${persona.name}.`} />
      {items.length === 0 ? (
        <EmptyState hint="Capture an item on site to add it here." />
      ) : (
        <Table data-testid="inventory-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Drawing</th>
              <th>Title</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Mass (t)</th>
              <th>Condition</th>
              <th>Recoverability</th>
              <th>Test status</th>
              <th className="text-right">Avoided carbon (tCO2e)</th>
              <th className="text-right">Guide price</th>
              <th>Visibility</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const v = itemView(world, item.id)
              return (
                <tr key={item.id} data-testid={`inventory-row-${item.tag}`}>
                  <td>
                    <Link to={`/buildings/${building.id}/inventory/${item.id}`} className="font-display text-base text-steel no-underline">
                      {item.tag}
                    </Link>
                  </td>
                  <td>
                    <ItemDrawing spec={item.spec} scale={scale} box={56} caption={false} dims={false} />
                  </td>
                  <td>{v.listing.title}</td>
                  <Num>{item.quantity.kind === 'pieces' ? f.quantity(item.quantity.pieces, FAMILIES[item.family].countable && item.family !== 'clay_brick' && item.family !== 'raised_floor' ? 'pieces' : FAMILIES[item.family].unit) : item.quantity.kind === 'area' ? f.quantity(item.quantity.areaM2, 'm2') : f.quantity(item.quantity.volumeM3, 'm3')}</Num>
                  <Num>{f.number(v.measures.massT, 2)}</Num>
                  <td>{item.condition}</td>
                  <td>{item.recoverability}</td>
                  <td>{TEST_STATUS_LABELS[item.testStatus]}</td>
                  <Num>{v.carbon ? f.number(v.carbon.avoided, 1) : 'none'}</Num>
                  <Num>{f.unitPrice(v.guide.guide, item.family)}</Num>
                  <td>
                    <Tag tone={v.lot.visibility === 'open' ? 'teal' : v.lot.visibility === 'matched_only' ? 'steel' : 'oxide'}>{VISIBILITY_LABELS[v.lot.visibility]}</Tag>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </>
  )
}
