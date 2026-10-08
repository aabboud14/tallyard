// The building's inventory: every captured item with its photo, grades, expected availability and (for the owner)
// visibility. A row opens a side panel to change availability and visibility, or to correct the record.
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Camera, ExternalLink, PackageOpen, Search, X } from 'lucide-react'
import { selectors, useView } from '../../store'
import { filterInventory, inventoryVisuals, type InventoryFilter, type ItemVisual } from '../../store/selectors/roles-views'
import type { InventoryRow } from '../../store/selectors/owner'
import * as f from '../../domain/format'
import { Badge, Button, cx, EmptyState, IconButton, Input, Pill, SegmentedControl, Sheet, Table, TBody, TD, TH, THead, TR, Tooltip } from '../../ui'
import { MaterialPicture, PhotoTile } from './photos'
import { ItemPanel } from './ItemPanel'
import { SurveyBar } from './SurveyBar'
import { CONDITION_TEXT, RECOVERABILITY_TEXT, VISIBILITY_SHORT, VISIBILITY_TONE } from './labels'

export function Inventory() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.inventoryView, buildingId)
  const pics = useView(inventoryVisuals, buildingId)
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<InventoryFilter>({ q: '', visibility: 'all' })
  const shown = useMemo(() => (v ? filterInventory(v.rows, filter) : null), [v, filter])
  if (!v || !shown || !pics) return null
  const owner = v.header.side === 'owner'
  const openId = params.get('item')
  const open = openId ? v.rows.find((r) => r.itemId === openId) : undefined
  const select = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('item', id)
    else next.delete('item')
    setParams(next, { replace: true })
  }
  const base = `/app/buildings/${buildingId}`

  if (v.empty) {
    return (
      <EmptyState
        variant="page"
        icon={PackageOpen}
        title="Nothing captured yet"
        text={owner ? 'Your surveyor captures what the building holds, item by item. You can also capture items yourself.' : 'Walk the building and capture each material: describe it, add a photo, grade it. Each item stays private to the owner.'}
        action={
          <Button asChild variant="primary" icon={Camera}>
            <Link to={`${base}/capture`}>Capture the first item</Link>
          </Button>
        }
        testId="inventory-empty"
      />
    )
  }

  const tabs = [
    { value: 'all', label: `All ${shown.counts.all}` },
    { value: 'private', label: `Private ${shown.counts.private}` },
    { value: 'matched_only', label: `Shared ${shown.counts.matched_only}` },
    { value: 'open', label: `Published ${shown.counts.open}` },
  ]

  return (
    <div className="flex flex-col gap-4" data-testid="inventory">
      <SurveyBar buildingId={buildingId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          icon={Search}
          value={filter.q}
          onChange={(e) => setFilter((x) => ({ ...x, q: e.target.value }))}
          placeholder="Search tag, material or family"
          aria-label="Search the inventory"
          className="sm:w-80"
          trailing={filter.q ? <IconButton icon={X} label="Clear search" size="sm" tooltip={false} onClick={() => setFilter((x) => ({ ...x, q: '' }))} /> : undefined}
          data-testid="inventory-search"
        />
        {owner ? <SegmentedControl label="Visibility" value={filter.visibility} onValueChange={(x) => setFilter((f0) => ({ ...f0, visibility: x as InventoryFilter['visibility'] }))} items={tabs} className="max-w-full overflow-x-auto" /> : <p className="m-0 text-sm text-muted">{v.rows.length} items, private to the owner</p>}
      </div>

      {shown.rows.length === 0 ? (
        <EmptyState variant="inline" icon={Search} title="No items match" text="Try another word, or clear the filters." action={<Button size="sm" onClick={() => setFilter({ q: '', visibility: 'all' })}>Clear</Button>} />
      ) : (
        <>
          <Table className="max-md:hidden" caption="Inventory" data-testid="inventory-table">
            <THead>
              <tr>
                <TH className="w-14">
                  <span className="sr-only">Photo</span>
                </TH>
                <TH>Item</TH>
                <TH align="right">Quantity</TH>
                <TH align="center">Condition</TH>
                <TH align="center">Recovery</TH>
                <TH>Expected</TH>
                {owner ? <TH>Visibility</TH> : null}
              </tr>
            </THead>
            <TBody>
              {shown.rows.map((r) => (
                <TR key={r.itemId} interactive selected={r.itemId === openId} onClick={() => select(r.itemId)} data-testid={`row-${r.tag}`}>
                  <TD>
                    <Thumb r={r} pic={pics[r.itemId]} />
                  </TD>
                  <TD>
                    <button type="button" onClick={() => select(r.itemId)} className="flex min-w-0 flex-col items-start rounded-sm text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums text-muted">{r.tag}</span>
                        <span className="font-medium text-ink">{r.title}</span>
                      </span>
                      <span className="text-sm text-muted">
                        {r.typologyLabel} · {r.familyLabel}
                      </span>
                    </button>
                  </TD>
                  <TD align="right">
                    <span className="block whitespace-nowrap">{r.quantityText}</span>
                    <span className="block text-sm text-muted">{f.massT(r.massT)}</span>
                  </TD>
                  <TD align="center">
                    <Grade value={r.condition} title={`Condition ${r.condition}: ${CONDITION_TEXT[r.condition as 'A'].label}`} />
                  </TD>
                  <TD align="center">
                    <Grade value={r.recoverability} title={`Recoverability ${r.recoverability}: ${RECOVERABILITY_TEXT[r.recoverability as 'A'].label}`} />
                  </TD>
                  <TD muted className="whitespace-nowrap">
                    {r.expectedText}
                  </TD>
                  {owner ? (
                    <TD>
                      <span className="flex items-center gap-1.5">
                        <Pill tone={VISIBILITY_TONE[r.visibility]} dot size="sm">
                          {VISIBILITY_SHORT[r.visibility]}
                        </Pill>
                        {r.reserved ? <Badge tone="brand">Reserved</Badge> : null}
                      </span>
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>

          <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden" data-testid="inventory-cards">
            {shown.rows.map((r) => (
              <li key={r.itemId}>
                <button type="button" onClick={() => select(r.itemId)} className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-2.5 text-left shadow-xs active:bg-subtle">
                  <Thumb r={r} pic={pics[r.itemId]} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-xs font-medium tabular-nums text-muted">{r.tag}</span>
                    <span className="truncate font-medium text-ink">{r.title}</span>
                    <span className="truncate text-sm text-muted">
                      {r.quantityText} · {r.condition}/{r.recoverability} · {r.expectedText}
                    </span>
                  </span>
                  {owner ? (
                    <Pill tone={VISIBILITY_TONE[r.visibility]} dot size="sm">
                      {VISIBILITY_SHORT[r.visibility]}
                    </Pill>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet
        open={!!open}
        onOpenChange={(o) => {
          if (!o) select(null)
        }}
        width="lg"
        title={open ? `${open.tag} · ${open.title}` : ''}
        description={open ? `${open.familyLabel}, ${open.quantityText}` : undefined}
        testId="item-sheet"
      >
        {open ? (
          <div className="flex flex-col gap-4">
            <Link to={open.href} className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-medium text-ink-soft hover:text-ink">
              <ExternalLink aria-hidden="true" className="size-3.5" />
              Open as a page
            </Link>
            <ItemPanel buildingId={buildingId} itemId={open.itemId} />
          </div>
        ) : null}
      </Sheet>
    </div>
  )
}

function Grade({ value, title }: { value: string; title: string }) {
  return (
    <Tooltip content={title}>
      <span tabIndex={0} className={cx('inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold ring-1 ring-inset', value === 'A' ? 'bg-brand-50 text-brand-700 ring-brand-100' : value === 'B' ? 'bg-warning-soft/70 text-warning ring-warning-line' : 'bg-danger-soft/70 text-danger ring-danger-line')}>
        {value}
      </span>
    </Tooltip>
  )
}

function Thumb({ r, pic, size = 'sm' }: { r: InventoryRow; pic: ItemVisual | undefined; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'w-10' : 'w-14'
  if (pic?.photo) return <PhotoTile photo={pic.photo} alt={`Photo of ${r.tag}`} size={size === 'sm' ? 'sm' : 'md'} className={size === 'md' ? 'size-14!' : undefined} />
  if (!pic) return <span className={cx('block aspect-square rounded-lg bg-subtle', dims)} />
  return <MaterialPicture spec={pic.spec} publicId={pic.publicId} photo={null} aspect="1/1" rounded="lg" className={dims} />
}

export default Inventory
