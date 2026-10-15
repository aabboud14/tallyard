// The frame every chart sits in: a title, the Indicative marker where the figures are indicative, a legend,
// and a Chart or Table switch, so every chart has an accessible table twin (and nothing is colour alone).
import { useId, useState, type ReactNode } from 'react'
import { cx } from '../cx'
import { IndicativeMarker } from '../Badge'
import { SegmentedControl } from '../Tabs'
import { Table, TBody, TD, TH, THead, TR } from '../Table'

export type ChartTable = { columns: readonly string[]; rows: readonly (readonly (string | number)[])[] }

export type ChartFrameProps = {
  title: ReactNode
  description?: ReactNode
  /** Adds the Indicative marker with its link to the methodology (P4). */
  indicative?: boolean
  /** Usually <Legend />. Shown under the chart. */
  legend?: ReactNode
  /** The same figures as a table, already formatted. */
  table: ChartTable
  /** Extra controls in the header, before the switch. */
  actions?: ReactNode
  titleAs?: 'h2' | 'h3'
  /** Start in table view. */
  defaultView?: 'chart' | 'table'
  /** Draw a card border around the frame. */
  bordered?: boolean
  className?: string
  testId?: string
  children: ReactNode
}

export function ChartFrame({ title, description, indicative = false, legend, table, actions, titleAs: H = 'h3', defaultView = 'chart', bordered = true, className, testId, children }: ChartFrameProps) {
  const [view, setView] = useState<'chart' | 'table'>(defaultView)
  const headingId = useId()
  return (
    <figure aria-labelledby={headingId} data-testid={testId} data-view={view} className={cx('m-0 flex min-w-0 flex-col gap-4', bordered && 'rounded-lg border border-line bg-surface p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <H id={headingId} className="m-0 text-base font-semibold text-ink">
              {title}
            </H>
            {indicative ? <IndicativeMarker /> : null}
          </div>
          {description ? <p className="m-0 mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <SegmentedControl
            label="Show as"
            size="sm"
            value={view}
            onValueChange={(v) => setView(v === 'table' ? 'table' : 'chart')}
            items={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
            ]}
          />
        </div>
      </div>
      {view === 'chart' ? (
        <>
          <div className="min-w-0">{children}</div>
          {legend ? <div>{legend}</div> : null}
        </>
      ) : (
        <div className="min-w-0">
          <Table caption={typeof title === 'string' ? title : undefined}>
            <THead>
              <tr>
                {table.columns.map((c, i) => (
                  <TH key={i} align={i === 0 ? 'left' : 'right'}>
                    {c}
                  </TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {table.rows.map((r, i) => (
                <TR key={i}>
                  {r.map((cell, j) => (
                    <TD key={j} align={j === 0 ? 'left' : 'right'} className={j === 0 ? undefined : 'tabular-nums'}>
                      {cell}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </figure>
  )
}
