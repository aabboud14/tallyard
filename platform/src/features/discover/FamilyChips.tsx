// Inside a category folder: the way back to every category, the folder's name and count, and its families as
// chips that work as sub-folders (one at a time, pressed when chosen).
import { ChevronLeft } from 'lucide-react'
import type { FamilyId } from '../../domain/types'
import type { CategoryFolder } from '../../store/selectors/marketplace'
import { Button, cx, TYPOLOGY_VIZ } from '../../ui'

type Chip = { family: FamilyId; label: string; count: number; active: boolean }

function ChipButton({ label, count, active, onClick, testId, disabled }: { label: string; count: number; active: boolean; onClick: () => void; testId: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-default disabled:opacity-50 max-sm:h-11',
        active ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
      )}
    >
      {label}
      <span className={cx('tabular-nums', active ? 'text-white/70' : 'text-faint')}>{count}</span>
    </button>
  )
}

export function FolderHeader({ folder, chips, total, onAll, onFamily }: { folder: CategoryFolder; chips: Chip[]; total: number; onAll: () => void; onFamily: (family: FamilyId | null) => void }) {
  const anyActive = chips.some((c) => c.active)
  return (
    <section aria-labelledby="folder-h" data-testid="folder-header" className="flex flex-col gap-3">
      <div>
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={onAll} data-testid="all-categories" className="-ml-2 text-ink-soft max-sm:h-11">
          All categories
        </Button>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="folder-h" className="m-0 flex items-center gap-2.5 text-xl font-semibold text-ink">
          <span aria-hidden="true" className="h-5 w-[3px] rounded-[2px]" style={{ background: TYPOLOGY_VIZ[folder.typology] }} />
          {folder.label}
        </h2>
        <span className="text-base tabular-nums text-muted">{folder.count === 1 ? '1 material' : `${folder.count} materials`}</span>
        <span className="text-sm text-muted max-sm:basis-full">{folder.description}</span>
      </div>
      <div role="group" aria-label={`${folder.label} families`} className="flex flex-wrap gap-2">
        <ChipButton label="All" count={total} active={!anyActive} onClick={() => onFamily(null)} testId="family-chip-all" />
        {chips.map((c) => (
          <ChipButton key={c.family} label={c.label} count={c.count} active={c.active} onClick={() => onFamily(c.active ? null : c.family)} testId={`family-chip-${c.family}`} disabled={c.count === 0 && !c.active} />
        ))}
      </div>
    </section>
  )
}
