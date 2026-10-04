// "How this is calculated": one component, four uses (carbon, guide price, package total, priority score).
import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { Button, Table, Num } from './ui'
import { LABELS } from '../domain/reference/labels'

export type CalcLine = { label: string; value: string; note?: string }
export type CalcSection = { title: string; lines: CalcLine[] }

export function HowCalculated({ title, sections, labels = [], trigger, testId }: { title: string; sections: CalcSection[]; labels?: string[]; trigger?: ReactNode; testId?: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <Button variant="quiet" className="text-sm" data-testid={testId}>
            How this is calculated
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-sm border border-rule bg-panel p-5 shadow-lg focus:outline-none" data-testid={testId ? `${testId}-panel` : undefined}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">How this is calculated: {title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="quiet">Close</Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-3 text-sm text-mill-text">Inputs, formula and factor sources, limited to what this viewer may see.</Dialog.Description>
          {sections.map((s) => (
            <div key={s.title} className="mb-4">
              <h3 className="mb-1 text-sm font-semibold">{s.title}</h3>
              <Table>
                <tbody>
                  {s.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="w-1/2">
                        {l.label}
                        {l.note ? <div className="text-xs text-mill-text">{l.note}</div> : null}
                      </td>
                      <Num>{l.value}</Num>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ))}
          {labels.length ? (
            <ul className="mt-2 flex flex-col gap-1 text-xs text-ink-soft">
              {labels.map((l) => (
                <li key={l} className="rounded-sm border-l-2 border-survey bg-survey-tint px-2 py-1">
                  {l}
                </li>
              ))}
            </ul>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const CARBON_LABELS = [LABELS.L11]
