// The building's structure, element by element (frame, floor slabs, roof, stability, foundations, facade), each with
// a material and a system from a fixed table. The card reads it on the overview; the editor is shared with the add
// building dialog. Owners and surveyors may edit it: the surveyor usually knows the structure best.
import { useState, type FormEvent } from 'react'
import { Columns3, Pencil, Plus, Trash2 } from 'lucide-react'
import type { StructuralElement, StructuralMaterial } from '../../domain/types'
import { structureSummary } from '../../domain/engines/structure'
import { act, selectors, useView } from '../../store'
import type { StructureOption } from '../../store/selectors/owner'
import { blankElement, elementRowLabel, structureForm } from '../../store/selectors/buildings-ui'
import { Button, Card, CardBody, CardHeader, cx, Dialog, EmptyState, Field, IconButton, Input, Select, Textarea, toast } from '../../ui'

export function StructureCard({ buildingId }: { buildingId: string }) {
  const o = useView(selectors.buildingOverview, buildingId)
  const [editing, setEditing] = useState(false)
  if (!o) return null
  const s = o.structure
  const empty = s.rows.length === 0 && !s.notes
  return (
    <Card data-testid="structure-card">
      <CardHeader
        title="Structure"
        icon={Columns3}
        description={s.summary || undefined}
        actions={
          s.canEdit && !empty ? (
            <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)} data-testid="structure-edit">
              Edit
            </Button>
          ) : null
        }
      />
      {empty ? (
        <EmptyState
          variant="card"
          icon={Columns3}
          title="No structure recorded yet"
          text="Record the frame, floor slabs and other elements. It helps buyers trust the survey and helps you plan recovery."
          action={
            s.canEdit ? (
              <Button variant="primary" icon={Plus} onClick={() => setEditing(true)} data-testid="structure-edit">
                Record the structure
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          {s.rows.length > 0 ? (
            <table className="w-full border-collapse text-left text-base" data-testid="structure-rows">
              <caption className="sr-only">Structural elements</caption>
              <thead className="max-sm:sr-only">
                <tr className="border-b border-line-soft text-xs font-medium text-muted">
                  <th scope="col" className="px-4 py-2 font-medium sm:px-5">
                    Element
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Material
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium sm:pr-5">
                    System
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {s.rows.map((r, i) => (
                  <tr key={`${r.kind}-${i}`} className="align-top max-sm:flex max-sm:flex-col max-sm:gap-0.5 max-sm:px-4 max-sm:py-3">
                    <th scope="row" className="px-4 py-2.5 font-medium text-ink max-sm:p-0 sm:w-[24%] sm:px-5">
                      {r.label}
                    </th>
                    <td className="px-3 py-2.5 text-ink-soft max-sm:p-0 sm:w-[26%]">{r.materialLabel}</td>
                    <td className="px-3 py-2.5 text-ink-soft max-sm:p-0 sm:pr-5">
                      {r.systemLabel}
                      {r.note ? <span className="block text-sm text-muted">{r.note}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {s.notes ? (
            <CardBody className={cx(s.rows.length > 0 && 'border-t border-line-soft')}>
              <p className="m-0 text-xs font-medium text-muted">Other notes</p>
              <p className="m-0 mt-1 text-base text-ink-soft">{s.notes}</p>
            </CardBody>
          ) : null}
        </>
      )}
      {editing ? <StructureDialog buildingId={buildingId} onClose={() => setEditing(false)} /> : null}
    </Card>
  )
}

/** Every element kind in order, with at least one row each, for the full editor. */
function withEveryKind(elements: StructuralElement[], options: StructureOption[]): StructuralElement[] {
  const out: StructuralElement[] = []
  for (const o of options) {
    const rows = elements.filter((e) => e.kind === o.kind)
    out.push(...(rows.length > 0 ? rows : [blankElement(o.kind)]))
  }
  return out
}

function StructureDialog({ buildingId, onClose }: { buildingId: string; onClose: () => void }) {
  const f = useView(structureForm, buildingId)
  const [rows, setRows] = useState<StructuralElement[]>(() => (f ? withEveryKind(f.elements, f.options) : []))
  const [notes, setNotes] = useState(f?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  if (!f) return null
  const save = (e: FormEvent) => {
    e.preventDefault()
    const r = act.setBuildingStructure(buildingId, { elements: rows, notes })
    if (!r.ok) return setError(r.error)
    toast.success('Structure saved', { action: { label: 'Undo', onClick: r.undo } })
    onClose()
  }
  const summary = structureSummary(rows)
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Structure"
      description="Each element with its material and system. Leave out what you do not know yet."
      size="xl"
      testId="structure-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="structure-form" data-testid="structure-save">
            Save structure
          </Button>
        </>
      }
    >
      <form id="structure-form" onSubmit={save} className="flex flex-col gap-5" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <StructureEditor rows={rows} options={f.options} onChange={setRows} mode="full" />
        <Field label="Other notes on the structure" optional>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For example: composite slabs act as diaphragms." data-testid="structure-notes" />
        </Field>
        <p className="m-0 rounded-md bg-page px-3 py-2 text-sm text-ink-soft" aria-live="polite">
          <span className="text-muted">Reads as: </span>
          {summary || 'Nothing recorded yet'}
        </p>
      </form>
    </Dialog>
  )
}

/**
 * The rows editor. `full` lists every element kind with an Add another per kind (for mixed facades); `compact` shows
 * the rows given and one Add another element menu, for the add building dialog.
 */
export function StructureEditor({ rows, options, onChange, mode }: { rows: StructuralElement[]; options: StructureOption[]; onChange: (rows: StructuralElement[]) => void; mode: 'full' | 'compact' }) {
  const update = (i: number, patch: Partial<StructuralElement>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i))
  const addAfter = (kind: StructuralElement['kind']) => {
    const last = rows.map((r) => r.kind).lastIndexOf(kind)
    const next = [...rows]
    next.splice(last === -1 ? rows.length : last + 1, 0, blankElement(kind))
    onChange(next)
  }
  const optionOf = (kind: StructuralElement['kind']) => options.find((o) => o.kind === kind)!
  return (
    <div className="flex flex-col gap-3" data-testid="structure-editor">
      <div className="hidden grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.7fr)_2.25rem] gap-2 px-0.5 text-xs font-medium text-muted md:grid" aria-hidden="true">
        <span>Element</span>
        <span>Material</span>
        <span>System and note</span>
        <span />
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:gap-0 md:divide-y md:divide-line-soft">
        {rows.map((r, i) => {
          const o = optionOf(r.kind)
          const count = rows.filter((x) => x.kind === r.kind).length
          return (
            <li key={i} className="flex flex-col gap-2 rounded-lg border border-line-soft p-3 md:rounded-none md:border-0 md:px-0 md:py-2.5" data-testid={`structure-row-${r.kind}`}>
              <ElementRow
                row={r}
                option={o}
                label={elementRowLabel(rows, i, o.label)}
                onChange={(patch) => update(i, patch)}
                onRemove={mode === 'compact' || count > 1 ? () => remove(i) : null}
              />
              {mode === 'full' && i === rows.map((x) => x.kind).lastIndexOf(r.kind) && r.kind === 'facade' ? (
                <Button type="button" size="sm" variant="ghost" icon={Plus} className="self-start md:ml-[8rem]" onClick={() => addAfter(r.kind)} data-testid="structure-add-facade">
                  Add another facade
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
      {mode === 'compact' ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="structure-add" className="text-sm text-muted">
            Add another element
          </label>
          <Select
            id="structure-add"
            selectSize="sm"
            className="w-48"
            value=""
            placeholder="Choose an element"
            onChange={(e) => {
              if (e.target.value) addAfter(e.target.value as StructuralElement['kind'])
            }}
            options={options.map((o) => ({ value: o.kind, label: o.label }))}
            data-testid="structure-add"
          />
        </div>
      ) : null}
    </div>
  )
}

function ElementRow({ row, option, label, onChange, onRemove }: { row: StructuralElement; option: StructureOption; label: string; onChange: (patch: Partial<StructuralElement>) => void; onRemove: (() => void) | null }) {
  const materials = option.materials
  const systems = row.material ? (materials.find((m) => m.value === row.material)?.systems ?? []) : materials.flatMap((m) => m.systems)
  const setMaterial = (value: string) => {
    const material = (value || null) as StructuralMaterial | null
    const keep = material && row.systemId ? materials.find((m) => m.value === material)?.systems.some((x) => x.id === row.systemId) : false
    onChange({ material, systemId: keep ? row.systemId : null })
  }
  const setSystem = (id: string) => {
    if (!id) return onChange({ systemId: null })
    const owner = materials.find((m) => m.systems.some((x) => x.id === id))
    onChange({ systemId: id, material: (owner?.value ?? row.material) as StructuralMaterial | null })
  }
  return (
    // Material and system share the row and the note sits under them, so the selects are wide enough to read.
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.7fr)_2.25rem] md:items-center">
      <span className="flex items-center justify-between gap-2 text-sm font-medium text-ink sm:col-span-2 md:col-span-1">
        {label}
        {onRemove ? <IconButton icon={Trash2} label={`Remove ${label.toLowerCase()}`} size="sm" variant="ghost" className="md:hidden" onClick={onRemove} /> : null}
      </span>
      <Select aria-label={`${label}: material`} selectSize="sm" value={row.material ?? ''} placeholder="Material" onChange={(e) => setMaterial(e.target.value)} options={materials.map((m) => ({ value: m.value, label: m.label }))} data-testid={`structure-material-${row.kind}`} />
      <Select aria-label={`${label}: system`} selectSize="sm" value={row.systemId ?? ''} placeholder={systems.length > 0 ? 'System' : 'No listed system'} disabled={systems.length === 0} onChange={(e) => setSystem(e.target.value)} options={systems.map((x) => ({ value: x.id, label: x.label }))} data-testid={`structure-system-${row.kind}`} />
      <Input aria-label={`${label}: note`} inputSize="sm" value={row.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="Note, optional" className="sm:col-span-2 md:col-span-2 md:col-start-2 md:row-start-2" maxLength={200} />
      {onRemove ? <IconButton icon={Trash2} label={`Remove ${label.toLowerCase()}`} size="sm" variant="ghost" className="max-md:hidden md:col-start-4 md:row-start-1" onClick={onRemove} /> : <span className="max-md:hidden md:col-start-4 md:row-start-1" />}
    </div>
  )
}
