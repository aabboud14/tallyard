// Standalone capture (/app/capture), for surveyors and owners: choose the building at the top, then record items
// with the same form as the building's Capture tab. The building is remembered per person and kept in the address
// (?building=), and switching keeps what was typed. A surveyor can add a building here before any appointment.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, Building2, ChevronsUpDown, Plus } from 'lucide-react'
import { useApp, selectors, useView } from '../../store'
import { Button, EmptyState, PageHeader } from '../../ui'
import { Page } from '../../app/Page'
import { NewBuildingDialog } from '../buildings/NewBuildingDialog'
import { CaptureWorkspace } from './CaptureWorkspace'

export function CapturePage() {
  const t = useView(selectors.captureTargets)
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(false)
  if (!t) return null
  const asked = params.get('building')
  const selectedId = asked && t.targets.some((x) => x.id === asked) ? asked : t.selectedId
  const selected = t.targets.find((x) => x.id === selectedId) ?? null
  const choose = (id: string) => {
    useApp.getState().setCaptureBuilding(id)
    const next = new URLSearchParams(params)
    next.set('building', id)
    setParams(next, { replace: true })
  }
  return (
    <Page testId="capture-page">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader title="Capture" subtitle="Record an item on site. Choose the building, then describe what you see." />
        {t.empty || !selected ? (
          <EmptyState
            variant="page"
            illustration="building"
            title="Add the building you are in"
            text="You can start a survey before a client appoints you. The owner confirms it later."
            action={
              t.canAdd ? (
                <Button variant="primary" icon={Plus} onClick={() => setAdding(true)} data-testid="capture-add-building">
                  Add building
                </Button>
              ) : null
            }
            testId="capture-empty"
          />
        ) : (
          <>
            <section
              aria-label="Building"
              className="z-10 -mx-4 mt-6 border-y border-line bg-surface px-4 py-3 max-sm:sticky max-sm:top-14 sm:mx-0 sm:rounded-lg sm:border sm:px-4 sm:py-3.5"
              data-testid="capture-picker"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor="capture-building" className="text-sm font-medium text-ink">
                    Building
                  </label>
                  <BuildingSelect id="capture-building" value={selected.id} groups={t.groups} targets={t.targets} onChange={choose} />
                </div>
                {t.canAdd ? (
                  <Button icon={Plus} onClick={() => setAdding(true)} className="max-sm:hidden" data-testid="capture-add-building">
                    Add building
                  </Button>
                ) : null}
              </div>
              <p className="m-0 mt-2 flex flex-wrap items-center gap-x-4 gap-y-0 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 aria-hidden="true" className="size-3.5 text-faint" />
                  {selected.group}
                </span>
                <span data-testid="capture-building-count">
                  {selected.itemCount} {selected.itemCount === 1 ? 'item' : 'items'} captured, survey {selected.statusLabel.toLowerCase()}
                </span>
                <Link to={`/app/buildings/${selected.id}`} className="inline-flex items-center gap-1 rounded-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11">
                  Open building
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
                {t.canAdd ? (
                  <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center gap-1 rounded-sm font-medium text-ink-soft hover:text-ink sm:hidden" data-testid="capture-add-building-phone">
                    <Plus aria-hidden="true" className="size-3.5" />
                    Add building
                  </button>
                ) : null}
              </p>
            </section>
            <div className="mt-6">
              <CaptureWorkspace buildingId={selected.id} />
            </div>
          </>
        )}
      </div>
      {t.canAdd ? <NewBuildingDialog open={adding} onOpenChange={setAdding} donorOnly onCreated={(c) => choose(c.id)} /> : null}
    </Page>
  )
}

/** A native select with the buildings grouped by client, the firm's unconfirmed buildings last. */
function BuildingSelect({ id, value, groups, targets, onChange }: { id: string; value: string; groups: { label: string; ids: string[] }[]; targets: { id: string; name: string; address: string }[]; onChange: (id: string) => void }) {
  const byId = new Map(targets.map((x) => [x.id, x]))
  return (
    <div className="relative min-w-0">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-line bg-surface pl-3 pr-9 text-base font-medium text-ink shadow-xs outline-none transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-brand-600 focus:shadow-focus max-sm:text-[16px] sm:h-10"
        data-testid="capture-building"
      >
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.ids.map((x) => {
              const b = byId.get(x)
              return b ? (
                <option key={x} value={x}>
                  {b.name}, {b.address}
                </option>
              ) : null
            })}
          </optgroup>
        ))}
      </select>
      <ChevronsUpDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
    </div>
  )
}

export default CapturePage
