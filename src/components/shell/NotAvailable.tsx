// Shown when the persona may not open a screen or a record. An unknown ID looks the same as a forbidden one.
import { Link } from 'react-router'
import { useStore } from '../../store/store'
import { NOT_AVAILABLE_TO_ROLE } from '../../domain/reference/labels'
import { homeFor } from '../../app/nav'
import { Lock } from '../ui'

export function NotAvailable() {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  return (
    <div className="max-w-xl py-10" data-testid="not-available">
      <div className="flex items-center gap-2">
        <Lock />
        <h1 className="text-xl font-semibold leading-tight">{NOT_AVAILABLE_TO_ROLE}</h1>
      </div>
      <p className="mt-2 text-sm text-mill-text">Open a screen from the menu, or switch persona at the top of the page.</p>
      <Link to={homeFor(world, personaId)} className="mt-4 inline-flex min-h-[44px] items-center rounded-sm border border-rule bg-panel px-4 text-sm font-medium text-ink no-underline hover:bg-steel-tint" data-testid="not-available-home">
        Go to your first screen
      </Link>
    </div>
  )
}
