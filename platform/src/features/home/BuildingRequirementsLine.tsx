// One line on a home dashboard's building: how many of its requirements before demolition are ready, with the ones
// at risk, leading to the building's Requirements tab. The figures come from buildingRequirementsRollup (P2).
import { Link } from 'react-router'
import { Landmark, TriangleAlert } from 'lucide-react'
import type { BuildingRequirementsRollup } from '../../store/selectors/buildingRequirements'
import { cx, Pill } from '../../ui'

export function BuildingRequirementsLine({ r, testId, className }: { r: BuildingRequirementsRollup; testId: string; className?: string }) {
  return (
    <Link
      to={r.href}
      data-testid={testId}
      className={cx(
        'relative z-10 inline-flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 self-start rounded-sm text-sm text-ink-soft outline-none hover:text-ink hover:underline hover:underline-offset-4 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:min-h-11',
        className,
      )}
    >
      <Landmark aria-hidden="true" className="size-3.5 shrink-0 text-faint" />
      <span>
        Requirements <span className="font-medium tabular-nums text-ink">{r.readyText}</span>
      </span>
      {r.atRisk > 0 ? (
        <Pill size="sm" tone="warning" icon={TriangleAlert}>
          {r.atRisk} at risk
        </Pill>
      ) : null}
    </Link>
  )
}
