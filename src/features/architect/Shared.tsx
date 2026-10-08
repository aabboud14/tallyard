// Placeholder from the version 1.0 shell. The screen's owner replaces the body; the file and export name are fixed by routes.tsx.
import { PageTitle } from '../../components/ui'

export function Shared() {
  return (
    <div data-testid="placeholder-shared">
      <PageTitle title="Shared with you" />
      <p className="max-w-2xl text-sm text-ink-soft">Lots that owners have shared in confidence with your projects, grouped by project, behind the confidentiality terms.</p>
    </div>
  )
}
