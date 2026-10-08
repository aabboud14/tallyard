// Placeholder from the version 1.0 shell. The screen's owner replaces the body; the file and export name are fixed by routes.tsx.
import { PageTitle } from '../../components/ui'

export function Saved() {
  return (
    <div data-testid="placeholder-saved">
      <PageTitle title="Saved" />
      <p className="max-w-2xl text-sm text-ink-soft">Materials you have saved without a project yet, ready to move to a project later.</p>
    </div>
  )
}
