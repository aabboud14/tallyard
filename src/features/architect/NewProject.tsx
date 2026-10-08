// Placeholder from the version 1.0 shell. The screen's owner replaces the body; the file and export name are fixed by routes.tsx.
import { PageTitle } from '../../components/ui'

export function NewProject() {
  return (
    <div data-testid="placeholder-new-project">
      <PageTitle title="New project" />
      <p className="max-w-2xl text-sm text-ink-soft">A short form to create a project with its client, type, location and the date materials are needed on site.</p>
    </div>
  )
}
