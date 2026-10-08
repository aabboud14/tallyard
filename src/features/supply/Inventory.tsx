// The building's inventory for the surveyor and the selling owner (brief/09-V1-PRODUCT.md sections 3.1 and 3.2).
// The client is named at the top; each item shows the month the surveyor expects it to be free (L43).
import { Link } from 'react-router'
import { useStore } from '../../store/store'
import { useWorld, usePersona } from '../shared/hooks'
import { buildingItems, itemView } from '../../store/selectors'
import { clientName, expectedText, ownerVisibility, quantityText, supplyAccess, visibilityCounts } from '../../store/views/supply'
import { useBuildingParam, NotAvailable } from '../../app/params'
import { Table, Num, EmptyState } from '../../components/ui'
import type { Visibility } from '../../domain/types'
import { ItemDrawing } from '../../components/drawings/ItemDrawing'
import { scaleFor } from '../../components/drawings/SectionDrawing'
import { LABELS, OWNER_VISIBILITY_LABELS, TEST_STATUS_LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'

export function Inventory() {
  const world = useWorld()
  const personaId = useStore((s) => s.personaId)
  const { persona } = usePersona()
  const { id, record: building } = useBuildingParam()
  const access = supplyAccess(world, personaId, id)
  if (!building || !access.inventory) return <NotAvailable />
  const items = buildingItems(world, building.id)
  const counts = visibilityCounts(world, building.id)
  const scale = scaleFor(items.filter((i) => i.spec.family === 'steel_section').map((i) => (i.spec as { designation: string }).designation), 64)
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Inventory</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight" data-testid="inventory-building">
            {building.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Client <span className="font-medium text-ink" data-testid="inventory-client">{clientName(world, building)}</span>
            {building.surveyedBy ? (
              <>
                . Surveyed {f.date(building.surveyedBy.date)} by {building.surveyedBy.personaName}
              </>
            ) : null}
            . Viewing as {persona.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {access.capture ? (
            <Link to={`/buildings/${building.id}/capture`} className="inline-flex min-h-[44px] items-center rounded-sm border border-rule bg-panel px-4 text-sm font-medium text-ink no-underline hover:bg-steel-tint" data-testid="inventory-capture">
              Capture an item
            </Link>
          ) : null}
          {access.listings ? (
            <Link to={`/buildings/${building.id}/listings`} className="inline-flex min-h-[44px] items-center rounded-sm border border-steel bg-steel px-4 text-sm font-medium text-panel no-underline hover:bg-steel-deep" data-testid="inventory-listings">
              Listings and visibility
            </Link>
          ) : null}
        </div>
      </header>

      <section aria-label="Lots by visibility" className="grid grid-cols-2 divide-rule-soft rounded-sm border border-rule-soft bg-panel sm:grid-cols-4 sm:divide-x" data-testid="inventory-counts">
        <Count label="Items" value={items.length} />
        <Count label={OWNER_VISIBILITY_LABELS.private} value={counts.private} tone="oxide" />
        <Count label={OWNER_VISIBILITY_LABELS.matched_only} value={counts.matched_only} tone="steel" />
        <Count label={OWNER_VISIBILITY_LABELS.open} value={counts.open} tone="teal" />
      </section>

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
              <th>Expected</th>
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
                    <Link to={`/buildings/${building.id}/inventory/${item.id}`} className="inline-flex min-h-[44px] items-center whitespace-nowrap font-display text-base text-steel no-underline hover:underline">
                      {item.tag}
                    </Link>
                  </td>
                  <td>
                    <ItemDrawing spec={item.spec} scale={scale} box={56} caption={false} dims={false} />
                  </td>
                  <td className="min-w-[12rem]">{v.listing.title}</td>
                  <Num className="whitespace-nowrap">{quantityText(item)}</Num>
                  <Num>{f.number(v.measures.massT, 2)}</Num>
                  <td>{item.condition}</td>
                  <td>{item.recoverability}</td>
                  <td className="whitespace-nowrap">{TEST_STATUS_LABELS[item.testStatus]}</td>
                  <td className="whitespace-nowrap" data-testid={`inventory-expected-${item.tag}`}>
                    {expectedText(item.expectedAvailableFrom)}
                  </td>
                  <Num>{v.carbon ? f.number(v.carbon.avoided, 1) : 'none'}</Num>
                  <Num className="whitespace-nowrap">{f.unitPrice(v.guide.guide, item.family)}</Num>
                  <td>
                    <VisibilityMark visibility={v.lot.visibility} testId={`inventory-visibility-${item.tag}`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}

      <footer className="flex flex-col gap-1.5 border-t border-rule-soft pt-4 text-xs text-mill-text">
        <p className="m-0">
          <span className="font-medium text-ink-soft">Expected. </span>
          <span data-testid="label-L43">{LABELS.L43}</span>
        </p>
      </footer>
    </div>
  )
}

const DOT_CLASS: Record<Visibility, string> = { private: 'bg-oxide', matched_only: 'bg-steel', open: 'bg-teal' }

/** A lot's visibility in the owner's words, with its colour as a dot so long words can wrap in a dense table. */
export function VisibilityMark({ visibility, testId }: { visibility: Visibility; testId?: string }) {
  return (
    <span className="inline-flex max-w-[13rem] items-start gap-1.5 text-sm leading-snug">
      <span aria-hidden="true" className={`mt-[0.4em] inline-block h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[visibility]}`} />
      <span data-testid={testId}>{ownerVisibility(visibility)}</span>
    </span>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone?: 'oxide' | 'steel' | 'teal' }) {
  const dot = tone === 'oxide' ? 'bg-oxide' : tone === 'steel' ? 'bg-steel' : tone === 'teal' ? 'bg-teal' : null
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="flex items-center gap-1.5 text-xs text-mill-text">
        {dot ? <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${dot}`} /> : null}
        {label}
      </span>
      <span className="font-display text-2xl leading-none tabular-nums">{value}</span>
    </div>
  )
}
