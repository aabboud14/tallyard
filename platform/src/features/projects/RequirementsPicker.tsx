// Planning and sustainability requirements to pick from, grouped national, London and local. Used by the new
// project dialog and the requirements dialog. Every entry is an indicative summary, and the picker says so.
import { ChevronDown, Eraser, ListChecks } from 'lucide-react'
import type { RequirementChoices } from '../../store/selectors/requirements'
import { PRODUCT_NAME } from '../../domain/constants'
import { Button, Checkbox, IndicativeMarker, Pill } from '../../ui'

type Props = {
  choices: RequirementChoices
  selected: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  /** '3 selected', from requirementChoiceSummary. */
  selectedText: string
  testId?: string
}

export function RequirementsPicker({ choices, selected, onChange, selectedText, testId = 'requirements-picker' }: Props) {
  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(id)
    else next.delete(id)
    onChange(next)
  }
  return (
    <div data-testid={testId} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg bg-subtle/70 px-3.5 py-3 ring-1 ring-inset ring-line-soft sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 flex min-w-0 items-start gap-2 text-sm text-ink-soft">
          <IndicativeMarker className="mt-px shrink-0" />
          <span>{choices.markerNote}</span>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" icon={ListChecks} onClick={() => onChange(new Set(choices.suggestedIds))} data-testid="requirements-suggested">
            Select suggested
          </Button>
          <Button size="sm" variant="ghost" icon={Eraser} onClick={() => onChange(new Set())} data-testid="requirements-clear">
            Clear
          </Button>
        </div>
      </div>
      {choices.groups.map((g) => (
        <fieldset key={g.level} className="m-0 min-w-0 border-0 p-0">
          <legend className="m-0 p-0">
            <span className="block text-sm font-semibold text-ink">{g.title}</span>
            <span className="block text-xs text-muted">{g.subtitle}</span>
          </legend>
          <ul className="m-0 mt-2 list-none divide-y divide-line-soft rounded-lg border border-line p-0">
            {g.rows.map((r) => (
              <li key={r.id} className="px-3 py-2 sm:px-3.5" data-testid={`requirement-${r.id}`}>
                <div className="flex min-w-0 items-start gap-3">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) => toggle(r.id, v === true)}
                    aria-label={`${r.code}, ${r.title}`}
                    className="mt-0.5"
                    data-testid={`requirement-check-${r.id}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="m-0 text-sm font-medium text-ink">
                          {r.code}, {r.title}
                        </p>
                        <p className="m-0 text-xs text-muted">{r.source}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {r.suggested ? (
                          <Pill size="sm" tone="brand">
                            Suggested
                          </Pill>
                        ) : null}
                        <Pill size="sm">{r.kindLabel}</Pill>
                      </div>
                    </div>
                    <details className="group mt-0.5">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-ink-soft hover:text-ink max-sm:min-h-11 [&::-webkit-details-marker]:hidden">
                        More
                        <ChevronDown aria-hidden="true" className="size-3 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-1.5 flex flex-col gap-1.5 text-sm text-ink-soft">
                        <p className="m-0">{r.summary}</p>
                        {r.trigger ? <p className="m-0">When it applies: {r.trigger}</p> : null}
                        {r.asks.length > 0 ? (
                          <div>
                            <p className="m-0 font-medium text-ink">What it asks for</p>
                            <ul className="m-0 mt-0.5 list-disc pl-5">
                              {r.asks.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {r.helps ? <p className="m-0">How {PRODUCT_NAME} helps: {r.helps}</p> : null}
                      </div>
                    </details>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
      <p className="m-0 text-sm font-medium tabular-nums text-ink-soft" data-testid="requirements-count">
        {selectedText}
      </p>
    </div>
  )
}
