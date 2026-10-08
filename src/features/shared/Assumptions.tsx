// Assumptions (04 section 5.7): read-only grouped tables of every parameter in 06 section A2,
// with value, unit, source and status.
import type { Parameter } from '../../domain/reference/assumptions'
import { useStore } from '../../store/store'
import { assumptionRowsFor } from '../../store/views/shared'
import { PageTitle, Panel, Table, Tag } from '../../components/ui'
import type { ReferenceStatus } from '../../domain/types'

const STATUS_LABELS: Record<ReferenceStatus, string> = { published: 'Published', indicative: 'Indicative', placeholder: 'Placeholder', candidate: 'Candidate' }
const STATUS_TONES: Record<ReferenceStatus, 'teal' | 'steel' | 'grey' | 'survey'> = { published: 'teal', indicative: 'steel', placeholder: 'grey', candidate: 'survey' }

/** The steel base reuse ratio carries L32 (04 section 6). */
const STEEL_BASE_REUSE_RATIO = 'steel_section.baseReuseRatio'

function isNumeric(value: string): boolean {
  return /^-?[\d,]+(\.\d+)?%?$/.test(value)
}

function groupRows(rows: Parameter[]): { group: string; rows: Parameter[] }[] {
  const groups: { group: string; rows: Parameter[] }[] = []
  for (const r of rows) {
    const g = groups.find((x) => x.group === r.group)
    if (g) g.rows.push(r)
    else groups.push({ group: r.group, rows: [r] })
  }
  return groups
}

export function Assumptions() {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const groups = groupRows(assumptionRowsFor(world, personaId))
  return (
    <>
      <PageTitle title="Assumptions" sub="Every factor, price, fee, target and weight the prototype uses. Read-only in this run. Distances on the building, hub and project records are record data and are not shown here. The region distances below apply only to projects created in the tool." />
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <Panel key={g.group} title={g.group} data-testid={`assumptions-group-${g.group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
            <Table>
              <thead>
                <tr>
                  <th className="w-[18%]">Parameter</th>
                  <th className="w-[30%]">Value</th>
                  <th className="w-[14%]">Unit</th>
                  <th>Source</th>
                  <th className="w-[10%]">Status</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id} data-testid={`assumption-${r.id}`}>
                    <td>{r.label}</td>
                    <td className={isNumeric(r.value) ? 'text-right tabular-nums' : ''}>{r.value}</td>
                    <td className="text-mill-text">{r.unit}</td>
                    <td className="text-ink-soft" data-testid={r.id === STEEL_BASE_REUSE_RATIO ? 'label-L32' : undefined}>
                      {r.source}
                    </td>
                    <td>
                      <Tag tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        ))}
      </div>
    </>
  )
}
