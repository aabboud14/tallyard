// The Marketplace strip for a donor building owner with no New project yet (audit 16 October, note C5): owners can
// build too, so they read the marketplace, and a New project is how they save materials to something.
import { Link } from 'react-router'
import { FolderPlus, HardHat } from 'lucide-react'
import { useView } from '../../store'
import { ownerBuildPrompt } from '../../store/selectors/owner'
import { Button, cx } from '../../ui'

export function OwnerBuildStrip({ className }: { className?: string }) {
  const p = useView(ownerBuildPrompt)
  if (!p) return null
  return (
    <div data-testid="owner-build-strip" className={cx('flex flex-col gap-3 rounded-lg border border-dashed border-line-strong px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
          <HardHat aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="m-0 font-medium text-ink">{p.title}</p>
          <p className="m-0 text-sm text-muted">{p.text}</p>
        </div>
      </div>
      <Button asChild variant="primary" icon={FolderPlus} className="max-sm:w-full">
        <Link to={p.href} data-testid="owner-build-add">
          Add new project
        </Link>
      </Button>
    </div>
  )
}
